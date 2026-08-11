// src/components/WorkOrderForm.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import { addOrder } from '../utils/storage';
import { generateOrderPDF } from '../utils/pdfGenerator';

const CHECKLIST_VISUAL_ITEMS = {
  cristales: 'Cristales',
  nivelCombustible: 'Nivel de Combustible',
  detallesChapa: 'Detalles de Chapa',
};

const CHECKLIST_TRABAJOS_ITEMS = {
  limpiaparabrisas: 'Limpiaparabrisas',
  serviceLubricentro: 'Service Lubricentro',
  pastillasFreno: 'Pastillas de Freno',
  tablero: 'Tablero',
  presupuesto: 'Presupuesto',
  diagnosticoPc: 'Diagnóstico PC',
  anulacionDpfEgr: 'Anulación DPF/EGR',
  mecanicaLigera: 'Mecánica Ligera',
};

const WorkOrderForm = () => {
  const navigate = useNavigate();
  
  // Estado general del formulario
  const [formData, setFormData] = useState({
    patente: '',
    nombre: '',
    telefono: '',
    dni: '',
    marcaModelo: '',
  });

  // Checklist de detalles vistos (inspección visual)
  const [checklistVisual, setChecklistVisual] = useState({
    cristales: false,
    nivelCombustible: false,
    detallesChapa: false,
  });
  const [observacionesVisuales, setObservacionesVisuales] = useState('');

  // Checklist de trabajos a realizar
  const [checklistTrabajos, setChecklistTrabajos] = useState({
    limpiaparabrisas: false,
    serviceLubricentro: false,
    pastillasFreno: false,
    tablero: false,
    presupuesto: false,
    diagnosticoPc: false,
    anulacionDpfEgr: false,
    mecanicaLigera: false,
  });
  const [observacionesTrabajos, setObservacionesTrabajos] = useState('');

  // Presupuesto
  const [presupuestoMonto, setPresupuestoMonto] = useState('');

  // Manejo de inputs del texto
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    
    // Simulación de "Autocompletado" al escribir una patente específica
    if (name === 'patente' && value.toUpperCase() === 'AB123CD') {
      Swal.fire({
        toast: true,
        position: 'top-end',
        icon: 'info',
        title: 'Cliente encontrado en la base de datos',
        showConfirmButton: false,
        timer: 2000
      });
      setFormData(prev => ({
        ...prev,
        patente: value.toUpperCase(),
        nombre: 'Juan Pérez',
        telefono: '351-1234567',
        dni: '30123456',
        marcaModelo: 'Volkswagen Golf'
      }));
    }
  };

  // Toggle checklist visual
  const toggleVisual = (item) => {
    setChecklistVisual({ ...checklistVisual, [item]: !checklistVisual[item] });
  };

  // Toggle checklist trabajos
  const toggleTrabajo = (item) => {
    setChecklistTrabajos({ ...checklistTrabajos, [item]: !checklistTrabajos[item] });
  };

  // Guardar la orden
  const handleSubmit = (e) => {
    e.preventDefault();
    
    const orderData = {
      ...formData,
      patente: formData.patente.toUpperCase(),
      checklistVisual,
      observacionesVisuales,
      checklistTrabajos,
      observacionesTrabajos,
      presupuesto: presupuestoMonto ? Number(presupuestoMonto) : 0,
    };

    const newOrder = addOrder(orderData);
    
    Swal.fire({
      title: '¡Orden Guardada!',
      text: `El vehículo ${formData.patente.toUpperCase()} fue ingresado con éxito.`,
      icon: 'success',
      showCancelButton: true,
      confirmButtonColor: '#84CC16',
      cancelButtonColor: '#1E40AF',
      confirmButtonText: 'Ir al Dashboard',
      cancelButtonText: '📄 Descargar PDF',
    }).then((result) => {
      if (result.dismiss === Swal.DismissReason.cancel) {
        generateOrderPDF(newOrder);
        setTimeout(() => navigate('/dashboard'), 500);
      } else {
        navigate('/dashboard');
      }
    });
  };

  // Componente reutilizable para items del checklist
  const CheckItem = ({ label, checked, onToggle, color = 'green' }) => {
    const colors = {
      green: {
        active: 'border-brand-green bg-green-50 text-brand-green shadow-sm shadow-green-100',
        circle: 'bg-brand-green border-brand-green text-white',
      },
      blue: {
        active: 'border-brand-blue bg-blue-50 text-brand-blue shadow-sm shadow-blue-100',
        circle: 'bg-brand-blue border-brand-blue text-white',
      },
    };

    return (
      <div
        onClick={onToggle}
        className={`cursor-pointer border-2 rounded-xl p-4 text-center transition-all duration-300 hover:scale-[1.02] ${
          checked
            ? colors[color].active
            : 'border-gray-200 text-gray-500 hover:border-gray-300'
        }`}
      >
        <div className="flex flex-col items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${
            checked ? colors[color].circle : 'border-gray-300 bg-white'
          }`}>
            {checked && <span className="text-sm font-bold">✓</span>}
          </div>
          <span className="font-semibold text-sm leading-tight">{label}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 border-t-4 border-brand-blue">
        <h2 className="text-2xl font-bold text-brand-grayDark mb-1">
          Nueva Orden de Trabajo
        </h2>
        <p className="text-sm text-gray-500 mb-6 border-b pb-4">Complete los datos del vehículo y el checklist de revisión</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* ═══ SECCIÓN 1: Datos del Vehículo y Cliente ═══ */}
          <div>
            <h3 className="text-lg font-bold text-brand-blue mb-4 flex items-center gap-2">
              <span className="bg-brand-blue text-white rounded-lg w-7 h-7 flex items-center justify-center text-sm">1</span>
              Datos del Vehículo y Cliente
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Patente / Placa</label>
                <input
                  type="text"
                  name="patente"
                  id="order-patente"
                  value={formData.patente}
                  onChange={handleChange}
                  placeholder="Ej: AB 123 CD"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none uppercase transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Marca y Modelo</label>
                <input
                  type="text"
                  name="marcaModelo"
                  id="order-modelo"
                  value={formData.marcaModelo}
                  onChange={handleChange}
                  placeholder="Ej: Toyota Corolla 2019"
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all duration-300"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-brand-grayDark mb-1">Titular (Nombre y Apellido)</label>
                <input
                  type="text"
                  name="nombre"
                  id="order-nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all duration-300"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-brand-grayDark mb-1">Teléfono</label>
                  <input
                    type="tel"
                    name="telefono"
                    id="order-telefono"
                    value={formData.telefono}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all duration-300"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-brand-grayDark mb-1">DNI</label>
                  <input
                    type="text"
                    name="dni"
                    id="order-dni"
                    value={formData.dni}
                    onChange={handleChange}
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-brand-blue outline-none transition-all duration-300"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* ═══ SECCIÓN 2: Detalles Vistos (Inspección Visual) ═══ */}
          <div>
            <h3 className="text-lg font-bold text-brand-blue mb-4 flex items-center gap-2">
              <span className="bg-brand-blue text-white rounded-lg w-7 h-7 flex items-center justify-center text-sm">2</span>
              Detalles Vistos — Inspección Visual
            </h3>
            <div className="grid grid-cols-3 sm:grid-cols-3 gap-4 mb-4">
              {Object.entries(CHECKLIST_VISUAL_ITEMS).map(([key, label]) => (
                <CheckItem
                  key={key}
                  label={label}
                  checked={checklistVisual[key]}
                  onToggle={() => toggleVisual(key)}
                  color="green"
                />
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-grayDark mb-1">Observaciones de Inspección</label>
              <textarea
                value={observacionesVisuales}
                onChange={(e) => setObservacionesVisuales(e.target.value)}
                rows="3"
                placeholder="Detallar rayones, abolladuras, faltantes o cualquier detalle visual..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none transition-all duration-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green"
              ></textarea>
            </div>
          </div>

          {/* ═══ SECCIÓN 3: Trabajos a Realizar ═══ */}
          <div>
            <h3 className="text-lg font-bold text-brand-orange mb-4 flex items-center gap-2">
              <span className="bg-brand-orange text-white rounded-lg w-7 h-7 flex items-center justify-center text-sm">3</span>
              Trabajos a Realizar
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              {Object.entries(CHECKLIST_TRABAJOS_ITEMS).map(([key, label]) => (
                <CheckItem
                  key={key}
                  label={label}
                  checked={checklistTrabajos[key]}
                  onToggle={() => toggleTrabajo(key)}
                  color="blue"
                />
              ))}
            </div>
            <div>
              <label className="block text-sm font-bold text-brand-grayDark mb-1">Observaciones de Trabajos</label>
              <textarea
                value={observacionesTrabajos}
                onChange={(e) => setObservacionesTrabajos(e.target.value)}
                rows="3"
                placeholder="Detallar trabajo adicional, repuestos requeridos, prioridades..."
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl outline-none transition-all duration-300 focus:border-brand-orange focus:ring-2 focus:ring-brand-orange"
              ></textarea>
            </div>
          </div>

          {/* ═══ SECCIÓN 4: Presupuesto ═══ */}
          <div>
            <h3 className="text-lg font-bold text-brand-grayDark mb-4 flex items-center gap-2">
              <span className="bg-brand-grayDark text-white rounded-lg w-7 h-7 flex items-center justify-center text-sm">$</span>
              Presupuesto
            </h3>
            <div className="bg-gray-50 rounded-xl p-5 border-2 border-dashed border-gray-300">
              <label className="block text-sm font-bold text-brand-grayDark mb-2">Monto del Presupuesto</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-brand-grayDark">$</span>
                <input
                  type="number"
                  id="order-presupuesto"
                  value={presupuestoMonto}
                  onChange={(e) => setPresupuestoMonto(e.target.value)}
                  placeholder="0"
                  min="0"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl outline-none text-2xl font-bold text-brand-orange focus:ring-2 focus:ring-brand-orange focus:border-brand-orange transition-all duration-300"
                />
              </div>
            </div>
          </div>

          {/* ═══ Botonera ═══ */}
          <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 border-2 border-gray-300 text-gray-600 font-bold rounded-xl hover:bg-gray-100 transition-all duration-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              id="order-submit"
              className="px-8 py-3 bg-brand-green hover:bg-green-600 text-white font-bold rounded-xl shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
            >
              ✓ Guardar Orden
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default WorkOrderForm;