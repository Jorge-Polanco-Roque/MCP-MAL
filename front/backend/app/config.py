from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    openai_api_key: str
    mcp_server_url: str = "http://localhost:3000/mcp"
    mcp_api_key: str = ""
    backend_port: int = 8001
    cors_origins: str = "http://localhost:5173"
    openai_model: str = "gpt-4o"
    log_level: str = "info"
    chat_db_path: str = "./data/chat_memory.db"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()  # type: ignore[call-arg]
