import { Student, CourseConfig } from '../types';
import { isTodayBirthday } from './birthdayUtils';
import { sendBirthdayGreetingEmail } from './emailService';
import { addMovementLog, getStoredAuthSession } from './storage';

const STORAGE_KEY_SENT_BIRTHDAYS = 'tesoreria_sent_birthday_greetings_v1';

interface SentBirthdayRecord {
  studentId: string;
  dateSent: string; // YYYY-MM-DD
  timestamp: string;
  email: string;
}

function getTodayString(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getSentBirthdayRecords(): Record<string, SentBirthdayRecord> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SENT_BIRTHDAYS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function isBirthdayGreetingSentToday(studentId: string): boolean {
  const records = getSentBirthdayRecords();
  const todayStr = getTodayString();
  const key = `${studentId}_${todayStr}`;
  return Boolean(records[key]);
}

export function recordBirthdayGreetingSent(student: Student): void {
  const records = getSentBirthdayRecords();
  const todayStr = getTodayString();
  const key = `${student.id}_${todayStr}`;
  records[key] = {
    studentId: student.id,
    dateSent: todayStr,
    timestamp: new Date().toISOString(),
    email: student.emailApoderado || '',
  };
  try {
    localStorage.setItem(STORAGE_KEY_SENT_BIRTHDAYS, JSON.stringify(records));
  } catch (e) {
    console.error('Error guardando registro de cumpleaños enviado:', e);
  }
}

export interface AutomaticBirthdayCheckResult {
  sentStudents: Student[];
  alreadySentStudents: Student[];
  noEmailStudents: Student[];
}

/**
 * Revisa automáticamente los cumpleaños del día y despacha el correo festivo vía SMTP
 * a los apoderados correspondientes de forma automática.
 */
export async function checkAndDispatchAutomaticBirthdayEmails(
  students: Student[],
  config: CourseConfig
): Promise<AutomaticBirthdayCheckResult> {
  const result: AutomaticBirthdayCheckResult = {
    sentStudents: [],
    alreadySentStudents: [],
    noEmailStudents: [],
  };

  // Si el usuario desactivó el envío automático en configuración, no hacer nada
  if (config.envioAutomaticoCumpleanos === false) {
    return result;
  }

  // Verificar si SMTP está configurado con credenciales válidas
  const smtp = config.smtpConfig;
  if (!smtp || !smtp.user || !smtp.pass) {
    return result;
  }

  // Buscar alumnos activos que cumplan años hoy
  const todayBirthdays = students.filter(
    (s) => s.activo !== false && isTodayBirthday(s.fechaNacimiento)
  );

  if (todayBirthdays.length === 0) {
    return result;
  }

  const session = getStoredAuthSession();
  const gestorName =
    session?.gestorUser?.nombre || 'Sistema Automático de Notificaciones';

  for (const student of todayBirthdays) {
    // Si ya se le envió hoy, evitar reenvíos duplicados
    if (isBirthdayGreetingSentToday(student.id)) {
      result.alreadySentStudents.push(student);
      continue;
    }

    if (!student.emailApoderado || !student.emailApoderado.trim()) {
      result.noEmailStudents.push(student);
      continue;
    }

    try {
      const sendRes = await sendBirthdayGreetingEmail({
        student,
        config,
        smtpConfig: smtp,
        senderName: `Directiva y Tesorería ${config.nombreCurso}`,
      });

      if (sendRes.success) {
        recordBirthdayGreetingSent(student);
        result.sentStudents.push(student);

        addMovementLog({
          modulo: 'estudiantes',
          tipoAccion: 'notificacion_enviada',
          titulo: `🎂 Correo Automático de Cumpleaños Enviado: ${student.nombres}`,
          descripcion: `Envío automático de saludo de cumpleaños realizado exitosamente vía SMTP a ${student.emailApoderado} para el alumno ${student.nombres} ${student.apellidos}.`,
          usuario: gestorName,
          rol: 'admin',
          referenciaId: student.id,
          referenciaNombre: `${student.nombres} ${student.apellidos}`,
          detallesAdicionales: {
            tipo: 'automatico_cumpleanos',
            fechaNacimiento: student.fechaNacimiento,
            apoderado: student.nombreApoderado,
            email: student.emailApoderado,
          },
        });
      } else {
        console.warn(`Fallo en envío automático para ${student.nombres}:`, sendRes.error);
      }
    } catch (err) {
      console.error(`Error en despacho automático de cumpleaños para ${student.nombres}:`, err);
    }
  }

  return result;
}
