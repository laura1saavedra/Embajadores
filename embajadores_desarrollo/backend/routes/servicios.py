"""
routes/servicios.py

Endpoints para consultar, crear, editar y eliminar servicios de aplicaciones.
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas.servicio_schemas import (
    ServicioCrear,
    ServicioActualizar,
)
from services.servicio_service import ServicioService


servicios_router = APIRouter()


@servicios_router.get("/")
def listar_servicios(
    aplicacion_id: Optional[int] = Query(None, description="Filtrar por aplicacion"),
):
    datos, error = ServicioService.listar_servicios(aplicacion_id=aplicacion_id)

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@servicios_router.get("/{id_servicio}")
def obtener_servicio(id_servicio: int):
    datos, error = ServicioService.obtener_servicio(id_servicio)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@servicios_router.post("/", status_code=201)
def crear_servicio(body: ServicioCrear):
    nombre = body.nombre_servicio.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del servicio es obligatorio"},
        )

    datos, error = ServicioService.crear_servicio(
        nombre_servicio=nombre,
        aplicacion_id=body.aplicacion_id,
    )

    if error:
        return JSONResponse(status_code=400, content={"error": error})

    return datos


@servicios_router.put("/{id_servicio}")
def actualizar_servicio(
    id_servicio: int,
    body: ServicioActualizar,
):
    if body.nombre_servicio is None and body.aplicacion_id is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar al menos un campo para actualizar"},
        )

    datos_actuales, error_actual = ServicioService.obtener_servicio(id_servicio)

    if error_actual:
        codigo = 404 if "no encontrado" in error_actual.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error_actual})

    nombre = (
        body.nombre_servicio.strip()
        if body.nombre_servicio is not None
        else datos_actuales["nombre_servicio"]
    )

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del servicio es obligatorio"},
        )

    datos, error = ServicioService.actualizar_servicio(
        id_servicio=id_servicio,
        nombre_servicio=nombre,
        aplicacion_id=(
            body.aplicacion_id
            if body.aplicacion_id is not None
            else datos_actuales["aplicacion_id"]
        ),
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@servicios_router.delete("/{id_servicio}")
def eliminar_servicio(id_servicio: int):
    resultado, error = ServicioService.eliminar_servicio(id_servicio)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado
