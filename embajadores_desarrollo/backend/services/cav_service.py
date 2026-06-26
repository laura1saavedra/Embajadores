"""
services/cav_service.py

CRUD de CAVs.
"""

import logging
from typing import Optional, List, Tuple, Dict, Any

from sqlalchemy import bindparam, text
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Cav, Ciudad, Incidente


logger = logging.getLogger(__name__)
ESQUEMA_BD = "API_PROD"
_COLUMNAS_VERIFICADAS = set()


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _normalizar_nombre(nombre: str) -> str:
    return " ".join(nombre.strip().split())


def _columnas_faltantes(db, tabla: str, columnas: Dict[str, str]) -> List[str]:
    pendientes = [
        columna
        for columna in columnas
        if (tabla, columna) not in _COLUMNAS_VERIFICADAS
    ]

    if not pendientes:
        return []

    consulta = text("""
            SELECT column_name
            FROM information_schema.columns
            WHERE table_schema = :schema
              AND table_name = :table
              AND column_name IN :columns
        """).bindparams(bindparam("columns", expanding=True))

    existentes = db.execute(
        consulta,
        {
            "schema": ESQUEMA_BD,
            "table": tabla,
            "columns": pendientes,
        },
    ).scalars().all()

    for columna in existentes:
        _COLUMNAS_VERIFICADAS.add((tabla, columna))

    return [
        columna
        for columna in pendientes
        if (tabla, columna) not in _COLUMNAS_VERIFICADAS
    ]


def _asegurar_columnas(db, tabla: str, columnas: Dict[str, str]) -> None:
    faltantes = _columnas_faltantes(db, tabla, columnas)

    if not faltantes:
        return

    definiciones = ",\n        ".join(
        f"ADD COLUMN IF NOT EXISTS {columna} {columnas[columna]}"
        for columna in faltantes
    )

    db.execute(text(f'ALTER TABLE "{ESQUEMA_BD}".{tabla}\n        {definiciones}'))
    db.commit()

    for columna in faltantes:
        _COLUMNAS_VERIFICADAS.add((tabla, columna))


def asegurar_columnas_detalle_cav(db) -> None:
    _asegurar_columnas(
        db,
        "cav",
        {
            "direccion": "VARCHAR(255)",
            "nombre_jefe": "VARCHAR(150)",
            "nombre_supervisor": "VARCHAR(150)",
            "numero_terminales": "INTEGER",
        },
    )


def asegurar_columnas_estado_cav(db) -> None:
    asegurar_columnas_detalle_cav(db)
    _asegurar_columnas(
        db,
        "ciudad",
        {"activo": "BOOLEAN NOT NULL DEFAULT TRUE"},
    )
    _asegurar_columnas(
        db,
        "cav",
        {"activo": "BOOLEAN NOT NULL DEFAULT TRUE"},
    )


def _normalizar_texto(valor: Optional[str]) -> Optional[str]:
    if valor is None:
        return None

    texto = " ".join(valor.strip().split())
    return texto or None


def _cav_a_dict(cav: Cav) -> Dict[str, Any]:
    return {
        "id_cav": cav.id_cav,
        "nombre_cav": cav.nombre_cav,
        "activo": cav.activo,
        "direccion": cav.direccion,
        "nombre_jefe": cav.nombre_jefe,
        "nombre_supervisor": cav.nombre_supervisor,
        "numero_terminales": cav.numero_terminales,
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
        solo_activos: bool = False,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_cav(db)

                query = (
                    db.query(Cav)
                    .options(joinedload(Cav.ciudad))
                )

                if ciudad_id:
                    query = query.filter(
                        Cav.ciudad_id == ciudad_id
                    )

                if solo_activos:
                    query = query.filter(
                        Cav.activo.is_(True),
                        Cav.ciudad.has(Ciudad.activo.is_(True)),
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
                asegurar_columnas_estado_cav(db)

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
        direccion: Optional[str] = None,
        nombre_jefe: Optional[str] = None,
        nombre_supervisor: Optional[str] = None,
        numero_terminales: Optional[int] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_cav(db)

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
                    direccion=_normalizar_texto(direccion),
                    nombre_jefe=_normalizar_texto(nombre_jefe),
                    nombre_supervisor=_normalizar_texto(nombre_supervisor),
                    numero_terminales=numero_terminales,
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
        direccion: Optional[str] = None,
        nombre_jefe: Optional[str] = None,
        nombre_supervisor: Optional[str] = None,
        numero_terminales: Optional[int] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_cav(db)

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
                cav.direccion = _normalizar_texto(direccion)
                cav.nombre_jefe = _normalizar_texto(nombre_jefe)
                cav.nombre_supervisor = _normalizar_texto(nombre_supervisor)
                cav.numero_terminales = numero_terminales

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
    def cambiar_estado_cav(
        id_cav: int,
        activo: bool,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_cav(db)

                cav = (
                    db.query(Cav)
                    .options(joinedload(Cav.ciudad))
                    .filter(Cav.id_cav == id_cav)
                    .first()
                )

                if not cav:
                    return None, "CAV no encontrado"

                if activo and cav.ciudad and not cav.ciudad.activo:
                    return None, "No se puede habilitar un CAV de una ciudad inhabilitada"

                cav.activo = activo

                db.commit()
                db.refresh(cav)

                return _cav_a_dict(cav), None

        except Exception as e:
            logger.error(f"Error al cambiar estado del CAV {id_cav}: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_cav(
        id_cav: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                asegurar_columnas_estado_cav(db)

                cav = (
                    db.query(Cav)
                    .filter(
                        Cav.id_cav == id_cav
                    )
                    .first()
                )

                if not cav:
                    return None, "CAV no encontrado"

                cantidad_cavs_ciudad = (
                    db.query(Cav)
                    .filter(Cav.ciudad_id == cav.ciudad_id)
                    .count()
                )

                if cantidad_cavs_ciudad <= 1:
                    return None, (
                        "No se puede eliminar el CAV porque la ciudad quedaría sin CAVs asociados. "
                        "Elimina la ciudad junto con su CAV asociado."
                    )

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
