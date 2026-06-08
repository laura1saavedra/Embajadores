from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class ContactoCrear(BaseModel):
    nombre_contacto: str
    numero_celular : str
    id_contacto: int
    