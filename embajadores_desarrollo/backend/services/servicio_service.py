"""
services/servicio_service.py

CRUD de servicios asociados a aplicaciones.
"""

import logging
import unicodedata
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Aplicacion, AplicacionAfectada, Masivo, Servicio

logger = logging.getLogger(__name__)


def asegurar_tabla_servicios(db) -> None:
    return None


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
        "activo": servicio.activo,
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
        solo_activos: bool = False,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_tabla_servicios(db)

                query = db.query(Servicio).options(joinedload(Servicio.aplicacion))

                if aplicacion_id:
                    query = query.filter(Servicio.aplicacion_id == aplicacion_id)

                if solo_activos:
                    query = query.filter(
                        Servicio.activo.is_(True),
                        Servicio.aplicacion.has(Aplicacion.activo.is_(True)),
                    )

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
    def cambiar_estado_servicio(
        id_servicio: int,
        activo: bool,
    ) -> Tuple[Optional[Dict], Optional[str]]:
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

                if activo and servicio.aplicacion and not servicio.aplicacion.activo:
                    return None, (
                        "No se puede habilitar el servicio porque la aplicacion "
                        "asociada esta inhabilitada"
                    )

                servicio.activo = activo

                db.commit()
                db.refresh(servicio)

                return _servicio_a_dict(servicio), None

        except Exception as e:
            logger.error(f"Error al cambiar estado del servicio {id_servicio}: {e}")
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
                    .filter(AplicacionAfectada.servicio_id == id_servicio)
                    .first()
                    is not None
                )

                tiene_incidentes_resumen = (
                    db.query(Masivo)
                    .filter(Masivo.servicio_id == id_servicio)
                    .first()
                    is not None
                )

                if tiene_incidentes_historial and tiene_incidentes_resumen:
                    return None, (
                        "No se puede eliminar el servicio porque esta asociado "
                        "a incidentes en historial y resumen"
                    )

                if tiene_incidentes_historial:
                    return None, (
                        "No se puede eliminar el servicio porque esta asociado "
                        "a incidentes en historial"
                    )

                if tiene_incidentes_resumen:
                    return None, (
                        "No se puede eliminar el servicio porque esta asociado "
                        "a incidentes en resumen"
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
