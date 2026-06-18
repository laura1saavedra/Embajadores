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

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse

from schemas.incidente_schemas import (
    IncidenteCrear,
    IncidenteActualizar,
    CambioEstado,
)
from services.incidente_service import IncidenteService
from services.auth_service import AuthService
from services import whatsapp_service

incidentes_router = APIRouter()


def _extraer_token_authorization(authorization: Optional[str]):
    if not authorization:
        return None, JSONResponse(
            status_code=401,
            content={"error": "Token de autenticacion requerido"},
        )

    esquema, _, token = authorization.partition(" ")

    if esquema.lower() != "bearer" or not token:
        return None, JSONResponse(
            status_code=401,
            content={"error": "Formato de token invalido"},
        )

    return token, None


def _validar_administrador(
    authorization: Optional[str],
    mensaje_permiso: str = "Solo un administrador puede cerrar incidentes",
):
    token, respuesta_error = _extraer_token_authorization(authorization)
    if respuesta_error:
        return None, respuesta_error

    usuario, error = AuthService.obtener_usuario_por_token(token)
    if error:
        return None, JSONResponse(status_code=401, content={"error": error})

    rol_nombre = (usuario.get("rol_nombre") or "").lower()
    if "admin" not in rol_nombre:
        return None, JSONResponse(
            status_code=403,
            content={"error": mensaje_permiso},
        )

    return usuario, None


def _normalizar_permiso(nombre: str) -> str:
    reemplazos = str.maketrans("áéíóúÁÉÍÓÚñÑ", "aeiouAEIOUnN")
    return (nombre or "").translate(reemplazos).lower().strip()


def _validar_permiso(
    authorization: Optional[str],
    permiso_requerido: str,
    mensaje_permiso: str,
):
    token, respuesta_error = _extraer_token_authorization(authorization)
    if respuesta_error:
        return None, respuesta_error

    usuario, error = AuthService.obtener_usuario_por_token(token)
    if error:
        return None, JSONResponse(status_code=401, content={"error": error})

    permisos = usuario.get("permisos") or []
    permiso_normalizado = _normalizar_permiso(permiso_requerido)
    tiene_permiso = any(
        _normalizar_permiso(permiso.get("name") or permiso.get("nombre_permiso"))
        == permiso_normalizado
        for permiso in permisos
    )

    if not tiene_permiso:
        return None, JSONResponse(
            status_code=403,
            content={"error": mensaje_permiso},
        )

    return usuario, None


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
def actualizar_incidente(
    id_incidente: int,
    body: IncidenteActualizar,
    authorization: Optional[str] = Header(default=None),
):
    _, respuesta_error = _validar_administrador(
        authorization,
        "Solo un administrador puede editar incidentes",
    )
    if respuesta_error:
        return respuesta_error

    if body.estado == "cerrado":
        _, respuesta_error = _validar_permiso(
            authorization,
            "Cerrar incidente",
            "No tienes permiso para cerrar incidentes",
        )
        if respuesta_error:
            return respuesta_error

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
    authorization: Optional[str] = Header(default=None),
):
    _, respuesta_error = _validar_permiso(
        authorization,
        "Cerrar incidente",
        "No tienes permiso para cerrar incidentes",
    )
    if respuesta_error:
        return respuesta_error

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
def eliminar_incidente(
    id_incidente: int,
    authorization: Optional[str] = Header(default=None),
):
    _, respuesta_error = _validar_administrador(
        authorization,
        "Solo un administrador puede eliminar incidentes",
    )
    if respuesta_error:
        return respuesta_error

    resultado, error = IncidenteService.eliminar_incidente(id_incidente)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado
