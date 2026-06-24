"""
services/servicio_service.py

CRUD de servicios asociados a aplicaciones.
"""

import logging
import unicodedata
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy import text
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Aplicacion, AplicacionAfectada, Masivo, Servicio

logger = logging.getLogger(__name__)


def asegurar_tabla_servicios(db) -> None:
    db.execute(text("""
        CREATE TABLE IF NOT EXISTS "API_PROD".servicios (
            id_servicio SERIAL PRIMARY KEY,
            nombre_servicio VARCHAR(255) NOT NULL,
            aplicacion_id INTEGER NOT NULL,
            CONSTRAINT fk_servicios_aplicacion
                FOREIGN KEY (aplicacion_id)
                REFERENCES "API_PROD".aplicaciones(id_aplicacion)
                ON UPDATE CASCADE
                ON DELETE RESTRICT,
            CONSTRAINT uq_servicio_aplicacion_nombre
                UNIQUE (aplicacion_id, nombre_servicio)
        )
    """))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_servicios_aplicacion_id
        ON "API_PROD".servicios(aplicacion_id)
    """))

    db.commit()


def _normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def _normalizar_para_comparar(nombre: str) -> str:
    nombre = _normalizar_nombre(nombre).lower()
    nombre = unicodedata.normalize("NFD", nombre)
    return "".join(
        caracter for caracter in nombre
        if unicodedata.category(caracter) != "Mn"
    )


def _servicio_a_dict(servicio: Servicio) -> Dict[str, Any]:
    return {
        "id_servicio": servicio.id_servicio,
        "nombre_servicio": servicio.nombre_servicio,
        "aplicacion_id": servicio.aplicacion_id,
        "nombre_aplicacion": (
            servicio.aplicacion.nombre_aplicacion
            if servicio.aplicacion
            else None
        ),
    }


class ServicioService:

    @staticmethod
    def listar_servicios(
        aplicacion_id: Optional[int] = None,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                query = db.query(Servicio).options(joinedload(Servicio.aplicacion))

                if aplicacion_id:
                    query = query.filter(Servicio.aplicacion_id == aplicacion_id)

                servicios = (
                    query
                    .order_by(Servicio.nombre_servicio.asc())
                    .all()
                )

                return [_servicio_a_dict(servicio) for servicio in servicios], None

        except Exception as e:
            logger.error(f"Error al listar servicios: {e}")
            return None, str(e)

    @staticmethod
    def obtener_servicio(id_servicio: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                servicio = (
                    db.query(Servicio)
                    .options(joinedload(Servicio.aplicacion))
                    .filter(Servicio.id_servicio == id_servicio)
                    .first()
                )

                if not servicio:
                    return None, "Servicio no encontrado"

                return _servicio_a_dict(servicio), None

        except Exception as e:
            logger.error(f"Error al obtener servicio {id_servicio}: {e}")
            return None, str(e)

    @staticmethod
    def crear_servicio(
        nombre_servicio: str,
        aplicacion_id: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                nombre = _normalizar_nombre(nombre_servicio)

                if not nombre:
                    return None, "El nombre del servicio es obligatorio"

                aplicacion = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion == aplicacion_id)
                    .first()
                )

                if not aplicacion:
                    return None, "La aplicacion seleccionada no existe"

                nombre_comparado = _normalizar_para_comparar(nombre)
                servicios = (
                    db.query(Servicio)
                    .filter(Servicio.aplicacion_id == aplicacion_id)
                    .all()
                )

                existe = any(
                    _normalizar_para_comparar(servicio.nombre_servicio) == nombre_comparado
                    for servicio in servicios
                )

                if existe:
                    return None, "Ya existe un servicio con ese nombre para la aplicacion"

                nuevo = Servicio(
                    nombre_servicio=nombre,
                    aplicacion_id=aplicacion_id,
                )

                db.add(nuevo)
                db.commit()
                db.refresh(nuevo)

                servicio_creado = (
                    db.query(Servicio)
                    .options(joinedload(Servicio.aplicacion))
                    .filter(Servicio.id_servicio == nuevo.id_servicio)
                    .first()
                )

                return _servicio_a_dict(servicio_creado), None

        except Exception as e:
            logger.error(f"Error al crear servicio: {e}")
            return None, str(e)

    @staticmethod
    def actualizar_servicio(
        id_servicio: int,
        nombre_servicio: str,
        aplicacion_id: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                servicio = (
                    db.query(Servicio)
                    .filter(Servicio.id_servicio == id_servicio)
                    .first()
                )

                if not servicio:
                    return None, "Servicio no encontrado"

                nombre = _normalizar_nombre(nombre_servicio)

                if not nombre:
                    return None, "El nombre del servicio es obligatorio"

                aplicacion = (
                    db.query(Aplicacion)
                    .filter(Aplicacion.id_aplicacion == aplicacion_id)
                    .first()
                )

                if not aplicacion:
                    return None, "La aplicacion seleccionada no existe"

                nombre_comparado = _normalizar_para_comparar(nombre)
                servicios = (
                    db.query(Servicio)
                    .filter(
                        Servicio.id_servicio != id_servicio,
                        Servicio.aplicacion_id == aplicacion_id,
                    )
                    .all()
                )

                existe = any(
                    _normalizar_para_comparar(item.nombre_servicio) == nombre_comparado
                    for item in servicios
                )

                if existe:
                    return None, "Ya existe un servicio con ese nombre para la aplicacion"

                servicio.nombre_servicio = nombre
                servicio.aplicacion_id = aplicacion_id

                db.commit()
                db.refresh(servicio)

                servicio_actualizado = (
                    db.query(Servicio)
                    .options(joinedload(Servicio.aplicacion))
                    .filter(Servicio.id_servicio == id_servicio)
                    .first()
                )

                return _servicio_a_dict(servicio_actualizado), None

        except Exception as e:
            logger.error(f"Error al actualizar servicio {id_servicio}: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_servicio(id_servicio: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                servicio = (
                    db.query(Servicio)
                    .filter(Servicio.id_servicio == id_servicio)
                    .first()
                )

                if not servicio:
                    return None, "Servicio no encontrado"

                tiene_incidentes_historial = (
                    db.query(AplicacionAfectada)
                    .filter(AplicacionAfectada.aplicacion_id == servicio.aplicacion_id)
                    .first()
                    is not None
                )

                tiene_incidentes_resumen = (
                    db.query(Masivo)
                    .filter(Masivo.aplicacion_id == servicio.aplicacion_id)
                    .first()
                    is not None
                )

                if tiene_incidentes_historial and tiene_incidentes_resumen:
                    return None, (
                        "No se puede eliminar el servicio porque su aplicacion "
                        "esta asociada a incidentes en historial y resumen"
                    )

                if tiene_incidentes_historial:
                    return None, (
                        "No se puede eliminar el servicio porque su aplicacion "
                        "esta asociada a incidentes en historial"
                    )

                if tiene_incidentes_resumen:
                    return None, (
                        "No se puede eliminar el servicio porque su aplicacion "
                        "esta asociada a incidentes en resumen"
                    )

                cantidad_servicios_aplicacion = (
                    db.query(Servicio)
                    .filter(Servicio.aplicacion_id == servicio.aplicacion_id)
                    .count()
                )

                if cantidad_servicios_aplicacion <= 1:
                    return None, (
                        "No se puede eliminar el servicio porque la aplicacion "
                        "quedaria sin servicios asociados. Si no tiene incidentes "
                        "asociados, elimina la aplicacion junto con su servicio."
                    )

                db.delete(servicio)
                db.commit()

                return {
                    "eliminado": True,
                    "id_servicio": id_servicio,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar servicio {id_servicio}: {e}")
            return None, str(e)
