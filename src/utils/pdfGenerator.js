// src/utils/pdfGenerator.js
// Generación de PDF profesional con jsPDF para el checklist de órdenes
import { jsPDF } from 'jspdf';
import { getSession } from './storage';

const BRAND_BLUE = [30, 64, 175];
const BRAND_GRAY_DARK = [55, 65, 81];
const BRAND_GREEN = [132, 204, 22];
const BRAND_ORANGE = [249, 115, 22];
const LIGHT_GRAY = [243, 244, 246];
const WHITE = [255, 255, 255];

const CHECKLIST_VISUAL_LABELS = {
  cristales: 'Cristales',
  nivelCombustible: 'Nivel de Combustible',
  detallesChapa: 'Detalles de Chapa',
};

const CHECKLIST_TRABAJOS_LABELS = {
  limpiaparabrisas: 'Limpiaparabrisas',
  serviceLubricentro: 'Service Lubricentro',
  pastillasFreno: 'Pastillas de Freno',
  tablero: 'Tablero',
  presupuesto: 'Presupuesto',
  diagnosticoPc: 'Diagnóstico PC',
  anulacionDpfEgr: 'Anulación DPF/EGR',
  mecanicaLigera: 'Mecánica Ligera',
};

export const generateOrderPDF = (order) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  const session = getSession();
  const nombreTaller = session?.nombreTaller || 'Taller AutoCheck 360';
  const domicilio = session?.domicilio || 'Av. Colón 1234, Córdoba';
  const telefono = session?.telefono || '351-1234567';

  const numOrdenDisplay = order.numeroOrden || order.id || '00001000';

  // ─── HEADER ─────────────────────────────
  doc.setFillColor(...BRAND_BLUE);
  doc.rect(0, 0, pageWidth, 48, 'F');

  doc.setTextColor(...WHITE);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(nombreTaller, 15, 18);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('AutoCheck 360 — Sistema de Gestión', 15, 26);
  doc.text('Taller Mecánico Inteligente', 15, 32);

  doc.setFontSize(8.5);
  doc.text(`Fecha: ${new Date().toLocaleDateString('es-AR')}`, pageWidth - 15, 16, { align: 'right' });
  doc.setFont('helvetica', 'bold');
  doc.text(`Orden N°: ${numOrdenDisplay}`, pageWidth - 15, 24, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.text(`Dirección: ${domicilio}`, pageWidth - 15, 32, { align: 'right' });
  doc.text(`Teléfono: ${telefono}`, pageWidth - 15, 39, { align: 'right' });

  y = 56;

  // ─── DATOS DEL VEHÍCULO / CLIENTE ───────
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Datos del Vehículo y Cliente', 15, y);
  y += 2;

  doc.setDrawColor(...BRAND_BLUE);
  doc.setLineWidth(0.5);
  doc.line(15, y, pageWidth - 15, y);
  y += 8;

  doc.setTextColor(...BRAND_GRAY_DARK);
  doc.setFontSize(10);

  const fields = [
    ['Patente', order.patente || '-'],
    ['Marca / Modelo', order.marcaModelo || '-'],
    ['Titular', order.nombre || '-'],
    ['Teléfono', order.telefono || '-'],
    ['DNI', order.dni || '-'],
  ];

  const colWidth = (pageWidth - 30) / 2;
  fields.forEach((field, i) => {
    const col = i % 2;
    const x = 15 + col * colWidth;

    doc.setFont('helvetica', 'bold');
    doc.text(`${field[0]}:`, x, y);
    doc.setFont('helvetica', 'normal');
    doc.text(field[1], x + doc.getTextWidth(`${field[0]}: `) + 2, y);

    if (col === 1 || i === fields.length - 1) y += 7;
  });

  y += 5;

  // ─── CHECKLIST VISUAL ───────────────────
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detalles Vistos (Inspección Visual)', 15, y);
  y += 2;
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  doc.setFontSize(10);
  const visual = order.checklistVisual || {};

  Object.entries(CHECKLIST_VISUAL_LABELS).forEach(([key, label]) => {
    const checked = visual[key];
    // Draw checkbox
    doc.setDrawColor(...BRAND_GRAY_DARK);
    doc.setLineWidth(0.3);
    doc.rect(15, y - 3.5, 4, 4);

    if (checked) {
      doc.setFillColor(...BRAND_GREEN);
      doc.rect(15, y - 3.5, 4, 4, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(8);
      doc.text('✓', 15.8, y - 0.3);
    }

    doc.setTextColor(...BRAND_GRAY_DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 22, y);
    y += 7;
  });

  // Observaciones visuales
  if (order.observacionesVisuales) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', 15, y);
    doc.setFont('helvetica', 'italic');
    const obsLines = doc.splitTextToSize(order.observacionesVisuales, pageWidth - 35);
    doc.text(obsLines, 15, y + 5);
    y += 5 + obsLines.length * 5;
  }

  y += 8;

  // ─── CHECKLIST TRABAJOS ─────────────────
  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Trabajos a Realizar', 15, y);
  y += 2;
  doc.line(15, y, pageWidth - 15, y);
  y += 6;

  doc.setFontSize(10);
  const trabajos = order.checklistTrabajos || {};

  Object.entries(CHECKLIST_TRABAJOS_LABELS).forEach(([key, label]) => {
    // Check if we need a new page
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    const checked = trabajos[key];
    doc.setDrawColor(...BRAND_GRAY_DARK);
    doc.setLineWidth(0.3);
    doc.rect(15, y - 3.5, 4, 4);

    if (checked) {
      doc.setFillColor(...BRAND_GREEN);
      doc.rect(15, y - 3.5, 4, 4, 'F');
      doc.setTextColor(...WHITE);
      doc.setFontSize(8);
      doc.text('✓', 15.8, y - 0.3);
    }

    doc.setTextColor(...BRAND_GRAY_DARK);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(label, 22, y);
    y += 7;
  });

  // Observaciones de trabajos
  if (order.observacionesTrabajos) {
    doc.setFont('helvetica', 'bold');
    doc.text('Observaciones:', 15, y);
    doc.setFont('helvetica', 'italic');
    const obsLines = doc.splitTextToSize(order.observacionesTrabajos, pageWidth - 35);
    doc.text(obsLines, 15, y + 5);
    y += 5 + obsLines.length * 5;
  }

  y += 10;

  // ─── PRESUPUESTO ────────────────────────
  if (y > 260) {
    doc.addPage();
    y = 20;
  }

  doc.setFillColor(...LIGHT_GRAY);
  doc.roundedRect(15, y - 5, pageWidth - 30, 20, 3, 3, 'F');

  doc.setTextColor(...BRAND_BLUE);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('PRESUPUESTO TOTAL', 20, y + 4);

  const monto = order.presupuesto
    ? `$ ${Number(order.presupuesto).toLocaleString('es-AR')}`
    : '$ 0';
  doc.setTextColor(...BRAND_ORANGE);
  doc.setFontSize(18);
  doc.text(monto, pageWidth - 20, y + 5, { align: 'right' });

  y += 25;

  // ─── FOOTER ─────────────────────────────
  const footerY = doc.internal.pageSize.getHeight() - 15;
  doc.setDrawColor(...LIGHT_GRAY);
  doc.setLineWidth(0.3);
  doc.line(15, footerY - 5, pageWidth - 15, footerY - 5);

  doc.setTextColor(150, 150, 150);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`${nombreTaller} — Powered by AutoCheck 360`, 15, footerY);
  doc.text('Soporte: zadik.arg@gmail.com', pageWidth - 15, footerY, { align: 'right' });

  // ─── DESCARGAR ──────────────────────────
  const filename = `AutoCheck360_Orden_${(order.patente || 'SinPatente').replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
};
