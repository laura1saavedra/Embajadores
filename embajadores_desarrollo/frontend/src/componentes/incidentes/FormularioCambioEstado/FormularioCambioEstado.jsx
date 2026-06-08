import { useEffect, useMemo, useState } from 'react';
import incidenteServicio from '../../../services/incidenteServicio';
import SelectBuscable from '../SelectBuscable/SelectBuscable';
import './FormularioCambioEstado.css';

const ESTADO_FORMULARIO_CIERRE = {
  origenFallo: '',
  gerenciaOrigenFallo: '',
  sistemaRevision: '',
  sistemaAfectado: '',
  gerenciaSistemaAfectado: '',
  descripcion: '',
  afectacion: '',
  diagnostico: '',
  causaRaiz: '',
};

function FormularioCambioEstado({
  idIncidente,
  estadoActual,
  onEstadoActualizado,
  incidente = null,
}) {
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [formularioCierre, setFormularioCierre] = useState(
    ESTADO_FORMULARIO_CIERRE
  );

  useEffect(() => {
    if (incidente) {
      setFormularioCierre({
        origenFallo: incidente.origenFallo || '',
        gerenciaOrigenFallo: incidente.gerenciaOrigenFallo || '',
        sistemaRevision: incidente.sistemaRevision || '',
        sistemaAfectado: incidente.sistemaAfectado || '',
        gerenciaSistemaAfectado: incidente.gerenciaSistemaAfectado || '',
        descripcion: incidente.descripcion || '',
        afectacion: incidente.afectacion || '',
        diagnostico: incidente.diagnostico || '',
        causaRaiz: incidente.causaRaiz || '',
      });
    }
  }, [incidente]);

  const incidenteCerrado = estadoActual === 'cerrado';
  const requiereFormularioCierre = nuevoEstado === 'cerrado';

  const opcionesEstadoDisponibles = useMemo(() => {
    if (estadoActual === 'abierto') {
      return [
        { valor: 'en curso', etiqueta: 'En curso' },
        { valor: 'cerrado', etiqueta: 'Cerrado' },
      ];
    }

    if (estadoActual === 'en curso') {
      return [{ valor: 'cerrado', etiqueta: 'Cerrado' }];
    }

    return [];
  }, [estadoActual]);

  const manejarCambioEstado = (evento) => {
    setNuevoEstado(evento.target.value);
    setMensaje('');
    setError('');
  };

  const manejarCambioFormularioCierre = (evento) => {
    const { name, value } = evento.target;

    setFormularioCierre((prev) => ({
      ...prev,
      [name]: value,
    }));

    setMensaje('');
    setError('');
  };

  const validarFormulario = () => {
    if (incidenteCerrado) {
      return 'Este incidente ya está cerrado y no puede cambiar de estado.';
    }

    if (!nuevoEstado) {
      return 'Debes seleccionar un nuevo estado.';
    }

    if (nuevoEstado === estadoActual) {
      return 'Debes escoger un estado diferente al actual.';
    }

    if (estadoActual !== 'abierto' && nuevoEstado === 'abierto') {
      return 'Un incidente que ya salió de abierto no puede volver a ese estado.';
    }

    return '';
  };

  const manejarSubmit = async (evento) => {
    evento.preventDefault();

    const errorValidacion = validarFormulario();

    if (errorValidacion) {
      setError(errorValidacion);
      setMensaje('');
      return;
    }

    try {
      setGuardando(true);
      setError('');
      setMensaje('');

      const incidenteActualizado =
        await incidenteServicio.actualizarEstadoIncidente(
          idIncidente,
          nuevoEstado,
          requiereFormularioCierre ? formularioCierre : {}
        );

      setMensaje(`El estado fue actualizado a "${incidenteActualizado.estado}".`);
      setNuevoEstado('');

      if (onEstadoActualizado) {
        onEstadoActualizado(incidenteActualizado);
      }
    } catch (err) {
      setError(err.message || 'No fue posible actualizar el estado.');
    } finally {
      setGuardando(false);
    }
  };

  if (incidenteCerrado) {
    return (
      <section className="formulario-cambio-estado">
        <div className="formulario-cambio-estado__encabezado">
          <h2 className="formulario-cambio-estado__titulo">Cambiar estado</h2>
          <p className="formulario-cambio-estado__descripcion">
            Este incidente ya fue cerrado, por lo tanto no se permiten más cambios
            de estado.
          </p>
        </div>

        <div className="formulario-cambio-estado__alerta formulario-cambio-estado__alerta--exito">
          El incidente se encuentra cerrado y el cambio de estado ya no está disponible.
        </div>
      </section>
    );
  }

  return (
    <section className="formulario-cambio-estado">
      <div className="formulario-cambio-estado__encabezado">
        <h2 className="formulario-cambio-estado__titulo">Cambiar estado</h2>
        <p className="formulario-cambio-estado__descripcion">
          Si cierras el incidente, puedes completar la información de análisis y
          cierre, pero no es obligatoria.
        </p>
      </div>

      {mensaje && (
        <div className="formulario-cambio-estado__alerta formulario-cambio-estado__alerta--exito">
          {mensaje}
        </div>
      )}

      {error && (
        <div className="formulario-cambio-estado__alerta formulario-cambio-estado__alerta--error">
          {error}
        </div>
      )}

      <form
        className="formulario-cambio-estado__formulario"
        onSubmit={manejarSubmit}
      >
        <div className="formulario-cambio-estado__campo">
          <SelectBuscable
            id="nuevoEstado"
            label="Nuevo estado"
            opciones={opcionesEstadoDisponibles}
            valor={nuevoEstado}
            onChange={manejarCambioEstado}
            disabled={guardando}
            placeholder="Seleccione un estado"
            placeholderBusqueda="Buscar estado..."
          />
        </div>

        <div className="formulario-cambio-estado__resumen">
          <div>
            <span className="formulario-cambio-estado__etiqueta">Estado actual</span>
            <strong>{estadoActual}</strong>
          </div>

          <div>
            <span className="formulario-cambio-estado__etiqueta">Incidente</span>
            <strong>#{idIncidente}</strong>
          </div>
        </div>

        {requiereFormularioCierre && (
          <section className="formulario-cambio-estado__bloque-cierre">
            <h3 className="formulario-cambio-estado__subtitulo">
              Información opcional para cierre
            </h3>

            <div className="formulario-cambio-estado__grid">
              <div className="formulario-cambio-estado__campo">
                <label htmlFor="origenFallo">Origen del fallo</label>
                <input
                  id="origenFallo"
                  name="origenFallo"
                  type="text"
                  value={formularioCierre.origenFallo}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo">
                <label htmlFor="gerenciaOrigenFallo">
                  Gerencia origen del fallo
                </label>
                <input
                  id="gerenciaOrigenFallo"
                  name="gerenciaOrigenFallo"
                  type="text"
                  value={formularioCierre.gerenciaOrigenFallo}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo">
                <label htmlFor="sistemaRevision">Sistema de revisión</label>
                <input
                  id="sistemaRevision"
                  name="sistemaRevision"
                  type="text"
                  value={formularioCierre.sistemaRevision}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo">
                <label htmlFor="sistemaAfectado">Sistema afectado</label>
                <input
                  id="sistemaAfectado"
                  name="sistemaAfectado"
                  type="text"
                  value={formularioCierre.sistemaAfectado}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo">
                <label htmlFor="gerenciaSistemaAfectado">
                  Gerencia sistema afectado
                </label>
                <input
                  id="gerenciaSistemaAfectado"
                  name="gerenciaSistemaAfectado"
                  type="text"
                  value={formularioCierre.gerenciaSistemaAfectado}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo formulario-cambio-estado__campo--ancho-completo">
                <label htmlFor="descripcion">Descripción</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  rows="4"
                  value={formularioCierre.descripcion}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo formulario-cambio-estado__campo--ancho-completo">
                <label htmlFor="afectacion">Afectación</label>
                <textarea
                  id="afectacion"
                  name="afectacion"
                  rows="3"
                  value={formularioCierre.afectacion}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo formulario-cambio-estado__campo--ancho-completo">
                <label htmlFor="diagnostico">Diagnóstico</label>
                <textarea
                  id="diagnostico"
                  name="diagnostico"
                  rows="3"
                  value={formularioCierre.diagnostico}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>

              <div className="formulario-cambio-estado__campo formulario-cambio-estado__campo--ancho-completo">
                <label htmlFor="causaRaiz">Causa raíz</label>
                <textarea
                  id="causaRaiz"
                  name="causaRaiz"
                  rows="3"
                  value={formularioCierre.causaRaiz}
                  onChange={manejarCambioFormularioCierre}
                />
              </div>
            </div>
          </section>
        )}

        <div className="formulario-cambio-estado__acciones">
          <button
            type="submit"
            className="formulario-cambio-estado__boton"
            disabled={guardando}
          >
            {guardando ? 'Actualizando...' : 'Actualizar estado'}
          </button>
        </div>
      </form>
    </section>
  );
}

export default FormularioCambioEstado;