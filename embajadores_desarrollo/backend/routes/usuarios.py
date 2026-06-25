"""
routes/usuarios.py

Endpoints para gestionar usuarios desde Configuracion Avanzada.
"""

from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

from schemas.usuario_schemas import (
    RolActualizar,
    RolCrear,
    UsuarioActualizar,
    UsuarioCrear,
)
from services.usuario_service import UsuarioService


usuarios_router = APIRouter()


@usuarios_router.get("/")
def listar_usuarios(
    solo_activos: bool = Query(default=False),
):
    datos, error = UsuarioService.listar_usuarios(
        solo_activos=solo_activos
    )

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@usuarios_router.get("/roles")
def listar_roles():
    datos, error = UsuarioService.listar_roles()

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@usuarios_router.get("/permisos")
def listar_permisos():
    datos, error = UsuarioService.listar_permisos()

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@usuarios_router.post("/roles", status_code=201)
def crear_rol(body: RolCrear):
    datos, error = UsuarioService.crear_rol(
        nombre_rol=body.nombre_rol,
        descripcion=body.descripcion,
        permisos_ids=body.permisos_ids,
    )

    if error:
        return JSONResponse(status_code=400, content={"error": error})

    return datos


@usuarios_router.put("/roles/{id_rol}")
def actualizar_rol(
    id_rol: int,
    body: RolActualizar,
):
    datos_actualizar = body.model_dump(exclude_unset=True)

    if not datos_actualizar:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar al menos un campo para actualizar"},
        )

    datos, error = UsuarioService.actualizar_rol(
        id_rol=id_rol,
        **datos_actualizar,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@usuarios_router.delete("/roles/{id_rol}")
def eliminar_rol(id_rol: int):
    resultado, error = UsuarioService.eliminar_rol(id_rol)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado


@usuarios_router.get("/{id_usuario}")
def obtener_usuario(id_usuario: int):
    datos, error = UsuarioService.obtener_usuario(id_usuario)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 500
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@usuarios_router.post("/", status_code=201)
def crear_usuario(body: UsuarioCrear):
    datos, error = UsuarioService.crear_usuario(
        nombre=body.nombre,
        apellido=body.apellido,
        correo=body.correo,
        rol_id=body.rol_id,
    )

    if error:
        return JSONResponse(status_code=400, content={"error": error})

    return datos


@usuarios_router.put("/{id_usuario}")
def actualizar_usuario(
    id_usuario: int,
    body: UsuarioActualizar,
):
    datos_actualizar = body.model_dump(exclude_unset=True)

    if not datos_actualizar:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar al menos un campo para actualizar"},
        )

    datos, error = UsuarioService.actualizar_usuario(
        id_usuario=id_usuario,
        **datos_actualizar,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@usuarios_router.patch("/{id_usuario}/estado")
def cambiar_estado_usuario(
    id_usuario: int,
    body: UsuarioActualizar,
):
    if body.activo is None:
        return JSONResponse(
            status_code=400,
            content={"error": "Debe enviar el campo activo"},
        )

    datos, error = UsuarioService.cambiar_estado_usuario(
        id_usuario=id_usuario,
        activo=body.activo,
    )

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@usuarios_router.post("/{id_usuario}/regenerar-contrasena")
def regenerar_contrasena_temporal(id_usuario: int):
    datos, error = UsuarioService.regenerar_contrasena_temporal(id_usuario)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@usuarios_router.post("/{id_usuario}/generar-contrasena-acceso")
def generar_contrasena_acceso(id_usuario: int):
    datos, error = UsuarioService.generar_contrasena_acceso(id_usuario)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return datos


@usuarios_router.delete("/{id_usuario}")
def eliminar_usuario(id_usuario: int):
    resultado, error = UsuarioService.eliminar_usuario(id_usuario)

    if error:
        codigo = 404 if "no encontrado" in error.lower() else 400
        return JSONResponse(status_code=codigo, content={"error": error})

    return resultado
