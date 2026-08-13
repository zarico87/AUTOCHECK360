// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Swal from 'sweetalert2';
import { getPendingOrders, markOrderCompleted, deleteOrder, seedDemoData, syncOrdersFromFirestore, syncOrderCounterFromFirestore } from '../utils/storage';
import { generateOrderPDF } from '../utils/pdfGenerator';

const MAX_CARDS = 6;

const Dashboard = () => {
  const [orders, setOrders] = useState([]);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    const init = async () => {
      setSyncing(true);
      try {
        // Sincronizar datos desde la nube antes de cargar
        await syncOrderCounterFromFirestore();
        await syncOrdersFromFirestore();
      } catch (err) {
        console.warn('Sync error (usando datos locales):', err);
      }
      // Cargar datos de demo si es la primera vez
      seedDemoData();
      loadOrders();
      setSyncing(false);
    };
    init();
  }, []);

  const loadOrders = () => {
    setOrders(getPendingOrders());
  };

  // Función para determinar los colores de la tarjeta según el estado
  const getStatusConfig = (estado) => {
    switch (estado) {
      case 'en_proceso':
        return {
          badge: 'bg-brand-orange text-white',
          border: 'border-brand-orange',
          label: 'En Proceso',
          dot: 'bg-brand-orange',
        };
      case 'pendiente':
      default:
        return {
          badge: 'bg-gray-200 text-brand-grayDark',
          border: 'border-gray-300',
          label: 'Pendiente',
          dot: 'bg-gray-400',
        };
    }
  };

  const handleMarkCompleted = (order) => {
    Swal.fire({
      title: '¿Marcar como listo?',
      text: `El vehículo ${order.patente} se moverá a órdenes completadas.`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#84CC16',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, marcar listo',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        markOrderCompleted(order.id);
        loadOrders();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: `${order.patente} completado`,
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  const handleDelete = (order) => {
    Swal.fire({
      title: '¿Eliminar orden?',
      text: `Se eliminará la orden de ${order.patente}. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteOrder(order.id);
        loadOrders();
      }
    });
  };

  const displayOrders = orders.slice(0, MAX_CARDS);
  const hiddenCount = orders.length - MAX_CARDS;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Indicador de sincronización */}
      {syncing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2 animate-fadeIn">
          <span className="animate-spin text-lg">⏳</span> Sincronizando datos desde la nube...
        </div>
      )}
      {/* Cabecera del Dashboard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-grayDark">
            Vehículos en Taller
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {orders.length} {orders.length === 1 ? 'orden pendiente' : 'órdenes pendientes'}
            {orders.length > MAX_CARDS && ` (mostrando ${MAX_CARDS})`}
          </p>
        </div>
        <Link 
          to="/nueva-orden" 
          className="bg-brand-blue hover:bg-blue-800 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-300 shadow-md hover:shadow-xl hover:-translate-y-0.5"
        >
          + Nuevo Ingreso
        </Link>
      </div>

      {/* Empty state */}
      {orders.length === 0 ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔧</div>
          <h3 className="text-xl font-semibold text-brand-grayDark mb-2">
            Sin vehículos pendientes
          </h3>
          <p className="text-gray-500 mb-6">Ingresá un nuevo vehículo para comenzar a trabajar.</p>
          <Link
            to="/nueva-orden"
            className="inline-block bg-brand-green hover:bg-green-600 text-white font-bold py-3 px-8 rounded-xl shadow-md transition-all duration-300"
          >
            + Nuevo Ingreso
          </Link>
        </div>
      ) : (
        <>
          {/* Grilla de Tarjetas (Responsive) — Máximo 6 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {displayOrders.map((order, idx) => {
              const status = getStatusConfig(order.estado);
              return (
                <div
                  key={order.id}
                  className="bg-white rounded-2xl shadow-md p-5 border-t-4 border-brand-blue hover:shadow-xl transition-all duration-300 hover:-translate-y-1 animate-slideUp group"
                  style={{ animationDelay: `${idx * 100}ms` }}
                >
                  {/* Header de la card */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="text-xl font-bold text-brand-grayDark uppercase tracking-wide">{order.patente}</h3>
                      <p className="text-sm text-gray-500">{order.marcaModelo}</p>
                    </div>
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase tracking-wide flex items-center gap-1.5 ${status.badge}`}>
                      <span className={`w-2 h-2 rounded-full ${status.dot} ${order.estado === 'en_proceso' ? 'animate-pulse' : ''}`}></span>
                      {status.label}
                    </span>
                  </div>
                  
                  {/* Info del titular */}
                  <div className="border-t border-gray-100 pt-3 mt-2">
                    <p className="text-sm">
                      <span className="font-semibold text-brand-grayDark">Titular:</span>{' '}
                      <span className="text-gray-600">{order.nombre}</span>
                    </p>
                    {order.presupuesto > 0 && (
                      <p className="text-sm mt-1">
                        <span className="font-semibold text-brand-grayDark">Presupuesto:</span>{' '}
                        <span className="text-brand-orange font-bold">$ {Number(order.presupuesto).toLocaleString('es-AR')}</span>
                      </p>
                    )}
                  </div>
                  
                  {/* Acciones */}
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleMarkCompleted(order)}
                      className="flex-1 bg-brand-green/10 hover:bg-brand-green hover:text-white text-brand-green text-sm font-semibold py-2 rounded-lg transition-all duration-300"
                    >
                      ✓ Listo
                    </button>
                    <button
                      onClick={() => generateOrderPDF(order)}
                      className="flex-1 bg-brand-blue/10 hover:bg-brand-blue hover:text-white text-brand-blue text-sm font-semibold py-2 rounded-lg transition-all duration-300"
                    >
                      📄 PDF
                    </button>
                    <button
                      onClick={() => handleDelete(order)}
                      className="bg-red-50 hover:bg-red-500 hover:text-white text-red-400 text-sm font-semibold py-2 px-3 rounded-lg transition-all duration-300"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Indicador de órdenes ocultas */}
          {hiddenCount > 0 && (
            <div className="text-center py-4">
              <p className="text-sm text-gray-500">
                +{hiddenCount} {hiddenCount === 1 ? 'orden más' : 'órdenes más'} no mostradas
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;