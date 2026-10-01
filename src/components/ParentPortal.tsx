import React, { useState, useMemo } from 'react';
import {
  User,
  Search,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  Copy,
  Check,
  Calendar,
  LogOut,
  MessageCircle,
  Users,
  Sparkles,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import {
  Student,
  FeePayment,
  ExtraIncome,
  CourseConfig,
  MonthIndex,
  MONTH_NAMES,
} from '../types';
import {
  getStudentAnnualSummary,
  getMonthlyStatus,
  formatCurrency,
} from '../services/storage';

interface ParentPortalProps {
  students: Student[];
  payments: FeePayment[];
  extraIncomes: ExtraIncome[];
  year: number;
  config: CourseConfig;
  onExitPortal: () => void;
  initialStudentIds?: string[];
  initialEmail?: string;
}

export const ParentPortal: React.FC<ParentPortalProps> = ({
  students,
  payments,
  extraIncomes,
  year,
  config,
  onExitPortal,
  initialStudentIds,
  initialEmail,
}) => {
  const [rutInput, setRutInput] = useState('');
  const [emailInput, setEmailInput] = useState(initialEmail || '');
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedBankInfo, setCopiedBankInfo] = useState(false);

  // Associated students for this parent (can be 1 or multiple siblings)
  const [associatedStudentIds, setAssociatedStudentIds] = useState<string[]>(
    initialStudentIds && initialStudentIds.length > 0 ? initialStudentIds : []
  );

  // Currently active pupil selected in tab
  const [activeStudentId, setActiveStudentId] = useState<string>(
    initialStudentIds && initialStudentIds.length > 0 ? initialStudentIds[0] : ''
  );

  // Authenticate manually if arrived without initialStudentIds
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    const cleanRut = rutInput.trim().toLowerCase().replace(/[^0-9k]/g, '');
    const cleanEmail = emailInput.trim().toLowerCase();

    // Check if there is any student matching the RUT
    const matchedByRut = students.find(
      (s) => s.rut.toLowerCase().replace(/[^0-9k]/g, '') === cleanRut
    );

    // Find all students for this parent email (support for siblings)
    const matching = students.filter((s) => {
      const matchRut = cleanRut && s.rut.toLowerCase().replace(/[^0-9k]/g, '') === cleanRut;
      const matchEmail = cleanEmail && s.emailApoderado.toLowerCase().trim() === cleanEmail;
      return matchRut || matchEmail;
    });

    if (matching.length > 0) {
      const valid =
        matchedByRut && cleanEmail
          ? matchedByRut.emailApoderado.toLowerCase().trim() === cleanEmail
          : true;

      if (valid) {
        const ids = matching.map((s) => s.id);
        setAssociatedStudentIds(ids);
        setActiveStudentId(ids[0]);
        return;
      }
    }

    setErrorMessage(
      'No se encontró ningún alumno con el RUT y Correo de apoderado ingresados. Por favor verifica tus datos o contacta a la directiva.'
    );
  };

  const copyBankDetails = () => {
    const text = `DATOS DE TRANSFERENCIA - TESORERÍA ${config.nombreCurso}
Banco: ${config.datosBancarios.banco}
Tipo: ${config.datosBancarios.tipoCuenta}
N° Cuenta: ${config.datosBancarios.numeroCuenta}
Titular: ${config.datosBancarios.titularNombre}
RUT: ${config.datosBancarios.titularRut}
Email: ${config.datosBancarios.emailConfirmacion}`;

    navigator.clipboard.writeText(text);
    setCopiedBankInfo(true);
    setTimeout(() => setCopiedBankInfo(false), 2500);
  };

  // Associated student objects
  const myStudents = useMemo(() => {
    return students.filter((s) => associatedStudentIds.includes(s.id));
  }, [students, associatedStudentIds]);

  // Active student object
  const activeStudent = useMemo(() => {
    return myStudents.find((s) => s.id === activeStudentId) || myStudents[0];
  }, [myStudents, activeStudentId]);

  // Extra Incomes for this year
  const yearExtraIncomes = useMemo(() => {
    return extraIncomes.filter((i) => i.year === year && i.tipoCobro === 'fijo_por_alumno');
  }, [extraIncomes, year]);

  // If not authenticated, show login form
  if (myStudents.length === 0 || !activeStudent) {
    return (
      <div className="max-w-md mx-auto py-8 px-4">
        <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-lg space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-700 rounded-2xl mx-auto flex items-center justify-center shadow-xs">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Portal del Apoderado
            </h2>
            <p className="text-xs text-slate-500">
              Consulta las cuotas de tu alumno(a) de {config.nombreCurso} para el año {year}.
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUT del Alumno
              </label>
              <input
                type="text"
                required
                value={rutInput}
                onChange={(e) => setRutInput(e.target.value)}
                placeholder="Ej: 22.987.654-3"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo Electrónico del Apoderado
              </label>
              <input
                type="email"
                required
                value={emailInput}
                onChange={(e) => setEmailInput(e.target.value)}
                placeholder="ejemplo@correo.com"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              Consultar Estado de Cuotas
            </button>

            <button
              type="button"
              onClick={onExitPortal}
              className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5 text-slate-500" />
              <span>Volver a Pantalla de Login</span>
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Active student financial summary
  const summary = getStudentAnnualSummary(
    activeStudent,
    year,
    payments,
    config.cuotaMensualPorDefecto
  );

  // Rifas and cuotas extraordinarias for this active student
  const studentExtraActivities = yearExtraIncomes.map((inc) => {
    const isExempt = inc.alumnosExentos?.includes(activeStudent.id) || false;
    const isPaid = inc.alumnosPagados?.includes(activeStudent.id) || false;
    return {
      income: inc,
      isExempt,
      isPaid,
      monto: isExempt ? 0 : (inc.montoPorAlumno || 0),
      rawMonto: inc.montoPorAlumno || 0,
    };
  });

  const extraDebt = studentExtraActivities
    .filter((a) => !a.isPaid && !a.isExempt)
    .reduce((sum, a) => sum + a.rawMonto, 0);

  const totalPupilDebt = summary.totalDebt + extraDebt;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Banner with Sibling Selector */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold text-emerald-700 uppercase tracking-wider block">
              Portal del Apoderado · {config.nombreCurso}
            </span>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
              {activeStudent.nombreApoderado || 'Apoderado'}
            </h2>
            <p className="text-xs text-slate-500">
              Correo: <span className="font-mono">{activeStudent.emailApoderado}</span> · Período Contable {year}
            </p>
          </div>

          <button
            onClick={onExitPortal}
            title="Cerrar sesión y volver a la pantalla de login"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl border border-red-200 transition-colors shadow-xs cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión (Volver al Login)</span>
          </button>
        </div>

        {/* SIBLING TABS (If there are 2 or more siblings) */}
        {myStudents.length > 1 && (
          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center gap-2 mb-2 text-xs font-bold text-slate-700">
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Pupilos a cargo ({myStudents.length} Hermanos):</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {myStudents.map((st, idx) => {
                const isSelected = st.id === activeStudent.id;
                const stSummary = getStudentAnnualSummary(
                  st,
                  year,
                  payments,
                  config.cuotaMensualPorDefecto
                );

                return (
                  <button
                    key={st.id}
                    onClick={() => setActiveStudentId(st.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    <span>
                      Pupilo {idx + 1}: {st.nombres} {st.apellidos}
                    </span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        stSummary.totalDebt > 0
                          ? isSelected
                            ? 'bg-red-500 text-white'
                            : 'bg-red-100 text-red-700'
                          : isSelected
                          ? 'bg-emerald-500 text-white'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {stSummary.totalDebt > 0
                        ? `Debe ${formatCurrency(stSummary.totalDebt)}`
                        : 'Al día'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Pupil Overview Banner */}
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
            Ficha del Pupilo Seleccionado
          </span>
          <div className="flex items-center gap-2 mt-0.5">
            <h3 className="text-xl font-black text-slate-900">
              {activeStudent.nombres} {activeStudent.apellidos}
            </h3>
            <span className="text-xs font-mono bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700">
              {activeStudent.rut}
            </span>
            {activeStudent.noPagaCuota && (
              <span className="text-[10px] bg-purple-600 text-white font-bold px-2 py-0.5 rounded-full">
                Exento por Beca
              </span>
            )}
          </div>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-500 block">Total Adeudado (Cuotas + Rifas)</span>
          <span
            className={`text-xl font-black font-mono ${
              totalPupilDebt > 0 ? 'text-red-600' : 'text-emerald-600'
            }`}
          >
            {formatCurrency(totalPupilDebt)}
          </span>
        </div>
      </div>

      {/* Financial Status Alert */}
      {activeStudent.noPagaCuota ? (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-purple-600 shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-purple-900">
              Beneficio de Beca / Cuota Exenta
            </h4>
            <p className="text-xs text-purple-700 mt-0.5">
              Este alumno se encuentra exento de cuotas mensuales durante el período contable {year}.
            </p>
          </div>
        </div>
      ) : totalPupilDebt === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
          <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-emerald-900">
              ¡Felicitaciones! Se encuentra completamente al día.
            </h4>
            <p className="text-xs text-emerald-700 mt-0.5">
              No registra cuotas adeudadas ni actividades pendientes para el año {year}. Muchas gracias por su puntualidad.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-red-50 border border-red-200 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-red-900">
                Tiene compromisos pendientes de pago
              </h4>
              <p className="text-xs text-red-700 mt-0.5">
                Total adeudado:{' '}
                <strong className="text-sm font-mono">{formatCurrency(totalPupilDebt)}</strong>{' '}
                {summary.pendingMonthsCount > 0 && `(${summary.pendingMonthsCount} cuota(s) mensual(es))`}
                {extraDebt > 0 && ` y ${formatCurrency(extraDebt)} en rifas/actividades`}.
              </p>
            </div>
          </div>

          <button
            onClick={copyBankDetails}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
          >
            {copiedBankInfo ? <Check className="w-4 h-4" /> : <CreditCard className="w-4 h-4" />}
            {copiedBankInfo ? '¡Datos Copiados!' : 'Copiar Datos para Transferir'}
          </button>
        </div>
      )}

      {/* 1. SECCIÓN CUOTAS MENSUALES DEL AÑO */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">
            Cuotas Mensuales del Año {year}
          </h3>
          <span className="text-xs text-slate-500 font-mono">
            Cuota base: {formatCurrency(config.cuotaMensualPorDefecto)}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
          {MONTH_NAMES.map((name, idx) => {
            const m = idx as MonthIndex;
            const status = getMonthlyStatus(
              activeStudent,
              m,
              payments,
              year,
              config.cuotaMensualPorDefecto
            );

            const isPaid = status.status === 'paid';
            const isExempt = status.status === 'exempt';
            const isNotApp = status.status === 'not_applicable';
            const isPartial = status.status === 'partial';

            return (
              <div
                key={name}
                className={`p-3 rounded-xl border text-xs space-y-1.5 transition-all ${
                  isPaid
                    ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                    : isExempt
                    ? 'bg-purple-50/70 border-purple-200 text-purple-950'
                    : isNotApp
                    ? 'bg-slate-50 border-slate-200 text-slate-400'
                    : isPartial
                    ? 'bg-sky-50 border-sky-200 text-sky-950'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span>{name}</span>
                  {isPaid ? (
                    <span className="text-emerald-700 font-bold">✓ Pagado</span>
                  ) : isNotApp ? (
                    <span className="text-slate-400 font-normal">No aplica</span>
                  ) : isExempt ? (
                    <span className="text-purple-600 font-semibold">Exento</span>
                  ) : isPartial ? (
                    <span className="text-sky-700 font-bold">Abonado</span>
                  ) : (
                    <span className="text-red-600 font-bold">Pendiente</span>
                  )}
                </div>

                <div className="text-[11px] font-mono text-slate-700">
                  {isPaid ? (
                    <span>Monto: {formatCurrency(status.paidAmount)}</span>
                  ) : isPartial ? (
                    <div className="space-y-0.5">
                      <div>Abonado: {formatCurrency(status.paidAmount)}</div>
                      <div className="text-amber-800 font-bold">
                        Resta: {formatCurrency(status.expectedAmount - status.paidAmount)}
                      </div>
                    </div>
                  ) : isNotApp ? (
                    <span className="text-slate-400">Ingreso posterior</span>
                  ) : (
                    <span>Valor: {formatCurrency(status.expectedAmount)}</span>
                  )}
                </div>

                {status.payment?.fechaPago && (
                  <div className="text-[10px] text-slate-500">
                    Fecha: {status.payment.fechaPago}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. SECCIÓN RIFAS Y CUOTAS EXTRAORDINARIAS (Control por Alumno) */}
      {studentExtraActivities.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              <h3 className="font-bold text-sm text-slate-900">
                Rifas y Cuotas Extraordinarias {year}
              </h3>
            </div>
            <span className="text-xs text-slate-500">
              Actividades fijas asignadas al alumno
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {studentExtraActivities.map((act) => (
              <div
                key={act.income.id}
                className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">
                      {act.income.concepto}
                    </span>
                    <span className="text-slate-500">· {act.income.descripcion}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Fecha: {act.income.fecha} · Cuota fija asignada: {formatCurrency(act.monto)}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-sm">
                    {formatCurrency(act.isExempt ? 0 : act.rawMonto)}
                  </span>
                  {act.isExempt ? (
                    <span className="inline-flex items-center gap-1 text-purple-700 font-bold bg-purple-100 border border-purple-200 px-2.5 py-1 rounded-lg">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      Exento de Pago
                    </span>
                  ) : act.isPaid ? (
                    <span className="inline-flex items-center gap-1 text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      Pagado
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-red-700 font-bold bg-red-50 border border-red-200 px-2.5 py-1 rounded-lg">
                      Pendiente
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. DATOS BANCARIOS OFICIALES PARA TRANSFERENCIA */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-sm text-slate-900">
              Datos Bancarios Oficiales de la Tesorería
            </h3>
          </div>
          <button
            onClick={copyBankDetails}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
          >
            {copiedBankInfo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedBankInfo ? '¡Copiado!' : 'Copiar todo'}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Banco</span>
            <span className="font-bold text-slate-900">{config.datosBancarios.banco}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Tipo de Cuenta</span>
            <span className="font-bold text-slate-900">{config.datosBancarios.tipoCuenta}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Número de Cuenta</span>
            <span className="font-bold font-mono text-slate-900">
              {config.datosBancarios.numeroCuenta}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Titular de la Cuenta</span>
            <span className="font-bold text-slate-900">{config.datosBancarios.titularNombre}</span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">RUT del Titular</span>
            <span className="font-bold font-mono text-slate-900">
              {config.datosBancarios.titularRut}
            </span>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-slate-500 block">Email para Comprobante</span>
            <span className="font-bold text-slate-900 truncate block">
              {config.datosBancarios.emailConfirmacion}
            </span>
          </div>
        </div>

        <div className="p-3 bg-amber-50 rounded-lg border border-amber-200 text-xs text-amber-900">
          💡 <strong>Importante:</strong> Al realizar la transferencia electrónica, por favor incluye en el comentario o asunto el nombre del alumno ({activeStudent.nombres} {activeStudent.apellidos}) y envía el comprobante a {config.datosBancarios.emailConfirmacion}.
        </div>
      </div>
    </div>
  );
};
