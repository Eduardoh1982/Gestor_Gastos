import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  PlusCircle,
  Search,
  Edit2,
  Trash2,
  Calendar,
  DollarSign,
  AlertCircle,
  X,
  TrendingUp,
  Users,
  CheckCircle2,
  MessageCircle,
  Check,
  ShieldCheck,
} from 'lucide-react';
import { ExtraIncome, Student, CourseConfig, UserRole } from '../types';
import { formatCurrency, addMovementLog } from '../services/storage';
import { cleanPhoneNumber } from '../services/whatsapp';

interface ExtraIncomeModuleProps {
  year: number;
  extraIncomes: ExtraIncome[];
  onUpdateExtraIncomes: (incomes: ExtraIncome[]) => void;
  students: Student[];
  config: CourseConfig;
  userRole: UserRole;
}

export const ExtraIncomeModule: React.FC<ExtraIncomeModuleProps> = ({
  year,
  extraIncomes,
  onUpdateExtraIncomes,
  students,
  config,
  userRole,
}) => {
  const isAuditor = userRole === 'auditor';

  const [searchTerm, setSearchTerm] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingIncome, setEditingIncome] = useState<ExtraIncome | null>(null);
  const [deletingIncome, setDeletingIncome] = useState<ExtraIncome | null>(null);
  const [trackingIncome, setTrackingIncome] = useState<ExtraIncome | null>(null);
  const [trackingFilter, setTrackingFilter] = useState<'all' | 'paid' | 'pending' | 'exempt'>('all');

  // Form states
  const [formConcepto, setFormConcepto] = useState('Rifa');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formMonto, setFormMonto] = useState<number | ''>('');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formOrigenFondos, setFormOrigenFondos] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formTipoCobro, setFormTipoCobro] = useState<'fijo_por_alumno' | 'general'>('fijo_por_alumno');
  const [formMontoPorAlumno, setFormMontoPorAlumno] = useState<number | ''>(5000);
  const [formAlumnosPagados, setFormAlumnosPagados] = useState<string[]>([]);

  // Filter by active year
  const yearIncomes = useMemo(() => {
    return extraIncomes.filter((i) => i.year === year);
  }, [extraIncomes, year]);

  const filteredIncomes = useMemo(() => {
    return yearIncomes.filter((i) => {
      const term = searchTerm.toLowerCase();
      return (
        i.concepto.toLowerCase().includes(term) ||
        i.descripcion.toLowerCase().includes(term) ||
        i.origenFondos.toLowerCase().includes(term)
      );
    });
  }, [yearIncomes, searchTerm]);

  const totalExtra = useMemo(() => {
    return yearIncomes.reduce((acc, curr) => acc + curr.monto, 0);
  }, [yearIncomes]);

  const openCreateModal = () => {
    setFormConcepto('Rifa');
    setFormDescripcion('');
    setFormMonto('');
    setFormFecha(new Date().toISOString().split('T')[0]);
    setFormOrigenFondos('Venta de números por alumnos y apoderados');
    setFormObservaciones('');
    setFormTipoCobro('fijo_por_alumno');
    setFormMontoPorAlumno(5000);
    setFormAlumnosPagados([]);
    setEditingIncome(null);
    setModalMode('create');
  };

  const openEditModal = (income: ExtraIncome) => {
    setFormConcepto(income.concepto);
    setFormDescripcion(income.descripcion);
    setFormMonto(income.monto);
    setFormFecha(income.fecha);
    setFormOrigenFondos(income.origenFondos);
    setFormObservaciones(income.observaciones || '');
    setFormTipoCobro(income.tipoCobro || (income.concepto === 'Rifa' || income.concepto === 'Cuota Extraordinaria' ? 'fijo_por_alumno' : 'general'));
    setFormMontoPorAlumno(income.montoPorAlumno || 5000);
    setFormAlumnosPagados(income.alumnosPagados || []);
    setEditingIncome(income);
    setModalMode('edit');
  };

  const handleConceptoChange = (newConcepto: string) => {
    setFormConcepto(newConcepto);
    if (newConcepto === 'Rifa' || newConcepto === 'Cuota Extraordinaria') {
      setFormTipoCobro('fijo_por_alumno');
      if (!formMontoPorAlumno) setFormMontoPorAlumno(newConcepto === 'Rifa' ? 5000 : 3000);
    }
  };

  const handleSaveIncome = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuditor) return;

    let finalMonto = Number(formMonto);
    if (formTipoCobro === 'fijo_por_alumno') {
      const fixedAmount = Number(formMontoPorAlumno) || 0;
      finalMonto = formAlumnosPagados.length * fixedAmount;
    }

    if (finalMonto < 0) return;

    if (modalMode === 'create') {
      const newIncome: ExtraIncome = {
        id: `inc-${Date.now()}`,
        year,
        concepto: formConcepto.trim(),
        descripcion: formDescripcion.trim(),
        monto: finalMonto,
        fecha: formFecha,
        origenFondos: formOrigenFondos.trim(),
        observaciones: formObservaciones.trim(),
        tipoCobro: formTipoCobro,
        montoPorAlumno: formTipoCobro === 'fijo_por_alumno' ? Number(formMontoPorAlumno) : undefined,
        alumnosPagados: formTipoCobro === 'fijo_por_alumno' ? formAlumnosPagados : undefined,
        alumnosExentos: formTipoCobro === 'fijo_por_alumno' ? [] : undefined,
      };
      onUpdateExtraIncomes([newIncome, ...extraIncomes]);

      addMovementLog({
        modulo: 'ingresos_extra',
        tipoAccion: 'ingreso_extra_creado',
        titulo: `Actividad Extra Creada: ${newIncome.concepto}`,
        descripcion: `Se creó "${newIncome.concepto}" (${newIncome.descripcion || 'Sin descripción'}). Tipo: ${newIncome.tipoCobro === 'fijo_por_alumno' ? `Fijo por alumno ($${newIncome.montoPorAlumno?.toLocaleString('es-CL')})` : `General ($${newIncome.monto.toLocaleString('es-CL')})`}.`,
        rol: userRole,
        montoAfectado: newIncome.monto,
        referenciaId: newIncome.id,
        referenciaNombre: newIncome.concepto,
      });
    } else if (modalMode === 'edit' && editingIncome) {
      const updated = extraIncomes.map((item) =>
        item.id === editingIncome.id
          ? {
              ...item,
              concepto: formConcepto.trim(),
              descripcion: formDescripcion.trim(),
              monto: finalMonto,
              fecha: formFecha,
              origenFondos: formOrigenFondos.trim(),
              observaciones: formObservaciones.trim(),
              tipoCobro: formTipoCobro,
              montoPorAlumno: formTipoCobro === 'fijo_por_alumno' ? Number(formMontoPorAlumno) : undefined,
              alumnosPagados: formTipoCobro === 'fijo_por_alumno' ? formAlumnosPagados : undefined,
              alumnosExentos: formTipoCobro === 'fijo_por_alumno' ? (item.alumnosExentos || []) : undefined,
            }
          : item
      );
      onUpdateExtraIncomes(updated);

      addMovementLog({
        modulo: 'ingresos_extra',
        tipoAccion: 'ingreso_extra_editado',
        titulo: `Actividad Extra Editada: ${formConcepto.trim()}`,
        descripcion: `Se actualizaron los datos de la actividad extraordinaria "${formConcepto.trim()}".`,
        rol: userRole,
        montoAfectado: finalMonto,
        referenciaId: editingIncome.id,
        referenciaNombre: formConcepto.trim(),
      });
    }

    setModalMode(null);
    setEditingIncome(null);
  };

  const handleDeleteIncome = (id: string) => {
    if (isAuditor) return;
    const target = extraIncomes.find((i) => i.id === id);
    onUpdateExtraIncomes(extraIncomes.filter((i) => i.id !== id));

    if (target) {
      addMovementLog({
        modulo: 'ingresos_extra',
        tipoAccion: 'ingreso_extra_eliminado',
        titulo: `Actividad Extra Eliminada: ${target.concepto}`,
        descripcion: `Se eliminó el registro de "${target.concepto}" ($${target.monto.toLocaleString('es-CL')} CLP).`,
        rol: userRole,
        montoAfectado: target.monto,
        referenciaId: target.id,
        referenciaNombre: target.concepto,
      });
    }

    setDeletingIncome(null);
  };

  // Toggle student paid status from student checklist modal
  const handleToggleStudentPaid = (incomeId: string, studentId: string) => {
    if (isAuditor) return;

    const targetIncome = extraIncomes.find((i) => i.id === incomeId);
    if (!targetIncome) return;

    const currentPaid = targetIncome.alumnosPagados || [];
    const isCurrentlyPaid = currentPaid.includes(studentId);

    const updatedPaid = isCurrentlyPaid
      ? currentPaid.filter((id) => id !== studentId)
      : [...currentPaid, studentId];

    // If marked as paid, make sure it's not in exempt
    const currentExempt = targetIncome.alumnosExentos || [];
    const updatedExempt = currentExempt.filter((id) => id !== studentId);

    const fixedAmount = targetIncome.montoPorAlumno || 0;
    const newTotal = updatedPaid.length * fixedAmount;

    const updatedIncome = {
      ...targetIncome,
      alumnosPagados: updatedPaid,
      alumnosExentos: updatedExempt,
      monto: newTotal,
    };

    const updatedList = extraIncomes.map((item) =>
      item.id === incomeId ? updatedIncome : item
    );

    onUpdateExtraIncomes(updatedList);
    setTrackingIncome(updatedIncome);

    const student = students.find((s) => s.id === studentId);
    const studentName = student ? `${student.nombres} ${student.apellidos}` : 'Alumno';
    addMovementLog({
      modulo: 'ingresos_extra',
      tipoAccion: 'ingreso_extra_pago_alumno',
      titulo: `${isCurrentlyPaid ? 'Pago Anulado' : 'Pago Registrado'}: ${targetIncome.concepto}`,
      descripcion: `Se marcó como ${isCurrentlyPaid ? 'PENDIENTE' : 'PAGADO'} el concepto "${targetIncome.concepto}" ($${fixedAmount.toLocaleString('es-CL')}) para el alumno ${studentName}.`,
      rol: userRole,
      montoAfectado: fixedAmount,
      referenciaId: studentId,
      referenciaNombre: studentName,
    });
  };

  // Toggle student exempt status via switch
  const handleToggleStudentExempt = (incomeId: string, studentId: string) => {
    if (isAuditor) return;

    const targetIncome = extraIncomes.find((i) => i.id === incomeId);
    if (!targetIncome) return;

    const currentExempt = targetIncome.alumnosExentos || [];
    const isCurrentlyExempt = currentExempt.includes(studentId);

    const updatedExempt = isCurrentlyExempt
      ? currentExempt.filter((id) => id !== studentId)
      : [...currentExempt, studentId];

    // If marked as exempt, remove from paid
    let updatedPaid = targetIncome.alumnosPagados || [];
    if (!isCurrentlyExempt && updatedPaid.includes(studentId)) {
      updatedPaid = updatedPaid.filter((id) => id !== studentId);
    }

    const fixedAmount = targetIncome.montoPorAlumno || 0;
    const newTotal = updatedPaid.length * fixedAmount;

    const updatedIncome: ExtraIncome = {
      ...targetIncome,
      alumnosExentos: updatedExempt,
      alumnosPagados: updatedPaid,
      monto: newTotal,
    };

    const updatedList = extraIncomes.map((item) =>
      item.id === incomeId ? updatedIncome : item
    );

    onUpdateExtraIncomes(updatedList);
    setTrackingIncome(updatedIncome);

    const student = students.find((s) => s.id === studentId);
    const studentName = student ? `${student.nombres} ${student.apellidos}` : 'Alumno';
    addMovementLog({
      modulo: 'ingresos_extra',
      tipoAccion: 'ingreso_extra_exencion_alumno',
      titulo: `${isCurrentlyExempt ? 'Exención Removida' : 'Alumno Eximido'}: ${targetIncome.concepto}`,
      descripcion: `El alumno ${studentName} fue marcado como ${isCurrentlyExempt ? 'OBLIGADO A PAGO' : 'EXENTO DE PAGO (Switch activado)'} para el cobro de "${targetIncome.concepto}".`,
      rol: userRole,
      montoAfectado: fixedAmount,
      referenciaId: studentId,
      referenciaNombre: studentName,
      detallesAdicionales: { concepto: targetIncome.concepto, exento: !isCurrentlyExempt },
    });
  };

  const handleMarkAllStudents = (incomeId: string, markPaid: boolean) => {
    if (isAuditor) return;

    const targetIncome = extraIncomes.find((i) => i.id === incomeId);
    if (!targetIncome) return;

    const updatedPaid = markPaid ? students.map((s) => s.id) : [];
    const fixedAmount = targetIncome.montoPorAlumno || 0;
    const newTotal = updatedPaid.length * fixedAmount;

    const updatedIncome = {
      ...targetIncome,
      alumnosPagados: updatedPaid,
      monto: newTotal,
    };

    const updatedList = extraIncomes.map((item) =>
      item.id === incomeId ? updatedIncome : item
    );

    onUpdateExtraIncomes(updatedList);
    setTrackingIncome(updatedIncome);
  };

  // WhatsApp reminder for Rifa or Cuota Extraordinaria
  const sendWhatsAppReminder = (student: Student, income: ExtraIncome) => {
    const phone = cleanPhoneNumber(student.telefonoApoderado);
    const monto = formatCurrency(income.montoPorAlumno || 0);

    const lines = [
      `👋 *Estimado/a ${student.nombreApoderado || 'Apoderado/a'}:*`,
      `Le saludamos desde la Tesorería de *${config.nombreCurso}*.`,
      `Le recordamos sobre el pago de *${income.concepto}* (${income.descripcion}) para el alumno/a *${student.nombres} ${student.apellidos}*.`,
      `💰 *Monto a cancelar:* ${monto}`,
      `📌 *Estado actual:* ⚠️ Pendiente de pago`,
    ];

    if (config.datosBancarios?.numeroCuenta) {
      lines.push('\n🏦 *Datos para Transferencia Bancaria:*');
      lines.push(`• *Banco:* ${config.datosBancarios.banco}`);
      lines.push(`• *Tipo de Cuenta:* ${config.datosBancarios.tipoCuenta}`);
      lines.push(`• *N° Cuenta:* ${config.datosBancarios.numeroCuenta}`);
      lines.push(`• *Titular:* ${config.datosBancarios.titularNombre}`);
      lines.push(`• *RUT:* ${config.datosBancarios.titularRut}`);
      lines.push(`• *Email Comprobante:* ${config.datosBancarios.emailConfirmacion}`);
    }

    lines.push('\nMuchas gracias por su apoyo y colaboración.');

    const text = encodeURIComponent(lines.join('\n'));
    const url = phone ? `https://wa.me/${phone}?text=${text}` : `https://wa.me/?text=${text}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            Ingresos Extraordinarios ({year})
          </h2>
          <p className="text-xs text-slate-500">
            Control de rifas, cuotas extraordinarias por alumno con checklist de pago, bingos y eventos pro-fondos.
          </p>
        </div>

        <button
          disabled={isAuditor}
          onClick={openCreateModal}
          className={`flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer ${
            isAuditor ? 'opacity-60 cursor-not-allowed' : ''
          }`}
        >
          <PlusCircle className="w-4 h-4" />
          Registrar Ingreso Extra
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Total Ingresos Extra {year}</p>
          <p className="text-3xl font-extrabold text-amber-600 tabular-nums">
            {formatCurrency(totalExtra)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Actividades Registradas</p>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {yearIncomes.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Rifas / Cuotas con Control de Alumno</p>
          <p className="text-3xl font-extrabold text-indigo-600 tabular-nums">
            {yearIncomes.filter((i) => i.tipoCobro === 'fijo_por_alumno').length}
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por concepto, descripción u origen de los fondos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-600"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-3">Concepto</th>
                <th className="py-3 px-4">Descripción de la Actividad</th>
                <th className="py-3 px-3">Tipo / Control Alumnos</th>
                <th className="py-3 px-3">Origen de los Fondos</th>
                <th className="py-3 px-3 text-right">Monto Recaudado</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredIncomes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No se registran ingresos extraordinarios en el año {year}.
                  </td>
                </tr>
              ) : (
                filteredIncomes.map((item) => {
                  const isPerStudent = item.tipoCobro === 'fijo_por_alumno';
                  const pagadosCount = item.alumnosPagados?.length || 0;
                  const totalStudents = students.length;

                  return (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {item.fecha}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span className="bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded text-[11px] border border-amber-200">
                          {item.concepto}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {item.descripcion}
                        </div>
                        {item.observaciones && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {item.observaciones}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        {isPerStudent ? (
                          <div className="space-y-1">
                            <span className="text-[11px] font-semibold text-indigo-700 block">
                              {formatCurrency(item.montoPorAlumno || 0)} c/u
                            </span>
                            <button
                              onClick={() => setTrackingIncome(item)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded text-[10px] font-bold transition-colors cursor-pointer"
                            >
                              <Users className="w-3 h-3" />
                              Control: {pagadosCount}/{totalStudents} pagados
                            </button>
                          </div>
                        ) : (
                          <span className="text-slate-500 text-[11px]">Ingreso General</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-slate-700">
                        {item.origenFondos || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-emerald-600 text-sm">
                        +{formatCurrency(item.monto)}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          {isPerStudent && (
                            <button
                              onClick={() => setTrackingIncome(item)}
                              title="Controlar pago individual por alumno"
                              className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-md transition-colors"
                            >
                              <Users className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            disabled={isAuditor}
                            onClick={() => openEditModal(item)}
                            title="Editar ingreso"
                            className={`p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors ${
                              isAuditor ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            disabled={isAuditor}
                            onClick={() => setDeletingIncome(item)}
                            title="Eliminar ingreso"
                            className={`p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors ${
                              isAuditor ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* MODAL: CONTROL DE PAGOS POR ALUMNO (RIFA / CUOTA EXTRAORDINARIA) */}
      {trackingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh]">
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between shrink-0">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-700 text-xs px-2 py-0.5 rounded font-bold uppercase tracking-wider">
                    {trackingIncome.concepto}
                  </span>
                  <h3 className="font-bold text-base">Control de Pago por Alumno</h3>
                </div>
                <p className="text-xs text-indigo-200 mt-1">
                  {trackingIncome.descripcion} · Cuota fija: <strong>{formatCurrency(trackingIncome.montoPorAlumno || 0)}</strong> por alumno
                </p>
              </div>
              <button
                onClick={() => setTrackingIncome(null)}
                className="text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Summary Bar */}
            {(() => {
              const exemptCount = trackingIncome.alumnosExentos?.length || 0;
              const paidCount = trackingIncome.alumnosPagados?.length || 0;
              const obligadosCount = Math.max(0, students.length - exemptCount);
              const pendingCount = Math.max(0, obligadosCount - paidCount);
              const fixedAmount = trackingIncome.montoPorAlumno || 0;
              const totalRecaudado = paidCount * fixedAmount;
              const totalPendiente = pendingCount * fixedAmount;

              return (
                <div className="bg-slate-50 p-4 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
                  <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pagados:</span>
                      <span className="font-bold text-emerald-700 text-sm font-mono">
                        {paidCount} / {obligadosCount} ({formatCurrency(totalRecaudado)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Pendientes:</span>
                      <span className="font-bold text-red-600 text-sm font-mono">
                        {pendingCount} alumnos ({formatCurrency(totalPendiente)})
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[11px]">Exentos de Cobro:</span>
                      <span className="font-bold text-purple-700 text-sm font-mono bg-purple-100/70 border border-purple-200 px-2 py-0.5 rounded-md inline-block">
                        {exemptCount} alumnos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                      <button
                        onClick={() => setTrackingFilter('all')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                          trackingFilter === 'all'
                            ? 'bg-slate-900 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Todos ({students.length})
                      </button>
                      <button
                        onClick={() => setTrackingFilter('paid')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                          trackingFilter === 'paid'
                            ? 'bg-emerald-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pagados ({paidCount})
                      </button>
                      <button
                        onClick={() => setTrackingFilter('pending')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                          trackingFilter === 'pending'
                            ? 'bg-red-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Pendientes ({pendingCount})
                      </button>
                      <button
                        onClick={() => setTrackingFilter('exempt')}
                        className={`px-2.5 py-1 text-xs font-semibold rounded cursor-pointer ${
                          trackingFilter === 'exempt'
                            ? 'bg-purple-600 text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        Exentos ({exemptCount})
                      </button>
                    </div>

                    {!isAuditor && (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMarkAllStudents(trackingIncome.id, true)}
                          title="Marcar todos los alumnos obligados como pagados"
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Marcar Todos
                        </button>
                        <button
                          onClick={() => handleMarkAllStudents(trackingIncome.id, false)}
                          title="Desmarcar todos"
                          className="px-2 py-1 text-[11px] font-semibold text-slate-700 bg-white border border-slate-300 rounded hover:bg-slate-100 cursor-pointer"
                        >
                          Desmarcar
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Checklist Students Table */}
            <div className="overflow-y-auto flex-1 p-4">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 font-semibold sticky top-0">
                    <th className="py-2.5 px-3">Alumno</th>
                    <th className="py-2.5 px-3">RUT</th>
                    <th className="py-2.5 px-3">Apoderado / Contacto</th>
                    <th className="py-2.5 px-3 text-center">Exento de Pago (Switch)</th>
                    <th className="py-2.5 px-3 text-center">Estado del Cobro</th>
                    <th className="py-2.5 px-3 text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {students
                    .filter((s) => {
                      const isExempt = trackingIncome.alumnosExentos?.includes(s.id);
                      const isPaid = trackingIncome.alumnosPagados?.includes(s.id);
                      if (trackingFilter === 'paid') return isPaid && !isExempt;
                      if (trackingFilter === 'pending') return !isPaid && !isExempt;
                      if (trackingFilter === 'exempt') return isExempt;
                      return true;
                    })
                    .map((student) => {
                      const isExempt = trackingIncome.alumnosExentos?.includes(student.id);
                      const isPaid = trackingIncome.alumnosPagados?.includes(student.id);

                      return (
                        <tr
                          key={student.id}
                          className={`transition-colors ${
                            isExempt ? 'bg-purple-50/40 hover:bg-purple-50/70' : 'hover:bg-slate-50'
                          }`}
                        >
                          <td className="py-2.5 px-3">
                            <span className="font-bold text-slate-900 block">
                              {student.nombres} {student.apellidos}
                            </span>
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-600">
                            {student.rut}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700">
                            <div>{student.nombreApoderado}</div>
                            <div className="text-[11px] text-slate-500">{student.telefonoApoderado}</div>
                          </td>

                          {/* Switch para dejar Exento de Pago */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                type="button"
                                disabled={isAuditor}
                                onClick={() => handleToggleStudentExempt(trackingIncome.id, student.id)}
                                title={
                                  isExempt
                                    ? 'Quitar exención: el alumno volverá a tener obligación de pago'
                                    : 'Dejar exento: el alumno no deberá pagar este concepto ni acumulará deuda'
                                }
                                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                                  isExempt ? 'bg-purple-600' : 'bg-slate-300 hover:bg-slate-400'
                                } ${isAuditor ? 'opacity-50 cursor-not-allowed' : ''}`}
                              >
                                <span
                                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                                    isExempt ? 'translate-x-4' : 'translate-x-0'
                                  }`}
                                />
                              </button>
                              <span
                                className={`text-[11px] font-bold ${
                                  isExempt ? 'text-purple-700' : 'text-slate-500'
                                }`}
                              >
                                {isExempt ? 'Exento' : 'No'}
                              </span>
                            </div>
                          </td>

                          {/* Estado del Cobro */}
                          <td className="py-2.5 px-3 text-center">
                            {isExempt ? (
                              <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-100/80 border border-purple-300 px-2 py-0.5 rounded text-[11px]">
                                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                                Exento ($0)
                              </span>
                            ) : isPaid ? (
                              <span className="inline-flex items-center gap-1 text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded text-[11px]">
                                <Check className="w-3.5 h-3.5" />
                                Pagado ({formatCurrency(trackingIncome.montoPorAlumno || 0)})
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 border border-red-200 px-2 py-0.5 rounded text-[11px]">
                                Pendiente ({formatCurrency(trackingIncome.montoPorAlumno || 0)})
                              </span>
                            )}
                          </td>

                          {/* Acciones */}
                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              {isExempt ? (
                                <span className="text-[11px] font-semibold text-purple-600 italic">
                                  Sin cobro requerido
                                </span>
                              ) : (
                                <>
                                  {/* Toggle Paid Button */}
                                  <button
                                    disabled={isAuditor}
                                    onClick={() => handleToggleStudentPaid(trackingIncome.id, student.id)}
                                    className={`px-2.5 py-1 text-xs font-bold rounded shadow-xs transition-colors cursor-pointer ${
                                      isPaid
                                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                    } ${isAuditor ? 'opacity-50 cursor-not-allowed' : ''}`}
                                  >
                                    {isPaid ? 'Marcar Pendiente' : 'Marcar Pagado'}
                                  </button>

                                  {/* WhatsApp Reminder Button */}
                                  {!isPaid && (
                                    <button
                                      onClick={() => sendWhatsAppReminder(student, trackingIncome)}
                                      title="Enviar recordatorio de cobro por WhatsApp"
                                      className="w-7 h-7 rounded bg-emerald-500 hover:bg-emerald-600 text-white flex items-center justify-center shadow-xs cursor-pointer"
                                    >
                                      <MessageCircle className="w-4 h-4 fill-white" />
                                    </button>
                                  )}
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end shrink-0">
              <button
                onClick={() => setTrackingIncome(null)}
                className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800"
              >
                Cerrar Control
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-amber-700 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {modalMode === 'create' ? 'Registrar Ingreso Extraordinario' : 'Editar Ingreso Extra'}
                </h3>
                <p className="text-xs text-amber-200">
                  Período Contable {year}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-amber-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveIncome} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Concepto *
                  </label>
                  <select
                    value={formConcepto}
                    onChange={(e) => handleConceptoChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 bg-white"
                  >
                    <option value="Rifa">Rifa (Monto por alumno)</option>
                    <option value="Cuota Extraordinaria">Cuota Extraordinaria (Por alumno)</option>
                    <option value="Bingo">Bingo</option>
                    <option value="Kermesse">Kermesse</option>
                    <option value="Venta de Comida / Platos">Venta de Comida / Platos</option>
                    <option value="Jeans Day">Jeans Day</option>
                    <option value="Donación Voluntaria">Donación Voluntaria</option>
                    <option value="Feria de las Pulgas">Feria de las Pulgas</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tipo de Control
                  </label>
                  <select
                    value={formTipoCobro}
                    onChange={(e) => setFormTipoCobro(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600 bg-white font-semibold"
                  >
                    <option value="fijo_por_alumno">Monto Fijo por Alumno (Control individual)</option>
                    <option value="general">Monto Global Libre (Sin control individual)</option>
                  </select>
                </div>
              </div>

              {/* Si es fijo por alumno, solicitar el monto unitario */}
              {formTipoCobro === 'fijo_por_alumno' ? (
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="block text-xs font-bold text-indigo-950">
                      Monto Fijo por Alumno ($ CLP) *
                    </label>
                    <span className="text-[11px] text-indigo-700">
                      Nómina: {students.length} alumnos
                    </span>
                  </div>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMontoPorAlumno}
                    onChange={(e) => setFormMontoPorAlumno(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej: 5000"
                    className="w-full px-3 py-2 text-xs border border-indigo-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                  <div className="text-[11px] text-indigo-800">
                    Total esperado si pagan todos:{' '}
                    <strong>{formatCurrency((Number(formMontoPorAlumno) || 0) * students.length)}</strong>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto Recaudado Total ($ CLP) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej: 85000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción Detallada *
                </label>
                <input
                  type="text"
                  required
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Venta de talonarios de rifa pro paseo de fin de año"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha del Ingreso *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Origen de los Fondos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formOrigenFondos}
                    onChange={(e) => setFormOrigenFondos(e.target.value)}
                    placeholder="Ej: Aporte de familias del curso"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones / Ganadores / Comentarios
                </label>
                <textarea
                  rows={2}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Información adicional sobre la actividad..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-600"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs"
                >
                  {modalMode === 'create' ? 'Guardar Ingreso' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingIncome && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">¿Eliminar ingreso extra?</h4>
              <p className="text-xs text-slate-600 mt-1">
                Se eliminará <strong>{deletingIncome.descripcion}</strong> por{' '}
                <strong>{formatCurrency(deletingIncome.monto)}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingIncome(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteIncome(deletingIncome.id)}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
              >
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
