"""
routes/masivos.py

Endpoints para incidentes masivos:
  GET    /              - listar masivos con filtros
  GET    /resumen       - conteo por estado
  GET    /{idmasivo}    - detalle completo
  PATCH  /{idmasivo}/cerrar - cerrar masivo
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas.masivo_schemas import MasivoCambioEstado
from services.masivo_service import MasivoService


masivos_router = APIRouter()


@masivos_router.get("/resumen")
def resumen_masivos():
    datos, error = MasivoService.resumen()

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@masivos_router.get("/")
def listar_masivos(
    aplicacion_id: Optional[int] = Query(None),
    tipo_falla_id: Optional[int] = Query(None),
):
    datos, error = MasivoService.listar_masivos(
        aplicacion_id=aplicacion_id,
        tipo_falla_id=tipo_falla_id,
    )

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@masivos_router.get("/{idmasivo}")
def obtener_masivo(idmasivo: int):
    datos, error = MasivoService.obtener_masivo(idmasivo)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@masivos_router.patch("/{idmasivo}/cerrar")
def cerrar_masivo(idmasivo: int, body: MasivoCambioEstado):
    if body.estado != "cerrado":
        return JSONResponse(
            status_code=400,
            content={"error": "Solo se permite cerrar el incidente masivo"},
        )

    resultado, error = MasivoService.cerrar_masivo(idmasivo)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado