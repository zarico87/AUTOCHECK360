import express from 'express';
import cors from 'cors';
import path from 'path';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// API: Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    system: 'AutoCheck 360 API'
  });
});

// API: Enviar correo de notificación vía Formspree (https://formspree.io/f/xvkprrpd)
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text, type } = req.body;

    console.log(`\n==================================================`);
    console.log(`[EMAIL DISPATCH - FORMSPREE] Tipo: ${type || 'GENERAL'}`);
    console.log(`Destinatario: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`==================================================\n`);

    const FORMSPREE_ENDPOINT = 'https://formspree.io/f/xvkprrpd';

    const formspreeRes = await fetch(FORMSPREE_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify({
        email: to || 'zadik.arg@gmail.com',
        destinatario: to,
        subject: subject,
        _subject: subject,
        message: text,
        mensajeHTML: html,
        tipoNotificacion: type || 'GENERAL',
        fecha: new Date().toLocaleString('es-AR'),
        sistema: 'AutoCheck 360',
      }),
    });

    let resultData = null;
    if (formspreeRes.ok) {
      resultData = await formspreeRes.json();
      console.log(`[FORMSPREE SERVER] Notificación despachada con éxito a ${to}`);
    } else {
      const errTxt = await formspreeRes.text();
      console.warn(`[FORMSPREE SERVER] Formspree error ${formspreeRes.status}:`, errTxt);
    }

    res.json({
      success: true,
      message: `Notificación por correo enviada vía Formspree a ${to}`,
      endpoint: FORMSPREE_ENDPOINT,
      dispatchedTo: to,
      data: resultData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enviando mail vía Formspree:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar el correo vía Formspree'
    });
  }
});

// Integrar Vite middleware para desarrollo o archivos estáticos para producción
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoCheck 360 ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

start();
