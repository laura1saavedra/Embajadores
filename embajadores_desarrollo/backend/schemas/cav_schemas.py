# schemas/cav_schemas.py

from typing import Optional
from pydantic import BaseModel


class CavCrear(BaseModel):
    nombre_cav: str
    ciudad_id: int
    direccion: Optional[str] = None
    nombre_jefe: Optional[str] = None
    nombre_supervisor: Optional[str] = None
    numero_terminales: Optional[int] = None


class CavActualizar(BaseModel):
    nombre_cav: Optional[str] = None
    ciudad_id: Optional[int] = None
    direccion: Optional[str] = None
    nombre_jefe: Optional[str] = None
    nombre_supervisor: Optional[str] = None
    numero_terminales: Optional[int] = None


class CavEstadoActualizar(BaseModel):
    activo: bool


class CavRespuesta(BaseModel):
    id_cav: int
    nombre_cav: str
    ciudad_id: int
    ciudad_nombre: Optional[str] = None
    activo: bool = True
    direccion: Optional[str] = None
    nombre_jefe: Optional[str] = None
    nombre_supervisor: Optional[str] = None
    numero_terminales: Optional[int] = None

    class Config:
        from_attributes = True
