// src/firebase/config.js
import { initializeApp, getApps } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
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

// ─── FIREBASE AUTH — Autenticación Segura Multi-Dispositivo ──────────
// Cada taller se vincula a una cuenta de Firebase Authentication
// (Email/Password), permitiendo que el taller inicie sesión en PC o
// celular manteniendo el mismo UID y acceso exclusivo a sus datos.

let authReadyResolver;
const authReadyPromise = new Promise((resolve) => {
  authReadyResolver = resolve;
});

if (auth) {
  onAuthStateChanged(auth, (user) => {
    if (authReadyResolver) {
      authReadyResolver(user);
    }
  });
}

/**
 * Espera a que Firebase Auth resuelva el estado de sesión actual.
 */
export async function waitForAuth() {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  return authReadyPromise;
}

/**
 * Obtiene el UID actual autenticado en Firebase (o null si no hay sesión).
 */
export function getCurrentUid() {
  return auth?.currentUser?.uid || null;
}

/**
 * Normaliza un identificador de taller (usuario o email) a un email para Firebase Auth.
 */
export function resolveAuthEmail(identifier) {
  if (!identifier) return null;
  const clean = identifier.trim().toLowerCase();
  if (clean.includes('@')) return clean;
  return `${clean.replace(/[^a-z0-9]/g, '')}@autocheck360.com`;
}

/**
 * Autentica o crea el usuario en Firebase Authentication.
 * Garantiza un UID único y persistente para las reglas de Cloud Firestore.
 */
export async function signInOrCreateFirebaseAuth(usernameOrEmail, password) {
  if (!auth) return null;
  const authEmail = resolveAuthEmail(usernameOrEmail);
  const securePassword = password || 'Taller12!';

  try {
    // 1. Intentar iniciar sesión si la cuenta ya existe
    const cred = await signInWithEmailAndPassword(auth, authEmail, securePassword);
    console.log("Firebase Auth: sesión iniciada para UID:", cred.user.uid);
    return cred.user.uid;
  } catch (err) {
    // Si no existe, crear la cuenta de Firebase Auth automáticamente
    if (
      err.code === 'auth/user-not-found' ||
      err.code === 'auth/invalid-credential' ||
      err.code === 'auth/invalid-login-credentials'
    ) {
      try {
        const newCred = await createUserWithEmailAndPassword(auth, authEmail, securePassword);
        console.log("Firebase Auth: cuenta creada con UID:", newCred.user.uid);
        return newCred.user.uid;
      } catch (createErr) {
        // Si ya existía con otra contraseña o credencial inválida, reintentar sign-in
        if (createErr.code === 'auth/email-already-in-use') {
          console.warn("Firebase Auth: el email ya existía pero la clave no coincidió.");
        } else {
          console.warn("Firebase Auth: error al crear usuario:", createErr.code, createErr.message);
        }
        return null;
      }
    }
    console.warn("Firebase Auth error:", err.code, err.message);
    return null;
  }
}

/**
 * Asegura que haya una sesión activa en Firebase Auth vinculada a la sesión del taller.
 */
export async function ensureSessionAuth(session) {
  if (!auth || !session?.usuario) return null;
  if (auth.currentUser) return auth.currentUser.uid;
  const existing = await waitForAuth();
  if (existing) return existing.uid;
  return signInOrCreateFirebaseAuth(
    session.email || session.usuario,
    session.password || 'Taller12!'
  );
}

/**
 * Cierra la sesión en Firebase Auth.
 */
export async function signOutFirebaseAuth() {
  if (!auth) return;
  try {
    await signOut(auth);
    console.log("Firebase Auth: sesión cerrada.");
  } catch (err) {
    console.warn("Error cerrando sesión Firebase:", err);
  }
}

// ─── WORKSHOPS (talleres/usuarios) ─────────────────────────

export async function saveWorkshopToFirestore(workshop) {
  if (!db || !workshop?.usuario) return false;
  try {
    const uid = getCurrentUid();
    const docRef = doc(db, "workshops", workshop.usuario.toLowerCase());
    const payload = {
      ...workshop,
      updatedAt: new Date().toISOString()
    };
    if (uid) {
      payload.uid = uid;
    }
    await setDoc(docRef, payload, { merge: true });
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
