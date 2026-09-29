import React, { useState } from 'react';
import {
  ShieldCheck,
  UserCheck,
  User,
  Lock,
  Mail,
  CreditCard,
  School,
  AlertCircle,
  KeyRound,
  Users,
} from 'lucide-react';
import { GestorUser, Student, CourseConfig, AuthSession } from '../types';
import { APP_LOGO } from '../assets/logo';

interface LoginScreenProps {
  gestorUsers: GestorUser[];
  students: Student[];
  config: CourseConfig;
  onLoginSuccess: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  gestorUsers,
  students,
  config,
  onLoginSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'gestor' | 'apoderado'>('gestor');

  // Gestor Form State
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [gestorError, setGestorError] = useState('');

  // Apoderado Form State
  const [rutInput, setRutInput] = useState('');
  const [emailInput, setEmailInput] = useState('');
  const [apoderadoError, setApoderadoError] = useState('');

  // Handle Gestor Login
  const handleGestorSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setGestorError('');

    const trimmedUser = username.trim().toLowerCase();
    const matched = gestorUsers.find(
      (u) => u.username.toLowerCase() === trimmedUser && u.password === password
    );

    if (matched) {
      onLoginSuccess({
        type: 'gestor',
        role: matched.role,
        gestorUser: matched,
      });
    } else {
      setGestorError('Usuario o contraseña incorrectos. Revisa los datos de acceso.');
    }
  };

  // Handle Apoderado Login
  const handleApoderadoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setApoderadoError('');

    const cleanRut = rutInput.trim().toLowerCase().replace(/[^0-9k]/g, '');
    const cleanEmail = emailInput.trim().toLowerCase();

    // Check if there is any student matching the RUT
    const matchedByRut = students.find(
      (s) => s.rut.toLowerCase().replace(/[^0-9k]/g, '') === cleanRut
    );

    // Also find all students associated with this parent email (support for siblings!)
    const matchingStudents = students.filter((s) => {
      const matchRut = cleanRut && s.rut.toLowerCase().replace(/[^0-9k]/g, '') === cleanRut;
      const matchEmail = cleanEmail && s.emailApoderado.toLowerCase().trim() === cleanEmail;
      return matchRut || matchEmail;
    });

    if (matchingStudents.length > 0) {
      // If entered RUT matched, or email matched
      const valid =
        matchedByRut && cleanEmail
          ? matchedByRut.emailApoderado.toLowerCase().trim() === cleanEmail
          : matchingStudents.length > 0;

      if (valid) {
        onLoginSuccess({
          type: 'apoderado',
          apoderadoEmail: cleanEmail || matchingStudents[0].emailApoderado,
          studentIds: matchingStudents.map((s) => s.id),
        });
        return;
      }
    }

    setApoderadoError(
      'No se encontró ningún alumno que coincida con el RUT y Correo del apoderado ingresado. Verifica tus datos.'
    );
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 flex flex-col justify-center items-center p-4">
      {/* Brand Header with Logo */}
      <div className="text-center mb-8 space-y-3">
        <div className="relative mx-auto w-24 h-24 rounded-2xl p-1 bg-gradient-to-tr from-emerald-500 via-teal-400 to-indigo-500 shadow-2xl shadow-emerald-500/20 backdrop-blur-sm border border-emerald-400/40 overflow-hidden">
          <img
            src={APP_LOGO}
            alt={`${config.nombreCurso} · ${config.institucion}`}
            className="w-full h-full object-cover rounded-xl bg-white"
          />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Gestor de Fondos
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1">
            <span className="font-bold text-emerald-400">{config.nombreCurso}</span> · {config.institucion} (Período Contable {currentYear})
          </p>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Tab Switcher: Gestor vs Apoderado */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('gestor')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'gestor'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Acceso Gestor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('apoderado')}
            className={`py-2.5 text-xs sm:text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'apoderado'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4 text-emerald-600" />
            Acceso Apoderado
          </button>
        </div>

        {/* Tab Content: GESTOR LOGIN */}
        {activeTab === 'gestor' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Iniciar Sesión como Gestor
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa con tu usuario y contraseña de Administrador o Auditor.
              </p>
            </div>

            {gestorError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{gestorError}</span>
              </div>
            )}

            <form onSubmit={handleGestorSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre de Usuario
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Usuario"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Ingresar al Sistema
              </button>
            </form>
          </div>
        )}

        {/* Tab Content: APODERADO LOGIN */}
        {activeTab === 'apoderado' && (
          <div className="p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Portal de Familias y Apoderados
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Ingresa con el RUT del alumno y tu correo para ver el estado de cuotas de tus pupilos.
              </p>
            </div>

            {apoderadoError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{apoderadoError}</span>
              </div>
            )}

            <form onSubmit={handleApoderadoSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  RUT del Alumno
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={rutInput}
                    onChange={(e) => setRutInput(e.target.value)}
                    placeholder="Ej: 22.987.654-3"
                    className="w-full pl-9 pr-3 py-2.5 text-sm font-mono border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico del Apoderado
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="apoderado@correo.com"
                    className="w-full pl-9 pr-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-600 focus:outline-none"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Consultar Estado de Cuotas
              </button>
            </form>
          </div>
        )}
      </div>

      <footer className="mt-8 text-center text-xs text-slate-400">
        Gestor de Fondos · Período Contable {currentYear}
      </footer>
    </div>
  );
};
