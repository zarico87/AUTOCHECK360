// src/firebase/config.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  deleteDoc,
  collection,
  getDocs,
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

let app = null;
let auth = null;
let db = null;

const hasConfig = Boolean(
  firebaseConfig.apiKey &&
  firebaseConfig.projectId &&
  firebaseConfig.apiKey !== 'undefined'
);

try {
  if (hasConfig) {
    app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
    console.log("Firebase inicializado correctamente con el proyecto:", firebaseConfig.projectId);
  } else {
    console.log("Firebase no configurado aún (faltan variables VITE_FIREBASE_*). Operando en modo local.");
  }
} catch (err) {
  console.warn("Error al inicializar Firebase, operando en almacenamiento local:", err.message);
}

export const isFirebaseConfigured = () => Boolean(db);

// ─── WORKSHOPS (talleres/usuarios) ─────────────────────────

export async function saveWorkshopToFirestore(workshop) {
  if (!db || !workshop?.usuario) return false;
  try {
    const docRef = doc(db, "workshops", workshop.usuario.toLowerCase());
    await setDoc(docRef, {
      ...workshop,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Error al guardar en Firestore:", e);
    return false;
  }
}

export async function fetchWorkshopsFromFirestore() {
  if (!db) return null;
  try {
    const querySnapshot = await getDocs(collection(db, "workshops"));
    const list = [];
    querySnapshot.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (e) {
    console.warn("Error al obtener talleres de Firestore:", e);
    return null;
  }
}

// ─── ÓRDENES DE TRABAJO ────────────────────────────────────

/**
 * Guarda/actualiza una orden en Firestore bajo workshops/{usuario}/orders/{orderId}
 */
export async function saveOrderToFirestore(usuario, order) {
  if (!db || !usuario || !order?.id) return false;
  try {
    const docRef = doc(db, "workshops", usuario.toLowerCase(), "orders", order.id);
    await setDoc(docRef, {
      ...order,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Error al guardar orden en Firestore:", e);
    return false;
  }
}

/**
 * Elimina una orden de Firestore
 */
export async function deleteOrderFromFirestore(usuario, orderId) {
  if (!db || !usuario || !orderId) return false;
  try {
    const docRef = doc(db, "workshops", usuario.toLowerCase(), "orders", orderId);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.warn("Error al eliminar orden de Firestore:", e);
    return false;
  }
}

/**
 * Obtiene todas las órdenes del usuario desde Firestore
 */
export async function fetchOrdersFromFirestore(usuario) {
  if (!db || !usuario) return null;
  try {
    const colRef = collection(db, "workshops", usuario.toLowerCase(), "orders");
    const querySnapshot = await getDocs(colRef);
    const list = [];
    querySnapshot.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (e) {
    console.warn("Error al obtener órdenes de Firestore:", e);
    return null;
  }
}

// ─── TURNOS (Appointments) ─────────────────────────────────

/**
 * Guarda/actualiza un turno en Firestore bajo workshops/{usuario}/appointments/{id}
 */
export async function saveAppointmentToFirestore(usuario, appointment) {
  if (!db || !usuario || !appointment?.id) return false;
  try {
    const docRef = doc(db, "workshops", usuario.toLowerCase(), "appointments", appointment.id);
    await setDoc(docRef, {
      ...appointment,
      syncedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Error al guardar turno en Firestore:", e);
    return false;
  }
}

/**
 * Elimina un turno de Firestore
 */
export async function deleteAppointmentFromFirestore(usuario, appointmentId) {
  if (!db || !usuario || !appointmentId) return false;
  try {
    const docRef = doc(db, "workshops", usuario.toLowerCase(), "appointments", appointmentId);
    await deleteDoc(docRef);
    return true;
  } catch (e) {
    console.warn("Error al eliminar turno de Firestore:", e);
    return false;
  }
}

/**
 * Obtiene todos los turnos del usuario desde Firestore
 */
export async function fetchAppointmentsFromFirestore(usuario) {
  if (!db || !usuario) return null;
  try {
    const colRef = collection(db, "workshops", usuario.toLowerCase(), "appointments");
    const querySnapshot = await getDocs(colRef);
    const list = [];
    querySnapshot.forEach((d) => {
      list.push(d.data());
    });
    return list;
  } catch (e) {
    console.warn("Error al obtener turnos de Firestore:", e);
    return null;
  }
}

// ─── CORRELATIVO DE ÓRDENES EN FIRESTORE ───────────────────

/**
 * Guarda el contador de órdenes del usuario en Firestore
 */
export async function saveOrderCounterToFirestore(usuario, counter) {
  if (!db || !usuario) return false;
  try {
    const docRef = doc(db, "workshops", usuario.toLowerCase());
    await setDoc(docRef, { orderCounter: counter }, { merge: true });
    return true;
  } catch (e) {
    console.warn("Error al guardar contador de órdenes:", e);
    return false;
  }
}

/**
 * Obtiene el contador de órdenes del usuario desde Firestore
 */
export async function fetchOrderCounterFromFirestore(usuario) {
  if (!db || !usuario) return null;
  try {
    const docRef = doc(db, "workshops", usuario.toLowerCase());
    const snap = await getDoc(docRef);
    if (snap.exists() && snap.data().orderCounter !== undefined) {
      return snap.data().orderCounter;
    }
    return null;
  } catch (e) {
    console.warn("Error al obtener contador de órdenes:", e);
    return null;
  }
}

export { auth, db };
