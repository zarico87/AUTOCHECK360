// src/utils/storage.js
// Capa de abstracción sobre localStorage — integrada con correlativo de órdenes, respaldo y registros de talleres

const ORDERS_KEY = 'autocheck360_orders';
const APPOINTMENTS_KEY = 'autocheck360_appointments';
const SESSION_KEY = 'autocheck360_session';
const ORDER_COUNTER_KEY = 'autocheck360_order_counter';
const REGISTERED_WORKSHOPS_KEY = 'autocheck360_registered_workshops';

const INITIAL_ORDER_NUMBER = 1000;
const ORDER_LIMIT = 2000;

// ─── SESIÓN DE TALLER ─────────────────────────────────────
export const getSession = () => {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
};

export const setSession = (sessionData) => {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(sessionData));
  } catch (err) {
    console.error('Error al guardar la sesión:', err);
  }
};

export const clearSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

// ─── TALLERES Y USUARIOS REGISTRADOS ─────────────────────
import { saveWorkshopToFirestore } from '../firebase/config';

export const getRegisteredWorkshops = () => {
  try {
    const data = localStorage.getItem(REGISTERED_WORKSHOPS_KEY);
    if (data) return JSON.parse(data);
    // Usuarios / talleres demo por defecto con contraseñas por defecto
    const defaultWorkshops = [
      { usuario: 'taller1', password: 'Taller12!', nombreTaller: 'Taller Mecánico Central', domicilio: 'Av. Colón 1234, Córdoba', telefono: '351-1234567', cuit: '20-30123456-7', email: 'contacto@tallercentral.com' },
      { usuario: 'admin', password: 'Admin360!', nombreTaller: 'AutoCheck 360 Admin', domicilio: 'Calle Principal 500, Córdoba', telefono: '351-9998877', cuit: '20-99988776-5', email: 'admin@autocheck360.com' },
      { usuario: 'mecanico', password: 'Mecanico12!', nombreTaller: 'Taller Mecánica Intangible', domicilio: 'Av. Patria 890, Córdoba', telefono: '351-4445566', cuit: '20-44455667-8', email: 'mecanico@taller.com' },
    ];
    localStorage.setItem(REGISTERED_WORKSHOPS_KEY, JSON.stringify(defaultWorkshops));
    defaultWorkshops.forEach(w => saveWorkshopToFirestore(w));
    return defaultWorkshops;
  } catch {
    return [];
  }
};

export const getWorkshopByUsernameOrEmail = (query) => {
  if (!query) return null;
  const clean = query.trim().toLowerCase();
  const workshops = getRegisteredWorkshops();
  return workshops.find(w => 
    (w.usuario && w.usuario.toLowerCase() === clean) || 
    (w.email && w.email.toLowerCase() === clean)
  ) || null;
};

export const isUserRegistered = (username) => {
  return Boolean(getWorkshopByUsernameOrEmail(username));
};

export const authenticateUser = (usernameOrEmail, password) => {
  const workshop = getWorkshopByUsernameOrEmail(usernameOrEmail);
  if (!workshop) return { success: false, error: 'USER_NOT_FOUND' };
  
  // Si el usuario no tiene password grabado aún, aceptar password válido
  if (workshop.password && workshop.password !== password) {
    return { success: false, error: 'INVALID_PASSWORD' };
  }
  
  return { success: true, workshop };
};

export const addRegisteredWorkshop = (workshopData) => {
  const workshops = getRegisteredWorkshops();
  const usuarioGenerado = workshopData.usuario || workshopData.nombreTaller.toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 8) || 'taller';
  const newWorkshop = {
    ...workshopData,
    usuario: usuarioGenerado,
    password: workshopData.password || 'Taller12!',
    registradoEn: new Date().toISOString(),
  };

  // Reemplazar si ya existía el usuario, o agregar
  const existingIdx = workshops.findIndex(w => w.usuario?.toLowerCase() === usuarioGenerado.toLowerCase());
  if (existingIdx >= 0) {
    workshops[existingIdx] = newWorkshop;
  } else {
    workshops.push(newWorkshop);
  }

  localStorage.setItem(REGISTERED_WORKSHOPS_KEY, JSON.stringify(workshops));
  saveWorkshopToFirestore(newWorkshop);
  return newWorkshop;
};

