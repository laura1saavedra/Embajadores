"""
routes/whatsapp.py

Proxy de Evolution API para gestión de grupos de WhatsApp.
No requiere autenticación (embajadores no tiene auth).
"""

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field
from typing import List, Optional

from services.whatsapp_service import (
    crear_grupo_wa,
    obtener_todos_grupos,
    obtener_grupo_por_jid,
    actualizar_nombre_grupo,
    actualizar_descripcion_grupo,
    actualizar_imagen_grupo,
    obtener_participantes_grupo,
    actualizar_participantes_grupo,
    obtener_codigo_invitacion,
    revocar_codigo_invitacion,
    enviar_invitacion_grupo,
    actualizar_configuracion_grupo,
    configurar_efimero_grupo,
    verificar_conexion,
)

whatsapp_router = APIRouter(tags=["WhatsApp Grupos"])


# ── Modelos ───────────────────────────────────────────────────────────────────

class CrearGrupoRequest(BaseModel):
    subject: str = Field(..., description="Nombre del grupo")
    description: str = Field(default="", description="Descripción del grupo")
    participants: List[str] = Field(default=[], description="Lista de números (con código país, sin +)")


class ActualizarNombreRequest(BaseModel):
    group_jid: str
    subject: str


class ActualizarDescripcionRequest(BaseModel):
    group_jid: str
    description: str


class ActualizarImagenRequest(BaseModel):
    group_jid: str
    image: str


class ActualizarParticipantesRequest(BaseModel):
    group_jid: str
    action: str = Field(..., description="add, remove, promote, demote")
    participants: List[str]


class EnviarInvitacionRequest(BaseModel):
    group_jid: str
    description: str
    numbers: List[str]


class ConfiguracionRequest(BaseModel):
    group_jid: str
    action: str = Field(..., description="announcement, not_announcement, locked, unlocked")


class EfimeroRequest(BaseModel):
    group_jid: str
    expiration: int = Field(..., description="0=off, 86400=24h, 604800=7d, 7776000=90d")


# ── Endpoints ─────────────────────────────────────────────────────────────────

@whatsapp_router.get("/estado")
async def estado_whatsapp():
    """Verifica el estado de la conexión de WhatsApp (Evolution API)."""
    return await verificar_conexion()


@whatsapp_router.post("/crear")
async def crear_grupo(request: CrearGrupoRequest):
    """Crear un nuevo grupo de WhatsApp."""
    return await crear_grupo_wa(
        subject=request.subject,
        description=request.description,
        participants=request.participants,
    )


@whatsapp_router.get("/grupos")
async def listar_grupos(get_participants: bool = Query(default=False)):
    """Obtener todos los grupos de WhatsApp de la instancia."""
    return await obtener_todos_grupos(get_participants=get_participants)


@whatsapp_router.get("/grupo")
async def info_grupo(group_jid: str = Query(..., description="JID del grupo")):
    """Obtener información de un grupo por su JID."""
    return await obtener_grupo_por_jid(group_jid=group_jid)


@whatsapp_router.post("/nombre")
async def actualizar_nombre(request: ActualizarNombreRequest):
    """Actualizar el nombre de un grupo."""
    return await actualizar_nombre_grupo(group_jid=request.group_jid, subject=request.subject)


@whatsapp_router.post("/descripcion")
async def actualizar_descripcion(request: ActualizarDescripcionRequest):
    """Actualizar la descripción de un grupo."""
    return await actualizar_descripcion_grupo(group_jid=request.group_jid, description=request.description)


@whatsapp_router.post("/imagen")
async def actualizar_imagen(request: ActualizarImagenRequest):
    """Actualizar la imagen de un grupo (URL pública)."""
    return await actualizar_imagen_grupo(group_jid=request.group_jid, image=request.image)


@whatsapp_router.get("/participantes")
async def listar_participantes(group_jid: str = Query(..., description="JID del grupo")):
    """Obtener los participantes de un grupo."""
    return await obtener_participantes_grupo(group_jid=group_jid)


@whatsapp_router.post("/participantes")
async def gestionar_participantes(request: ActualizarParticipantesRequest):
    """Agregar, remover, promover o degradar participantes de un grupo."""
    return await actualizar_participantes_grupo(
        group_jid=request.group_jid,
        action=request.action,
        participants=request.participants,
    )


@whatsapp_router.get("/codigo-invitacion")
async def codigo_invitacion(group_jid: str = Query(..., description="JID del grupo")):
    """Obtener el código de invitación del grupo."""
    return await obtener_codigo_invitacion(group_jid=group_jid)


@whatsapp_router.post("/revocar-invitacion")
async def revocar_invitacion(group_jid: str = Query(..., description="JID del grupo")):
    """Revocar el código de invitación del grupo."""
    return await revocar_codigo_invitacion(group_jid=group_jid)


@whatsapp_router.post("/enviar-invitacion")
async def enviar_invitacion(request: EnviarInvitacionRequest):
    """Enviar invitación de grupo a una lista de números."""
    return await enviar_invitacion_grupo(
        group_jid=request.group_jid,
        description=request.description,
        numbers=request.numbers,
    )


@whatsapp_router.post("/configuracion")
async def configuracion_grupo(request: ConfiguracionRequest):
    """Cambiar configuración de mensajes/edición del grupo."""
    return await actualizar_configuracion_grupo(group_jid=request.group_jid, action=request.action)


@whatsapp_router.post("/efimero")
async def efimero_grupo(request: EfimeroRequest):
    """Configurar mensajes efímeros del grupo."""
    return await configurar_efimero_grupo(group_jid=request.group_jid, expiration=request.expiration)
