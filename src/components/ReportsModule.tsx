import React, { useMemo, useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertTriangle,
  PieChart as PieChartIcon,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  MessageCircle,
  Sparkles,
  ChevronDown,
  ChevronUp,
  User,
  Phone,
  CheckCircle,
  Clock,
  Send,
} from 'lucide-react';
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
} from '../services/storage';
import { exportCourseFinancialReportToExcel } from '../services/excel';
import { generateCourseFinancialPdfReport } from '../services/pdfReport';
import { openWhatsAppChat, openExtraIncomeWhatsAppChat } from '../services/whatsapp';

interface ReportsModuleProps {
  year: number;
  config: CourseConfig;
  students: Student[];
  payments: FeePayment[];
  expenses: Expense[];
  extraIncomes: ExtraIncome[];
}

export const ReportsModule: React.FC<ReportsModuleProps> = ({
  year,
  config,
  students,
  payments,
  expenses,
  extraIncomes,
}) => {
  const [activeChartTab, setActiveChartTab] = useState<
    'ingresos_vs_gastos' | 'balance_mensual' | 'control_rifas_extras' | 'estado_anual' | 'cumplimiento'
  >('ingresos_vs_gastos');

  const [expandedActivityId, setExpandedActivityId] = useState<string | null>(null);

  // Filter entities by year
  const yearPayments = useMemo(
    () => payments.filter((p) => p.year === year),
    [payments, year]
  );
  const yearExpenses = useMemo(
    () => expenses.filter((e) => e.year === year),
    [expenses, year]
  );
  const yearExtraIncomes = useMemo(
    () => extraIncomes.filter((i) => i.year === year),
    [extraIncomes, year]
  );

  // Totals
  const totalCuotas = useMemo(
    () => yearPayments.reduce((acc, p) => acc + p.monto, 0),
    [yearPayments]
  );
  const totalExtra = useMemo(
    () => yearExtraIncomes.reduce((acc, i) => acc + i.monto, 0),
    [yearExtraIncomes]
  );
  const totalIngresos = totalCuotas + totalExtra;
  const totalGastos = useMemo(
    () => yearExpenses.reduce((acc, e) => acc + e.monto, 0),
    [yearExpenses]
  );
  const saldoEnCaja = totalIngresos - totalGastos;

  // Expected fees total
  const statsAlumnos = useMemo(() => {
    let alDia = 0;
    let conDeuda = 0;
    let exentos = 0;
    let inactivos = 0;
    let totalEsperadoCuotas = 0;
    let deudaTotal = 0;

    students.forEach((s) => {
      if (s.activo === false) {
        inactivos++;
        return;
      }

      const summary = getStudentAnnualSummary(
        s,
        year,
        payments,
        config.cuotaMensualPorDefecto
      );
      if (s.noPagaCuota) {
        exentos++;
      } else {
        totalEsperadoCuotas += summary.totalExpected;
        deudaTotal += summary.totalDebt;
        if (summary.isUpToDate && summary.applicableMonthsCount > 0) {
          alDia++;
        } else {
          conDeuda++;
        }
      }
    });

    const porcentajeCumplimiento =
      totalEsperadoCuotas > 0
        ? Math.round((totalCuotas / totalEsperadoCuotas) * 100)
        : 100;

    return {
      alDia,
      conDeuda,
      exentos,
      inactivos,
      totalEsperadoCuotas,
      deudaTotal,
      porcentajeCumplimiento,
    };
  }, [students, year, payments, config.cuotaMensualPorDefecto, totalCuotas]);

  // Fixed extra incomes summary (Rifas, cuotas extraordinarias con control fijo por alumno)
  const fixedExtraIncomesData = useMemo(() => {
    const fixedItems = yearExtraIncomes.filter(
      (inc) =>
        inc.tipoCobro === 'fijo_por_alumno' ||
        inc.concepto.toLowerCase().includes('rifa') ||
        inc.concepto.toLowerCase().includes('cuota extraordinaria')
    );

    const activities = fixedItems.map((inc) => {
      const fixedAmount =
        inc.montoPorAlumno ||
        (students.length > 0
          ? Math.round(inc.monto / Math.max(1, inc.alumnosPagados?.length || 1))
          : 5000);
      const paidStudentIds = inc.alumnosPagados || [];
      const exemptStudentIds = inc.alumnosExentos || [];
      const relevantStudents = students.filter(
        (s) => s.activo !== false || paidStudentIds.includes(s.id)
      );
      const totalStudents = relevantStudents.length;
      const exemptCount = relevantStudents.filter((s) => exemptStudentIds.includes(s.id)).length;
      const obligadosCount = Math.max(0, totalStudents - exemptCount);
      const paidCount = relevantStudents.filter(
        (s) => paidStudentIds.includes(s.id) && !exemptStudentIds.includes(s.id)
      ).length;
      const pendingCount = Math.max(0, obligadosCount - paidCount);

      const totalEsperado = obligadosCount * fixedAmount;
      const totalRecaudado = paidCount * fixedAmount;
      const totalPendiente = pendingCount * fixedAmount;
      const porcentaje =
        totalEsperado > 0 ? Math.round((totalRecaudado / totalEsperado) * 100) : 0;

      // Student level breakdown with payment status
      const studentsBreakdown = relevantStudents.map((s) => {
        const isExempt = exemptStudentIds.includes(s.id);
        const isPaid = paidStudentIds.includes(s.id) && !isExempt;
        return {
          student: s,
          isPaid,
          isExempt,
          monto: isExempt ? 0 : fixedAmount,
        };
      });

      return {
        id: inc.id,
        concepto: inc.concepto,
        descripcion: inc.descripcion,
        fecha: inc.fecha,
        fixedAmount,
        totalStudents,
        exemptCount,
        obligadosCount,
        paidCount,
        pendingCount,
        totalEsperado,
        totalRecaudado,
        totalPendiente,
        porcentaje,
        studentsBreakdown,
      };
    });

    const totalEsperadoGlobal = activities.reduce((sum, a) => sum + a.totalEsperado, 0);
    const totalRecaudadoGlobal = activities.reduce((sum, a) => sum + a.totalRecaudado, 0);
    const totalPendienteGlobal = activities.reduce((sum, a) => sum + a.totalPendiente, 0);
    const porcentajeGlobal =
      totalEsperadoGlobal > 0
        ? Math.round((totalRecaudadoGlobal / totalEsperadoGlobal) * 100)
        : 0;

    return {
      activities,
      totalEsperadoGlobal,
      totalRecaudadoGlobal,
      totalPendienteGlobal,
      porcentajeGlobal,
    };
  }, [yearExtraIncomes, students]);

  // Monthly breakdown calculation
  const monthlyData = useMemo(() => {
    let runningBalance = 0;

    return MONTH_NAMES.map((name, idx) => {
      const monthIdx = idx as MonthIndex;

      // Cuotas pagadas en este mes contable
      const cuotasDelMes = yearPayments
        .filter((p) => p.month === monthIdx)
        .reduce((sum, p) => sum + p.monto, 0);

      // Ingresos extras en este mes (basado en fecha YYYY-MM-DD)
      const extrasDelMes = yearExtraIncomes
        .filter((inc) => {
          if (!inc.fecha) return false;
          const monthOfDate = new Date(inc.fecha).getMonth();
          return monthOfDate === monthIdx;
        })
        .reduce((sum, inc) => sum + inc.monto, 0);

      const totalIngresosMes = cuotasDelMes + extrasDelMes;

      // Gastos en este mes
      const gastosDelMes = yearExpenses
        .filter((exp) => {
          if (!exp.fecha) return false;
          const monthOfDate = new Date(exp.fecha).getMonth();
          return monthOfDate === monthIdx;
        })
        .reduce((sum, exp) => sum + exp.monto, 0);

      const resultadoNetoMes = totalIngresosMes - gastosDelMes;
      runningBalance += resultadoNetoMes;

      // Conteo de cuotas pagadas vs pendientes este mes
      let cuotasPagadasCount = 0;
      let cuotasPendientesCount = 0;

      students.forEach((s) => {
        const st = getMonthlyStatus(
          s,
          monthIdx,
          payments,
          year,
          config.cuotaMensualPorDefecto
        );
        if (st.status === 'paid') cuotasPagadasCount++;
        else if (st.status === 'pending' || st.status === 'partial')
          cuotasPendientesCount++;
      });

      return {
        monthIdx,
        monthName: name,
        cuotas: cuotasDelMes,
        extras: extrasDelMes,
        totalIngresos: totalIngresosMes,
        gastos: gastosDelMes,
        resultadoNeto: resultadoNetoMes,
        saldoAcumulado: runningBalance,
        cuotasPagadasCount,
        cuotasPendientesCount,
      };
    });
  }, [yearPayments, yearExtraIncomes, yearExpenses, students, year, config.cuotaMensualPorDefecto]);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleExport = () => {
    exportCourseFinancialReportToExcel(
      year,
      config,
      students,
      payments,
      expenses,
      extraIncomes
    );
  };

  const handleExportPdf = async () => {
    try {
      setIsGeneratingPdf(true);
      await generateCourseFinancialPdfReport({
        year,
        config,
        students,
        payments,
        expenses,
        extraIncomes,
      });
    } catch (err) {
      console.error('Error generando reporte PDF:', err);
      alert('Hubo un inconveniente al generar el reporte en PDF. Por favor, reintenta.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Max value helper for charts
  const maxMonthValue = Math.max(
    ...monthlyData.map((d) => Math.max(d.totalIngresos, d.gastos, 10000))
  );

  return (
    <div className="space-y-6">
      {/* Header and Excel / PDF Buttons */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Reportes y Balances Anuales ({year})
          </h2>
          <p className="text-xs text-slate-500">
            Análisis financiero integral: cuotas, rifas con monto fijo por alumno, flujo mensual y estado de caja.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportPdf}
            disabled={isGeneratingPdf}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Emitir informe completo consolidado en formato PDF descargable"
          >
            <FileText className="w-4 h-4 text-red-100" />
            <span>{isGeneratingPdf ? 'Generando PDF...' : 'Emitir Reporte PDF'}</span>
          </button>

          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            title="Exportar informe con matrices a Microsoft Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Exportar a Excel (.xlsx)
          </button>
        </div>
      </div>

      {/* 1. EXECUTIVE FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Ingresos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Ingresos</span>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {formatCurrency(totalIngresos)}
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Cuotas: {formatCurrency(totalCuotas)}</span>
            <span>Extras: {formatCurrency(totalExtra)}</span>
          </div>
        </div>

        {/* Total Gastos */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Total Gastos (Egresos)</span>
            <span className="p-1.5 bg-red-50 text-red-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-slate-900 tabular-nums">
            {formatCurrency(totalGastos)}
          </p>
          <p className="mt-2 text-[11px] text-slate-500">
            {yearExpenses.length} rendiciones de boletas y compras
          </p>
        </div>

        {/* Saldo en Caja */}
        <div
          className={`rounded-xl p-5 border shadow-xs ${
            saldoEnCaja >= 0
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-950'
              : 'bg-red-500/10 border-red-500/30 text-red-950'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">
              Saldo Disponible en Caja
            </span>
            <span className="p-1.5 bg-white/60 rounded-lg shadow-xs">
              <DollarSign className="w-4 h-4 text-emerald-700" />
            </span>
          </div>
          <p className="text-2xl font-black tabular-nums">
            {formatCurrency(saldoEnCaja)}
          </p>
          <p className="mt-2 text-[11px] opacity-80">
            {saldoEnCaja >= 0 ? 'Superávit acumulado' : 'Déficit presupuestario'}
          </p>
        </div>

        {/* Cumplimiento Cuotas */}
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-semibold">Cumplimiento Cuotas</span>
            <span className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-indigo-700 tabular-nums">
            {statsAlumnos.porcentajeCumplimiento}%
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>Al día: {statsAlumnos.alDia}</span>
            <span className="text-red-600 font-semibold">
              Deuda: {formatCurrency(statsAlumnos.deudaTotal)}
            </span>
          </div>
        </div>
      </div>

      {/* 2. INTERACTIVE CHARTS SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Chart Subnav Tabs */}
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-slate-700" />
            <h3 className="font-bold text-sm text-slate-900">Gráficos de Análisis</h3>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveChartTab('ingresos_vs_gastos')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeChartTab === 'ingresos_vs_gastos'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ingresos vs Gastos x Mes
            </button>
            <button
              onClick={() => setActiveChartTab('balance_mensual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeChartTab === 'balance_mensual'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Balance Mensual
            </button>
            <button
              onClick={() => setActiveChartTab('control_rifas_extras')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                activeChartTab === 'control_rifas_extras'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-purple-700 bg-purple-50 hover:bg-purple-100'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Rifas y Cobros Fijos x Alumno</span>
            </button>
            <button
              onClick={() => setActiveChartTab('estado_anual')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeChartTab === 'estado_anual'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Estado Anual de Cuota
            </button>
            <button
              onClick={() => setActiveChartTab('cumplimiento')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeChartTab === 'cumplimiento'
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Cumplimiento de Cuotas
            </button>
          </div>
        </div>

        {/* Chart Viewport */}
        <div className="p-6">
          {/* TAB 1: INGRESOS VS GASTOS X MES */}
          {activeChartTab === 'ingresos_vs_gastos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Comparación mensual de recaudación vs egresos</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded"></span>
                    Ingresos
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-red-500 rounded"></span>
                    Gastos
                  </span>
                </div>
              </div>

              {/* Bar visualization */}
              <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
                {monthlyData.map((d) => {
                  const incomeHeight =
                    maxMonthValue > 0
                      ? Math.round((d.totalIngresos / maxMonthValue) * 100)
                      : 0;
                  const expenseHeight =
                    maxMonthValue > 0
                      ? Math.round((d.gastos / maxMonthValue) * 100)
                      : 0;

                  return (
                    <div
                      key={d.monthIdx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      {/* Tooltip on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] p-1.5 rounded pointer-events-none whitespace-nowrap shadow-md">
                        <div>Ingresos: {formatCurrency(d.totalIngresos)}</div>
                        <div>Gastos: {formatCurrency(d.gastos)}</div>
                      </div>

                      <div className="w-full flex items-end justify-center gap-1 h-full">
                        {/* Income Bar */}
                        <div
                          style={{ height: `${Math.max(incomeHeight, 2)}%` }}
                          className="w-1/2 bg-emerald-500 rounded-t transition-all hover:bg-emerald-600"
                        />
                        {/* Expense Bar */}
                        <div
                          style={{ height: `${Math.max(expenseHeight, 2)}%` }}
                          className="w-1/2 bg-red-400 rounded-t transition-all hover:bg-red-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 truncate w-full text-center">
                        {d.monthName.substring(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: BALANCE MENSUAL (Evolución de Caja) */}
          {activeChartTab === 'balance_mensual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Evolución del saldo disponible acumulado mes a mes</span>
                <span className="font-semibold text-slate-700">
                  Saldo Final: {formatCurrency(saldoEnCaja)}
                </span>
              </div>

              {/* Area / step chart */}
              <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
                {(() => {
                  const maxBalance = Math.max(
                    ...monthlyData.map((d) => Math.abs(d.saldoAcumulado)),
                    50000
                  );

                  return monthlyData.map((d) => {
                    const isPositive = d.saldoAcumulado >= 0;
                    const height = Math.min(
                      100,
                      Math.max(
                        8,
                        Math.round((Math.abs(d.saldoAcumulado) / maxBalance) * 100)
                      )
                    );

                    return (
                      <div
                        key={d.monthIdx}
                        className="flex-1 flex flex-col items-center h-full justify-end group relative"
                      >
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-10 z-20 bg-slate-900 text-white text-[10px] p-1.5 rounded pointer-events-none whitespace-nowrap shadow-md">
                          Saldo: {formatCurrency(d.saldoAcumulado)}
                        </div>

                        <div
                          style={{ height: `${height}%` }}
                          className={`w-full rounded-t transition-all ${
                            isPositive
                              ? 'bg-sky-500 group-hover:bg-sky-600'
                              : 'bg-red-500 group-hover:bg-red-600'
                          }`}
                        />
                        <span className="text-[10px] text-slate-500 mt-2 truncate w-full text-center">
                          {d.monthName.substring(0, 3)}
                        </span>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}

          {/* TAB 3: CONTROL RIFAS Y COBROS FIJOS X ALUMNO (NUEVO REQUERIMIENTO) */}
          {activeChartTab === 'control_rifas_extras' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="text-sm font-bold text-purple-950 flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    Gráfico y Control de Rifas y Cuotas Extraordinarias Fijas
                  </h4>
                  <p className="text-xs text-slate-500">
                    Seguimiento visual del cumplimiento de recaudación por alumno para actividades con monto fijo.
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold">
                  <span className="flex items-center gap-1.5 text-emerald-700">
                    <span className="w-3 h-3 bg-emerald-500 rounded"></span>
                    Recaudado
                  </span>
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <span className="w-3 h-3 bg-amber-400 rounded"></span>
                    Pendiente
                  </span>
                </div>
              </div>

              {/* KPI Cards for Fixed Extra Incomes */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-purple-50/60 border border-purple-200/80 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-purple-800">
                    Actividades Fijas
                  </span>
                  <p className="text-2xl font-black text-purple-950 mt-0.5">
                    {fixedExtraIncomesData.activities.length}
                  </p>
                  <span className="text-[10px] text-purple-600">
                    Rifas y cuotas extraordinarias
                  </span>
                </div>

                <div className="bg-emerald-50/60 border border-emerald-200/80 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-emerald-800">
                    Total Recaudado
                  </span>
                  <p className="text-2xl font-black text-emerald-900 mt-0.5 font-mono">
                    {formatCurrency(fixedExtraIncomesData.totalRecaudadoGlobal)}
                  </p>
                  <span className="text-[10px] text-emerald-600">
                    Pagos confirmados
                  </span>
                </div>

                <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-amber-800">
                    Total Pendiente
                  </span>
                  <p className="text-2xl font-black text-amber-900 mt-0.5 font-mono">
                    {formatCurrency(fixedExtraIncomesData.totalPendienteGlobal)}
                  </p>
                  <span className="text-[10px] text-amber-600">
                    Por cobrar a apoderados
                  </span>
                </div>

                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-slate-700">
                    Cumplimiento Global
                  </span>
                  <p className="text-2xl font-black text-indigo-700 mt-0.5">
                    {fixedExtraIncomesData.porcentajeGlobal}%
                  </p>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                    <div
                      style={{ width: `${fixedExtraIncomesData.porcentajeGlobal}%` }}
                      className="bg-indigo-600 h-full rounded-full"
                    />
                  </div>
                </div>
              </div>

              {/* Bar Charts for each Activity */}
              {fixedExtraIncomesData.activities.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 text-slate-500">
                  <Sparkles className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                  <p className="text-sm font-semibold text-slate-700">
                    No hay ingresos extras con control fijo por alumno en el período {year}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Crea una Rifa o Cuota Extraordinaria en el módulo "Ingresos Extra" para ver aquí sus gráficos y reportes.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Comparativa de Cumplimiento por Actividad
                  </h5>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {fixedExtraIncomesData.activities.map((act) => {
                      return (
                        <div
                          key={act.id}
                          className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-slate-900">
                                  {act.concepto}
                                </span>
                                <span className="text-[10px] font-semibold bg-purple-100 text-purple-800 px-2 py-0.5 rounded border border-purple-200">
                                  {formatCurrency(act.fixedAmount)} / alumno
                                </span>
                              </div>
                              <p className="text-xs text-slate-500 mt-0.5">
                                {act.descripcion}
                              </p>
                            </div>

                            <span className="text-sm font-black text-indigo-700 bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-xs">
                              {act.porcentaje}%
                            </span>
                          </div>

                          {/* Dual Progress Bar */}
                          <div>
                            <div className="flex justify-between text-xs text-slate-600 mb-1">
                              <span className="font-semibold text-emerald-800">
                                Recaudado: {formatCurrency(act.totalRecaudado)} ({act.paidCount} alumnos)
                              </span>
                              <span className="font-semibold text-amber-800">
                                Resta: {formatCurrency(act.totalPendiente)} ({act.pendingCount} alumnos)
                              </span>
                            </div>

                            <div className="h-3 w-full bg-slate-200 rounded-full overflow-hidden flex shadow-inner">
                              <div
                                style={{ width: `${act.porcentaje}%` }}
                                className="bg-emerald-500 h-full transition-all"
                                title={`Recaudado: ${act.porcentaje}%`}
                              />
                              <div
                                style={{ width: `${100 - act.porcentaje}%` }}
                                className="bg-amber-400 h-full transition-all"
                                title={`Pendiente: ${100 - act.porcentaje}%`}
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
                            <span>Total proyectado: {formatCurrency(act.totalEsperado)}</span>
                            <button
                              onClick={() => {
                                setExpandedActivityId(
                                  expandedActivityId === act.id ? null : act.id
                                );
                              }}
                              className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer flex items-center gap-1"
                            >
                              <span>{expandedActivityId === act.id ? 'Ocultar alumnos' : 'Ver nómina de alumnos'}</span>
                              {expandedActivityId === act.id ? (
                                <ChevronUp className="w-3.5 h-3.5" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>

                          {/* Inline roster if expanded from chart */}
                          {expandedActivityId === act.id && (
                            <div className="mt-3 pt-3 border-t border-slate-200 space-y-2">
                              <span className="text-[11px] font-bold text-slate-700 block">
                                Estado nominal por alumno:
                              </span>
                              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                                {act.studentsBreakdown.map(({ student, isPaid, isExempt, monto }) => (
                                  <div
                                    key={student.id}
                                    className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                                      isExempt
                                        ? 'bg-purple-50/60 border-purple-200'
                                        : isPaid
                                        ? 'bg-emerald-50/60 border-emerald-200'
                                        : 'bg-amber-50/60 border-amber-200'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <User className="w-3.5 h-3.5 text-slate-500" />
                                      <div>
                                        <p className="font-bold text-slate-800 leading-tight">
                                          {student.nombres} {student.apellidos}
                                        </p>
                                        <p className="text-[10px] text-slate-500 font-mono">
                                          {student.rut}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      {isExempt ? (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded">
                                          <CheckCircle className="w-3 h-3 text-purple-600" />
                                          Exento de Cobro
                                        </span>
                                      ) : isPaid ? (
                                        <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                                          <CheckCircle className="w-3 h-3 text-emerald-600" />
                                          Pagado
                                        </span>
                                      ) : (
                                        <div className="flex items-center gap-1.5">
                                          <span className="flex items-center gap-1 text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                                            <Clock className="w-3 h-3 text-amber-700" />
                                            Debe {formatCurrency(monto)}
                                          </span>
                                          <button
                                            onClick={() =>
                                              openExtraIncomeWhatsAppChat(
                                                student,
                                                act.concepto,
                                                monto,
                                                act.descripcion,
                                                config
                                              )
                                            }
                                            title="Enviar recordatorio WhatsApp al apoderado"
                                            className="p-1 text-emerald-700 hover:text-emerald-900 bg-white hover:bg-emerald-50 rounded border border-emerald-300 transition-colors cursor-pointer"
                                          >
                                            <MessageCircle className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ESTADO ANUAL DE CUOTA */}
          {activeChartTab === 'estado_anual' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Distribución mensual de cuotas pagadas vs cuotas pendientes</span>
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-emerald-500 rounded"></span>
                    Al Día
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-3 h-3 bg-amber-300 rounded"></span>
                    Pendientes
                  </span>
                </div>
              </div>

              <div className="h-64 flex items-end gap-2 pt-6 pb-2 border-b border-slate-200">
                {monthlyData.map((d) => {
                  const totalCount = d.cuotasPagadasCount + d.cuotasPendientesCount;
                  const paidPct =
                    totalCount > 0
                      ? Math.round((d.cuotasPagadasCount / totalCount) * 100)
                      : 0;

                  return (
                    <div
                      key={d.monthIdx}
                      className="flex-1 flex flex-col items-center h-full justify-end group relative"
                    >
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 text-white text-[10px] p-1.5 rounded pointer-events-none whitespace-nowrap shadow-md">
                        <div>Pagadas: {d.cuotasPagadasCount}</div>
                        <div>Pendientes: {d.cuotasPendientesCount}</div>
                      </div>

                      <div className="w-full flex flex-col justify-end h-full">
                        {/* Stacked bar */}
                        <div
                          style={{ height: `${100 - paidPct}%` }}
                          className="w-full bg-amber-300 rounded-t"
                        />
                        <div
                          style={{ height: `${paidPct}%` }}
                          className="w-full bg-emerald-500"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 mt-2 truncate w-full text-center">
                        {d.monthName.substring(0, 3)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 5: CUMPLIMIENTO GLOBAL DE CUOTAS */}
          {activeChartTab === 'cumplimiento' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
              <div className="p-6 bg-slate-50 rounded-xl border border-slate-200 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-500">
                  Tasa de Cumplimiento Anual
                </p>
                <p className="text-5xl font-black text-indigo-600 tabular-nums">
                  {statsAlumnos.porcentajeCumplimiento}%
                </p>
                <p className="text-xs text-slate-600">
                  {formatCurrency(totalCuotas)} recaudados de {formatCurrency(statsAlumnos.totalEsperadoCuotas)} proyectados
                </p>
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-emerald-900">Al Día (Sin deuda)</span>
                  <span className="font-bold text-emerald-700 font-mono text-sm">
                    {statsAlumnos.alDia} alumnos
                  </span>
                </div>

                <div className="p-3 bg-red-50 rounded-lg border border-red-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-red-900">Con Deuda Pendiente</span>
                  <span className="font-bold text-red-700 font-mono text-sm">
                    {statsAlumnos.conDeuda} alumnos
                  </span>
                </div>

                <div className="p-3 bg-purple-50 rounded-lg border border-purple-200 flex justify-between items-center text-xs">
                  <span className="font-semibold text-purple-900">Exentos por Beca</span>
                  <span className="font-bold text-purple-700 font-mono text-sm">
                    {statsAlumnos.exentos} alumnos
                  </span>
                </div>
              </div>

              <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-2">
                <h4 className="text-xs font-bold text-slate-800">Resumen de Morosidad</h4>
                <p className="text-xs text-slate-600">
                  Monto total por cobrar a apoderados:
                </p>
                <p className="text-2xl font-bold text-red-600 font-mono">
                  {formatCurrency(statsAlumnos.deudaTotal)}
                </p>
                <p className="text-[11px] text-slate-400">
                  Se pueden enviar recordatorios personalizados por WhatsApp desde la nómina o la grilla.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. TABLA: RESULTADO MENSUAL X AÑO (FLUJO DE CAJA MES A MES) */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Resultado Mensual x Año {year}
            </h3>
            <p className="text-xs text-slate-500">
              Desglose detallado mes a mes de cuotas, ingresos extras, gastos y saldo neto.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                <th className="py-3 px-4">Mes</th>
                <th className="py-3 px-3 text-right">Ingresos Cuotas</th>
                <th className="py-3 px-3 text-right">Ingresos Extra</th>
                <th className="py-3 px-3 text-right font-bold text-slate-800">Total Ingresos</th>
                <th className="py-3 px-3 text-right font-bold text-red-600">Gastos del Mes</th>
                <th className="py-3 px-3 text-right">Resultado Neto</th>
                <th className="py-3 px-4 text-right font-bold text-slate-900">Saldo Acumulado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {monthlyData.map((d) => (
                <tr key={d.monthIdx} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-4 font-sans font-bold text-slate-800">
                    {d.monthName}
                  </td>
                  <td className="py-3 px-3 text-right text-slate-700">
                    {formatCurrency(d.cuotas)}
                  </td>
                  <td className="py-3 px-3 text-right text-amber-700">
                    {formatCurrency(d.extras)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    {formatCurrency(d.totalIngresos)}
                  </td>
                  <td className="py-3 px-3 text-right text-red-600">
                    {formatCurrency(d.gastos)}
                  </td>
                  <td
                    className={`py-3 px-3 text-right font-semibold ${
                      d.resultadoNeto >= 0 ? 'text-emerald-700' : 'text-red-600'
                    }`}
                  >
                    {d.resultadoNeto >= 0 ? '+' : ''}
                    {formatCurrency(d.resultadoNeto)}
                  </td>
                  <td
                    className={`py-3 px-4 text-right font-bold ${
                      d.saldoAcumulado >= 0 ? 'text-slate-900' : 'text-red-700'
                    }`}
                  >
                    {formatCurrency(d.saldoAcumulado)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* Totals Footer */}
            <tfoot className="bg-slate-100 font-mono font-bold text-slate-900 border-t-2 border-slate-300">
              <tr>
                <td className="py-3 px-4 font-sans">TOTALES ANUALES</td>
                <td className="py-3 px-3 text-right">{formatCurrency(totalCuotas)}</td>
                <td className="py-3 px-3 text-right text-amber-700">{formatCurrency(totalExtra)}</td>
                <td className="py-3 px-3 text-right text-emerald-700">{formatCurrency(totalIngresos)}</td>
                <td className="py-3 px-3 text-right text-red-600">{formatCurrency(totalGastos)}</td>
                <td className="py-3 px-3 text-right">
                  {formatCurrency(totalIngresos - totalGastos)}
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 text-sm">
                  {formatCurrency(saldoEnCaja)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 4. REPORTE DETALLADO: INGRESOS EXTRA CON CONTROL FIJO POR ALUMNO */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 bg-purple-50/70 border-b border-purple-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-purple-950 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600" />
              Reporte de Ingresos Extra: Control Nominal de Monto Fijo por Alumno
            </h3>
            <p className="text-xs text-purple-800">
              Estado de cobro detallado de rifas, bingos y cuotas extraordinarias fijadas por cada pupilo.
            </p>
          </div>

          <div className="text-xs font-bold text-purple-900 bg-white px-3 py-1.5 rounded-lg border border-purple-200 shadow-xs">
            {fixedExtraIncomesData.activities.length} Actividades con Cobro Fijo
          </div>
        </div>

        {fixedExtraIncomesData.activities.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p className="text-xs">No se han registrado conceptos de cuota fija por alumno para el período {year}.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {fixedExtraIncomesData.activities.map((act) => {
              const isExpanded = expandedActivityId === act.id;

              return (
                <div key={act.id} className="p-5 space-y-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {act.concepto}
                        </span>
                        <span className="text-[11px] bg-purple-100 text-purple-800 font-bold px-2 py-0.5 rounded border border-purple-200">
                          {formatCurrency(act.fixedAmount)} por alumno
                        </span>
                        <span className="text-xs text-slate-400">
                          {act.fecha}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">
                        {act.descripcion}
                      </p>
                    </div>

                    <div className="flex items-center gap-4">
                      {/* Metric pills */}
                      <div className="flex items-center gap-2 text-xs">
                        <div className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-lg">
                          <span className="text-[10px] block opacity-70">Recaudado:</span>
                          <strong>{formatCurrency(act.totalRecaudado)}</strong> ({act.paidCount}/{act.totalStudents})
                        </div>
                        <div className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-lg">
                          <span className="text-[10px] block opacity-70">Pendiente:</span>
                          <strong>{formatCurrency(act.totalPendiente)}</strong> ({act.pendingCount} deudas)
                        </div>
                        <div className="px-2.5 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded-lg">
                          <span className="text-[10px] block opacity-70">Cumplimiento:</span>
                          <strong>{act.porcentaje}%</strong>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setExpandedActivityId(isExpanded ? null : act.id)
                        }
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Ocultar Nómina' : 'Ver Nómina de Alumnos'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Nominal Student List Table */}
                  {isExpanded && (
                    <div className="border border-slate-200 rounded-xl overflow-hidden mt-3 shadow-xs">
                      <div className="bg-slate-50 px-4 py-2 text-xs font-bold text-slate-700 flex justify-between items-center border-b border-slate-200">
                        <span>Listado Nominal de Alumnos y Estado de Pago</span>
                        <span className="text-slate-500 font-normal">
                          {act.paidCount} pagados · {act.pendingCount} pendientes
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-white border-b border-slate-200 text-slate-600 font-semibold">
                              <th className="py-2.5 px-4">Alumno</th>
                              <th className="py-2.5 px-3">RUT</th>
                              <th className="py-2.5 px-3">Apoderado</th>
                              <th className="py-2.5 px-3">Teléfono</th>
                              <th className="py-2.5 px-3 text-right">Monto</th>
                              <th className="py-2.5 px-3 text-center">Estado</th>
                              <th className="py-2.5 px-4 text-center">Notificación</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {act.studentsBreakdown.map(({ student, isPaid, monto }) => (
                              <tr
                                key={student.id}
                                className={`hover:bg-slate-50 ${
                                  isPaid ? 'bg-white' : 'bg-amber-50/20'
                                }`}
                              >
                                <td className="py-2.5 px-4 font-bold text-slate-900">
                                  {student.nombres} {student.apellidos}
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">
                                  {student.rut}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  {student.nombreApoderado}
                                </td>
                                <td className="py-2.5 px-3 text-slate-600 font-mono">
                                  {student.telefonoApoderado}
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                  {formatCurrency(monto)}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  {isPaid ? (
                                    <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                      <CheckCircle className="w-3 h-3 text-emerald-600" />
                                      Pagado
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-red-100 text-red-800 text-[11px] font-bold px-2 py-0.5 rounded-full">
                                      <Clock className="w-3 h-3 text-red-600" />
                                      Pendiente
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {!isPaid ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openExtraIncomeWhatsAppChat(
                                          student,
                                          act.concepto,
                                          monto,
                                          act.descripcion,
                                          config
                                        )
                                      }
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
                                      title="Enviar cobranza por WhatsApp"
                                    >
                                      <MessageCircle className="w-3 h-3" />
                                      <span>Cobrar WhatsApp</span>
                                    </button>
                                  ) : (
                                    <span className="text-[11px] text-slate-400">
                                      Sin deuda
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
