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
    const { emails, smtpConfig } = req.body || {};
    if (!Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ success: false, error: 'La lista de correos está vacía.' });
    }
    if (!smtpConfig || !smtpConfig.user || !smtpConfig.pass) {
      return res.status(400).json({
        success: false,
        error: 'El servidor SMTP no está configurado. Por favor ingresa el usuario y contraseña SMTP en Administración.',
      });
    }

    const transporter = createTransporter(smtpConfig);
    const fromAddress = smtpConfig.fromEmail?.trim() || smtpConfig.user.trim();
    const fromName = smtpConfig.fromName?.trim() || 'Tesorería Escolar';

    const results = [];
    for (const emailItem of emails) {
      try {
        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromAddress}>`,
          to: emailItem.to,
          subject: emailItem.subject,
          text: emailItem.text,
          html: emailItem.html || `<pre style="font-family: sans-serif; white-space: pre-wrap;">${emailItem.text}</pre>`,
        });
        results.push({
          id: emailItem.id || emailItem.to,
          to: emailItem.to,
          success: true,
          messageId: info.messageId,
        });
      } catch (err: any) {
        results.push({
          id: emailItem.id || emailItem.to,
          to: emailItem.to,
          success: false,
          error: err.message || 'Fallo de entrega SMTP',
        });
      }
    }

    return res.status(200).json({
      success: true,
      total: emails.length,
      sentCount: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      results,
    });
  } catch (error: any) {
    console.error('Error en send-batch-emails:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Error general en envío por lote.',
    });
  }
}
