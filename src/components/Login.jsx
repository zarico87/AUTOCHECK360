// src/components/Login.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import logo from '../assets/img/logocompleto.jpeg';
import { setSession, isUserRegistered, getRegisteredWorkshops, addRegisteredWorkshop } from '../utils/storage';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [workshopNameInput, setWorkshopNameInput] = useState('');
  
  // Estado para el modal de Registro de Taller
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [regData, setRegData] = useState({
    nombreTaller: '',
    domicilio: '',
    cuit: '',
    telefono: '',
    email: '',
  });

  const navigate = useNavigate();

  // Validaciones
  const validateUsername = (val) => {
    return val.length >= 5 && val.length <= 8;
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

    // Verificar si el usuario está registrado en el sistema
    if (!isUserRegistered(cleanUsername)) {
      Swal.fire({
        title: 'Usuario no encontrado',
        text: 'Usuario no encontrado. Debe registrarse y comunicarse con el soporte.',
        icon: 'error',
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Entendido',
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

    // Buscar información del taller en los registrados
    const registeredList = getRegisteredWorkshops();
    const matchedWorkshop = registeredList.find(
      w => (w.usuario && w.usuario.toLowerCase() === cleanUsername.toLowerCase()) ||
           (w.email && w.email.toLowerCase() === cleanUsername.toLowerCase())
    );

    const finalWorkshopName = workshopNameInput.trim() || matchedWorkshop?.nombreTaller || `Taller ${cleanUsername.toUpperCase()}`;
    const finalDomicilio = matchedWorkshop?.domicilio || 'Av. Colón 1234, Córdoba';
    const finalTelefono = matchedWorkshop?.telefono || '351-1234567';

    // Guardar la sesión en localStorage
    setSession({
      usuario: cleanUsername,
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

  // Enviar formulario de registro de taller a soporte
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const { nombreTaller, domicilio, cuit, telefono, email } = regData;

    if (!nombreTaller || !domicilio || !cuit || !telefono || !email) {
      Swal.fire({
        title: 'Campos Incompletos',
        text: 'Por favor completá todos los datos requeridos para el registro.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    // Guardar taller registrado en localStorage para habilitar su usuario
    const nuevoTallerGuardado = addRegisteredWorkshop(regData);

    const mailtoSubject = encodeURIComponent(`Solicitud de Registro de Taller — ${nombreTaller}`);
    const mailtoBody = encodeURIComponent(
      `Hola Equipo de Soporte AutoCheck 360,\n\n` +
      `Solicito el alta y habilitación de credenciales para el siguiente taller:\n\n` +
      `• Nombre del Taller: ${nombreTaller}\n` +
      `• Domicilio: ${domicilio}\n` +
      `• CUIT: ${cuit}\n` +
      `• Teléfono: ${telefono}\n` +
      `• Email de contacto: ${email}\n` +
      `• Usuario Asignado: ${nuevoTallerGuardado.usuario}\n\n` +
      `Quedo a la espera de la habilitación de mi Usuario (${nuevoTallerGuardado.usuario}) y Contraseña (8-10 caracteres con mayúscula y símbolo).\n\n` +
      `Saludos cordiales.`
    );

    // Disparar cliente de correo
    window.location.href = `mailto:zadik.arg@gmail.com?subject=${mailtoSubject}&body=${mailtoBody}`;

    Swal.fire({
      title: '¡Solicitud de Registro Enviada!',
      html: `Los datos del taller <b>"${nombreTaller}"</b> se enviarán por correo a <b>zadik.arg@gmail.com</b>.<br/><br/>Se ha reservado tu usuario de acceso: <b>${nuevoTallerGuardado.usuario}</b>.<br/>El equipo de soporte habilitará tus credenciales definitivas.`,
      icon: 'info',
      confirmButtonColor: '#1E40AF',
      confirmButtonText: 'Entendido',
    });

    setShowRegisterModal(false);
    setRegData({
      nombreTaller: '',
      domicilio: '',
      cuit: '',
      telefono: '',
      email: '',
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-blue-950 px-4 py-8 relative">
      {/* Tarjeta de Login con glassmorphism */}
      <div className="bg-white/95 backdrop-blur-md p-8 sm:p-10 rounded-2xl shadow-2xl w-full max-w-md border-t-4 border-brand-orange animate-fadeIn">
        
        {/* Logo */}
        <div className="text-center mb-6">
          <img
            src={logo}
            alt="AutoCheck 360 Logo"
            className="mx-auto h-24 w-auto object-contain mb-4 mix-blend-multiply bg-transparent"
          />
          <h2 className="text-3xl font-bold text-brand-grayDark">
            AutoCheck <span className="text-brand-orange">360</span>
          </h2>
          <p className="text-gray-500 mt-2 text-sm font-medium">Acceso al sistema del taller</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-brand-grayDark mb-1">
              Usuario <span className="text-xs font-normal text-gray-500">(min. 5 - máx. 8 caracteres)</span>
            </label>
            <input
              type="text"
              id="login-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              minLength={5}
              maxLength={8}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all duration-300 bg-white/80"
              placeholder="Ej: taller1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-brand-grayDark mb-1">
              Contraseña <span className="text-xs font-normal text-gray-500">(min. 8 - máx. 10, 1 mayúscula, 1 símbolo)</span>
            </label>
            <input
              type="password"
              id="login-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              maxLength={10}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all duration-300 bg-white/80"
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
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue focus:border-brand-blue outline-none transition-all duration-300 bg-white/80"
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
            ¿Problemas para ingresar? Escribinos a{' '}
            <a
              href="mailto:zadik.arg@gmail.com"
              className="text-brand-blue font-semibold hover:text-brand-orange transition-colors underline underline-offset-2"
            >
              zadik.arg@gmail.com
            </a>
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
                  Completá los datos para solicitar habilitación de credenciales
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

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Correo Electrónico (Email) *
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

              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-xs text-blue-800 leading-relaxed">
                ℹ️ Al enviar la solicitud, los datos serán remitidos al correo de soporte (<b>zadik.arg@gmail.com</b>). Se generará tu <b>usuario</b> (5-8 caracteres) y <b>contraseña</b> habilitante.
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
                  className="px-5 py-2 text-sm text-white bg-brand-green hover:bg-lime-600 rounded-lg font-bold transition-colors shadow"
                >
                  Enviar Solicitud a Soporte
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