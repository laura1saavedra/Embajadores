# schemas/tipo_falla_schemas.py

from typing import Optional
from pydantic import BaseModel


class TipoFallaCrear(BaseModel):
    nombre_tipo: str


class TipoFallaActualizar(BaseModel):
    nombre_tipo: Optional[str] = None


class TipoFallaRespuesta(BaseModel):
    id_tipo_falla: int
    nombre_tipo: str

    class Config:
        from_attributes = True