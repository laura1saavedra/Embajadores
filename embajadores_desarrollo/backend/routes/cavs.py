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
    CavEstadoActualizar,
)
from services.cav_service import CavService


cavs_router = APIRouter()


def _texto_limpio(valor: Optional[str]) -> Optional[str]:
    if valor is None:
        return None

    texto = valor.strip()
    return texto or None


@cavs_router.get("/")
def listar_cavs(
    ciudad_id: Optional[int] = Query(None, description="Filtrar por ciudad"),
    solo_activos: bool = Query(False, description="Retornar solo CAVs activos"),
):
    datos, error = CavService.listar_cavs(
        ciudad_id=ciudad_id,
        solo_activos=solo_activos,
    )

    if error:
        return JSONResponse(
            status_code=500,
            content={"error": error}
        )

    return datos


@cavs_router.patch("/{id_cav}/estado")
def cambiar_estado_cav(
    id_cav: int,
    body: CavEstadoActualizar,
):
    datos, error = CavService.cambiar_estado_cav(
        id_cav=id_cav,
        activo=body.activo,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400

        return JSONResponse(
            status_code=codigo,
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
    direccion = _texto_limpio(body.direccion)
    nombre_jefe = _texto_limpio(body.nombre_jefe)
    nombre_supervisor = _texto_limpio(body.nombre_supervisor)
    supervisores = [supervisor.model_dump() for supervisor in body.supervisores]

    if not nombre:
        return JSONResponse(
            status_code=400,
            content={"error": "El nombre del CAV es obligatorio"}
        )

    if body.numero_terminales is not None and body.numero_terminales <= 0:
        return JSONResponse(
            status_code=400,
            content={"error": "El numero de terminales debe ser mayor a cero"}
        )

    datos, error = CavService.crear_cav(
        nombre_cav=nombre,
        ciudad_id=body.ciudad_id,
        direccion=direccion,
        nombre_jefe=nombre_jefe,
        nombre_supervisor=nombre_supervisor,
        supervisores=supervisores,
        numero_terminales=body.numero_terminales,
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
    if (
        body.nombre_cav is None
        and body.ciudad_id is None
        and body.direccion is None
        and body.nombre_jefe is None
        and body.nombre_supervisor is None
        and body.supervisores is None
        and body.numero_terminales is None
    ):
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

    if body.numero_terminales is not None and body.numero_terminales <= 0:
        return JSONResponse(
            status_code=400,
            content={"error": "El numero de terminales debe ser mayor a cero"}
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
        direccion=(
            _texto_limpio(body.direccion)
            if body.direccion is not None
            else datos_actuales.get("direccion")
        ),
        nombre_jefe=(
            _texto_limpio(body.nombre_jefe)
            if body.nombre_jefe is not None
            else datos_actuales.get("nombre_jefe")
        ),
        nombre_supervisor=(
            _texto_limpio(body.nombre_supervisor)
            if body.nombre_supervisor is not None
            else datos_actuales.get("nombre_supervisor")
        ),
        supervisores=(
            [supervisor.model_dump() for supervisor in body.supervisores]
            if body.supervisores is not None
            else datos_actuales.get("supervisores", [])
        ),
        numero_terminales=(
            body.numero_terminales
            if body.numero_terminales is not None
            else datos_actuales.get("numero_terminales")
        ),
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
