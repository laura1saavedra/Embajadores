# schemas/incidente_schemas.py

from pydantic import BaseModel, model_validator, Field
from typing import Optional, List, Literal
from datetime import datetime


class AplicacionAfectadaCrear(BaseModel):
    aplicacion_id: int
    tipo_falla_id: int


class AplicacionAfectadaRespuesta(BaseModel):
    id_aplicaciones_afectados: int
    aplicacion_id: int
    nombre_aplicacion: Optional[str] = None
    tipo_falla_id: int
    nombre_tipo: Optional[str] = None
    masivo_id: Optional[int] = None


def validar_combinaciones(aplicaciones_afectadas):
    combinaciones = set()

    for item in aplicaciones_afectadas or []:
        clave = (item.aplicacion_id, item.tipo_falla_id)

        if clave in combinaciones:
            raise ValueError(
                "No se puede repetir la misma combinación de aplicación y tipo de falla."
            )

        combinaciones.add(clave)


class IncidenteCrear(BaseModel):
    cav_id: int
    usuario_id: Optional[int] = None
    usuarios_totalidad: Optional[int] = None
    usuarios_afectados: int
    aplicaciones_afectadas: List[AplicacionAfectadaCrear]

    @model_validator(mode="after")
    def validar_combinaciones_unicas(self):
        validar_combinaciones(self.aplicaciones_afectadas)
        return self


class IncidenteActualizar(BaseModel):
    ciudad_id: Optional[int] = None
    cav_id: Optional[int] = None
    usuario_id: Optional[int] = None
    usuarios_totalidad: Optional[int] = None
    usuarios_afectados: Optional[int] = None
    aplicaciones_afectadas: Optional[List[AplicacionAfectadaCrear]] = None

    @model_validator(mode="after")
    def validar_combinaciones_unicas(self):
        validar_combinaciones(self.aplicaciones_afectadas)
        return self


class CambioEstado(BaseModel):
    estado: Literal["abierto", "cerrado"]


class IncidenteRespuesta(BaseModel):
    id_incidente: int
    cav_id: int
    cav_nombre: Optional[str] = None
    ciudad_id: Optional[int] = None
    ciudad_nombre: Optional[str] = None
    usuario_id: Optional[int] = None
    usuario_nombre: Optional[str] = None
    usuario_correo: Optional[str] = None
    masivos_ids: List[int] = Field(default_factory=list)
    pertenece_a_masivo: bool = False
    usuarios_totalidad: Optional[int] = None
    usuarios_afectados: int
    estado: Literal["abierto", "cerrado"]
    fecha_hora_reporte: datetime
    aplicaciones_afectadas: List[AplicacionAfectadaRespuesta] = Field(default_factory=list)

    class Config:
        from_attributes = True