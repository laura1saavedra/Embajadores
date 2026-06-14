"""
routes/auth.py

Endpoints de autenticacion para Embajadores.
Basado en el flujo adaptado desde Event Control.
"""

from typing import Optional

from fastapi import APIRouter, Header
from fastapi.responses import JSONResponse

from schemas.auth_schemas import (
    CambiarContrasenaRequest,
    LoginRequest,
    RefreshTokenRequest,
)
from services.auth_service import AuthService


auth_router = APIRouter()


def _extraer_token_authorization(
    authorization: Optional[str],
) -> tuple[Optional[str], Optional[JSONResponse]]:
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


@auth_router.post("/login")
def login(body: LoginRequest):
    datos, error = AuthService.login(
        correo=body.correo,
        contrasena=body.contrasena,
        remember_me=body.remember_me,
    )

    if error:
        codigo = 401 if "credenciales" in error.lower() else 400
        if "inactivo" in error.lower() or "bloqueado" in error.lower():
            codigo = 403

        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@auth_router.post("/refresh")
def refresh_token(body: RefreshTokenRequest):
    datos, error = AuthService.refresh_access_token(body.refresh_token)

    if error:
        return JSONResponse(status_code=401, content={"error": error})

    return datos


@auth_router.get("/me")
def obtener_usuario_actual(
    authorization: Optional[str] = Header(default=None),
):
    token, respuesta_error = _extraer_token_authorization(authorization)
    if respuesta_error:
        return respuesta_error

    datos, error = AuthService.obtener_usuario_por_token(token)

    if error:
        return JSONResponse(status_code=401, content={"error": error})

    return datos


@auth_router.post("/logout")
def logout(body: RefreshTokenRequest):
    ok, error = AuthService.logout_user(body.refresh_token)

    if not ok:
        return JSONResponse(status_code=400, content={"error": error})

    return {"mensaje": "Sesion cerrada correctamente"}


@auth_router.post("/cambiar-contrasena")
def cambiar_contrasena(
    body: CambiarContrasenaRequest,
    authorization: Optional[str] = Header(default=None),
):
    token, respuesta_error = _extraer_token_authorization(authorization)
    if respuesta_error:
        return respuesta_error

    usuario, error = AuthService.obtener_usuario_por_token(token)
    if error:
        return JSONResponse(status_code=401, content={"error": error})

    datos, error = AuthService.cambiar_contrasena(
        id_usuario=int(usuario["id_usuario"]),
        contrasena_actual=body.contrasena_actual,
        nueva_contrasena=body.nueva_contrasena,
        confirmar_contrasena=body.confirmar_contrasena,
    )

    if error:
        return JSONResponse(status_code=400, content={"error": error})

    return datos
