import {
  CourseConfig,
  Student,
  FeePayment,
  Expense,
  ExtraIncome,
  ExpenseCategory,
  MonthIndex,
  MONTH_NAMES,
  GestorUser,
  AuthSession,
  MovementLog,
  LogActionType,
} from '../types';

const STORAGE_KEYS = {
  CONFIG: 'tesoreria_config_v1',
  STUDENTS: 'tesoreria_students_v1',
  PAYMENTS: 'tesoreria_payments_v1',
  EXPENSES: 'tesoreria_expenses_v1',
  EXTRA_INCOMES: 'tesoreria_extra_incomes_v1',
  CATEGORIES: 'tesoreria_categories_v1',
  GESTOR_USERS: 'tesoreria_gestor_users_v1',
  AUTH_SESSION: 'tesoreria_auth_session_v1',
  MOVEMENT_LOGS: 'tesoreria_movement_logs_v1',
};

export const DEFAULT_GESTOR_USERS: GestorUser[] = [
  {
    id: 'user-admin',
    username: 'admin',
    password: 'admin123',
    role: 'admin',
    nombre: 'Administrador General',
  },
  {
    id: 'user-auditor',
    username: 'auditor',
    password: 'auditor123',
    role: 'auditor',
    nombre: 'Auditor de Cuentas',
  },
];

export const DEFAULT_CATEGORIES: ExpenseCategory[] = [
  { id: 'cat-1', nombre: 'Actividades y Convivencias', color: '#3B82F6', descripcion: 'Celebraciones, día del alumno, fiestas patrias' },
  { id: 'cat-2', nombre: 'Alimentación', color: '#F59E0B', descripcion: 'Colaciones, bebidas, tortas, almuerzos' },
  { id: 'cat-3', nombre: 'Limpieza y Aseo', color: '#10B981', descripcion: 'Artículos de aseo, toallas de papel, cloro, bolsas' },
  { id: 'cat-4', nombre: 'Materiales y Fotocopias', color: '#8B5CF6', descripcion: 'Cartulinas, plumones, impresiones y guías' },
  { id: 'cat-5', nombre: 'Regalos y Premios', color: '#EC4899', descripcion: 'Día del profesor, premiaciones, cumpleaños' },
  { id: 'cat-6', nombre: 'Transporte y Paseos', color: '#06B6D4', descripcion: 'Buses para salidas pedagógicas o paseo fin de año' },
  { id: 'cat-7', nombre: 'Imprevistos y Varios', color: '#64748B', descripcion: 'Gastos menores de tesorería y botiquín' },
];

export const CURRENT_SYSTEM_YEAR = new Date().getFullYear();

export const DEFAULT_CONFIG: CourseConfig = {
  nombreCurso: 'Shito ryu',
  institucion: 'Gambaru',
  currentYear: CURRENT_SYSTEM_YEAR,
  availableYears: [CURRENT_SYSTEM_YEAR - 2, CURRENT_SYSTEM_YEAR - 1, CURRENT_SYSTEM_YEAR, CURRENT_SYSTEM_YEAR + 1],
  cuotaMensualPorDefecto: 3000,
  datosBancarios: {
    banco: 'Banco Estado',
    tipoCuenta: 'Cuenta RUT / Vista',
    numeroCuenta: '12.345.678-9',
    titularNombre: 'Directiva Tesorería',
    titularRut: '12.345.678-9',
    emailConfirmacion: 'tesoreria.curso@gmail.com',
  },
  smtpConfig: {
    activo: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: 'tesoreria.curso@gmail.com',
    fromName: 'Tesorería Shito ryu',
  },
};

