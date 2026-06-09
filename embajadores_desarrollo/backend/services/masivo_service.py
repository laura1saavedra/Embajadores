"""
services/masivo_service.py

Logica de incidentes masivos.

Un incidente masivo se genera cuando existen
5 o mas incidentes abiertos en un lapso de 5 minutos
con la misma aplicacion y tipo de falla.

Si ya existe un masivo abierto con la misma aplicacion y tipo de falla,
la aplicacion afectada del incidente se asocia automaticamente a ese masivo.
"""

import logging

from datetime import datetime
from typing import Optional, Tuple, Dict, Any, List

from sqlalchemy.orm import joinedload

from db import get_db_session

from models import (
    Masivo,
    Incidente,
    AplicacionAfectada,
    Cav,
)

logger = logging.getLogger(__name__)


# ─────────────────────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────────────────────

def _obtener_incidentes_unicos_desde_aplicaciones(
    aplicaciones_afectadas: List[AplicacionAfectada],
) -> List[Incidente]:
    incidentes_por_id = {}

    for aa in aplicaciones_afectadas or []:
        if aa.incidente:
            incidentes_por_id[aa.incidente.id_incidente] = aa.incidente

    return list(incidentes_por_id.values())


def _masivo_a_dict(masivo: Masivo) -> Dict[str, Any]:
    aplicaciones_afectadas = masivo.aplicaciones_afectadas or []
    incidentes = _obtener_incidentes_unicos_desde_aplicaciones(aplicaciones_afectadas)

    cavs_unicos = set()

    for incidente in incidentes:
        if incidente.cav_id:
            cavs_unicos.add(incidente.cav_id)

    return {
        "idmasivo": masivo.idmasivo,
        "aplicacion_id": masivo.aplicacion_id,
        "nombre_aplicacion": (
            masivo.aplicacion.nombre_aplicacion
            if masivo.aplicacion else None
        ),
        "tipo_falla_id": masivo.tipo_falla_id,
        "nombre_tipo_falla": (
            masivo.tipo_falla.nombre_tipo
            if masivo.tipo_falla else None
        ),
        "usuarios_totales": masivo.usuarios_totales,
        "usuarios_totales_afectados": masivo.usuarios_totales_afectados,
        "cantidad_incidentes": len(incidentes),
        "cantidad_cavs_afectados": len(cavs_unicos),
        "estado": masivo.estado,
        "fecha_hora_generado": (
            masivo.fecha_hora_generado.isoformat()
            if masivo.fecha_hora_generado else None
        ),
        "fecha_hora_cierre": (
            masivo.fecha_hora_cierre.isoformat()
            if masivo.fecha_hora_cierre else None
        ),
        "dias_activos": masivo.dias_activos,
    }


def _detalle_masivo_a_dict(masivo: Masivo) -> Dict[str, Any]:
    base = _masivo_a_dict(masivo)

    cavs_resumen = {}
    aplicaciones_afectadas = masivo.aplicaciones_afectadas or []

    for aa in aplicaciones_afectadas:
        incidente = aa.incidente

        if not incidente or not incidente.cav_id:
            continue

        ciudad = (
            incidente.cav.ciudad
            if incidente.cav and incidente.cav.ciudad
            else None
        )

        if incidente.cav_id not in cavs_resumen:
            cavs_resumen[incidente.cav_id] = {
                "cav_id": incidente.cav_id,
                "cav_nombre": incidente.cav.nombre_cav if incidente.cav else None,
                "ciudad_id": ciudad.id_ciudad if ciudad else None,
                "ciudad_nombre": ciudad.nombre_ciudad if ciudad else None,
                "usuarios_afectados": 0,
                "usuarios_totalidad": None,
                "cantidad_incidentes": 0,
                "incidentes": [],
                "_incidentes_ids": set(),
            }

        if incidente.id_incidente not in cavs_resumen[incidente.cav_id]["_incidentes_ids"]:
            cavs_resumen[incidente.cav_id]["usuarios_afectados"] += (
                incidente.usuarios_afectados or 0
            )

            cavs_resumen[incidente.cav_id]["cantidad_incidentes"] += 1

            if incidente.usuarios_totalidad is not None:
                if cavs_resumen[incidente.cav_id]["usuarios_totalidad"] is None:
                    cavs_resumen[incidente.cav_id]["usuarios_totalidad"] = 0

                cavs_resumen[incidente.cav_id]["usuarios_totalidad"] += (
                    incidente.usuarios_totalidad
                )

            cavs_resumen[incidente.cav_id]["incidentes"].append({
                "id_incidente": incidente.id_incidente,
                "id_aplicaciones_afectados": aa.id_aplicaciones_afectados,
                "aplicacion_id": aa.aplicacion_id,
                "tipo_falla_id": aa.tipo_falla_id,
                "usuarios_afectados": incidente.usuarios_afectados,
                "usuarios_totalidad": incidente.usuarios_totalidad,
                "estado": incidente.estado,
                "fecha_hora_reporte": (
                    incidente.fecha_hora_reporte.isoformat()
                    if incidente.fecha_hora_reporte else None
                ),
            })

            cavs_resumen[incidente.cav_id]["_incidentes_ids"].add(
                incidente.id_incidente
            )

    for cav in cavs_resumen.values():
        cav.pop("_incidentes_ids", None)

    base["cavs_afectados"] = list(cavs_resumen.values())

    return base


