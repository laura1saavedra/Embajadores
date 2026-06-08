"""
db.py

Configuración de la conexión a PostgreSQL y manejo de sesiones.
Usa SQLAlchemy 2.0 con pool de conexiones para producción.
"""

import os
import logging
from contextlib import contextmanager

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import QueuePool
from dotenv import load_dotenv, find_dotenv

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ── Cargar .env ───────────────────────────────────────────────────────────────
# override=False: si la variable ya existe en el sistema (Docker/OpenShift),
# no la pisa. El .env solo aplica en desarrollo local.
dotenv_path = find_dotenv()
if dotenv_path:
    load_dotenv(dotenv_path, override=False)
    logger.info(f"Archivo .env cargado: {dotenv_path}")
else:
    logger.info("Sin archivo .env — usando variables del sistema")

# ── Leer variables de entorno ─────────────────────────────────────────────────
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME")

# Validar que las variables obligatorias existan
if not all([db_user, db_password, db_name]):
    raise RuntimeError(
        "Faltan variables de entorno obligatorias: DB_USER, DB_PASSWORD, DB_NAME"
    )

# ── URL de conexión ───────────────────────────────────────────────────────────
# Formato: postgresql+psycopg2://usuario:password@host:puerto/base_de_datos
DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


# ── Motor de conexión con pool ────────────────────────────────────────────────
# El pool mantiene conexiones abiertas y las reutiliza.
# Evita abrir/cerrar una conexión nueva por cada request (muy costoso).
try:
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,        # Conexiones permanentes en el pool
        max_overflow=20,     # Conexiones extra bajo alta demanda
        pool_timeout=30,     # Segundos de espera si el pool está lleno
        pool_recycle=1800,   # Reciclar conexiones cada 30 min (evita timeouts)
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"
    )
    logger.info(f"Motor de BD creado — {db_host}:{db_port}/{db_name}")
except Exception as e:
    logger.error(f"Error creando motor de BD: {e}")
    raise

# ── Base declarativa ──────────────────────────────────────────────────────────
# Todos los modelos SQLAlchemy heredan de esta clase.
# Permite a SQLAlchemy conocer el mapeo: tabla <-> clase Python
Base = declarative_base()

# ── Fábrica de sesiones ───────────────────────────────────────────────────────
# autocommit=False: los cambios se confirman manualmente con db.commit()
# autoflush=False: los cambios no se envían a la BD hasta el commit
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ── Context manager de sesión ─────────────────────────────────────────────────
@contextmanager
def get_db_session():
    """
    Maneja el ciclo de vida de una sesión de base de datos.

    Uso:
        with get_db_session() as db:
            resultado = db.query(MiModelo).all()

    Garantiza que la sesión se cierra incluso si ocurre un error.
    Si hay excepción, hace rollback para liberar la transacción limpiamente.
    """
    db = SessionLocal()
    try:
        yield db
    except Exception as e:
        logger.error(f"Error en sesión de BD: {e}")
        db.rollback()
        raise
    finally:
        db.close()


# ── Función de diagnóstico ────────────────────────────────────────────────────
def check_connection() -> bool:
    """
    Verifica que la conexión a la base de datos esté activa.
    Retorna True si la conexión es exitosa, False en caso contrario.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        logger.info("Conexión a la BD verificada correctamente")
        return True
    except Exception as e:
        logger.error(f"Error verificando conexión: {e}")
        return False


# ── Prueba directa ────────────────────────────────────────────────────────────
# Ejecuta este archivo directamente para probar la conexión:
# python db.py
if __name__ == "__main__":
    
    print("Verificando conexión a PostgreSQL...")
    try:
        with engine.connect() as conn:
            version = conn.execute(text("SELECT VERSION()")).scalar()
            print(f"Conexión exitosa.")
            print(f"PostgreSQL: {version}")

            # Verificar que el esquema API_PROD existe
            existe = conn.execute(text(
                "SELECT schema_name FROM information_schema.schemata "
                "WHERE schema_name = 'API_PROD'"
            )).scalar()

            if existe:
                print("Esquema API_PROD: encontrado correctamente.")
            else:
                print("ADVERTENCIA: Esquema API_PROD no encontrado.")
                print("Ejecuta el SQL del PASO 3 primero.")
    except Exception as e:
        print(f"Error de conexión: {e}")
        print("Revisa las variables en tu archivo .env")