import nodemailer from 'nodemailer';

interface SmtpPayload {
  host: string;
  port: number;
  secure?: boolean;
  user: string;
  pass: string;
  fromEmail?: string;
  fromName?: string;
}

function createTransporter(config: SmtpPayload) {
  if (!config.user || !config.pass) {
    throw new Error('Faltan credenciales SMTP: El usuario y la contraseña/clave de app son obligatorios.');
  }

  const port = Number(config.port) || 587;
  const isSecure = config.secure ?? port === 465;

  return nodemailer.createTransport({
    host: config.host || 'smtp.gmail.com',
    port,
    secure: isSecure,
    auth: {
      user: config.user.trim(),
      pass: config.pass.trim(),
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
}

export default async function handler(req: any, res: any) {
  // Configurar CORS para permitir llamadas seguras
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método no permitido. Use POST.' });
  }

  try {
    const { smtpConfig, testEmail } = req.body || {};
    if (!smtpConfig) {
      return res.status(400).json({ success: false, error: 'Falta la configuración SMTP.' });
    }

    const transporter = createTransporter(smtpConfig);

    // Verificar conexión con el servidor SMTP
    await transporter.verify();

    let messageId: string | undefined;
    if (testEmail && String(testEmail).trim()) {
      const fromAddress = smtpConfig.fromEmail?.trim() || smtpConfig.user.trim();
      const fromName = smtpConfig.fromName?.trim() || 'Sistema de Tesorería Escolar';

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: String(testEmail).trim(),
        subject: 'Prueba de Conexión SMTP - Sistema de Tesorería',
        text: `Hola!\n\nEste es un correo de prueba enviado exitosamente desde el Sistema de Tesorería Escolar.\n\nConfiguración validada:\n• Servidor SMTP: ${smtpConfig.host}:${smtpConfig.port}\n• Usuario: ${smtpConfig.user}\n• Fecha y Hora: ${new Date().toLocaleString('es-CL')}\n\nLas notificaciones automáticas y saludos a apoderados están listos para funcionar.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px;">
            <h2 style="color: #4f46e5; margin-bottom: 8px;">Conexión SMTP Exitosa</h2>
            <p style="color: #475569; font-size: 14px;">Este es un correo de prueba enviado desde el Sistema de Tesorería Escolar (Vercel Serverless).</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #cbd5e1; font-size: 13px;">
              <strong>Detalles técnicos validados:</strong><br/>
              • <strong>Servidor SMTP:</strong> ${smtpConfig.host}:${smtpConfig.port}<br/>
              • <strong>Usuario:</strong> ${smtpConfig.user}<br/>
              • <strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-CL')}
            </div>
            <p style="color: #16a34a; font-weight: bold; font-size: 13px;">✓ El servidor SMTP está correctamente configurado y listo para notificar y saludar a los apoderados.</p>
          </div>
        `,
      });
      messageId = info.messageId;
    }

    return res.status(200).json({
      success: true,
      message: 'Conexión SMTP verificada y correo de prueba enviado con éxito.',
      messageId,
    });
  } catch (error: any) {
    console.error('Error en test-smtp:', error);
    let errorMessage = error.message || 'Error al conectar con el servidor SMTP.';
    if (error.code === 'EAUTH') {
      errorMessage = 'Error de autenticación SMTP (EAUTH). Verifica tu usuario y que la contraseña sea una "Contraseña de Aplicación" (App Password en Gmail), no tu contraseña habitual.';
    } else if (error.code === 'ESOCKET' || error.code === 'ETIMEDOUT') {
      errorMessage = 'Tiempo de espera agotado o puerto bloqueado al conectar con el servidor SMTP. Verifica el host y el puerto (ej: 587 o 465).';
    } else if (error.code === 'EDNS') {
      errorMessage = 'No se pudo resolver el nombre del host SMTP. Verifica que el servidor (ej: smtp.gmail.com) esté bien escrito.';
    }
    return res.status(500).json({ success: false, error: errorMessage });
  }
}