def _recalcular_totales_masivo(db, masivo: Masivo) -> None:
    """
    Recalcula los usuarios afectados de un masivo.

    La relacion con los incidentes se hace por:
    aplicaciones_afectados.masivo_id
    """

    aplicaciones_afectadas = (
        db.query(AplicacionAfectada)
        .options(joinedload(AplicacionAfectada.incidente))
        .filter(AplicacionAfectada.masivo_id == masivo.idmasivo)
        .all()
    )

    incidentes_por_id = {}

    for aa in aplicaciones_afectadas:
        if aa.incidente:
            incidentes_por_id[aa.incidente.id_incidente] = aa.incidente

    incidentes_del_masivo = list(incidentes_por_id.values())

    masivo.usuarios_totales_afectados = sum(
        i.usuarios_afectados or 0
        for i in incidentes_del_masivo
    )

    todos_tienen_totalidad = all(
        i.usuarios_totalidad is not None
        for i in incidentes_del_masivo
    )

    if incidentes_del_masivo and todos_tienen_totalidad:
        masivo.usuarios_totales = sum(
            i.usuarios_totalidad or 0
            for i in incidentes_del_masivo
        )
    else:
        masivo.usuarios_totales = None


# ─────────────────────────────────────────────────────────────────────────────
# Service
# ─────────────────────────────────────────────────────────────────────────────

