// src/firebase/config.js
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, doc, setDoc, collection, getDocs } from "firebase/firestore";

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
    querySnapshot.forEach((doc) => {
      list.push(doc.data());
    });
    return list;
  } catch (e) {
    console.warn("Error al obtener talleres de Firestore:", e);
    return null;
  }
}

export { auth, db };
