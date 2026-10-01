export type MonthIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

export const MONTH_NAMES = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
] as const;

export type EntryType = 'full_year' | 'mid_year';

export interface Student {
  id: string;
  nombres: string;
  apellidos: string;
  rut: string;
  nombreApoderado: string;
  telefonoApoderado: string;
  emailApoderado: string;
  tipoIngreso: EntryType;
  mesIngreso: MonthIndex; // 0 = Enero, 1 = Feb, etc. Relevant if tipoIngreso === 'mid_year'
  noPagaCuota: boolean; // Exempt / Scholarship flag ("No paga cuota")
  activo?: boolean; // Activo (true) o Inactivo/Retirado (false)
  fechaNacimiento?: string; // Formato YYYY-MM-DD
  fechaIngreso?: string; // Formato YYYY-MM-DD
  observaciones?: string;
  creadoEn: string;
}

export type PaymentStatus = 'paid' | 'partial' | 'pending' | 'exempt' | 'not_applicable';

export interface FeePayment {
  id: string;
  studentId: string;
  year: number;
  month: MonthIndex;
  monto: number; // Monto pagado
  montoEsperado: number; // Monto de cuota del mes
  fechaPago: string;
  medioPago: 'transferencia' | 'efectivo' | 'deposito' | 'otro';
  numeroComprobante?: string;
  comprobanteUrl?: string; // Base64 or image URL
  observaciones?: string;
  esExento?: boolean; // True si el mes fue eximido de pago y saldado
  motivoExencion?: string; // Motivo de la exención (ej. Beca, Caso especial, Aprobado directiva)
  eximidoPor?: string; // Nombre o rol de quien aprobó la exención
}

export interface ExpenseCategory {
  id: string;
  nombre: string;
  color?: string;
  descripcion?: string;
}

export interface Expense {
  id: string;
  year: number;
  descripcion: string;
  categoriaId: string;
  categoriaNombre: string;
  monto: number;
  fecha: string;
  proveedor: string;
  numeroBoleta: string;
  observaciones?: string;
  comprobanteUrl?: string; // Foto de boleta o comprobante en base64
  creadoPor?: string;
}

export interface ExtraIncome {
  id: string;
  year: number;
  concepto: string; // ej: Rifa, Cuota Extraordinaria, Bingo, Kermesse, Donación
  descripcion: string;
  monto: number; // Total recaudado
  fecha: string;
  origenFondos: string;
  observaciones?: string;
  comprobanteUrl?: string;
  // Control por alumno para Rifa o Cuota Extraordinaria
  tipoCobro?: 'fijo_por_alumno' | 'general';
  montoPorAlumno?: number;
  alumnosPagados?: string[]; // IDs de los alumnos que han pagado
  alumnosExentos?: string[]; // IDs de los alumnos exentos de este cobro extraordinario
}

export type LogActionType =
  | 'pago_cuota_creado'
  | 'pago_cuota_anulado'
  | 'pago_cuota_abono'
  | 'pago_cuota_eximido'
  | 'pago_cuota_exencion_anulada'
  | 'gasto_creado'
  | 'gasto_editado'
  | 'gasto_eliminado'
  | 'ingreso_extra_creado'
  | 'ingreso_extra_editado'
  | 'ingreso_extra_eliminado'
  | 'ingreso_extra_pago_alumno'
  | 'ingreso_extra_exencion_alumno'
  | 'notificacion_enviada'
  | 'sistema_reset'
  | 'sistema_config';

export interface MovementLog {
  id: string;
  fechaHora: string; // Formato ISO
  timestamp: number;
  modulo: 'cuotas' | 'gastos' | 'ingresos_extra' | 'sistema';
  tipoAccion: LogActionType;
  titulo: string;
  descripcion: string;
  usuario: string; // Nombre o username del gestor
  rol: UserRole;
  montoAfectado?: number;
  referenciaId?: string; // id del alumno, gasto o ingreso extra
  referenciaNombre?: string; // Nombre del alumno, proveedor o concepto
  detallesAdicionales?: Record<string, any>;
}

export interface GestorUser {
  id: string;
  username: string;
  password: string;
  role: 'admin' | 'auditor';
  nombre: string;
}

export interface BankAccountDetails {
  banco: string;
  tipoCuenta: string; // Cta Corriente, Cta Vista, Cta RUT
  numeroCuenta: string;
  titularNombre: string;
  titularRut: string;
  emailConfirmacion: string;
}

export interface SmtpConfig {
  activo: boolean; // Si el envío por servidor SMTP está habilitado
  host: string; // ej: smtp.gmail.com, smtp.office365.com
  port: number; // ej: 587 o 465
  secure: boolean; // true para 465, false para 587
  user: string; // correo o usuario SMTP
  pass: string; // contraseña o clave de aplicación de Gmail/Outlook
  fromEmail: string; // correo remitente
  fromName: string; // nombre del remitente (ej: Tesorería Curso)
}

export interface CourseConfig {
  nombreCurso: string;
  institucion: string;
  currentYear: number;
  availableYears: number[];
  cuotaMensualPorDefecto: number;
  datosBancarios: BankAccountDetails;
  smtpConfig?: SmtpConfig;
  logoUrl?: string; // Custom uploaded logo in base64 or URL
}

export type UserRole = 'admin' | 'auditor' | 'apoderado';

export interface AuthSession {
  type: 'gestor' | 'apoderado';
  role?: 'admin' | 'auditor';
  gestorUser?: GestorUser;
  apoderadoEmail?: string;
  studentIds?: string[];
}
