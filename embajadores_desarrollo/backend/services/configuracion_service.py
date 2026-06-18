"""
services/configuracion_service.py

Configuraciones generales de la plataforma.
"""

import logging
from typing import Dict, Optional, Tuple

from sqlalchemy import text

from db import get_db_session


logger = logging.getLogger(__name__)

CLAVE_DIAS_ACTIVOS_MASIVOS = "dias_activos_masivos_cerrados"
DIAS_ACTIVOS_MASIVOS_DEFAULT = 30


class ConfiguracionService:
    @staticmethod
    def _asegurar_tabla(db) -> None:
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS "API_PROD".configuracion_sistema (
                clave VARCHAR(100) PRIMARY KEY,
                valor VARCHAR(255) NOT NULL,
                fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            )
        """))

    @staticmethod
    def obtener_dias_activos_masivos() -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                ConfiguracionService._asegurar_tabla(db)

                fila = db.execute(
                    text("""
                        SELECT valor, fecha_actualizacion
                        FROM "API_PROD".configuracion_sistema
                        WHERE clave = :clave
                    """),
                    {"clave": CLAVE_DIAS_ACTIVOS_MASIVOS},
                ).first()

                if not fila:
                    return {
                        "dias_activos": DIAS_ACTIVOS_MASIVOS_DEFAULT,
                        "fecha_actualizacion": None,
                    }, None

                try:
                    dias_activos = max(1, int(fila[0]))
                except (TypeError, ValueError):
                    dias_activos = DIAS_ACTIVOS_MASIVOS_DEFAULT

                return {
                    "dias_activos": dias_activos,
                    "fecha_actualizacion": (
                        fila[1].isoformat() if fila[1] else None
                    ),
                }, None

        except Exception as e:
            logger.error(f"Error al obtener dias activos de masivos: {e}")
            return None, str(e)

    @staticmethod
    def actualizar_dias_activos_masivos(
        dias_activos: int
    ) -> Tuple[Optional[Dict], Optional[str]]:
        try:
            dias_normalizados = min(365, max(1, int(dias_activos)))

            with get_db_session() as db:
                ConfiguracionService._asegurar_tabla(db)

                db.execute(
                    text("""
                        INSERT INTO "API_PROD".configuracion_sistema
                            (clave, valor, fecha_actualizacion)
                        VALUES (:clave, :valor, NOW())
                        ON CONFLICT (clave)
                        DO UPDATE SET
                            valor = EXCLUDED.valor,
                            fecha_actualizacion = NOW()
                    """),
                    {
                        "clave": CLAVE_DIAS_ACTIVOS_MASIVOS,
                        "valor": str(dias_normalizados),
                    },
                )

                db.commit()

                fila = db.execute(
                    text("""
                        SELECT fecha_actualizacion
                        FROM "API_PROD".configuracion_sistema
                        WHERE clave = :clave
                    """),
                    {"clave": CLAVE_DIAS_ACTIVOS_MASIVOS},
                ).first()

                return {
                    "dias_activos": dias_normalizados,
                    "fecha_actualizacion": (
                        fila[0].isoformat() if fila and fila[0] else None
                    ),
                }, None

        except Exception as e:
            logger.error(f"Error al actualizar dias activos de masivos: {e}")
            return None, str(e)

    @staticmethod
    def eliminar_dias_activos_masivos() -> Tuple[Optional[Dict], Optional[str]]:
        try:
            with get_db_session() as db:
                ConfiguracionService._asegurar_tabla(db)

                db.execute(
                    text("""
                        DELETE FROM "API_PROD".configuracion_sistema
                        WHERE clave = :clave
                    """),
                    {"clave": CLAVE_DIAS_ACTIVOS_MASIVOS},
                )

                db.commit()

                return {
                    "eliminado": True,
                    "dias_activos": DIAS_ACTIVOS_MASIVOS_DEFAULT,
                    "fecha_actualizacion": None,
                }, None

        except Exception as e:
            logger.error(f"Error al eliminar dias activos de masivos: {e}")
            return None, str(e)
