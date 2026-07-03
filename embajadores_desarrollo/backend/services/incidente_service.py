"""
services/incidente_service.py

CRUD completo de incidentes con trazabilidad (historial).
"""

import logging
from typing import Optional, List, Tuple, Any, Dict

from sqlalchemy import and_, extract, or_, cast, String, text
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import (
    Incidente,
    Cav,
    Usuario,
    HistorialIncidente,
    Aplicacion,
    Servicio,
    TipoFalla,
    AplicacionAfectada,
)
from services.masivo_service import MasivoService
from services.servicio_service import asegurar_tabla_servicios

logger = logging.getLogger(__name__)


def _asegurar_columna_servicio_aplicaciones_afectadas(db) -> None:
    asegurar_tabla_servicios(db)

    db.execute(text("""
        ALTER TABLE "API_PROD".aplicaciones_afectados
        ADD COLUMN IF NOT EXISTS servicio_id INTEGER NULL
    """))

    db.execute(text("""
        CREATE INDEX IF NOT EXISTS ix_aplicaciones_afectados_servicio_id
        ON "API_PROD".aplicaciones_afectados(servicio_id)
    """))

    db.execute(text("""
        ALTER TABLE "API_PROD".aplicaciones_afectados
        DROP CONSTRAINT IF EXISTS uq_incidente_app_tipo_falla
    """))

    db.execute(text("""
        CREATE UNIQUE INDEX IF NOT EXISTS uq_incidente_app_servicio_tipo_falla
        ON "API_PROD".aplicaciones_afectados(
            incidente_id,
            aplicacion_id,
            (COALESCE(servicio_id, 0)),
            tipo_falla_id
        )
    """))

    db.execute(text("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'fk_aplicaciones_afectados_servicio'
            ) THEN
                ALTER TABLE "API_PROD".aplicaciones_afectados
                ADD CONSTRAINT fk_aplicaciones_afectados_servicio
                FOREIGN KEY (servicio_id)
                REFERENCES "API_PROD".servicios(id_servicio)
                ON UPDATE CASCADE
                ON DELETE RESTRICT;
            END IF;
        END $$;
    """))


# ── Helpers de serialización ──────────────────────────────────────────────────

def _obtener_masivos_ids(i: Incidente) -> List[int]:
    masivos_ids = []

    for aa in i.aplicaciones_afectadas or []:
        if aa.masivo_id and aa.masivo_id not in masivos_ids:
            masivos_ids.append(aa.masivo_id)

    return masivos_ids


def _obtener_tipo_registro(
    tiene_individuales: bool,
    tiene_masivas: bool,
) -> str:
    if tiene_individuales and tiene_masivas:
        return "mixto"

    if tiene_masivas:
        return "masivo"

    return "historial"


def _obtener_mensaje_registro(
    id_incidente: int,
    tipo_registro: str,
) -> str:
    if tipo_registro == "mixto":
        return (
            f"Incidente #{id_incidente} registrado correctamente. "
            "Este incidente quedó asociado tanto al historial como al resumen de incidentes masivos."
        )

    if tipo_registro == "masivo":
        return (
            f"Incidente #{id_incidente} registrado correctamente. "
            "Este incidente quedó asociado al resumen de incidentes masivos."
        )

    return (
        f"Incidente #{id_incidente} registrado correctamente en historial."
    )


def _incidente_a_dict(
    i: Incidente,
    solo_individuales: bool = False,
) -> Dict[str, Any]:
    cav = i.cav
    ciudad = cav.ciudad if cav else None
    usuario = i.usuario

    todas_las_aplicaciones = i.aplicaciones_afectadas or []

    aplicaciones_individuales = [
        aa for aa in todas_las_aplicaciones
        if aa.masivo_id is None
    ]

    aplicaciones_masivas = [
        aa for aa in todas_las_aplicaciones
        if aa.masivo_id is not None
    ]

    aplicaciones_para_respuesta = (
        aplicaciones_individuales
        if solo_individuales
        else todas_las_aplicaciones
    )

    tiene_individuales = len(aplicaciones_individuales) > 0
    tiene_masivas = len(aplicaciones_masivas) > 0
    tipo_registro = _obtener_tipo_registro(tiene_individuales, tiene_masivas)
    masivos_ids = _obtener_masivos_ids(i)

    return {
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
        "tiene_aplicaciones_individuales": tiene_individuales,
        "tiene_aplicaciones_masivas": tiene_masivas,
        "tipo_registro": tipo_registro,
        "usuarios_afectados": i.usuarios_afectados,
        "usuarios_operacion": i.usuarios_operacion,
        "estado": i.estado,
        "fecha_hora_reporte": i.fecha_hora_reporte.isoformat()
        if i.fecha_hora_reporte
        else None,
        "aplicaciones_afectadas": [
            {
                "id_aplicaciones_afectados": aa.id_aplicaciones_afectados,
                "aplicacion_id": aa.aplicacion_id,
                "nombre_aplicacion": aa.aplicacion.nombre_aplicacion
                if aa.aplicacion
                else None,
                "servicio_id": aa.servicio_id,
                "nombre_servicio": aa.servicio.nombre_servicio
                if aa.servicio
                else None,
                "tipo_falla_id": aa.tipo_falla_id,
                "nombre_tipo": aa.tipo_falla.nombre_tipo
                if aa.tipo_falla
                else None,
                "masivo_id": aa.masivo_id,
            }
            for aa in aplicaciones_para_respuesta
        ],
    }


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


def _consultar_incidente_completo(db, id_incidente: int):
    _asegurar_columna_servicio_aplicaciones_afectadas(db)

    return (
        db.query(Incidente)
        .options(
            joinedload(Incidente.cav).joinedload(Cav.ciudad),
            joinedload(Incidente.usuario),
            joinedload(Incidente.aplicaciones_afectadas)
            .joinedload(AplicacionAfectada.aplicacion),
            joinedload(Incidente.aplicaciones_afectadas)
            .joinedload(AplicacionAfectada.servicio),
            joinedload(Incidente.aplicaciones_afectadas)
            .joinedload(AplicacionAfectada.tipo_falla),
        )
        .filter(Incidente.id_incidente == id_incidente)
        .first()
    )


# ── Operaciones CRUD ──────────────────────────────────────────────────────────

class IncidenteService:

    # ── Listar ────────────────────────────────────────────────────────────────
    @staticmethod
    def listar_incidentes(
        estado: Optional[str] = None,
        cav_id: Optional[int] = None,
        ciudad_id: Optional[int] = None,
        aplicacion_id: Optional[int] = None,
        tipo_falla: Optional[str] = None,
        busqueda: Optional[str] = None,
        anio: Optional[int] = None,
        mes: Optional[int] = None,
        dia: Optional[int] = None,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                _asegurar_columna_servicio_aplicaciones_afectadas(db)

                query = (
                    db.query(Incidente)
                    .options(
                        joinedload(Incidente.cav).joinedload(Cav.ciudad),
                        joinedload(Incidente.usuario),
                        joinedload(Incidente.aplicaciones_afectadas)
                        .joinedload(AplicacionAfectada.aplicacion),
                        joinedload(Incidente.aplicaciones_afectadas)
                        .joinedload(AplicacionAfectada.servicio),
                        joinedload(Incidente.aplicaciones_afectadas)
                        .joinedload(AplicacionAfectada.tipo_falla),
                    )
                    .order_by(Incidente.fecha_hora_reporte.desc())
                )

                if estado:
                    query = query.filter(Incidente.estado == estado)

                if cav_id:
                    query = query.filter(Incidente.cav_id == cav_id)

                if ciudad_id:
                    query = query.join(Incidente.cav).filter(Cav.ciudad_id == ciudad_id)

                if aplicacion_id or tipo_falla:
                    condiciones_aplicacion = [
                        AplicacionAfectada.masivo_id.is_(None),
                    ]

                    if aplicacion_id:
                        condiciones_aplicacion.append(
                            AplicacionAfectada.aplicacion_id == aplicacion_id
                        )

                    if tipo_falla:
                        termino_tipo = tipo_falla.strip()
                        condiciones_aplicacion.append(
                            AplicacionAfectada.tipo_falla.has(
                                TipoFalla.nombre_tipo.ilike(f"%{termino_tipo}%")
                            )
                        )

                    query = query.filter(
                        Incidente.aplicaciones_afectadas.any(
                            and_(*condiciones_aplicacion)
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

                    query = query.filter(
                        or_(
                            cast(Incidente.id_incidente, String).ilike(termino),
                            Incidente.aplicaciones_afectadas.any(
                                and_(
                                    AplicacionAfectada.masivo_id.is_(None),
                                    or_(
                                        AplicacionAfectada.aplicacion.has(
                                            Aplicacion.nombre_aplicacion.ilike(termino)
                                        ),
                                        AplicacionAfectada.servicio.has(
                                            Servicio.nombre_servicio.ilike(termino)
                                        ),
                                        AplicacionAfectada.tipo_falla.has(
                                            TipoFalla.nombre_tipo.ilike(termino)
                                        ),
                                    ),
                                )
                            )
                        )
                    )

                incidentes = query.distinct().all()

                return [_incidente_a_dict(i) for i in incidentes], None

        except Exception as e:
            logger.error(f"Error al listar incidentes: {e}")
            return None, str(e)

    # ── Obtener por ID ────────────────────────────────────────────────────────
    @staticmethod
    def obtener_incidente(id_incidente: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                incidente = _consultar_incidente_completo(db, id_incidente)

                if not incidente:
                    return None, "Incidente no encontrado"

                return _incidente_a_dict(
                    incidente,
                    solo_individuales=True,
                ), None

        except Exception as e:
            logger.error(f"Error al obtener incidente {id_incidente}: {e}")
            return None, str(e)

    # ── Crear ─────────────────────────────────────────────────────────────────
    @staticmethod
    def crear_incidente(datos: Dict[str, Any]) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                _asegurar_columna_servicio_aplicaciones_afectadas(db)

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

                combinaciones = set()

                for item in aplicaciones_afectadas:
                    clave = (
                        item.get("aplicacion_id"),
                        item.get("servicio_id"),
                        item.get("tipo_falla_id"),
                    )

                    if clave in combinaciones:
                        return (
                            None,
                            "No se puede registrar la misma combinación de aplicación, servicio y tipo de falla más de una vez.",
                        )

                    combinaciones.add(clave)

                usuarios_afectados = datos.get("usuarios_afectados")
                usuarios_operacion = datos.get("usuarios_operacion")

                if usuarios_afectados is None:
                    return None, "El campo usuarios_afectados es obligatorio"

                if usuarios_operacion is None:
                    return None, "El campo usuarios_operacion es obligatorio"

                if usuarios_afectados <= 0:
                    return None, "Los usuarios afectados deben ser mayores que cero"

                if usuarios_operacion <= 0:
                    return None, "Los usuarios en operacion deben ser mayores que cero"

                if usuarios_afectados > usuarios_operacion:
                    return None, "Los usuarios afectados no pueden ser mayores que los usuarios en operacion"

                nuevo = Incidente(
                    cav_id=datos["cav_id"],
                    usuario_id=usuario_id,
                    usuarios_afectados=usuarios_afectados,
                    usuarios_operacion=usuarios_operacion,
                    estado="abierto",
                )

                db.add(nuevo)
                db.flush()

                id_incidente_creado = nuevo.id_incidente

                for item in aplicaciones_afectadas:
                    aplicacion_id = item.get("aplicacion_id")
                    servicio_id = item.get("servicio_id")
                    tipo_falla_id = item.get("tipo_falla_id")

                    aplicacion = db.query(Aplicacion).filter(
                        Aplicacion.id_aplicacion == aplicacion_id
                    ).first()

                    if not aplicacion:
                        return None, f"Aplicación {aplicacion_id} no encontrada"

                    if servicio_id:
                        servicio = db.query(Servicio).filter(
                            Servicio.id_servicio == servicio_id
                        ).first()

                        if not servicio:
                            return None, f"Servicio {servicio_id} no encontrado"

                        if servicio.aplicacion_id != aplicacion_id:
                            return None, "El servicio seleccionado no pertenece a la aplicación"

                    tipo_falla = db.query(TipoFalla).filter(
                        TipoFalla.id_tipo_falla == tipo_falla_id
                    ).first()

                    if not tipo_falla:
                        return None, f"Tipo de falla {tipo_falla_id} no encontrado"

                    db.add(
                        AplicacionAfectada(
                            incidente_id=id_incidente_creado,
                            aplicacion_id=aplicacion_id,
                            servicio_id=servicio_id,
                            tipo_falla_id=tipo_falla_id,
                        )
                    )

                _registrar_historial(
                    db,
                    id_incidente_creado,
                    estado_anterior=None,
                    estado_nuevo="abierto",
                )

                db.flush()

                MasivoService.evaluar_masivo_por_incidente(
                    db=db,
                    incidente_id=id_incidente_creado,
                )

                db.commit()

            with get_db_session() as db_respuesta:
                incidente_creado = _consultar_incidente_completo(
                    db_respuesta,
                    id_incidente_creado,
                )

                if not incidente_creado:
                    return None, "Incidente no encontrado después de crearlo"

                incidente_respuesta = _incidente_a_dict(
                    incidente_creado,
                    solo_individuales=False,
                )

                tipo_registro = incidente_respuesta.get(
                    "tipo_registro",
                    "historial",
                )

                incidente_respuesta["mensaje"] = _obtener_mensaje_registro(
                    incidente_respuesta["id_incidente"],
                    tipo_registro,
                )

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

                ciudad_id = datos.get("ciudad_id")
                cav_id = datos.get("cav_id")

                if "estado" in datos:
                    nuevo_estado = datos.get("estado")

                    if nuevo_estado not in ["abierto", "cerrado"]:
                        return None, "Estado invalido. Solo se permite 'abierto' o 'cerrado'"

                    estado_anterior = incidente.estado

                    if estado_anterior != nuevo_estado:
                        incidente.estado = nuevo_estado
                        _registrar_historial(
                            db,
                            id_incidente,
                            estado_anterior=estado_anterior,
                            estado_nuevo=nuevo_estado,
                        )

                if ciudad_id and not cav_id:
                    return None, "Debe seleccionar un CAV correspondiente a la ciudad seleccionada"

                if cav_id:
                    cav = db.query(Cav).filter(Cav.id_cav == cav_id).first()

                    if not cav:
                        return None, f"CAV {cav_id} no encontrado"

                    if ciudad_id and cav.ciudad_id != ciudad_id:
                        return None, "El CAV seleccionado no pertenece a la ciudad seleccionada"

                    incidente.cav_id = cav_id

                if "usuario_id" in datos:
                    usuario_id = datos.get("usuario_id")

                    if usuario_id:
                        usuario = db.query(Usuario).filter(
                            Usuario.id_usuario == usuario_id
                        ).first()

                        if not usuario:
                            return None, f"Usuario {usuario_id} no encontrado"

                        incidente.usuario_id = usuario_id
                    else:
                        incidente.usuario_id = None

                if "usuarios_afectados" in datos or "usuarios_operacion" in datos:
                    nuevos_afectados = datos.get(
                        "usuarios_afectados",
                        incidente.usuarios_afectados,
                    )
                    nueva_operacion = datos.get(
                        "usuarios_operacion",
                        incidente.usuarios_operacion,
                    )

                    if nuevos_afectados is None:
                        return None, "El campo usuarios_afectados es obligatorio"

                    if nueva_operacion is None:
                        return None, "El campo usuarios_operacion es obligatorio"

                    if nuevos_afectados <= 0:
                        return None, "Los usuarios afectados deben ser mayores que cero"

                    if nueva_operacion <= 0:
                        return None, "Los usuarios en operacion deben ser mayores que cero"

                    if nuevos_afectados > nueva_operacion:
                        return None, "Los usuarios afectados no pueden ser mayores que los usuarios en operacion"

                    incidente.usuarios_afectados = nuevos_afectados
                    incidente.usuarios_operacion = nueva_operacion

                if (
                    "aplicaciones_afectadas" in datos
                    and datos["aplicaciones_afectadas"] is not None
                ):
                    _asegurar_columna_servicio_aplicaciones_afectadas(db)

                    aplicaciones_afectadas = datos["aplicaciones_afectadas"]

                    if not aplicaciones_afectadas:
                        return None, "Debe registrar al menos una aplicación afectada"

                    combinaciones = set()

                    for item in aplicaciones_afectadas:
                        clave = (
                            item.get("aplicacion_id"),
                            item.get("servicio_id"),
                            item.get("tipo_falla_id"),
                        )

                        if clave in combinaciones:
                            return (
                                None,
                                "No se puede registrar la misma combinación de aplicación, servicio y tipo de falla más de una vez.",
                            )

                        combinaciones.add(clave)

                    db.query(AplicacionAfectada).filter(
                        AplicacionAfectada.incidente_id == id_incidente,
                        AplicacionAfectada.masivo_id.is_(None),
                    ).delete()

                    db.flush()

                    for item in aplicaciones_afectadas:
                        aplicacion_id = item.get("aplicacion_id")
                        servicio_id = item.get("servicio_id")
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

                        if servicio_id:
                            servicio = db.query(Servicio).filter(
                                Servicio.id_servicio == servicio_id
                            ).first()

                            if not servicio:
                                return None, f"Servicio {servicio_id} no encontrado"

                            if servicio.aplicacion_id != aplicacion_id:
                                return None, "El servicio seleccionado no pertenece a la aplicación"

                        tipo_falla = db.query(TipoFalla).filter(
                            TipoFalla.id_tipo_falla == tipo_falla_id
                        ).first()

                        if not tipo_falla:
                            return None, f"Tipo de falla {tipo_falla_id} no encontrado"

                        db.add(
                            AplicacionAfectada(
                                incidente_id=id_incidente,
                                aplicacion_id=aplicacion_id,
                                servicio_id=servicio_id,
                                tipo_falla_id=tipo_falla_id,
                            )
                        )

                    db.flush()

                    MasivoService.evaluar_masivo_por_incidente(
                        db=db,
                        incidente_id=id_incidente,
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
                base = db.query(Incidente).filter(
                    Incidente.aplicaciones_afectadas.any(
                        AplicacionAfectada.masivo_id.is_(None)
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

