"""
routes/masivos.py

Endpoints para incidentes masivos:
  GET    /              - listar masivos con filtros
  GET    /resumen       - conteo por estado
  GET    /{idmasivo}    - detalle completo
  PATCH  /{idmasivo}/cerrar - cerrar masivo
"""

from typing import Optional
import unicodedata

from fastapi import APIRouter, Header, Query
from fastapi.responses import JSONResponse

from schemas.masivo_schemas import MasivoCambioEstado
from services.auth_service import AuthService
from services.masivo_service import MasivoService


masivos_router = APIRouter()


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


def _normalizar_permiso(nombre: str) -> str:
    texto = unicodedata.normalize("NFKD", nombre or "")
    return "".join(c for c in texto if not unicodedata.combining(c)).lower().strip()


def _validar_permiso(authorization: Optional[str], permiso_requerido: str):
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
            content={"error": "No tienes permiso para cerrar incidentes masivos"},
        )

    return usuario, None


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
def cerrar_masivo(
    idmasivo: int,
    body: MasivoCambioEstado,
    authorization: Optional[str] = Header(default=None),
):
    _, respuesta_error = _validar_permiso(
        authorization,
        "Cerrar incidente masivo",
    )
    if respuesta_error:
        return respuesta_error

    if body.estado != "cerrado":
        return JSONResponse(
            status_code=400,
            content={"error": "Solo se permite cerrar el incidente masivo"},
        )

    resultado, error = MasivoService.cerrar_masivo(
        idmasivo,
        nota_cierre=body.nota_cierre,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado
