import { SmtpConfig } from '../types';

export interface SendEmailParams {
  to: string;
  subject: string;
  text: string;
  html?: string;
  smtpConfig: SmtpConfig;
}

export interface SendEmailResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface TestSmtpResponse {
  success: boolean;
  message?: string;
  messageId?: string;
  error?: string;
}

export interface BatchEmailItem {
  id: string;
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface BatchEmailResponse {
  success: boolean;
  total?: number;
  sentCount?: number;
  failedCount?: number;
  results?: {
    id: string;
    to: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }[];
  error?: string;
}

/**
 * Prueba la conexión con el servidor SMTP y opcionalmente envía un correo de prueba
 */
export async function testSmtpConnection(
  smtpConfig: SmtpConfig,
  testEmail?: string
): Promise<TestSmtpResponse> {
  try {
    const res = await fetch('/api/test-smtp', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ smtpConfig, testEmail }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al conectar con el servidor: ${err.message || 'Servidor inaccesible'}`,
    };
  }
}

/**
 * Envía un correo electrónico individual vía SMTP
 */
export async function sendEmailViaSmtp(
  params: SendEmailParams
): Promise<SendEmailResponse> {
  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Error de red al enviar el correo: ${err.message || 'No se pudo conectar con el servidor'}`,
    };
  }
}

/**
 * Envía una lista de correos electrónicos en lote vía SMTP
 */
export async function sendBatchEmailsViaSmtp(
  emails: BatchEmailItem[],
  smtpConfig: SmtpConfig
): Promise<BatchEmailResponse> {
  try {
    const res = await fetch('/api/send-batch-emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ emails, smtpConfig }),
    });

    const data = await res.json();
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Error al procesar envío por lote: ${err.message || 'Fallo de conexión'}`,
    };
  }
}
