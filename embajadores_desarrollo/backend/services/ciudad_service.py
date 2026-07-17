"""
services/ciudad_service.py

CRUD de ciudades.
Permite listar ciudades con sus CAVs asociados, crear, actualizar y eliminar.
"""

import logging
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Ciudad, Cav, Incidente
from services.cav_service import asegurar_columnas_estado_cav, _normalizar_supervisores


logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def _normalizar_texto(valor: str) -> str:
    return " ".join(valor.strip().split())


def asegurar_columnas_estado_ciudad(db) -> None:
    asegurar_columnas_estado_cav(db)


def _cav_a_dict(cav: Cav) -> Dict[str, Any]:
    supervisores = list(cav.supervisores or [])
    if not supervisores and cav.nombre_supervisor:
        supervisores = [{"nombre": cav.nombre_supervisor, "telefono": ""}]
    return {
        "id_cav": cav.id_cav,
        "nombre_cav": cav.nombre_cav,
        "activo": cav.activo,
        "direccion": cav.direccion,
        "nombre_jefe": cav.nombre_jefe,
        "nombre_supervisor": cav.nombre_supervisor,
        "supervisores": supervisores,
        "numero_terminales": cav.numero_terminales,
    }


def _ciudad_a_dict(ciudad: Ciudad, incluir_cavs: bool = False) -> Dict[str, Any]:
    data = {
        "id_ciudad": ciudad.id_ciudad,
        "nombre_ciudad": ciudad.nombre_ciudad,
        "activo": ciudad.activo,
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
        solo_activos: bool = False,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_ciudad(db)

                query = db.query(Ciudad)

                if incluir_cavs:
                    query = query.options(joinedload(Ciudad.cavs))

                if solo_activos:
                    query = query.filter(Ciudad.activo.is_(True))

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
                asegurar_columnas_estado_ciudad(db)

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
                asegurar_columnas_estado_ciudad(db)

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
        cavs: Optional[List[Dict[str, Any]]] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        """
        Crea una ciudad y varios CAVs en una sola operación.
        Este método corresponde al formulario del mockup.
        """
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_ciudad(db)

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

                cavs_validados = []
                for cav in cavs or []:
                    nombre_cav = _normalizar_nombre(cav.get("nombre_cav", ""))
                    direccion = _normalizar_texto(cav.get("direccion", ""))
                    nombre_jefe = _normalizar_texto(cav.get("nombre_jefe", ""))
                    supervisores = _normalizar_supervisores(cav.get("supervisores"))
                    nombre_supervisor = (
                        supervisores[0]["nombre"] if supervisores
                        else _normalizar_texto(cav.get("nombre_supervisor", ""))
                    )
                    numero_terminales = cav.get("numero_terminales")

                    if not nombre_cav:
                        continue

                    if not direccion or not nombre_jefe or not supervisores:
                        return None, (
                            f"Completa direccion, jefe y supervisor para el CAV '{nombre_cav}'"
                        )

                    if not isinstance(numero_terminales, int) or numero_terminales <= 0:
                        return None, (
                            f"El numero de terminales del CAV '{nombre_cav}' debe ser mayor a cero"
                        )

                    if nombre_cav.lower() in [
                        item["nombre_cav"].lower()
                        for item in cavs_validados
                    ]:
                        return None, f"El CAV '{nombre_cav}' está duplicado en la lista"

                    cavs_validados.append(
                        {
                            "nombre_cav": nombre_cav,
                            "direccion": direccion,
                            "nombre_jefe": nombre_jefe,
                            "nombre_supervisor": nombre_supervisor,
                            "supervisores": supervisores,
                            "numero_terminales": numero_terminales,
                        }
                    )

                nueva = Ciudad(nombre_ciudad=nombre)

                db.add(nueva)
                db.flush()

                for cav in cavs_validados:
                    db.add(
                        Cav(
                            nombre_cav=cav["nombre_cav"],
                            direccion=cav["direccion"],
                            nombre_jefe=cav["nombre_jefe"],
                            nombre_supervisor=cav["nombre_supervisor"],
                            supervisores=cav["supervisores"],
                            numero_terminales=cav["numero_terminales"],
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
                asegurar_columnas_estado_ciudad(db)

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
    def cambiar_estado_ciudad(
        id_ciudad: int,
        activo: bool,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_ciudad(db)

                ciudad = (
                    db.query(Ciudad)
                    .options(joinedload(Ciudad.cavs))
                    .filter(Ciudad.id_ciudad == id_ciudad)
                    .first()
                )

                if not ciudad:
                    return None, "Ciudad no encontrada"

                ciudad.activo = activo

                for cav in ciudad.cavs or []:
                    cav.activo = activo

                db.commit()
                db.refresh(ciudad)

                return _ciudad_a_dict(ciudad, incluir_cavs=True), None

        except Exception as e:
            logger.error(f"Error al cambiar estado de ciudad {id_ciudad}: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_ciudad(
        id_ciudad: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_ciudad(db)

                ciudad = (
                    db.query(Ciudad)
                    .options(joinedload(Ciudad.cavs))
                    .filter(Ciudad.id_ciudad == id_ciudad)
                    .first()
                )

                if not ciudad:
                    return None, "Ciudad no encontrada"
                
                cavs_ids = [cav.id_cav for cav in ciudad.cavs]

                if cavs_ids:
                    tiene_incidentes = (
                        db.query(Incidente)
                        .filter(Incidente.cav_id.in_(cavs_ids))
                        .first()
                        is not None
                    )

                    if tiene_incidentes:
                        return None, (
                            "No se puede eliminar la ciudad porque uno o más CAVs tienen incidentes asociados"
                        )

                for cav in list(ciudad.cavs):
                    db.delete(cav)

                db.delete(ciudad)
                db.commit()

                return {
                    "eliminado": True,
                    "id_ciudad": id_ciudad,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar ciudad {id_ciudad}: {e}")
            return None, str(e)
