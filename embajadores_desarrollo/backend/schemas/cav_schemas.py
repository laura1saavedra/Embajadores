# schemas/cav_schemas.py

from typing import List, Optional
import unicodedata

from pydantic import BaseModel, field_validator


class SupervisorCav(BaseModel):
    nombre: str
    telefono: str = ""


def _validar_supervisores_unicos(supervisores):
    claves = []
    for supervisor in supervisores or []:
        nombre = " ".join(supervisor.nombre.strip().split()).lower()
        nombre = "".join(
            caracter for caracter in unicodedata.normalize("NFD", nombre)
            if unicodedata.category(caracter) != "Mn"
        )
        if nombre:
            claves.append(nombre)
    if len(claves) != len(set(claves)):
        raise ValueError("No se puede agregar dos veces el mismo nombre y celular de supervisor")
    return supervisores


class CavCrear(BaseModel):
    nombre_cav: str
    ciudad_id: int
    direccion: Optional[str] = None
    nombre_jefe: Optional[str] = None
    nombre_supervisor: Optional[str] = None
    supervisores: List[SupervisorCav] = []
    numero_terminales: Optional[int] = None

    _supervisores_unicos = field_validator("supervisores")(_validar_supervisores_unicos)


class CavActualizar(BaseModel):
    nombre_cav: Optional[str] = None
    ciudad_id: Optional[int] = None
    direccion: Optional[str] = None
    nombre_jefe: Optional[str] = None
    nombre_supervisor: Optional[str] = None
    supervisores: Optional[List[SupervisorCav]] = None
    numero_terminales: Optional[int] = None

    _supervisores_unicos = field_validator("supervisores")(_validar_supervisores_unicos)


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
    supervisores: List[SupervisorCav] = []
    numero_terminales: Optional[int] = None

    class Config:
        from_attributes = True
