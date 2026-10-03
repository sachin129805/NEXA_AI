import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import get_db
from app.models import Conversation, Message
from app.schemas.chat import (
    ConversationCreate,
    ConversationDetail,
    ConversationResponse,
    MessageCreate,
    MessageResponse,
)
from app.services.llm import llm_service


router = APIRouter(
    prefix="/api/chat",
    tags=["chat"],
)


# ============================================================
# MODELS
# ============================================================

@router.get("/models")
def get_models():
    """
    Return the models configured for NexaAI.

    Model configuration is normalized by the Settings layer,
    so this API endpoint only exposes the already-normalized
    configuration.
    """

    return {
        "models": settings.available_models,
        "provider": settings.llm_provider,
    }


# ============================================================
# CONVERSATIONS
# ============================================================

@router.get(
    "/conversations",
    response_model=list[ConversationResponse],
)
def list_conversations(
    session_id: str,
    db: Session = Depends(get_db),
):
    statement = (
        select(Conversation)
        .where(
            Conversation.session_id == session_id
        )
        .order_by(
            Conversation.updated_at.desc()
        )
    )

    return list(
        db.scalars(statement).all()
    )


@router.post(
    "/conversations",
    response_model=ConversationResponse,
)
def create_conversation(
    payload: ConversationCreate,
    db: Session = Depends(get_db),
):
    conversation = Conversation(
        session_id=payload.session_id,
        title=payload.title,
        model=payload.model,
    )

    db.add(conversation)
    db.commit()
    db.refresh(conversation)

    return conversation


@router.get(
    "/conversations/{conversation_id}",
    response_model=ConversationDetail,
)
def get_conversation(
    conversation_id: str,
    session_id: str,
    db: Session = Depends(get_db),
):
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.session_id == session_id,
        )
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    messages = list(
        db.scalars(
            select(Message)
            .where(
                Message.conversation_id
                == conversation.id
            )
            .order_by(
                Message.created_at.asc()
            )
        ).all()
    )

    return {
        "conversation": conversation,
        "messages": messages,
    }


# ============================================================
# DELETE CONVERSATION
# ============================================================

@router.delete(
    "/conversations/{conversation_id}",
)
def delete_conversation(
    conversation_id: str,
    session_id: str,
    db: Session = Depends(get_db),
):
    """
    Permanently delete one conversation belonging to
    the current browser session, including all messages.
    """

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.session_id == session_id,
        )
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    db.execute(
        delete(Message).where(
            Message.conversation_id
            == conversation.id
        )
    )

    db.delete(conversation)
    db.commit()

    return {
        "success": True,
        "conversation_id": conversation_id,
    }


# ============================================================
# NORMAL NON-STREAMING MESSAGE
# ============================================================

@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=list[MessageResponse],
)
async def send_message(
    conversation_id: str,
    payload: MessageCreate,
    session_id: str,
    db: Session = Depends(get_db),
):
    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.session_id == session_id,
        )
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    content = payload.content.strip()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    selected_model = (
        payload.model
        or conversation.model
    )

    if selected_model:
        conversation.model = selected_model

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=content,
        model=selected_model,
    )

    db.add(user_message)

    if conversation.title == "New conversation":
        clean_title = content.replace(
            "\n",
            " ",
        )

        conversation.title = clean_title[:80]

    db.commit()
    db.refresh(user_message)

    history = list(
        db.scalars(
            select(Message)
            .where(
                Message.conversation_id
                == conversation.id
            )
            .order_by(
                Message.created_at.asc()
            )
        ).all()
    )

    model_messages = [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in history
    ]

    try:
        result = await llm_service.generate(
            messages=model_messages,
            model=selected_model,
        )

    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"LLM generation failed: {exc}",
        ) from exc

    if result is None:
        return [user_message]

    assistant_message = Message(
        conversation_id=conversation.id,
        role="assistant",
        content=result.content,
        model=result.model,
        input_tokens=result.input_tokens,
        output_tokens=result.output_tokens,
    )

    db.add(assistant_message)

    db.commit()
    db.refresh(assistant_message)

    return [
        user_message,
        assistant_message,
    ]


# ============================================================
# STREAMING MESSAGE
# ============================================================

@router.post(
    "/conversations/{conversation_id}/messages/stream",
)
async def stream_message(
    conversation_id: str,
    payload: MessageCreate,
    session_id: str,
    db: Session = Depends(get_db),
):
    """
    Stream the assistant response token-by-token.

    The user message is saved immediately.

    The assistant response is accumulated while being
    streamed to the browser and is saved to PostgreSQL
    once generation finishes.
    """

    conversation = db.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id,
            Conversation.session_id == session_id,
        )
    )

    if conversation is None:
        raise HTTPException(
            status_code=404,
            detail="Conversation not found.",
        )

    content = payload.content.strip()

    if not content:
        raise HTTPException(
            status_code=400,
            detail="Message cannot be empty.",
        )

    selected_model = (
        payload.model
        or conversation.model
    )

    if selected_model:
        conversation.model = selected_model

    user_message = Message(
        conversation_id=conversation.id,
        role="user",
        content=content,
        model=selected_model,
    )

    db.add(user_message)

    if conversation.title == "New conversation":
        clean_title = content.replace(
            "\n",
            " ",
        )

        conversation.title = clean_title[:80]

    db.commit()
    db.refresh(user_message)

    history = list(
        db.scalars(
            select(Message)
            .where(
                Message.conversation_id
                == conversation.id
            )
            .order_by(
                Message.created_at.asc()
            )
        ).all()
    )

    model_messages = [
        {
            "role": message.role,
            "content": message.content,
        }
        for message in history
        if message.role in {
            "system",
            "user",
            "assistant",
        }
    ]

    def make_event(
        event_type: str,
        data: dict,
    ) -> str:
        return (
            "data: "
            + json.dumps(
                {
                    "type": event_type,
                    **data,
                },
                ensure_ascii=False,
            )
            + "\n\n"
        )

    async def event_stream():
        full_response = ""

        try:
            stream = llm_service.stream(
                messages=model_messages,
                model=selected_model,
            )

            for chunk in stream:
                if not chunk:
                    continue

                full_response += chunk

                yield make_event(
                    "token",
                    {
                        "content": chunk,
                    },
                )

            final_content = full_response.strip()

            assistant_message = Message(
                conversation_id=conversation.id,
                role="assistant",
                content=final_content,
                model=selected_model,
                input_tokens=None,
                output_tokens=None,
            )

            db.add(assistant_message)
            db.commit()
            db.refresh(assistant_message)

            yield make_event(
                "done",
                {
                    "message": {
                        "id": str(
                            assistant_message.id
                        ),
                        "conversation_id": str(
                            conversation.id
                        ),
                        "role": "assistant",
                        "content": (
                            assistant_message.content
                        ),
                        "model": (
                            assistant_message.model
                        ),
                        "input_tokens": (
                            assistant_message.input_tokens
                        ),
                        "output_tokens": (
                            assistant_message.output_tokens
                        ),
                        "created_at": (
                            assistant_message.created_at.isoformat()
                            if assistant_message.created_at
                            else None
                        ),
                    }
                },
            )

        except RuntimeError as exc:
            db.rollback()

            yield make_event(
                "error",
                {
                    "error": str(exc),
                },
            )

        except Exception as exc:
            db.rollback()

            yield make_event(
                "error",
                {
                    "error": (
                        f"LLM streaming failed: {exc}"
                    ),
                },
            )

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
