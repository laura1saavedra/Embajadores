"""
routes/cavs.py

Endpoints para consultar, crear, editar y eliminar CAVs.
Se usan desde formularios de incidentes y configuración avanzada.
"""

from typing import Optional

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas.cav_schemas import (
    CavCrear,
    CavActualizar,
)
from services.cav_service import CavService


cavs_router = APIRouter()


@cavs_router.get("/")
def listar_cavs(
    ciudad_id: Optional[int] = Query(None, description="Filtrar por ciudad"),
):
    datos, error = CavService.listar_cavs(
        ciudad_id=ciudad_id
    )

    if error:
        return JSONResponse(
            status_code=500,
            content={"error": error}
        )

    return datos


@cavs_router.get("/{id_cav}")
def obtener_cav(id_cav: int):
    datos, error = CavService.obtener_cav(
        id_cav
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


@cavs_router.post("/", status_code=201)
def crear_cav(body: CavCrear):
    nombre = body.nombre_cav.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del CAV es obligatorio"}
        )

    datos, error = CavService.crear_cav(
        nombre_cav=nombre,
        ciudad_id=body.ciudad_id,
    )

    if error:
        return JSONResponse(
            status_code=400,
            content={"error": error}
        )

    return datos


@cavs_router.put("/{id_cav}")
def actualizar_cav(
    id_cav: int,
    body: CavActualizar,
):
    if body.nombre_cav is None and body.ciudad_id is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar al menos un campo para actualizar"}
        )

    nombre = body.nombre_cav.strip() if body.nombre_cav is not None else None

    if body.nombre_cav is not None and not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del CAV es obligatorio"}
        )

    datos_actuales, error_actual = CavService.obtener_cav(id_cav)

    if error_actual:
        codigo = 404 if "no encontrado" in error_actual.lower() else 500

        return JSONResponse(
            status_code=codigo,
            content={"error": error_actual}
        )

    datos, error = CavService.actualizar_cav(
        id_cav=id_cav,
        nombre_cav=nombre if nombre is not None else datos_actuales["nombre_cav"],
        ciudad_id=body.ciudad_id if body.ciudad_id is not None else datos_actuales["ciudad_id"],
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


@cavs_router.delete("/{id_cav}")
def eliminar_cav(id_cav: int):
    resultado, error = CavService.eliminar_cav(
        id_cav
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return resultado