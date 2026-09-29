import * as XLSX from 'xlsx';
import { Student, FeePayment, Expense, ExtraIncome, CourseConfig, MONTH_NAMES, MonthIndex } from '../types';
import { getMonthlyStatus, getStudentAnnualSummary, formatCurrency } from './storage';

export function exportCourseFinancialReportToExcel(
  year: number,
  config: CourseConfig,
  students: Student[],
  payments: FeePayment[],
  expenses: Expense[],
  extraIncomes: ExtraIncome[]
) {
  const wb = XLSX.utils.book_new();

  // 1. Resumen y Balance
  const yearPayments = payments.filter((p) => p.year === year);
  const totalCuotas = yearPayments.reduce((acc, p) => acc + p.monto, 0);

  const yearExtraIncomes = extraIncomes.filter((i) => i.year === year);
  const totalExtra = yearExtraIncomes.reduce((acc, i) => acc + i.monto, 0);

  const totalIngresos = totalCuotas + totalExtra;

  const yearExpenses = expenses.filter((e) => e.year === year);
  const totalGastos = yearExpenses.reduce((acc, e) => acc + e.monto, 0);

  const saldoFinal = totalIngresos - totalGastos;

  const balanceData = [
    ['INFORME CONTABLE ANUAL'],
    ['Curso / Agrupación:', `${config.nombreCurso} - ${config.institucion}`],
    ['Período Contable:', year],
    ['Fecha de Generación:', new Date().toLocaleDateString('es-CL')],
    [],
    ['RESUMEN FINANCIERO GENERAL', 'VALOR ($ CLP)'],
    ['Total Ingresos por Cuotas Mensuales', totalCuotas],
    ['Total Ingresos Extraordinarios (Rifas, Bingos, etc.)', totalExtra],
    ['TOTAL INGRESOS', totalIngresos],
    ['Total Egresos / Gastos Operativos', totalGastos],
    ['SALDO DISPONIBLE EN CAJA', saldoFinal],
    [],
    ['ESTADÍSTICAS DE ALUMNOS', 'CANTIDAD'],
    ['Total de Alumnos Registrados', students.length],
    ['Alumnos al Día con Cuotas', students.filter((s) => getStudentAnnualSummary(s, year, payments, config.cuotaMensualPorDefecto).isUpToDate).length],
    ['Alumnos con Cuotas Pendientes', students.filter((s) => !getStudentAnnualSummary(s, year, payments, config.cuotaMensualPorDefecto).isUpToDate).length],
    ['Alumnos Exentos de Cuota', students.filter((s) => s.noPagaCuota).length],
  ];

  const wsBalance = XLSX.utils.aoa_to_sheet(balanceData);
  XLSX.utils.book_append_sheet(wb, wsBalance, 'Balance General');

  // 2. Detalle de Gastos (Egresos)
  const gastosHeaders = [
    'ID',
    'Fecha',
    'Descripción',
    'Categoría',
    'Proveedor',
    'N° Boleta / Factura',
    'Monto ($)',
    'Observaciones',
  ];

  const gastosRows = yearExpenses.map((exp) => [
    exp.id,
    exp.fecha,
    exp.descripcion,
    exp.categoriaNombre,
    exp.proveedor || '-',
    exp.numeroBoleta || '-',
    exp.monto,
    exp.observaciones || '',
  ]);

  const wsGastos = XLSX.utils.aoa_to_sheet([gastosHeaders, ...gastosRows]);
  XLSX.utils.book_append_sheet(wb, wsGastos, 'Gastos y Egresos');

  // 3. Ingresos Extraordinarios
  const extraHeaders = [
    'ID',
    'Fecha',
    'Concepto',
    'Descripción',
    'Origen de Fondos',
    'Monto ($)',
    'Observaciones',
  ];

  const extraRows = yearExtraIncomes.map((inc) => [
    inc.id,
    inc.fecha,
    inc.concepto,
    inc.descripcion,
    inc.origenFondos,
    inc.monto,
    inc.observaciones || '',
  ]);

  const wsExtra = XLSX.utils.aoa_to_sheet([extraHeaders, ...extraRows]);
  XLSX.utils.book_append_sheet(wb, wsExtra, 'Ingresos Extra');

  // 4. Matriz de Cuotas por Alumno
  const cuotasHeaders = [
    'RUT',
    'Alumno',
    'Apoderado',
    'Teléfono',
    'Tipo Ingreso',
    'Exento',
    ...MONTH_NAMES.map((m) => `Cuota ${m}`),
    'Total Pagado ($)',
    'Total Deuda ($)',
    'Estado',
  ];

  const cuotasRows = students.map((s) => {
    const summary = getStudentAnnualSummary(s, year, payments, config.cuotaMensualPorDefecto);
    const monthsStatus = MONTH_NAMES.map((_, mIdx) => {
      const month = mIdx as MonthIndex;
      const { status, paidAmount } = getMonthlyStatus(
        s,
        month,
        payments,
        year,
        config.cuotaMensualPorDefecto
      );
      if (status === 'not_applicable') return 'No aplica';
      if (status === 'exempt') return 'Exento';
      if (status === 'paid') return `Pagado ($${paidAmount.toLocaleString('es-CL')})`;
      if (status === 'partial') return `Abono ($${paidAmount.toLocaleString('es-CL')})`;
      return 'Pendiente';
    });

    return [
      s.rut,
      `${s.nombres} ${s.apellidos}`,
      s.nombreApoderado,
      s.telefonoApoderado,
      s.tipoIngreso === 'full_year' ? 'Año Completo' : `Mediado Año (${MONTH_NAMES[s.mesIngreso]})`,
      s.noPagaCuota ? 'Sí' : 'No',
      ...monthsStatus,
      summary.totalPaid,
      summary.totalDebt,
      summary.isUpToDate ? 'Al Día' : 'Con Deuda',
    ];
  });

  const wsCuotas = XLSX.utils.aoa_to_sheet([cuotasHeaders, ...cuotasRows]);
  XLSX.utils.book_append_sheet(wb, wsCuotas, 'Matriz de Cuotas');

  // 5. Control de Rifas y Cobros Fijos por Alumno
  const fixedActivities = yearExtraIncomes.filter(
    (i) =>
      i.tipoCobro === 'fijo_por_alumno' ||
      i.concepto.toLowerCase().includes('rifa') ||
      i.concepto.toLowerCase().includes('cuota extraordinaria')
  );

  if (fixedActivities.length > 0) {
    const rifasHeaders = [
      'RUT',
      'Alumno',
      'Apoderado',
      'Teléfono',
      ...fixedActivities.map(
        (a) => `${a.concepto} (${formatCurrency(a.montoPorAlumno || 0)})`
      ),
      'Total Pagado Rifas ($)',
      'Total Pendiente Rifas ($)',
    ];

    const rifasRows = students.map((s) => {
      let totalPagadoStudent = 0;
      let totalPendienteStudent = 0;

      const actStatuses = fixedActivities.map((a) => {
        const isPaid = a.alumnosPagados?.includes(s.id);
        const monto = a.montoPorAlumno || 0;
        if (isPaid) {
          totalPagadoStudent += monto;
          return 'PAGADO';
        } else {
          totalPendienteStudent += monto;
          return `DEBE ($${monto.toLocaleString('es-CL')})`;
        }
      });

      return [
        s.rut,
        `${s.nombres} ${s.apellidos}`,
        s.nombreApoderado,
        s.telefonoApoderado,
        ...actStatuses,
        totalPagadoStudent,
        totalPendienteStudent,
      ];
    });

    const wsRifas = XLSX.utils.aoa_to_sheet([rifasHeaders, ...rifasRows]);
    XLSX.utils.book_append_sheet(wb, wsRifas, 'Rifas y Cobros Fijos');
  }

  // Generate and download
  const fileName = `Balance_Tesoreria_${config.nombreCurso.replace(/\s+/g, '_')}_${year}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
