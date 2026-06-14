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
# from routes.contactos import contactos_router
from routes.incidentes import incidentes_router
from routes.whatsapp import whatsapp_router
from routes.aplicaciones import aplicaciones_router
from routes.tipos_falla import tipos_falla_router
from routes.masivos import masivos_router
from services.masivo_service import MasivoService

app.include_router(auth_router, prefix="/api/auth", tags=["Autenticacion"])
app.include_router(ciudades_router, prefix="/api/ciudades", tags=["Ciudades"])
app.include_router(cavs_router, prefix="/api/cavs", tags=["CAV"])
app.include_router(usuarios_router, prefix="/api/usuarios", tags=["Usuarios"])
# app.include_router(contactos_router, prefix="/api/contactos", tags=["Contactos"])
app.include_router(incidentes_router, prefix="/api/incidentes", tags=["Incidentes"])
app.include_router(whatsapp_router, prefix="/api/whatsapp", tags=["WhatsApp Grupos"])
app.include_router(aplicaciones_router, prefix="/api/aplicaciones", tags=["Aplicaciones"])
app.include_router(tipos_falla_router, prefix="/api/tipos-falla", tags=["Tipos de Falla"])
app.include_router(masivos_router, prefix="/api/masivos", tags=["Incidentes Masivos"])

logger.info(
    "Routers registrados: auth, ciudades, cavs, usuarios, incidentes, whatsapp, aplicaciones, tipos-falla, masivos"
)


# ── Tarea automatica de masivos ───────────────────────────────────────────────
async def tarea_asociar_incidentes_masivos():
    """
    Ejecuta cada 5 minutos la asociacion automatica
    de incidentes individuales a masivos activos.
    """
    while True:
        try:
            resultado, error = MasivoService.asociar_incidentes_a_masivos_activos()

            if error:
                logger.error(f"Error en tarea automatica de masivos: {error}")
            else:
                logger.info(f"Tarea automatica de masivos ejecutada: {resultado}")

        except Exception as e:
            logger.error(f"Error inesperado en tarea automatica de masivos: {e}")

        await asyncio.sleep(30)


# ── Startup ───────────────────────────────────────────────────────────────────
@app.on_event("startup")
def startup_check():
    db_ok = check_connection()

    if db_ok:
        logger.info("Conexion a base de datos verificada correctamente")
        asyncio.create_task(tarea_asociar_incidentes_masivos())
        logger.info("Tarea automatica de asociacion de masivos iniciada")
    else:
        logger.error("No fue posible conectar con la base de datos")


# ── Endpoints de sistema ──────────────────────────────────────────────────────
@app.get("/", tags=["Sistema"])
def root():
    return {
        "mensaje": "Embajadores API activa",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "ciudades": "/api/ciudades",
            "cavs": "/api/cavs",
            "usuarios": "/api/usuarios",
            "contactos": "/api/contactos",
            "incidentes": "/api/incidentes",
            "masivos": "/api/masivos",
            "aplicaciones": "/api/aplicaciones",
            "docs": "/docs",
            "health": "/health",
        },
    }


@app.get("/health", tags=["Sistema"])
def health_check():
    db_ok = check_connection()
    estado = "ok" if db_ok else "error"
    codigo = 200 if db_ok else 503

    return JSONResponse(
        status_code=codigo,
        content={
            "estado": estado,
            "base_de_datos": "conectada" if db_ok else "sin conexion",
            "base": DB_NAME,
            "host": DB_HOST,
            "timestamp": datetime.now().isoformat(),
        },
    )


@app.get("/debug/tablas", tags=["Debug"])
def listar_tablas():
    """
    Lista las tablas del esquema API_PROD.
    Solo para desarrollo.
    """
    from sqlalchemy import text
    from db import engine

    with engine.connect() as conn:
        result = conn.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'API_PROD' "
                "ORDER BY table_name"
            )
        )
        tablas = [row[0] for row in result]

    return {
        "esquema": "API_PROD",
        "tablas": tablas,
    }


# ── Punto de entrada ──────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn

    enable_reload = os.getenv("UVICORN_RELOAD", "false").lower() == "true"

    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=API_PORT,
        reload=enable_reload,
    )
