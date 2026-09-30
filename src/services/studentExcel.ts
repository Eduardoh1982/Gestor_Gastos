import * as XLSX from 'xlsx';
import { Student, CourseConfig, MONTH_NAMES, FeePayment } from '../types';
import { getStudentAnnualSummary, formatCurrency } from './storage';

export function calculateAge(birthDateStr?: string): number | null {
  if (!birthDateStr) return null;
  const birth = new Date(birthDateStr);
  if (isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : null;
}

export function formatDateCL(dateStr?: string): string {
  if (!dateStr) return '-';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
  try {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-CL');
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function exportStudentsListToExcel(
  students: Student[],
  config: CourseConfig,
  payments?: FeePayment[],
  year?: number
) {
  const wb = XLSX.utils.book_new();

  const totalActivos = students.filter((s) => s.activo !== false).length;
  const totalInactivos = students.filter((s) => s.activo === false).length;
  const totalExentos = students.filter((s) => s.noPagaCuota).length;

  const currentYear = year || config.currentYear || new Date().getFullYear();
  const yearPayments = payments ? payments.filter((p) => p.year === currentYear) : [];
  const totalRecaudado = yearPayments.reduce((sum, p) => sum + p.monto, 0);

  const headerRows = [
    ['NÓMINA GENERAL DE ALUMNOS Y APODERADOS'],
    ['Curso / Agrupación:', `${config.nombreCurso} - ${config.institucion}`],
    ['Período Contable:', currentYear],
    ['Fecha de Exportación:', new Date().toLocaleDateString('es-CL')],
    ['Total Alumnos Registrados:', students.length],
    ['Alumnos Activos:', totalActivos],
    ['Alumnos Inactivos / Retirados:', totalInactivos],
    ['Alumnos Exentos de Cuota (Becas):', totalExentos],
    ...(payments ? [['Total Recaudado en Cuotas:', formatCurrency(totalRecaudado)]] : []),
    [],
  ];

  const tableHeaders = [
    'N°',
    'RUT Alumno',
    'Nombres',
    'Apellidos',
    'Nombre Completo',
    'Estado Matrícula',
    'Fecha de Nacimiento',
    'Edad (Años)',
    'Fecha de Ingreso Oficial',
    'Tipo de Ingreso',
    'Mes de Ingreso',
    'Condición de Cuota',
    'Nombre Apoderado',
    'Teléfono Apoderado',
    'Email Apoderado',
    ...(payments
      ? [
          `Cuotas Pagadas ${currentYear}`,
          `Total Pagado Cuotas ${currentYear} ($)`,
          `Deuda Pendiente ${currentYear} ($)`,
          `Estado de Cobranza ${currentYear}`,
        ]
      : []),
    'Observaciones / Notas',
    'Fecha Registro en Sistema',
  ];

  const dataRows = students.map((s, idx) => {
    const age = calculateAge(s.fechaNacimiento);
    const estado = s.activo !== false ? 'Activo' : 'Inactivo (Retirado)';
    const tipoIngresoStr = s.tipoIngreso === 'full_year' ? 'Año Completo' : 'A Mitad de Año';
    const mesIngresoStr = s.tipoIngreso === 'mid_year' ? MONTH_NAMES[s.mesIngreso] : 'Enero';
    const condicionCuota = s.noPagaCuota ? 'Exento (No paga cuota)' : 'Paga Cuota Regular';

    let financialItems: (string | number)[] = [];
    if (payments) {
      const summary = getStudentAnnualSummary(
        s,
        currentYear,
        payments,
        config.cuotaMensualPorDefecto
      );
      const cuotasPagadasStr = s.noPagaCuota
        ? 'Exento'
        : s.activo === false
        ? `${summary.paidMonthsCount} pagos (Inactivo)`
        : `${summary.paidMonthsCount} de ${summary.applicableMonthsCount} meses`;

      const estadoCobranza = s.activo === false
        ? 'Inactivo (Sin deuda activa)'
        : s.noPagaCuota
        ? 'Exento'
        : summary.isUpToDate
        ? 'Al Día'
        : 'Con Deuda';

      financialItems = [
        cuotasPagadasStr,
        summary.totalPaid,
        summary.totalDebt,
        estadoCobranza,
      ];
    }

    return [
      idx + 1,
      s.rut || '-',
      s.nombres || '-',
      s.apellidos || '-',
      `${s.nombres} ${s.apellidos}`.trim(),
      estado,
      s.fechaNacimiento ? formatDateCL(s.fechaNacimiento) : 'No informada',
      age !== null ? `${age} años` : '-',
      s.fechaIngreso ? formatDateCL(s.fechaIngreso) : 'No informada',
      tipoIngresoStr,
      mesIngresoStr,
      condicionCuota,
      s.nombreApoderado || '-',
      s.telefonoApoderado || '-',
      s.emailApoderado || '-',
      ...financialItems,
      s.observaciones || '-',
      s.creadoEn ? formatDateCL(s.creadoEn.split('T')[0]) : '-',
    ];
  });

  const fullSheetData = [...headerRows, tableHeaders, ...dataRows];
  const ws = XLSX.utils.aoa_to_sheet(fullSheetData);

  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // N°
    { wch: 14 }, // RUT
    { wch: 18 }, // Nombres
    { wch: 22 }, // Apellidos
    { wch: 28 }, // Nombre Completo
    { wch: 18 }, // Estado Matrícula
    { wch: 18 }, // Fecha Nacimiento
    { wch: 12 }, // Edad
    { wch: 20 }, // Fecha Ingreso
    { wch: 16 }, // Tipo Ingreso
    { wch: 15 }, // Mes Ingreso
    { wch: 22 }, // Condición Cuota
    { wch: 26 }, // Apoderado
    { wch: 18 }, // Teléfono
    { wch: 28 }, // Email
    ...(payments
      ? [
          { wch: 22 }, // Cuotas Pagadas
          { wch: 22 }, // Total Pagado ($)
          { wch: 20 }, // Deuda Pendiente ($)
          { wch: 20 }, // Estado Cobranza
        ]
      : []),
    { wch: 35 }, // Observaciones
    { wch: 22 }, // Fecha Registro
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Nómina de Alumnos');

  const cleanName = config.nombreCurso.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Nomina_Alumnos_${cleanName}_${currentYear}_${dateStr}.xlsx`);
}
