from fastapi import APIRouter
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional
from db import get_db_session
from models import Contacto

contactos_router = APIRouter()


class ContactoCrear(BaseModel):
    nombre_contacto: str
    numero_celular:  Optional[str] = None
    token_wp:        Optional[str] = None
    tipo:            Optional[str] = 'persona'   # 'persona' | 'grupo'


class ContactoActualizar(BaseModel):
    nombre_contacto: Optional[str] = None
    numero_celular:  Optional[str] = None
    token_wp:        Optional[str] = None
    tipo:            Optional[str] = None


def _contacto_a_dict(c: Contacto) -> dict:
    destino = c.token_wp or ""
    es_grupo = destino.endswith("@g.us")

    return {
        "id_contacto":     c.id_contacto,
        "nombre_contacto": c.nombre_grupo,
        "numero_celular":  None if es_grupo else destino,
        "token_wp":        c.token_wp,
        "tipo":            "grupo" if es_grupo else "persona",
    }


@contactos_router.get("/")
def listar_contactos():
    try:
        with get_db_session() as db:
            contactos = db.query(Contacto).order_by(Contacto.nombre_grupo).all()
            return [_contacto_a_dict(c) for c in contactos]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@contactos_router.post("/", status_code=201)
def crear_contacto(body: ContactoCrear):
    try:
        with get_db_session() as db:
            tipo_val = body.tipo if body.tipo in ('persona', 'grupo') else 'persona'
            destino = body.token_wp

            if tipo_val == "persona":
                destino = body.numero_celular or body.token_wp
                if not destino:
                    raise ValueError("El numero WhatsApp es obligatorio cuando el tipo es persona")

            if tipo_val == "grupo":
                destino = body.token_wp
                if not destino:
                    raise ValueError("El JID del grupo es obligatorio")
                if not destino.endswith("@g.us"):
                    raise ValueError("El JID del grupo debe terminar en @g.us")

            nuevo = Contacto(
                nombre_grupo=body.nombre_contacto,
                token_wp=destino,
            )
            db.add(nuevo)
            db.commit()
            db.refresh(nuevo)
            return _contacto_a_dict(nuevo)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@contactos_router.put("/{id_contacto}")
def actualizar_contacto(id_contacto: int, body: ContactoActualizar):
    try:
        with get_db_session() as db:
            contacto = db.query(Contacto).filter(Contacto.id_contacto == id_contacto).first()
            if not contacto:
                return JSONResponse(status_code=404, content={"error": "Contacto no encontrado"})
            if body.nombre_contacto is not None:
                contacto.nombre_grupo = body.nombre_contacto

            tipo_val = body.tipo if body.tipo in ('persona', 'grupo') else None

            if tipo_val == "persona":
                destino = body.numero_celular or body.token_wp
                if not destino:
                    raise ValueError("El numero WhatsApp es obligatorio cuando el tipo es persona")
                contacto.token_wp = destino
            elif tipo_val == "grupo":
                destino = body.token_wp
                if not destino:
                    raise ValueError("El JID del grupo es obligatorio")
                if not destino.endswith("@g.us"):
                    raise ValueError("El JID del grupo debe terminar en @g.us")
                contacto.token_wp = destino
            elif body.token_wp is not None:
                contacto.token_wp = body.token_wp
            elif body.numero_celular is not None:
                contacto.token_wp = body.numero_celular

            db.commit()
            db.refresh(contacto)
            return _contacto_a_dict(contacto)
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})


@contactos_router.delete("/{id_contacto}")
def eliminar_contacto(id_contacto: int):
    try:
        with get_db_session() as db:
            contacto = db.query(Contacto).filter(Contacto.id_contacto == id_contacto).first()
            if not contacto:
                return JSONResponse(status_code=404, content={"error": "Contacto no encontrado"})
            db.delete(contacto)
            db.commit()
            return {"eliminado": True, "id_contacto": id_contacto}
    except Exception as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
