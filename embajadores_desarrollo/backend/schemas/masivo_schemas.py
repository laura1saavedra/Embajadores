# schemas/masivo_schemas.py

from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


# ─────────────────────────────────────────────────────────────────────────────
# INCIDENTES ASOCIADOS AL MASIVO
# ─────────────────────────────────────────────────────────────────────────────
class IncidenteAsociadoRespuesta(BaseModel):
    id_incidente: int
    cav_id: int
    cav_nombre: Optional[str] = None

    ciudad_id: Optional[int] = None
    ciudad_nombre: Optional[str] = None

    usuarios_afectados: int
    usuarios_totalidad: Optional[int] = None

    estado: Literal["abierto", "cerrado"]

    fecha_hora_reporte: datetime

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# RESPUESTA BASICA DE MASIVO
# ─────────────────────────────────────────────────────────────────────────────
class MasivoRespuesta(BaseModel):
    idmasivo: int

    aplicacion_id: int
    nombre_aplicacion: Optional[str] = None

    tipo_falla_id: int
    nombre_tipo_falla: Optional[str] = None

    usuarios_totales: Optional[int] = None
    usuarios_totales_afectados: int

    cantidad_incidentes: int
    cantidad_cavs_afectados: int

    estado: Literal["abierto", "cerrado"]

    fecha_hora_generado: datetime
    fecha_hora_cierre: Optional[datetime] = None

    dias_activos: Optional[int] = None

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# DETALLE COMPLETO DEL MASIVO
# ─────────────────────────────────────────────────────────────────────────────
class MasivoDetalleRespuesta(BaseModel):
    idmasivo: int

    aplicacion_id: int
    nombre_aplicacion: Optional[str] = None

    tipo_falla_id: int
    nombre_tipo_falla: Optional[str] = None

    usuarios_totales: Optional[int] = None
    usuarios_totales_afectados: int

    cantidad_incidentes: int
    cantidad_cavs_afectados: int

    estado: Literal["abierto", "cerrado"]

    fecha_hora_generado: datetime
    fecha_hora_cierre: Optional[datetime] = None

    dias_activos: Optional[int] = None

    incidentes_asociados: List[IncidenteAsociadoRespuesta]

    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────────────────────
# CAMBIO DE ESTADO DEL MASIVO
# ─────────────────────────────────────────────────────────────────────────────
class MasivoCambioEstado(BaseModel):
    estado: Literal["cerrado"]


# ─────────────────────────────────────────────────────────────────────────────
# RESUMEN DE MASIVOS
# ─────────────────────────────────────────────────────────────────────────────
class MasivoResumen(BaseModel):
    total: int
    abiertos: int
    cerrados: int