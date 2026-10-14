import React, { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate, Outlet } from 'react-router-dom';
import Swal from 'sweetalert2';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkOrderForm from './components/WorkOrderForm';
import CompletedOrders from './components/CompletedOrders';
import Appointments from './components/Appointments';
import Profile from './components/Profile';
import WhatsAppButton from './components/WhatsAppButton';
import Logo from './components/Logo';
import { getSession, clearSession, syncWorkshopsFromFirestore, syncOrderCounterFromFirestore, syncOrdersFromFirestore, syncAppointmentsFromFirestore } from './utils/storage';
import { ensureSessionAuth } from './firebase/config';

// Global Sync Manager para mantener la sesión actualizada entre dispositivos (PC y móvil)
const SyncManager = () => {
  const session = getSession();
  const syncingRef = useRef(false);

  useEffect(() => {
    if (session && session.usuario) {
      const syncAll = async () => {
        if (syncingRef.current) return;
        syncingRef.current = true;
        try {
          // Asegurar que la sesión de Firebase Auth esté activa antes de sincronizar
          await ensureSessionAuth(session);
          // Sincronizar todos los datos críticos en background en paralelo
          await Promise.allSettled([
            syncWorkshopsFromFirestore(),
            syncOrderCounterFromFirestore(),
            syncOrdersFromFirestore(),
            syncAppointmentsFromFirestore()
          ]);
        } catch (error) {
          console.warn("Global sync error:", error);
        } finally {
          syncingRef.current = false;
        }
      };

      // Ejecutar sincronización inicial en background una sola vez
      syncAll();

      // Sincronizar cada vez que la pestaña del navegador vuelve a estar visible (con límite de frecuencia)
      let lastVisibleSync = Date.now();
      const handleVisibilityChange = () => {
        if (document.visibilityState === 'visible' && Date.now() - lastVisibleSync > 60000) {
          lastVisibleSync = Date.now();
          syncAll();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Sincronización periódica cada 2 minutos
      const intervalId = setInterval(() => {
        syncAll();
      }, 120000);

      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearInterval(intervalId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.usuario]);

  return null; // Este componente no renderiza nada visible
};

// Componente de Navegación separado para acceder a useLocation y useNavigate
const NavBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const path = location.pathname;
  const session = getSession();
  const nombreTaller = session?.nombreTaller || 'Taller Mecánico';

  const links = [
    { to: '/dashboard', label: 'Dashboard', icon: '📊' },
    { to: '/ordenes-listas', label: 'Órdenes Listas', icon: '✅' },
    { to: '/turnos', label: 'Turnos', icon: '📅' },
    { to: '/nueva-orden', label: 'Nueva Orden', icon: '➕' },
    { to: '/perfil', label: 'Perfil', icon: '👤' },
  ];

  const handleLogout = (e) => {
    e.preventDefault();
    Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que deseas salir del sistema?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        clearSession();
        navigate('/');
      }
    });
  };

  return (
    <header className="bg-gradient-to-r from-blue-900 via-brand-blue to-blue-800 text-white shadow-lg">
      <div className="container mx-auto px-4 py-3 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-0">
        <div className="flex items-center gap-3">
          <Link to="/dashboard" className="flex items-center gap-3 group" title="Ir al Dashboard">
            <div className="p-1 rounded-lg group-hover:scale-105 transition-transform duration-300 flex items-center">
              <Logo className="h-9 w-auto" alt="AutoCheck 360" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                AutoCheck <span className="text-brand-orange">360</span>
              </h1>
            </div>
          </Link>
          <Link
            to="/dashboard"
            title="Ir al Dashboard"
            className="hidden md:inline-flex items-center gap-1.5 text-xs bg-white/15 hover:bg-white/25 active:scale-95 px-3 py-1 rounded-full text-blue-100 hover:text-white font-medium border border-white/20 shadow-inner transition-all duration-200 cursor-pointer"
          >
            <span>🏭</span> {nombreTaller}
          </Link>
        </div>
        
        <nav className="flex items-center gap-2">
          <ul className="flex flex-wrap justify-center items-center gap-1 font-medium text-sm">
            {links.map((link) => (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-all duration-300 ${
                    path === link.to
                      ? 'bg-white/20 text-white font-semibold shadow-inner'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  <span className="text-base">{link.icon}</span>
                  <span className="hidden sm:inline">{link.label}</span>
                </Link>
              </li>
            ))}
            <li className="ml-2">
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-brand-orange hover:bg-red-500/20 hover:text-white transition-all duration-300 font-semibold cursor-pointer"
                title="Cerrar Sesión"
              >
                <span className="text-base">🚪</span>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      {/* Badge móvil del Taller con enlace al Dashboard */}
      <Link
        to="/dashboard"
        title="Ir al Dashboard"
        className="md:hidden block bg-blue-950/60 hover:bg-blue-950 py-1.5 px-4 text-center text-xs text-blue-200 hover:text-white border-t border-white/10 font-medium transition-colors cursor-pointer"
      >
        <span>🏭</span> Taller: <strong className="text-white underline decoration-dotted">{nombreTaller}</strong>
      </Link>
    </header>
  );
};

// Layout con navegación persistente (para páginas post-login)
const AppLayout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-gray">
      <SyncManager />
      <NavBar />
      <main className="flex-grow container mx-auto px-4 py-6">
        <Outlet />
      </main>
      <footer className="bg-white border-t border-gray-200 text-center py-4 px-4 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AutoCheck 360 — Taller Mecánico Inteligente.</p>
        <p className="text-xs text-gray-400 mt-1">
          Diseño realizado por <span className="font-semibold text-brand-blue">ZadikDesign</span>
        </p>
      </footer>
      <WhatsAppButton />
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Login sin layout (pantalla completa) */}
        <Route path="/" element={<Login />} />
        
        {/* Páginas con layout persistente: no se desmonta al cambiar de solapa */}
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/nueva-orden" element={<WorkOrderForm />} />
          <Route path="/ordenes-listas" element={<CompletedOrders />} />
          <Route path="/turnos" element={<Appointments />} />
          <Route path="/perfil" element={<Profile />} />
        </Route>
        
        {/* Redirect para rutas desconocidas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;