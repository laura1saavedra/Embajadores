"""
Schemas para usuarios.

Define la estructura de los datos que la API recibe y responde para gestionar
usuarios desde Configuracion Avanzada.
"""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class RolResumen(BaseModel):
    idrol: int
    nombre_rol: str
    descripcion: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class UsuarioBase(BaseModel):
    nombre: str = Field(..., min_length=1, max_length=100)
    apellido: str = Field(..., min_length=1, max_length=100)
    correo: str = Field(..., min_length=1, max_length=255)
    rol_id: int


class UsuarioCrear(UsuarioBase):
    """
    Datos necesarios para crear un usuario.

    La contrasena no se recibe desde el frontend: el backend la genera
    automaticamente y retorna la contrasena temporal para entregarla al usuario.
    """


class UsuarioActualizar(BaseModel):
    """
    Datos permitidos para editar un usuario.

    Todos los campos son opcionales para permitir actualizaciones parciales.
    """

    nombre: Optional[str] = Field(default=None, min_length=1, max_length=100)
    apellido: Optional[str] = Field(default=None, min_length=1, max_length=100)
    correo: Optional[str] = Field(default=None, min_length=1, max_length=255)
    rol_id: Optional[int] = None
    activo: Optional[bool] = None
    debe_cambiar_contrasena: Optional[bool] = None


class UsuarioRespuesta(BaseModel):
    id_usuario: int
    nombre: str
    apellido: str
    correo: str
    rol_id: int
    rol_nombre: Optional[str] = None
    activo: bool
    debe_cambiar_contrasena: bool
    fecha_creacion: Optional[datetime] = None
    fecha_actualizacion: Optional[datetime] = None
    ultimo_login: Optional[datetime] = None
    intentos_fallidos: int = 0
    bloqueado_hasta: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class UsuarioCreadoRespuesta(UsuarioRespuesta):
    """
    Respuesta especifica al crear usuario.

    Incluye la contrasena temporal generada. Esta contrasena no debe volver a
    consultarse despues de la creacion porque solo se guarda su hash.
    """

    contrasena_temporal: str


class UsuarioListadoRespuesta(BaseModel):
    usuarios: list[UsuarioRespuesta]
    total: int


class UsuarioRegistrado(BaseModel):
    """
    Schema legacy usado por flujos existentes de incidentes.
    """

    nombre: str
    apellido: str
    correo: str
    id_usuario: int

    model_config = ConfigDict(from_attributes=True)