export const updateWorkshopPassword = (usuario, currentPassword, newPassword) => {
  const workshops = getRegisteredWorkshops();
  const index = workshops.findIndex(w => w.usuario?.toLowerCase() === usuario.toLowerCase());
  
  if (index === -1) {
    return { success: false, message: 'Usuario no encontrado.' };
  }

  const currentStoredPass = workshops[index].password;
  if (currentStoredPass && currentStoredPass !== currentPassword) {
    return { success: false, message: 'La contraseña actual ingresada es incorrecta.' };
  }

  workshops[index].password = newPassword;
  localStorage.setItem(REGISTERED_WORKSHOPS_KEY, JSON.stringify(workshops));
  saveWorkshopToFirestore(workshops[index]);

  // Actualizar también la sesión si coincide
  const session = getSession();
  if (session && session.usuario?.toLowerCase() === usuario.toLowerCase()) {
    setSession({
      ...session,
      password: newPassword
    });
  }

  return { success: true, workshop: workshops[index] };
};

export const updateWorkshopProfile = (usuario, updatedFields) => {
  const workshops = getRegisteredWorkshops();
  const index = workshops.findIndex(w => w.usuario?.toLowerCase() === usuario.toLowerCase());

  if (index === -1) {
    return { success: false, message: 'Usuario no encontrado.' };
  }

  workshops[index] = {
    ...workshops[index],
    ...updatedFields
  };

  localStorage.setItem(REGISTERED_WORKSHOPS_KEY, JSON.stringify(workshops));
  saveWorkshopToFirestore(workshops[index]);

  // Actualizar sesión activa
  const session = getSession();
  if (session && session.usuario?.toLowerCase() === usuario.toLowerCase()) {
    setSession({
      ...session,
      ...updatedFields,
      nombreTaller: updatedFields.nombreTaller || session.nombreTaller,
      email: updatedFields.email || session.email,
      telefono: updatedFields.telefono || session.telefono,
      domicilio: updatedFields.domicilio || session.domicilio,
      cuit: updatedFields.cuit || session.cuit,
    });
  }

  return { success: true, workshop: workshops[index] };
};

export const resetUserPassword = (identifier) => {
  const workshop = getWorkshopByUsernameOrEmail(identifier);
  if (!workshop) {
    return { success: false, message: 'No se encontró ningún taller registrado con este usuario o email.' };
  }

  return {
    success: true,
    workshop,
    user: workshop.usuario,
    password: workshop.password || 'Taller12!',
    email: workshop.email,
  };
};

// ─── CORRELATIVO DE ÓRDENES ──────────────────────────────
export const getNextOrderNumber = () => {
  const session = getSession();
  const usuario = session?.usuario ? session.usuario.toLowerCase() : 'default';
  const counterKey = `${ORDER_COUNTER_KEY}_${usuario}`;

  let counter = localStorage.getItem(counterKey);
  if (!counter) {
    counter = INITIAL_ORDER_NUMBER;
  } else {
    counter = parseInt(counter, 10) + 1;
  }
  localStorage.setItem(counterKey, counter.toString());
  return String(counter).padStart(8, '0');
};

// ─── Helpers Generales ──────────────────────────────────
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

