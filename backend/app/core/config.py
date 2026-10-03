from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NexaAI API"
    app_env: str = "development"
    debug: bool = True

    database_url: str = (
        "postgresql+psycopg://nexaai:nexaai@localhost:5433/nexaai"
    )
    redis_url: str = "redis://localhost:6379/0"

    cors_origins: list[str] = ["http://localhost:3000"]

    storage_root: str = "storage"
    upload_root: str = "storage/uploads"
    generated_root: str = "storage/generated"

    llm_provider: str = "transformers"
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_model: str = "Qwen/Qwen2.5-0.5B-Instruct"

    llm_max_new_tokens: int = 128
    llm_temperature: float = 0.7
    llm_top_p: float = 0.9

    available_models: list[str] = ["NexaAI Local"]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
        enable_decoding=False,
    )

    @field_validator("available_models", mode="before")
    @classmethod
    def parse_available_models(cls, value):
        if value is None:
            return []

        if isinstance(value, str):
            return [
                model.strip()
                for model in value.split(",")
                if model.strip()
            ]

        if isinstance(value, (list, tuple, set)):
            return [
                str(model).strip()
                for model in value
                if str(model).strip()
            ]

        raise TypeError(
            "AVAILABLE_MODELS must be a comma-separated string "
            "or a list of model names."
        )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if value is None:
            return []

        if isinstance(value, str):
            return [
                origin.strip()
                for origin in value.split(",")
                if origin.strip()
            ]

        if isinstance(value, (list, tuple, set)):
            return [
                str(origin).strip()
                for origin in value
                if str(origin).strip()
            ]

        raise TypeError(
            "CORS_ORIGINS must be a comma-separated string "
            "or a list of origins."
        )


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()