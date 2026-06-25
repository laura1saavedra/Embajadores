"""
models.py

Define las tablas de la base de datos como clases Python.
SQLAlchemy traduce estas clases a tablas reales de PostgreSQL.
Esquema: API_PROD
"""

from sqlalchemy import (
    Boolean, Column, Integer, String, DateTime, Text,
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
