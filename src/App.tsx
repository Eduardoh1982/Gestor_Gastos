import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CourseConfig,
  Student,
  FeePayment,
  Expense,
  ExtraIncome,
  ExpenseCategory,
  UserRole,
  GestorUser,
  AuthSession,
} from './types';
import {
  getStoredConfig,
  saveStoredConfig,
  getStoredStudents,
  saveStoredStudents,
  getStoredPayments,
  saveStoredPayments,
  getStoredExpenses,
  saveStoredExpenses,
  getStoredExtraIncomes,
  saveStoredExtraIncomes,
  getStoredCategories,
  saveStoredCategories,
  getStoredGestorUsers,
  saveStoredGestorUsers,
  getStoredAuthSession,
  saveStoredAuthSession,
  clearStoredAuthSession,
} from './services/storage';
import { exportCourseFinancialReportToExcel } from './services/excel';
import { Navbar } from './components/Navbar';
import { IncomeGridModule } from './components/IncomeGridModule';
import { StudentModule } from './components/StudentModule';
import { ExpensesModule } from './components/ExpensesModule';
import { ExtraIncomeModule } from './components/ExtraIncomeModule';
import { ReportsModule } from './components/ReportsModule';
import { AdminModule } from './components/AdminModule';
import { ParentPortal } from './components/ParentPortal';
import { LoginScreen } from './components/LoginScreen';
import { ShieldAlert, Plus, X } from 'lucide-react';
import { checkAndDispatchAutomaticBirthdayEmails } from './services/automaticBirthdayService';

