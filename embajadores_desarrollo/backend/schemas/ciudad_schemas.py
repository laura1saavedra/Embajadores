# schemas/ciudad_schemas.py

from typing import List, Optional
from pydantic import BaseModel

class CavResponse(BaseModel):
    id_cav: int
    nombre_cav: str
    activo: bool = True
    direccion: Optional[str] = None
    nombre_jefe: Optional[str] = None
    nombre_supervisor: Optional[str] = None
    numero_terminales: Optional[int] = None

class CavCompletoCrear(BaseModel):
    nombre_cav: str
    direccion: str
    nombre_jefe: str
    nombre_supervisor: str
    numero_terminales: int

class CiudadResponse(BaseModel):
    id_ciudad: int
    nombre_ciudad: str
    activo: bool = True

class CiudadDetalleResponse(BaseModel):
    id_ciudad: int
    nombre_ciudad: str
    activo: bool = True
    cavs: List[CavResponse] = []

class CiudadCrear(BaseModel):
    nombre_ciudad: str

class CiudadCompletaCrear(BaseModel):
    nombre_ciudad: str
    cavs: List[CavCompletoCrear] = []

class CiudadActualizar(BaseModel):
    nombre_ciudad: Optional[str] = None

class CiudadEstadoActualizar(BaseModel):
    activo: bool

class CiudadRespuestaEliminar(BaseModel):
    eliminado: bool
    id_ciudad: int
