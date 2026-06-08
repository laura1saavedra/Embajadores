"""
services/incidente_service.py

CRUD completo de incidentes con trazabilidad (historial).
"""

import logging
from typing import Optional, List, Tuple, Any, Dict

from sqlalchemy import extract, or_, cast, String
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import (
    Incidente,
    Cav,
    Usuario,
    HistorialIncidente,
    Aplicacion,
    TipoFalla,
    AplicacionAfectada,
)
from services.masivo_service import MasivoService

logger = logging.getLogger(__name__)


# ── Helpers de serializacion ──────────────────────────────────────────────────

def _obtener_masivos_ids(i: Incidente) -> List[int]:
    masivos_ids = []

    for aa in i.aplicaciones_afectadas or []:
        if aa.masivo_id and aa.masivo_id not in masivos_ids:
            masivos_ids.append(aa.masivo_id)

    return masivos_ids


def _incidente_a_dict(i: Incidente, detallado: bool = False) -> Dict[str, Any]:
    cav = i.cav
    ciudad = cav.ciudad if cav else None
    usuario = i.usuario
    masivos_ids = _obtener_masivos_ids(i)

    base = {
        "id_incidente": i.id_incidente,
        "cav_id": i.cav_id,
        "cav_nombre": cav.nombre_cav if cav else None,
        "ciudad_id": ciudad.id_ciudad if ciudad else None,
        "ciudad_nombre": ciudad.nombre_ciudad if ciudad else None,
        "usuario_id": i.usuario_id,
        "usuario_nombre": f"{usuario.nombre} {usuario.apellido}" if usuario else None,
        "usuario_correo": usuario.correo if usuario else None,
        "masivos_ids": masivos_ids,
        "pertenece_a_masivo": len(masivos_ids) > 0,
        "usuarios_afectados": i.usuarios_afectados,
        "usuarios_totalidad": i.usuarios_totalidad,
        "estado": i.estado,
        "fecha_hora_reporte": i.fecha_hora_reporte.isoformat() if i.fecha_hora_reporte else None,
        "aplicaciones_afectadas": [
            {
                "id_aplicaciones_afectados": aa.id_aplicaciones_afectados,
                "aplicacion_id": aa.aplicacion_id,
                "nombre_aplicacion": aa.aplicacion.nombre_aplicacion if aa.aplicacion else None,
                "tipo_falla_id": aa.tipo_falla_id,
                "nombre_tipo": aa.tipo_falla.nombre_tipo if aa.tipo_falla else None,
                "masivo_id": aa.masivo_id,
            }
            for aa in i.aplicaciones_afectadas
        ],
    }

    return base


def _historial_a_dict(h: HistorialIncidente) -> Dict[str, Any]:
    return {
        "id_historial": h.id_historial,
        "incidente_id": h.incidente_id,
        "estado_anterior": h.estado_anterior,
        "estado_nuevo": h.estado_nuevo,
        "fecha_cambio": h.fecha_cambio.isoformat() if h.fecha_cambio else None,
    }


def _registrar_historial(
    db,
    incidente_id: int,
    estado_anterior: Optional[str],
    estado_nuevo: Optional[str],
) -> None:
    entrada = HistorialIncidente(
        incidente_id=incidente_id,
        estado_anterior=estado_anterior,
        estado_nuevo=estado_nuevo,
    )
    db.add(entrada)


# ── Operaciones CRUD ──────────────────────────────────────────────────────────

