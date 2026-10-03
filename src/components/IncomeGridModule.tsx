import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  MessageCircle,
  X,
  CreditCard,
  PlusCircle,
  CheckCircle2,
  Calendar,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  Student,
  FeePayment,
  CourseConfig,
  MonthIndex,
  MONTH_NAMES,
  UserRole,
} from '../types';
import {
  getMonthlyStatus,
  getStudentAnnualSummary,
  formatCurrency,
  addMovementLog,
} from '../services/storage';
import { openWhatsAppChat } from '../services/whatsapp';
import { formatThousands, parseThousands } from '../services/formatters';

interface IncomeGridModuleProps {
  year: number;
  config: CourseConfig;
  students: Student[];
  payments: FeePayment[];
  onUpdateStudents: (students: Student[]) => void;
  onUpdatePayments: (payments: FeePayment[]) => void;
  userRole: UserRole;
  onExportExcel: () => void;
}

export const IncomeGridModule: React.FC<IncomeGridModuleProps> = ({
  year,
  config,
  students,
  payments,
  onUpdateStudents,
  onUpdatePayments,
  userRole,
  onExportExcel,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStudentForAbono, setSelectedStudentForAbono] = useState<Student | null>(null);
  const [paymentModalData, setPaymentModalData] = useState<{
    student: Student;
    month: MonthIndex;
    existingPayment?: FeePayment;
    restante?: number;
    isSaldarRestante?: boolean;
  } | null>(null);
  const [paymentModalTab, setPaymentModalTab] = useState<'pago' | 'eximir'>('pago');
  const [paymentModalMonto, setPaymentModalMonto] = useState<number | ''>('');
  const [motivoExencionInput, setMotivoExencionInput] = useState('Beca acordada por directiva');
  const [confirmRevokePayment, setConfirmRevokePayment] = useState<FeePayment | null>(null);

  useEffect(() => {
    if (paymentModalData) {
      setPaymentModalMonto(
        paymentModalData.restante !== undefined
          ? paymentModalData.restante
          : config.cuotaMensualPorDefecto
      );
    } else {
      setPaymentModalMonto('');
    }
  }, [paymentModalData, config.cuotaMensualPorDefecto]);

  const isAuditor = userRole === 'auditor';

  // Filter students by search term
  const filteredStudents = useMemo(() => {
    if (!searchTerm.trim()) return students;
    const term = searchTerm.toLowerCase();
    return students.filter(
      (s) =>
        s.nombres.toLowerCase().includes(term) ||
        s.apellidos.toLowerCase().includes(term) ||
        s.rut.toLowerCase().includes(term) ||
        s.nombreApoderado.toLowerCase().includes(term)
    );
  }, [students, searchTerm]);

  // KPI Calculations matching screenshot
  const stats = useMemo(() => {
    let alDiaCount = 0;
    let conDeudaCount = 0;
    let recaudadoTotal = 0;
    let esperadoTotal = 0;

    students.forEach((student) => {
      const summary = getStudentAnnualSummary(
        student,
        year,
        payments,
        config.cuotaMensualPorDefecto
      );

      if (student.noPagaCuota) {
        // Exento doesn't count towards expected or debt
        return;
      }

      // Alumno inactivo: sus pagos se consideran en el recaudado total pero no como deudor activo
      if (student.activo === false) {
        recaudadoTotal += summary.totalPaid;
        return;
      }

      if (summary.isUpToDate && summary.applicableMonthsCount > 0) {
        alDiaCount++;
      } else if (summary.totalDebt > 0) {
        conDeudaCount++;
      }

      recaudadoTotal += summary.totalPaid;
      esperadoTotal += summary.totalExpected;
    });

    return {
      alDia: alDiaCount,
      conDeuda: conDeudaCount,
      recaudado: recaudadoTotal,
      esperado: esperadoTotal,
    };
  }, [students, payments, year, config.cuotaMensualPorDefecto]);

  // Toggle "No paga cuota" directly from row switch
  const handleToggleNoPagaCuota = (studentId: string, currentVal: boolean) => {
    if (isAuditor) return;
    const updated = students.map((s) =>
      s.id === studentId ? { ...s, noPagaCuota: !currentVal } : s
    );
    onUpdateStudents(updated);
  };

  // 1-Click Pay handler
  const handleQuickPay = (student: Student, month: MonthIndex) => {
    if (isAuditor) return;
    const defaultMonto = config.cuotaMensualPorDefecto;
    const now = new Date().toISOString().split('T')[0];

    const newPayment: FeePayment = {
      id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      studentId: student.id,
      year,
      month,
      monto: defaultMonto,
      montoEsperado: defaultMonto,
      fechaPago: now,
      medioPago: 'transferencia',
      numeroComprobante: 'PAGO-DIR',
    };

    onUpdatePayments([...payments, newPayment]);

    // Registrar log de movimiento contable
    addMovementLog({
      modulo: 'cuotas',
      tipoAccion: 'pago_cuota_creado',
      titulo: `Pago Cuota ${MONTH_NAMES[month]} Registrado`,
      descripcion: `Pago de cuota de ${MONTH_NAMES[month]} ${year} por $${defaultMonto.toLocaleString('es-CL')} CLP registrado para el alumno ${student.nombres} ${student.apellidos}.`,
      rol: userRole,
      montoAfectado: defaultMonto,
      referenciaId: student.id,
      referenciaNombre: `${student.nombres} ${student.apellidos}`,
      detallesAdicionales: { mes: MONTH_NAMES[month], medio: 'transferencia', comprobante: 'PAGO-DIR' },
    });
  };

  // Revoke/Delete payment or exemption
  const handleRevokePayment = (paymentId: string) => {
    if (isAuditor) return;
    const target = payments.find((p) => p.id === paymentId);
    const updated = payments.filter((p) => p.id !== paymentId);
    onUpdatePayments(updated);

    if (target) {
      const student = students.find((s) => s.id === target.studentId);
      const studentName = student ? `${student.nombres} ${student.apellidos}` : 'Alumno';
      const monthName = MONTH_NAMES[target.month];

      if (target.esExento) {
        addMovementLog({
          modulo: 'cuotas',
          tipoAccion: 'pago_cuota_exencion_anulada',
          titulo: `Exención de Cuota Anulada (${monthName})`,
          descripcion: `Se anuló la exención de cuota del mes de ${monthName} ${year} para el alumno ${studentName}. El mes volvió a figurar como pendiente de pago.`,
          rol: userRole,
          montoAfectado: 0,
          referenciaId: target.studentId,
          referenciaNombre: studentName,
          detallesAdicionales: { mes: monthName },
        });
      } else {
        addMovementLog({
          modulo: 'cuotas',
          tipoAccion: 'pago_cuota_anulado',
          titulo: `Pago de Cuota Anulado (${monthName})`,
          descripcion: `Se anuló el pago de $${target.monto.toLocaleString('es-CL')} CLP del mes de ${monthName} ${year} para el alumno ${studentName}.`,
          rol: userRole,
          montoAfectado: target.monto,
          referenciaId: target.studentId,
          referenciaNombre: studentName,
          detallesAdicionales: { mes: monthName, montoAnulado: target.monto },
        });
      }
    }

    setConfirmRevokePayment(null);
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP CARDS (Al día, Con deuda, Recaudado, Esperado) - Identical to screenshot */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Card: Al día */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Al día</p>
          <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">
            {stats.alDia}
          </p>
        </div>

        {/* Card: Con deuda */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Con deuda</p>
          <p className="text-3xl font-extrabold text-red-600 tabular-nums">
            {stats.conDeuda}
          </p>
        </div>

        {/* Card: Recaudado */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Recaudado</p>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(stats.recaudado)}
          </p>
        </div>

        {/* Card: Esperado */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Esperado</p>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {formatCurrency(stats.esperado)}
          </p>
        </div>
      </div>

      {/* 2. SEARCH BAR */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar alumno..."
          className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-slate-300 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-xs"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. GRILLA HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Grilla {year}
          </h2>
          <span className="text-xs text-slate-500 hidden md:inline">
            12 períodos · Cuota mensual · Varios meses: Abono
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onExportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            Descargar Excel
          </button>
        </div>
      </div>

      {/* 4. MAIN INTERACTIVE TABLE */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
            {/* Header row */}
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 sticky left-0 bg-slate-50 z-10 w-64 border-r border-slate-200">
                  Alumno
                </th>
                {MONTH_NAMES.map((name) => (
                  <th
                    key={name}
                    className="py-3 px-2 text-center border-r border-slate-200 font-semibold text-slate-700 min-w-[90px]"
                  >
                    <span className="block text-[11px] text-slate-500 font-normal">Cuota mensual</span>
                    <span className="text-xs text-slate-800">{name} {year}</span>
                  </th>
                ))}
                <th className="py-3 px-4 text-center z-10 min-w-[130px]">
                  Acciones
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={14} className="py-12 text-center text-slate-400">
                    No se encontraron alumnos que coincidan con la búsqueda.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  return (
                    <tr
                      key={student.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Sticky Alumno Column + "No paga cuota" toggle */}
                      <td className="py-3.5 px-4 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-sm block">
                                {student.nombres} {student.apellidos}
                              </span>
                              {student.activo === false && (
                                <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded shrink-0">
                                  Inactivo
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-500">
                              {student.rut}
                            </span>
                          </div>

                          {/* Toggle switch "No paga cuota" */}
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              disabled={isAuditor}
                              onClick={() =>
                                handleToggleNoPagaCuota(student.id, student.noPagaCuota)
                              }
                              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                student.noPagaCuota ? 'bg-purple-600' : 'bg-slate-200'
                              } ${isAuditor ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                                  student.noPagaCuota ? 'translate-x-4' : 'translate-x-0'
                                }`}
                              />
                            </button>
                            <span className="text-[10px] text-slate-500 leading-tight">
                              No paga<br />cuota
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 12 Months Cells */}
                      {MONTH_NAMES.map((_, mIdx) => {
                        const month = mIdx as MonthIndex;
                        const cellData = getMonthlyStatus(
                          student,
                          month,
                          payments,
                          year,
                          config.cuotaMensualPorDefecto
                        );

                        // Render based on state
                        if (cellData.status === 'not_applicable') {
                          return (
                            <td
                              key={month}
                              className="py-3 px-2 text-center text-slate-400 border-r border-slate-100 bg-slate-50/30"
                              title={`Ingresó en ${MONTH_NAMES[student.mesIngreso]}`}
                            >
                              <span className="text-slate-400 font-mono text-base">—</span>
                            </td>
                          );
                        }

                        if (cellData.status === 'exempt') {
                          return (
                            <td
                              key={month}
                              className="py-3 px-2 text-center border-r border-purple-100 bg-purple-50/40 text-purple-700"
                              title="Alumno exento de cuota"
                            >
                              <span className="text-[10px] font-medium text-purple-600">
                                Exento
                              </span>
                            </td>
                          );
                        }

                        if (cellData.status === 'paid') {
                          // Si el mes fue eximido de pago y saldado
                          if (cellData.payment?.esExento) {
                            return (
                              <td
                                key={month}
                                className="py-2.5 px-1.5 text-center border-r border-teal-100 bg-teal-50/70 relative group"
                              >
                                <div className="flex flex-col items-center justify-center">
                                  <button
                                    onClick={() => {
                                      setPaymentModalTab('eximir');
                                      setMotivoExencionInput(cellData.payment?.motivoExencion || 'Beca acordada por directiva');
                                      setPaymentModalData({
                                        student,
                                        month,
                                        existingPayment: cellData.payment,
                                      });
                                    }}
                                    title={`Mes eximido y saldado. Motivo: ${cellData.payment.motivoExencion || 'Aprobado por directiva'}. Clic para revisar o cambiar.`}
                                    className="cursor-pointer hover:opacity-80 transition-opacity flex flex-col items-center"
                                  >
                                    <span className="font-extrabold text-teal-800 text-xs tabular-nums flex items-center gap-1">
                                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                                      Saldado
                                    </span>
                                    <span className="text-[9px] font-bold text-teal-700 bg-teal-100 border border-teal-300 px-1 rounded-sm mt-0.5 shadow-2xs">
                                      Eximido
                                    </span>
                                  </button>

                                  {/* Botón para anular exención */}
                                  {!isAuditor && cellData.payment && (
                                    <button
                                      onClick={() => setConfirmRevokePayment(cellData.payment!)}
                                      title="Anular exención (volver a cuota pendiente)"
                                      className="mt-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-xs cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5 stroke-[3]" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            );
                          }

                          return (
                            <td
                              key={month}
                              className="py-2.5 px-2 text-center border-r border-emerald-100 bg-emerald-50/60 relative group"
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-emerald-800 text-xs tabular-nums">
                                  {formatCurrency(cellData.paidAmount)}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600">
                                  Pagado
                                </span>

                                {/* Red circular 'x' button matching screenshot to revoke/modify */}
                                {!isAuditor && cellData.payment && (
                                  <button
                                    onClick={() => setConfirmRevokePayment(cellData.payment!)}
                                    title="Anular pago"
                                    className="mt-1 w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-xs cursor-pointer"
                                  >
                                    <X className="w-2.5 h-2.5 stroke-[3]" />
                                  </button>
                                )}
                              </div>
                            </td>
                          );
                        }

                        if (cellData.status === 'partial') {
                          const restante = cellData.expectedAmount - cellData.paidAmount;
                          return (
                            <td
                              key={month}
                              className="py-2.5 px-1.5 text-center border-r border-sky-100 bg-sky-50/70"
                            >
                              <div className="flex flex-col items-center justify-center">
                                <span className="font-bold text-sky-900 text-xs tabular-nums">
                                  {formatCurrency(cellData.paidAmount)}
                                </span>
                                <span className="text-[10px] font-semibold text-sky-700">
                                  Abonado
                                </span>
                                <span className="text-[9px] text-amber-800 font-semibold">
                                  Resta {formatCurrency(restante)}
                                </span>

                                <div className="mt-1 flex items-center justify-center gap-1">
                                  <button
                                    disabled={isAuditor}
                                    onClick={() =>
                                      setPaymentModalData({
                                        student,
                                        month,
                                        existingPayment: cellData.payment,
                                        restante,
                                        isSaldarRestante: true,
                                      })
                                    }
                                    title={`Saldar los ${formatCurrency(restante)} restantes`}
                                    className="text-[10px] font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-0.5 rounded shadow-xs cursor-pointer"
                                  >
                                    Saldar
                                  </button>
                                  {!isAuditor && cellData.payment && (
                                    <button
                                      onClick={() => setConfirmRevokePayment(cellData.payment!)}
                                      title="Anular abono"
                                      className="w-4 h-4 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-transform hover:scale-110 shadow-xs cursor-pointer"
                                    >
                                      <X className="w-2.5 h-2.5 stroke-[3]" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </td>
                          );
                        }

                        // Status is 'pending' -> Pagar button matching screenshot
                        return (
                          <td
                            key={month}
                            className="py-2.5 px-2 text-center border-r border-amber-100/60 bg-amber-50/30 hover:bg-amber-50/70 transition-colors"
                          >
                            <div className="flex flex-col items-center justify-center">
                              <span className="font-bold text-slate-800 text-xs tabular-nums">
                                {formatCurrency(cellData.expectedAmount)}
                              </span>
                              <button
                                disabled={isAuditor}
                                onClick={() =>
                                  setPaymentModalData({
                                    student,
                                    month,
                                    existingPayment: cellData.payment,
                                  })
                                }
                                className={`mt-0.5 text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:underline cursor-pointer ${
                                  isAuditor ? 'cursor-not-allowed opacity-60' : ''
                                }`}
                              >
                                Pagar
                              </button>
                            </div>
                          </td>
                        );
                      })}

                      {/* Actions Column (WhatsApp + Abono) */}
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* WhatsApp Button */}
                          <button
                            onClick={() =>
                              openWhatsAppChat(student, year, payments, config)
                            }
                            title={`Enviar estado de cuotas a ${student.nombreApoderado} (${student.telefonoApoderado})`}
                            className="w-8 h-8 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center transition-all shadow-xs cursor-pointer hover:scale-105"
                          >
                            <MessageCircle className="w-4 h-4 fill-white" />
                          </button>

                          {/* Abono Button */}
                          <button
                            disabled={isAuditor}
                            onClick={() => setSelectedStudentForAbono(student)}
                            className={`px-3 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs transition-colors cursor-pointer ${
                              isAuditor ? 'opacity-60 cursor-not-allowed' : ''
                            }`}
                          >
                            Abono
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. BOTTOM LEGEND - Exactly like in screenshot */}
      <div className="flex flex-wrap items-center gap-6 pt-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-emerald-100 border border-emerald-300"></span>
          <span>Pagado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-teal-100 border border-teal-300"></span>
          <span className="font-semibold text-teal-800">Eximido / Saldado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-sky-100 border border-sky-300"></span>
          <span>Abonado</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-amber-100 border border-amber-300"></span>
          <span>Pendiente</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-purple-100 border border-purple-300"></span>
          <span>No paga la cuota</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3.5 h-3.5 rounded bg-slate-100 border border-slate-300"></span>
          <span>No aplica</span>
        </div>
      </div>

      {/* 6. MODAL: PAGAR CUOTA O ACEPTAR EXIMIR PAGO (MES SALDADO) */}
      {paymentModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {paymentModalTab === 'eximir'
                    ? 'Eximir Cuota (Mes Saldado)'
                    : paymentModalData.isSaldarRestante
                    ? 'Saldar Cuota Mensual'
                    : 'Registrar Pago de Cuota'}
                </h3>
                <p className="text-xs text-slate-300">
                  {MONTH_NAMES[paymentModalData.month]} {year} · {paymentModalData.student.nombres} {paymentModalData.student.apellidos}
                </p>
              </div>
              <button
                onClick={() => setPaymentModalData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Selector de Modo: Registrar Pago vs Aceptar Eximir Pago */}
            <div className="flex border-b border-slate-200 bg-slate-50">
              <button
                type="button"
                onClick={() => setPaymentModalTab('pago')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentModalTab === 'pago'
                    ? 'bg-white text-slate-900 border-b-2 border-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" />
                <span>Pagar / Abonar</span>
              </button>
              <button
                type="button"
                onClick={() => setPaymentModalTab('eximir')}
                className={`flex-1 py-2.5 px-3 text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                  paymentModalTab === 'eximir'
                    ? 'bg-white text-teal-800 border-b-2 border-teal-600 shadow-2xs'
                    : 'text-slate-500 hover:text-teal-700'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                <span>Aceptar Eximir Pago (Saldado)</span>
              </button>
            </div>

            {paymentModalTab === 'pago' ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (isAuditor) return;
                  const form = e.currentTarget;
                  const nuevoAporte =
                    typeof paymentModalMonto === 'number'
                      ? paymentModalMonto
                      : parseThousands(form.monto?.value || '0');
                  if (nuevoAporte <= 0) return;
                  const fecha = form.fecha.value;
                  const medio = form.medio.value as 'transferencia' | 'efectivo' | 'deposito' | 'otro';
                  const comprobante = form.comprobante.value;

                  const yaAbonado = paymentModalData.isSaldarRestante && paymentModalData.existingPayment
                    ? paymentModalData.existingPayment.monto
                    : 0;

                  const montoTotalAcumulado = yaAbonado + nuevoAporte;

                  const newPay: FeePayment = {
                    id: paymentModalData.existingPayment?.id || `pay-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                    studentId: paymentModalData.student.id,
                    year,
                    month: paymentModalData.month,
                    monto: montoTotalAcumulado,
                    montoEsperado: config.cuotaMensualPorDefecto,
                    fechaPago: fecha,
                    medioPago: medio,
                    numeroComprobante: comprobante || (paymentModalData.isSaldarRestante ? 'SALDO-COMPLETADO' : undefined),
                    esExento: false,
                  };

                  const filtered = payments.filter(
                    (p) =>
                      !(
                        p.studentId === paymentModalData.student.id &&
                        p.year === year &&
                        p.month === paymentModalData.month
                      )
                  );
                  onUpdatePayments([...filtered, newPay]);

                  // Log de auditoría
                  addMovementLog({
                    modulo: 'cuotas',
                    tipoAccion: paymentModalData.isSaldarRestante ? 'pago_cuota_abono' : 'pago_cuota_creado',
                    titulo: `${paymentModalData.isSaldarRestante ? 'Abono Completado' : 'Pago de Cuota'} (${MONTH_NAMES[paymentModalData.month]})`,
                    descripcion: `Se registró pago de $${nuevoAporte.toLocaleString('es-CL')} CLP para la cuota de ${MONTH_NAMES[paymentModalData.month]} ${year} del alumno ${paymentModalData.student.nombres} ${paymentModalData.student.apellidos}. Medio: ${medio}.`,
                    rol: userRole,
                    montoAfectado: nuevoAporte,
                    referenciaId: paymentModalData.student.id,
                    referenciaNombre: `${paymentModalData.student.nombres} ${paymentModalData.student.apellidos}`,
                    detallesAdicionales: { mes: MONTH_NAMES[paymentModalData.month], comprobante, medio },
                  });

                  setPaymentModalData(null);
                }}
                className="p-6 space-y-4"
              >
                {paymentModalData.isSaldarRestante && paymentModalData.existingPayment && (
                  <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1 text-xs">
                    <div className="flex justify-between text-slate-700">
                      <span>Cuota mensual total:</span>
                      <span className="font-bold">{formatCurrency(config.cuotaMensualPorDefecto)}</span>
                    </div>
                    <div className="flex justify-between text-sky-800">
                      <span>Monto ya abonado:</span>
                      <span className="font-bold">{formatCurrency(paymentModalData.existingPayment.monto)}</span>
                    </div>
                    <div className="flex justify-between text-amber-900 font-bold border-t border-sky-200 pt-1">
                      <span>Saldo restante a saldar:</span>
                      <span>{formatCurrency(paymentModalData.restante || (config.cuotaMensualPorDefecto - paymentModalData.existingPayment.monto))}</span>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {paymentModalData.isSaldarRestante
                      ? 'Monto a Saldar / Abonar ahora ($ CLP)'
                      : 'Monto a Pagar ($ CLP)'}
                  </label>
                  <input
                    name="monto"
                    type="text"
                    inputMode="numeric"
                    required
                    value={paymentModalMonto !== '' ? formatThousands(paymentModalMonto) : ''}
                    onChange={(e) => {
                      const parsed = parseThousands(e.target.value);
                      setPaymentModalMonto(e.target.value === '' ? '' : parsed);
                    }}
                    placeholder={`Ej: ${formatThousands(config.cuotaMensualPorDefecto)}`}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {paymentModalData.isSaldarRestante
                      ? 'Se sumará al abono anterior completando el total de la cuota.'
                      : 'Puedes ingresar el total de la cuota o un monto parcial (abono).'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Pago
                  </label>
                  <input
                    name="fecha"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Medio de Pago
                  </label>
                  <select
                    name="medio"
                    defaultValue="transferencia"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  >
                    <option value="transferencia">Transferencia Bancaria</option>
                    <option value="efectivo">Efectivo</option>
                    <option value="deposito">Depósito Bancario</option>
                    <option value="otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    N° Comprobante / Operación (Opcional)
                  </label>
                  <input
                    name="comprobante"
                    type="text"
                    placeholder="Ej: TR-89472"
                    className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentModalData(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isAuditor}
                    className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    Confirmar Pago
                  </button>
                </div>
              </form>
            ) : (
              /* TAB: ACEPTAR EXIMIR PAGO (MES SALDADO) */
              <div className="p-6 space-y-4">
                <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-xl space-y-1.5">
                  <div className="flex items-center gap-2 text-teal-900 font-bold text-xs">
                    <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0" />
                    <span>Aceptar Exención de Cuota (Mes Saldado)</span>
                  </div>
                  <p className="text-[11px] text-teal-800 leading-relaxed">
                    Al confirmar la exención de pago para el mes de <strong>{MONTH_NAMES[paymentModalData.month]} {year}</strong>, el alumno <strong>{paymentModalData.student.nombres} {paymentModalData.student.apellidos}</strong> quedará con el mes <strong>100% saldado</strong>. No generará deuda ni figurará moroso en reportes financieros.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Motivo o Justificación de la Exención *
                  </label>
                  <input
                    type="text"
                    required
                    value={motivoExencionInput}
                    onChange={(e) => setMotivoExencionInput(e.target.value)}
                    placeholder="Ej: Beca acordada por directiva de curso / Caso social"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600 bg-white"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['Beca directiva', 'Caso social', 'Beca deportiva', 'Acuerdo general', 'Exoneración puntual'].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setMotivoExencionInput(sug)}
                        className="text-[10px] bg-slate-100 hover:bg-teal-100 text-slate-700 hover:text-teal-900 px-2 py-0.5 rounded border border-slate-200 cursor-pointer transition-colors"
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Resolución / Aprobación
                  </label>
                  <input
                    id="fechaExencionInput"
                    type="date"
                    required
                    defaultValue={paymentModalData.existingPayment?.fechaPago || new Date().toISOString().split('T')[0]}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setPaymentModalData(null)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    disabled={isAuditor}
                    onClick={() => {
                      if (isAuditor) return;
                      const motivo = motivoExencionInput.trim() || 'Aprobado por directiva de curso';
                      const fechaInput = (document.getElementById('fechaExencionInput') as HTMLInputElement)?.value || new Date().toISOString().split('T')[0];

                      const exentoPay: FeePayment = {
                        id: paymentModalData.existingPayment?.id || `pay-ex-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                        studentId: paymentModalData.student.id,
                        year,
                        month: paymentModalData.month,
                        monto: 0,
                        montoEsperado: 0,
                        fechaPago: fechaInput,
                        medioPago: 'otro',
                        numeroComprobante: 'EXIMIDO-SALDADO',
                        esExento: true,
                        motivoExencion: motivo,
                        observaciones: `Exención autorizada: ${motivo}. Mes saldado.`,
                      };

                      const filtered = payments.filter(
                        (p) =>
                          !(
                            p.studentId === paymentModalData.student.id &&
                            p.year === year &&
                            p.month === paymentModalData.month
                          )
                      );
                      onUpdatePayments([...filtered, exentoPay]);

                      addMovementLog({
                        modulo: 'cuotas',
                        tipoAccion: 'pago_cuota_eximido',
                        titulo: `Cuota Eximida y Saldada (${MONTH_NAMES[paymentModalData.month]})`,
                        descripcion: `Se aceptó eximir el pago de cuota de ${MONTH_NAMES[paymentModalData.month]} ${year} para el alumno ${paymentModalData.student.nombres} ${paymentModalData.student.apellidos}. El mes queda 100% saldado. Motivo: ${motivo}.`,
                        rol: userRole,
                        montoAfectado: 0,
                        referenciaId: paymentModalData.student.id,
                        referenciaNombre: `${paymentModalData.student.nombres} ${paymentModalData.student.apellidos}`,
                        detallesAdicionales: { mes: MONTH_NAMES[paymentModalData.month], motivo },
                      });

                      setPaymentModalData(null);
                    }}
                    className="px-4 py-2 text-xs font-bold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aceptar Eximir Pago (Mes Saldado)</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 7. MODAL: ABONO O PAGO DE VARIOS MESES */}
      {selectedStudentForAbono && (
        <AbonoMultiModal
          student={selectedStudentForAbono}
          year={year}
          config={config}
          payments={payments}
          onClose={() => setSelectedStudentForAbono(null)}
          onSavePayments={(newPayments) => {
            onUpdatePayments(newPayments);
            setSelectedStudentForAbono(null);
          }}
        />
      )}

      {/* 8. MODAL CONFIRMAR ANULACIÓN DE PAGO */}
      {confirmRevokePayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">¿Anular este pago?</h4>
              <p className="text-xs text-slate-600 mt-1">
                Se anulará el pago de{' '}
                <strong>{formatCurrency(confirmRevokePayment.monto)}</strong> de{' '}
                <strong>{MONTH_NAMES[confirmRevokePayment.month]} {year}</strong>. El mes volverá a figurar como pendiente.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setConfirmRevokePayment(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Volver
              </button>
              <button
                onClick={() => handleRevokePayment(confirmRevokePayment.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Sí, anular pago
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Subcomponent: Modal to pay multiple months or apply custom abono
interface AbonoModalProps {
  student: Student;
  year: number;
  config: CourseConfig;
  payments: FeePayment[];
  onClose: () => void;
  onSavePayments: (payments: FeePayment[]) => void;
}

const AbonoMultiModal: React.FC<AbonoModalProps> = ({
  student,
  year,
  config,
  payments,
  onClose,
  onSavePayments,
}) => {
  // Find which months are pending or partial
  const monthStatuses = useMemo(() => {
    return MONTH_NAMES.map((name, idx) => {
      const month = idx as MonthIndex;
      const statusData = getMonthlyStatus(
        student,
        month,
        payments,
        year,
        config.cuotaMensualPorDefecto
      );
      return { month, name, ...statusData };
    });
  }, [student, payments, year, config.cuotaMensualPorDefecto]);

  const [selectedMonths, setSelectedMonths] = useState<MonthIndex[]>([]);
  const [medioPago, setMedioPago] = useState<'transferencia' | 'efectivo' | 'deposito' | 'otro'>('transferencia');
  const [numeroComprobante, setNumeroComprobante] = useState('');
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);

  const toggleMonth = (m: MonthIndex) => {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((item) => item !== m) : [...prev, m]
    );
  };

  const totalCalculado = selectedMonths.length * config.cuotaMensualPorDefecto;

  const handleConfirm = () => {
    if (selectedMonths.length === 0) return;

    // Filter out existing payments for these selected months
    const cleanedPayments = payments.filter(
      (p) =>
        !(p.studentId === student.id && p.year === year && selectedMonths.includes(p.month))
    );

    const newEntries: FeePayment[] = selectedMonths.map((m) => ({
      id: `pay-${Date.now()}-${m}-${Math.random().toString(36).substring(2, 6)}`,
      studentId: student.id,
      year,
      month: m,
      monto: config.cuotaMensualPorDefecto,
      montoEsperado: config.cuotaMensualPorDefecto,
      fechaPago,
      medioPago,
      numeroComprobante: numeroComprobante || 'ABONO-MULTI',
    }));

    onSavePayments([...cleanedPayments, ...newEntries]);

    addMovementLog({
      modulo: 'cuotas',
      tipoAccion: 'pago_cuota_abono',
      titulo: `Abono Múltiple (${selectedMonths.length} meses)`,
      descripcion: `Se registró pago múltiple por $${totalCalculado.toLocaleString('es-CL')} CLP para los meses de ${selectedMonths.map((m) => MONTH_NAMES[m]).join(', ')} del alumno ${student.nombres} ${student.apellidos}.`,
      rol: 'admin',
      montoAfectado: totalCalculado,
      referenciaId: student.id,
      referenciaNombre: `${student.nombres} ${student.apellidos}`,
      detallesAdicionales: { meses: selectedMonths.map((m) => MONTH_NAMES[m]), total: totalCalculado, medioPago },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
        <div className="p-5 bg-teal-800 text-white flex items-center justify-between">
          <div>
            <h3 className="font-bold text-base">Registrar Abono / Múltiples Meses</h3>
            <p className="text-xs text-teal-200">
              {student.nombres} {student.apellidos} · Período {year}
            </p>
          </div>
          <button onClick={onClose} className="text-teal-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Month selector checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Selecciona los meses a pagar ({config.cuotaMensualPorDefecto.toLocaleString('es-CL')} c/u):
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {monthStatuses.map((item) => {
                const isPaid = item.status === 'paid';
                const isExempt = item.status === 'exempt';
                const isNotApp = item.status === 'not_applicable';
                const isSelected = selectedMonths.includes(item.month);
                const disabled = isPaid || isExempt || isNotApp;

                return (
                  <button
                    key={item.month}
                    type="button"
                    disabled={disabled}
                    onClick={() => toggleMonth(item.month)}
                    className={`py-2 px-2 text-xs font-semibold rounded-lg border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                        : isPaid
                        ? 'bg-emerald-50 text-emerald-600 border-emerald-200 opacity-60 cursor-not-allowed'
                        : isNotApp || isExempt
                        ? 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white text-slate-700 border-slate-300 hover:border-teal-500'
                    }`}
                  >
                    <div>{item.name}</div>
                    <div className="text-[10px] font-normal">
                      {isPaid ? '✓ Pagado' : isNotApp ? 'No aplica' : isExempt ? 'Exento' : formatCurrency(config.cuotaMensualPorDefecto)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment meta fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha del Pago
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Medio de Pago
              </label>
              <select
                value={medioPago}
                onChange={(e) => setMedioPago(e.target.value as any)}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600"
              >
                <option value="transferencia">Transferencia Bancaria</option>
                <option value="efectivo">Efectivo</option>
                <option value="deposito">Depósito Bancario</option>
                <option value="otro">Otro</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              N° Comprobante / Referencia
            </label>
            <input
              type="text"
              placeholder="Ej: Transferencia #483921"
              value={numeroComprobante}
              onChange={(e) => setNumeroComprobante(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-600"
            />
          </div>

          {/* Total summary */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              Meses seleccionados: <strong>{selectedMonths.length}</strong>
            </span>
            <span className="text-sm font-bold text-slate-900 tabular-nums">
              Total: {formatCurrency(totalCalculado)}
            </span>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={selectedMonths.length === 0}
              onClick={handleConfirm}
              className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Guardar Abono ({formatCurrency(totalCalculado)})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
