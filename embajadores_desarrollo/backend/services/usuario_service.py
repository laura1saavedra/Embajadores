"""
services/usuario_service.py

Logica de negocio para gestionar usuarios desde Configuracion Avanzada.
Incluye validaciones de correo corporativo, roles, duplicados y generacion
de contrasena temporal segura.
"""

import logging
import unicodedata
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy import func, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Incidente, Permiso, Rol, RolPermiso, Usuario
from utils.password_utils import generate_temp_password, hash_password
from utils.security_utils import (
    validate_corporate_email,
    validate_person_name,
)


logger = logging.getLogger(__name__)

PERMISOS_BASE = [
    "Registrar incidente",
    "Ver historial de incidentes",
    "Cerrar incidente",
    "Ver incidentes masivos",
    "Cerrar incidente masivo",
    "Gestionar contactos WA",
    "Gestionar configuracion avanzada",
    "Editar incidente",
]


def _normalizar_nombre_permiso(nombre_permiso: Optional[str]) -> str:
    texto = unicodedata.normalize("NFD", nombre_permiso or "")
    texto_sin_tildes = "".join(
        caracter
        for caracter in texto
        if unicodedata.category(caracter) != "Mn"
    )
    return " ".join(texto_sin_tildes.lower().split())


def _deduplicar_permisos(permisos: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    permisos_unicos: List[Dict[str, Any]] = []
    claves_vistas = set()

    for permiso in permisos:
        clave = _normalizar_nombre_permiso(permiso.get("nombre_permiso"))

        if clave in claves_vistas:
            continue

        claves_vistas.add(clave)
        permisos_unicos.append(permiso)

    return permisos_unicos


def _asegurar_permisos_base(db) -> None:
    db.execute(
        text(
            """
            SELECT setval(
                pg_get_serial_sequence('"API_PROD".permisos', 'idpermisos'),
                GREATEST(
                    COALESCE((SELECT MAX(idpermisos) FROM "API_PROD".permisos), 1),
                    1
                ),
                true
            )
            """
        )
    )

    permisos_existentes = {
        _normalizar_nombre_permiso(permiso.nombre_permiso)
        for permiso in db.query(Permiso).all()
    }

    for nombre_permiso in PERMISOS_BASE:
        if _normalizar_nombre_permiso(nombre_permiso) not in permisos_existentes:
            db.add(Permiso(nombre_permiso=nombre_permiso))


def _rol_a_dict(rol: Rol) -> Dict[str, Any]:
    permisos = _deduplicar_permisos([
        {
            "idpermisos": rol_permiso.permiso.idpermisos,
            "nombre_permiso": rol_permiso.permiso.nombre_permiso,
        }
        for rol_permiso in (rol.permisos or [])
        if rol_permiso.permiso
    ])

    return {
        "idrol": rol.idrol,
        "nombre_rol": rol.nombre_rol,
        "descripcion": rol.descripcion,
        "permisos_ids": [permiso["idpermisos"] for permiso in permisos],
        "permisos": permisos,
    }


def _permiso_a_dict(permiso: Permiso) -> Dict[str, Any]:
    return {
        "idpermisos": permiso.idpermisos,
        "nombre_permiso": permiso.nombre_permiso,
    }


def _usuario_a_dict(usuario: Usuario) -> Dict[str, Any]:
    return {
        "id_usuario": usuario.id_usuario,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "correo": usuario.correo,
        "rol_id": usuario.rol_id,
        "rol_nombre": usuario.rol.nombre_rol if usuario.rol else None,
        "activo": bool(usuario.activo),
        "debe_cambiar_contrasena": bool(usuario.debe_cambiar_contrasena),
        "fecha_creacion": usuario.fecha_creacion,
        "fecha_actualizacion": usuario.fecha_actualizacion,
        "ultimo_login": usuario.ultimo_login,
        "intentos_fallidos": usuario.intentos_fallidos or 0,
        "bloqueado_hasta": usuario.bloqueado_hasta,
    }


def _validar_nombre_apellido(
    nombre: Optional[str],
    apellido: Optional[str],
) -> Tuple[Optional[Dict[str, str]], Optional[str]]:
    nombre_validado = validate_person_name(nombre or "", "nombre")
    if not nombre_validado["is_valid"]:
        return None, nombre_validado["errors"][0]

    apellido_validado = validate_person_name(apellido or "", "apellido")
    if not apellido_validado["is_valid"]:
        return None, apellido_validado["errors"][0]

    return {
        "nombre": nombre_validado["value"],
        "apellido": apellido_validado["value"],
    }, None


def _validar_datos_rol(
    nombre_rol: Optional[str],
    descripcion: Optional[str],
    requiere_nombre: bool = True,
) -> Tuple[Optional[Dict[str, str]], Optional[str]]:
    datos: Dict[str, str] = {}

    if nombre_rol is not None:
        nombre_limpio = " ".join(nombre_rol.strip().split())
        if not nombre_limpio:
            return None, "El nombre del rol es obligatorio"
        if len(nombre_limpio) > 100:
            return None, "El nombre del rol no puede superar 100 caracteres"
        datos["nombre_rol"] = nombre_limpio
    elif requiere_nombre:
        return None, "El nombre del rol es obligatorio"

    if descripcion is not None:
        descripcion_limpia = " ".join(descripcion.strip().split())
        if len(descripcion_limpia) > 255:
            return None, "La descripcion del rol no puede superar 255 caracteres"
        datos["descripcion"] = descripcion_limpia
    elif requiere_nombre:
        datos["descripcion"] = ""

    return datos, None


def _normalizar_permisos_ids(
    permisos_ids: Optional[List[int]],
) -> Tuple[Optional[List[int]], Optional[str]]:
    if permisos_ids is None:
        return None, None

    permisos_limpios: List[int] = []

    for permiso_id in permisos_ids:
        try:
            permiso_id_normalizado = int(permiso_id)
        except (TypeError, ValueError):
            return None, "Los permisos seleccionados no son validos"

        if permiso_id_normalizado <= 0:
            return None, "Los permisos seleccionados no son validos"

        if permiso_id_normalizado not in permisos_limpios:
            permisos_limpios.append(permiso_id_normalizado)

    return permisos_limpios, None


def _sincronizar_permisos_rol(
    db,
    rol_id: int,
    permisos_ids: List[int],
) -> Optional[str]:
    permisos_existentes = (
        db.query(Permiso.idpermisos)
        .filter(Permiso.idpermisos.in_(permisos_ids))
        .all()
    )
    permisos_existentes_ids = {permiso.idpermisos for permiso in permisos_existentes}
    permisos_faltantes = set(permisos_ids) - permisos_existentes_ids

    if permisos_faltantes:
        return "Uno o mas permisos seleccionados no existen"

    db.query(RolPermiso).filter(RolPermiso.rol_id == rol_id).delete()

    for permiso_id in permisos_ids:
        db.add(RolPermiso(rol_id=rol_id, permisos_id=permiso_id))

    return None


def _obtener_rol_con_permisos(db, rol_id: int) -> Optional[Rol]:
    return (
        db.query(Rol)
        .options(joinedload(Rol.permisos).joinedload(RolPermiso.permiso))
        .filter(Rol.idrol == rol_id)
        .populate_existing()
        .first()
    )


class UsuarioService:

    @staticmethod
    def listar_permisos() -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                _asegurar_permisos_base(db)
                db.commit()

                permisos = (
                    db.query(Permiso)
                    .order_by(Permiso.idpermisos.asc())
                    .all()
                )

                permisos_respuesta = [
                    _permiso_a_dict(permiso)
                    for permiso in permisos
                ]

                return _deduplicar_permisos(permisos_respuesta), None

        except Exception as e:
            logger.error(f"Error al listar permisos: {e}")
            return None, str(e)

    @staticmethod
    def listar_roles() -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                roles = (
                    db.query(Rol)
                    .options(joinedload(Rol.permisos).joinedload(RolPermiso.permiso))
                    .order_by(Rol.nombre_rol.asc())
                    .all()
                )

                return [_rol_a_dict(rol) for rol in roles], None

        except Exception as e:
            logger.error(f"Error al listar roles: {e}")
            return None, str(e)

    @staticmethod
    def crear_rol(
        nombre_rol: str,
        descripcion: Optional[str] = "",
        permisos_ids: Optional[List[int]] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            datos_rol, error = _validar_datos_rol(nombre_rol, descripcion)
            if error:
                return None, error

            permisos_normalizados, error = _normalizar_permisos_ids(permisos_ids or [])
            if error:
                return None, error

            with get_db_session() as db:
                existe_rol = (
                    db.query(Rol)
                    .filter(func.lower(Rol.nombre_rol) == datos_rol["nombre_rol"].lower())
                    .first()
                )

                if existe_rol:
                    return None, "Ya existe un rol con ese nombre"

                nuevo_rol = Rol(
                    nombre_rol=datos_rol["nombre_rol"],
                    descripcion=datos_rol["descripcion"],
                )

                db.add(nuevo_rol)
                db.flush()

                error_permisos = _sincronizar_permisos_rol(
                    db,
                    nuevo_rol.idrol,
                    permisos_normalizados or [],
                )
                if error_permisos:
                    db.rollback()
                    return None, error_permisos

                db.commit()
                db.refresh(nuevo_rol)

                rol_creado = _obtener_rol_con_permisos(db, nuevo_rol.idrol)

                return _rol_a_dict(rol_creado), None

        except IntegrityError as e:
            logger.error(f"Error de integridad al crear rol: {e}")
            return None, "Ya existe un rol con ese nombre"
        except Exception as e:
            logger.error(f"Error al crear rol: {e}")
            return None, str(e)

    @staticmethod
    def actualizar_rol(
        id_rol: int,
        nombre_rol: Optional[str] = None,
        descripcion: Optional[str] = None,
        permisos_ids: Optional[List[int]] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            datos_rol, error = _validar_datos_rol(
                nombre_rol,
                descripcion,
                requiere_nombre=False,
            )
            if error:
                return None, error

            permisos_normalizados, error = _normalizar_permisos_ids(permisos_ids)
            if error:
                return None, error

            if not datos_rol and permisos_ids is None:
                return None, "Debe enviar al menos un campo para actualizar"

            with get_db_session() as db:
                rol = (
                    db.query(Rol)
                    .options(joinedload(Rol.permisos).joinedload(RolPermiso.permiso))
                    .filter(Rol.idrol == id_rol)
                    .first()
                )

                if not rol:
                    return None, "Rol no encontrado"

                if "nombre_rol" in datos_rol:
                    existe_rol = (
                        db.query(Rol)
                        .filter(
                            Rol.idrol != id_rol,
                            func.lower(Rol.nombre_rol) == datos_rol["nombre_rol"].lower(),
                        )
                        .first()
                    )

                    if existe_rol:
                        return None, "Ya existe un rol con ese nombre"

                    rol.nombre_rol = datos_rol["nombre_rol"]

                if "descripcion" in datos_rol:
                    rol.descripcion = datos_rol["descripcion"]

                if permisos_normalizados is not None:
                    error_permisos = _sincronizar_permisos_rol(
                        db,
                        id_rol,
                        permisos_normalizados,
                    )
                    if error_permisos:
                        db.rollback()
                        return None, error_permisos

                db.commit()

                db.expire_all()
                rol_actualizado = _obtener_rol_con_permisos(db, id_rol)

                return _rol_a_dict(rol_actualizado), None

        except IntegrityError as e:
            logger.error(f"Error de integridad al actualizar rol {id_rol}: {e}")
            return None, "Ya existe un rol con ese nombre"
        except Exception as e:
            logger.error(f"Error al actualizar rol {id_rol}: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_rol(id_rol: int) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                rol = (
                    db.query(Rol)
                    .filter(Rol.idrol == id_rol)
                    .first()
                )

                if not rol:
                    return None, "Rol no encontrado"

                usuarios_asociados = (
                    db.query(Usuario)
                    .filter(Usuario.rol_id == id_rol)
                    .first()
                    is not None
                )

                if usuarios_asociados:
                    return None, (
                        "No se puede eliminar el rol porque tiene usuarios asociados. "
                        "Cambia el rol de esos usuarios antes de eliminarlo."
                    )

                db.query(RolPermiso).filter(RolPermiso.rol_id == id_rol).delete()
                db.delete(rol)
                db.commit()

                return {
                    "eliminado": True,
                    "idrol": id_rol,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar rol {id_rol}: {e}")
            return None, str(e)

    @staticmethod
    def listar_usuarios(
        solo_activos: bool = False,
    ) -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                query = db.query(Usuario).options(joinedload(Usuario.rol))

                if solo_activos:
                    query = query.filter(Usuario.activo.is_(True))

                usuarios = (
                    query
                    .order_by(Usuario.nombre.asc(), Usuario.apellido.asc())
                    .all()
                )

                return [_usuario_a_dict(usuario) for usuario in usuarios], None

        except Exception as e:
            logger.error(f"Error al listar usuarios: {e}")
            return None, str(e)

    @staticmethod
    def obtener_usuario(
        id_usuario: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                usuario = (
                    db.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == id_usuario)
                    .first()
                )

                if not usuario:
                    return None, "Usuario no encontrado"

                return _usuario_a_dict(usuario), None

        except Exception as e:
            logger.error(f"Error al obtener usuario {id_usuario}: {e}")
            return None, str(e)

    @staticmethod
    def crear_usuario(
        nombre: str,
        apellido: str,
        correo: str,
        rol_id: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            datos_nombre, error = _validar_nombre_apellido(nombre, apellido)
            if error:
                return None, error

            correo_validado = validate_corporate_email(correo)
            if not correo_validado["is_valid"]:
                return None, correo_validado["errors"][0]

            correo_normalizado = correo_validado["email"]
            contrasena_temporal = generate_temp_password()
            contrasena_hash = hash_password(contrasena_temporal)

            with get_db_session() as db:
                rol = (
                    db.query(Rol)
                    .filter(Rol.idrol == rol_id)
                    .first()
                )

                if not rol:
                    return None, "Rol no encontrado"

                existe_correo = (
                    db.query(Usuario)
                    .filter(Usuario.correo == correo_normalizado)
                    .first()
                )

                if existe_correo:
                    return None, "Ya existe un usuario con ese correo"

                nuevo_usuario = Usuario(
                    nombre=datos_nombre["nombre"],
                    apellido=datos_nombre["apellido"],
                    correo=correo_normalizado,
                    contrasena_hash=contrasena_hash,
                    rol_id=rol_id,
                    activo=True,
                    debe_cambiar_contrasena=True,
                    intentos_fallidos=0,
                )

                db.add(nuevo_usuario)
                db.commit()
                db.refresh(nuevo_usuario)

                usuario_creado = (
                    db.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == nuevo_usuario.id_usuario)
                    .first()
                )

                respuesta = _usuario_a_dict(usuario_creado)
                respuesta["contrasena_temporal"] = contrasena_temporal

                return respuesta, None

        except IntegrityError as e:
            logger.error(f"Error de integridad al crear usuario: {e}")
            return None, "Ya existe un usuario con ese correo"
        except Exception as e:
            logger.error(f"Error al crear usuario: {e}")
            return None, str(e)

    @staticmethod
    def actualizar_usuario(
        id_usuario: int,
        nombre: Optional[str] = None,
        apellido: Optional[str] = None,
        correo: Optional[str] = None,
        rol_id: Optional[int] = None,
        activo: Optional[bool] = None,
        debe_cambiar_contrasena: Optional[bool] = None,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                usuario = (
                    db.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == id_usuario)
                    .first()
                )

                if not usuario:
                    return None, "Usuario no encontrado"

                if nombre is not None:
                    nombre_validado = validate_person_name(nombre, "nombre")
                    if not nombre_validado["is_valid"]:
                        return None, nombre_validado["errors"][0]
                    usuario.nombre = nombre_validado["value"]

                if apellido is not None:
                    apellido_validado = validate_person_name(apellido, "apellido")
                    if not apellido_validado["is_valid"]:
                        return None, apellido_validado["errors"][0]
                    usuario.apellido = apellido_validado["value"]

                if correo is not None:
                    correo_validado = validate_corporate_email(correo)
                    if not correo_validado["is_valid"]:
                        return None, correo_validado["errors"][0]

                    correo_normalizado = correo_validado["email"]
                    existe_correo = (
                        db.query(Usuario)
                        .filter(
                            Usuario.id_usuario != id_usuario,
                            Usuario.correo == correo_normalizado,
                        )
                        .first()
                    )

                    if existe_correo:
                        return None, "Ya existe un usuario con ese correo"

                    usuario.correo = correo_normalizado

                if rol_id is not None:
                    rol = (
                        db.query(Rol)
                        .filter(Rol.idrol == rol_id)
                        .first()
                    )

                    if not rol:
                        return None, "Rol no encontrado"

                    usuario.rol_id = rol_id

                if activo is not None:
                    usuario.activo = activo

                if debe_cambiar_contrasena is not None:
                    usuario.debe_cambiar_contrasena = debe_cambiar_contrasena

                db.commit()
                db.refresh(usuario)

                usuario_actualizado = (
                    db.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == id_usuario)
                    .first()
                )

                return _usuario_a_dict(usuario_actualizado), None

        except IntegrityError as e:
            logger.error(f"Error de integridad al actualizar usuario {id_usuario}: {e}")
            return None, "Ya existe un usuario con ese correo"
        except Exception as e:
            logger.error(f"Error al actualizar usuario {id_usuario}: {e}")
            return None, str(e)

    @staticmethod
    def cambiar_estado_usuario(
        id_usuario: int,
        activo: bool,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        return UsuarioService.actualizar_usuario(
            id_usuario=id_usuario,
            activo=activo,
        )

    @staticmethod
    def regenerar_contrasena_temporal(
        id_usuario: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            contrasena_temporal = generate_temp_password()
            nueva_hash = hash_password(contrasena_temporal)

            with get_db_session() as db:
                usuario = (
                    db.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == id_usuario)
                    .first()
                )

                if not usuario:
                    return None, "Usuario no encontrado"

                usuario.contrasena_hash = nueva_hash
                usuario.debe_cambiar_contrasena = True
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = None

                db.commit()
                db.refresh(usuario)

                respuesta = _usuario_a_dict(usuario)
                respuesta["contrasena_temporal"] = contrasena_temporal

                return respuesta, None

        except Exception as e:
            logger.error(
                f"Error al regenerar contrasena temporal del usuario {id_usuario}: {e}"
            )
            return None, str(e)

    @staticmethod
    def eliminar_usuario(
        id_usuario: int,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                usuario = (
                    db.query(Usuario)
                    .filter(Usuario.id_usuario == id_usuario)
                    .first()
                )

                if not usuario:
                    return None, "Usuario no encontrado"

                tiene_incidentes = (
                    db.query(Incidente)
                    .filter(Incidente.usuario_id == id_usuario)
                    .first()
                    is not None
                )

                if tiene_incidentes:
                    return None, (
                        "No se puede eliminar el usuario porque tiene "
                        "incidentes asociados. Puedes desactivarlo."
                    )

                db.delete(usuario)
                db.commit()

                return {
                    "eliminado": True,
                    "id_usuario": id_usuario,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar usuario {id_usuario}: {e}")
            return None, str(e)
