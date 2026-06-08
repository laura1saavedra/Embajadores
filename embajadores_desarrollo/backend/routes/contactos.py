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
    return {
        "id_contacto":     c.id_contacto,
        "nombre_contacto": c.nombre_contacto,
        "numero_celular":  c.numero_celular,
        "token_wp":        c.token_wp,
        "tipo":            c.tipo or 'persona',
    }


@contactos_router.get("/")
def listar_contactos():
    try:
        with get_db_session() as db:
            contactos = db.query(Contacto).order_by(Contacto.tipo, Contacto.nombre_contacto).all()
            return [_contacto_a_dict(c) for c in contactos]
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": str(e)})


@contactos_router.post("/", status_code=201)
def crear_contacto(body: ContactoCrear):
    try:
        with get_db_session() as db:
            tipo_val = body.tipo if body.tipo in ('persona', 'grupo') else 'persona'
            if tipo_val == "persona" and not body.numero_celular : 
                raise ValueError ("El numero celular es obligatorio caundo el tipo es persona")
            nuevo = Contacto(
                nombre_contacto=body.nombre_contacto,
                numero_celular=body.numero_celular,
                token_wp=body.token_wp,
                tipo=tipo_val,
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
                contacto.nombre_contacto = body.nombre_contacto
            if body.numero_celular is not None:
                contacto.numero_celular = body.numero_celular
            if body.token_wp is not None:
                contacto.token_wp = body.token_wp
            if body.tipo is not None and body.tipo in ('persona', 'grupo'):
                contacto.tipo = body.tipo
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
