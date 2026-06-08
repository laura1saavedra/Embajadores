# schemas/ciudad_schemas.py

from typing import List, Optional
from pydantic import BaseModel

class CavResponse(BaseModel):
    id_cav: int
    nombre_cav: str

class CiudadResponse(BaseModel):
    id_ciudad: int
    nombre_ciudad: str

class CiudadDetalleResponse(BaseModel):
    id_ciudad: int
    nombre_ciudad: str
    cavs: List[CavResponse] = []

class CiudadCrear(BaseModel):
    nombre_ciudad: str

class CiudadCompletaCrear(BaseModel):
    nombre_ciudad: str
    cavs: List[str] = []

class CiudadActualizar(BaseModel):
    nombre_ciudad: Optional[str] = None

class CiudadRespuestaEliminar(BaseModel):
    eliminado: bool
    id_ciudad: int