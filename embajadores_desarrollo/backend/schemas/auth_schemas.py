"""
Schemas para autenticacion.

Define la estructura de datos para inicio de sesion, usuario autenticado,
token de acceso y cambio obligatorio de contrasena.
"""

from typing import Optional

from pydantic import BaseModel, Field


class LoginRequest(BaseModel):
    correo: str = Field(..., min_length=1, max_length=255)
    contrasena: str = Field(..., min_length=1, max_length=255)


class UsuarioAutenticado(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str
    rol_id: int
    rol_nombre: Optional[str] = None
    debe_cambiar_contrasena: bool


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    usuario: UsuarioAutenticado


class CambiarContrasenaRequest(BaseModel):
    contrasena_actual: str = Field(..., min_length=1, max_length=255)
    nueva_contrasena: str = Field(..., min_length=8, max_length=255)
    confirmar_contrasena: str = Field(..., min_length=8, max_length=255)


class MensajeResponse(BaseModel):
    mensaje: str