export default function App() {
  // Authentication session state
  const [authSession, setAuthSession] = useState<AuthSession | null>(() => getStoredAuthSession());

  // State from persistence
  const [config, setConfig] = useState<CourseConfig>(() => getStoredConfig());
  const [students, setStudents] = useState<Student[]>(() => getStoredStudents());
  const [payments, setPayments] = useState<FeePayment[]>(() => getStoredPayments());
  const [expenses, setExpenses] = useState<Expense[]>(() => getStoredExpenses());
  const [extraIncomes, setExtraIncomes] = useState<ExtraIncome[]>(() => getStoredExtraIncomes());
  const [categories, setCategories] = useState<ExpenseCategory[]>(() => getStoredCategories());
  const [gestorUsers, setGestorUsers] = useState<GestorUser[]>(() => getStoredGestorUsers());

  // UI state
  const [currentTab, setCurrentTab] = useState<string>('ingresos');
  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    const session = getStoredAuthSession();
    return session?.role || 'admin';
  });
  const [selectedYear, setSelectedYear] = useState<number>(() => new Date().getFullYear());
  const [showNewYearModal, setShowNewYearModal] = useState<boolean>(false);
  const [newYearInput, setNewYearInput] = useState<number>(2027);

  // Inactivity auto-logout timer: 3 minutes (180 seconds) without cursor movement or interaction
  const INACTIVITY_TIMEOUT_SECONDS = 180;
  const [secondsRemaining, setSecondsRemaining] = useState<number>(INACTIVITY_TIMEOUT_SECONDS);
  const [timeoutNotice, setTimeoutNotice] = useState<string | null>(null);
  const lastActivityRef = useRef<number>(Date.now());

  const handleResetTimer = useCallback(() => {
    lastActivityRef.current = Date.now();
    setSecondsRemaining(INACTIVITY_TIMEOUT_SECONDS);
  }, []);

  useEffect(() => {
    if (!authSession) {
      setSecondsRemaining(INACTIVITY_TIMEOUT_SECONDS);
      return;
    }

    lastActivityRef.current = Date.now();
    setSecondsRemaining(INACTIVITY_TIMEOUT_SECONDS);

    // Event listener to reset timer on cursor movement or interaction
    const handleUserActivity = () => {
      lastActivityRef.current = Date.now();
      setSecondsRemaining((prev) => (prev < INACTIVITY_TIMEOUT_SECONDS ? INACTIVITY_TIMEOUT_SECONDS : prev));
    };

    const activityEvents = [
      'mousemove',
      'pointermove',
      'mousedown',
      'mouseup',
      'keydown',
      'touchstart',
      'wheel',
      'scroll',
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    const timer = setInterval(() => {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastActivityRef.current) / 1000);
      const remaining = Math.max(0, INACTIVITY_TIMEOUT_SECONDS - elapsedSeconds);

      setSecondsRemaining(remaining);

      if (remaining <= 0) {
        clearInterval(timer);
        clearStoredAuthSession();
        setAuthSession(null);
        setTimeoutNotice(
          'Se ha cerrado la sesión automáticamente por inactividad (3 minutos sin movimiento de cursor o interacción en la app).'
        );
      }
    }, 1000);

    return () => {
      clearInterval(timer);
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [authSession]);

  // Automated background birthday email dispatcher
  useEffect(() => {
    if (config.envioAutomaticoCumpleanos === false) return;
    if (!config.smtpConfig?.user || !config.smtpConfig?.pass) return;

    let isMounted = true;
    const runAutoBirthdayCheck = async () => {
      try {
        const result = await checkAndDispatchAutomaticBirthdayEmails(students, config);
        if (isMounted && result.sentStudents.length > 0) {
          console.log(
            `🎂 Se enviaron automáticamente ${result.sentStudents.length} saludos de cumpleaños vía SMTP a los apoderados.`
          );
        }
      } catch (err) {
        console.error('Error al ejecutar despacho automático de cumpleaños:', err);
      }
    };

    runAutoBirthdayCheck();
    const interval = setInterval(runAutoBirthdayCheck, 30 * 60 * 1000); // Re-check every 30 minutes

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [students, config]);

  // Sync state helpers
  const handleUpdateConfig = (newConfig: CourseConfig) => {
    setConfig(newConfig);
    saveStoredConfig(newConfig);
  };

  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    saveStoredStudents(newStudents);
  };

  const handleUpdatePayments = (newPayments: FeePayment[]) => {
    setPayments(newPayments);
    saveStoredPayments(newPayments);
  };

  const handleUpdateExpenses = (newExpenses: Expense[]) => {
    setExpenses(newExpenses);
    saveStoredExpenses(newExpenses);
  };

  const handleUpdateExtraIncomes = (newExtraIncomes: ExtraIncome[]) => {
    setExtraIncomes(newExtraIncomes);
    saveStoredExtraIncomes(newExtraIncomes);
  };

  const handleUpdateCategories = (newCategories: ExpenseCategory[]) => {
    setCategories(newCategories);
    saveStoredCategories(newCategories);
  };

  const handleUpdateGestorUsers = (newUsers: GestorUser[]) => {
    setGestorUsers(newUsers);
    saveStoredGestorUsers(newUsers);
  };

  // Auth Handlers
  const handleLoginSuccess = (session: AuthSession) => {
    setTimeoutNotice(null);
    lastActivityRef.current = Date.now();
    setSecondsRemaining(INACTIVITY_TIMEOUT_SECONDS);
    setAuthSession(session);
    saveStoredAuthSession(session);
    if (session.type === 'gestor' && session.role) {
      setCurrentRole(session.role);
    }
  };

  const handleLogout = () => {
    clearStoredAuthSession();
    setAuthSession(null);
    setTimeoutNotice(null);
  };

  // Role change for testing inside Gestor mode
  const handleRoleChange = (role: UserRole) => {
    setCurrentRole(role);
    if (authSession && authSession.type === 'gestor') {
      const updatedSession: AuthSession = {
        ...authSession,
        role: role === 'apoderado' ? 'admin' : role,
      };
      setAuthSession(updatedSession);
      saveStoredAuthSession(updatedSession);
    }
  };

  // Reload all from storage (used after reset or JSON import)
  const reloadAllData = () => {
    const freshConfig = getStoredConfig();
    setConfig(freshConfig);
    setSelectedYear(freshConfig.currentYear);
    setStudents(getStoredStudents());
    setPayments(getStoredPayments());
    setExpenses(getStoredExpenses());
    setExtraIncomes(getStoredExtraIncomes());
    setCategories(getStoredCategories());
    setGestorUsers(getStoredGestorUsers());
  };

  const handleAddNewYear = () => {
    if (currentRole === 'auditor') {
      alert('Los usuarios con rol Auditor no tienen permisos para habilitar nuevos períodos contables.');
      return;
    }
    if (config.availableYears.includes(newYearInput)) {
      alert(`El año ${newYearInput} ya se encuentra en la lista de períodos contables.`);
      return;
    }
    const updatedYears = [...config.availableYears, newYearInput].sort((a, b) => a - b);
    const updatedConfig: CourseConfig = {
      ...config,
      availableYears: updatedYears,
      currentYear: newYearInput,
    };
    handleUpdateConfig(updatedConfig);
    setSelectedYear(newYearInput);
    setShowNewYearModal(false);
  };

  const handleExportExcel = () => {
    exportCourseFinancialReportToExcel(
      selectedYear,
      config,
      students,
      payments,
      expenses,
      extraIncomes
    );
  };

  // 1. IF NO AUTH SESSION -> SHOW LOGIN SCREEN
  if (!authSession) {
    return (
      <LoginScreen
        gestorUsers={gestorUsers}
        students={students}
        config={config}
        onLoginSuccess={handleLoginSuccess}
        timeoutNotice={timeoutNotice}
        onClearTimeoutNotice={() => setTimeoutNotice(null)}
      />
    );
  }

  // 2. IF AUTHENTICATED AS APODERADO -> SHOW PARENT PORTAL DIRECTLY
  if (authSession.type === 'apoderado') {
    return (
      <div className="min-h-screen bg-slate-100/70 p-4 sm:p-6 lg:p-8">
        <ParentPortal
          students={students}
          payments={payments}
          extraIncomes={extraIncomes}
          year={selectedYear}
          config={config}
          onExitPortal={handleLogout}
          initialStudentIds={authSession.studentIds}
          initialEmail={authSession.apoderadoEmail}
        />
      </div>
    );
  }

  // 3. AUTHENTICATED AS GESTOR (ADMIN OR AUDITOR)
  return (
    <div className="min-h-screen bg-slate-100/70 flex flex-col font-sans text-slate-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        currentRole={currentRole}
        onRoleChange={handleRoleChange}
        config={config}
        selectedYear={selectedYear}
        onYearChange={setSelectedYear}
        onAddNewYear={() => {
          if (currentRole === 'auditor') return;
          setNewYearInput(selectedYear + 1);
          setShowNewYearModal(true);
        }}
        authSession={authSession}
        onLogout={handleLogout}
        studentsCount={students.length}
        expensesCount={expenses.filter((e) => e.year === selectedYear).length}
        extraIncomesCount={extraIncomes.filter((i) => i.year === selectedYear).length}
        secondsRemaining={secondsRemaining}
        onResetTimer={handleResetTimer}
      />

      {/* Auditor Notice Banner */}
      {currentRole === 'auditor' && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>
            <strong>Modo Auditor Activo:</strong> Estás navegando en modo de fiscalización (solo lectura). Puedes revisar todas las cuotas, rendiciones y reportes, pero las acciones de edición y nuevos registros están deshabilitadas.
          </span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'ingresos' && (
          <IncomeGridModule
            year={selectedYear}
            config={config}
            students={students}
            payments={payments}
            onUpdateStudents={handleUpdateStudents}
            onUpdatePayments={handleUpdatePayments}
            userRole={currentRole}
            onExportExcel={handleExportExcel}
          />
        )}

        {currentTab === 'alumnos' && (
          <StudentModule
            students={students}
            onUpdateStudents={handleUpdateStudents}
            payments={payments}
            onUpdatePayments={handleUpdatePayments}
            year={selectedYear}
            config={config}
            userRole={currentRole}
          />
        )}

        {currentTab === 'pagos' && (
          <ExpensesModule
            year={selectedYear}
            expenses={expenses}
            onUpdateExpenses={handleUpdateExpenses}
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
            userRole={currentRole}
          />
        )}

        {currentTab === 'ingresos-extra' && (
          <ExtraIncomeModule
            year={selectedYear}
            extraIncomes={extraIncomes}
            onUpdateExtraIncomes={handleUpdateExtraIncomes}
            students={students}
            config={config}
            userRole={currentRole}
          />
        )}

        {currentTab === 'reportes' && (
          <ReportsModule
            year={selectedYear}
            config={config}
            students={students}
            payments={payments}
            expenses={expenses}
            extraIncomes={extraIncomes}
          />
        )}

        {currentTab === 'admin' && (
          <AdminModule
            config={config}
            onUpdateConfig={handleUpdateConfig}
            categories={categories}
            onUpdateCategories={handleUpdateCategories}
            gestorUsers={gestorUsers}
            onUpdateGestorUsers={handleUpdateGestorUsers}
            currentRole={currentRole}
            onRoleChange={handleRoleChange}
            onDataReset={reloadAllData}
            onLogout={handleLogout}
            students={students}
            payments={payments}
            extraIncomes={extraIncomes}
            year={selectedYear}
          />
        )}
      </main>

      {/* New Accounting Year Modal */}
      {showNewYearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full shadow-2xl p-6 border border-slate-100 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-slate-900">
                Agregar Nuevo Período Contable
              </h3>
              <button
                onClick={() => setShowNewYearModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Ingresa el año que deseas habilitar para la gestión contable del curso:
            </p>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Año Contable
              </label>
              <input
                type="number"
                min={2020}
                max={2040}
                value={newYearInput}
                onChange={(e) => setNewYearInput(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowNewYearModal(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleAddNewYear}
                disabled={currentRole === 'auditor'}
                title={currentRole === 'auditor' ? 'Función deshabilitada para usuarios con rol Auditor' : 'Habilitar Período'}
                className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                Habilitar Período
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white py-3 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            {config.nombreCurso} · {config.institucion} — Período Contable {selectedYear}
          </span>
          <span className="text-[11px] text-slate-600">
            Cuota mensual base: ${config.cuotaMensualPorDefecto.toLocaleString('es-CL')} CLP
          </span>
        </div>
      </footer>
    </div>
  );
}
