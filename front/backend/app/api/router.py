from fastapi import APIRouter

from app.api.chat import router as chat_router
from app.api.dashboard import router as dashboard_router
from app.api.agents import router as agents_router
from app.api.data import router as data_router

api_router = APIRouter()
api_router.include_router(chat_router)
api_router.include_router(dashboard_router)
api_router.include_router(agents_router)
api_router.include_router(data_router)
