"""
services/whatsapp_service.py

Notificaciones WhatsApp via Evolution API para el proyecto Embajadores.
Adaptado del patron de monitor-demo/api/app/send_message_whatsapp.py.
"""

import httpx
import os
import logging
from datetime import datetime
from typing import Optional, Dict, Any, List

logger = logging.getLogger(__name__)

# ── Variables de entorno ──────────────────────────────────────────────────────
EVOLUTION_API_BASE_URL = os.getenv("EVOLUTION_API_BASE_URL")
EVOLUTION_API_KEY      = os.getenv("EVOLUTION_API_KEY")
EVOLUTION_API_INSTANCE = os.getenv("EVOLUTION_API_INSTANCE")
WP_DESTINO_DEFAULT     = os.getenv("WP_DESTINO_DEFAULT")
EMBAJADORES_URL        = os.getenv("EMBAJADORES_URL", "")
EMBAJADORES_MSG        = os.getenv("EMBAJADORES_MSG", "")


# ── Funcion base ──────────────────────────────────────────────────────────────

async def enviar_mensaje(message: str, destino: str) -> Dict[str, Any]:
    """
    Envia un mensaje de texto via Evolution API al destino indicado.
    El destino puede ser un numero individual (573001112233) o
    un JID de grupo (120363403675305399@g.us).
    """
    if not EVOLUTION_API_BASE_URL:
        logger.error("EVOLUTION_API_BASE_URL no configurada")
        return {"success": False, "error": "EVOLUTION_API_BASE_URL no configurada"}

    if not EVOLUTION_API_KEY:
        logger.error("EVOLUTION_API_KEY no configurada")
        return {"success": False, "error": "EVOLUTION_API_KEY no configurada"}

    if not EVOLUTION_API_INSTANCE:
        logger.error("EVOLUTION_API_INSTANCE no configurada")
        return {"success": False, "error": "EVOLUTION_API_INSTANCE no configurada"}

    if not destino:
        logger.warning("Destino WhatsApp no especificado")
        return {"success": False, "error": "Destino no especificado"}

    url = f"{EVOLUTION_API_BASE_URL}/message/sendText/{EVOLUTION_API_INSTANCE}"
    payload = {"number": destino, "text": message}
    headers = {"Content-Type": "application/json", "apikey": EVOLUTION_API_KEY}

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()
            logger.info(f"WhatsApp enviado a {destino}")
            return {
                "success": True,
                "data": data,
                "destino": destino,
                "message_id": data.get("key", {}).get("id") if data.get("key") else None
            }
    except httpx.HTTPStatusError as e:
        logger.error(f"Error HTTP enviando WhatsApp a {destino}: {e}")
        try:
            detalles = e.response.json()
        except Exception:
            detalles = {}
        return {"success": False, "error": str(e), "details": detalles, "destino": destino}
    except Exception as e:
        logger.error(f"Error enviando WhatsApp a {destino}: {e}")
        return {"success": False, "error": str(e), "destino": destino}


async def enviar_a_multiples(message: str, destinos: List[str]) -> List[Dict[str, Any]]:
    """Envia el mismo mensaje a varios destinos. Devuelve lista con resultado por destino."""
    resultados = []
    for destino in destinos:
        resultado = await enviar_mensaje(message, destino)
        resultados.append(resultado)
    return resultados


# ── Helpers de formato ────────────────────────────────────────────────────────

def _fecha_legible(ts: Optional[str]) -> str:
    """Convierte ISO timestamp a formato legible en hora Colombia."""
    if not ts:
        return datetime.utcnow().strftime("%d/%m/%Y %H:%M")
    try:
        import pytz
        dt = datetime.fromisoformat(str(ts).replace("Z", "+00:00"))
        dt_col = dt.astimezone(pytz.timezone("America/Bogota"))
        return dt_col.strftime("%d/%m/%Y %I:%M %p")
    except Exception:
        return str(ts)


def _destinos_efectivos(destinos_extra: Optional[List[str]]) -> List[str]:
    """
    Combina el destino por defecto (WP_DESTINO_DEFAULT) con los destinos
    adicionales que llegan por parametro. Elimina duplicados y vacios.
    """
    todos = []
    if WP_DESTINO_DEFAULT:
        todos.append(WP_DESTINO_DEFAULT)
    if destinos_extra:
        todos.extend(d for d in destinos_extra if d)
    return list(dict.fromkeys(todos))  # elimina duplicados preservando orden


# ── Notificaciones de negocio ─────────────────────────────────────────────────