class IncidenteService:

    # ── Listar ────────────────────────────────────────────────────────────────
    @staticmethod
    def listar_incidentes(
        estado: Optional[str] = None,
        cav_id: Optional[int] = None,
        ciudad_id: Optional[int] = None,
        tipo_falla: Optional[str] = None,
        busqueda: Optional[str] = None,
        anio: Optional[int] = None,
        mes: Optional[int] = None,
        dia: Optional[int] = None,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                query = (
                    db.query(Incidente)
                    .options(
                        joinedload(Incidente.cav).joinedload(Cav.ciudad),
                        joinedload(Incidente.usuario),
                        joinedload(Incidente.aplicaciones_afectadas)
                            .joinedload(AplicacionAfectada.aplicacion),
                        joinedload(Incidente.aplicaciones_afectadas)
                            .joinedload(AplicacionAfectada.tipo_falla),
                    )
                    .filter(
                        ~Incidente.aplicaciones_afectadas.any(
                            AplicacionAfectada.masivo_id.isnot(None)
                        )
                    )
                    .order_by(Incidente.fecha_hora_reporte.desc())
                )

                if estado:
                    query = query.filter(Incidente.estado == estado)

                if cav_id:
                    query = query.filter(Incidente.cav_id == cav_id)

                if ciudad_id:
                    query = query.join(Incidente.cav).filter(Cav.ciudad_id == ciudad_id)

                if tipo_falla:
                    termino_tipo = tipo_falla.strip()

                    query = (
                        query.join(
                            AplicacionAfectada,
                            AplicacionAfectada.incidente_id == Incidente.id_incidente
                        )
                        .join(
                            TipoFalla,
                            TipoFalla.id_tipo_falla == AplicacionAfectada.tipo_falla_id
                        )
                        .filter(
                            TipoFalla.nombre_tipo.ilike(f"%{termino_tipo}%")
                        )
                    )

                if anio:
                    query = query.filter(extract("year", Incidente.fecha_hora_reporte) == anio)

                if mes:
                    query = query.filter(extract("month", Incidente.fecha_hora_reporte) == mes)

                if dia:
                    query = query.filter(extract("day", Incidente.fecha_hora_reporte) == dia)

                if busqueda:
                    termino = f"%{busqueda}%"
                    query = (
                        query.outerjoin(Incidente.aplicaciones_afectadas)
                        .outerjoin(AplicacionAfectada.aplicacion)
                        .outerjoin(AplicacionAfectada.tipo_falla)
                        .filter(
                            or_(
                                cast(Incidente.id_incidente, String).ilike(termino),
                                Aplicacion.nombre_aplicacion.ilike(termino),
                                TipoFalla.nombre_tipo.ilike(termino),
                            )
                        )
                    )

                incidentes = query.all()
                return [_incidente_a_dict(i) for i in incidentes], None

        except Exception as e:
            logger.error(f"Error al listar incidentes: {e}")
            return None, str(e)

    # ── Obtener por ID ────────────────────────────────────────────────────────
    @staticmethod
    def obtener_incidente(id_incidente: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                incidente = (
                    db.query(Incidente)
                    .options(
                        joinedload(Incidente.cav).joinedload(Cav.ciudad),
                        joinedload(Incidente.usuario),
                        joinedload(Incidente.aplicaciones_afectadas)
                            .joinedload(AplicacionAfectada.aplicacion),
                        joinedload(Incidente.aplicaciones_afectadas)
                            .joinedload(AplicacionAfectada.tipo_falla),
                    )
                    .filter(Incidente.id_incidente == id_incidente)
                    .first()
                )

                if not incidente:
                    return None, "Incidente no encontrado"

                return _incidente_a_dict(incidente, detallado=True), None

        except Exception as e:
            logger.error(f"Error al obtener incidente {id_incidente}: {e}")
            return None, str(e)

    # ── Crear ─────────────────────────────────────────────────────────────────
    @staticmethod
    def crear_incidente(
        datos: Dict[str, Any],
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                cav = db.query(Cav).filter(Cav.id_cav == datos.get("cav_id")).first()
                if not cav:
                    return None, f"CAV {datos.get('cav_id')} no encontrado"

                usuario_id = datos.get("usuario_id") or None
                if usuario_id:
                    usuario = db.query(Usuario).filter(
                        Usuario.id_usuario == usuario_id
                    ).first()
                    if not usuario:
                        return None, f"Usuario {usuario_id} no encontrado"

                aplicaciones_afectadas = datos.get("aplicaciones_afectadas", [])
                if not aplicaciones_afectadas:
                    return None, "Debe registrar al menos una aplicación afectada"

                usuarios_afectados = datos.get("usuarios_afectados")
                usuarios_totalidad = datos.get("usuarios_totalidad")

                if usuarios_afectados is None:
                    return None, "El campo usuarios_afectados es obligatorio"

                if usuarios_totalidad is not None and usuarios_afectados > usuarios_totalidad:
                    return None, "Los usuarios afectados no pueden ser mayores que los usuarios totales"

                nuevo = Incidente(
                    cav_id=datos["cav_id"],
                    usuario_id=usuario_id,
                    usuarios_afectados=usuarios_afectados,
                    usuarios_totalidad=usuarios_totalidad,
                    estado="abierto",
                )

                db.add(nuevo)
                db.flush()

                for item in aplicaciones_afectadas:
                    aplicacion_id = item.get("aplicacion_id")
                    tipo_falla_id = item.get("tipo_falla_id")

                    aplicacion = db.query(Aplicacion).filter(
                        Aplicacion.id_aplicacion == aplicacion_id
                    ).first()
                    if not aplicacion:
                        return None, f"Aplicación {aplicacion_id} no encontrada"

                    tipo_falla = db.query(TipoFalla).filter(
                        TipoFalla.id_tipo_falla == tipo_falla_id
                    ).first()
                    if not tipo_falla:
                        return None, f"Tipo de falla {tipo_falla_id} no encontrado"

                    db.add(
                        AplicacionAfectada(
                            incidente_id=nuevo.id_incidente,
                            aplicacion_id=aplicacion_id,
                            tipo_falla_id=tipo_falla_id,
                        )
                    )

                _registrar_historial(
                    db,
                    nuevo.id_incidente,
                    estado_anterior=None,
                    estado_nuevo="abierto",
                )

                db.flush()

                MasivoService.evaluar_masivo_por_incidente(
                    db=db,
                    incidente_id=nuevo.id_incidente
                )

                db.commit()

                incidente_respuesta, error = IncidenteService.obtener_incidente(nuevo.id_incidente)

                if error:
                    return None, error

                masivos_ids = incidente_respuesta.get("masivos_ids", [])

                if masivos_ids:
                    incidente_respuesta["mensaje"] = (
                        "Incidente registrado y asociado al/los incidente(s) masivo(s): "
                        f"{', '.join('#' + str(mid) for mid in masivos_ids)}."
                    )
                    incidente_respuesta["pertenece_a_masivo"] = True
                else:
                    incidente_respuesta["mensaje"] = "Incidente registrado correctamente."
                    incidente_respuesta["pertenece_a_masivo"] = False

                return incidente_respuesta, None

        except Exception as e:
            logger.error(f"Error al crear incidente: {e}")
            return None, str(e)

    # ── Actualizar campos ─────────────────────────────────────────────────────
    @staticmethod
    def actualizar_incidente(
        id_incidente: int,
        datos: Dict[str, Any],
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                incidente = db.query(Incidente).filter(
                    Incidente.id_incidente == id_incidente
                ).first()

                if not incidente:
                    return None, "Incidente no encontrado"

                if incidente.estado == "cerrado":
                    return None, "No se puede editar un incidente cerrado"

                ciudad_id = datos.get("ciudad_id")
                cav_id = datos.get("cav_id")

                if ciudad_id and not cav_id:
                    return None, "Debe seleccionar un CAV correspondiente a la ciudad seleccionada"

                if cav_id:
                    cav = db.query(Cav).filter(Cav.id_cav == cav_id).first()

                    if not cav:
                        return None, f"CAV {cav_id} no encontrado"

                    if ciudad_id and cav.ciudad_id != ciudad_id:
                        return None, "El CAV seleccionado no pertenece a la ciudad seleccionada"

                    incidente.cav_id = cav_id

                if "usuario_id" in datos and datos["usuario_id"]:
                    usuario = db.query(Usuario).filter(
                        Usuario.id_usuario == datos["usuario_id"]
                    ).first()

                    if not usuario:
                        return None, f"Usuario {datos['usuario_id']} no encontrado"

                    incidente.usuario_id = datos["usuario_id"]

                if "usuarios_afectados" in datos or "usuarios_totalidad" in datos:
                    nuevos_afectados = datos.get(
                        "usuarios_afectados",
                        incidente.usuarios_afectados,
                    )
                    nueva_totalidad = datos.get(
                        "usuarios_totalidad",
                        incidente.usuarios_totalidad,
                    )

                    if nuevos_afectados is None:
                        return None, "El campo usuarios_afectados es obligatorio"

                    if nueva_totalidad is not None and nuevos_afectados > nueva_totalidad:
                        return None, "Los usuarios afectados no pueden ser mayores que los usuarios totales"

                    incidente.usuarios_afectados = nuevos_afectados
                    incidente.usuarios_totalidad = nueva_totalidad

                if "aplicaciones_afectadas" in datos and datos["aplicaciones_afectadas"] is not None:
                    aplicaciones_afectadas = datos["aplicaciones_afectadas"]

                    if not aplicaciones_afectadas:
                        return None, "Debe registrar al menos una aplicación afectada"

                    db.query(AplicacionAfectada).filter(
                        AplicacionAfectada.incidente_id == id_incidente
                    ).delete()
                    db.flush()

                    for item in aplicaciones_afectadas:
                        aplicacion_id = item.get("aplicacion_id")
                        tipo_falla_id = item.get("tipo_falla_id")

                        if not aplicacion_id:
                            return None, "Debe seleccionar una aplicación"

                        if not tipo_falla_id:
                            return None, "Debe seleccionar un tipo de falla"

                        aplicacion = db.query(Aplicacion).filter(
                            Aplicacion.id_aplicacion == aplicacion_id
                        ).first()

                        if not aplicacion:
                            return None, f"Aplicación {aplicacion_id} no encontrada"

                        tipo_falla = db.query(TipoFalla).filter(
                            TipoFalla.id_tipo_falla == tipo_falla_id
                        ).first()

                        if not tipo_falla:
                            return None, f"Tipo de falla {tipo_falla_id} no encontrado"

                        db.add(
                            AplicacionAfectada(
                                incidente_id=id_incidente,
                                aplicacion_id=aplicacion_id,
                                tipo_falla_id=tipo_falla_id,
                            )
                        )

                db.commit()

                return IncidenteService.obtener_incidente(id_incidente)

        except Exception as e:
            logger.error(f"Error al actualizar incidente {id_incidente}: {e}")
            return None, str(e)

    # ── Cambiar estado ────────────────────────────────────────────────────────
    @staticmethod
    def cambiar_estado(
        id_incidente: int,
        nuevo_estado: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                incidente = db.query(Incidente).filter(
                    Incidente.id_incidente == id_incidente
                ).first()

                if not incidente:
                    return None, "Incidente no encontrado"

                if nuevo_estado not in ["abierto", "cerrado"]:
                    return None, "Estado inválido. Solo se permite 'abierto' o 'cerrado'"

                estado_anterior = incidente.estado

                if estado_anterior == "cerrado":
                    return None, "El incidente ya está cerrado"

                if estado_anterior == nuevo_estado:
                    return None, f"El incidente ya está en estado {nuevo_estado}"

                incidente.estado = nuevo_estado

                _registrar_historial(
                    db,
                    id_incidente,
                    estado_anterior=estado_anterior,
                    estado_nuevo=nuevo_estado,
                )

                db.commit()

                return IncidenteService.obtener_incidente(id_incidente)

        except Exception as e:
            logger.error(f"Error al cambiar estado del incidente {id_incidente}: {e}")
            return None, str(e)

    # ── Cerrar incidente ──────────────────────────────────────────────────────
    @staticmethod
    def cerrar_incidente(
        id_incidente: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        return IncidenteService.cambiar_estado(
            id_incidente=id_incidente,
            nuevo_estado="cerrado",
        )

    # ── Historial ─────────────────────────────────────────────────────────────
    @staticmethod
    def obtener_historial(id_incidente: int) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                incidente = db.query(Incidente).filter(
                    Incidente.id_incidente == id_incidente
                ).first()

                if not incidente:
                    return None, "Incidente no encontrado"

                entradas = (
                    db.query(HistorialIncidente)
                    .filter(HistorialIncidente.incidente_id == id_incidente)
                    .order_by(HistorialIncidente.fecha_cambio.asc())
                    .all()
                )

                return [_historial_a_dict(h) for h in entradas], None

        except Exception as e:
            logger.error(f"Error al obtener historial del incidente {id_incidente}: {e}")
            return None, str(e)

    # ── Eliminar ──────────────────────────────────────────────────────────────
    @staticmethod
    def eliminar_incidente(id_incidente: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                incidente = db.query(Incidente).filter(
                    Incidente.id_incidente == id_incidente
                ).first()

                if not incidente:
                    return None, "Incidente no encontrado"

                if incidente.estado != "cerrado":
                    return None, "Solo se pueden eliminar incidentes en estado cerrado"

                db.delete(incidente)
                db.commit()

                return {"eliminado": True, "id_incidente": id_incidente}, None

        except Exception as e:
            logger.error(f"Error al eliminar incidente {id_incidente}: {e}")
            return None, str(e)

    # ── Resumen / stats ───────────────────────────────────────────────────────
    @staticmethod
    def resumen() -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                base = (
                    db.query(Incidente)
                    .filter(
                        ~Incidente.aplicaciones_afectadas.any(
                            AplicacionAfectada.masivo_id.isnot(None)
                        )
                    )
                )

                total = base.count()
                abiertos = base.filter(Incidente.estado == "abierto").count()
                cerrados = base.filter(Incidente.estado == "cerrado").count()

                return {
                    "total": total,
                    "abiertos": abiertos,
                    "cerrados": cerrados,
                }, None

        except Exception as e:
            logger.error(f"Error al obtener resumen: {e}")
            return None, str(e)