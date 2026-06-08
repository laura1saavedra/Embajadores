"""
routes/aplicaciones.py

Endpoints para consultar, crear, editar y eliminar aplicaciones.
Se usan desde el frontend para poblar selectores y para configuración avanzada.
"""

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.aplicacion_schemas import (
    AplicacionCrear,
    AplicacionActualizar,
)
from services.aplicacion_service import AplicacionService


aplicaciones_router = APIRouter()


# ── Endpoints ────────────────────────────────────────────────────────────────

@aplicaciones_router.get("/")
def listar_aplicaciones():
    """Lista todas las aplicaciones registradas, ordenadas por nombre."""
    datos, error = AplicacionService.listar_aplicaciones()

    if error:
        return JSONResponse(
            status_code=500,
            content={"error": error}
        )

    return datos


@aplicaciones_router.get("/{id_aplicacion}")
def obtener_aplicacion(id_aplicacion: int):
    """Obtiene una aplicación por ID."""
    datos, error = AplicacionService.obtener_aplicacion(
        id_aplicacion
    )

    if error:
        codigo = 404 if "no encontrada" in error.lower() else 500

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


@aplicaciones_router.post("/", status_code=201)
def crear_aplicacion(body: AplicacionCrear):
    """Crea una nueva aplicación validando duplicados."""
    nombre = body.nombre_aplicacion.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre de la aplicación es obligatorio"}
        )

    datos, error = AplicacionService.crear_aplicacion(
        nombre_aplicacion=nombre
    )

    if error:
        return JSONResponse(
            status_code=400,
            content={"error": error}
        )

    return datos


@aplicaciones_router.put("/{id_aplicacion}")
def actualizar_aplicacion(
    id_aplicacion: int,
    body: AplicacionActualizar,
):
    """Actualiza una aplicación existente validando duplicados."""
    if body.nombre_aplicacion is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar al menos un campo para actualizar"}
        )

    nombre = body.nombre_aplicacion.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre de la aplicación es obligatorio"}
        )

    datos, error = AplicacionService.actualizar_aplicacion(
        id_aplicacion=id_aplicacion,
        nombre_aplicacion=nombre,
    )

    if error:
        codigo = 404 if "no encontrada" in error.lower() else 400

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


@aplicaciones_router.delete("/{id_aplicacion}")
def eliminar_aplicacion(id_aplicacion: int):
    """Elimina una aplicación si no tiene relaciones asociadas."""
    resultado, error = AplicacionService.eliminar_aplicacion(
        id_aplicacion
    )

    if error:
        codigo = 404 if "no encontrada" in error.lower() else 400

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return resultado