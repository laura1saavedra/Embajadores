"""
services/aplicacion_service.py

CRUD de aplicaciones.
"""

import logging
import unicodedata
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Aplicacion, AplicacionAfectada, Masivo, Servicio
from services.servicio_service import asegurar_tabla_servicios

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
        "servicios": [
            {
                "id_servicio": servicio.id_servicio,
                "nombre_servicio": servicio.nombre_servicio,
                "aplicacion_id": servicio.aplicacion_id,
            }
            for servicio in sorted(
                aplicacion.servicios or [],
                key=lambda item: item.nombre_servicio.lower()
            )
        ],
    }


class AplicacionService:

    @staticmethod
    def listar_aplicaciones() -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                aplicaciones = (
                    db.query(Aplicacion)
                    .options(joinedload(Aplicacion.servicios))
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
                asegurar_tabla_servicios(db)

                aplicacion = (
                    db.query(Aplicacion)
                    .options(joinedload(Aplicacion.servicios))
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
                asegurar_tabla_servicios(db)

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
                asegurar_tabla_servicios(db)

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
                asegurar_tabla_servicios(db)

                aplicacion = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion == id_aplicacion)
                    .first()
                )

                if not aplicacion:
                    return None, "Aplicación no encontrada"

                tiene_incidentes_historial = (
                    db.query(AplicacionAfectada)
                    .filter(AplicacionAfectada.aplicacion_id == id_aplicacion)
                    .first()
                    is not None
                )

                tiene_incidentes_resumen = (
                    db.query(Masivo)
                    .filter(Masivo.aplicacion_id == id_aplicacion)
                    .first()
                    is not None
                )

                if tiene_incidentes_historial and tiene_incidentes_resumen:
                    return None, (
                        "No se puede eliminar la aplicacion porque esta asociada "
                        "a incidentes en historial y resumen"
                    )

                if tiene_incidentes_historial:
                    return None, (
                        "No se puede eliminar la aplicacion porque esta asociada "
                        "a incidentes en historial"
                    )

                if tiene_incidentes_resumen:
                    return None, (
                        "No se puede eliminar la aplicacion porque esta asociada "
                        "a incidentes en resumen"
                    )

                db.query(Servicio).filter(
                    Servicio.aplicacion_id == id_aplicacion
                ).delete(synchronize_session=False)

                db.delete(aplicacion)
                db.commit()

                return {
                    "eliminado": True,
                    "id_aplicacion": id_aplicacion,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar aplicación {id_aplicacion}: {e}")
            return None, str(e)
