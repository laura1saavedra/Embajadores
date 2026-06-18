from pydantic import BaseModel, Field


class DiasActivosMasivos(BaseModel):
    dias_activos: int = Field(ge=1, le=365)
