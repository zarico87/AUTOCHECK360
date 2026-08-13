// src/components/CompletedOrders.jsx
import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { getCompletedOrders, deleteOrder, syncOrdersFromFirestore } from '../utils/storage';
import { generateOrderPDF } from '../utils/pdfGenerator';

const CompletedOrders = () => {
  const [orders, setOrders] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [syncing, setSyncing] = useState(true);

  useEffect(() => {
    const init = async () => {
      setSyncing(true);
      try {
        await syncOrdersFromFirestore();
      } catch (err) {
        console.warn('Sync error:', err);
      }
      loadOrders();
      setSyncing(false);
    };
    init();
  }, []);

  const loadOrders = () => {
    setOrders(getCompletedOrders());
  };

  const handleDeleteOrder = (order, e) => {
    e.stopPropagation();
    const orderDisplay = order.numeroOrden || order.id || '';
    
    Swal.fire({
      title: '¿Estás seguro de borrar la orden?',
      text: `Se eliminará permanentemente la orden ${orderDisplay ? '#' + orderDisplay : ''} (${order.patente || 'Sin patente'})`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#EF4444',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Sí, borrar',
      cancelButtonText: 'Cancelar',
    }).then((result) => {
      if (result.isConfirmed) {
        deleteOrder(order.id);
        loadOrders();
        Swal.fire({
          toast: true,
          position: 'top-end',
          icon: 'success',
          title: 'Orden borrada correctamente',
          showConfirmButton: false,
          timer: 1500,
        });
      }
    });
  };

  const filteredOrders = filtroFecha
    ? orders.filter(o => o.fechaCompletado && o.fechaCompletado.startsWith(filtroFecha))
    : orders;

  const formatDate = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const formatTime = (isoStr) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const VISUAL_LABELS = {
    cristales: 'Cristales',
    nivelCombustible: 'Nivel de Combustible',
    detallesChapa: 'Detalles de Chapa',
  };

  const TRABAJO_LABELS = {
    limpiaparabrisas: 'Limpiaparabrisas',
    serviceLubricentro: 'Service Lubricentro',
    pastillasFreno: 'Pastillas de Freno',
    tablero: 'Tablero',
    presupuesto: 'Presupuesto',
    diagnosticoPc: 'Diagnóstico PC',
    anulacionDpfEgr: 'Anulación DPF/EGR',
    mecanicaLigera: 'Mecánica Ligera',
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Indicador de sincronización */}
      {syncing && (
        <div className="bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-lg flex items-center gap-2 animate-fadeIn">
          <span className="animate-spin text-lg">⏳</span> Sincronizando datos desde la nube...
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-bold text-brand-grayDark">
            Órdenes Completadas
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'orden completada' : 'órdenes completadas'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold text-brand-grayDark">Filtrar por fecha:</label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-blue outline-none text-sm"
          />
          {filtroFecha && (
            <button
              onClick={() => setFiltroFecha('')}
              className="text-sm text-brand-orange hover:text-orange-700 font-semibold transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      {filteredOrders.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="text-6xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-brand-grayDark mb-2">
            No hay órdenes completadas
          </h3>
          <p className="text-gray-500">
            {filtroFecha ? 'No se encontraron órdenes para la fecha seleccionada.' : 'Las órdenes completadas aparecerán aquí.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredOrders.map((order) => (
            <div
              key={order.id}
              className="bg-white rounded-xl shadow-md border-l-4 border-brand-green hover:shadow-lg transition-all duration-300"
            >
              {/* Row principal */}
              <div
                className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 cursor-pointer"
                onClick={() => toggleExpand(order.id)}
              >
                <div className="flex items-center gap-4">
                  <div className="bg-green-50 text-brand-green rounded-full w-10 h-10 flex items-center justify-center font-bold text-lg">
                    ✓
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-brand-grayDark uppercase">{order.patente}</h3>
                      {(order.numeroOrden || order.id) && (
                        <span className="text-xs font-semibold bg-gray-100 text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                          #{order.numeroOrden || order.id}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500">{order.marcaModelo} — {order.nombre}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3 mt-3 sm:mt-0">
                  <div className="text-right">
                    <p className="text-sm font-semibold text-brand-grayDark">{formatDate(order.fechaCompletado)}</p>
                    <p className="text-xs text-gray-400">{formatTime(order.fechaCompletado)}</p>
                  </div>

                  {order.presupuesto > 0 && (
                    <span className="bg-brand-orange text-white text-sm font-bold px-3 py-1 rounded-full">
                      $ {Number(order.presupuesto).toLocaleString('es-AR')}
                    </span>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      generateOrderPDF(order);
                    }}
                    className="bg-brand-blue hover:bg-blue-800 text-white text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                    title="Descargar PDF"
                  >
                    📄 PDF
                  </button>

                  {/* Botón Tacho de Basura */}
                  <button
                    onClick={(e) => handleDeleteOrder(order, e)}
                    className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    title="Borrar orden completada"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${expandedId === order.id ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>

              {/* Detalle expandible */}
              {expandedId === order.id && (
                <div className="border-t border-gray-100 p-5 bg-gray-50 rounded-b-xl animate-slideDown">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Detalles Vistos */}
                    <div>
                      <h4 className="font-bold text-brand-blue text-sm mb-3 uppercase tracking-wider">Detalles Vistos</h4>
                      <div className="space-y-2">
                        {Object.entries(VISUAL_LABELS).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                              order.checklistVisual?.[key] ? 'bg-brand-green text-white' : 'bg-gray-200 text-gray-400'
                            }`}>
                              {order.checklistVisual?.[key] ? '✓' : '—'}
                            </span>
                            <span className="text-sm text-brand-grayDark">{label}</span>
                          </div>
                        ))}
                      </div>
                      {order.observacionesVisuales && (
                        <p className="mt-3 text-sm text-gray-600 italic bg-white p-2 rounded border border-gray-200">
                          {order.observacionesVisuales}
                        </p>
                      )}
                    </div>

                    {/* Trabajos */}
                    <div>
                      <h4 className="font-bold text-brand-blue text-sm mb-3 uppercase tracking-wider">Trabajos Realizados</h4>
                      <div className="space-y-2">
                        {Object.entries(TRABAJO_LABELS).map(([key, label]) => (
                          <div key={key} className="flex items-center gap-2">
                            <span className={`w-5 h-5 rounded flex items-center justify-center text-xs font-bold ${
                              order.checklistTrabajos?.[key] ? 'bg-brand-green text-white' : 'bg-gray-200 text-gray-400'
                            }`}>
                              {order.checklistTrabajos?.[key] ? '✓' : '—'}
                            </span>
                            <span className="text-sm text-brand-grayDark">{label}</span>
                          </div>
                        ))}
                      </div>
                      {order.observacionesTrabajos && (
                        <p className="mt-3 text-sm text-gray-600 italic bg-white p-2 rounded border border-gray-200">
                          {order.observacionesTrabajos}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompletedOrders;
