// src/utils/emailService.js

/**
 * Servicio de envío de notificaciones por correo electrónico a través de la API
 */

export async function sendEmailNotification({ to, subject, text, html, type = 'GENERAL' }) {
  try {
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text, html, type }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err) {
    console.warn(`[EMAIL CLIENT] Error enviando correo a ${to}:`, err);
    return { success: false, error: err.message };
  }
}

/**
 * Enviar credenciales de registro al usuario registrado Y a zadik.arg@gmail.com
 */
export async function sendRegistrationNotification(workshop) {
  const { nombreTaller, usuario, password, email, cuit, telefono, domicilio } = workshop;

  const subjectUser = `Bienvenido a AutoCheck 360 — Tus Datos de Acceso para ${nombreTaller}`;
  const textUser = `¡Hola! Gracias por registrar tu taller en AutoCheck 360.

Tus credenciales de acceso para el sistema son:
• Usuario: ${usuario}
• Contraseña: ${password}
• Nombre de Taller: ${nombreTaller}
• CUIT: ${cuit}
• Teléfono: ${telefono}
• Domicilio: ${domicilio}

Ya podés iniciar sesión en AutoCheck 360 con tu Usuario y Contraseña.

Si necesitás ayuda o soporte técnico, contactanos vía WhatsApp al 3512469463 o por correo a zadik.arg@gmail.com.

Saludos,
Equipo de AutoCheck 360`;

  const htmlUser = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #1E40AF; padding: 16px; border-radius: 8px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">AutoCheck <span style="color: #F97316;">360</span></h1>
        <p style="color: #bfdbfe; margin: 4px 0 0 0; font-size: 13px;">Registro Exitoso de Taller Mecánico</p>
      </div>

      <div style="padding: 20px 0;">
        <p style="font-size: 15px; color: #374151;">Hola <strong>${nombreTaller}</strong>,</p>
        <p style="font-size: 14px; color: #4b5563;">Tu taller ha sido registrado exitosamente en el sistema <strong>AutoCheck 360</strong>. A continuación se detallan tus credenciales de acceso:</p>

        <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; border-left: 4px solid #84CC16; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>👤 Usuario:</strong> <span style="font-family: monospace; font-size: 16px; color: #1E40AF;">${usuario}</span></p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>🔑 Contraseña:</strong> <span style="font-family: monospace; font-size: 16px; color: #DC2626;">${password}</span></p>
          <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">🏢 <strong>Taller:</strong> ${nombreTaller} | CUIT: ${cuit}</p>
          <p style="margin: 4px 0; font-size: 13px; color: #6b7280;">📞 <strong>Teléfono:</strong> ${telefono} | 📍 ${domicilio}</p>
        </div>

        <p style="font-size: 13px; color: #6b7280;">Soporte Técnico de AutoCheck 360: WhatsApp <strong>3512469463</strong> | Email: <strong>zadik.arg@gmail.com</strong></p>
      </div>
    </div>
  `;

  // 1. Enviar correo al mail registrado por el usuario
  const userResult = await sendEmailNotification({
    to: email,
    subject: subjectUser,
    text: textUser,
    html: htmlUser,
    type: 'REGISTRAR_USUARIO'
  });

  // 2. Enviar notificación copia obligatoria a zadik.arg@gmail.com
  const adminSubject = `[NUEVO REGISTRO TALLER] ${nombreTaller} (${usuario})`;
  const adminText = `Se ha registrado un nuevo taller en AutoCheck 360:

• Nombre del Taller: ${nombreTaller}
• Usuario: ${usuario}
• Contraseña: ${password}
• Email de Registro: ${email}
• Teléfono: ${telefono}
• CUIT: ${cuit}
• Domicilio: ${domicilio}
• Fecha: ${new Date().toLocaleString('es-AR')}`;

  const adminResult = await sendEmailNotification({
    to: 'zadik.arg@gmail.com',
    subject: adminSubject,
    text: adminText,
    html: htmlUser,
    type: 'NOTIFICACION_ADMIN'
  });

  return { userResult, adminResult };
}

/**
 * Enviar recuperación de contraseña al mail del usuario Y a zadik.arg@gmail.com
 */
export async function sendPasswordRecoveryNotification({ workshop, email, user, password }) {
  const nombreTaller = workshop?.nombreTaller || user;

  const subject = `Restauración de Contraseña — AutoCheck 360 (${user})`;
  const text = `Hola ${nombreTaller},

Has solicitado la recuperación de tu contraseña para el sistema AutoCheck 360.

Tus datos de acceso son:
• Usuario: ${user}
• Contraseña: ${password}

Podés cambiar tu contraseña en cualquier momento ingresando a tu Perfil dentro del sistema.

Soporte técnico: WhatsApp 3512469463 | zadik.arg@gmail.com

Saludos,
Equipo de AutoCheck 360`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #ffffff;">
      <div style="background-color: #1E40AF; padding: 16px; border-radius: 8px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px;">AutoCheck <span style="color: #F97316;">360</span></h1>
        <p style="color: #fef08a; margin: 4px 0 0 0; font-size: 13px;">Restauración de Contraseña</p>
      </div>

      <div style="padding: 20px 0;">
        <p style="font-size: 15px; color: #374151;">Hola <strong>${nombreTaller}</strong>,</p>
        <p style="font-size: 14px; color: #4b5563;">A continuación te enviamos las credenciales solicitadas para ingresar al sistema:</p>

        <div style="background-color: #fffbeb; padding: 16px; border-radius: 8px; border-left: 4px solid #F97316; margin: 20px 0;">
          <p style="margin: 4px 0; font-size: 14px;"><strong>👤 Usuario:</strong> <span style="font-family: monospace; font-size: 16px; color: #1E40AF;">${user}</span></p>
          <p style="margin: 4px 0; font-size: 14px;"><strong>🔑 Contraseña:</strong> <span style="font-family: monospace; font-size: 16px; color: #DC2626;">${password}</span></p>
        </div>

        <p style="font-size: 13px; color: #6b7280;">Podés cambiar tu contraseña cuando quieras en la sección <strong>Perfil</strong> dentro de tu sesión.</p>
      </div>
    </div>
  `;

  // Send to user email
  const userResult = await sendEmailNotification({
    to: email,
    subject,
    text,
    html,
    type: 'RECUPERAR_PASSWORD_USUARIO'
  });

  // Send notification to admin email zadik.arg@gmail.com
  const adminResult = await sendEmailNotification({
    to: 'zadik.arg@gmail.com',
    subject: `[SOLICITUD DE RECUPERACIÓN] Usuario: ${user} - Taller: ${nombreTaller}`,
    text: `El usuario "${user}" (${email}) solicitó la restauración de su contraseña.\nContraseña actual: ${password}`,
    html,
    type: 'RECUPERAR_PASSWORD_ADMIN'
  });

  return { userResult, adminResult };
}
