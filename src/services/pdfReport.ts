import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Student,
  FeePayment,
  Expense,
  ExtraIncome,
  CourseConfig,
  MONTH_NAMES,
  MonthIndex,
} from '../types';
import {
  getStudentAnnualSummary,
  getMonthlyStatus,
  formatCurrency,
} from './storage';
import { getEffectiveLogo } from '../assets/logo';

export interface GeneratePdfReportOptions {
  year: number;
  config: CourseConfig;
  students: Student[];
  payments: FeePayment[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
}

export async function generateCourseFinancialPdfReport({
  year,
  config,
  students,
  payments,
  expenses,
  extraIncomes,
}: GeneratePdfReportOptions): Promise<void> {
  // Initialize jsPDF document (Portrait, millimeters, A4)
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Colors
  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const emeraldColor: [number, number, number] = [5, 150, 105]; // Emerald 600
  const redColor: [number, number, number] = [220, 38, 38]; // Red 600
  const slateLight: [number, number, number] = [241, 245, 249]; // Slate 100

  // Filter year data
  const yearPayments = payments.filter((p) => p.year === year);
  const yearExpenses = expenses.filter((e) => e.year === year);
  const yearExtraIncomes = extraIncomes.filter((i) => i.year === year);

  // Financial totals
  const totalCuotas = yearPayments.reduce((acc, p) => acc + p.monto, 0);
  const totalExtra = yearExtraIncomes.reduce((acc, i) => acc + i.monto, 0);
  const totalIngresos = totalCuotas + totalExtra;
  const totalGastos = yearExpenses.reduce((acc, e) => acc + e.monto, 0);
  const saldoEnCaja = totalIngresos - totalGastos;

  // Student fee statistics
  let alDiaCount = 0;
  let conDeudaCount = 0;
  let exentosCount = 0;
  let inactivosCount = 0;
  let totalEsperadoCuotas = 0;
  let deudaTotal = 0;

  students.forEach((s) => {
    if (s.activo === false) {
      inactivosCount++;
      return;
    }

    const summary = getStudentAnnualSummary(
      s,
      year,
      payments,
      config.cuotaMensualPorDefecto
    );
    if (s.noPagaCuota) {
      exentosCount++;
    } else {
      totalEsperadoCuotas += summary.totalExpected;
      deudaTotal += summary.totalDebt;
      if (summary.isUpToDate && summary.applicableMonthsCount > 0) {
        alDiaCount++;
      } else {
        conDeudaCount++;
      }
    }
  });

  const porcentajeCumplimiento =
    totalEsperadoCuotas > 0
      ? Math.round((totalCuotas / totalEsperadoCuotas) * 100)
      : 100;

  // Monthly breakdown
  let runningBalance = 0;
  const monthlyRows = MONTH_NAMES.map((name, idx) => {
    const monthIdx = idx as MonthIndex;
    const cuotasDelMes = yearPayments
      .filter((p) => p.month === monthIdx)
      .reduce((sum, p) => sum + p.monto, 0);

    const extrasDelMes = yearExtraIncomes
      .filter((inc) => {
        if (!inc.fecha) return false;
        const monthOfDate = new Date(inc.fecha).getMonth();
        return monthOfDate === monthIdx;
      })
      .reduce((sum, inc) => sum + inc.monto, 0);

    const totalIngresosMes = cuotasDelMes + extrasDelMes;

    const gastosDelMes = yearExpenses
      .filter((exp) => {
        if (!exp.fecha) return false;
        const monthOfDate = new Date(exp.fecha).getMonth();
        return monthOfDate === monthIdx;
      })
      .reduce((sum, exp) => sum + exp.monto, 0);

    const resultadoNetoMes = totalIngresosMes - gastosDelMes;
    runningBalance += resultadoNetoMes;

    return [
      name,
      formatCurrency(cuotasDelMes),
      formatCurrency(extrasDelMes),
      formatCurrency(totalIngresosMes),
      formatCurrency(gastosDelMes),
      `${resultadoNetoMes >= 0 ? '+' : ''}${formatCurrency(resultadoNetoMes)}`,
      formatCurrency(runningBalance),
    ];
  });

  // Fixed Activities (Rifas / Cobros Fijos por Alumno)
  const fixedActivities = yearExtraIncomes.filter(
    (inc) =>
      inc.tipoCobro === 'fijo_por_alumno' ||
      inc.concepto.toLowerCase().includes('rifa') ||
      inc.concepto.toLowerCase().includes('cuota extraordinaria')
  );

  // --- HEADER SECTION ---
  // Try adding logo if available
  const logoData = getEffectiveLogo(config.logoUrl);
  let logoLoaded = false;
  if (logoData) {
    try {
      // If SVG or data URI, jsPDF can load PNG/JPEG. If it's a data URL:
      doc.addImage(logoData, 'JPEG', 14, 12, 22, 22);
      logoLoaded = true;
    } catch {
      try {
        doc.addImage(logoData, 'PNG', 14, 12, 22, 22);
        logoLoaded = true;
      } catch {
        // Fallback gracefully without logo image if format not accepted directly by jsPDF
      }
    }
  }

  const headerLeftX = logoLoaded ? 40 : 14;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('INFORME FINANCIERO Y BALANCE ANUAL', headerLeftX, 18);

  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(
    `${config.nombreCurso.toUpperCase()} · ${config.institucion}`,
    headerLeftX,
    24
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  const now = new Date();
  const fechaEmision = `${now.toLocaleDateString('es-CL')} a las ${now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })} hrs`;
  doc.text(`Período Contable: Año ${year}  |  Fecha de Emisión: ${fechaEmision}`, headerLeftX, 29);

  // Top divider line
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 37, pageWidth - 14, 37);

  let currentY = 43;

  // --- 1. RESUMEN EJECUTIVO Y ESTADO DE CAJA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('1. RESUMEN EJECUTIVO Y ESTADO DE CAJA', 14, currentY);

  currentY += 4;

  const cardWidth = (pageWidth - 28 - 9) / 4; // 4 cards with 3mm gap
  const cardHeight = 22;

  // Card 1: Total Ingresos
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL INGRESOS', 17, currentY + 5);
  doc.setFontSize(11);
  doc.setTextColor(5, 150, 105);
  doc.text(formatCurrency(totalIngresos), 17, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Cuotas: ${formatCurrency(totalCuotas)}`, 17, currentY + 17);
  doc.text(`Extras: ${formatCurrency(totalExtra)}`, 17, currentY + 20);

  // Card 2: Total Gastos
  const c2X = 14 + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(c2X, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('TOTAL EGRESOS (GASTOS)', c2X + 3, currentY + 5);
  doc.setFontSize(11);
  doc.setTextColor(220, 38, 38);
  doc.text(formatCurrency(totalGastos), c2X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`${yearExpenses.length} comprobantes rendidos`, c2X + 3, currentY + 17);

  // Card 3: Saldo en Caja
  const c3X = c2X + cardWidth + 3;
  const isSuperavit = saldoEnCaja >= 0;
  doc.setFillColor(isSuperavit ? 236 : 254, isSuperavit ? 253 : 242, isSuperavit ? 245 : 242);
  doc.setDrawColor(isSuperavit ? 167 : 252, isSuperavit ? 243 : 165, isSuperavit ? 208 : 165);
  doc.roundedRect(c3X, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(isSuperavit ? 6 : 153, isSuperavit ? 95 : 27, isSuperavit ? 70 : 27);
  doc.text('SALDO DISPONIBLE CAJA', c3X + 3, currentY + 5);
  doc.setFontSize(11);
  doc.setTextColor(isSuperavit ? 4 : 220, isSuperavit ? 120 : 38, isSuperavit ? 87 : 38);
  doc.text(formatCurrency(saldoEnCaja), c3X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.text(isSuperavit ? 'Superávit Acumulado' : 'Déficit Presupuestario', c3X + 3, currentY + 17);

  // Card 4: Cumplimiento Cuotas
  const c4X = c3X + cardWidth + 3;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(c4X, currentY, cardWidth, cardHeight, 2, 2, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('CUMPLIMIENTO CUOTAS', c4X + 3, currentY + 5);
  doc.setFontSize(11);
  doc.setTextColor(79, 70, 229);
  doc.text(`${porcentajeCumplimiento}%`, c4X + 3, currentY + 12);
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text(`Al día: ${alDiaCount} | Deuda: ${conDeudaCount}`, c4X + 3, currentY + 17);
  doc.text(`Por cobrar: ${formatCurrency(deudaTotal)}`, c4X + 3, currentY + 20);

  currentY += cardHeight + 8;

  // --- 2. RESULTADO MENSUAL Y FLUJO DE CAJA ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text(`2. FLUJO DE CAJA MENSUAL (${year})`, 14, currentY);

  currentY += 2;

  autoTable(doc, {
    startY: currentY,
    head: [
      [
        'Mes Contable',
        'Ingresos Cuotas',
        'Ingresos Extra',
        'Total Ingresos',
        'Gastos del Mes',
        'Resultado Neto',
        'Saldo Acumulado',
      ],
    ],
    body: monthlyRows,
    foot: [
      [
        'TOTALES ANUALES',
        formatCurrency(totalCuotas),
        formatCurrency(totalExtra),
        formatCurrency(totalIngresos),
        formatCurrency(totalGastos),
        `${totalIngresos - totalGastos >= 0 ? '+' : ''}${formatCurrency(totalIngresos - totalGastos)}`,
        formatCurrency(saldoEnCaja),
      ],
    ],
    theme: 'striped',
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'right',
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 32 },
      1: { halign: 'right', cellWidth: 25 },
      2: { halign: 'right', cellWidth: 25 },
      3: { halign: 'right', fontStyle: 'bold', cellWidth: 26 },
      4: { halign: 'right', cellWidth: 25 },
      5: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
      6: { halign: 'right', fontStyle: 'bold', cellWidth: 28 },
    },
    footStyles: {
      fillColor: [241, 245, 249],
      textColor: [15, 23, 42],
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'right',
    },
    styles: {
      fontSize: 7,
      cellPadding: 1.8,
    },
    margin: { left: 14, right: 14 },
  });

  // Get position after table
  currentY = (doc as any).lastAutoTable.finalY + 8;

  // Check page break for section 3
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  // --- 3. REPORTE DE MOROSIDAD Y CUOTAS ORDINARIAS ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('3. ESTADO DE COBRANZA Y CUMPLIMIENTO DE CUOTAS ORDINARIAS', 14, currentY);

  currentY += 2;

  const cuotasDataRows = [
    ['Cuota Mensual Estándar Fija', formatCurrency(config.cuotaMensualPorDefecto), 'Monto establecido por apoderado'],
    ['Total Cuotas Proyectadas (Año)', formatCurrency(totalEsperadoCuotas), 'Monto presupuestado para los 12 meses activos'],
    ['Total Cuotas Efectivamente Recaudadas', formatCurrency(totalCuotas), `${porcentajeCumplimiento}% de cumplimiento anual`],
    ['Total Deuda Morosa Pendiente', formatCurrency(deudaTotal), 'Monto total adeudado por apoderados activos'],
    ['Nómina Alumnos Activos al Día', `${alDiaCount} alumnos`, 'Alumnos con 100% de sus cuotas canceladas'],
    ['Nómina Alumnos Activos con Deuda', `${conDeudaCount} alumnos`, 'Apoderados con saldo pendiente de pago'],
    ['Nómina Alumnos Exentos por Beca', `${exentosCount} alumnos`, 'Alumnos exonerados de cuota ordinaria'],
    ['Alumnos Inactivos / Retirados', `${inactivosCount} alumnos`, 'Pagos históricos resguardados en balances sin deuda activa'],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Concepto / Indicador', 'Valor Registrado', 'Observaciones Contables']],
    body: cuotasDataRows,
    theme: 'grid',
    headStyles: {
      fillColor: [55, 65, 81],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 70 },
      1: { halign: 'right', fontStyle: 'bold', cellWidth: 45 },
      2: { cellWidth: 71 },
    },
    styles: {
      fontSize: 7.5,
      cellPadding: 2,
    },
    margin: { left: 14, right: 14 },
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // --- 4. REPORTE DE RIFAS Y ACTIVIDADES CON MONTO FIJO POR ALUMNO ---
  if (currentY > pageHeight - 75) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(primaryColor[0], primaryColor[1], primaryColor[2]);
  doc.text('4. CONTROL DE RIFAS Y COBROS FIJOS POR ALUMNO', 14, currentY);

  currentY += 2;

  if (fixedActivities.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('No se registran actividades con cobro fijo o rifas para este período.', 14, currentY + 5);
    currentY += 12;
  } else {
    const fixedRows = fixedActivities.map((act) => {
      const fixedAmount = act.montoPorAlumno || 5000;
      const paidStudentIds = act.alumnosPagados || [];
      const relevantStudents = students.filter(
        (s) => s.activo !== false || paidStudentIds.includes(s.id)
      );
      const totalStudents = relevantStudents.length;
      const paidCount = paidStudentIds.length;
      const pendingCount = Math.max(0, totalStudents - paidCount);
      const totalEsperado = totalStudents * fixedAmount;
      const totalRecaudado = paidCount * fixedAmount;
      const totalPendiente = pendingCount * fixedAmount;
      const pct = totalEsperado > 0 ? Math.round((totalRecaudado / totalEsperado) * 100) : 0;

      return [
        act.concepto,
        act.fecha || '-',
        formatCurrency(fixedAmount),
        `${paidCount} de ${totalStudents}`,
        formatCurrency(totalRecaudado),
        `${pendingCount} alumnos`,
        formatCurrency(totalPendiente),
        `${pct}%`,
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [
        [
          'Actividad / Rifa',
          'Fecha',
          'Valor x Alumno',
          'Pagados',
          'Total Recaudado',
          'Pendientes',
          'Total Adeudado',
          'Cumplimiento',
        ],
      ],
      body: fixedRows,
      theme: 'striped',
      headStyles: {
        fillColor: [126, 34, 206], // Purple 700
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold',
        halign: 'center',
      },
      columnStyles: {
        0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
        1: { halign: 'center', cellWidth: 20 },
        2: { halign: 'right', cellWidth: 22 },
        3: { halign: 'center', cellWidth: 20 },
        4: { halign: 'right', fontStyle: 'bold', cellWidth: 25 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
        7: { halign: 'center', fontStyle: 'bold', cellWidth: 19 },
      },
      styles: {
        fontSize: 7,
        cellPadding: 2,
      },
      margin: { left: 14, right: 14 },
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Check page break for footer / signatures
  if (currentY > pageHeight - 55) {
    doc.addPage();
    currentY = 25;
  }

  // --- DATOS BANCARIOS REGISTRADOS ---
  if (config.datosBancarios?.numeroCuenta) {
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, currentY, pageWidth - 28, 16, 2, 2, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('DATOS BANCARIOS OFICIALES PARA TRANSFERENCIA:', 18, currentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(
      `Banco: ${config.datosBancarios.banco}  |  Tipo: ${config.datosBancarios.tipoCuenta}  |  N° Cuenta: ${config.datosBancarios.numeroCuenta}  |  Titular: ${config.datosBancarios.titularNombre}  |  RUT: ${config.datosBancarios.titularRut}  |  Email: ${config.datosBancarios.emailConfirmacion}`,
      18,
      currentY + 11
    );

    currentY += 24;
  } else {
    currentY += 6;
  }

  // --- FIRMAS DE CONFORMIDAD ---
  if (currentY > pageHeight - 35) {
    doc.addPage();
    currentY = 30;
  }

  const signWidth = 60;
  const s1X = 25;
  const s2X = pageWidth - 25 - signWidth;

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.4);
  doc.line(s1X, currentY + 12, s1X + signWidth, currentY + 12);
  doc.line(s2X, currentY + 12, s2X + signWidth, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text('TESORERO', s1X + signWidth / 2, currentY + 16, { align: 'center' });
  doc.text('COMISIÓN REVISORA DE CUENTAS', s2X + signWidth / 2, currentY + 16, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Firma y rut Responsable', s1X + signWidth / 2, currentY + 20, { align: 'center' });
  doc.text('Firma y rut Auditoría', s2X + signWidth / 2, currentY + 20, { align: 'center' });

  // Add Page Numbers on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Página ${i} de ${totalPages} · ${config.nombreCurso} (${config.institucion}) · Período ${year}`,
      pageWidth / 2,
      pageHeight - 8,
      { align: 'center' }
    );
  }

  // Trigger download
  const cleanName = config.nombreCurso.replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`Balance_Financiero_${cleanName}_${year}.pdf`);
}
