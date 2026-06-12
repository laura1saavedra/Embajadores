"""
services/usuario_service.py

Logica de negocio para gestionar usuarios desde Configuracion Avanzada.
Incluye validaciones de correo corporativo, roles, duplicados y generacion
de contrasena temporal segura.
"""

import logging
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Incidente, Rol, Usuario
from utils.password_utils import generate_temp_password, hash_password
from utils.security_utils import (
    validate_corporate_email,
    validate_person_name,
)


logger = logging.getLogger(__name__)


def _rol_a_dict(rol: Rol) -> Dict[str, Any]:
    return {
        "idrol": rol.idrol,
        "nombre_rol": rol.nombre_rol,
        "descripcion": rol.descripcion,
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


class UsuarioService:

    @staticmethod
    def listar_roles() -> Tuple[Optional[List[Dict]], Optional[str]]:
        try:
            with get_db_session() as db:
                roles = (
                    db.query(Rol)
                    .order_by(Rol.nombre_rol.asc())
                    .all()
                )

                return [_rol_a_dict(rol) for rol in roles], None

        except Exception as e:
            logger.error(f"Error al listar roles: {e}")
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
