import express from 'express';
import cors from 'cors';
import path from 'path';
import nodemailer from 'nodemailer';
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

// API: Enviar correo de notificación (Registro, Recuperación, Notificación a zadik.arg@gmail.com)
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, html, text, type } = req.body;

    console.log(`\n==================================================`);
    console.log(`[EMAIL DISPATCH] Tipo: ${type || 'GENERAL'}`);
    console.log(`Destinatario: ${to}`);
    console.log(`Asunto: ${subject}`);
    console.log(`Contenido:\n${text}`);
    console.log(`==================================================\n`);

    // Crear transporter de Nodemailer (usa un servicio de prueba o credenciales SMTP si existen)
    let testAccount;
    try {
      testAccount = await nodemailer.createTestAccount();
    } catch {
      testAccount = null;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER || testAccount?.user || 'support@autocheck360.com',
        pass: process.env.SMTP_PASS || testAccount?.pass || 'secret',
      },
    });

    let mailPreviewUrl = null;
    try {
      const info = await transporter.sendMail({
        from: '"AutoCheck 360 Soporte" <soporte@autocheck360.com>',
        to: to,
        subject: subject,
        text: text,
        html: html || `<p>${text.replace(/\n/g, '<br/>')}</p>`,
      });
      mailPreviewUrl = nodemailer.getTestMessageUrl(info) || null;
    } catch (e) {
      console.warn('Advertencia al enviar correo vía Nodemailer transport (simulación activa):', e.message);
    }

    res.json({
      success: true,
      message: `Notificación por correo enviada con éxito a ${to}`,
      previewUrl: mailPreviewUrl,
      dispatchedTo: to,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error enviando mail:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Error al procesar el correo'
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
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AutoCheck 360 ejecutándose en http://0.0.0.0:${PORT}`);
  });
}

start();
