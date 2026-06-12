"""
Utilidades de seguridad para usuarios.

Este modulo contiene validaciones comunes para la gestion de usuarios:
correo corporativo, dominio permitido, nombres, apellidos y limpieza basica
de texto antes de persistir datos.
"""

import os
import re


# Referencia tomada de Event Control:
# event_control/services/user_service.py -> UserService.ALLOWED_DOMAINS
# Se mantienen los mismos dominios por defecto para conservar compatibilidad
# funcional durante la adaptacion a Embajadores.
DOMINIOS_CORPORATIVOS_POR_DEFECTO = (
    "@globalhitss.com",
    "@globalhitss",
    "@admin.com",
    "@test.com",
)


def sanitize_text(value: str | None) -> str:
    """
    Limpia espacios externos y normaliza espacios internos.
    """
    if not value:
        return ""

    return re.sub(r"\s+", " ", value.strip())


def normalize_email(email: str | None) -> str:
    """
    Normaliza un correo para comparaciones y almacenamiento.
    """
    return sanitize_text(email).lower()


def validate_email_format(email: str) -> bool:
    """
    Valida que el correo tenga un formato general valido.
    """
    if not email:
        return False

    pattern = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"
    return bool(re.fullmatch(pattern, email))


def get_allowed_email_domains() -> list[str]:
    """
    Obtiene dominios corporativos permitidos desde variable de entorno.

    Variable esperada:
    ALLOWED_EMAIL_DOMAINS=@empresa.com,@globalhitss.com
    """
    raw_domains = os.getenv("ALLOWED_EMAIL_DOMAINS", "")

    if raw_domains.strip():
        domains = [
            domain.strip().lower()
            for domain in raw_domains.split(",")
            if domain.strip()
        ]
    else:
        domains = list(DOMINIOS_CORPORATIVOS_POR_DEFECTO)

    return [
        domain if domain.startswith("@") else f"@{domain}"
        for domain in domains
    ]


def is_email_domain_allowed(email: str) -> bool:
    """
    Verifica si el correo pertenece a un dominio corporativo autorizado.
    """
    email_normalizado = normalize_email(email)
    dominios_permitidos = get_allowed_email_domains()

    return any(
        email_normalizado.endswith(domain)
        for domain in dominios_permitidos
    )


def validate_corporate_email(email: str) -> dict:
    """
    Valida formato y dominio corporativo autorizado.
    """
    email_normalizado = normalize_email(email)
    resultado = {
        "is_valid": True,
        "email": email_normalizado,
        "errors": [],
    }

    if not email_normalizado:
        resultado["is_valid"] = False
        resultado["errors"].append("El correo corporativo es obligatorio")
        return resultado

    if not validate_email_format(email_normalizado):
        resultado["is_valid"] = False
        resultado["errors"].append("El formato del correo corporativo no es valido")
        return resultado

    if not is_email_domain_allowed(email_normalizado):
        resultado["is_valid"] = False
        dominios = ", ".join(get_allowed_email_domains())
        resultado["errors"].append(
            f"El dominio del correo no esta autorizado. Dominios permitidos: {dominios}"
        )

    return resultado


def validate_person_name(value: str, field_name: str) -> dict:
    """
    Valida nombres y apellidos de usuario.
    """
    texto = sanitize_text(value)
    resultado = {
        "is_valid": True,
        "value": texto,
        "errors": [],
    }

    if not texto:
        resultado["is_valid"] = False
        resultado["errors"].append(f"El campo {field_name} es obligatorio")
        return resultado

    if len(texto) > 100:
        resultado["is_valid"] = False
        resultado["errors"].append(
            f"El campo {field_name} no puede superar 100 caracteres"
        )

    pattern = r"^[A-Za-zÁÉÍÓÚáéíóúÑñÜü\s'-]+$"
    if not re.fullmatch(pattern, texto):
        resultado["is_valid"] = False
        resultado["errors"].append(
            f"El campo {field_name} solo puede contener letras, espacios, apostrofes y guiones"
        )

    return resultado


def validate_required_text(value: str, field_name: str, max_length: int) -> dict:
    """
    Valida texto obligatorio generico con longitud maxima.
    """
    texto = sanitize_text(value)
    resultado = {
        "is_valid": True,
        "value": texto,
        "errors": [],
    }

    if not texto:
        resultado["is_valid"] = False
        resultado["errors"].append(f"El campo {field_name} es obligatorio")
        return resultado

    if len(texto) > max_length:
        resultado["is_valid"] = False
        resultado["errors"].append(
            f"El campo {field_name} no puede superar {max_length} caracteres"
        )

    return resultado
