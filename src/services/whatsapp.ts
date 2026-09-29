import { Student, CourseConfig, FeePayment, MonthIndex, MONTH_NAMES } from '../types';
import { getMonthlyStatus, formatCurrency } from './storage';

export function cleanPhoneNumber(rawPhone: string): string {
  let cleaned = rawPhone.replace(/\D/g, '');
  // If it's Chilean 9 digits starting with 9, prepend 56
  if (cleaned.length === 9 && cleaned.startsWith('9')) {
    cleaned = '56' + cleaned;
  }
  return cleaned;
}

export function buildWhatsAppMessage(
  student: Student,
  year: number,
  payments: FeePayment[],
  config: CourseConfig
): string {
  const paidMonths: string[] = [];
  const pendingMonths: string[] = [];
  let totalPaid = 0;
  let totalPending = 0;

  for (let m = 0; m < 12; m++) {
    const month = m as MonthIndex;
    const { status, paidAmount, expectedAmount } = getMonthlyStatus(
      student,
      month,
      payments,
      year,
      config.cuotaMensualPorDefecto
    );

    if (status === 'paid') {
      paidMonths.push(`${MONTH_NAMES[month]} (${formatCurrency(paidAmount)})`);
      totalPaid += paidAmount;
    } else if (status === 'pending' || status === 'partial') {
      const remaining = expectedAmount - paidAmount;
      pendingMonths.push(`${MONTH_NAMES[month]} (${formatCurrency(remaining)})`);
      totalPending += remaining;
    }
  }

  const lines: string[] = [];

  lines.push(`👋 *Estimado/a ${student.nombreApoderado || 'Apoderado/a'}:*`);
  lines.push(
    `Le saludamos desde la Tesorería de *${config.nombreCurso}* (${config.institucion}).`
  );
  lines.push(`A continuación, le compartimos el estado de cuotas de *${student.nombres} ${student.apellidos}* para el período contable *${year}*:\n`);

  if (student.noPagaCuota) {
    lines.push(`ℹ️ *Estado:* El alumno cuenta con beneficio de cuota exenta.`);
    return lines.join('\n');
  }

  if (paidMonths.length > 0) {
    lines.push(`✅ *Cuotas Pagadas (${paidMonths.length}):*`);
    paidMonths.forEach((m) => lines.push(`  • ${m}`));
    lines.push(`_Total abonado/pagado: ${formatCurrency(totalPaid)}_\n`);
  } else {
    lines.push(`ℹ️ _A la fecha no se registran cuotas pagadas en el año ${year}._\n`);
  }

  if (pendingMonths.length > 0) {
    lines.push(`⚠️ *Cuotas Pendientes (${pendingMonths.length}):*`);
    pendingMonths.forEach((m) => lines.push(`  • ${m}`));
    lines.push(`\n💰 *Total Pendiente a Pagar: ${formatCurrency(totalPending)}*`);
  } else {
    lines.push(`🎉 *¡Felicitaciones! Se encuentra completamente al día con las cuotas del año ${year}.* Muchas gracias por su puntualidad.`);
  }

  if (pendingMonths.length > 0 && config.datosBancarios?.numeroCuenta) {
    lines.push('\n🏦 *Datos para Transferencia Bancaria:*');
    lines.push(`• *Banco:* ${config.datosBancarios.banco}`);
    lines.push(`• *Tipo de Cuenta:* ${config.datosBancarios.tipoCuenta}`);
    lines.push(`• *N° Cuenta:* ${config.datosBancarios.numeroCuenta}`);
    lines.push(`• *Titular:* ${config.datosBancarios.titularNombre}`);
    lines.push(`• *RUT:* ${config.datosBancarios.titularRut}`);
    lines.push(`• *Email Comprobante:* ${config.datosBancarios.emailConfirmacion}`);
    lines.push(`\n📌 _Por favor, al transferir indique en el asunto o comentario el nombre del alumno/a._`);
  }

  lines.push('\nAgradecemos su valioso apoyo y compromiso con el curso.');

  return lines.join('\n');
}

export function openWhatsAppChat(
  student: Student,
  year: number,
  payments: FeePayment[],
  config: CourseConfig
) {
  const phone = cleanPhoneNumber(student.telefonoApoderado);
  const text = buildWhatsAppMessage(student, year, payments, config);
  const encoded = encodeURIComponent(text);

  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function openExtraIncomeWhatsAppChat(
  student: Student,
  concepto: string,
  monto: number,
  descripcion: string,
  config: CourseConfig
) {
  const phone = cleanPhoneNumber(student.telefonoApoderado);
  const lines: string[] = [
    `👋 *Estimado/a ${student.nombreApoderado || 'Apoderado/a'}:*`,
    `Le saludamos desde la Tesorería de *${config.nombreCurso}* (${config.institucion}).`,
    `Le recordamos sobre el cobro de *${concepto}* (${descripcion}) para el alumno/a *${student.nombres} ${student.apellidos}*.`,
    `💰 *Monto a cancelar:* ${formatCurrency(monto)}`,
    `📌 *Estado:* ⚠️ Pendiente de pago`,
  ];

  if (config.datosBancarios?.numeroCuenta) {
    lines.push('\n🏦 *Datos para Transferencia:*');
    lines.push(`• *Banco:* ${config.datosBancarios.banco}`);
    lines.push(`• *Tipo de Cuenta:* ${config.datosBancarios.tipoCuenta}`);
    lines.push(`• *N° Cuenta:* ${config.datosBancarios.numeroCuenta}`);
    lines.push(`• *Titular:* ${config.datosBancarios.titularNombre}`);
    lines.push(`• *RUT:* ${config.datosBancarios.titularRut}`);
    lines.push(`• *Email Comprobante:* ${config.datosBancarios.emailConfirmacion}`);
    lines.push(`\n📌 _Al transferir, por favor indique en el asunto: "${student.nombres} ${student.apellidos} - ${concepto}"._`);
  }

  lines.push('\nMuchas gracias por su compromiso y colaboración.');

  const text = lines.join('\n');
  const encoded = encodeURIComponent(text);
  const url = phone ? `https://wa.me/${phone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}