const getCollection = (key) => {
  try {
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

const saveCollection = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

// ─── ÓRDENES DE TRABAJO ─────────────────────────────────
export const getOrders = () => getCollection(ORDERS_KEY);

export const getOrderById = (id) => {
  const orders = getOrders();
  return orders.find(o => o.id === id || o.numeroOrden === id) || null;
};

export const addOrder = (orderData) => {
  const orders = getOrders();
  const orderNum = getNextOrderNumber();
  const newOrder = {
    id: orderNum,
    numeroOrden: orderNum,
    ...orderData,
    estado: 'pendiente',
    fechaCreacion: new Date().toISOString(),
    fechaCompletado: null,
  };
  orders.push(newOrder);
  saveCollection(ORDERS_KEY, orders);

  // Verificar si alcanzó el límite de 2000 órdenes
  if (orders.length >= ORDER_LIMIT) {
    notifyOrderLimitReached(orders.length);
  }

  return newOrder;
};

export const updateOrder = (id, updates) => {
  const orders = getOrders();
  const index = orders.findIndex(o => o.id === id || o.numeroOrden === id);
  if (index === -1) return null;
  orders[index] = { ...orders[index], ...updates };
  saveCollection(ORDERS_KEY, orders);
  return orders[index];
};

export const markOrderCompleted = (id) => {
  return updateOrder(id, {
    estado: 'listo',
    fechaCompletado: new Date().toISOString(),
  });
};

export const deleteOrder = (id) => {
  const orders = getOrders().filter(o => o.id !== id && o.numeroOrden !== id);
  saveCollection(ORDERS_KEY, orders);
};

export const clearAllOrders = () => {
  saveCollection(ORDERS_KEY, []);
};

export const getPendingOrders = () => {
  return getOrders().filter(o => o.estado === 'pendiente' || o.estado === 'en_proceso');
};

export const getCompletedOrders = () => {
  return getOrders()
    .filter(o => o.estado === 'listo')
    .sort((a, b) => new Date(b.fechaCompletado) - new Date(a.fechaCompletado));
};

// ─── EXPORTACIÓN Y RESPALDO ──────────────────────────────
export const exportOrdersBackup = () => {
  const orders = getOrders();
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(orders, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `AutoCheck360_Respaldo_Ordenes_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
};

export const notifyOrderLimitReached = (totalCount) => {
  // Notificación progresiva / SweetAlert
  if (typeof window !== 'undefined' && window.Swal) {
    window.Swal.fire({
      title: '⚠️ Límite de Órdenes Alcanzado',
      html: `Se han acumulado <b>${totalCount} órdenes</b> de trabajo en el sistema (límite recomendado: 2000).<br/><br/>¿Deseas descargar una copia de seguridad o eliminar el historial antiguo?`,
      icon: 'warning',
      showCancelButton: true,
      showDenyButton: true,
      confirmButtonColor: '#1E40AF',
      denyButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: '💾 Descargar Respaldo JSON',
      denyButtonText: '🗑️ Vaciar Historial de Órdenes',
      cancelButtonText: 'Más tarde',
    }).then((result) => {
      if (result.isConfirmed) {
        exportOrdersBackup();
        window.Swal.fire('Respaldo Descargado', 'El archivo JSON se ha guardado en tu equipo.', 'success');
      } else if (result.isDenied) {
        window.Swal.fire({
          title: '¿Confirmar eliminación?',
          text: 'Esta acción borrará todas las órdenes registradas de la memoria local.',
          icon: 'warning',
          showCancelButton: true,
          confirmButtonColor: '#EF4444',
          confirmButtonText: 'Sí, eliminar todo',
          cancelButtonText: 'Cancelar'
        }).then((res) => {
          if (res.isConfirmed) {
            clearAllOrders();
            window.Swal.fire('Órdenes Eliminadas', 'Se ha reiniciado el registro de órdenes.', 'info');
          }
        });
      }
    });
  }
};

// ─── TURNOS ─────────────────────────────────────────────
export const getAppointments = () => getCollection(APPOINTMENTS_KEY);

export const getAppointmentsByDate = (dateStr) => {
  return getAppointments()
    .filter(a => a.fecha === dateStr)
    .sort((a, b) => a.hora.localeCompare(b.hora));
};

export const countAppointmentsByDate = (dateStr) => {
  return getAppointmentsByDate(dateStr).length;
};

export const addAppointment = (appointmentData) => {
  const appointments = getAppointments();
  const count = appointments.filter(a => a.fecha === appointmentData.fecha).length;

  if (count >= 8) {
    return { error: 'Se alcanzó el máximo de 8 turnos para este día.' };
  }

  const newAppointment = {
    id: generateId(),
    ...appointmentData,
    creadoEn: new Date().toISOString(),
  };
  appointments.push(newAppointment);
  saveCollection(APPOINTMENTS_KEY, appointments);
  return newAppointment;
};

export const deleteAppointment = (id) => {
  const appointments = getAppointments().filter(a => a.id !== id);
  saveCollection(APPOINTMENTS_KEY, appointments);
};

// ─── SEED DATA ─────────────────────────────────────────
export const seedDemoData = () => {
  getRegisteredWorkshops(); // Inicializar usuarios registrados por defecto
  
  if (getOrders().length === 0) {
    const today = new Date().toISOString();
    const demoOrders = [
      {
        id: '00001000',
        numeroOrden: '00001000',
        patente: 'AB 123 CD',
        marcaModelo: 'Volkswagen Golf',
        nombre: 'Juan Pérez',
        telefono: '351-1234567',
        dni: '30123456',
        estado: 'en_proceso',
        fechaCreacion: today,
        fechaCompletado: null,
        checklistVisual: { cristales: true, nivelCombustible: true, detallesChapa: false },
        observacionesVisuales: 'Rayón en puerta derecha',
        checklistTrabajos: {
          limpiaparabrisas: true,
          serviceLubricentro: false,
          pastillasFreno: true,
          tablero: false,
          presupuesto: false,
          diagnosticoPc: true,
          anulacionDpfEgr: false,
          mecanicaLigera: false,
        },
        observacionesTrabajos: 'Revisar ruido al frenar',
        presupuesto: 45000,
      },
      {
        id: '00001001',
        numeroOrden: '00001001',
        patente: 'XYZ 987',
        marcaModelo: 'Toyota Hilux',
        nombre: 'María Gómez',
        telefono: '351-7654321',
        dni: '28765432',
        estado: 'pendiente',
        fechaCreacion: today,
        fechaCompletado: null,
        checklistVisual: { cristales: false, nivelCombustible: false, detallesChapa: false },
        observacionesVisuales: '',
        checklistTrabajos: {
          limpiaparabrisas: false,
          serviceLubricentro: true,
          pastillasFreno: false,
          tablero: false,
          presupuesto: false,
          diagnosticoPc: false,
          anulacionDpfEgr: false,
          mecanicaLigera: true,
        },
        observacionesTrabajos: '',
        presupuesto: 0,
      },
      {
        id: '00001002',
        numeroOrden: '00001002',
        patente: 'AE 456 FG',
        marcaModelo: 'Ford Fiesta',
        nombre: 'Carlos López',
        telefono: '351-9876543',
        dni: '35987654',
        estado: 'listo',
        fechaCreacion: new Date(Date.now() - 86400000).toISOString(),
        fechaCompletado: today,
        checklistVisual: { cristales: true, nivelCombustible: true, detallesChapa: true },
        observacionesVisuales: 'Sin observaciones',
        checklistTrabajos: {
          limpiaparabrisas: true,
          serviceLubricentro: true,
          pastillasFreno: true,
          tablero: true,
          presupuesto: true,
          diagnosticoPc: false,
          anulacionDpfEgr: false,
          mecanicaLigera: false,
        },
        observacionesTrabajos: 'Service completo realizado',
        presupuesto: 72000,
      },
    ];
    saveCollection(ORDERS_KEY, demoOrders);
    localStorage.setItem(ORDER_COUNTER_KEY, '1002');
  }

  if (getAppointments().length === 0) {
    const todayStr = new Date().toISOString().split('T')[0];
    const demoAppointments = [
      { id: generateId(), nombre: 'Roberto Díaz', patente: 'AC 789 EF', modelo: 'Chevrolet Cruze', fecha: todayStr, hora: '09:00', creadoEn: new Date().toISOString() },
      { id: generateId(), nombre: 'Laura Martínez', patente: 'BD 321 GH', modelo: 'Fiat Cronos', fecha: todayStr, hora: '10:30', creadoEn: new Date().toISOString() },
      { id: generateId(), nombre: 'Pedro Sánchez', patente: 'CE 654 IJ', modelo: 'Renault Sandero', fecha: todayStr, hora: '14:00', creadoEn: new Date().toISOString() },
    ];
    saveCollection(APPOINTMENTS_KEY, demoAppointments);
  }
};