export const DEFAULT_STUDENTS: Student[] = [
  {
    id: 'stu-1',
    nombres: 'Nombre2',
    apellidos: 'Apellido 2',
    rut: '24.123.456-7',
    nombreApoderado: 'María Pérez',
    telefonoApoderado: '+56987654321',
    emailApoderado: 'maria.perez@example.cl',
    tipoIngreso: 'mid_year',
    mesIngreso: 3, // Abril
    noPagaCuota: false,
    activo: true,
    fechaNacimiento: '2012-05-14',
    fechaIngreso: '2026-04-01',
    observaciones: 'Ingresó en abril trasladado desde otra región',
    creadoEn: '2026-03-25T10:00:00.000Z',
  },
  {
    id: 'stu-2',
    nombres: 'Alexis',
    apellidos: 'Herrera',
    rut: '22.987.654-3',
    nombreApoderado: 'Eduardo Herrera',
    telefonoApoderado: '+56912345678',
    emailApoderado: 'eduardo.herrera22@gmail.com',
    tipoIngreso: 'full_year',
    mesIngreso: 0,
    noPagaCuota: false,
    activo: true,
    fechaNacimiento: '2010-08-20',
    fechaIngreso: '2026-01-05',
    observaciones: 'Hermano mayor de Martín Herrera',
    creadoEn: '2026-01-10T09:00:00.000Z',
  },
  {
    id: 'stu-6',
    nombres: 'Martín',
    apellidos: 'Herrera',
    rut: '25.432.109-8',
    nombreApoderado: 'Eduardo Herrera',
    telefonoApoderado: '+56912345678',
    emailApoderado: 'eduardo.herrera22@gmail.com',
    tipoIngreso: 'full_year',
    mesIngreso: 0,
    noPagaCuota: false,
    activo: true,
    fechaNacimiento: '2014-11-12',
    fechaIngreso: '2026-01-05',
    observaciones: 'Hermano menor de Alexis Herrera (Mismo apoderado)',
    creadoEn: '2026-01-10T09:30:00.000Z',
  },
  {
    id: 'stu-3',
    nombres: 'Sofía',
    apellidos: 'Valenzuela Morales',
    rut: '23.555.123-4',
    nombreApoderado: 'Carla Morales',
    telefonoApoderado: '+56994433221',
    emailApoderado: 'carla.morales@example.cl',
    tipoIngreso: 'full_year',
    mesIngreso: 0,
    noPagaCuota: false,
    activo: true,
    fechaNacimiento: '2011-03-28',
    fechaIngreso: '2026-01-08',
    observaciones: '',
    creadoEn: '2026-01-12T11:00:00.000Z',
  },
  {
    id: 'stu-4',
    nombres: 'Matías',
    apellidos: 'González Pinto',
    rut: '24.888.999-1',
    nombreApoderado: 'Roberto González',
    telefonoApoderado: '+56977665544',
    emailApoderado: 'roberto.g@example.cl',
    tipoIngreso: 'full_year',
    mesIngreso: 0,
    noPagaCuota: true, // Exento
    activo: true,
    fechaNacimiento: '2013-09-17',
    fechaIngreso: '2026-01-08',
    observaciones: 'Exento de cuota por acuerdo de directiva (beca de apoyo escolar)',
    creadoEn: '2026-01-15T14:30:00.000Z',
  },
  {
    id: 'stu-5',
    nombres: 'Camila',
    apellidos: 'Rojas Castro',
    rut: '23.111.222-8',
    nombreApoderado: 'Andrea Castro',
    telefonoApoderado: '+56966554433',
    emailApoderado: 'andrea.castro@example.cl',
    tipoIngreso: 'full_year',
    mesIngreso: 0,
    noPagaCuota: false,
    activo: true,
    fechaNacimiento: '2012-12-04',
    fechaIngreso: '2026-01-10',
    observaciones: '',
    creadoEn: '2026-01-15T15:00:00.000Z',
  },
];

