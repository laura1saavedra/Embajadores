"""
services/aplicacion_service.py

CRUD de aplicaciones.
"""

import logging
import unicodedata
from typing import Optional, List, Tuple, Dict, Any

from db import get_db_session
from models import Aplicacion, AplicacionAfectada, Masivo

logger = logging.getLogger(__name__)


def _normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def _normalizar_para_comparar(nombre: str) -> str:
    nombre = _normalizar_nombre(nombre).lower()
    nombre = unicodedata.normalize("NFD", nombre)
    nombre = "".join(
        caracter for caracter in nombre
        if unicodedata.category(caracter) != "Mn"
    )
    return nombre


def _aplicacion_a_dict(aplicacion: Aplicacion) -> Dict[str, Any]:
    return {
        "id_aplicacion": aplicacion.id_aplicacion,
        "nombre_aplicacion": aplicacion.nombre_aplicacion,
    }


class AplicacionService:

    @staticmethod
    def listar_aplicaciones() -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                aplicaciones = (
                    db.query(Aplicacion)
                    .order_by(Aplicacion.nombre_aplicacion.asc())
                    .all()
                )

                return [_aplicacion_a_dict(a) for a in aplicaciones], None

        except Exception as e:
            logger.error(f"Error al listar aplicaciones: {e}")
            return None, str(e)

    @staticmethod
    def obtener_aplicacion(id_aplicacion: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                aplicacion = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion == id_aplicacion)
                    .first()
                )

                if not aplicacion:
                    return None, "Aplicación no encontrada"

                return _aplicacion_a_dict(aplicacion), None

        except Exception as e:
            logger.error(f"Error al obtener aplicación {id_aplicacion}: {e}")
            return None, str(e)

    @staticmethod
    def crear_aplicacion(nombre_aplicacion: str) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                nombre = _normalizar_nombre(nombre_aplicacion)

                if not nombre:
                    return None, "El nombre de la aplicación es obligatorio"

                nombre_comparado = _normalizar_para_comparar(nombre)

                aplicaciones = db.query(Aplicacion).all()

                existe = any(
                    _normalizar_para_comparar(app.nombre_aplicacion) == nombre_comparado
                    for app in aplicaciones
                )

                if existe:
                    return None, (
                        "Ya existe una aplicación con ese nombre. "
                        "Puedes editar la aplicación existente."
                    )

                nueva = Aplicacion(nombre_aplicacion=nombre)

                db.add(nueva)
                db.commit()
                db.refresh(nueva)

                return _aplicacion_a_dict(nueva), None

        except Exception as e:
            logger.error(f"Error al crear aplicación: {e}")
            return None, str(e)

    @staticmethod
    def actualizar_aplicacion(
        id_aplicacion: int,
        nombre_aplicacion: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                nombre = _normalizar_nombre(nombre_aplicacion)

                if not nombre:
                    return None, "El nombre de la aplicación es obligatorio"

                aplicacion = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion == id_aplicacion)
                    .first()
                )

                if not aplicacion:
                    return None, "Aplicación no encontrada"

                nombre_comparado = _normalizar_para_comparar(nombre)

                aplicaciones = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion != id_aplicacion)
                    .all()
                )

                existe = any(
                    _normalizar_para_comparar(app.nombre_aplicacion) == nombre_comparado
                    for app in aplicaciones
                )

                if existe:
                    return None, (
                        "Ya existe una aplicación con ese nombre. "
                        "Puedes editar la aplicación existente."
                    )

                aplicacion.nombre_aplicacion = nombre

                db.commit()
                db.refresh(aplicacion)

                return _aplicacion_a_dict(aplicacion), None

        except Exception as e:
            logger.error(f"Error al actualizar aplicación {id_aplicacion}: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_aplicacion(id_aplicacion: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                aplicacion = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion == id_aplicacion)
                    .first()
                )

                if not aplicacion:
                    return None, "Aplicación no encontrada"

                tiene_incidentes = (
                    db.query(AplicacionAfectada)
                    .filter(AplicacionAfectada.aplicacion_id == id_aplicacion)
                    .first()
                    is not None
                )

                if tiene_incidentes:
                    return None, (
                        "No se puede eliminar la aplicación porque tiene "
                        "incidentes asociados"
                    )

                tiene_masivos = (
                    db.query(Masivo)
                    .filter(Masivo.aplicacion_id == id_aplicacion)
                    .first()
                    is not None
                )

                if tiene_masivos:
                    return None, (
                        "No se puede eliminar la aplicación porque tiene "
                        "incidentes masivos asociados"
                    )

                db.delete(aplicacion)
                db.commit()

                return {
                    "eliminado": True,
                    "id_aplicacion": id_aplicacion,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar aplicación {id_aplicacion}: {e}")
            return None, str(e)