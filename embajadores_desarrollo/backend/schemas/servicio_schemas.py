# schemas/servicio_schemas.py

from typing import Optional
from pydantic import BaseModel


class ServicioCrear(BaseModel):
    nombre_servicio: str
    aplicacion_id: int


class ServicioActualizar(BaseModel):
    nombre_servicio: Optional[str] = None
    aplicacion_id: Optional[int] = None


class ServicioEstadoActualizar(BaseModel):
    activo: bool


class ServicioRespuesta(BaseModel):
    id_servicio: int
    nombre_servicio: str
    aplicacion_id: int
    nombre_aplicacion: Optional[str] = None
    activo: bool = True

    class Config:
        from_attributes = True