async def notificar_incidente_abierto(
    incidente_id: int,
    cav_nombre: str,
    tipo_falla: str,
    componente_falla: str,
    usuarios_afectados: int,
    usuarios_totalidad: int,
    estado: str,
    servicios_afectados:List[Dict],
    fecha_reporte: Optional[str] = None,
    destinos_extra: Optional[List[str]] = None
) -> List[Dict[str, Any]]:  
    """
    Envia notificacion WhatsApp cuando se abre un incidente nuevo.
    Notifica al WP_DESTINO_DEFAULT mas cualquier destino adicional.
    """
    fecha = _fecha_legible(fecha_reporte)
    destinos = _destinos_efectivos(destinos_extra)
    servicios=""
    if servicios_afectados:
        servicios = "\n". join([
            f"{s['nombre_aplicacion']} - {s['nombre_servicio']}"
            for s in servicios_afectados
        ])
 
    if not destinos:
        logger.warning(f"Sin destinos configurados para notificar incidente {incidente_id}")
        return [{"success": False, "error": "Sin destinos WA configurados", "skipped": True}]

    link = f"{EMBAJADORES_URL}/{incidente_id}" if EMBAJADORES_URL else ""
    aviso = f"\n\n⚠️ _{EMBAJADORES_MSG}_" if EMBAJADORES_MSG else ""

    mensaje = (
        f"🚨 *\u00a1Incidente Registrado!*\n\n"
        f"🆔 *ID:* {incidente_id}\n"
        f"🏢 *CAV:* {cav_nombre}\n"
        f"🔴 *Tipo de falla:* {tipo_falla.capitalize()}\n"
        f"🔴   *Estado:* {estado}\n"
        f"📱 *Servicios afectados:* {servicios}\n"
        f"🔧 *Componente:* {componente_falla}\n"
        f"👥 *Usuarios afectados:* {usuarios_afectados} de {usuarios_totalidad}\n"
        f"📅 *Fecha y hora:* {fecha}\n"
    )
    if link:
        mensaje += f"\n🔗 *Ver incidente:*\n{link}"
    mensaje += aviso

    return await enviar_a_multiples(mensaje, destinos)


