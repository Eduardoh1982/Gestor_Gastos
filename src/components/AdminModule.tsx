import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  UserCheck,
  User,
  Building,
  CreditCard,
  Calendar,
  Layers,
  Download,
  Upload,
  RefreshCcw,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  KeyRound,
  LogOut,
  Edit2,
  Trash2,
  X,
} from 'lucide-react';
import { CourseConfig, ExpenseCategory, UserRole, GestorUser } from '../types';
import {
  exportAllDataAsJson,
  importAllDataFromJson,
  resetAllDataToDefaults,
  formatCurrency,
} from '../services/storage';

interface AdminModuleProps {
  config: CourseConfig;
  onUpdateConfig: (config: CourseConfig) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
  gestorUsers: GestorUser[];
  onUpdateGestorUsers: (users: GestorUser[]) => void;
  currentRole: UserRole;
  onRoleChange: (role: UserRole) => void;
  onDataReset: () => void;
  onLogout?: () => void;
}

export const AdminModule: React.FC<AdminModuleProps> = ({
  config,
  onUpdateConfig,
  categories,
  onUpdateCategories,
  gestorUsers,
  onUpdateGestorUsers,
  currentRole,
  onRoleChange,
  onDataReset,
  onLogout,
}) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // New Gestor User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'auditor'>('auditor');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Edit Gestor User Form State
  const [editingUser, setEditingUser] = useState<GestorUser | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editNombre, setEditNombre] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'auditor'>('auditor');
  const [editError, setEditError] = useState('');

  const handleOpenEditUser = (user: GestorUser) => {
    setEditingUser(user);
    setEditUsername(user.username);
    setEditPassword(user.password || '');
    setEditNombre(user.nombre);
    setEditRole(user.role);
    setEditError('');
  };

  const handleSaveEditUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditError('');

    const cleanUsername = editUsername.trim().toLowerCase();
    const cleanNombre = editNombre.trim();
    const cleanPassword = editPassword.trim();

    if (!cleanUsername || !cleanNombre || !cleanPassword) {
      setEditError('Todos los campos son obligatorios.');
      return;
    }

    // Check if another user has this username
    const duplicate = gestorUsers.some(
      (u) => u.id !== editingUser.id && u.username.toLowerCase() === cleanUsername
    );
    if (duplicate) {
      setEditError(`El nombre de usuario "${cleanUsername}" ya está en uso por otra cuenta.`);
      return;
    }

    // Check if demoting the only admin
    if (editingUser.role === 'admin' && editRole === 'auditor') {
      const remainingAdmins = gestorUsers.filter(
        (u) => u.id !== editingUser.id && u.role === 'admin'
      );
      if (remainingAdmins.length === 0) {
        setEditError('Debe haber al menos un usuario con rol Administrador en el sistema.');
        return;
      }
    }

    const updatedUser: GestorUser = {
      ...editingUser,
      username: cleanUsername,
      nombre: cleanNombre,
      password: cleanPassword,
      role: editRole,
    };

    const updatedList = gestorUsers.map((u) => (u.id === editingUser.id ? updatedUser : u));
    onUpdateGestorUsers(updatedList);
    setEditingUser(null);
  };

  // Local state for settings form
  const [nombreCurso, setNombreCurso] = useState(config.nombreCurso);
  const [institucion, setInstitucion] = useState(config.institucion);
  const [cuotaMensual, setCuotaMensual] = useState(config.cuotaMensualPorDefecto);

  // Bank details
  const [banco, setBanco] = useState(config.datosBancarios.banco);
  const [tipoCuenta, setTipoCuenta] = useState(config.datosBancarios.tipoCuenta);
  const [numeroCuenta, setNumeroCuenta] = useState(config.datosBancarios.numeroCuenta);
  const [titularNombre, setTitularNombre] = useState(config.datosBancarios.titularNombre);
  const [titularRut, setTitularRut] = useState(config.datosBancarios.titularRut);
  const [emailConfirmacion, setEmailConfirmacion] = useState(config.datosBancarios.emailConfirmacion);

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CourseConfig = {
      ...config,
      nombreCurso: nombreCurso.trim(),
      institucion: institucion.trim(),
      cuotaMensualPorDefecto: Number(cuotaMensual),
      datosBancarios: {
        banco: banco.trim(),
        tipoCuenta: tipoCuenta.trim(),
        numeroCuenta: numeroCuenta.trim(),
        titularNombre: titularNombre.trim(),
        titularRut: titularRut.trim(),
        emailConfirmacion: emailConfirmacion.trim(),
      },
    };
    onUpdateConfig(updated);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDownloadBackup = () => {
    const jsonStr = exportAllDataAsJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Respaldo_Tesoreria_${config.nombreCurso.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = importAllDataFromJson(content);
      if (success) {
        setImportStatus('Datos restaurados correctamente. Recargando...');
        setTimeout(() => {
          onDataReset();
          setImportStatus(null);
        }, 1200);
      } else {
        setImportStatus('Error: El archivo JSON de respaldo no es válido.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        '¿Deseas restablecer todos los datos a los valores iniciales de demostración? Se reescribirán las cuotas y alumnos actuales.'
      )
    ) {
      resetAllDataToDefaults();
      onDataReset();
      alert('Datos restablecidos a los valores iniciales.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-slate-700" />
            Administración y Configuración del Sistema
          </h2>
          <p className="text-xs text-slate-500">
            Configura roles de usuario, datos del curso, parámetros bancarios para WhatsApp y respaldos de información.
          </p>
        </div>

        {onLogout && (
          <button
            onClick={onLogout}
            title="Cerrar sesión y volver a la pantalla de login"
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-bold text-red-700 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl border border-red-200 transition-colors shadow-xs cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            <span>Cerrar Sesión</span>
          </button>
        )}
      </div>

      {/* 1. SELECCIÓN DE ROLES DE USUARIO (Según requerimiento 6) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
            Roles de Acceso al Sistema
          </h3>
          <p className="text-xs text-slate-500">
            Simula o cambia el perfil activo del usuario para probar los distintos niveles de permisos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Admin card */}
          <div
            onClick={() => onRoleChange('admin')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              currentRole === 'admin'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Usuario Administrador
              </span>
              {currentRole === 'admin' && (
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Control total: registrar y anular pagos, agregar y editar alumnos, gastos con boletas, ingresos extras y configuración bancaria.
            </p>
          </div>

          {/* Auditor card */}
          <div
            onClick={() => onRoleChange('auditor')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              currentRole === 'auditor'
                ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                <UserCheck className="w-4 h-4 text-amber-600" />
                Usuario Auditor
              </span>
              {currentRole === 'auditor' && (
                <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Revisar cuotas, fondos, boletas y reportes. Modo solo lectura de fiscalización que protege los datos contra modificaciones accidentales.
            </p>
          </div>

          {/* Apoderado card */}
          <div
            onClick={() => onRoleChange('apoderado')}
            className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
              currentRole === 'apoderado'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 hover:border-slate-300 bg-white'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                <User className="w-4 h-4 text-emerald-600" />
                Portal Apoderado
              </span>
              {currentRole === 'apoderado' && (
                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  ACTIVO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Portal privado para que el apoderado consulte las cuotas de su alumno mediante su RUT y Email, viendo el detalle de pagos y datos para transferir.
            </p>
          </div>
        </div>
      </div>

      {/* 2. GESTIÓN DE USUARIOS GESTORES (ADMINISTRADORES Y AUDITORES) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-slate-700" />
              Cuentas de Usuarios Gestores (Login con Usuario y Contraseña)
            </h3>
            <p className="text-xs text-slate-500">
              Define los usuarios y contraseñas autorizados para iniciar sesión en el portal Gestor, asignando rol Administrador o Auditor.
            </p>
          </div>

          <button
            type="button"
            disabled={currentRole === 'auditor'}
            onClick={() => {
              setNewUsername('');
              setNewPassword('');
              setNewNombre('');
              setNewRole('auditor');
              setShowAddUserModal(true);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
          >
            + Crear Nuevo Usuario
          </button>
        </div>

        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4">Usuario</th>
                <th className="py-2.5 px-3">Nombre Completo</th>
                <th className="py-2.5 px-3">Rol Asignado</th>
                <th className="py-2.5 px-3 font-mono">Contraseña</th>
                <th className="py-2.5 px-3 text-center">Permisos</th>
                <th className="py-2.5 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {gestorUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50">
                  <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                    {user.username}
                  </td>
                  <td className="py-3 px-3 text-slate-700">{user.nombre}</td>
                  <td className="py-3 px-3">
                    {user.role === 'admin' ? (
                      <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        Administrador
                      </span>
                    ) : (
                      <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[11px] font-bold">
                        Auditor
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-3 font-mono text-slate-500">
                    {user.password}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="text-[11px] text-slate-600">
                      {user.role === 'admin' ? 'Gestión total' : 'Solo visualización'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <button
                        type="button"
                        disabled={currentRole === 'auditor'}
                        onClick={() => handleOpenEditUser(user)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-xs font-bold px-2 py-1 rounded-md transition-colors disabled:opacity-50 cursor-pointer"
                        title={`Editar usuario ${user.nombre}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {user.username !== 'admin' && user.username !== 'auditor' && currentRole === 'admin' ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`¿Seguro que deseas eliminar al usuario "${user.nombre}"?`)) {
                              onUpdateGestorUsers(gestorUsers.filter((u) => u.id !== user.id));
                            }
                          }}
                          className="inline-flex items-center gap-1 text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 text-xs font-bold px-2 py-1 rounded-md transition-colors cursor-pointer"
                          title="Eliminar usuario"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL EDITAR USUARIO GESTOR */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Edit2 className="w-4 h-4 text-indigo-300" />
                  Editar Usuario Gestor
                </h3>
                <p className="text-xs text-indigo-200">
                  Modifica los datos de acceso y permisos de {editingUser.nombre}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo *
                </label>
                <input
                  type="text"
                  required
                  value={editNombre}
                  onChange={(e) => setEditNombre(e.target.value)}
                  placeholder="Ej: Laura Castro"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Usuario de Acceso *
                  </label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    placeholder="Ej: laura.castro"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Clave123"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rol Asignado
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white focus:outline-none"
                >
                  <option value="admin">Administrador (Derecho a gestionar todo)</option>
                  <option value="auditor">Auditor (Solo visualización sin edición)</option>
                </select>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  {editRole === 'admin'
                    ? 'Permite agregar pagos, editar alumnos, gastos, ingresos extras y configuración.'
                    : 'Modo auditoría: solo puede ver cuotas, rendiciones y reportes contables.'}
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Guardar Cambios
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Crear Usuario Gestor</h3>
                <p className="text-xs text-slate-300">
                  Acceso para directiva o comité de auditoría
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddUserModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!newUsername.trim() || !newPassword.trim()) return;

                const newUser: GestorUser = {
                  id: `usr-${Date.now()}`,
                  username: newUsername.trim().toLowerCase(),
                  password: newPassword.trim(),
                  nombre: newNombre.trim() || newUsername.trim(),
                  role: newRole,
                };

                onUpdateGestorUsers([...gestorUsers, newUser]);
                setShowAddUserModal(false);
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={newNombre}
                  onChange={(e) => setNewNombre(e.target.value)}
                  placeholder="Ej: Claudia Morales (Tesorera)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre de Usuario *
                  </label>
                  <input
                    type="text"
                    required
                    value={newUsername}
                    onChange={(e) => setNewUsername(e.target.value)}
                    placeholder="Ej: tesorera"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Clave123"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rol del Usuario
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 bg-white"
                >
                  <option value="admin">Administrador (Derecho a gestionar todo)</option>
                  <option value="auditor">Auditor (Solo visualización sin edición)</option>
                </select>
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs"
                >
                  Guardar Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. FORMULARIO CONFIGURACIÓN GENERAL Y BANCO */}
      <form onSubmit={handleSaveGeneral} className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Building className="w-4 h-4 text-slate-700" />
            Parámetros del Curso y Período
          </h3>
          <p className="text-xs text-slate-500">
            Identificación de la agrupación escolar y valor mensual de la cuota.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre del Curso
            </label>
            <input
              type="text"
              required
              value={nombreCurso}
              onChange={(e) => setNombreCurso(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institución Educativa
            </label>
            <input
              type="text"
              required
              value={institucion}
              onChange={(e) => setInstitucion(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cuota Mensual Estándar ($ CLP)
            </label>
            <input
              type="number"
              required
              min={1}
              value={cuotaMensual}
              onChange={(e) => setCuotaMensual(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
            />
          </div>
        </div>

        {/* Datos Bancarios para WhatsApp */}
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div>
            <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              Datos de Cuenta Bancaria para Transferencias
            </h4>
            <p className="text-xs text-slate-500">
              Esta información se adjunta automáticamente en los mensajes de WhatsApp enviados a los apoderados con deuda.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                required
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ej: Banco Estado"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Cuenta
              </label>
              <input
                type="text"
                required
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                placeholder="Ej: Cuenta RUT / Vista"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Cuenta
              </label>
              <input
                type="text"
                required
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre del Titular
              </label>
              <input
                type="text"
                required
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                placeholder="Ej: Directiva Tesorería"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUT del Titular
              </label>
              <input
                type="text"
                required
                value={titularRut}
                onChange={(e) => setTitularRut(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email para Envío de Comprobantes
              </label>
              <input
                type="email"
                required
                value={emailConfirmacion}
                onChange={(e) => setEmailConfirmacion(e.target.value)}
                placeholder="tesoreria@colegio.cl"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
          <div>
            {saveSuccess && (
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" />
                Configuración guardada exitosamente.
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={currentRole === 'auditor'}
            className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-xs disabled:opacity-50 cursor-pointer"
          >
            Guardar Configuración
          </button>
        </div>
      </form>

      {/* 3. RESPALDO Y GESTIÓN DE DATOS */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Download className="w-4 h-4 text-slate-700" />
            Respaldo y Restauración de Base de Datos
          </h3>
          <p className="text-xs text-slate-500">
            Descarga un archivo JSON con toda la contabilidad del curso o restaura un respaldo previo.
          </p>
        </div>

        {importStatus && (
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs font-medium text-indigo-900">
            {importStatus}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleDownloadBackup}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-500" />
            Descargar Respaldo JSON
          </button>

          <label className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer">
            <Upload className="w-4 h-4 text-slate-500" />
            Restaurar desde JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
            />
          </label>

          <button
            onClick={handleResetDefaults}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 shadow-xs cursor-pointer ml-auto"
          >
            <RefreshCcw className="w-4 h-4" />
            Restablecer Datos de Demostración
          </button>
        </div>
      </div>

      {/* 5. CIERRE DE SESIÓN DEL SISTEMA */}
      {onLogout && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <LogOut className="w-4 h-4 text-red-600" />
              Cerrar Sesión del Sistema
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Finaliza la sesión actual y regresa a la pantalla principal de bienvenida y selección de acceso (Gestor o Apoderado).
            </p>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
            Cerrar Sesión y Volver al Login
          </button>
        </div>
      )}
    </div>
  );
};
