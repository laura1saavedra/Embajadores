"""
routes/incidentes.py

CRUD completo de incidentes:
  GET    /                      - listar con filtros
  POST   /                      - crear incidente
  GET    /resumen                - conteo por estado (para cards)
  GET    /{id}                   - detalle completo
  PUT    /{id}                   - actualizar campos editables
  PATCH  /{id}/estado            - cambiar estado
  GET    /{id}/historial         - trazabilidad de cambios
  DELETE /{id}                   - eliminar (solo cerrados)
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas.incidente_schemas import (
    IncidenteCrear,
    IncidenteActualizar,
    CambioEstado,
)
from services.incidente_service import IncidenteService
from services import whatsapp_service

incidentes_router = APIRouter()


# ── Endpoints ─────────────────────────────────────────────────────────────────

@incidentes_router.get("/resumen")
def resumen_incidentes():
    datos, error = IncidenteService.resumen()
    if error:
        return JSONResponse(status_code=500, content={"error": error})
    return datos

@incidentes_router.get("/whatsapp/estado")
async def estado_whatsapp():
    resultado = await whatsapp_service.verificar_conexion()
    return resultado

@incidentes_router.get("/")
def listar_incidentes(
    estado: Optional[str] = Query(None),
    cav_id: Optional[int] = Query(None),
    ciudad_id: Optional[int] = Query(None),
    tipo_falla: Optional[str] = Query(None),
    busqueda: Optional[str] = Query(None),
    anio: Optional[int] = Query(None),
    mes: Optional[int] = Query(None),
    dia: Optional[int] = Query(None),
):
    datos, error = IncidenteService.listar_incidentes(
        estado=estado,
        cav_id=cav_id,
        ciudad_id=ciudad_id,
        tipo_falla=tipo_falla,
        busqueda=busqueda,
        anio=anio,
        mes=mes,
        dia=dia,
    )

    if error:
        return JSONResponse(status_code=500, content={"error": error})
    return datos


@incidentes_router.post("/", status_code=201)
async def crear_incidente(body: IncidenteCrear):
    datos = body.model_dump()

    incidente, error = IncidenteService.crear_incidente(
        datos=datos
    )
    if error:
        return JSONResponse(status_code=400, content={"error": error})

    return incidente


@incidentes_router.get("/{id_incidente}")
def obtener_incidente(id_incidente: int):
    datos, error = IncidenteService.obtener_incidente(id_incidente)
    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error})
    return datos


@incidentes_router.put("/{id_incidente}")
def actualizar_incidente(id_incidente: int, body: IncidenteActualizar):
    # exclude_unset=True garantiza que solo se incluyan los campos enviados por el cliente
    datos = {
        k: v
        for k, v in body.model_dump(exclude_unset=True).items()
    }
    resultado, error = IncidenteService.actualizar_incidente(
        id_incidente,
        datos
    )
    
    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})
    return resultado


@incidentes_router.patch("/{id_incidente}/estado")
async def cambiar_estado(
    id_incidente: int,
    body: CambioEstado,
):
    resultado, error = IncidenteService.cambiar_estado(
        id_incidente=id_incidente,
        nuevo_estado=body.estado,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado


@incidentes_router.get("/{id_incidente}/historial")
def obtener_historial(id_incidente: int):
    datos, error = IncidenteService.obtener_historial(id_incidente)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@incidentes_router.delete("/{id_incidente}")
def eliminar_incidente(id_incidente: int):
    resultado, error = IncidenteService.eliminar_incidente(id_incidente)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado