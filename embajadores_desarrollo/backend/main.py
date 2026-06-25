"""
main.py

Punto de entrada de la API Embajadores.
Registra todos los routers, configura CORS y expone endpoints de diagnostico.
"""

import os
import logging
import asyncio
from datetime import datetime

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv, find_dotenv

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# ── Cargar .env ───────────────────────────────────────────────────────────────
dotenv_path = find_dotenv()
if dotenv_path:
    load_dotenv(dotenv_path, override=False)
    logger.info(f"Configuracion cargada desde: {dotenv_path}")
else:
    logger.info("Sin archivo .env — usando variables del sistema")

# ── Leer configuracion ────────────────────────────────────────────────────────
API_PORT = int(os.getenv("API_PORT", 9000))
DB_NAME = os.getenv("DB_NAME", "NO_CONFIGURADO")
DB_HOST = os.getenv("DB_HOST", "NO_CONFIGURADO")
DB_PORT = os.getenv("DB_PORT", "NO_CONFIGURADO")
DB_USER = os.getenv("DB_USER", "NO_CONFIGURADO")

logger.info("=" * 60)
logger.info("EMBAJADORES API")
logger.info(f"  Base de datos : {DB_NAME}")
logger.info(f"  Host          : {DB_HOST}:{DB_PORT}")
logger.info(f"  Usuario BD    : {DB_USER}")
logger.info(f"  Puerto API    : {API_PORT}")
logger.info("=" * 60)

# ── Importar conexion y modelos ───────────────────────────────────────────────
from db import check_connection
import models  # noqa: F401

# ── CORS ──────────────────────────────────────────────────────────────────────
cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000")
cors_origins = [o.strip() for o in cors_raw.split(",") if o.strip()]

# ── Crear aplicacion FastAPI ──────────────────────────────────────────────────
app = FastAPI(
    title="Embajadores API",
    description="API de gestion de incidentes — Plataforma Embajadores",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── Middleware CORS ───────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Manejador global de excepciones ───────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Error no manejado: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "error": "Error interno del servidor",
            "detalle": str(exc),
        },
    )

# ── Registrar routers ─────────────────────────────────────────────────────────
from routes.auth import auth_router
from routes.ciudades import ciudades_router
from routes.cavs import cavs_router
from routes.usuarios import usuarios_router
from routes.contactos import contactos_router
from routes.incidentes import incidentes_router
from routes.whatsapp import whatsapp_router
from routes.aplicaciones import aplicaciones_router
from routes.servicios import servicios_router
from routes.tipos_falla import tipos_falla_router
from routes.masivos import masivos_router
from services.masivo_service import MasivoService

app.include_router(auth_router, prefix="/api/auth", tags=["Autenticacion"])