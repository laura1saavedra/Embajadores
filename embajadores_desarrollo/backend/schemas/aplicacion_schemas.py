# schemas/aplicacion_schemas.py

from typing import Optional
from pydantic import BaseModel


class AplicacionCrear(BaseModel):
    nombre_aplicacion: str


class AplicacionActualizar(BaseModel):
    nombre_aplicacion: Optional[str] = None


class AplicacionRespuesta(BaseModel):
    id_aplicacion: int
    nombre_aplicacion: str

    class Config:
        from_attributes = True