export const DEFAULT_PAYMENTS: FeePayment[] = [
  // Payments for "Nombre2 Apellido 2" (Paid April to September = 6 months * 3000 = $18.000)
  { id: 'pay-1', studentId: 'stu-1', year: 2026, month: 3, monto: 3000, montoEsperado: 3000, fechaPago: '2026-04-05', medioPago: 'transferencia', numeroComprobante: 'TR-10492' },
  { id: 'pay-2', studentId: 'stu-1', year: 2026, month: 4, monto: 3000, montoEsperado: 3000, fechaPago: '2026-05-06', medioPago: 'transferencia', numeroComprobante: 'TR-11029' },
  { id: 'pay-3', studentId: 'stu-1', year: 2026, month: 5, monto: 3000, montoEsperado: 3000, fechaPago: '2026-06-04', medioPago: 'transferencia', numeroComprobante: 'TR-11884' },
  { id: 'pay-4', studentId: 'stu-1', year: 2026, month: 6, monto: 3000, montoEsperado: 3000, fechaPago: '2026-07-08', medioPago: 'transferencia', numeroComprobante: 'TR-12501' },
  { id: 'pay-5', studentId: 'stu-1', year: 2026, month: 7, monto: 3000, montoEsperado: 3000, fechaPago: '2026-08-05', medioPago: 'transferencia', numeroComprobante: 'TR-13042' },
  { id: 'pay-6', studentId: 'stu-1', year: 2026, month: 8, monto: 3000, montoEsperado: 3000, fechaPago: '2026-09-02', medioPago: 'transferencia', numeroComprobante: 'TR-13988' },

  // Payments for "Alexis Herrera" (Paid January = $3.000) -> Total $21.000 between student 1 and 2, matching screenshot!
  { id: 'pay-7', studentId: 'stu-2', year: 2026, month: 0, monto: 3000, montoEsperado: 3000, fechaPago: '2026-01-18', medioPago: 'transferencia', numeroComprobante: 'TR-09823' },

  // Payment for "Martín Herrera" (Hermano de Alexis): Abono de $2.000 en Enero dejando $1.000 pendiente para saldar
  { id: 'pay-hermano-1', studentId: 'stu-6', year: 2026, month: 0, monto: 2000, montoEsperado: 3000, fechaPago: '2026-01-22', medioPago: 'transferencia', numeroComprobante: 'TR-09941' },

  // Payments for Camila Rojas (Paid Jan, Feb, Mar, Apr)
  { id: 'pay-8', studentId: 'stu-5', year: 2026, month: 0, monto: 3000, montoEsperado: 3000, fechaPago: '2026-01-20', medioPago: 'efectivo', numeroComprobante: 'REC-001' },
  { id: 'pay-9', studentId: 'stu-5', year: 2026, month: 1, monto: 3000, montoEsperado: 3000, fechaPago: '2026-02-22', medioPago: 'efectivo', numeroComprobante: 'REC-002' },
  { id: 'pay-10', studentId: 'stu-5', year: 2026, month: 2, monto: 3000, montoEsperado: 3000, fechaPago: '2026-03-25', medioPago: 'transferencia', numeroComprobante: 'TR-10293' },
  { id: 'pay-11', studentId: 'stu-5', year: 2026, month: 3, monto: 3000, montoEsperado: 3000, fechaPago: '2026-04-20', medioPago: 'transferencia', numeroComprobante: 'TR-10944' },
];

