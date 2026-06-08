"""
services/ciudad_service.py

CRUD de ciudades.
Permite listar ciudades con sus CAVs asociados, crear, actualizar y eliminar.
"""

import logging
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Ciudad, Cav


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
    }


def _ciudad_a_dict(ciudad: Ciudad, incluir_cavs: bool = False) -> Dict[str, Any]:
    data = {
        "id_ciudad": ciudad.id_ciudad,
        "nombre_ciudad": ciudad.nombre_ciudad,
    }

    if incluir_cavs:
        data["cavs"] = [
            _cav_a_dict(cav)
            for cav in sorted(ciudad.cavs or [], key=lambda item: item.nombre_cav)
        ]

    return data


class CiudadService:

    @staticmethod
    def listar_ciudades(
        incluir_cavs: bool = True,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                query = db.query(Ciudad)

                if incluir_cavs:
                    query = query.options(joinedload(Ciudad.cavs))

                ciudades = (
                    query
                    .order_by(Ciudad.nombre_ciudad.asc())
                    .all()
                )

                return [
                    _ciudad_a_dict(ciudad, incluir_cavs=incluir_cavs)
                    for ciudad in ciudades
                ], None

        except Exception as e:
            logger.error(f"Error al listar ciudades: {e}")
            return None, str(e)

    @staticmethod
    def obtener_ciudad(
        id_ciudad: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                ciudad = (
                    db.query(Ciudad)
                    .options(joinedload(Ciudad.cavs))
                    .filter(Ciudad.id_ciudad == id_ciudad)
                    .first()
                )

                if not ciudad:
                    return None, "Ciudad no encontrada"

                return _ciudad_a_dict(ciudad, incluir_cavs=True), None

        except Exception as e:
            logger.error(f"Error al obtener ciudad {id_ciudad}: {e}")
            return None, str(e)

    @staticmethod
    def crear_ciudad(
        nombre_ciudad: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                nombre = _normalizar_nombre(nombre_ciudad)

                if not nombre:
                    return None, "El nombre de la ciudad es obligatorio"

                existe = (
                    db.query(Ciudad)
                    .filter(Ciudad.nombre_ciudad.ilike(nombre))
                    .first()
                )

                if existe:
                    return None, "Ya existe una ciudad con ese nombre"

                nueva = Ciudad(nombre_ciudad=nombre)

                db.add(nueva)
                db.commit()
                db.refresh(nueva)

                return _ciudad_a_dict(nueva, incluir_cavs=True), None

        except Exception as e:
            logger.error(f"Error al crear ciudad: {e}")
            return None, str(e)

    @staticmethod
    def crear_ciudad_completa(
        nombre_ciudad: str,
        cavs: Optional[List[str]] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Crea una ciudad y varios CAVs en una sola operación.
        Este método corresponde al formulario del mockup.
        """
        try:
            with get_db_session() as db:
                nombre = _normalizar_nombre(nombre_ciudad)

                if not nombre:
                    return None, "El nombre de la ciudad es obligatorio"

                existe = (
                    db.query(Ciudad)
                    .filter(Ciudad.nombre_ciudad.ilike(nombre))
                    .first()
                )

                if existe:
                    return None, "Ya existe una ciudad con ese nombre"

                nombres_cavs = []
                for cav in cavs or []:
                    nombre_cav = _normalizar_nombre(cav)

                    if not nombre_cav:
                        continue

                    if nombre_cav.lower() in [n.lower() for n in nombres_cavs]:
                        return None, f"El CAV '{nombre_cav}' está duplicado en la lista"

                    nombres_cavs.append(nombre_cav)

                nueva = Ciudad(nombre_ciudad=nombre)

                db.add(nueva)
                db.flush()

                for nombre_cav in nombres_cavs:
                    db.add(
                        Cav(
                            nombre_cav=nombre_cav,
                            ciudad_id=nueva.id_ciudad,
                        )
                    )

                db.commit()
                db.refresh(nueva)

                ciudad_creada = (
                    db.query(Ciudad)
                    .options(joinedload(Ciudad.cavs))
                    .filter(Ciudad.id_ciudad == nueva.id_ciudad)
                    .first()
                )

                return _ciudad_a_dict(ciudad_creada, incluir_cavs=True), None

        except Exception as e:
            logger.error(f"Error al crear ciudad completa: {e}")
            return None, str(e)

    @staticmethod
    def actualizar_ciudad(
        id_ciudad: int,
        nombre_ciudad: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                nombre = _normalizar_nombre(nombre_ciudad)

                if not nombre:
                    return None, "El nombre de la ciudad es obligatorio"

                ciudad = (
                    db.query(Ciudad)
                    .filter(Ciudad.id_ciudad == id_ciudad)
                    .first()
                )

                if not ciudad:
                    return None, "Ciudad no encontrada"

                existe = (
                    db.query(Ciudad)
                    .filter(
                        Ciudad.id_ciudad != id_ciudad,
                        Ciudad.nombre_ciudad.ilike(nombre),
                    )
                    .first()
                )

                if existe:
                    return None, "Ya existe una ciudad con ese nombre"

                ciudad.nombre_ciudad = nombre

                db.commit()
                db.refresh(ciudad)

                return _ciudad_a_dict(ciudad, incluir_cavs=True), None

        except Exception as e:
            logger.error(f"Error al actualizar ciudad {id_ciudad}: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_ciudad(
        id_ciudad: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                ciudad = (
                    db.query(Ciudad)
                    .options(joinedload(Ciudad.cavs))
                    .filter(Ciudad.id_ciudad == id_ciudad)
                    .first()
                )

                if not ciudad:
                    return None, "Ciudad no encontrada"

                if ciudad.cavs:
                    return None, "No se puede eliminar la ciudad porque tiene CAVs asociados"

                db.delete(ciudad)
                db.commit()

                return {
                    "eliminado": True,
                    "id_ciudad": id_ciudad,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar ciudad {id_ciudad}: {e}")
            return None, str(e)