import React from 'react';
import {
  Wallet,
  Users,
  Grid3X3,
  Receipt,
  Sparkles,
  BarChart3,
  Settings,
  UserCheck,
  ShieldCheck,
  Plus,
  LogOut,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
} from 'lucide-react';
import { UserRole, CourseConfig, AuthSession } from '../types';
import { getEffectiveLogo } from '../assets/logo';

interface NavbarProps {
  currentTab: string;
  onTabChange: (tab: string) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  config: CourseConfig;
  selectedYear: number;
  onYearChange: (year: number) => void;
  onAddNewYear: () => void;
  authSession: AuthSession | null;
  onLogout: () => void;
  studentsCount?: number;
  expensesCount?: number;
  extraIncomesCount?: number;
  secondsRemaining?: number;
  onResetTimer?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  currentRole,
  onRoleChange,
  config,
  selectedYear,
  onYearChange,
  onAddNewYear,
  authSession,
  onLogout,
  studentsCount = 0,
  expensesCount = 0,
  extraIncomesCount = 0,
  secondsRemaining,
  onResetTimer,
}) => {
  const navItems = [
    {
      id: 'ingresos',
      label: 'Cuotas',
      icon: Grid3X3,
      //badge: '12 Meses',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    },
    {
      id: 'alumnos',
      label: 'Alumnos',
      icon: Users,
      badge: `${studentsCount} Alumnos`,
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
    },
    {
      id: 'pagos',
      label: 'Gastos (Pagos)',
      icon: Receipt,
      badge: `${expensesCount} Reg.`,
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    },
    {
      id: 'ingresos-extra',
      label: 'Ingresos Extra',
      icon: Sparkles,
      badge: `${extraIncomesCount} Eventos`,
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    },
    {
      id: 'reportes',
      label: 'Reportes y Balances',
      icon: BarChart3,
      //badge: 'Balances y Gráficos',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
    },
    {
      id: 'admin',
      label: 'Administración',
      icon: Settings,
    },
  ];

  // Contextual description for current active section
  const getContextualInfo = () => {
    switch (currentTab) {
      case 'ingresos':
        return {
          title: 'Cuotas Mensuales (Grilla Anual)',
          desc: `Control contable de 12 meses para el período ${selectedYear}. Registra pagos, abonos parciales y saldos pendientes con 1 clic.`,
        };
      case 'alumnos':
        return {
          title: 'Padrón y Fichas de Alumnos',
          desc: `Gestión de ${studentsCount} alumnos matriculados. Edita datos personales, ingresos a mitad de año y contactos de apoderados.`,
        };
      case 'pagos':
        return {
          title: 'Rendición de Gastos y Boletas',
          desc: `Registro de egresos del período (${expensesCount} rendiciones). Clasificación por categorías, proveedores y respaldo fotográfico.`,
        };
      case 'ingresos-extra':
        return {
          title: 'Ingresos Extraordinarios y Rifas',
          desc: `Gestión de ${extraIncomesCount} actividades. Control general y seguimiento nominal de cobros con monto fijo por alumno.`,
        };
      case 'reportes':
        return {
          title: 'Reportes Contables y Balances Anuales',
          desc: 'Análisis financiero consolidado: cumplimiento de cuotas, control de rifas por alumno, comparativas mensuales y exportación a Excel.',
        };
      case 'admin':
        return {
          title: 'Administración, Usuarios y Parámetros',
          desc: 'Edición de usuarios gestores (Admin/Auditor), parámetros bancarios para WhatsApp y respaldos de seguridad.',
        };
      default:
        return {
          title: 'Gestor de Fondos',
          desc: `Período contable ${selectedYear}.`,
        };
    }
  };

  const contextInfo = getContextualInfo();

  return (
    <header className="sticky top-0 z-40 shadow-lg">
      {/* TIER 1: Upper Brand & Session Bar */}
      <div className="bg-slate-900 border-b border-slate-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-15 gap-3">
            {/* Left: Brand title & active course info with Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-emerald-400/40 bg-slate-800 shadow-md shadow-emerald-500/20 shrink-0 p-0.5">
                <img
                  src={getEffectiveLogo(config.logoUrl)}
                  alt={`${config.nombreCurso} · ${config.institucion}`}
                  className="w-full h-full object-cover rounded-lg bg-white"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-black text-white tracking-tight text-base sm:text-lg">
                    Gestor de Fondos
                  </span>
                  <span className="text-[11px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-md border border-emerald-500/30">
                    {config.nombreCurso}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  {config.institucion}
                </span>
              </div>
            </div>

            {/* Right: Year selector + Role badge + Direct Logout */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Year Selector */}
              <div className="flex items-center bg-slate-800/80 rounded-lg p-1 border border-slate-700">
                <Calendar className="w-3.5 h-3.5 text-slate-400 ml-1.5 hidden sm:inline" />
                <span className="text-xs font-semibold text-slate-300 pl-1 pr-1 hidden sm:inline">
                  Año:
                </span>
                <select
                  aria-label="Año contable"
                  value={selectedYear}
                  onChange={(e) => onYearChange(Number(e.target.value))}
                  className="bg-transparent text-xs sm:text-sm font-bold text-white py-0.5 px-1.5 rounded focus:outline-none cursor-pointer"
                >
                  {config.availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-800 text-white">
                      {yr}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={onAddNewYear}
                  disabled={currentRole === 'auditor'}
                  title={
                    currentRole === 'auditor'
                      ? 'Los auditores no pueden generar nuevos períodos contables (función deshabilitada)'
                      : 'Habilitar nuevo año contable'
                  }
                  className={`p-1 rounded transition-colors ${
                    currentRole === 'auditor'
                      ? 'text-slate-600 cursor-not-allowed opacity-40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700 cursor-pointer'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Logged User Capsule & Role Badge (Solo Informativo) */}
              <div className="flex items-center bg-slate-800/80 px-2 py-1 rounded-lg border border-slate-700 gap-1.5">
                {currentRole === 'admin' ? (
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <UserCheck className="w-4 h-4 text-amber-400 shrink-0" />
                )}
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-bold text-slate-200 leading-tight hidden md:inline truncate max-w-[120px]">
                    {authSession?.gestorUser?.nombre || authSession?.gestorUser?.username || 'Gestor'}
                  </span>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      currentRole === 'admin' ? 'text-emerald-400' : 'text-amber-400'
                    }`}
                  >
                    {currentRole === 'admin' ? 'Admin' : 'Auditor'}
                  </span>
                </div>

                {/* Role badges (Informativos: deshabilitados para evitar que el usuario o auditor altere permisos) */}
                {authSession?.type === 'gestor' && (
                  <div className="flex items-center gap-1 border-l border-slate-700 pl-1.5 ml-1">
                    <button
                      type="button"
                      disabled={true}
                      title="Rol asignado por inicio de sesión (no modificable)"
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-default select-none transition-none ${
                        currentRole === 'admin'
                          ? 'bg-emerald-500 text-slate-950 font-black'
                          : 'text-slate-500 opacity-30 cursor-not-allowed'
                      }`}
                    >
                      Admin
                    </button>
                    <button
                      type="button"
                      disabled={true}
                      title="Rol asignado por inicio de sesión (no modificable)"
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded cursor-default select-none transition-none ${
                        currentRole === 'auditor'
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'text-slate-500 opacity-30 cursor-not-allowed'
                      }`}
                    >
                      Auditor
                    </button>
                  </div>
                )}
              </div>

              {/* Session Inactivity Auto-Logout Timer (Max 3 mins without cursor movement) */}
              {secondsRemaining !== undefined && (
                <div
                  onClick={onResetTimer}
                  title="Control de inactividad (3 minutos): Mover el cursor o interactuar en la app reinicia el tiempo. Si no hay movimiento de cursor durante 3 minutos, se cerrará la sesión automáticamente por seguridad."
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono font-bold transition-all cursor-pointer ${
                    secondsRemaining <= 45
                      ? 'bg-amber-500/20 text-amber-300 border-amber-400 shadow-sm shadow-amber-500/30 animate-pulse'
                      : 'bg-slate-900/80 text-slate-300 border-slate-700 hover:border-slate-500 hover:text-white'
                  }`}
                >
                  <Clock className={`w-3.5 h-3.5 ${secondsRemaining <= 45 ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
                  <span className="hidden sm:inline text-[11px] font-sans font-medium text-slate-400">
                    Inactividad:
                  </span>
                  <span>
                    {Math.floor(secondsRemaining / 60)}:{(secondsRemaining % 60).toString().padStart(2, '0')}
                  </span>
                </div>
              )}

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Cerrar sesión y volver al login"
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-red-300 hover:text-white bg-red-950/60 hover:bg-red-600 rounded-lg border border-red-800 hover:border-red-600 transition-colors cursor-pointer shadow-xs whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cerrar Sesión</span>
                <span className="sm:hidden">Salir</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TIER 2: Dedicated, Prominent Contextual Navigation Bar */}
      <div className="bg-slate-950 border-b border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <nav className="flex items-center gap-2 overflow-x-auto py-2.5 no-scrollbar">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onTabChange(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-slate-900/90 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 ${
                      isActive ? 'text-slate-950 stroke-[2.5]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-md font-semibold border ${
                        isActive
                          ? 'bg-slate-950/20 text-slate-950 border-slate-950/30'
                          : item.badgeColor
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* TIER 3: Contextual Ribbon with active section metadata */}
      <div className="bg-slate-800/95 backdrop-blur-sm border-b border-slate-700/80 px-4 sm:px-6 lg:px-8 py-2 text-white">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-bold text-slate-100 flex items-center gap-1">
              <span>Módulo:</span>
              <span className="text-emerald-400">{contextInfo.title}</span>
            </span>
            <span className="text-slate-400 hidden md:inline">|</span>
            <span className="text-slate-300 hidden md:inline text-[11px]">
              {contextInfo.desc}
            </span>
          </div>

          <div className="flex items-center gap-3 text-[11px] text-slate-300 self-end sm:self-auto">
            <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
              Período: <strong>{selectedYear}</strong>
            </span>
            <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
              Registro de: <strong>{config.nombreCurso}</strong>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