export const SAMPLE_RECEIPT_IMAGE = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="920" viewBox="0 0 600 920" fill="none"><rect width="600" height="920" fill="%23f8fafc"/><rect x="20" y="20" width="560" height="880" rx="12" fill="white" stroke="%23cbd5e1" stroke-width="2"/><text x="300" y="70" text-anchor="middle" font-family="sans-serif" font-size="20" font-weight="bold" fill="%230f172a">DISTRIBUIDORA CENTRAL ASEO LIMITADA</text><text x="300" y="95" text-anchor="middle" font-family="sans-serif" font-size="13" fill="%23475569">Giro: Venta de artículos de aseo, limpieza e higiene</text><text x="300" y="115" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%2364748b">Av. Libertador Bernardo O'Higgins 1420 - Santiago Centro</text><rect x="350" y="140" width="210" height="85" rx="6" fill="%23fff1f2" stroke="%23e11d48" stroke-width="2"/><text x="455" y="165" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="%23e11d48">R.U.T.: 76.842.190-K</text><text x="455" y="187" text-anchor="middle" font-family="sans-serif" font-size="13" font-weight="bold" fill="%23e11d48">BOLETA ELECTRÓNICA</text><text x="455" y="210" text-anchor="middle" font-family="monospace" font-size="16" font-weight="bold" fill="%23e11d48">N° 000847291</text><line x1="40" y1="245" x2="560" y2="245" stroke="%23e2e8f0" stroke-width="2" stroke-dasharray="4 4"/><text x="40" y="275" font-family="sans-serif" font-size="13" fill="%23334155"><tspan font-weight="bold">Fecha Emisión:</tspan> 12/03/2026 10:42:15</text><text x="40" y="300" font-family="sans-serif" font-size="13" fill="%23334155"><tspan font-weight="bold">Caja / Terminal:</tspan> 03 - Vendedor: Carlos M.</text><text x="40" y="325" font-family="sans-serif" font-size="13" fill="%23334155"><tspan font-weight="bold">Cliente:</tspan> Directiva Tesorería Shito ryu Gambaru</text><rect x="40" y="350" width="520" height="32" fill="%23f1f5f9" rx="4"/><text x="50" y="371" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155">CANT / DETALLE PRODUCTO</text><text x="430" y="371" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155" text-anchor="end">P. UNIT</text><text x="545" y="371" font-family="sans-serif" font-size="11" font-weight="bold" fill="%23334155" text-anchor="end">TOTAL</text><text x="50" y="410" font-family="sans-serif" font-size="13" fill="%231e293b">2 x Cloro Gel Concentrado 5L</text><text x="430" y="410" font-family="monospace" font-size="13" fill="%231e293b" text-anchor="end">$3.250</text><text x="545" y="410" font-family="monospace" font-size="13" font-weight="bold" fill="%231e293b" text-anchor="end">$6.500</text><text x="50" y="445" font-family="sans-serif" font-size="13" fill="%231e293b">2 x Toalla Nova Jumbo 250m</text><text x="430" y="445" font-family="monospace" font-size="13" fill="%231e293b" text-anchor="end">$2.500</text><text x="545" y="445" font-family="monospace" font-size="13" font-weight="bold" fill="%231e293b" text-anchor="end">$5.000</text><text x="50" y="480" font-family="sans-serif" font-size="13" fill="%231e293b">2 x Bolsas Basura 80x110 (10u)</text><text x="430" y="480" font-family="monospace" font-size="13" fill="%231e293b" text-anchor="end">$1.500</text><text x="545" y="480" font-family="monospace" font-size="13" font-weight="bold" fill="%231e293b" text-anchor="end">$3.000</text><line x1="40" y1="515" x2="560" y2="515" stroke="%23cbd5e1" stroke-width="1"/><rect x="330" y="535" width="230" height="95" rx="8" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="1"/><text x="350" y="565" font-family="sans-serif" font-size="13" fill="%2364748b">Sub Total:</text><text x="540" y="565" font-family="monospace" font-size="13" fill="%23334155" text-anchor="end">$12.185</text><text x="350" y="590" font-family="sans-serif" font-size="13" fill="%2364748b">IVA (19%):</text><text x="540" y="590" font-family="monospace" font-size="13" fill="%23334155" text-anchor="end">$2.315</text><text x="350" y="618" font-family="sans-serif" font-size="15" font-weight="bold" fill="%230f172a">TOTAL:</text><text x="540" y="618" font-family="monospace" font-size="17" font-weight="bold" fill="%23dc2626" text-anchor="end">$14.500</text><rect x="180" y="660" width="240" height="100" rx="6" fill="%23f1f5f9" stroke="%2394a3b8" stroke-width="1.5"/><text x="300" y="695" text-anchor="middle" font-family="monospace" font-size="12" font-weight="bold" fill="%23334155">TIMBRE ELECTRÓNICO S.I.I.</text><text x="300" y="720" text-anchor="middle" font-family="monospace" font-size="10" fill="%2364748b">Res. N° 80 de 2014 - Verifique documento</text><text x="300" y="742" text-anchor="middle" font-family="monospace" font-size="13" font-weight="bold" fill="%232563eb">www.sii.cl</text><text x="300" y="800" text-anchor="middle" font-family="sans-serif" font-size="12" fill="%2364748b">Medio de Pago: TARJETA DÉBITO (Aprob: 819203)</text><text x="300" y="830" text-anchor="middle" font-family="sans-serif" font-size="12" font-style="italic" fill="%2394a3b8">¡Gracias por preferir Distribuidora Central Aseo!</text></svg>`;

