"""
db.py

ConfiguraciÃ³n de la conexiÃ³n a la base de datos Postgres y creaciÃ³n de sesiones.
Incluye soporte para secuencias Postgres.
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, Session, declarative_base
from sqlalchemy.pool import QueuePool
from sqlalchemy.schema import CreateSequence, Sequence
from dotenv import load_dotenv, find_dotenv
from contextlib import contextmanager
import os
import logging
import psycopg2

# Configurar logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ðŸ”§ Cargar .env solo en desarrollo local (sin sobrescribir variables del sistema/OpenShift)
dotenv_path = find_dotenv()
if dotenv_path:
    logger.info(f"ðŸ”§ Archivo .env encontrado: {dotenv_path}")
    load_dotenv(dotenv_path, override=False)  # âœ… override=False: Variables del sistema tienen prioridad
    logger.info("âœ… Variables cargadas (sistema/OpenShift tiene prioridad sobre .env)")
else:
    logger.info("âœ… No hay archivo .env - usando solo variables del sistema/OpenShift")

# Leer variables de entorno
db_user = os.getenv("DB_USER")
db_password = os.getenv("DB_PASSWORD")
db_host = os.getenv("DB_HOST")
db_port = os.getenv("DB_PORT")
db_name = os.getenv("DB_NAME")

try:
    #oracledb.init_oracle_client(lib_dir=r"C:\oracle\instantclient_23_5")
    logger.info("Cliente BD inicializado correctamente")
except Exception as e:
    try:
        # Intentar con otra ruta en caso de que la primera falle
        # oracledb.init_oracle_client(lib_dir=r"C:\oracle\instantclient_23_5")
        logger.info("Cliente BD inicializado correctamente (ruta alternativa)")
    except Exception as e2:
        logger.error(f"Error inicializando cliente BD: {str(e2)}")
        raise                                                            

# Construir la URL de conexiÃ³n
# DATABASE_URL = f"oracle+oracledb://{db_user}:{db_password}@{db_host}:{db_port}/?service_name={db_name}"
DATABASE_URL = f"postgresql+psycopg2://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"

# Configurar el motor de conexiÃ³n con Pooling
try:
    engine = create_engine(
        DATABASE_URL,
        poolclass=QueuePool,
        pool_size=10,          # NÃºmero de conexiones en el pool
        max_overflow=20,       # Conexiones extra en caso de alta demanda
        pool_timeout=30,       # Tiempo mÃ¡ximo de espera por una conexiÃ³n
        pool_recycle=1800,     # Reciclar conexiones despuÃ©s de 30 min
        echo=os.getenv("SQL_ECHO", "false").lower() == "true"  # Solo habilitar logs SQL si SQL_ECHO=true
    )
    logger.info("Database engine created successfully")
except Exception as e:
    logger.error(f"Error creating database engine: {str(e)}")
    raise

# Crear la base declarativa
Base = declarative_base()

# Crear la sesiÃ³n local
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Contexto para manejar sesiones de manera segura
@contextmanager
def get_db_session():
    """
    Contexto para manejar sesiones de base de datos de manera segura.
    Asegura que la sesiÃ³n se cierre correctamente incluso en caso de error.
    
    Uso:
    with get_db_session() as db:
        # operaciones de base de datos
    """       
    db = SessionLocal()
    try:
        logger.debug("Database session created")
        yield db
    except Exception as e:
        logger.error(f"Error using database session: {str(e)}")
        db.rollback()  # Rollback para liberar la conexiÃ³n limpiamente
        raise
    finally:
        db.close()
        logger.debug("Database session closed")
        
def init_db():
    """
    Inicializa la base de datos creando todas las tablas definidas.

    Raises:
        Exception: Si ocurre un error al crear las tablas.
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except Exception as e:
        logger.error(f"Error creating database tables: {str(e)}")
        raise
        
def check_connection():
    """
    Verifica la conexiÃ³n a la base de datos PostgreSQL.
    
    Returns:
        bool: True si la conexiÃ³n es exitosa, False en caso contrario.
    """
    try:
        with engine.connect() as connection:
            result = connection.execute(text("SELECT VERSION()"))
            logger.info("ConexiÃ³n a la base de datos verificada exitosamente")
            return True
    except Exception as e:
        logger.error(f"Error verificando conexiÃ³n a la base de datos: {str(e)}")
        return False

# Prueba de conexiÃ³n si este archivo se ejecuta directamente
if __name__ == "__main__":
    from sqlalchemy.sql import text
    
    print("Verificando conexiÃ³n a la base de datos...")
    try:
        with engine.connect() as connection:
            # result = connection.execute(text("SELECT 1 FROM DUAL"))
            result = connection.execute(text("SELECT VERSION()"))
            for row in result:
                print("ConexiÃ³n exitosa:", row[0])
            
            # Verificar esquema API_PROD (comentado porque es PostgreSQL, no Oracle)
            # result = connection.execute(text("SELECT COUNT(*) FROM ALL_USERS WHERE USERNAME = 'API_PROD'"))
            # count = result.scalar()
            # if count > 0:
            #     print("Esquema API_PROD encontrado")
            # else:
            #     print("ADVERTENCIA: Esquema API_PROD no encontrado")
    except Exception as e:
        print(f"Error de conexiÃ³n: {str(e)}")
