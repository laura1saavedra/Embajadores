from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class Notificacion_usuario(BaseModel):
    incidente_id: int
    contacto_id: int
    id_notificacion: int