async def notificar_incidente_cerrado(
    incidente_id: int,
    cav_nombre: str,
    causa_raiz: Optional[str],
    fecha_cierre: Optional[str] = None,
    destinos_extra: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Envia notificacion WhatsApp cuando se cierra un incidente.
    """
    fecha = _fecha_legible(fecha_cierre)    
    destinos = _destinos_efectivos(destinos_extra)

    if not destinos:
        logger.warning(f"Sin destinos configurados para notificar cierre de incidente {incidente_id}")
        return [{"success": False, "error": "Sin destinos WA configurados", "skipped": True}]

    causa = causa_raiz or "No registrada"
    link = f"{EMBAJADORES_URL}/{incidente_id}" if EMBAJADORES_URL else ""
    aviso = f"\n\n⚠️ _{EMBAJADORES_MSG}_" if EMBAJADORES_MSG else ""

    mensaje = (
        f"✅ *\u00a1Incidente Cerrado!*\n\n"
        f"🆔 *ID:* {incidente_id}\n"
        f"🏢 *CAV:* {cav_nombre}\n"
        f"🔍 *Causa raíz:* {causa}\n"
        f"📅 *Fecha de cierre:* {fecha}\n"
        f"🎯 *Estado:* Incidente resuelto\n"
    )
    if link:
        mensaje += f"\n🔗 *Ver cierre:*\n{link}"
    mensaje += aviso

    return await enviar_a_multiples(mensaje, destinos)


async def notificar_cambio_estado(
    incidente_id: int,
    cav_nombre: str,
    estado_anterior: str,
    estado_nuevo: str,
    destinos_extra: Optional[List[str]] = None
) -> List[Dict[str, Any]]:
    """
    Envia notificacion WhatsApp cuando el incidente cambia de estado (sin cerrar).
    """
    destinos = _destinos_efectivos(destinos_extra)
    if not destinos:
        return [{"success": False, "error": "Sin destinos WA configurados", "skipped": True}]

    icono_estado = {"abierto": "🔴", "en curso": "🟡", "cerrado": "🟢"}.get(estado_nuevo, "⚪")
    mensaje = (
        f"📋 *Actualizacion de Incidente*\n\n"
        f"🆔 *ID:* {incidente_id}\n"
        f"🏢 *CAV:* {cav_nombre}\n"
        f"🔄 *Estado:* {estado_anterior.capitalize()} → {icono_estado} {estado_nuevo.capitalize()}\n"
        f"📅 *Fecha:* {_fecha_legible(None)}\n"
    )
    link = f"{EMBAJADORES_URL}/{incidente_id}" if EMBAJADORES_URL else ""
    if link:
        mensaje += f"\n🔗 *Ver incidente:*\n{link}"

    return await enviar_a_multiples(mensaje, destinos)


# ── Helpers para grupo (proxy a Evolution API) ────────────────────────────────

async def _hacer_peticion_evolution(method: str, endpoint: str, json_data: dict = None, params: dict = None):
    """Realiza una peticion HTTP a Evolution API y devuelve el JSON de respuesta."""
    from fastapi import HTTPException as _HTTPException
    if not EVOLUTION_API_BASE_URL or not EVOLUTION_API_KEY or not EVOLUTION_API_INSTANCE:
        raise _HTTPException(status_code=500, detail="Evolution API no configurada")
    url = f"{EVOLUTION_API_BASE_URL}{endpoint}"
    headers = {"Content-Type": "application/json", "apikey": EVOLUTION_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            if method == "GET":
                response = await client.get(url, headers=headers, params=params)
            elif method == "POST":
                response = await client.post(url, json=json_data, headers=headers, params=params)
            elif method == "DELETE":
                response = await client.delete(url, headers=headers, params=params)
            else:
                raise ValueError(f"Método no soportado: {method}")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPStatusError as e:
        try:
            detail = e.response.json()
        except Exception:
            detail = str(e)
        raise _HTTPException(status_code=e.response.status_code, detail=detail)
    except httpx.RequestError as e:
        raise _HTTPException(status_code=503, detail=f"No se pudo conectar con Evolution API: {str(e)}")


async def crear_grupo_wa(subject: str, description: str = "", participants: list = None):
    return await _hacer_peticion_evolution("POST", f"/group/create/{EVOLUTION_API_INSTANCE}",
        json_data={"subject": subject, "description": description, "participants": participants or []})


async def obtener_todos_grupos(get_participants: bool = False):
    return await _hacer_peticion_evolution("GET", f"/group/fetchAllGroups/{EVOLUTION_API_INSTANCE}",
        params={"getParticipants": str(get_participants).lower()})


async def obtener_grupo_por_jid(group_jid: str):
    return await _hacer_peticion_evolution("GET", f"/group/findGroupInfos/{EVOLUTION_API_INSTANCE}",
        params={"groupJid": group_jid})


async def actualizar_nombre_grupo(group_jid: str, subject: str):
    return await _hacer_peticion_evolution("POST", f"/group/updateGroupSubject/{EVOLUTION_API_INSTANCE}",
        json_data={"subject": subject}, params={"groupJid": group_jid})


async def actualizar_descripcion_grupo(group_jid: str, description: str):
    return await _hacer_peticion_evolution("POST", f"/group/updateGroupDescription/{EVOLUTION_API_INSTANCE}",
        json_data={"description": description}, params={"groupJid": group_jid})


async def actualizar_imagen_grupo(group_jid: str, image: str):
    return await _hacer_peticion_evolution("POST", f"/group/updateGroupPicture/{EVOLUTION_API_INSTANCE}",
        json_data={"image": image}, params={"groupJid": group_jid})


async def obtener_participantes_grupo(group_jid: str):
    return await _hacer_peticion_evolution("GET", f"/group/participants/{EVOLUTION_API_INSTANCE}",
        params={"groupJid": group_jid})


async def actualizar_participantes_grupo(group_jid: str, action: str, participants: list):
    return await _hacer_peticion_evolution("POST", f"/group/updateParticipant/{EVOLUTION_API_INSTANCE}",
        json_data={"action": action, "participants": participants}, params={"groupJid": group_jid})


async def obtener_codigo_invitacion(group_jid: str):
    return await _hacer_peticion_evolution("GET", f"/group/inviteCode/{EVOLUTION_API_INSTANCE}",
        params={"groupJid": group_jid})


async def revocar_codigo_invitacion(group_jid: str):
    return await _hacer_peticion_evolution("POST", f"/group/revokeInviteCode/{EVOLUTION_API_INSTANCE}",
        params={"groupJid": group_jid})


async def enviar_invitacion_grupo(group_jid: str, description: str, numbers: list):
    return await _hacer_peticion_evolution("POST", f"/group/sendInvite/{EVOLUTION_API_INSTANCE}",
        json_data={"groupJid": group_jid, "description": description, "numbers": numbers})


async def actualizar_configuracion_grupo(group_jid: str, action: str):
    return await _hacer_peticion_evolution("POST", f"/group/updateSetting/{EVOLUTION_API_INSTANCE}",
        json_data={"action": action}, params={"groupJid": group_jid})


async def configurar_efimero_grupo(group_jid: str, expiration: int):
    return await _hacer_peticion_evolution("POST", f"/group/toggleEphemeral/{EVOLUTION_API_INSTANCE}",
        json_data={"expiration": expiration}, params={"groupJid": group_jid})


async def verificar_conexion() -> Dict[str, Any]:
    """Verifica que la Evolution API este disponible."""
    if not EVOLUTION_API_BASE_URL or not EVOLUTION_API_INSTANCE:
        return {"success": False, "error": "Evolution API no configurada"}

    url = f"{EVOLUTION_API_BASE_URL}/instance/connectionState/{EVOLUTION_API_INSTANCE}"
    headers = {"apikey": EVOLUTION_API_KEY} if EVOLUTION_API_KEY else {}

    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers=headers)
            response.raise_for_status()
            data = response.json()
            return {
                "success": True,
                "state": data.get("instance", {}).get("state", "unknown"),
                "data": data
            }
    except Exception as e:
        return {"success": False, "error": str(e)}