export const DEFAULT_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    year: CURRENT_SYSTEM_YEAR,
    descripcion: 'Artículos de aseo sala de clases (cloro, desinfectante, toallas)',
    categoriaId: 'cat-3',
    categoriaNombre: 'Limpieza y Aseo',
    monto: 14500,
    fecha: `${CURRENT_SYSTEM_YEAR}-03-12`,
    proveedor: 'Distribuidora Central Aseo',
    numeroBoleta: 'BOL-847291',
    observaciones: 'Compra para inicio de año escolar marzo. Boleta electrónica con detalle timbrada.',
    comprobanteUrl: SAMPLE_RECEIPT_IMAGE,
  },
  {
    id: 'exp-2',
    year: CURRENT_SYSTEM_YEAR,
    descripcion: 'Plumones para pizarra blanca y resmas de hojas tamaño carta',
    categoriaId: 'cat-4',
    categoriaNombre: 'Materiales y Fotocopias',
    monto: 18900,
    fecha: `${CURRENT_SYSTEM_YEAR}-04-03`,
    proveedor: 'Librería Nacional',
    numeroBoleta: 'FAC-30219',
    observaciones: 'Materiales solicitados por la profesora jefe',
  },
  {
    id: 'exp-3',
    year: CURRENT_SYSTEM_YEAR,
    descripcion: 'Tortas, jugos y vasos desechables para Convivencia Día del Alumno',
    categoriaId: 'cat-1',
    categoriaNombre: 'Actividades y Convivencias',
    monto: 32000,
    fecha: `${CURRENT_SYSTEM_YEAR}-05-10`,
    proveedor: 'Pastelería Dulce Rincón',
    numeroBoleta: 'BOL-91823',
    observaciones: 'Celebración día del alumno en el patio del colegio',
  },
];

export const DEFAULT_EXTRA_INCOMES: ExtraIncome[] = [
  {
    id: 'inc-1',
    year: 2026,
    concepto: 'Rifa Anual Pro-Fondos',
    descripcion: 'Venta de talonario de rifa ($5.000 por alumno)',
    monto: 15000,
    fecha: '2026-04-14',
    origenFondos: 'Venta de talonarios por alumnos y apoderados',
    observaciones: 'Control por alumno: 1 talonario de $5.000 por cada pupilo',
    tipoCobro: 'fijo_por_alumno',
    montoPorAlumno: 5000,
    alumnosPagados: ['stu-1', 'stu-2', 'stu-5'],
  },
  {
    id: 'inc-cuota-extra',
    year: 2026,
    concepto: 'Cuota Extraordinaria Materiales',
    descripcion: 'Aporte extraordinario para botiquín y pintura ($3.000 por alumno)',
    monto: 6000,
    fecha: '2026-03-20',
    origenFondos: 'Aporte directo de apoderados',
    observaciones: 'Aprobado en primera asamblea de apoderados',
    tipoCobro: 'fijo_por_alumno',
    montoPorAlumno: 3000,
    alumnosPagados: ['stu-2', 'stu-3'],
  },
  {
    id: 'inc-2',
    year: 2026,
    concepto: 'Bingo y Venta de Completos',
    descripcion: 'Evento bailable y bingo pro-fondos paseo de fin de año',
    monto: 110000,
    fecha: '2026-06-20',
    origenFondos: 'Entradas al bingo y consumo de alimentos',
    observaciones: 'Excelente asistencia de las familias del curso',
    tipoCobro: 'general',
  },
];

export function getStoredConfig(): CourseConfig {
  const currentSysYear = new Date().getFullYear();
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CONFIG);
    if (!raw) return { ...DEFAULT_CONFIG, currentYear: currentSysYear };
    const parsed = JSON.parse(raw);
    const availableYears: number[] = Array.isArray(parsed.availableYears)
      ? [...parsed.availableYears]
      : [...DEFAULT_CONFIG.availableYears];
    if (!availableYears.includes(currentSysYear)) {
      availableYears.push(currentSysYear);
      availableYears.sort((a, b) => a - b);
    }
    return {
      ...DEFAULT_CONFIG,
      ...parsed,
      currentYear: currentSysYear,
      availableYears,
    };
  } catch {
    return { ...DEFAULT_CONFIG, currentYear: currentSysYear };
  }
}

export function saveStoredConfig(config: CourseConfig) {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(config));
}

export function getStoredCategories(): ExpenseCategory[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (!raw) return DEFAULT_CATEGORIES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_CATEGORIES;
  }
}

export function saveStoredCategories(categories: ExpenseCategory[]) {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
}

export function getStoredStudents(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STUDENTS);
    const list: Student[] = raw ? JSON.parse(raw) : DEFAULT_STUDENTS;
    return list.map((s) => ({
      ...s,
      activo: s.activo !== undefined ? s.activo : true,
      fechaNacimiento: s.fechaNacimiento || '',
      fechaIngreso: s.fechaIngreso || '',
    }));
  } catch {
    return DEFAULT_STUDENTS;
  }
}

export function saveStoredStudents(students: Student[]) {
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(students));
}

export function getStoredPayments(): FeePayment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PAYMENTS);
    if (!raw) return DEFAULT_PAYMENTS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_PAYMENTS;
  }
}

