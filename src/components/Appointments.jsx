// src/components/Appointments.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getSession, getAppointmentsByDate, addAppointment, deleteAppointment, countAppointmentsByDate, syncAppointmentsFromFirestore } from '../utils/storage';

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

const Appointments = () => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [appointments, setAppointments] = useState(() => getAppointmentsByDate(today));
  const [showModal, setShowModal] = useState(false);
  const [showCalendarModal, setShowCalendarModal] = useState(false);
  const [form, setForm] = useState({ nombre: '', patente: '', modelo: '', hora: '09:00', telefono: '' });
  const [syncing, setSyncing] = useState(false);

  // Estado para la navegación del calendario mensual
  const [calYear, setCalYear] = useState(() => new Date(today).getFullYear());
  const [calMonth, setCalMonth] = useState(() => new Date(today).getMonth());

  const loadAppointments = React.useCallback(() => {
    setAppointments(getAppointmentsByDate(selectedDate));
  }, [selectedDate]);

  // Cargar inmediatamente turnos locales al cambiar de fecha
  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  // Sincronizar en segundo plano sin bloquear la pantalla al montar
  useEffect(() => {
    let isMounted = true;
    const init = async () => {
      try {
        await syncAppointmentsFromFirestore();
        if (isMounted) {
          loadAppointments();
        }
      } catch (err) {
        console.warn('Sync turnos error:', err);
      }
    };
    init();

    return () => {
      isMounted = false;
    };
  }, [loadAppointments]);

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

    const result = addAppointment({
      ...form,
      patente: form.patente.toUpperCase(),
      fecha: selectedDate,
    });

    if (result.error) {
      Swal.fire({ title: 'Error', text: result.error, icon: 'error', confirmButtonColor: '#F97316' });
      return;
    }

    const session = getSession();
    const tallerName = session?.nombreTaller || 'nuestro taller';

    // Formatear la fecha
    const [year, month, day] = selectedDate.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    // Construir mensaje de WhatsApp
    const mensaje = `Hola ${form.nombre},\n\nTenés un turno reservado en *${tallerName}*.\n\n📅 Fecha: *${fechaFormateada}*\n⏰ Hora: *${form.hora} hs.*\n🚗 Vehículo: *${form.modelo}* (Patente: *${form.patente.toUpperCase()}*)\n\n¡Te esperamos!`;
    const wappUrl = `https://wa.me/${form.telefono.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(mensaje)}`;

    Swal.fire({
      title: '¡Turno guardado!',
      text: '¿Querés enviar la confirmación por WhatsApp al cliente?',
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#25D366', // WhatsApp green
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, enviar WhatsApp',
      cancelButtonText: 'Solo guardar',
    }).then((res) => {
      if (res.isConfirmed) {
        window.open(wappUrl, '_blank');
      }
      setForm({ nombre: '', patente: '', modelo: '', hora: availableHours[0] || '09:00', telefono: '' });
      setShowModal(false);
      loadAppointments();
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
              setForm({ nombre: '', patente: '', modelo: '', hora: availableHours[0] || '09:00', telefono: '' });
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
              className="bg-white rounded-xl shadow-md p-5 border-l-4 border-brand-blue hover:shadow-lg transition-all duration-300 animate-slideUp"
              style={{ animationDelay: `${idx * 80}ms` }}
            >
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
        <div className="fixed inset-0 z-40 bg-black/50 flex items-center justify-center p-4 animate-fadeIn" onClick={() => setShowModal(false)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 border-t-4 border-brand-blue animate-slideUp"
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
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Teléfono (WhatsApp)</label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none"
                  placeholder="Ej: 3511234567 (código de área + número)"
                  required
                />
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
