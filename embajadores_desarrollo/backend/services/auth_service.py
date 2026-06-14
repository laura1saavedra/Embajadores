"""
services/auth_service.py

Servicio de autenticacion para Embajadores.
Adaptado del auth_service de Event Control, usando los modelos y campos
propios de este proyecto.
"""

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional, Tuple

from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import joinedload

from db import get_db_session
from models import Usuario
from utils.jwt_utils import JWTUtils
from utils.password_utils import (
    hash_password,
    validate_password_strength,
    verify_password,
)
from utils.security_utils import normalize_email


logger = logging.getLogger(__name__)

ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "300"))
REMEMBER_ME_ACCESS_HOURS = int(os.getenv("JWT_REMEMBER_ME_ACCESS_HOURS", "24"))
MAX_INTENTOS_FALLIDOS = int(os.getenv("AUTH_MAX_INTENTOS_FALLIDOS", "5"))
BLOQUEO_MINUTOS = int(os.getenv("AUTH_BLOQUEO_MINUTOS", "15"))


def _asegurar_timezone(fecha: datetime) -> datetime:
    if fecha.tzinfo is None:
        return fecha.replace(tzinfo=timezone.utc)

    return fecha


def _usuario_a_user_data(usuario: Usuario) -> Dict[str, Any]:
    rol_nombre = usuario.rol.nombre_rol if usuario.rol else None

    return {
        "user_id": str(usuario.id_usuario),
        "id_usuario": usuario.id_usuario,
        "email": usuario.correo,
        "correo": usuario.correo,
        "first_name": usuario.nombre,
        "last_name": usuario.apellido,
        "nombre": usuario.nombre,
        "apellido": usuario.apellido,
        "is_active": bool(usuario.activo),
        "is_verified": not bool(usuario.debe_cambiar_contrasena),
        "debe_cambiar_contrasena": bool(usuario.debe_cambiar_contrasena),
        "rol_id": usuario.rol_id,
        "rol_nombre": rol_nombre,
        "roles": [
            {
                "id": str(usuario.rol_id),
                "name": rol_nombre,
                "description": usuario.rol.descripcion if usuario.rol else None,
            }
        ] if usuario.rol else [],
        "last_login": (
            usuario.ultimo_login.isoformat()
            if usuario.ultimo_login else None
        ),
    }


