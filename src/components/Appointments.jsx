// src/components/Appointments.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getSession, getAppointmentsByDate, addAppointment, deleteAppointment, countAppointmentsByDate, syncAppointmentsFromFirestore } from '../utils/storage';
import { db } from '../firebase/config';
import { collection, onSnapshot } from 'firebase/firestore';

const MAX_TURNOS = 8;

const HORARIOS = [
  '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
  '16:00', '16:30', '17:00', '17:30', '18:00',
];

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

const APPOINTMENTS_KEY = 'autocheck360_appointments';

export const SERVICIOS_TURNOS = [
  'Limpiaparabrisas',
  'Lavaparabrisas',
  'Service lubricentro',
  'Diagnóstico PC',
  'DPF off',
  'Mecánica ligera',
  'Derivados Forcor',
  'Instrumental',
];

/**
 * Normaliza y formatea un número telefónico para links wa.me de WhatsApp.
 * Soporta números de Argentina (con o sin 0, 15, o código de país 54/549) e internacionales.
 */
export const formatWhatsAppNumber = (phone) => {
  if (!phone) return '';
  const str = String(phone).trim();
  if (!str) return '';

  const hasPlus = str.startsWith('+');
  let cleaned = str.replace(/\D/g, '');
  if (!cleaned) return '';

  if (hasPlus) {
    if (cleaned.startsWith('54') && !cleaned.startsWith('549')) {
      return `549${cleaned.slice(2)}`;
    }
    return cleaned;
  }

  if (cleaned.startsWith('549')) {
    return cleaned;
  }

  if (cleaned.startsWith('54')) {
    return `549${cleaned.slice(2)}`;
  }

  if (cleaned.startsWith('0')) {
    cleaned = cleaned.slice(1);
  }

  // Quitar el '15' de celular local en Argentina (ej: 351 15 2469463 => 3512469463)
  if (cleaned.length === 12) {
    const without15 = cleaned.replace(/^(\d{2,4})15(\d{6,8})$/, '$1$2');
    if (without15.length === 10) {
      cleaned = without15;
    }
  }

  if (cleaned.length === 10) {
    return `549${cleaned}`;
  }

  if (cleaned.length <= 11) {
    return `549${cleaned}`;
  }

  return cleaned;
};

/**
 * Calcula la fecha del próximo service sugerido (6 meses desde la fecha del turno).
 */
const calcularProximoService = (fechaTurno) => {
  if (!fechaTurno) return new Date();
  const [year, month, day] = fechaTurno.split('-').map(Number);
  const fecha = new Date(year, month - 1, day);
  fecha.setMonth(fecha.getMonth() + 6);
  return fecha;
};

/**
 * Formatea una fecha Date a dd/mm/yyyy
 */
const formatDateDMY = (date) => {
  if (!date) return '';
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
};

