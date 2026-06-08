"""
services/cav_service.py

CRUD de CAVs.
"""

import logging
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Cav, Ciudad, Incidente


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def _cav_a_dict(cav: Cav) -> Dict[str, Any]:
    return {
        "id_cav": cav.id_cav,
        "nombre_cav": cav.nombre_cav,
        "ciudad_id": cav.ciudad_id,
        "ciudad_nombre": (
            cav.ciudad.nombre_ciudad
            if cav.ciudad
            else None
        ),
    }


class CavService:

    # ─────────────────────────────────────────────────────────────
    # Listar
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def listar_cavs(
        ciudad_id: Optional[int] = None,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:

                query = (
                    db.query(Cav)
                    .options(joinedload(Cav.ciudad))
                )

                if ciudad_id:
                    query = query.filter(
                        Cav.ciudad_id == ciudad_id
                    )

                cavs = (
                    query
                    .order_by(Cav.nombre_cav.asc())
                    .all()
                )

                return [
                    _cav_a_dict(cav)
                    for cav in cavs
                ], None

        except Exception as e:
            logger.error(f"Error al listar CAVs: {e}")
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Obtener
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def obtener_cav(
        id_cav: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:

                cav = (
                    db.query(Cav)
                    .options(joinedload(Cav.ciudad))
                    .filter(Cav.id_cav == id_cav)
                    .first()
                )

                if not cav:
                    return None, "CAV no encontrado"

                return _cav_a_dict(cav), None

        except Exception as e:
            logger.error(
                f"Error al obtener CAV {id_cav}: {e}"
            )
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Crear
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def crear_cav(
        nombre_cav: str,
        ciudad_id: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:

                nombre = _normalizar_nombre(nombre_cav)

                if not nombre:
                    return None, "El nombre del CAV es obligatorio"

                ciudad = (
                    db.query(Ciudad)
                    .filter(
                        Ciudad.id_ciudad == ciudad_id
                    )
                    .first()
                )

                if not ciudad:
                    return None, "La ciudad seleccionada no existe"

                existe = (
                    db.query(Cav)
                    .filter(
                        Cav.ciudad_id == ciudad_id,
                        Cav.nombre_cav.ilike(nombre)
                    )
                    .first()
                )

                if existe:
                    return None, (
                        "Ya existe un CAV con ese nombre en la ciudad"
                    )

                nuevo = Cav(
                    nombre_cav=nombre,
                    ciudad_id=ciudad_id,
                )

                db.add(nuevo)
                db.commit()
                db.refresh(nuevo)

                cav_creado = (
                    db.query(Cav)
                    .options(joinedload(Cav.ciudad))
                    .filter(Cav.id_cav == nuevo.id_cav)
                    .first()
                )

                return _cav_a_dict(cav_creado), None

        except Exception as e:
            logger.error(f"Error al crear CAV: {e}")
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Actualizar
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def actualizar_cav(
        id_cav: int,
        nombre_cav: str,
        ciudad_id: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:

                cav = (
                    db.query(Cav)
                    .filter(
                        Cav.id_cav == id_cav
                    )
                    .first()
                )

                if not cav:
                    return None, "CAV no encontrado"

                nombre = _normalizar_nombre(nombre_cav)

                if not nombre:
                    return None, "El nombre del CAV es obligatorio"

                ciudad = (
                    db.query(Ciudad)
                    .filter(
                        Ciudad.id_ciudad == ciudad_id
                    )
                    .first()
                )

                if not ciudad:
                    return None, "La ciudad seleccionada no existe"

                existe = (
                    db.query(Cav)
                    .filter(
                        Cav.id_cav != id_cav,
                        Cav.ciudad_id == ciudad_id,
                        Cav.nombre_cav.ilike(nombre)
                    )
                    .first()
                )

                if existe:
                    return None, (
                        "Ya existe un CAV con ese nombre en la ciudad"
                    )

                cav.nombre_cav = nombre
                cav.ciudad_id = ciudad_id

                db.commit()
                db.refresh(cav)

                cav_actualizado = (
                    db.query(Cav)
                    .options(joinedload(Cav.ciudad))
                    .filter(Cav.id_cav == id_cav)
                    .first()
                )

                return _cav_a_dict(cav_actualizado), None

        except Exception as e:
            logger.error(
                f"Error al actualizar CAV {id_cav}: {e}"
            )
            return None, str(e)

    # ─────────────────────────────────────────────────────────────
    # Eliminar
    # ─────────────────────────────────────────────────────────────

    @staticmethod
    def eliminar_cav(
        id_cav: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:

                cav = (
                    db.query(Cav)
                    .filter(
                        Cav.id_cav == id_cav
                    )
                    .first()
                )

                if not cav:
                    return None, "CAV no encontrado"

                tiene_incidentes = (
                    db.query(Incidente)
                    .filter(
                        Incidente.cav_id == id_cav
                    )
                    .first()
                    is not None
                )

                if tiene_incidentes:
                    return None, (
                        "No se puede eliminar el CAV porque tiene incidentes asociados"
                    )

                db.delete(cav)
                db.commit()

                return {
                    "eliminado": True,
                    "id_cav": id_cav,
                }, None

        except Exception as e:
            logger.error(
                f"Error al eliminar CAV {id_cav}: {e}"
            )
            return None, str(e)