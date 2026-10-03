from datetime import datetime

from pydantic import BaseModel, Field


class ConversationCreate(BaseModel):
    session_id: str = Field(min_length=1, max_length=128)
    title: str = Field(default="New conversation", max_length=255)
    model: str | None = Field(default=None, max_length=255)


class ConversationResponse(BaseModel):
    id: str
    session_id: str
    title: str
    model: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {
        "from_attributes": True,
    }


class MessageCreate(BaseModel):
    content: str = Field(min_length=1)
    model: str | None = Field(default=None, max_length=255)


class MessageResponse(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    model: str | None
    input_tokens: int | None
    output_tokens: int | None
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }


class ConversationDetail(BaseModel):
    conversation: ConversationResponse
    messages: list[MessageResponse]