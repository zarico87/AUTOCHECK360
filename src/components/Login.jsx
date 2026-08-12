// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import Logo from './Logo';
import {
  setSession,
  authenticateUser,
  addRegisteredWorkshop,
  resetUserPassword
} from '../utils/storage';
import { sendRegistrationNotification, sendPasswordRecoveryNotification } from '../utils/emailService';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [workshopNameInput, setWorkshopNameInput] = useState('');
  
  // Estado para el modal de Registro de Taller
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({
    nombreTaller: '',
    usuario: '',
    password: '',
    domicilio: '',
    cuit: '',
    telefono: '',
    email: '',
  });

  // Estado para modal de Olvidé mi Contraseña
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [isSendingForgot, setIsSendingForgot] = useState(false);
  const [isSendingRegister, setIsSendingRegister] = useState(false);

  const navigate = useNavigate();

  // Validaciones
  const validateUsername = (val) => {
    return val.trim().length >= 5 && val.trim().length <= 8;
  };

  const validatePassword = (val) => {
    if (val.length < 8 || val.length > 10) return false;
    const hasUppercase = /[A-Z]/.test(val);
    const hasSymbol = /[^a-zA-Z0-9]/.test(val);
    return hasUppercase && hasSymbol;
  };

  // Función para manejar el envío del formulario de Login
  const handleLogin = (e) => {
    e.preventDefault();
    const cleanUsername = username.trim();

    if (!validateUsername(cleanUsername)) {
      Swal.fire({
        title: 'Usuario Inválido',
        text: 'El usuario debe tener entre 5 y 8 caracteres.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    if (!validatePassword(password)) {
      Swal.fire({
        title: 'Contraseña Inválida',
        html: 'La contraseña debe tener <b>entre 8 y 10 caracteres</b>, e incluir al menos <b>1 letra mayúscula</b> y <b>1 símbolo</b>.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    // Autenticar usuario y contraseña
    const authResult = authenticateUser(cleanUsername, password);

    if (!authResult.success) {
      if (authResult.error === 'USER_NOT_FOUND') {
        Swal.fire({
          title: 'Usuario no encontrado',
          html: 'Usuario no encontrado. Registrá tu taller o contactá al soporte técnico en <b>3512469463</b>.',
          icon: 'error',
          confirmButtonColor: '#EF4444',
          confirmButtonText: 'Entendido',
        });
      } else if (authResult.error === 'INVALID_PASSWORD') {
        Swal.fire({
          title: 'Contraseña Incorrecta',
          html: 'La contraseña ingresada no coincide.<br/>Si no recordás tu clave, usá la opción <b>"¿Olvidaste tu contraseña?"</b>.',
          icon: 'error',
          confirmButtonColor: '#EF4444',
          confirmButtonText: 'Reintentar',
        });
      }
      return;
    }

    const matchedWorkshop = authResult.workshop;
    const finalWorkshopName = workshopNameInput.trim() || matchedWorkshop?.nombreTaller || `Taller ${cleanUsername.toUpperCase()}`;
    const finalDomicilio = matchedWorkshop?.domicilio || 'Av. Colón 1234, Córdoba';
    const finalTelefono = matchedWorkshop?.telefono || '351-1234567';

    // Guardar la sesión activa
    setSession({
      usuario: matchedWorkshop.usuario,
      password: matchedWorkshop.password || password,
      nombreTaller: finalWorkshopName,
      domicilio: finalDomicilio,
      telefono: finalTelefono,
      email: matchedWorkshop?.email || '',
      cuit: matchedWorkshop?.cuit || '',
      fechaLogin: new Date().toISOString(),
    });

    Swal.fire({
      title: '¡Bienvenido!',
      text: `Iniciando sesión en AutoCheck 360 como "${finalWorkshopName}"`,
      icon: 'success',
      confirmButtonColor: '#84CC16',
      timer: 1500,
      showConfirmButton: false,
    });

    setTimeout(() => {
      navigate('/dashboard');
    }, 1500);
  };

  // Manejar el registro de nuevo taller
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    const { nombreTaller, domicilio, cuit, telefono, email, usuario, password: userPass } = regData;

    if (!nombreTaller || !domicilio || !cuit || !telefono || !email) {
      Swal.fire({
        title: 'Campos Incompletos',
        text: 'Por favor completá todos los datos obligatorios.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    // Definir o validar usuario
    let finalUsuario = usuario.trim();
    if (!finalUsuario) {
      finalUsuario = nombreTaller.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8) || 'taller1';
      if (finalUsuario.length < 5) finalUsuario = (finalUsuario + '360').substring(0, 8);
    } else if (!validateUsername(finalUsuario)) {
      Swal.fire({
        title: 'Usuario Inválido',
        text: 'El usuario debe tener entre 5 y 8 caracteres (ej: taller1).',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    // Definir o validar contraseña
    let finalPassword = userPass.trim();
    if (!finalPassword) {
      finalPassword = 'Taller12!'; // Contraseña por defecto válida
    } else if (!validatePassword(finalPassword)) {
      Swal.fire({
        title: 'Contraseña Inválida',
        html: 'La contraseña elegida debe tener entre 8 y 10 caracteres, incluir al menos 1 mayúscula y 1 símbolo (ej: Taller12!).',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    setIsSendingRegister(true);

    // Guardar taller registrado en localStorage y Firestore
    const nuevoTaller = addRegisteredWorkshop({
      ...regData,
      usuario: finalUsuario,
      password: finalPassword,
    });

    // Enviar correos de notificación al usuario Y a zadik.arg@gmail.com
    await sendRegistrationNotification(nuevoTaller);

    setIsSendingRegister(false);

    Swal.fire({
      title: '¡Registro Exitoso!',
      html: `El taller <b>"${nombreTaller}"</b> ha sido registrado correctamente.<br/><br/>
             <b>Se enviaron los datos de acceso al mail:</b><br/>
             📧 <span class="text-brand-blue font-bold">${email}</span><br/>
             📧 Y copia de notificación a <span class="text-brand-orange font-bold">zadik.arg@gmail.com</span><br/><br/>
             <b>Datos de ingreso generados:</b><br/>
             👤 <b>Usuario:</b> <code class="bg-gray-100 px-2 py-0.5 rounded text-blue-700 font-bold">${finalUsuario}</code><br/>
             🔑 <b>Contraseña:</b> <code class="bg-gray-100 px-2 py-0.5 rounded text-red-600 font-bold">${finalPassword}</code>`,
      icon: 'success',
      confirmButtonColor: '#1E40AF',
      confirmButtonText: 'Iniciar Sesión Ahora',
    });

    // Pre-cargar en el formulario de login para facilitar la entrada
    setUsername(finalUsuario);
    setPassword(finalPassword);
    setWorkshopNameInput(nombreTaller);

    setShowRegisterModal(false);
    setRegData({
      nombreTaller: '',
      usuario: '',
      password: '',
      domicilio: '',
      cuit: '',
      telefono: '',
      email: '',
    });
  };

  // Manejar solicitud de recuperación de contraseña
  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    if (!forgotIdentifier.trim()) {
      Swal.fire({
        title: 'Ingresá tu Usuario o Email',
        text: 'Por favor escribí el usuario o correo registrado.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    setIsSendingForgot(true);

    const resetResult = resetUserPassword(forgotIdentifier);

    if (!resetResult.success) {
      setIsSendingForgot(false);
      Swal.fire({
        title: 'Usuario no encontrado',
        text: resetResult.message,
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
      return;
    }

    // Enviar correos con credenciales al mail del usuario Y a zadik.arg@gmail.com
    await sendPasswordRecoveryNotification({
      workshop: resetResult.workshop,
      email: resetResult.email,
      user: resetResult.user,
      password: resetResult.password,
    });

    setIsSendingForgot(false);

    Swal.fire({
      title: '¡Contraseña Enviada!',
      html: `Se enviaron los datos de acceso al correo registrado:<br/>
             📧 <b>${resetResult.email}</b><br/>
             📧 Notificación duplicada enviada a <b>zadik.arg@gmail.com</b><br/><br/>
             <b>Credenciales para ingresar:</b><br/>
             👤 <b>Usuario:</b> <code class="bg-gray-100 px-2 py-0.5 rounded text-blue-700 font-bold">${resetResult.user}</code><br/>
             🔑 <b>Contraseña:</b> <code class="bg-gray-100 px-2 py-0.5 rounded text-red-600 font-bold">${resetResult.password}</code>`,
      icon: 'success',
      confirmButtonColor: '#84CC16',
      confirmButtonText: 'Entendido',
    });

    setUsername(resetResult.user);
    setPassword(resetResult.password);

    setShowForgotModal(false);
    setForgotIdentifier('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 px-4 py-8 relative">
      {/* Tarjeta de Login */}
      <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-brand-orange animate-fadeIn">
        
        {/* Logo sin fondo negro */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <Logo className="h-20 w-auto" alt="AutoCheck 360 Logo" />
          </div>
          <h2 className="text-3xl font-bold text-brand-grayDark">
            AutoCheck <span className="text-brand-orange">360</span>
          </h2>
          <p className="text-gray-500 mt-1 text-sm font-medium">Sistema Integral para Taller Mecánico</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-grayDark mb-1">
              Usuario <span className="text-xs font-normal text-gray-500">(5 - 8 caracteres o email)</span>
            </label>
            <input
              type="text"
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all duration-300 bg-white/80 text-sm font-medium"
              placeholder="Ej: taller1"
              required
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-semibold text-brand-grayDark">
                Contraseña
              </label>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                className="text-xs text-brand-blue hover:text-brand-orange font-semibold transition-colors underline"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all duration-300 bg-white/80 text-sm font-medium"
              placeholder="Ej: Taller12!"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-grayDark mb-1">
              Nombre del Taller <span className="text-xs font-normal text-gray-400">(Opcional)</span>
            </label>
            <input
              type="text"
              id="login-workshop-name"
              value={workshopNameInput}
              onChange={(e) => setWorkshopNameInput(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all duration-300 bg-white/80 text-sm"
              placeholder="Ej: Taller Mecánico San Martín"
            />
          </div>

          <button
            type="submit"
            id="login-submit"
            className="w-full bg-brand-blue hover:bg-blue-800 text-white font-bold py-3 px-4 rounded-xl transition-all duration-300 focus:ring-4 focus:ring-blue-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 mt-2"
          >
            Ingresar al Sistema
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setShowRegisterModal(true)}
            className="w-full py-2.5 px-4 bg-brand-green hover:bg-lime-600 text-white font-semibold rounded-xl transition-all duration-300 text-sm shadow hover:shadow-md flex items-center justify-center gap-2"
          >
            <span>🏭</span> Registrar Nuevo Taller
          </button>

          <p className="text-center text-xs text-gray-500 mt-1">
            Soporte técnico WhatsApp: <a href="https://wa.me/5493512469463" target="_blank" rel="noreferrer" className="text-brand-blue font-bold hover:underline">3512469463</a>
          </p>
        </div>
      </div>

      {/* Modal de Registrar Taller */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 sm:p-8 border-t-4 border-brand-green max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-brand-grayDark flex items-center gap-2">
                  <span>🏭</span> Registrar Nuevo Taller
                </h3>
                <p className="text-xs text-gray-500">
                  Se enviarán los datos de acceso a tu correo y al soporte (zadik.arg@gmail.com)
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowRegisterModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Nombre del Taller *
                </label>
                <input
                  type="text"
                  required
                  value={regData.nombreTaller}
                  onChange={(e) => setRegData({ ...regData, nombreTaller: e.target.value })}
                  placeholder="Ej: Taller Mecánico San Martín"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Usuario deseado <span className="text-gray-400 font-normal">(5-8 caract.)</span>
                  </label>
                  <input
                    type="text"
                    minLength={5}
                    maxLength={8}
                    value={regData.usuario}
                    onChange={(e) => setRegData({ ...regData, usuario: e.target.value })}
                    placeholder="Ej: taller1"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Contraseña <span className="text-gray-400 font-normal">(1 Mayús + 1 Símbolo)</span>
                  </label>
                  <input
                    type="text"
                    minLength={8}
                    maxLength={10}
                    value={regData.password}
                    onChange={(e) => setRegData({ ...regData, password: e.target.value })}
                    placeholder="Ej: Taller12!"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Correo Electrónico (Email de Registro) *
                </label>
                <input
                  type="email"
                  required
                  value={regData.email}
                  onChange={(e) => setRegData({ ...regData, email: e.target.value })}
                  placeholder="ejemplo@taller.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Teléfono de Contacto *
                </label>
                <input
                  type="tel"
                  required
                  value={regData.telefono}
                  onChange={(e) => setRegData({ ...regData, telefono: e.target.value })}
                  placeholder="Ej: 351-1234567"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    Domicilio *
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.domicilio}
                    onChange={(e) => setRegData({ ...regData, domicilio: e.target.value })}
                    placeholder="Ej: Av. Colón 1234, Córdoba"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">
                    CUIT *
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.cuit}
                    onChange={(e) => setRegData({ ...regData, cuit: e.target.value })}
                    placeholder="Ej: 20-30123456-7"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-green outline-none"
                  />
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-800 leading-relaxed">
                📧 Al hacer clic en <b>Registrar Taller</b>, se enviará una notificación con el usuario y contraseña al correo de registro (<b>{regData.email || 'tu email'}</b>) y simultáneamente a <b>zadik.arg@gmail.com</b>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingRegister}
                  className="px-5 py-2 text-sm text-white bg-brand-green hover:bg-lime-600 rounded-lg font-bold transition-colors shadow disabled:opacity-50"
                >
                  {isSendingRegister ? 'Enviando correo...' : 'Registrar Taller'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Olvidé mi Contraseña */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 sm:p-8 border-t-4 border-brand-blue">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-xl font-bold text-brand-grayDark flex items-center gap-2">
                  <span>🔑</span> Restaurar Contraseña
                </h3>
                <p className="text-xs text-gray-500 mt-1">
                  Te enviaremos los datos de acceso a tu correo de registro
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-xl px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Usuario o Correo Registrado *
                </label>
                <input
                  type="text"
                  required
                  value={forgotIdentifier}
                  onChange={(e) => setForgotIdentifier(e.target.value)}
                  placeholder="Ej: taller1 o contacto@taller.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
                />
              </div>

              <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-xs text-amber-800 leading-relaxed">
                📩 Se buscará el usuario y se enviará la contraseña al mail registrado y a <b>zadik.arg@gmail.com</b>.
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSendingForgot}
                  className="px-5 py-2 text-sm text-white bg-brand-blue hover:bg-blue-800 rounded-lg font-bold transition-colors shadow disabled:opacity-50"
                >
                  {isSendingForgot ? 'Enviando...' : 'Restaurar y Enviar Mail'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
