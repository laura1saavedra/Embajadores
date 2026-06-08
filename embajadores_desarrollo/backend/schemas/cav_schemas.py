# schemas/cav_schemas.py

from typing import Optional
from pydantic import BaseModel


class CavCrear(BaseModel):
    nombre_cav: str
    ciudad_id: int


class CavActualizar(BaseModel):
    nombre_cav: Optional[str] = None
    ciudad_id: Optional[int] = None


class CavRespuesta(BaseModel):
    id_cav: int
    nombre_cav: str
    ciudad_id: int
    ciudad_nombre: Optional[str] = None

    class Config:
        from_attributes = True