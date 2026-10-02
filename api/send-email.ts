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
    const { to, subject, text, html, smtpConfig } = req.body || {};
    if (!to || !subject) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros obligatorios (to, subject).' });
    }
    if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
      return res.status(400).json({
        success: false,
        error: 'El servidor SMTP no está configurado. Por favor configura las credenciales SMTP en Administración.',
      });
    }

    const transporter = createTransporter(smtpConfig);
    const fromAddress = smtpConfig.fromEmail?.trim() || smtpConfig.user.trim();
    const fromName = smtpConfig.fromName?.trim() || 'Tesorería Escolar';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: String(to).trim(),
      subject: String(subject).trim(),
      text,
      html: html || `<pre style="font-family: sans-serif; white-space: pre-wrap;">${text}</pre>`,
    });

    return res.status(200).json({
      success: true,
      messageId: info.messageId,
      response: info.response,
    });
  } catch (error: any) {
    console.error('Error en send-email:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error al enviar el correo vía SMTP.',
    });
  }
}