export function saveStoredPayments(payments: FeePayment[]) {
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(payments));
}

export function getStoredExpenses(): Expense[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) return DEFAULT_EXPENSES;
    const parsed: Expense[] = JSON.parse(raw);
    return parsed.map((e) => {
      if (e.id === 'exp-1' && !e.comprobanteUrl) {
        return { ...e, comprobanteUrl: SAMPLE_RECEIPT_IMAGE };
      }
      return e;
    });
  } catch {
    return DEFAULT_EXPENSES;
  }
}

export function saveStoredExpenses(expenses: Expense[]) {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
}

export function getStoredExtraIncomes(): ExtraIncome[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXTRA_INCOMES);
    if (!raw) return DEFAULT_EXTRA_INCOMES;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_EXTRA_INCOMES;
  }
}

export function saveStoredExtraIncomes(incomes: ExtraIncome[]) {
  localStorage.setItem(STORAGE_KEYS.EXTRA_INCOMES, JSON.stringify(incomes));
}

// Format Chilean currency: $3.000, $21.000
export function formatCurrency(amount: number): string {
  const rounded = Math.round(amount || 0);
  return '$' + rounded.toLocaleString('es-CL');
}

// Check monthly fee status for a student
export function getMonthlyStatus(
  student: Student,
  monthIndex: MonthIndex,
  payments: FeePayment[],
  year: number,
  expectedFee: number
): {
  status: 'paid' | 'partial' | 'pending' | 'exempt' | 'not_applicable';
  paidAmount: number;
  expectedAmount: number;
  payment?: FeePayment;
} {
  // If student doesn't pay fee
  if (student.noPagaCuota) {
    return { status: 'exempt', paidAmount: 0, expectedAmount: 0 };
  }

  // If student entered mid-year and this month is before their entry month
  if (student.tipoIngreso === 'mid_year' && monthIndex < student.mesIngreso) {
    return { status: 'not_applicable', paidAmount: 0, expectedAmount: 0 };
  }

  const payment = payments.find(
    (p) => p.studentId === student.id && p.year === year && p.month === monthIndex
  );

  // Si el mes fue eximido de pago, queda 100% saldado sin deuda pendiente
  if (payment?.esExento) {
    return {
      status: 'paid',
      paidAmount: payment.monto || 0,
      expectedAmount: 0,
      payment,
    };
  }

  const expectedAmount = payment?.montoEsperado ?? expectedFee;
  const paidAmount = payment?.monto ?? 0;

  if (paidAmount >= expectedAmount && expectedAmount > 0) {
    return { status: 'paid', paidAmount, expectedAmount, payment };
  } else if (paidAmount > 0 && paidAmount < expectedAmount) {
    return { status: 'partial', paidAmount, expectedAmount, payment };
  } else {
    // Si el alumno está inactivo y no tiene pago registrado para este mes,
    // figura como 'not_applicable' para no generar deuda pendiente en los reportes,
    // manteniendo intactos en balances los meses que sí pagó
    if (student.activo === false) {
      return { status: 'not_applicable', paidAmount: 0, expectedAmount: 0, payment };
    }
    return { status: 'pending', paidAmount: 0, expectedAmount, payment };
  }
}

// Student annual summary calculation
export interface StudentAnnualSummary {
  student: Student;
  applicableMonthsCount: number;
  paidMonthsCount: number;
  pendingMonthsCount: number;
  totalExpected: number;
  totalPaid: number;
  totalDebt: number;
  isUpToDate: boolean; // Al día
}

