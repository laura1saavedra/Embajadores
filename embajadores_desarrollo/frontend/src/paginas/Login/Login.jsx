import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import './Login.css';

const estadoInicialLogin = {
  correo: '',
  contrasena: '',
  rememberMe: false,
};

const estadoInicialCambio = {
  contrasenaActual: '',
  nuevaContrasena: '',
  confirmarContrasena: '',
};

function Login() {
  const navigate = useNavigate();
  const { login, cambiarContrasena, usuario } = useAuth();

  const [formLogin, setFormLogin] = useState(estadoInicialLogin);
  const [formCambio, setFormCambio] = useState(estadoInicialCambio);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [mostrarActual, setMostrarActual] = useState(false);
  const [mostrarNueva, setMostrarNueva] = useState(false);
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);
  const [modoCambioContrasena, setModoCambioContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    if (usuario?.debeCambiarContrasena) {
      setModoCambioContrasena(true);
    }
  }, [usuario]);

  const actualizarLogin = (evento) => {
    const { name, value, checked, type } = evento.target;
    setFormLogin((estadoActual) => ({
      ...estadoActual,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const actualizarCambio = (evento) => {
    const { name, value } = evento.target;
    setFormCambio((estadoActual) => ({
      ...estadoActual,
      [name]: value,
    }));
  };

  const enviarLogin = async (evento) => {
    evento.preventDefault();
    setMensajeError('');
    setCargando(true);

    try {
      if (!formLogin.correo.trim()) {
        setMensajeError('Ingresa tu correo corporativo para continuar.');
        return;
      }

      if (!formLogin.contrasena) {
        setMensajeError('Ingresa tu contrasena para continuar.');
        return;
      }

      const sesion = await login({
        correo: formLogin.correo,
        contrasena: formLogin.contrasena,
        rememberMe: formLogin.rememberMe,
      });

      if (sesion.usuario.debeCambiarContrasena) {
        setFormCambio((estadoActual) => ({
          ...estadoActual,
          contrasenaActual: formLogin.contrasena,
        }));
        setModoCambioContrasena(true);
        return;
      }

      navigate('/registrar-incidente', { replace: true });
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  const enviarCambioContrasena = async (evento) => {
    evento.preventDefault();
    setMensajeError('');
    setCargando(true);

    try {
      const contrasenaActual = formCambio.contrasenaActual || formLogin.contrasena;

      if (!contrasenaActual) {
        setMensajeError('Ingresa la contrasena actual o temporal para continuar.');
        return;
      }

      if (!formCambio.nuevaContrasena) {
        setMensajeError('Ingresa tu nueva contrasena para continuar.');
        return;
      }

      if (!formCambio.confirmarContrasena) {
        setMensajeError('Confirma tu nueva contrasena para continuar.');
        return;
      }

      await cambiarContrasena({
        contrasenaActual,
        nuevaContrasena: formCambio.nuevaContrasena,
        confirmarContrasena: formCambio.confirmarContrasena,
      });

      navigate('/registrar-incidente', { replace: true });
    } catch (error) {
      setMensajeError(error.message);
    } finally {
      setCargando(false);
    }
  };

  if (modoCambioContrasena) {
    return (
      <main className="login-page login-page--password">
        <header className="login-topbar">
          <div className="login-topbar__brand">
            <span className="login-topbar__logo">GI</span>
            <span>
              <small>GESTION DE INCIDENTES</small>
              <strong>Incident Center</strong>
            </span>
          </div>
        </header>

        <section className="login-password-shell">
          <form className="login-card login-card--password" onSubmit={enviarCambioContrasena} noValidate>
            <div className="login-card__icon" aria-hidden="true">
              <span className="login-lock-icon" />
            </div>
            <h1>Cambiar contraseña</h1>
            <p>Por seguridad, debes cambiar tu contraseña antes de continuar usando la plataforma.</p>

            <div className="login-alert">
              <span aria-hidden="true">i</span>
              <p>Es la primera vez que inicias sesión. Crea una nueva contraseña segura para tu cuenta.</p>
            </div>

            {mensajeError && (
              <div className="login-error" role="alert">
                {mensajeError}
              </div>
            )}

            {!formLogin.contrasena && (
              <label className="login-field">
                <span>Contrasena actual</span>
                <div className="login-input">
                  <span aria-hidden="true">⌕</span>
                  <input
                    name="contrasenaActual"
                    type={mostrarActual ? 'text' : 'password'}
                    value={formCambio.contrasenaActual}
                    onChange={actualizarCambio}
                    placeholder="Ingresa tu contrasena actual o temporal"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarActual((valor) => !valor)}
                    aria-label={mostrarActual ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  >
                    👁
                  </button>
                </div>
              </label>
            )}

            <label className="login-field">
              <span>Nueva contraseña</span>
              <div className="login-input">
                <span aria-hidden="true">⌕</span>
                <input
                  name="nuevaContrasena"
                  type={mostrarNueva ? 'text' : 'password'}
                  value={formCambio.nuevaContrasena}
                  onChange={actualizarCambio}
                  placeholder="Ingresa tu nueva contraseña"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarNueva((valor) => !valor)}
                  aria-label={mostrarNueva ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  👁
                </button>
              </div>
              <small>Mínimo 8 caracteres, debe incluir mayúsculas, minúsculas, números y un carácter especial.</small>
            </label>

            <label className="login-field">
              <span>Confirmar nueva contraseña</span>
              <div className="login-input">
                <span aria-hidden="true">⌕</span>
                <input
                  name="confirmarContrasena"
                  type={mostrarConfirmacion ? 'text' : 'password'}
                  value={formCambio.confirmarContrasena}
                  onChange={actualizarCambio}
                  placeholder="Confirma tu nueva contraseña"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmacion((valor) => !valor)}
                  aria-label={mostrarConfirmacion ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  👁
                </button>
              </div>
            </label>

            <button className="login-submit" type="submit" disabled={cargando}>
              {cargando ? 'Cambiando...' : 'Cambiar contraseña'}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="login-page">
      <section className="login-brand-panel">
        <div className="login-brand-panel__mark" aria-hidden="true">
          <span />
          <span />
          <span />
          <strong />
        </div>

        <div className="login-brand-panel__content">
          <div className="login-brand-panel__logo">GI</div>
          <p>GESTION DE INCIDENTES</p>
          <h1>Incident Center</h1>
          <div className="login-brand-panel__line" />
          <span>Gestiona y da seguimiento a los incidentes de forma eficiente.</span>
        </div>
      </section>

      <section className="login-form-panel">
        <form className="login-card" onSubmit={enviarLogin} noValidate>
          <div className="login-card__icon" aria-hidden="true">
            <span className="login-lock-icon" />
          </div>
          <h1>Iniciar sesión</h1>
          <p>Ingresa tus credenciales para continuar.</p>

          {mensajeError && (
            <div className="login-error" role="alert">
              {mensajeError}
            </div>
          )}

          <label className="login-field">
            <span>Correo corporativo</span>
            <div className="login-input">
              <span aria-hidden="true">✉</span>
              <input
                name="correo"
                type="email"
                value={formLogin.correo}
                onChange={actualizarLogin}
                placeholder="nombre@empresa.com"
                autoComplete="email"
                required
              />
            </div>
          </label>

          <label className="login-field">
            <span>Contraseña</span>
            <div className="login-input">
              <span aria-hidden="true">⌕</span>
              <input
                name="contrasena"
                type={mostrarContrasena ? 'text' : 'password'}
                value={formLogin.contrasena}
                onChange={actualizarLogin}
                placeholder="Ingresa tu contraseña"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setMostrarContrasena((valor) => !valor)}
                aria-label={mostrarContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                👁
              </button>
            </div>
          </label>

          <label className="login-remember">
            <input
              name="rememberMe"
              type="checkbox"
              checked={formLogin.rememberMe}
              onChange={actualizarLogin}
            />
            <span>Recordar sesión</span>
          </label>

          <button className="login-submit" type="submit" disabled={cargando}>
            {cargando ? 'Ingresando...' : 'Iniciar sesión'}
          </button>
        </form>

      </section>
    </main>
  );
}

export default Login;
