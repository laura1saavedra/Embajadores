"""
routes/tipos_falla.py

Endpoints para consultar, crear, editar y eliminar tipos de falla.
Se usan desde el frontend para poblar selectores y para configuración avanzada.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.tipo_falla_schemas import (
    TipoFallaCrear,
    TipoFallaActualizar,
)
from services.tipo_falla_service import TipoFallaService


tipos_falla_router = APIRouter()


@tipos_falla_router.get("/")
def listar_tipos_falla():
    datos, error = TipoFallaService.listar_tipos_falla()

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@tipos_falla_router.get("/{id_tipo_falla}")
def obtener_tipo_falla(id_tipo_falla: int):
    datos, error = TipoFallaService.obtener_tipo_falla(id_tipo_falla)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@tipos_falla_router.post("/", status_code=201)
def crear_tipo_falla(body: TipoFallaCrear):
    nombre = body.nombre_tipo.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del tipo de falla es obligatorio"},
        )

    datos, error = TipoFallaService.crear_tipo_falla(nombre_tipo=nombre)

    if error:
        return JSONResponse(status_code=400, content={"error": error})

    return datos


@tipos_falla_router.put("/{id_tipo_falla}")
def actualizar_tipo_falla(
    id_tipo_falla: int,
    body: TipoFallaActualizar,
):
    if body.nombre_tipo is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar al menos un campo para actualizar"},
        )

    nombre = body.nombre_tipo.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del tipo de falla es obligatorio"},
        )

    datos, error = TipoFallaService.actualizar_tipo_falla(
        id_tipo_falla=id_tipo_falla,
        nombre_tipo=nombre,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@tipos_falla_router.delete("/{id_tipo_falla}")
def eliminar_tipo_falla(id_tipo_falla: int):
    resultado, error = TipoFallaService.eliminar_tipo_falla(id_tipo_falla)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado