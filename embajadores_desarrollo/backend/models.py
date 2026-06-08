"""
models.py

Define las tablas de la base de datos como clases Python.
SQLAlchemy traduce estas clases a tablas reales de PostgreSQL.
Esquema: API_PROD
"""

from sqlalchemy import (
    Column, Integer, String, DateTime,
    ForeignKey, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from db import Base


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Ciudad
# ─────────────────────────────────────────────────────────────────────────────
class Ciudad(Base):
    __tablename__ = "ciudad"
    __table_args__ = {"schema": "API_PROD"}

    id_ciudad = Column(Integer, primary_key=True, autoincrement=True)
    nombre_ciudad = Column(String(150), nullable=False)

    cavs = relationship("Cav", back_populates="ciudad", lazy="select")

    def __repr__(self):
        return f"<Ciudad id={self.id_ciudad} nombre={self.nombre_ciudad}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Cav
# ─────────────────────────────────────────────────────────────────────────────
class Cav(Base):
    __tablename__ = "cav"
    __table_args__ = {"schema": "API_PROD"}

    id_cav = Column(Integer, primary_key=True, autoincrement=True)
    nombre_cav = Column(String(200), nullable=False)
    ciudad_id = Column(
        Integer,
        ForeignKey("API_PROD.ciudad.id_ciudad", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    ciudad = relationship("Ciudad", back_populates="cavs")
    incidentes = relationship("Incidente", back_populates="cav", lazy="select")

    def __repr__(self):
        return f"<Cav id={self.id_cav} nombre={self.nombre_cav}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Rol
# ─────────────────────────────────────────────────────────────────────────────
class Rol(Base):
    __tablename__ = "roles"
    __table_args__ = {"schema": "API_PROD"}

    idrol = Column(Integer, primary_key=True, autoincrement=True)
    nombre_rol = Column(String(100), nullable=False, unique=True)
    descripcion = Column(String(255), nullable=False)

    usuarios = relationship("Usuario", back_populates="rol", lazy="select")
    permisos = relationship("RolPermiso", back_populates="rol", lazy="select")

    def __repr__(self):
        return f"<Rol id={self.idrol} nombre={self.nombre_rol}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Permiso
# ─────────────────────────────────────────────────────────────────────────────
class Permiso(Base):
    __tablename__ = "permisos"
    __table_args__ = {"schema": "API_PROD"}

    idpermisos = Column(Integer, primary_key=True, autoincrement=True)
    nombre_permiso = Column(String(100), nullable=False, unique=True)

    roles = relationship("RolPermiso", back_populates="permiso", lazy="select")

    def __repr__(self):
        return f"<Permiso id={self.idpermisos} nombre={self.nombre_permiso}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: RolPermiso
# Tabla intermedia N:M entre Roles y Permisos.
# ─────────────────────────────────────────────────────────────────────────────
class RolPermiso(Base):
    __tablename__ = "rol_permiso"
    __table_args__ = (
        UniqueConstraint("rol_id", "permisos_id", name="uq_rol_permiso"),
        {"schema": "API_PROD"}
    )

    idrolpermiso = Column(Integer, primary_key=True, autoincrement=True)

    rol_id = Column(
        Integer,
        ForeignKey("API_PROD.roles.idrol", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False
    )

    permisos_id = Column(
        Integer,
        ForeignKey("API_PROD.permisos.idpermisos", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False
    )

    rol = relationship("Rol", back_populates="permisos")
    permiso = relationship("Permiso", back_populates="roles")

    def __repr__(self):
        return f"<RolPermiso rol={self.rol_id} permiso={self.permisos_id}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Usuario
# ─────────────────────────────────────────────────────────────────────────────
class Usuario(Base):
    __tablename__ = "usuarios"
    __table_args__ = {"schema": "API_PROD"}

    id_usuario = Column(Integer, primary_key=True, autoincrement=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    correo = Column(String(255), nullable=False, unique=True, index=True)
    contrasena = Column(String(255), nullable=True)

    rol_id = Column(
        Integer,
        ForeignKey("API_PROD.roles.idrol", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    rol = relationship("Rol", back_populates="usuarios")
    incidentes = relationship("Incidente", back_populates="usuario", lazy="select")

    def __repr__(self):
        return f"<Usuario id={self.id_usuario} correo={self.correo}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Contacto
# Contacto de notificacion WhatsApp. token_wp puede ser JID de grupo
# (120363403675305399@g.us).
# ─────────────────────────────────────────────────────────────────────────────
class Contacto(Base):
    __tablename__ = "contacto"
    __table_args__ = {"schema": "API_PROD"}

    id_contacto = Column(Integer, primary_key=True, autoincrement=True)
    nombre_grupo = Column(String(150), nullable=False)
    token_wp = Column(
        String(200),
        nullable=True,
        comment="JID de grupo WhatsApp para Evolution API"
    )

    def __repr__(self):
        return f"<Contacto id={self.id_contacto} grupo={self.nombre_grupo}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: TipoFalla
# ─────────────────────────────────────────────────────────────────────────────
class TipoFalla(Base):
    __tablename__ = "tipo_falla"
    __table_args__ = {"schema": "API_PROD"}

    id_tipo_falla = Column(Integer, primary_key=True, autoincrement=True)
    nombre_tipo = Column(String(100), nullable=False, unique=True)

    aplicaciones_afectadas = relationship(
        "AplicacionAfectada",
        back_populates="tipo_falla",
        lazy="select"
    )

    masivos = relationship("Masivo", back_populates="tipo_falla", lazy="select")

    def __repr__(self):
        return f"<TipoFalla id={self.id_tipo_falla} nombre={self.nombre_tipo}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Incidente
# ─────────────────────────────────────────────────────────────────────────────
class Incidente(Base):
    __tablename__ = "incidentes"
    __table_args__ = {"schema": "API_PROD"}

    id_incidente = Column(Integer, primary_key=True, autoincrement=True)

    cav_id = Column(
        Integer,
        ForeignKey("API_PROD.cav.id_cav", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    usuario_id = Column(
        Integer,
        ForeignKey("API_PROD.usuarios.id_usuario", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    usuarios_totalidad = Column(Integer, nullable=True)
    usuarios_afectados = Column(Integer, nullable=False)

    estado = Column(String(20), nullable=False, default="abierto")

    fecha_hora_reporte = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    cav = relationship("Cav", back_populates="incidentes")
    usuario = relationship("Usuario", back_populates="incidentes")

    aplicaciones_afectadas = relationship(
        "AplicacionAfectada",
        back_populates="incidente",
        cascade="all, delete-orphan",
        lazy="select"
    )

    historial = relationship(
        "HistorialIncidente",
        back_populates="incidente",
        cascade="all, delete-orphan",
        order_by="HistorialIncidente.fecha_cambio",
        lazy="select"
    )

    def __repr__(self):
        return f"<Incidente id={self.id_incidente} estado={self.estado}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Aplicacion
# ─────────────────────────────────────────────────────────────────────────────
class Aplicacion(Base):
    __tablename__ = "aplicaciones"
    __table_args__ = {"schema": "API_PROD"}

    id_aplicacion = Column(Integer, primary_key=True, autoincrement=True)
    nombre_aplicacion = Column(String(255), nullable=False)

    aplicaciones_afectadas = relationship(
        "AplicacionAfectada",
        back_populates="aplicacion",
        lazy="select"
    )

    masivos = relationship("Masivo", back_populates="aplicacion", lazy="select")

    def __repr__(self):
        return f"<Aplicacion id={self.id_aplicacion} nombre={self.nombre_aplicacion}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: AplicacionAfectada
# Tabla intermedia entre Incidente, Aplicacion, TipoFalla y Masivo.
# Aquí se relaciona un incidente individual con uno o varios masivos.
# ─────────────────────────────────────────────────────────────────────────────
class AplicacionAfectada(Base):
    __tablename__ = "aplicaciones_afectados"
    __table_args__ = {"schema": "API_PROD"}

    id_aplicaciones_afectados = Column(Integer, primary_key=True, autoincrement=True)

    incidente_id = Column(
        Integer,
        ForeignKey("API_PROD.incidentes.id_incidente", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=False
    )

    aplicacion_id = Column(
        Integer,
        ForeignKey("API_PROD.aplicaciones.id_aplicacion", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    tipo_falla_id = Column(
        Integer,
        ForeignKey("API_PROD.tipo_falla.id_tipo_falla", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    masivo_id = Column(
        Integer,
        ForeignKey("API_PROD.masivo.idmasivo", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True
    )

    incidente = relationship("Incidente", back_populates="aplicaciones_afectadas")
    aplicacion = relationship("Aplicacion", back_populates="aplicaciones_afectadas")
    tipo_falla = relationship("TipoFalla", back_populates="aplicaciones_afectadas")
    masivo = relationship("Masivo", back_populates="aplicaciones_afectadas")

    def __repr__(self):
        return (
            f"<AplicacionAfectada incidente={self.incidente_id} "
            f"aplicacion={self.aplicacion_id} "
            f"tipo_falla={self.tipo_falla_id} "
            f"masivo={self.masivo_id}>"
        )


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: Masivo
# ─────────────────────────────────────────────────────────────────────────────
class Masivo(Base):
    __tablename__ = "masivo"
    __table_args__ = {"schema": "API_PROD"}

    idmasivo = Column(Integer, primary_key=True, autoincrement=True)

    aplicacion_id = Column(
        Integer,
        ForeignKey("API_PROD.aplicaciones.id_aplicacion", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    tipo_falla_id = Column(
        Integer,
        ForeignKey("API_PROD.tipo_falla.id_tipo_falla", ondelete="RESTRICT", onupdate="CASCADE"),
        nullable=False
    )

    usuarios_totales = Column(Integer, nullable=True)
    usuarios_totales_afectados = Column(Integer, nullable=False)

    estado = Column(String(20), nullable=False, default="abierto")

    fecha_hora_generado = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False
    )

    fecha_hora_cierre = Column(DateTime(timezone=True), nullable=True)
    dias_activos = Column(Integer, nullable=True)

    aplicacion = relationship("Aplicacion", back_populates="masivos")
    tipo_falla = relationship("TipoFalla", back_populates="masivos")

    aplicaciones_afectadas = relationship(
        "AplicacionAfectada",
        back_populates="masivo",
        lazy="select"
    )

    def __repr__(self):
        return f"<Masivo id={self.idmasivo} estado={self.estado}>"


# ─────────────────────────────────────────────────────────────────────────────
# MODELO: HistorialIncidente
# Trazabilidad de cambios de estado.
# ─────────────────────────────────────────────────────────────────────────────
class HistorialIncidente(Base):
    __tablename__ = "historial_incidente"
    __table_args__ = (
        Index("ix_historial_incidente_id", "incidente_id"),
        {"schema": "API_PROD"}
    )

    id_historial = Column(Integer, primary_key=True, autoincrement=True)

    incidente_id = Column(
        Integer,
        ForeignKey("API_PROD.incidentes.id_incidente", ondelete="CASCADE"),
        nullable=False
    )

    estado_anterior = Column(String(50), nullable=True)
    estado_nuevo = Column(String(50), nullable=True)
    fecha_cambio = Column(DateTime(timezone=True), server_default=func.now())

    incidente = relationship("Incidente", back_populates="historial")

    def __repr__(self):
        return f"<HistorialIncidente id={self.id_historial} incidente={self.incidente_id}>"