const Appointments = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState(() => getAppointmentsByDate(today));
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [form, setForm] = useState({
    nombre: '',
    patente: '',
    modelo: '',
    hora: '09:00',
    telefono: '',
    servicios: [],
  });
  const [syncing, setSyncing] = useState(false);

  const handleToggleServicio = (servicio) => {
    setForm((prev) => {
      const current = prev.servicios || [];
      const exists = current.includes(servicio);
      return {
        ...prev,
        servicios: exists
          ? current.filter((s) => s !== servicio)
          : [...current, servicio],
      };
    });
  };

  const handleSelectAllServicios = () => {
    setForm((prev) => ({
      ...prev,
      servicios:
        prev.servicios?.length === SERVICIOS_TURNOS.length
          ? []
          : [...SERVICIOS_TURNOS],
    }));
  };

  // Estado para la navegación del calendario mensual
  const [calYear, setCalYear] = useState(() => new Date(today).getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date(today).getMonth());

  // Referencia al selectedDate actual para uso dentro del listener de onSnapshot
  const selectedDateRef = React.useRef(selectedDate);
  React.useEffect(() => {
    selectedDateRef.current = selectedDate;
  }, [selectedDate]);

  const loadAppointments = React.useCallback(() => {
    setAppointments(getAppointmentsByDate(selectedDate));
  }, [selectedDate]);

  // Cargar inmediatamente turnos locales al cambiar de fecha
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // ── Sincronización en tiempo real con Firestore (onSnapshot) ──
  // Mismo patrón que Dashboard para que los turnos se vean al instante
  // en cualquier dispositivo conectado.
  useEffect(() => {
    let unsubscribe = () => {};

    const init = async () => {
      try {
        // Sincronización inicial one-shot en background
        await syncAppointmentsFromFirestore();
        loadAppointments();

        const session = getSession();
        const usuario = session?.usuario?.toLowerCase();

        if (db && usuario) {
          const appointmentsRef = collection(db, "workshops", usuario, "appointments");

          // Escuchar cambios en tiempo real (multi-dispositivo)
          unsubscribe = onSnapshot(appointmentsRef, (snapshot) => {
            const firestoreAppointments = [];
            snapshot.forEach((doc) => {
              firestoreAppointments.push(doc.data());
            });

            // Fusionar con datos locales (Firestore tiene prioridad)
            const localData = localStorage.getItem(APPOINTMENTS_KEY);
            const localAppointments = localData ? JSON.parse(localData) : [];

            const appointmentMap = new Map();
            localAppointments.forEach(a => { if (a.id) appointmentMap.set(a.id, a); });
            firestoreAppointments.forEach(a => { if (a.id) appointmentMap.set(a.id, { ...appointmentMap.get(a.id), ...a }); });

            const merged = Array.from(appointmentMap.values());
            localStorage.setItem(APPOINTMENTS_KEY, JSON.stringify(merged));

            // Actualizar la vista con la fecha actualmente seleccionada
            const currentDate = selectedDateRef.current;
            const filtered = merged
              .filter(a => a.fecha === currentDate)
              .sort((a, b) => a.hora.localeCompare(b.hora));
            setAppointments(filtered);
            setSyncing(false);
          }, (error) => {
            console.error("Error al sincronizar turnos en tiempo real:", error);
            loadAppointments();
            setSyncing(false);
          });
        } else {
          loadAppointments();
          setSyncing(false);
        }
      } catch (err) {
        console.warn('Sync turnos error:', err);
        loadAppointments();
        setSyncing(false);
      }
    };

    init();

    return () => unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Cuando cambia la fecha seleccionada, re-filtrar los datos locales
  // (el onSnapshot ya mantiene localStorage actualizado)
  useEffect(() => {
    loadAppointments();
  }, [selectedDate, loadAppointments]);

  const takenHours = appointments.map(a => a.hora);
  const availableHours = HORARIOS.filter(h => !takenHours.includes(h));

  const handleAddAppointment = (e) => {
    e.preventDefault();
    const count = countAppointmentsByDate(selectedDate);
    if (count >= MAX_TURNOS) {
      Swal.fire({
        title: 'Día completo',
        text: `Ya se alcanzó el máximo de ${MAX_TURNOS} turnos para este día.`,
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    // ── Verificar si se seleccionó la opción de Lubricentro ──
    const serviciosSeleccionados = form.servicios || [];
    const esLubricentro = serviciosSeleccionados.some((s) =>
      s.toLowerCase().includes('lubricentro')
    );

    // ── Calcular fecha del próximo service ÚNICAMENTE si es lubricentro ──
    let fechaProximoService = null;
    if (esLubricentro) {
      const proximoServiceDate = calcularProximoService(selectedDate);
      fechaProximoService = formatDateDMY(proximoServiceDate);
    }

    // Guardar turno en storage y sincronizar
    const appointmentData = {
      ...form,
      patente: form.patente.toUpperCase().trim(),
      nombre: form.nombre.trim(),
      modelo: form.modelo.trim(),
      telefono: form.telefono ? form.telefono.trim() : '',
      fecha: selectedDate,
      servicios: serviciosSeleccionados,
      // El cálculo del service solo se agrega cuando se selecciona la opción de lubricentro
      proximoService: fechaProximoService,
      esLubricentro: esLubricentro,
    };

    const result = addAppointment(appointmentData);

    if (result.error) {
      Swal.fire({ title: 'Error', text: result.error, icon: 'error', confirmButtonColor: '#F97316' });
      return;
    }

    const resetAndClose = () => {
      setForm({
        nombre: '',
        patente: '',
        modelo: '',
        hora: availableHours[0] || '09:00',
        telefono: '',
        servicios: [],
      });
      setShowModal(false);
      loadAppointments();
    };

    // ── Verificar si se colocó teléfono para el envío de WhatsApp ──
    const rawDigits = (form.telefono || '').replace(/\D/g, '');
    const tieneTelefono = rawDigits.length >= 6;

    // Formatear la fecha para presentación
    const [year, month, day] = selectedDate.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    // Si NO se colocó teléfono: guardar turno sin abrir ni preguntar por WhatsApp
    if (!tieneTelefono) {
      Swal.fire({
        title: '¡Turno guardado!',
        html: `
          <div style="text-align: left; font-size: 14px; line-height: 1.6;">
            <p>Se agendó el turno para <strong>${form.nombre}</strong> (${form.patente.toUpperCase()}) el día <strong>${fechaFormateada}</strong> a las <strong>${form.hora} hs</strong>.</p>
            ${esLubricentro && fechaProximoService ? `
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 10px 14px; margin-top: 12px; text-align: center;">
                <span style="font-size: 13px; font-weight: bold; color: #16a34a;">🔧 Próximo Service Lubricentro: ${fechaProximoService}</span>
                <p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">Cálculo estimado a 6 meses / 10.000 km</p>
              </div>
            ` : ''}
          </div>
        `,
        icon: 'success',
        confirmButtonColor: '#1E40AF',
        confirmButtonText: 'Aceptar',
      }).then(() => {
        resetAndClose();
      });
      return;
    }

    // ── Si SE COLOCÓ TELÉFONO: Preparar enlace y mensaje de WhatsApp ──
    const formattedPhone = formatWhatsAppNumber(form.telefono);
    const session = getSession();
    const tallerName = session?.nombreTaller || 'nuestro taller';
    const tallerTelefono = session?.telefono || '';

    // Texto de servicios para mensaje
    const serviciosTexto = serviciosSeleccionados.length > 0
      ? `\n🛠️ *Servicios solicitados:* ${serviciosSeleccionados.join(', ')}`
      : '';

    // Cálculo del service: SOLO se agrega al mensaje de WhatsApp si es Lubricentro
    const serviceTextoEnMensaje = esLubricentro && fechaProximoService
      ? `\n\n🔧 *Próximo service sugerido:* ${fechaProximoService} (en 6 meses / 10.000 km)`
      : '';

    // Construir mensaje de confirmación del turno por WhatsApp
    const mensajeConfirmacion = `Hola ${form.nombre},\n\nTenés un turno reservado en *${tallerName}*.\n\n📅 Fecha: *${fechaFormateada}*\n⏰ Hora: *${form.hora} hs.*\n🚗 Vehículo: *${form.modelo}* (Patente: *${form.patente.toUpperCase()}*)${serviciosTexto}${serviceTextoEnMensaje}\n\n¡Te esperamos!`;
    const wappUrlConfirmacion = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensajeConfirmacion)}`;

    // Construir mensaje de recordatorio del próximo service (solo relevante para lubricentro)
    const mensajeRecordatorio = esLubricentro && fechaProximoService
      ? `Hola ${form.nombre},\n\nDesde *${tallerName}* te recordamos que tu próximo service para el *${form.modelo}* (Patente: *${form.patente.toUpperCase()}*) está programado aproximadamente para:\n\n🔧 *${fechaProximoService}* (en 6 meses / 10.000 km)\n\n📌 Te recomendamos agendar tu turno con anticipación para mantener tu vehículo en óptimas condiciones.\n\n${tallerTelefono ? `📞 Contacto: ${tallerTelefono}\n\n` : ''}¡Gracias por confiar en nosotros!`
      : '';
    const wappUrlRecordatorio = esLubricentro && fechaProximoService
      ? `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensajeRecordatorio)}`
      : '';

    // ── Primer diálogo: Confirmación del turno por WhatsApp ──
    Swal.fire({
      title: '¡Turno guardado!',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6;">
          <p>Se guardó el turno para <strong>${form.nombre}</strong> (${form.patente.toUpperCase()}).</p>
          ${esLubricentro && fechaProximoService ? `
            <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 10px; padding: 10px 14px; margin: 10px 0; text-align: center;">
              <span style="font-size: 13px; font-weight: bold; color: #16a34a;">🔧 Próximo Service Lubricentro: ${fechaProximoService}</span>
              <p style="font-size: 11px; color: #6b7280; margin: 2px 0 0 0;">Cálculo incluido (6 meses / 10.000 km)</p>
            </div>
          ` : ''}
          <p style="margin-top: 8px;">¿Querés enviar la confirmación del turno por <strong>WhatsApp</strong> al cliente (+${formattedPhone})?</p>
        </div>
      `,
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#25D366', // WhatsApp green
      cancelButtonColor: '#6B7280',
      confirmButtonText: '📱 Sí, enviar WhatsApp',
      cancelButtonText: 'Solo guardar',
    }).then((res) => {
      if (res.isConfirmed) {
        window.open(wappUrlConfirmacion, '_blank', 'noopener,noreferrer');
      }

      // ── Segundo diálogo: SOLO si se seleccionó lubricentro se ofrece el recordatorio de próximo service ──
      if (esLubricentro && fechaProximoService) {
        Swal.fire({
          title: '🔧 Recordatorio de Próximo Service',
          html: `
            <div style="text-align: left; font-size: 14px; line-height: 1.6;">
              <p>El próximo service sugerido para <strong>${form.modelo}</strong> (<strong>${form.patente.toUpperCase()}</strong>) es:</p>
              <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 12px 16px; margin: 12px 0; text-align: center;">
                <span style="font-size: 22px; font-weight: bold; color: #16a34a;">📅 ${fechaProximoService}</span>
                <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">6 meses / 10.000 km (lo que ocurra primero)</p>
              </div>
              <p>¿Querés enviarle además un mensaje específico de <strong>recordatorio de service por WhatsApp</strong>?</p>
            </div>
          `,
          icon: 'info',
          showCancelButton: true,
          confirmButtonColor: '#25D366',
          cancelButtonColor: '#6B7280',
          confirmButtonText: '📱 Enviar recordatorio',
          cancelButtonText: 'No enviar',
          customClass: {
            popup: 'swal2-popup-wide',
          },
        }).then((resRecordatorio) => {
          if (resRecordatorio.isConfirmed) {
            window.open(wappUrlRecordatorio, '_blank', 'noopener,noreferrer');
          }
          resetAndClose();
        });
      } else {
        // NO es lubricentro: no hay segundo diálogo ni cálculo de service
        resetAndClose();
      }
    });
  };

  // Enviar recordatorio de próximo service desde la tarjeta del turno
  const handleSendRecordatorioService = (apt) => {
    if (!apt.telefono) {
      Swal.fire({
        title: 'Sin teléfono',
        text: 'Este turno no tiene un teléfono registrado.',
        icon: 'warning',
        confirmButtonColor: '#F97316',
      });
      return;
    }

    const session = getSession();
    const tallerName = session?.nombreTaller || 'nuestro taller';
    const tallerTelefono = session?.telefono || '';
    const formattedPhone = formatWhatsAppNumber(apt.telefono);
    const fechaService = apt.proximoService || (apt.fecha ? formatDateDMY(calcularProximoService(apt.fecha)) : '');

    const mensajeRecordatorio = `Hola ${apt.nombre},\n\nDesde *${tallerName}* te recordamos que el próximo service para tu vehículo *${apt.modelo}* (Patente: *${apt.patente.toUpperCase()}*) está programado aproximadamente para:\n\n🔧 *${fechaService}* (en 6 meses / 10.000 km)\n\n📌 Te recomendamos agendar tu turno con anticipación para mantener tu auto en óptimas condiciones.\n\n${tallerTelefono ? `📞 Contacto: ${tallerTelefono}\n\n` : ''}¡Gracias por confiar en nosotros!`;

    const url = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(mensajeRecordatorio)}`;

    Swal.fire({
      title: '🔧 Recordatorio de Próximo Service',
      html: `
        <div style="text-align: left; font-size: 14px; line-height: 1.6;">
          <p>Enviar recordatorio de service a <strong>${apt.nombre}</strong> (${apt.patente.toUpperCase()}):</p>
          <div style="background: #f0fdf4; border: 1px solid #86efac; border-radius: 12px; padding: 12px 16px; margin: 12px 0; text-align: center;">
            <span style="font-size: 20px; font-weight: bold; color: #16a34a;">📅 ${fechaService}</span>
            <p style="font-size: 12px; color: #6b7280; margin-top: 4px;">6 meses / 10.000 km</p>
          </div>
          <p>¿Abrir WhatsApp con el recordatorio para el número <strong>+${formattedPhone}</strong>?</p>
        </div>
      `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonColor: '#25D366',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '📱 Abrir WhatsApp',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isConfirmed) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
    });
  };

  const handleDelete = (id, nombre) => {
    Swal.fire({
      title: '¿Eliminar turno?',
      text: `Se eliminará el turno de ${nombre}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((res) => {
      if (res.isConfirmed) {
        deleteAppointment(id);
        loadAppointments();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'info',
          title: 'Turno eliminado',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  const formatDateDisplay = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Lógica para construir la grilla del calendario mensual
  const generateCalendarDays = () => {
    const firstDay = new Date(calYear, calMonth, 1);
    const lastDay = new Date(calYear, calMonth + 1, 0);

    const startingDayOfWeek = firstDay.getDay(); // 0 = Dom, 1 = Lun ...
    const totalDays = lastDay.getDate();

    const daysArray = [];

    // Días vacíos del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      daysArray.push(null);
    }

    // Días del mes actual
    for (let day = 1; day <= totalDays; day++) {
      const monthStr = String(calMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const fullDateStr = `${calYear}-${monthStr}-${dayStr}`;
      const count = countAppointmentsByDate(fullDateStr);
      daysArray.push({
        dayNumber: day,
        dateStr: fullDateStr,
        turnosCount: count,
      });
    }

    return daysArray;
  };

  const handlePrevMonth = () => {
    if (calMonth === 0) {
      setCalMonth(11);
      setCalYear(calYear - 1);
    } else {
      setCalMonth(calMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (calMonth === 11) {
      setCalMonth(0);
      setCalYear(calYear + 1);
    } else {
      setCalMonth(calMonth + 1);
    }
  };

  const turnosRestantes = MAX_TURNOS - appointments.length;
  const calendarDays = generateCalendarDays();

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Indicador de sincronización */}
      {syncing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2 animate-fadeIn">
          <span className="animate-spin text-lg">⏳</span> Sincronizando datos desde la nube...
        </div>
      )}
      {/* Header con controles de fecha y calendario */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-grayDark">Turnos del Día</h2>
          <p className="text-sm text-gray-500 mt-1 capitalize">{formatDateDisplay(selectedDate)}</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Botón para abrir Modal de Calendario */}
          <button
            onClick={() => setShowCalendarModal(true)}
            className="flex items-center gap-2 px-3 py-2 bg-brand-blue/10 hover:bg-brand-blue/20 text-brand-blue font-semibold rounded-lg text-sm transition-colors border border-brand-blue/30"
          >
            <span>📅</span> Elegir en Calendario
          </button>

          {/* Selector date tradicional */}
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none text-sm bg-white"
          />

          <button
            onClick={() => {
              setSelectedDate(today);
              setCalYear(new Date(today).getFullYear());
              setCalMonth(new Date(today).getMonth());
            }}
            className="px-3 py-2 text-sm text-brand-blue hover:text-blue-800 font-semibold transition-colors bg-white rounded-lg border border-gray-200 shadow-sm"
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Indicador de disponibilidad */}
      <div className="bg-white rounded-xl shadow-md p-4 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${
            turnosRestantes === 0 ? 'bg-red-500' : turnosRestantes <= 2 ? 'bg-brand-orange' : 'bg-brand-green'
          }`}>
            {appointments.length}
          </div>
          <div>
            <p className="font-bold text-brand-grayDark">
              {appointments.length} de {MAX_TURNOS} turnos ocupados
            </p>
            <p className="text-sm text-gray-500">
              {turnosRestantes === 0
                ? 'Día completo — no hay turnos disponibles'
                : `${turnosRestantes} ${turnosRestantes === 1 ? 'turno disponible' : 'turnos disponibles'}`}
            </p>
          </div>
        </div>

        {/* Barra de progreso */}
        <div className="w-full sm:w-48 bg-gray-200 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-500 ${
              turnosRestantes === 0 ? 'bg-red-500' : turnosRestantes <= 2 ? 'bg-brand-orange' : 'bg-brand-green'
            }`}
            style={{ width: `${(appointments.length / MAX_TURNOS) * 100}%` }}
          ></div>
        </div>

        <button
          onClick={() => {
            if (turnosRestantes === 0) {
              Swal.fire({ title: 'Día completo', text: 'No hay más turnos disponibles para este día.', icon: 'warning', confirmButtonColor: '#F97316' });
            } else {
              setForm({ nombre: '', patente: '', modelo: '', hora: availableHours[0] || '09:00', telefono: '', servicios: [] });
              setShowModal(true);
            }
          }}
          disabled={turnosRestantes === 0}
          className={`px-6 py-2 font-bold rounded-lg transition-colors shadow-md whitespace-nowrap ${
            turnosRestantes === 0
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-brand-blue hover:bg-blue-800 text-white'
          }`}
        >
          + Nuevo Turno
        </button>
      </div>

      {/* Lista de turnos */}
      {appointments.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">📅</div>
          <h3 className="text-xl font-semibold text-brand-grayDark mb-2">
            Sin turnos asignados para este día
          </h3>
          <p className="text-gray-500 mb-4">Hacé clic en "+ Nuevo Turno" o seleccioná otra fecha desde el calendario.</p>
          <button
            onClick={() => setShowCalendarModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue text-white font-medium rounded-lg shadow hover:bg-blue-800 transition-colors text-sm"
          >
            <span>📅</span> Explorar fechas en Calendario
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {appointments.map((apt, idx) => (
            <div
              key={apt.id}
              className="bg-white rounded-xl shadow-md p-5 border-l-4 border-brand-blue hover:shadow-lg transition-all duration-300 animate-slideUp flex flex-col justify-between"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="bg-brand-blue text-white rounded-lg px-3 py-2 text-center min-w-[60px]">
                      <span className="text-lg font-bold">{apt.hora}</span>
                    </div>
                    <div>
                      <h3 className="font-bold text-brand-grayDark text-lg">{apt.nombre}</h3>
                      <p className="text-sm text-gray-500">{apt.modelo}</p>
                      <p className="text-sm font-semibold text-brand-blue uppercase mt-1">{apt.patente}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDelete(apt.id, apt.nombre)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg p-2 transition-colors"
                    title="Eliminar turno"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>

                {/* Checklist de servicios solicitados */}
                {apt.servicios && apt.servicios.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                      <span>🛠️</span> Servicios:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {apt.servicios.map((srv, sIdx) => (
                        <span
                          key={sIdx}
                          className="inline-flex items-center text-xs px-2.5 py-1 bg-blue-50 text-brand-blue font-semibold rounded-lg border border-blue-200 shadow-sm"
                        >
                          ✓ {srv}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Cálculo de próximo service (SOLO si fue lubricentro y tiene fecha calculada) */}
                {apt.proximoService && (
                  <div className="mt-2.5 pt-2 border-t border-gray-100 flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 text-xs text-green-700 font-semibold bg-green-50 px-2.5 py-1 rounded-md border border-green-200">
                      <span>🔧</span> Próx. Service: {apt.proximoService}
                    </span>
                  </div>
                )}
              </div>

              {/* Acceso directo a WhatsApp si tiene teléfono */}
              {apt.telefono && (
                <div className="mt-3 pt-2 border-t border-gray-50 flex flex-wrap gap-2 justify-end items-center">
                  <a
                    href={`https://wa.me/${formatWhatsAppNumber(apt.telefono)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-green-700 hover:text-green-800 font-semibold bg-green-50 hover:bg-green-100 px-3 py-1.5 rounded-md transition-colors border border-green-200 shadow-sm"
                    title="Abrir chat en WhatsApp"
                  >
                    <span>📱</span> WhatsApp ({apt.telefono})
                  </a>
                  {apt.proximoService && (
                    <button
                      type="button"
                      onClick={() => handleSendRecordatorioService(apt)}
                      className="inline-flex items-center gap-1.5 text-xs text-brand-blue hover:text-blue-800 font-semibold bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-md transition-colors border border-blue-200 shadow-sm"
                      title="Enviar recordatorio de próximo service por WhatsApp"
                    >
                      <span>🔧</span> Avisar Próx. Service
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL — CALENDARIO INTERACTIVO */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowCalendarModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6 border-t-4 border-brand-blue animate-slideUp"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header del Calendario */}
            <div className="flex justify-between items-center mb-6 border-b border-gray-200 pb-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">📅</span>
                <div>
                  <h3 className="text-xl font-bold text-brand-grayDark">Calendario de Turnos</h3>
                  <p className="text-xs text-gray-500">Seleccioná un día para ver o agendar turnos</p>
                </div>
              </div>
              <button onClick={() => setShowCalendarModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl font-bold px-2">&times;</button>
            </div>

            {/* Controles de Navegación de Mes */}
            <div className="flex justify-between items-center mb-4 bg-gray-50 p-2.5 rounded-xl border border-gray-200">
              <button
                onClick={handlePrevMonth}
                className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 transition-colors"
              >
                ◀ Mes Anterior
              </button>
              <h4 className="font-bold text-brand-blue text-lg">
                {MONTH_NAMES[calMonth]} {calYear}
              </h4>
              <button
                onClick={handleNextMonth}
                className="px-3 py-1 bg-white hover:bg-gray-100 border border-gray-300 rounded-lg text-sm font-bold text-gray-700 transition-colors"
              >
                Mes Siguiente ▶
              </button>
            </div>

            {/* Grilla de días de la semana */}
            <div className="grid grid-cols-7 gap-1 text-center font-bold text-xs text-gray-500 mb-2">
              {DAY_NAMES.map(d => (
                <div key={d} className="py-1">{d}</div>
              ))}
            </div>

            {/* Grilla de Días del Mes */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, idx) => {
                if (!item) {
                  return <div key={`empty-${idx}`} className="h-14 bg-gray-50/50 rounded-lg"></div>;
                }

                const isSelected = item.dateStr === selectedDate;
                const isToday = item.dateStr === today;
                const isFull = item.turnosCount >= MAX_TURNOS;

                return (
                  <button
                    key={item.dateStr}
                    onClick={() => {
                      setSelectedDate(item.dateStr);
                      setShowCalendarModal(false);
                    }}
                    className={`h-14 p-1 rounded-xl flex flex-col justify-between items-center transition-all border text-xs font-semibold relative ${
                      isSelected
                        ? 'bg-brand-blue text-white border-brand-blue shadow-md scale-105 z-10'
                        : isToday
                        ? 'bg-blue-50 text-brand-blue border-brand-blue/50 hover:bg-blue-100'
                        : 'bg-white text-gray-700 border-gray-200 hover:border-brand-blue hover:bg-blue-50/50'
                    }`}
                  >
                    <span className={`text-xs font-bold ${isSelected ? 'text-white' : ''}`}>
                      {item.dayNumber}
                    </span>

                    {/* Insignia de turnos ocupados */}
                    {item.turnosCount > 0 ? (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isSelected
                          ? 'bg-white text-brand-blue'
                          : isFull
                          ? 'bg-red-500 text-white'
                          : 'bg-brand-green text-white'
                      }`}>
                        {item.turnosCount}/{MAX_TURNOS}
                      </span>
                    ) : (
                      <span className="text-[9px] text-gray-400 font-normal">libre</span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-6 flex justify-between items-center text-xs text-gray-500 border-t pt-3">
              <div className="flex gap-3">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-green"></span> Con turnos</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500"></span> Día lleno</span>
              </div>
              <button
                onClick={() => setShowCalendarModal(false)}
                className="px-4 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-bold text-xs transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL — Nuevo Turno */}
      {showModal && (
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4 animate-fadeIn overflow-y-auto" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 border-t-4 border-brand-blue animate-slideUp my-auto max-h-[92vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-brand-grayDark">Nuevo Turno</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
            </div>

            <form onSubmit={handleAddAppointment} className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Fecha</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Nombre del Cliente</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="Nombre y Apellido"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Patente</label>
                <input
                  type="text"
                  value={form.patente}
                  onChange={(e) => setForm({ ...form, patente: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none uppercase"
                  placeholder="Ej: AB 123 CD"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">
                  Teléfono (WhatsApp) <span className="text-xs font-normal text-gray-500">(opcional para avisos)</span>
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="Ej: 3511234567 (código de área + número)"
                />
                {form.telefono && form.telefono.trim().replace(/\D/g, '').length >= 6 && (
                  <p className="text-[11px] text-green-600 mt-1 flex items-center gap-1 font-medium">
                    <span>📱</span> Número WhatsApp: +{formatWhatsAppNumber(form.telefono)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Modelo del Auto</label>
                <input
                  type="text"
                  value={form.modelo}
                  onChange={(e) => setForm({ ...form, modelo: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="Ej: Toyota Corolla 2020"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Horario</label>
                <select
                  value={form.hora}
                  onChange={(e) => setForm({ ...form, hora: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  required
                >
                  {availableHours.map((h) => (
                    <option key={h} value={h}>{h} hs</option>
                  ))}
                </select>
              </div>

              {/* Checklist de Servicios / Motivo del Turno */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-sm font-bold text-brand-grayDark">
                    Servicios solicitados <span className="text-xs font-normal text-gray-500">(Checklist)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleSelectAllServicios}
                    className="text-xs text-brand-blue hover:text-blue-800 font-semibold transition-colors"
                  >
                    {form.servicios?.length === SERVICIOS_TURNOS.length ? 'Deseleccionar todos' : 'Marcar todos'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mb-2">Elegí una o varias opciones para este turno:</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 bg-gray-50 p-3 rounded-xl border border-gray-200 max-h-48 overflow-y-auto">
                  {SERVICIOS_TURNOS.map((srv) => {
                    const isChecked = form.servicios?.includes(srv);
                    return (
                      <label
                        key={srv}
                        className={`flex items-center gap-2.5 p-2 rounded-lg cursor-pointer text-xs font-semibold transition-all select-none border ${
                          isChecked
                            ? 'bg-blue-50 border-brand-blue text-brand-blue shadow-sm ring-1 ring-brand-blue/30'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleServicio(srv)}
                          className="w-4 h-4 text-brand-blue rounded border-gray-300 focus:ring-brand-blue cursor-pointer"
                        />
                        <span className="truncate">{srv}</span>
                      </label>
                    );
                  })}
                </div>

                {/* Aviso visual en vivo cuando se selecciona Lubricentro */}
                {form.servicios?.some((s) => s.toLowerCase().includes('lubricentro')) && (
                  <div className="mt-2.5 bg-green-50 border border-green-200 rounded-lg p-2.5 flex items-center justify-between text-xs text-green-800 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🛢️</span>
                      <div>
                        <span className="font-bold">Service Lubricentro seleccionado:</span>
                        <span className="text-gray-600 block text-[11px]">
                          Se calculará el próximo service para el <strong>{formatDateDMY(calcularProximoService(selectedDate))}</strong> (en 6 meses)
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] bg-green-600 text-white font-bold px-2 py-0.5 rounded-full uppercase">
                      Activo
                    </span>
                  </div>
                )}

                {form.servicios && form.servicios.length > 0 && (
                  <div className="flex justify-between items-center text-xs mt-1.5">
                    <span className="text-brand-blue font-semibold">
                      ✓ {form.servicios.length} de {SERVICIOS_TURNOS.length} seleccionados
                    </span>
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({ ...prev, servicios: [] }))}
                      className="text-gray-400 hover:text-red-500 underline text-[11px]"
                    >
                      Limpiar selección
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border-2 border-gray-300 text-gray-600 font-bold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-brand-green hover:bg-green-600 text-white font-bold rounded-lg shadow-md transition-colors"
                >
                  Guardar Turno
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;