class MasivoService:

    @staticmethod
    def evaluar_masivo_por_incidente(
        db,
        incidente_id: int,
    ) -> None:

        incidente = (
            db.query(Incidente)
            .options(joinedload(Incidente.aplicaciones_afectadas))
            .filter(Incidente.id_incidente == incidente_id)
            .first()
        )

        if not incidente:
            return

        for aplicacion_afectada in incidente.aplicaciones_afectadas:
            aplicacion_id = aplicacion_afectada.aplicacion_id
            tipo_falla_id = aplicacion_afectada.tipo_falla_id

            masivo_existente = (
                db.query(Masivo)
                .filter(
                    Masivo.aplicacion_id == aplicacion_id,
                    Masivo.tipo_falla_id == tipo_falla_id,
                    Masivo.estado == "abierto",
                )
                .first()
            )

            if masivo_existente:
                aplicacion_afectada.masivo_id = masivo_existente.idmasivo
                db.flush()

                _recalcular_totales_masivo(db, masivo_existente)
                db.flush()

                logger.info(
                    f"Aplicacion afectada {aplicacion_afectada.id_aplicaciones_afectados} "
                    f"del incidente {incidente.id_incidente} asociada al masivo "
                    f"{masivo_existente.idmasivo}."
                )

                continue

            aplicaciones_relacionadas = (
                db.query(AplicacionAfectada)
                .join(
                    Incidente,
                    Incidente.id_incidente == AplicacionAfectada.incidente_id
                )
                .filter(
                    Incidente.estado == "abierto",
                    AplicacionAfectada.aplicacion_id == aplicacion_id,
                    AplicacionAfectada.tipo_falla_id == tipo_falla_id,
                    AplicacionAfectada.masivo_id.is_(None),
                )
                .all()
            )

            incidentes_unicos = {
                aa.incidente_id
                for aa in aplicaciones_relacionadas
            }

            if len(incidentes_unicos) < 5:
                continue

            nuevo_masivo = Masivo(
                aplicacion_id=aplicacion_id,
                tipo_falla_id=tipo_falla_id,
                usuarios_totales=None,
                usuarios_totales_afectados=0,
                estado="abierto",
            )

            db.add(nuevo_masivo)
            db.flush()

            for aa in aplicaciones_relacionadas:
                aa.masivo_id = nuevo_masivo.idmasivo

            db.flush()

            _recalcular_totales_masivo(db, nuevo_masivo)
            db.flush()

            logger.info(
                f"Incidente masivo {nuevo_masivo.idmasivo} creado para "
                f"aplicacion {aplicacion_id} y tipo de falla {tipo_falla_id}. "
                f"Incidentes asociados: {len(incidentes_unicos)}."
            )

    @staticmethod
    def asociar_incidentes_a_masivos_activos() -> Tuple[Optional[Dict], Optional[str]]:
        """
        Cada 5 minutos:
        - Busca masivos activos.
        - Busca aplicaciones afectadas abiertas sin masivo asociado.
        - Si coinciden en aplicación y tipo de falla, las asocia al masivo.
        """

        try:
            with get_db_session() as db:
                masivos_activos = (
                    db.query(Masivo)
                    .filter(Masivo.estado == "abierto")
                    .all()
                )

                total_asociados = 0

                for masivo in masivos_activos:
                    aplicaciones_coincidentes = (
                        db.query(AplicacionAfectada)
                        .join(
                            Incidente,
                            Incidente.id_incidente == AplicacionAfectada.incidente_id
                        )
                        .filter(
                            Incidente.estado == "abierto",
                            AplicacionAfectada.masivo_id.is_(None),
                            AplicacionAfectada.aplicacion_id == masivo.aplicacion_id,
                            AplicacionAfectada.tipo_falla_id == masivo.tipo_falla_id,
                        )
                        .all()
                    )

                    if not aplicaciones_coincidentes:
                        continue

                    for aa in aplicaciones_coincidentes:
                        aa.masivo_id = masivo.idmasivo
                        total_asociados += 1

                    _recalcular_totales_masivo(db, masivo)

                db.commit()

                logger.info(
                    "Asociacion automatica de masivos ejecutada. "
                    f"Masivos revisados: {len(masivos_activos)}. "
                    f"Aplicaciones afectadas asociadas: {total_asociados}."
                )

                return {
                    "procesado": True,
                    "masivos_revisados": len(masivos_activos),
                    "aplicaciones_afectadas_asociadas": total_asociados,
                }, None

        except Exception as e:
            logger.error(f"Error al asociar incidentes a masivos activos: {e}")
            return None, str(e)

    @staticmethod
    def listar_masivos(
        aplicacion_id: Optional[int] = None,
        tipo_falla_id: Optional[int] = None,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:

        try:
            with get_db_session() as db:
                query = (
                    db.query(Masivo)
                    .options(
                        joinedload(Masivo.aplicacion),
                        joinedload(Masivo.tipo_falla),
                        joinedload(Masivo.aplicaciones_afectadas)
                            .joinedload(AplicacionAfectada.incidente),
                    )
                    .order_by(Masivo.fecha_hora_generado.desc())
                )

                if aplicacion_id:
                    query = query.filter(Masivo.aplicacion_id == aplicacion_id)

                if tipo_falla_id:
                    query = query.filter(Masivo.tipo_falla_id == tipo_falla_id)

                masivos = query.all()

                return [_masivo_a_dict(m) for m in masivos], None

        except Exception as e:
            logger.error(f"Error al listar masivos: {e}")
            return None, str(e)

    @staticmethod
    def obtener_masivo(
        idmasivo: int
    ) -> Tuple[Optional[Dict], Optional[str]]:

        try:
            with get_db_session() as db:
                masivo = (
                    db.query(Masivo)
                    .options(
                        joinedload(Masivo.aplicacion),
                        joinedload(Masivo.tipo_falla),
                        joinedload(Masivo.aplicaciones_afectadas)
                            .joinedload(AplicacionAfectada.incidente)
                            .joinedload(Incidente.cav)
                            .joinedload(Cav.ciudad),
                    )
                    .filter(Masivo.idmasivo == idmasivo)
                    .first()
                )

                if not masivo:
                    return None, "Incidente masivo no encontrado"

                return _detalle_masivo_a_dict(masivo), None

        except Exception as e:
            logger.error(f"Error al obtener masivo: {e}")
            return None, str(e)

    @staticmethod
    def cerrar_masivo(
        idmasivo: int
    ) -> Tuple[Optional[Dict], Optional[str]]:

        try:
            with get_db_session() as db:
                masivo = (
                    db.query(Masivo)
                    .filter(Masivo.idmasivo == idmasivo)
                    .first()
                )

                if not masivo:
                    return None, "Incidente masivo no encontrado"

                if masivo.estado == "cerrado":
                    return None, "El incidente masivo ya esta cerrado"

                masivo.estado = "cerrado"
                masivo.fecha_hora_cierre = datetime.now()

                if masivo.fecha_hora_generado:
                    diferencia = masivo.fecha_hora_cierre - masivo.fecha_hora_generado
                    masivo.dias_activos = diferencia.days

                db.commit()

                return {
                    "cerrado": True,
                    "idmasivo": idmasivo,
                }, None

        except Exception as e:
            logger.error(f"Error al cerrar masivo: {e}")
            return None, str(e)

    @staticmethod
    def resumen() -> Tuple[Optional[Dict], Optional[str]]:

        try:
            with get_db_session() as db:
                total = db.query(Masivo).count()

                abiertos = (
                    db.query(Masivo)
                    .filter(Masivo.estado == "abierto")
                    .count()
                )

                cerrados = (
                    db.query(Masivo)
                    .filter(Masivo.estado == "cerrado")
                    .count()
                )

                return {
                    "total": total,
                    "abiertos": abiertos,
                    "cerrados": cerrados,
                }, None

        except Exception as e:
            logger.error(f"Error al obtener resumen de masivos: {e}")
            return None, str(e)