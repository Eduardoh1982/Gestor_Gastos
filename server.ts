import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

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

// 1. Probar conexión SMTP y enviar correo de prueba
app.post('/api/test-smtp', async (req, res) => {
  try {
    const { smtpConfig, testEmail } = req.body;
    if (!smtpConfig) {
      return res.status(400).json({ success: false, error: 'Falta la configuración SMTP.' });
    }

    const transporter = createTransporter(smtpConfig);

    // Verificar conexión con el servidor SMTP
    await transporter.verify();

    // Si se especificó un correo de destino de prueba, enviar el email
    let messageId: string | undefined;
    if (testEmail && testEmail.trim()) {
      const fromAddress = smtpConfig.fromEmail?.trim() || smtpConfig.user.trim();
      const fromName = smtpConfig.fromName?.trim() || 'Sistema de Tesorería Escolar';

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromAddress}>`,
        to: testEmail.trim(),
        subject: 'Prueba de Conexión SMTP - Sistema de Tesorería',
        text: `Hola!\n\nEste es un correo de prueba enviado exitosamente desde el Sistema de Tesorería Escolar.\n\nConfiguración validada:\n• Servidor SMTP: ${smtpConfig.host}:${smtpConfig.port}\n• Usuario: ${smtpConfig.user}\n• Fecha y Hora: ${new Date().toLocaleString('es-CL')}\n\nLas notificaciones automáticas de cobro a apoderados están listas para funcionar.`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 12px;">
            <h2 style="color: #4f46e5; margin-bottom: 8px;">Conexión SMTP Exitosa</h2>
            <p style="color: #475569; font-size: 14px;">Este es un correo de prueba enviado desde el Sistema de Tesorería Escolar.</p>
            <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #cbd5e1; font-size: 13px;">
              <strong>Detalles técnicos validados:</strong><br/>
              • <strong>Servidor SMTP:</strong> ${smtpConfig.host}:${smtpConfig.port}<br/>
              • <strong>Usuario:</strong> ${smtpConfig.user}<br/>
              • <strong>Fecha y Hora:</strong> ${new Date().toLocaleString('es-CL')}
            </div>
            <p style="color: #16a34a; font-weight: bold; font-size: 13px;">✓ El servidor SMTP está correctamente configurado y listo para notificar a los apoderados.</p>
          </div>
        `,
      });
      messageId = info.messageId;
    }

    return res.json({
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
});

// 2. Enviar un correo individual
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, text, html, smtpConfig } = req.body;
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
      to,
      subject,
      text,
      html: html || `<pre style="font-family: sans-serif; white-space: pre-wrap;">${text}</pre>`,
    });

    return res.json({
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
});

// 3. Enviar lote de correos
app.post('/api/send-batch-emails', async (req, res) => {
  try {
    const { emails, smtpConfig } = req.body;
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

    return res.json({
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
});

// Montar Vite middlewares en desarrollo o archivos estáticos en producción
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = Number(process.env.PORT) || 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

startServer();
