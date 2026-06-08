from fastapi import APIRouter
from fastapi.responses import JSONResponse
from db import get_db_session
from models import Usuario

usuarios_router = APIRouter()


@usuarios_router.get("/")
def listar_usuarios():
    try:
        with get_db_session() as db:
            usuarios = db.query(Usuario).order_by(Usuario.nombre).all()
            return [
                {
                    "id_usuario": u.id_usuario,
                    "nombre":     u.nombre,
                    "apellido":   u.apellido,
                    "correo":     u.correo,
                }
                for u in usuarios
            ]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})
