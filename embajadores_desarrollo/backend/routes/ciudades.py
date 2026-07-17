"""
routes/ciudades.py

Endpoints para consultar, crear, editar y eliminar ciudades.
Se usan desde Configuración Avanzada.
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas.ciudad_schemas import (
    CiudadCrear,
    CiudadCompletaCrear,
    CiudadActualizar,
    CiudadEstadoActualizar,
)

from services.ciudad_service import CiudadService


ciudades_router = APIRouter()


# ─────────────────────────────────────────────────────────────
# Listar
# ─────────────────────────────────────────────────────────────

@ciudades_router.get("/")
def listar_ciudades(
    solo_activos: bool = Query(False, description="Retornar solo ciudades activas"),
):
    datos, error = CiudadService.listar_ciudades(
        incluir_cavs=True,
        solo_activos=solo_activos,
    )

    if error:
        return JSONResponse(
            status_code=500,
            content={"error": error}
        )

    return datos


@ciudades_router.patch("/{id_ciudad}/estado")
def cambiar_estado_ciudad(
    id_ciudad: int,
    body: CiudadEstadoActualizar,
):
    datos, error = CiudadService.cambiar_estado_ciudad(
        id_ciudad=id_ciudad,
        activo=body.activo,
    )

    if error:
        codigo = 404 if "no encontrada" in error.lower() else 400

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


# ─────────────────────────────────────────────────────────────
# Obtener por ID
# ─────────────────────────────────────────────────────────────

@ciudades_router.get("/{id_ciudad}")
def obtener_ciudad(id_ciudad: int):
    datos, error = CiudadService.obtener_ciudad(
        id_ciudad
    )

    if error:
        codigo = (
            404
            if "no encontrada" in error.lower()
            else 500
        )

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


# ─────────────────────────────────────────────────────────────
# Crear ciudad
# ─────────────────────────────────────────────────────────────

@ciudades_router.post("/", status_code=201)
def crear_ciudad(body: CiudadCrear):

    nombre = body.nombre_ciudad.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={
                "error": "El nombre de la ciudad es obligatorio"
            }
        )

    datos, error = CiudadService.crear_ciudad(
        nombre_ciudad=nombre
    )

    if error:
        return JSONResponse(
            status_code=400,
            content={"error": error}
        )

    return datos


# ─────────────────────────────────────────────────────────────
# Crear ciudad + CAVs
# Endpoint pensado para el mockup de configuración avanzada
# ─────────────────────────────────────────────────────────────

@ciudades_router.post("/completa", status_code=201)
def crear_ciudad_completa(body: CiudadCompletaCrear):

    nombre = body.nombre_ciudad.strip()

    

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={
                "error": "El nombre de la ciudad es obligatorio"
            }
        )
    
    cavs_validos = [
        {
            "nombre_cav": cav.nombre_cav.strip(),
            "direccion": cav.direccion.strip(),
            "nombre_jefe": cav.nombre_jefe.strip(),
            "nombre_supervisor": (cav.nombre_supervisor or "").strip(),
            "supervisores": [supervisor.model_dump() for supervisor in cav.supervisores],
            "numero_terminales": cav.numero_terminales,
        }
        for cav in body.cavs
        if cav.nombre_cav.strip()
    ]

    if len(cavs_validos) == 0:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Debe registrar al menos un CAV para crear la ciudad"
            }
        )

    datos, error = CiudadService.crear_ciudad_completa(
        nombre_ciudad=nombre,
        cavs=cavs_validos
    )

    if error:
        return JSONResponse(
            status_code=400,
            content={"error": error}
        )

    return datos


# ─────────────────────────────────────────────────────────────
# Actualizar
# ─────────────────────────────────────────────────────────────

@ciudades_router.put("/{id_ciudad}")
def actualizar_ciudad(
    id_ciudad: int,
    body: CiudadActualizar,
):

    if body.nombre_ciudad is None:
        return JSONResponse(
            status_code=400,
            content={
                "error": "Debe enviar al menos un campo para actualizar"
            }
        )

    nombre = body.nombre_ciudad.strip()

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={
                "error": "El nombre de la ciudad es obligatorio"
            }
        )

    datos, error = CiudadService.actualizar_ciudad(
        id_ciudad=id_ciudad,
        nombre_ciudad=nombre,
    )

    if error:
        codigo = (
            404
            if "no encontrada" in error.lower()
            else 400
        )

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return datos


# ─────────────────────────────────────────────────────────────
# Eliminar
# ─────────────────────────────────────────────────────────────

@ciudades_router.delete("/{id_ciudad}")
def eliminar_ciudad(id_ciudad: int):

    resultado, error = CiudadService.eliminar_ciudad(
        id_ciudad
    )

    if error:
        codigo = (
            404
            if "no encontrada" in error.lower()
            else 400
        )

        return JSONResponse(
            status_code=codigo,
            content={"error": error}
        )

    return resultado
