import { SmtpConfig, Student, CourseConfig } from '../types';
import { calculateAge } from './studentExcel';

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

export interface BirthdayGreetingParams {
  student: Student;
  config: CourseConfig;
  smtpConfig: SmtpConfig;
  customMessage?: string;
  senderName?: string;
}

async function safeParseJsonResponse<T>(res: Response, endpoint: string): Promise<T> {
  const rawText = await res.text();
  let data: any;

  try {
    data = JSON.parse(rawText);
  } catch (_e) {
    const isVercel404 =
      res.status === 404 ||
      rawText.toLowerCase().includes('the page could not be found') ||
      rawText.toLowerCase().includes('cannot post') ||
      rawText.includes('<!DOCTYPE') ||
      rawText.includes('<html');

    if (isVercel404) {
      throw new Error(
        `El endpoint backend ${endpoint} no respondió en JSON (Código HTTP ${res.status}). En despliegues en Vercel, asegúrate de que la carpeta /api con las Serverless Functions esté incluida en el proyecto y que vercel.json esté en la raíz.`
      );
    }

    throw new Error(
      `El servidor respondió con código ${res.status} y contenido no JSON: ${rawText.slice(0, 100)}`
    );
  }

  return data as T;
}

/**
 * Genera el asunto, texto plano y diseño HTML festivo para el correo de cumpleaños
 */
export function generateBirthdayEmailContent(
  student: Student,
  config: CourseConfig,
  customMessage?: string,
  senderName?: string
): { subject: string; text: string; html: string } {
  const edad = calculateAge(student.fechaNacimiento);
  const edadTexto = edad !== null ? `en sus ${edad} años` : '';
  const cursoNombre = config.nombreCurso || 'nuestro curso';
  const apoderadoNombre = student.nombreApoderado || 'Estimada Familia';

  const subject = `🎂🎈 ¡Muy Feliz Cumpleaños, ${student.nombres}! - ${cursoNombre}`;

  const text = customMessage?.trim() || (
    `¡Estimada familia de ${student.nombres}!\n\n` +
    `En nombre de la directiva y de toda la comunidad escolar de ${cursoNombre}, queremos enviar un muy afectuoso y cariñoso saludo de Feliz Cumpleaños a ${student.nombres} ${student.apellidos} ${edadTexto}.\n\n` +
    `Deseamos de todo corazón que pase un día extraordinario junto a sus seres queridos, lleno de alegrías, juegos y mucho amor.\n\n` +
    `¡Muchas felicidades en su día!\n\n` +
    `Atentamente,\n` +
    `${senderName || 'Directiva y Tesorería'}\n` +
    `${cursoNombre}`
  );

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0; box-shadow: 0 4px 14px rgba(0,0,0,0.06);">
      <div style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
        <div style="font-size: 50px; line-height: 1; margin-bottom: 12px;">🎂🎈</div>
        <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">¡Muy Feliz Cumpleaños!</h1>
        <p style="margin: 8px 0 0 0; font-size: 19px; font-weight: 700; color: #fdf2f8;">${student.nombres} ${student.apellidos}</p>
        ${edad !== null ? `<div style="display: inline-block; margin-top: 10px; background: rgba(255,255,255,0.22); backdrop-filter: blur(4px); padding: 5px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; border: 1px solid rgba(255,255,255,0.35);">🎉 ¡Celebrando ${edad} años de vida!</div>` : ''}
      </div>
      <div style="padding: 28px 24px; color: #334155; line-height: 1.6; font-size: 15px;">
        <p style="margin-top: 0; font-size: 15px;">Estimado/a <strong>${apoderadoNombre}</strong> y familia:</p>
        <p style="color: #475569; font-size: 14px; white-space: pre-wrap;">${customMessage?.trim() || `En nombre de la directiva y de toda la comunidad de <strong>${cursoNombre}</strong>, queremos hacerles llegar un caluroso saludo y nuestros más sinceros deseos de felicidad para <strong>${student.nombres}</strong> en su día.`}</p>
        <div style="background: #fdf4ff; border-left: 4px solid #db2777; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 22px 0; font-style: italic; color: #701a75; font-size: 14px;">
          "Que este nuevo año esté colmado de sonrisas, nuevos aprendizajes, bellas amistades y momentos inolvidables."
        </div>
        <p style="color: #64748b; font-size: 14px; margin-bottom: 0;">¡Que disfruten de una hermosa e inolvidable jornada de celebración familiar!</p>
      </div>
      <div style="background: #f8fafc; padding: 18px 24px; text-align: center; border-top: 1px solid #e2e8f0; font-size: 12px; color: #64748b;">
        <strong style="color: #334155;">${senderName || 'Directiva y Tesorería'}</strong> • ${cursoNombre}<br/>
        Enviado a través del Sistema de Gestión de Tesorería Escolar
      </div>
    </div>
  `;

  return { subject, text, html };
}

/**
 * Envía un correo de saludo de cumpleaños al apoderado del alumno vía SMTP
 */
export async function sendBirthdayGreetingEmail(
  params: BirthdayGreetingParams
): Promise<SendEmailResponse> {
  const { student, config, smtpConfig, customMessage, senderName } = params;

  if (!student.emailApoderado || !student.emailApoderado.trim()) {
    return {
      success: false,
      error: `El alumno ${student.nombres} ${student.apellidos} no tiene registrado un correo electrónico de apoderado.`,
    };
  }

  const { subject, text, html } = generateBirthdayEmailContent(
    student,
    config,
    customMessage,
    senderName
  );

  return sendEmailViaSmtp({
    to: student.emailApoderado.trim(),
    subject,
    text,
    html,
    smtpConfig,
  });
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

    const data = await safeParseJsonResponse<TestSmtpResponse>(res, '/api/test-smtp');
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

    const data = await safeParseJsonResponse<SendEmailResponse>(res, '/api/send-email');
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

    const data = await safeParseJsonResponse<BatchEmailResponse>(res, '/api/send-batch-emails');
    return data;
  } catch (err: any) {
    return {
      success: false,
      error: `Error al procesar envío por lote: ${err.message || 'Fallo de conexión'}`,
    };
  }
}