class AuthService:

    @staticmethod
    def authenticate_user(
        email: str,
        password: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            correo = normalize_email(email)
            ahora = datetime.now(timezone.utc)

            with get_db_session() as session:
                usuario = (
                    session.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.correo == correo)
                    .first()
                )

                if not usuario:
                    logger.warning(
                        "Intento de login con correo no registrado: %s",
                        email,
                    )
                    return None, "Credenciales invalidas"

                if not usuario.activo:
                    logger.warning(
                        "Intento de login con usuario inactivo: %s",
                        correo,
                    )
                    return None, "Usuario inactivo. Contacta al administrador"

                if (
                    usuario.bloqueado_hasta and
                    _asegurar_timezone(usuario.bloqueado_hasta) > ahora
                ):
                    logger.warning(
                        "Intento de login con usuario bloqueado: %s",
                        correo,
                    )
                    return None, "Usuario bloqueado temporalmente"

                if not verify_password(password, usuario.contrasena_hash):
                    usuario.intentos_fallidos = (usuario.intentos_fallidos or 0) + 1

                    if usuario.intentos_fallidos >= MAX_INTENTOS_FALLIDOS:
                        usuario.bloqueado_hasta = ahora + timedelta(
                            minutes=BLOQUEO_MINUTOS
                        )

                    session.commit()
                    logger.warning(
                        "Intento de login con contrasena incorrecta: %s",
                        correo,
                    )
                    return None, "Credenciales invalidas"

                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = None
                usuario.ultimo_login = ahora
                session.commit()
                session.refresh(usuario)

                user_data = _usuario_a_user_data(usuario)
                logger.info("Usuario autenticado exitosamente: %s", correo)
                return user_data, None

        except SQLAlchemyError as error:
            logger.error("Error de base de datos en autenticacion: %s", error)
            return None, "Error interno del servidor"
        except Exception as error:
            logger.error("Error inesperado en autenticacion: %s", error)
            return None, "Error interno del servidor"

    @staticmethod
    def create_user_session(
        user_data: Dict,
        remember_me: bool = False,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            if remember_me:
                access_token_expire = timedelta(hours=REMEMBER_ME_ACCESS_HOURS)
            else:
                access_token_expire = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

            access_token = JWTUtils.create_access_token(
                data=user_data,
                expires_delta=access_token_expire,
            )
            refresh_token, _refresh_token_hash = JWTUtils.create_refresh_token(
                user_data["user_id"]
            )

            session_data = {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "expires_in": int(access_token_expire.total_seconds()),
                "user": user_data,
                "usuario": {
                    "id_usuario": user_data["id_usuario"],
                    "nombre": user_data["nombre"],
                    "apellido": user_data["apellido"],
                    "correo": user_data["correo"],
                    "rol_id": user_data["rol_id"],
                    "rol_nombre": user_data["rol_nombre"],
                    "debe_cambiar_contrasena": user_data[
                        "debe_cambiar_contrasena"
                    ],
                },
                "session_id": "temp_session",
            }

            logger.info("Sesion creada para usuario: %s", user_data["email"])
            return session_data, None

        except Exception as error:
            logger.error("Error al crear sesion: %s", error)
            return None, "Error al crear sesion"

    @staticmethod
    def login(
        correo: str,
        contrasena: str,
        remember_me: bool = False,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        user_data, error = AuthService.authenticate_user(correo, contrasena)
        if error:
            return None, error

        return AuthService.create_user_session(user_data, remember_me)

    @staticmethod
    def refresh_access_token(
        refresh_token: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            token_payload = JWTUtils.verify_token(refresh_token)

            if token_payload.get("type") != "refresh":
                return None, "Tipo de token invalido"

            user_id = token_payload.get("user_id")
            if not user_id:
                return None, "Token invalido"

            with get_db_session() as session:
                usuario = (
                    session.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == int(user_id))
                    .first()
                )

                if not usuario or not usuario.activo:
                    logger.warning(
                        "Usuario no encontrado o inactivo en refresh: %s",
                        user_id,
                    )
                    return None, "Usuario no valido"

                user_data = _usuario_a_user_data(usuario)
                access_token = JWTUtils.create_access_token(data=user_data)

                return {
                    "access_token": access_token,
                    "token_type": "bearer",
                    "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60,
                    "user": user_data,
                }, None

        except Exception as error:
            logger.error("Error al renovar token: %s", error)
            return None, "Error al renovar token"

    @staticmethod
    def logout_user(refresh_token: str) -> Tuple[bool, Optional[str]]:
        try:
            logger.info("Usuario deslogueado exitosamente")
            return True, None
        except Exception as error:
            logger.error("Error al cerrar sesion: %s", error)
            return False, "Error al cerrar sesion"

    @staticmethod
    def get_user_by_id(user_id: str) -> Optional[Dict]:
        try:
            with get_db_session() as session:
                usuario = (
                    session.query(Usuario)
                    .options(joinedload(Usuario.rol))
                    .filter(Usuario.id_usuario == int(user_id))
                    .first()
                )

                if not usuario:
                    return None

                return _usuario_a_user_data(usuario)

        except Exception as error:
            logger.error("Error al obtener usuario %s: %s", user_id, error)
            return None

    @staticmethod
    def obtener_usuario_por_token(
        token: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            payload = JWTUtils.verify_token(token)

            if payload.get("type") != "access":
                return None, "Tipo de token invalido"

            user_id = payload.get("user_id") or payload.get("id_usuario")
            if not user_id:
                return None, "Token invalido"

            usuario = AuthService.get_user_by_id(str(user_id))
            if not usuario:
                return None, "Usuario no encontrado"

            if not usuario["is_active"]:
                return None, "Usuario inactivo"

            return usuario, None

        except Exception as error:
            logger.error("Error al obtener usuario autenticado: %s", error)
            return None, "Token invalido"

    @staticmethod
    def change_password(
        user_id: str,
        current_password: str,
        new_password: str,
    ) -> Tuple[bool, Optional[str]]:
        try:
            password_validation = validate_password_strength(new_password)
            if not password_validation["is_valid"]:
                return False, (
                    "Contrasena no valida: "
                    f"{', '.join(password_validation['errors'])}"
                )

            with get_db_session() as session:
                usuario = (
                    session.query(Usuario)
                    .filter(Usuario.id_usuario == int(user_id))
                    .first()
                )

                if not usuario:
                    return False, "Usuario no encontrado"

                if not verify_password(current_password, usuario.contrasena_hash):
                    return False, "Contrasena actual incorrecta"

                usuario.contrasena_hash = hash_password(new_password)
                usuario.debe_cambiar_contrasena = False
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = None

                session.commit()

                logger.info("Contrasena cambiada para usuario: %s", usuario.correo)
                return True, None

        except Exception as error:
            logger.error("Error al cambiar contrasena: %s", error)
            return False, "Error al cambiar contrasena"

    @staticmethod
    def change_password_first_login(
        user_id: str,
        temporary_password: str,
        new_password: str,
    ) -> Tuple[bool, Optional[str]]:
        try:
            password_validation = validate_password_strength(new_password)
            if not password_validation["is_valid"]:
                return False, (
                    "Contrasena no valida: "
                    f"{', '.join(password_validation['errors'])}"
                )

            with get_db_session() as session:
                usuario = (
                    session.query(Usuario)
                    .filter(Usuario.id_usuario == int(user_id))
                    .first()
                )

                if not usuario:
                    return False, "Usuario no encontrado"

                if not usuario.debe_cambiar_contrasena:
                    return False, "El usuario ya cambio su contrasena temporal"

                if not verify_password(temporary_password, usuario.contrasena_hash):
                    return False, "Contrasena temporal incorrecta"

                usuario.contrasena_hash = hash_password(new_password)
                usuario.debe_cambiar_contrasena = False
                usuario.intentos_fallidos = 0
                usuario.bloqueado_hasta = None

                session.commit()

                logger.info(
                    "Contrasena de primer login cambiada para usuario: %s",
                    usuario.correo,
                )
                return True, None

        except Exception as error:
            logger.error("Error al cambiar contrasena de primer login: %s", error)
            return False, "Error al cambiar contrasena"

    @staticmethod
    def cambiar_contrasena(
        id_usuario: int,
        contrasena_actual: str,
        nueva_contrasena: str,
        confirmar_contrasena: str,
    ) -> Tuple[Optional[Dict], Optional[str]]:
        if nueva_contrasena != confirmar_contrasena:
            return None, "La confirmacion de contrasena no coincide"

        success, error = AuthService.change_password(
            str(id_usuario),
            contrasena_actual,
            nueva_contrasena,
        )

        if not success:
            return None, error

        usuario = AuthService.get_user_by_id(str(id_usuario))
        if not usuario:
            return None, "Usuario no encontrado"

        session_data, error = AuthService.create_user_session(usuario)
        if error:
            return None, error

        session_data["mensaje"] = "Contrasena actualizada correctamente"
        return session_data, None
