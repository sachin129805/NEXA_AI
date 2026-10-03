from __future__ import annotations

import threading
import time
from dataclasses import dataclass
from typing import Iterable, Iterator

import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    TextIteratorStreamer,
)

from app.core.config import settings


@dataclass
class LLMResponse:
    content: str
    model: str
    provider: str
    input_tokens: int
    output_tokens: int
    total_tokens: int
    finish_reason: str
    generation_time_ms: int

    @property
    def text(self) -> str:
        return self.content


class LLMService:
    """
    Central inference service for NexaAI.

    The rest of the application talks to this service instead of
    talking directly to a specific model.

    This means we can later replace Qwen with the actual NexaAI
    model without rewriting the chat application.
    """

    _tokenizer = None
    _model = None
    _model_name: str | None = None

    _load_lock = threading.Lock()
    _generation_lock = threading.Lock()

    def __init__(self) -> None:
        self.provider = settings.llm_provider

    # ---------------------------------------------------------
    # MODEL LOADING
    # ---------------------------------------------------------

    def _load_transformers_model(self):
        model_name = settings.llm_model

        if (
            self.__class__._model is not None
            and self.__class__._tokenizer is not None
            and self.__class__._model_name == model_name
        ):
            return (
                self.__class__._tokenizer,
                self.__class__._model,
            )

        with self.__class__._load_lock:
            if (
                self.__class__._model is not None
                and self.__class__._tokenizer is not None
                and self.__class__._model_name == model_name
            ):
                return (
                    self.__class__._tokenizer,
                    self.__class__._model,
                )

            print(f"[NexaAI] Loading actual local model: {model_name}")

            start = time.perf_counter()

            tokenizer = AutoTokenizer.from_pretrained(
                model_name,
                trust_remote_code=True,
            )

            if tokenizer.pad_token is None:
                tokenizer.pad_token = tokenizer.eos_token

            use_cuda = torch.cuda.is_available()

            if use_cuda:
                print(
                    f"[NexaAI] Device: CUDA - "
                    f"{torch.cuda.get_device_name(0)}"
                )

                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float16,
                    device_map="auto",
                    trust_remote_code=True,
                )
            else:
                print("[NexaAI] Device: CPU")

                model = AutoModelForCausalLM.from_pretrained(
                    model_name,
                    torch_dtype=torch.float32,
                    trust_remote_code=True,
                )

            model.eval()

            self.__class__._tokenizer = tokenizer
            self.__class__._model = model
            self.__class__._model_name = model_name

            elapsed = int(
                (time.perf_counter() - start) * 1000
            )

            print(
                f"[NexaAI] Model loaded successfully: "
                f"{model_name}"
            )
            print(
                f"[NexaAI] Model load time: {elapsed} ms"
            )

            return tokenizer, model

    # ---------------------------------------------------------
    # DEVICE
    # ---------------------------------------------------------

    def _get_model_device(self, model):
        try:
            return next(model.parameters()).device
        except StopIteration:
            return torch.device("cpu")

    # ---------------------------------------------------------
    # MESSAGE PREPARATION
    # ---------------------------------------------------------

    def _prepare_messages(
        self,
        messages: list[dict],
    ) -> list[dict]:
        cleaned: list[dict] = []

        for message in messages[-12:]:
            role = message.get("role")
            content = message.get("content")

            if role not in {"system", "user", "assistant"}:
                continue

            if not content:
                continue

            cleaned.append(
                {
                    "role": role,
                    "content": str(content),
                }
            )

        return cleaned

    # ---------------------------------------------------------
    # PROMPT
    # ---------------------------------------------------------

    def _build_prompt(
        self,
        tokenizer,
        messages: list[dict],
    ) -> str:
        messages = self._prepare_messages(messages)

        if hasattr(tokenizer, "apply_chat_template"):
            try:
                return tokenizer.apply_chat_template(
                    messages,
                    tokenize=False,
                    add_generation_prompt=True,
                )
            except Exception:
                pass

        parts: list[str] = []

        for message in messages:
            role = message["role"]
            content = message["content"]

            if role == "system":
                parts.append(
                    f"System: {content}"
                )
            elif role == "user":
                parts.append(
                    f"User: {content}"
                )
            else:
                parts.append(
                    f"Assistant: {content}"
                )

        parts.append("Assistant:")

        return "\n\n".join(parts)

    # ---------------------------------------------------------
    # NORMAL GENERATION
    # ---------------------------------------------------------

    def _generate_transformers(
        self,
        messages: list[dict],
        model_name: str | None = None,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
    ) -> LLMResponse:

        tokenizer, model = self._load_transformers_model()

        prompt = self._build_prompt(
            tokenizer,
            messages,
        )

        tokenization_start = time.perf_counter()

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
        )

        tokenization_ms = int(
            (time.perf_counter() - tokenization_start)
            * 1000
        )

        device = self._get_model_device(model)

        inputs = {
            key: value.to(device)
            for key, value in inputs.items()
        }

        input_tokens = int(
            inputs["input_ids"].shape[-1]
        )

        configured_max = (
            max_new_tokens
            or settings.llm_max_new_tokens
            or 128
        )

        max_tokens = min(
            int(configured_max),
            128,
        )

        temperature_value = (
            temperature
            if temperature is not None
            else settings.llm_temperature
        )

        top_p_value = (
            top_p
            if top_p is not None
            else settings.llm_top_p
        )

        start = time.perf_counter()

        with torch.inference_mode():

            output_ids = model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=True,
                temperature=max(
                    float(temperature_value),
                    0.01,
                ),
                top_p=float(top_p_value),
                use_cache=True,
                pad_token_id=tokenizer.pad_token_id,
                eos_token_id=tokenizer.eos_token_id,
            )

        generation_ms = int(
            (time.perf_counter() - start) * 1000
        )

        generated_ids = output_ids[
            0,
            input_tokens:,
        ]

        output_tokens = int(
            generated_ids.shape[-1]
        )

        content = tokenizer.decode(
            generated_ids,
            skip_special_tokens=True,
        ).strip()

        speed = (
            output_tokens
            / max(generation_ms / 1000, 0.001)
        )

        print(
            f"[NexaAI] Input: {input_tokens} tokens | "
            f"Output: {output_tokens} tokens | "
            f"Generation: {generation_ms} ms | "
            f"Speed: {speed:.2f} tok/s | "
            f"Tokenization: {tokenization_ms} ms"
        )

        return LLMResponse(
            content=content,
            model=model_name or settings.llm_model,
            provider=self.provider,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            total_tokens=input_tokens + output_tokens,
            finish_reason="stop"
            if output_tokens < max_tokens
            else "length",
            generation_time_ms=generation_ms,
        )

    # ---------------------------------------------------------
    # STREAMING GENERATION
    # ---------------------------------------------------------

    def stream_transformers(
        self,
        messages: list[dict],
        model_name: str | None = None,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
    ) -> Iterator[str]:
        """
        Stream generated text pieces as they are produced.

        Transformers generation itself runs inside a background
        thread so the FastAPI request can continuously yield
        chunks to the browser.
        """

        tokenizer, model = self._load_transformers_model()

        prompt = self._build_prompt(
            tokenizer,
            messages,
        )

        inputs = tokenizer(
            prompt,
            return_tensors="pt",
        )

        device = self._get_model_device(model)

        inputs = {
            key: value.to(device)
            for key, value in inputs.items()
        }

        input_tokens = int(
            inputs["input_ids"].shape[-1]
        )

        configured_max = (
            max_new_tokens
            or settings.llm_max_new_tokens
            or 128
        )

        max_tokens = min(
            int(configured_max),
            128,
        )

        temperature_value = (
            temperature
            if temperature is not None
            else settings.llm_temperature
        )

        top_p_value = (
            top_p
            if top_p is not None
            else settings.llm_top_p
        )

        streamer = TextIteratorStreamer(
            tokenizer,
            skip_prompt=True,
            skip_special_tokens=True,
        )

        generation_kwargs = {
            **inputs,
            "streamer": streamer,
            "max_new_tokens": max_tokens,
            "do_sample": True,
            "temperature": max(
                float(temperature_value),
                0.01,
            ),
            "top_p": float(top_p_value),
            "use_cache": True,
            "pad_token_id": tokenizer.pad_token_id,
            "eos_token_id": tokenizer.eos_token_id,
        }

        generation_error: list[BaseException] = []

        def generate():
            try:
                with torch.inference_mode():
                    model.generate(
                        **generation_kwargs
                    )
            except BaseException as exc:
                generation_error.append(exc)

        start = time.perf_counter()

        worker = threading.Thread(
            target=generate,
            daemon=True,
        )

        worker.start()

        generated_text = ""

        for text_piece in streamer:
            if generation_error:
                raise generation_error[0]

            if not text_piece:
                continue

            generated_text += text_piece

            yield text_piece

        worker.join()

        if generation_error:
            raise generation_error[0]

        generation_ms = int(
            (time.perf_counter() - start)
            * 1000
        )

        output_tokens = 0

        try:
            output_tokens = len(
                tokenizer.encode(
                    generated_text,
                    add_special_tokens=False,
                )
            )
        except Exception:
            pass

        speed = (
            output_tokens
            / max(generation_ms / 1000, 0.001)
        )

        print(
            f"[NexaAI] Stream complete | "
            f"Input: {input_tokens} tokens | "
            f"Output: {output_tokens} tokens | "
            f"Generation: {generation_ms} ms | "
            f"Speed: {speed:.2f} tok/s"
        )

    # ---------------------------------------------------------
    # PUBLIC API
    # ---------------------------------------------------------

    async def generate(
        self,
        messages: list[dict],
        model: str | None = None,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
    ) -> LLMResponse:

        resolved_model = (
            settings.llm_model
            if not model
            or model == settings.available_models[0]
            else settings.llm_model
        )

        if self.provider == "transformers":
            return self._generate_transformers(
                messages=messages,
                model_name=resolved_model,
                max_new_tokens=max_new_tokens,
                temperature=temperature,
                top_p=top_p,
            )

        raise RuntimeError(
            f"Unsupported LLM provider: {self.provider}"
        )

    def stream(
        self,
        messages: list[dict],
        model: str | None = None,
        max_new_tokens: int | None = None,
        temperature: float | None = None,
        top_p: float | None = None,
    ) -> Iterator[str]:

        resolved_model = (
            settings.llm_model
            if not model
            or model == settings.available_models[0]
            else settings.llm_model
        )

        if self.provider != "transformers":
            raise RuntimeError(
                f"Unsupported LLM provider: {self.provider}"
            )

        yield from self.stream_transformers(
            messages=messages,
            model_name=resolved_model,
            max_new_tokens=max_new_tokens,
            temperature=temperature,
            top_p=top_p,
        )


llm_service = LLMService()
