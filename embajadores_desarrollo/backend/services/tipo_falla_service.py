# services/tipo_falla_service.py

"""
services/tipo_falla_service.py

CRUD de tipos de falla.
"""

import logging
import unicodedata
from typing import Optional, List, Tuple, Dict, Any

from db import get_db_session
from models import TipoFalla, AplicacionAfectada, Masivo

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


def _tipo_falla_a_dict(tipo: TipoFalla) -> Dict[str, Any]:
    return {
        "id_tipo_falla": tipo.id_tipo_falla,
        "nombre_tipo": tipo.nombre_tipo,
    }


class TipoFallaService:

    # ─────────────────────────────────────────────────────────────
    # Listar
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def listar_tipos_falla() -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                tipos = (
                    db.query(TipoFalla)
                    .order_by(TipoFalla.nombre_tipo.asc())
                    .all()
                )

                return [_tipo_falla_a_dict(tipo) for tipo in tipos], None

        except Exception as e:
            logger.error(f"Error al listar tipos de falla: {e}")
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Obtener por ID
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def obtener_tipo_falla(id_tipo_falla: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                tipo = (
                    db.query(TipoFalla)
                    .filter(TipoFalla.id_tipo_falla == id_tipo_falla)
                    .first()
                )

                if not tipo:
                    return None, "Tipo de falla no encontrado"

                return _tipo_falla_a_dict(tipo), None

        except Exception as e:
            logger.error(f"Error al obtener tipo de falla {id_tipo_falla}: {e}")
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Crear
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def crear_tipo_falla(nombre_tipo: str) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                nombre = _normalizar_nombre(nombre_tipo)

                if not nombre:
                    return None, "El nombre del tipo de falla es obligatorio"

                nombre_comparado = _normalizar_para_comparar(nombre)

                tipos = db.query(TipoFalla).all()

                existe = any(
                    _normalizar_para_comparar(tipo.nombre_tipo) == nombre_comparado
                    for tipo in tipos
                )

                if existe:
                    return None, (
                        "Ya existe un tipo de falla con ese nombre. "
                        "Puedes editar el tipo de falla existente."
                    )

                nuevo = TipoFalla(nombre_tipo=nombre)

                db.add(nuevo)
                db.commit()
                db.refresh(nuevo)

                return _tipo_falla_a_dict(nuevo), None

        except Exception as e:
            logger.error(f"Error al crear tipo de falla: {e}")
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Actualizar
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def actualizar_tipo_falla(
        id_tipo_falla: int,
        nombre_tipo: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                tipo = (
                    db.query(TipoFalla)
                    .filter(TipoFalla.id_tipo_falla == id_tipo_falla)
                    .first()
                )

                if not tipo:
                    return None, "Tipo de falla no encontrado"

                nombre = _normalizar_nombre(nombre_tipo)

                if not nombre:
                    return None, "El nombre del tipo de falla es obligatorio"

                nombre_comparado = _normalizar_para_comparar(nombre)

                tipos = (
                    db.query(TipoFalla)
                    .filter(TipoFalla.id_tipo_falla != id_tipo_falla)
                    .all()
                )

                existe = any(
                    _normalizar_para_comparar(item.nombre_tipo) == nombre_comparado
                    for item in tipos
                )

                if existe:
                    return None, (
                        "Ya existe un tipo de falla con ese nombre. "
                        "Puedes editar el tipo de falla existente."
                    )

                tipo.nombre_tipo = nombre

                db.commit()
                db.refresh(tipo)

                return _tipo_falla_a_dict(tipo), None

        except Exception as e:
            logger.error(f"Error al actualizar tipo de falla {id_tipo_falla}: {e}")
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Eliminar
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def eliminar_tipo_falla(id_tipo_falla: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                tipo = (
                    db.query(TipoFalla)
                    .filter(TipoFalla.id_tipo_falla == id_tipo_falla)
                    .first()
                )

                if not tipo:
                    return None, "Tipo de falla no encontrado"

                tiene_incidentes = (
                    db.query(AplicacionAfectada)
                    .filter(AplicacionAfectada.tipo_falla_id == id_tipo_falla)
                    .first()
                    is not None
                )

                if tiene_incidentes:
                    return None, (
                        "No se puede eliminar el tipo de falla porque tiene "
                        "incidentes asociados"
                    )

                tiene_masivos = (
                    db.query(Masivo)
                    .filter(Masivo.tipo_falla_id == id_tipo_falla)
                    .first()
                    is not None
                )

                if tiene_masivos:
                    return None, (
                        "No se puede eliminar el tipo de falla porque tiene "
                        "incidentes masivos asociados"
                    )

                db.delete(tipo)
                db.commit()

                return {
                    "eliminado": True,
                    "id_tipo_falla": id_tipo_falla,
                }, None

        except Exception as e:
            logger.error(
                f"Error al eliminar tipo de falla {id_tipo_falla}: {e}"
            )
            return None, str(e)