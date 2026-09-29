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

export interface CourseConfig {
  nombreCurso: string;
  institucion: string;
  currentYear: number;
  availableYears: number[];
  cuotaMensualPorDefecto: number;
  datosBancarios: BankAccountDetails;
}

export type UserRole = 'admin' | 'auditor' | 'apoderado';

export interface AuthSession {
  type: 'gestor' | 'apoderado';
  role?: 'admin' | 'auditor';
  gestorUser?: GestorUser;
  apoderadoEmail?: string;
  studentIds?: string[];
}