export function getStudentAnnualSummary(
  student: Student,
  year: number,
  payments: FeePayment[],
  expectedFee: number
): StudentAnnualSummary {
  if (student.noPagaCuota) {
    return {
      student,
      applicableMonthsCount: 0,
      paidMonthsCount: 0,
      pendingMonthsCount: 0,
      totalExpected: 0,
      totalPaid: 0,
      totalDebt: 0,
      isUpToDate: true,
    };
  }

  // Si el alumno está inactivo: sus pagos históricos se preservan en los balances,
  // pero no acumula deuda activa ni meses pendientes para los reportes de cobranza
  if (student.activo === false) {
    const studentPayments = payments.filter((p) => p.studentId === student.id && p.year === year);
    const paidSum = studentPayments.reduce((acc, p) => acc + p.monto, 0);
    return {
      student,
      applicableMonthsCount: 0,
      paidMonthsCount: studentPayments.length,
      pendingMonthsCount: 0,
      totalExpected: paidSum,
      totalPaid: paidSum,
      totalDebt: 0,
      isUpToDate: true,
    };
  }

  let applicableMonthsCount = 0;
  let paidMonthsCount = 0;
  let pendingMonthsCount = 0;
  let totalExpected = 0;
  let totalPaid = 0;

  for (let m = 0; m < 12; m++) {
    const month = m as MonthIndex;
    const { status, paidAmount, expectedAmount } = getMonthlyStatus(
      student,
      month,
      payments,
      year,
      expectedFee
    );

    if (status !== 'not_applicable' && status !== 'exempt') {
      applicableMonthsCount++;
      totalExpected += expectedAmount;
      totalPaid += paidAmount;

      if (status === 'paid') {
        paidMonthsCount++;
      } else {
        pendingMonthsCount++;
      }
    }
  }

  const totalDebt = Math.max(0, totalExpected - totalPaid);
  const isUpToDate = totalDebt === 0;

  return {
    student,
    applicableMonthsCount,
    paidMonthsCount,
    pendingMonthsCount,
    totalExpected,
    totalPaid,
    totalDebt,
    isUpToDate,
  };
}

export function getStoredGestorUsers(): GestorUser[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.GESTOR_USERS);
    if (!raw) return DEFAULT_GESTOR_USERS;
    return JSON.parse(raw);
  } catch {
    return DEFAULT_GESTOR_USERS;
  }
}

export function saveStoredGestorUsers(users: GestorUser[]) {
  localStorage.setItem(STORAGE_KEYS.GESTOR_USERS, JSON.stringify(users));
}

export function getStoredAuthSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUTH_SESSION);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredAuthSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEYS.AUTH_SESSION, JSON.stringify(session));
}

export function clearStoredAuthSession() {
  localStorage.removeItem(STORAGE_KEYS.AUTH_SESSION);
}

export const DEFAULT_MOVEMENT_LOGS: MovementLog[] = [
  {
    id: 'log-seed-1',
    fechaHora: '2026-03-05T10:15:00.000Z',
    timestamp: new Date('2026-03-05T10:15:00.000Z').getTime(),
    modulo: 'cuotas',
    tipoAccion: 'pago_cuota_creado',
    titulo: 'Pago de Cuota Marzo Registrado',
    descripcion: 'Se registró pago de cuota Marzo ($3.000) para alumno Alexis Herrera mediante Transferencia Bancaria (TR-10293).',
    usuario: 'Administrador General',
    rol: 'admin',
    montoAfectado: 3000,
    referenciaId: 'stu-2',
    referenciaNombre: 'Alexis Herrera',
    detallesAdicionales: { mes: 'Marzo', comprobante: 'TR-10293', medio: 'transferencia' },
  },
  {
    id: 'log-seed-2',
    fechaHora: '2026-03-12T14:30:00.000Z',
    timestamp: new Date('2026-03-12T14:30:00.000Z').getTime(),
    modulo: 'gastos',
    tipoAccion: 'gasto_creado',
    titulo: 'Rendición de Gasto Ingresada',
    descripcion: 'Compra de artículos de aseo y desinfectantes para la sala de clases. Proveedor: Dimerc S.A., Boleta: B-49201.',
    usuario: 'Administrador General',
    rol: 'admin',
    montoAfectado: 24990,
    referenciaId: 'exp-seed-1',
    referenciaNombre: 'Dimerc S.A.',
    detallesAdicionales: { categoria: 'Limpieza y Aseo', boleta: 'B-49201' },
  },
  {
    id: 'log-seed-3',
    fechaHora: '2026-03-20T11:00:00.000Z',
    timestamp: new Date('2026-03-20T11:00:00.000Z').getTime(),
    modulo: 'ingresos_extra',
    tipoAccion: 'ingreso_extra_creado',
    titulo: 'Nueva Actividad Extraordinaria Creada',
    descripcion: 'Se habilitó cobro de "Rifa Pro-Paseo Fin de Año" con monto fijo de $5.000 por alumno.',
    usuario: 'Administrador General',
    rol: 'admin',
    montoAfectado: 5000,
    referenciaNombre: 'Rifa Pro-Paseo',
    detallesAdicionales: { tipoControl: 'fijo_por_alumno', montoPorAlumno: 5000 },
  },
  {
    id: 'log-seed-4',
    fechaHora: '2026-03-25T16:45:00.000Z',
    timestamp: new Date('2026-03-25T16:45:00.000Z').getTime(),
    modulo: 'cuotas',
    tipoAccion: 'pago_cuota_abono',
    titulo: 'Abono Parcial Registrado',
    descripcion: 'Se registró abono parcial de $1.500 para cuota de Abril del alumno Martín Herrera.',
    usuario: 'Administrador General',
    rol: 'admin',
    montoAfectado: 1500,
    referenciaId: 'stu-6',
    referenciaNombre: 'Martín Herrera',
    detallesAdicionales: { mes: 'Abril', saldoRestante: 1500 },
  },
];

