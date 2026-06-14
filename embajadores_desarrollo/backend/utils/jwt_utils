"""
Utilidades para el manejo de tokens JWT.

Adaptado del patron usado en Event Control, con configuracion por variables
de entorno para la plataforma Embajadores.
"""

import hashlib
import logging
import os
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import jwt


logger = logging.getLogger(__name__)

JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "embajadores-dev-secret")
JWT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "300"))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "7"))


class JWTUtils:

    @staticmethod
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        try:
            to_encode = data.copy()
            ahora = datetime.now(timezone.utc)

            if expires_delta:
                expire = ahora + expires_delta
            else:
                expire = ahora + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

            to_encode.update({
                "exp": expire,
                "iat": ahora,
                "type": "access",
            })

            token = jwt.encode(to_encode, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            logger.info(
                "Token de acceso creado para usuario: %s",
                data.get("user_id", "unknown"),
            )
            return token

        except Exception as error:
            logger.error("Error al crear token de acceso: %s", error)
            raise

    @staticmethod
    def create_refresh_token(user_id: str) -> tuple[str, str]:
        try:
            jti = secrets.token_urlsafe(32)
            ahora = datetime.now(timezone.utc)
            expire = ahora + timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)

            data = {
                "user_id": user_id,
                "jti": jti,
                "type": "refresh",
                "exp": expire,
                "iat": ahora,
            }

            refresh_token = jwt.encode(data, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            token_hash = hashlib.sha256(refresh_token.encode("utf-8")).hexdigest()

            logger.info("Token de refresh creado para usuario: %s", user_id)
            return refresh_token, token_hash

        except Exception as error:
            logger.error("Error al crear token de refresh: %s", error)
            raise

    @staticmethod
    def verify_token(token: str) -> Dict[str, Any]:
        try:
            return jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
        except jwt.ExpiredSignatureError:
            logger.warning("Token expirado")
            raise
        except jwt.InvalidTokenError as error:
            logger.warning("Token invalido: %s", error)
            raise
        except Exception as error:
            logger.error("Error al verificar token: %s", error)
            raise

    @staticmethod
    def is_token_expired(token: str) -> bool:
        try:
            JWTUtils.verify_token(token)
            return False
        except jwt.ExpiredSignatureError:
            return True
        except jwt.InvalidTokenError:
            return True

    @staticmethod
    def extract_user_id_from_token(token: str) -> Optional[str]:
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload.get("user_id")
        except Exception:
            return None

    @staticmethod
    def get_token_expiration(token: str) -> Optional[datetime]:
        try:
            payload = jwt.decode(token, options={"verify_signature": False})
            exp_timestamp = payload.get("exp")
            if exp_timestamp:
                return datetime.fromtimestamp(exp_timestamp, timezone.utc)
            return None
        except Exception:
            return None
