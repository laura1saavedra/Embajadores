from fastapi import APIRouter
from fastapi.responses import JSONResponse

from schemas.configuracion_schemas import DiasActivosMasivos
from services.configuracion_service import ConfiguracionService


configuracion_router = APIRouter()


@configuracion_router.get("/dias-activos-masivos")
def obtener_dias_activos_masivos():
    datos, error = ConfiguracionService.obtener_dias_activos_masivos()

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@configuracion_router.put("/dias-activos-masivos")
def actualizar_dias_activos_masivos(body: DiasActivosMasivos):
    datos, error = ConfiguracionService.actualizar_dias_activos_masivos(
        body.dias_activos
    )

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos


@configuracion_router.delete("/dias-activos-masivos")
def eliminar_dias_activos_masivos():
    datos, error = ConfiguracionService.eliminar_dias_activos_masivos()

    if error:
        return JSONResponse(status_code=500, content={"error": error})

    return datos
