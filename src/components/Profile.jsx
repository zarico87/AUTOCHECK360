// src/components/Profile.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import {
  getSession,
  updateWorkshopProfile,
  updateWorkshopPassword,
  getWorkshopByUsernameOrEmail
} from '../utils/storage';

const Profile = () => {
  const session = getSession();
  const currentWorkshop = session?.usuario
    ? getWorkshopByUsernameOrEmail(session.usuario) || session
    : session;

  const [formData, setFormData] = useState({
    nombreTaller: currentWorkshop?.nombreTaller || '',
    domicilio: currentWorkshop?.domicilio || '',
    cuit: currentWorkshop?.cuit || '',
    telefono: currentWorkshop?.telefono || '',
    email: currentWorkshop?.email || '',
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    if (currentWorkshop) {
      setFormData({
        nombreTaller: currentWorkshop.nombreTaller || '',
        domicilio: currentWorkshop.domicilio || '',
        cuit: currentWorkshop.cuit || '',
        telefono: currentWorkshop.telefono || '',
        email: currentWorkshop.email || '',
      });
    }
  }, [currentWorkshop]);

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    if (!session?.usuario) return;

    const result = updateWorkshopProfile(session.usuario, formData);
    if (result.success) {
      Swal.fire({
        title: 'Perfil Actualizado',
        text: 'Los datos del taller se guardaron correctamente.',
        icon: 'success',
        confirmButtonColor: '#1E40AF',
      });
    } else {
      Swal.fire({
        title: 'Error',
        text: result.message || 'No se pudo actualizar el perfil.',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  const handlePasswordSubmit = (e) => {
    e.preventDefault();
    if (!session?.usuario) return;

    if (passData.newPassword !== passData.confirmPassword) {
      Swal.fire({
        title: 'Las contraseñas no coinciden',
        text: 'Asegurate de escribir la misma nueva contraseña en ambos campos.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    // Validar formato de la nueva contraseña (entre 8 y 10 caract, 1 mayús, 1 símbolo)
    const val = passData.newPassword;
    if (val.length < 8 || val.length > 10 || !/[A-Z]/.test(val) || !/[^a-zA-Z0-9]/.test(val)) {
      Swal.fire({
        title: 'Contraseña Inválida',
        html: 'La nueva contraseña debe tener <b>entre 8 y 10 caracteres</b>, e incluir al menos <b>1 letra mayúscula</b> y <b>1 símbolo</b> (ej: Taller12!).',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    const result = updateWorkshopPassword(session.usuario, passData.currentPassword, passData.newPassword);
    if (result.success) {
      Swal.fire({
        title: 'Contraseña Cambiada',
        text: 'Tu contraseña ha sido actualizada exitosamente.',
        icon: 'success',
        confirmButtonColor: '#84CC16',
      });
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } else {
      Swal.fire({
        title: 'Error',
        text: result.message || 'Error al cambiar la contraseña.',
        icon: 'error',
        confirmButtonColor: '#EF4444',
      });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border-t-4 border-brand-blue">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
          <span className="text-3xl">👤</span>
          <div>
            <h2 className="text-2xl font-bold text-brand-grayDark">Perfil del Taller</h2>
            <p className="text-sm text-gray-500">
              Administrá la información institucional de tu taller y credenciales de acceso
            </p>
          </div>
        </div>

        {/* Datos de Sesión con enlace al Dashboard al hacer click en el nombre */}
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 mb-6 flex flex-wrap items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">Usuario Activo</span>
            <Link
              to="/dashboard"
              title="Ir al Dashboard"
              className="text-lg font-bold text-brand-blue hover:text-blue-900 hover:underline font-mono cursor-pointer transition-colors"
            >
              {session?.usuario || 'Invitado'}
            </Link>
          </div>
          <div>
            <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider block">Taller Registrado</span>
            <Link
              to="/dashboard"
              title="Ir al Dashboard"
              className="text-sm font-semibold text-gray-800 hover:text-brand-blue hover:underline cursor-pointer transition-colors flex items-center gap-1"
            >
              <span>🏭</span> {formData.nombreTaller || 'Taller sin nombre'}
            </Link>
          </div>
        </div>

        {/* Formulario de Perfil */}
        <form onSubmit={handleProfileSubmit} className="space-y-4">
          <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 flex items-center gap-2">
            <span>🏭</span> Información General
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nombre del Taller</label>
              <input
                type="text"
                required
                value={formData.nombreTaller}
                onChange={(e) => setFormData({ ...formData, nombreTaller: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">CUIT</label>
              <input
                type="text"
                required
                value={formData.cuit}
                onChange={(e) => setFormData({ ...formData, cuit: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Domicilio</label>
              <input
                type="text"
                required
                value={formData.domicilio}
                onChange={(e) => setFormData({ ...formData, domicilio: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                required
                value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1">Correo Electrónico (Email)</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-blue outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-blue hover:bg-blue-800 text-white font-bold text-sm rounded-xl transition-all shadow hover:shadow-md"
            >
              Guardar Cambios de Perfil
            </button>
          </div>
        </form>
      </div>

      {/* Cambio de Contraseña */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-md border-t-4 border-brand-orange">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-100 pb-2 mb-4 flex items-center gap-2">
          <span>🔑</span> Cambiar Contraseña
        </h3>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Contraseña Actual</label>
            <input
              type="password"
              required
              value={passData.currentPassword}
              onChange={(e) => setPassData({ ...passData, currentPassword: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={10}
                value={passData.newPassword}
                onChange={(e) => setPassData({ ...passData, newPassword: e.target.value })}
                placeholder="8-10 caract, 1 Mayús, 1 Símbolo"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Confirmar Nueva Contraseña</label>
              <input
                type="password"
                required
                minLength={8}
                maxLength={10}
                value={passData.confirmPassword}
                onChange={(e) => setPassData({ ...passData, confirmPassword: e.target.value })}
                placeholder="Repetir nueva contraseña"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-brand-orange outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              className="px-6 py-2.5 bg-brand-orange hover:bg-orange-600 text-white font-bold text-sm rounded-xl transition-all shadow hover:shadow-md"
            >
              Actualizar Contraseña
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Profile;
