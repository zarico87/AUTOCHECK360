import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate, useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import './App.css';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import WorkOrderForm from './components/WorkOrderForm';
import CompletedOrders from './components/CompletedOrders';
import Appointments from './components/Appointments';
import WhatsAppButton from './components/WhatsAppButton';
import logo from './assets/img/logocompleto.jpeg';
import { getSession, clearSession } from './utils/storage';

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
          <Link to="/dashboard" className="flex items-center gap-3 group">
            <div className="bg-white/90 p-1 rounded-lg shadow-md group-hover:scale-105 transition-transform duration-300">
              <img
                src={logo}
                alt="AutoCheck 360"
                className="h-9 w-auto mix-blend-multiply bg-transparent"
              />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                AutoCheck <span className="text-brand-orange">360</span>
              </h1>
            </div>
          </Link>
          <span className="hidden md:inline-flex items-center gap-1.5 text-xs bg-white/15 px-3 py-1 rounded-full text-blue-100 font-medium border border-white/20 shadow-inner">
            <span>🏭</span> {nombreTaller}
          </span>
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
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-brand-orange hover:bg-red-500/20 hover:text-white transition-all duration-300 font-semibold"
                title="Cerrar Sesión"
              >
                <span className="text-base">🚪</span>
                <span className="hidden sm:inline">Salir</span>
              </button>
            </li>
          </ul>
        </nav>
      </div>
      {/* Badge móvil del Taller */}
      <div className="md:hidden bg-blue-950/60 py-1 px-4 text-center text-xs text-blue-200 border-t border-white/10 font-medium flex items-center justify-center gap-1">
        <span>🏭</span> Taller: <strong className="text-white">{nombreTaller}</strong>
      </div>
    </header>
  );
};

// Layout con navegación (para páginas post-login)
const AppLayout = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-brand-gray">
      <NavBar />
      <main className="flex-grow container mx-auto px-4 py-6">
        {children}
      </main>
      <footer className="bg-white border-t border-gray-200 text-center py-4 text-sm text-gray-500">
        <p>&copy; {new Date().getFullYear()} AutoCheck 360 — Taller Mecánico Inteligente.</p>
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
        
        {/* Páginas con layout completo */}
        <Route path="/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/nueva-orden" element={<AppLayout><WorkOrderForm /></AppLayout>} />
        <Route path="/ordenes-listas" element={<AppLayout><CompletedOrders /></AppLayout>} />
        <Route path="/turnos" element={<AppLayout><Appointments /></AppLayout>} />
        
        {/* Redirect para rutas desconocidas */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;