"""
Utilidades para contrasenas de usuarios.

Este modulo centraliza la generacion, validacion y hash de contrasenas
para la administracion de usuarios de la plataforma Embajadores.
"""

import logging
import re
import secrets
import string

import bcrypt


logger = logging.getLogger(__name__)


LONGITUD_MINIMA = 8
CARACTERES_ESPECIALES = "!@#$%^&*(),.?\":{}|<>"


def hash_password(password: str) -> str:
    """
    Genera un hash seguro para una contrasena usando bcrypt.
    """
    try:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")
    except Exception as error:
        logger.error("Error al generar hash de contrasena: %s", error)
        raise


def verify_password(password: str, hashed_password: str) -> bool:
    """
    Verifica si una contrasena en texto plano coincide con su hash.
    """
    if not password or not hashed_password:
        return False

    try:
        return bcrypt.checkpw(
            password.encode("utf-8"),
            hashed_password.encode("utf-8")
        )
    except Exception as error:
        logger.error("Error al verificar contrasena: %s", error)
        return False


def contiene_secuencia_numerica(password: str) -> bool:
    """
    Detecta secuencias numericas consecutivas ascendentes o descendentes.

    Ejemplos bloqueados:
    - 123
    - 234
    - 987
    - 321
    """
    digitos = re.findall(r"\d+", password)

    for grupo in digitos:
        if len(grupo) < 3:
            continue

        for indice in range(len(grupo) - 2):
            bloque = grupo[indice:indice + 3]
            numeros = [int(numero) for numero in bloque]

            es_ascendente = (
                numeros[1] == numeros[0] + 1 and
                numeros[2] == numeros[1] + 1
            )
            es_descendente = (
                numeros[1] == numeros[0] - 1 and
                numeros[2] == numeros[1] - 1
            )

            if es_ascendente or es_descendente:
                return True

    return False


def validate_password_strength(password: str) -> dict:
    """
    Valida que una contrasena cumpla los criterios de seguridad.
    """
    resultado = {
        "is_valid": True,
        "errors": [],
        "score": 0,
    }

    if not password:
        resultado["is_valid"] = False
        resultado["errors"].append("La contrasena es obligatoria")
        return resultado

    if len(password) < LONGITUD_MINIMA:
        resultado["is_valid"] = False
        resultado["errors"].append(
            f"La contrasena debe tener al menos {LONGITUD_MINIMA} caracteres"
        )
    else:
        resultado["score"] += 1

    if not re.search(r"[A-Z]", password):
        resultado["is_valid"] = False
        resultado["errors"].append(
            "La contrasena debe contener al menos una letra mayuscula"
        )
    else:
        resultado["score"] += 1

    if not re.search(r"[a-z]", password):
        resultado["is_valid"] = False
        resultado["errors"].append(
            "La contrasena debe contener al menos una letra minuscula"
        )
    else:
        resultado["score"] += 1

    if not re.search(r"\d", password):
        resultado["is_valid"] = False
        resultado["errors"].append(
            "La contrasena debe contener al menos un numero"
        )
    else:
        resultado["score"] += 1

    patron_especiales = f"[{re.escape(CARACTERES_ESPECIALES)}]"
    if not re.search(patron_especiales, password):
        resultado["is_valid"] = False
        resultado["errors"].append(
            "La contrasena debe contener al menos un caracter especial"
        )
    else:
        resultado["score"] += 1

    if contiene_secuencia_numerica(password):
        resultado["is_valid"] = False
        resultado["errors"].append(
            "La contrasena no debe contener secuencias numericas consecutivas"
        )

    contrasenas_comunes = {
        "password",
        "password1",
        "password123",
        "admin",
        "administrator",
        "qwerty",
        "abc123",
        "12345678",
    }

    if password.lower() in contrasenas_comunes:
        resultado["is_valid"] = False
        resultado["errors"].append(
            "La contrasena es muy comun, usa una mas segura"
        )

    return resultado


def generate_temp_password(length: int = 12) -> str:
    """
    Genera una contrasena temporal segura.
    """
    longitud = max(length, LONGITUD_MINIMA)
    caracteres = (
        string.ascii_uppercase +
        string.ascii_lowercase +
        string.digits +
        CARACTERES_ESPECIALES
    )

    for _ in range(100):
        password = "".join(secrets.choice(caracteres) for _ in range(longitud))
        validacion = validate_password_strength(password)

        if validacion["is_valid"]:
            return password

    raise ValueError("No fue posible generar una contrasena segura")

