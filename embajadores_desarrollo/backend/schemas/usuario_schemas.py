from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class UsuarioRegistrado(BaseModel):
    nombre: str
    apellido: str
    correo: str
    id_usuario: int