export function getStoredMovementLogs(): MovementLog[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENT_LOGS);
    if (raw === null) {
      saveStoredMovementLogs(DEFAULT_MOVEMENT_LOGS);
      return DEFAULT_MOVEMENT_LOGS;
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    saveStoredMovementLogs(DEFAULT_MOVEMENT_LOGS);
    return DEFAULT_MOVEMENT_LOGS;
  } catch {
    return DEFAULT_MOVEMENT_LOGS;
  }
}

export function saveStoredMovementLogs(logs: MovementLog[]) {
  try {
    // Keep up to 1000 latest logs
    const trimmed = logs.slice(0, 1000);
    localStorage.setItem(STORAGE_KEYS.MOVEMENT_LOGS, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving movement logs', e);
  }
}

export function addMovementLog(
  entry: Omit<MovementLog, 'id' | 'fechaHora' | 'timestamp'>
): MovementLog {
  const now = new Date();
  const newLog: MovementLog = {
    id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    fechaHora: now.toISOString(),
    timestamp: now.getTime(),
    ...entry,
  };
  const existing = getStoredMovementLogs();
  const updated = [newLog, ...existing];
  saveStoredMovementLogs(updated);
  return newLog;
}

export function clearStoredMovementLogs() {
  localStorage.setItem(STORAGE_KEYS.MOVEMENT_LOGS, JSON.stringify([]));
}

export function resetAllDataToDefaults() {
  localStorage.setItem(STORAGE_KEYS.CONFIG, JSON.stringify(DEFAULT_CONFIG));
  localStorage.setItem(STORAGE_KEYS.STUDENTS, JSON.stringify(DEFAULT_STUDENTS));
  localStorage.setItem(STORAGE_KEYS.PAYMENTS, JSON.stringify(DEFAULT_PAYMENTS));
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(DEFAULT_EXPENSES));
  localStorage.setItem(STORAGE_KEYS.EXTRA_INCOMES, JSON.stringify(DEFAULT_EXTRA_INCOMES));
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
  localStorage.setItem(STORAGE_KEYS.GESTOR_USERS, JSON.stringify(DEFAULT_GESTOR_USERS));
  localStorage.setItem(STORAGE_KEYS.MOVEMENT_LOGS, JSON.stringify(DEFAULT_MOVEMENT_LOGS));
}

// Export all database as JSON
export function exportAllDataAsJson(): string {
  const data = {
    config: getStoredConfig(),
    students: getStoredStudents(),
    payments: getStoredPayments(),
    expenses: getStoredExpenses(),
    extraIncomes: getStoredExtraIncomes(),
    categories: getStoredCategories(),
    gestorUsers: getStoredGestorUsers(),
    movementLogs: getStoredMovementLogs(),
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

// Import all database from JSON
export function importAllDataFromJson(jsonStr: string): boolean {
  try {
    const data = JSON.parse(jsonStr);
    if (data.config) saveStoredConfig(data.config);
    if (data.students) saveStoredStudents(data.students);
    if (data.payments) saveStoredPayments(data.payments);
    if (data.expenses) saveStoredExpenses(data.expenses);
    if (data.extraIncomes) saveStoredExtraIncomes(data.extraIncomes);
    if (data.categories) saveStoredCategories(data.categories);
    if (data.gestorUsers) saveStoredGestorUsers(data.gestorUsers);
    if (data.movementLogs) saveStoredMovementLogs(data.movementLogs);
    return true;
  } catch (e) {
    console.error('Failed to import JSON data', e);
    return false;
  }
}
