import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
  Search,
  Eye,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  MessageCircle,
  FileText,
  FileSpreadsheet,
  UserCheck,
  UserX,
  Power,
  CalendarDays,
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
  getStudentAnnualSummary,
  getMonthlyStatus,
  formatCurrency,
} from '../services/storage';
import { openWhatsAppChat } from '../services/whatsapp';
import {
  exportStudentsListToExcel,
  calculateAge,
  formatDateCL,
} from '../services/studentExcel';

interface StudentModuleProps {
  students: Student[];
  onUpdateStudents: (students: Student[]) => void;
  payments: FeePayment[];
  onUpdatePayments: (payments: FeePayment[]) => void;
  year: number;
  config: CourseConfig;
  userRole: UserRole;
}

export const StudentModule: React.FC<StudentModuleProps> = ({
  students,
  onUpdateStudents,
  payments,
  onUpdatePayments,
  year,
  config,
  userRole,
}) => {
  const isAuditor = userRole === 'auditor';

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'active' | 'inactive' | 'up_to_date' | 'debt' | 'exempt'
  >('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [viewingStudent, setViewingStudent] = useState<Student | null>(null);
  const [togglingStudent, setTogglingStudent] = useState<Student | null>(null);

  // Form states
  const [formNombres, setFormNombres] = useState('');
  const [formApellidos, setFormApellidos] = useState('');
  const [formRut, setFormRut] = useState('');
  const [formNombreApoderado, setFormNombreApoderado] = useState('');
  const [formTelefonoApoderado, setFormTelefonoApoderado] = useState('+56 9 ');
  const [formEmailApoderado, setFormEmailApoderado] = useState('');
  const [formTipoIngreso, setFormTipoIngreso] = useState<'full_year' | 'mid_year'>('full_year');
  const [formMesIngreso, setFormMesIngreso] = useState<MonthIndex>(2); // Marzo default for mid-year
  const [formNoPagaCuota, setFormNoPagaCuota] = useState(false);
  const [formActivo, setFormActivo] = useState(true);
  const [formFechaNacimiento, setFormFechaNacimiento] = useState('');
  const [formFechaIngreso, setFormFechaIngreso] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [formObservaciones, setFormObservaciones] = useState('');

  const openCreateModal = () => {
    setFormNombres('');
    setFormApellidos('');
    setFormRut('');
    setFormNombreApoderado('');
    setFormTelefonoApoderado('+56 9 ');
    setFormEmailApoderado('');
    setFormTipoIngreso('full_year');
    setFormMesIngreso(2);
    setFormNoPagaCuota(false);
    setFormActivo(true);
    setFormFechaNacimiento('');
    setFormFechaIngreso(new Date().toISOString().split('T')[0]);
    setFormObservaciones('');
    setEditingStudent(null);
    setModalMode('create');
  };

  const openEditModal = (student: Student) => {
    setFormNombres(student.nombres);
    setFormApellidos(student.apellidos);
    setFormRut(student.rut);
    setFormNombreApoderado(student.nombreApoderado);
    setFormTelefonoApoderado(student.telefonoApoderado);
    setFormEmailApoderado(student.emailApoderado);
    setFormTipoIngreso(student.tipoIngreso);
    setFormMesIngreso(student.mesIngreso);
    setFormNoPagaCuota(student.noPagaCuota);
    setFormActivo(student.activo !== false);
    setFormFechaNacimiento(student.fechaNacimiento || '');
    setFormFechaIngreso(
      student.fechaIngreso ||
        (student.creadoEn ? student.creadoEn.split('T')[0] : '')
    );
    setFormObservaciones(student.observaciones || '');
    setEditingStudent(student);
    setModalMode('edit');
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuditor) return;

    if (modalMode === 'create') {
      const newStudent: Student = {
        id: `stu-${Date.now()}`,
        nombres: formNombres.trim(),
        apellidos: formApellidos.trim(),
        rut: formRut.trim(),
        nombreApoderado: formNombreApoderado.trim(),
        telefonoApoderado: formTelefonoApoderado.trim(),
        emailApoderado: formEmailApoderado.trim(),
        tipoIngreso: formTipoIngreso,
        mesIngreso: formTipoIngreso === 'mid_year' ? formMesIngreso : 0,
        noPagaCuota: formNoPagaCuota,
        activo: formActivo,
        fechaNacimiento: formFechaNacimiento || undefined,
        fechaIngreso: formFechaIngreso || undefined,
        observaciones: formObservaciones.trim(),
        creadoEn: new Date().toISOString(),
      };
      onUpdateStudents([...students, newStudent]);
    } else if (modalMode === 'edit' && editingStudent) {
      const updated = students.map((s) =>
        s.id === editingStudent.id
          ? {
              ...s,
              nombres: formNombres.trim(),
              apellidos: formApellidos.trim(),
              rut: formRut.trim(),
              nombreApoderado: formNombreApoderado.trim(),
              telefonoApoderado: formTelefonoApoderado.trim(),
              emailApoderado: formEmailApoderado.trim(),
              tipoIngreso: formTipoIngreso,
              mesIngreso: formTipoIngreso === 'mid_year' ? formMesIngreso : 0,
              noPagaCuota: formNoPagaCuota,
              activo: formActivo,
              fechaNacimiento: formFechaNacimiento || undefined,
              fechaIngreso: formFechaIngreso || undefined,
              observaciones: formObservaciones.trim(),
            }
          : s
      );
      onUpdateStudents(updated);
    }

    setModalMode(null);
    setEditingStudent(null);
  };

  const handleToggleStatus = (student: Student) => {
    if (isAuditor) return;
    const isCurrentlyActive = student.activo !== false;
    const newStatus = !isCurrentlyActive;
    const updated = students.map((s) =>
      s.id === student.id ? { ...s, activo: newStatus } : s
    );
    onUpdateStudents(updated);
    if (viewingStudent?.id === student.id) {
      setViewingStudent({ ...viewingStudent, activo: newStatus });
    }
    setTogglingStudent(null);
  };

  const handleExportExcel = () => {
    exportStudentsListToExcel(students, config, payments, year);
  };

  // Filtered list
  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      const matchesSearch =
        s.nombres.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.apellidos.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.rut.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.nombreApoderado.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      const isStudentActive = s.activo !== false;

      if (statusFilter === 'active') return isStudentActive;
      if (statusFilter === 'inactive') return !isStudentActive;

      const summary = getStudentAnnualSummary(
        s,
        year,
        payments,
        config.cuotaMensualPorDefecto
      );

      if (statusFilter === 'exempt') return s.noPagaCuota;
      if (statusFilter === 'up_to_date') return isStudentActive && !s.noPagaCuota && summary.isUpToDate;
      if (statusFilter === 'debt') return isStudentActive && !s.noPagaCuota && !summary.isUpToDate;

      return true;
    });
  }, [students, searchTerm, statusFilter, year, payments, config.cuotaMensualPorDefecto]);

  const totalActivosCount = useMemo(
    () => students.filter((s) => s.activo !== false).length,
    [students]
  );
  const totalInactivosCount = useMemo(
    () => students.filter((s) => s.activo === false).length,
    [students]
  );

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-600" />
            Nómina de Alumnos ({students.length})
          </h2>
          <p className="text-xs text-slate-500">
            Administra alumnos activos e inactivos, fechas de nacimiento e ingreso, apoderados y descarga en Excel.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer"
            title="Descargar nómina de alumnos con todos los ítems en formato Excel"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-100" />
            <span>Descargar Excel (.xlsx)</span>
          </button>

          <button
            disabled={isAuditor}
            onClick={openCreateModal}
            className={`flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer ${
              isAuditor ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <UserPlus className="w-4 h-4" />
            <span>Agregar Alumno</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, RUT o apoderado..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        {/* Status segment buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg self-start md:self-auto overflow-x-auto">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({students.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'active'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Activos ({totalActivosCount})
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'inactive'
                ? 'bg-white text-amber-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Inactivos ({totalInactivosCount})
          </button>
          <button
            onClick={() => setStatusFilter('up_to_date')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'up_to_date'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Al Día
          </button>
          <button
            onClick={() => setStatusFilter('debt')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'debt'
                ? 'bg-white text-red-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Con Deuda
          </button>
          <button
            onClick={() => setStatusFilter('exempt')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              statusFilter === 'exempt'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Exentos
          </button>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Alumno</th>
                <th className="py-3 px-3">RUT</th>
                <th className="py-3 px-3 text-center">Estado</th>
                <th className="py-3 px-3">Nacimiento / Ingreso</th>
                <th className="py-3 px-3">Apoderado</th>
                <th className="py-3 px-3">Tipo Ingreso</th>
                <th className="py-3 px-3 text-center">Estado Cuotas {year}</th>
                <th className="py-3 px-3 text-right">Deuda Pendiente</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No se encontraron alumnos con los criterios seleccionados.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const summary = getStudentAnnualSummary(
                    student,
                    year,
                    payments,
                    config.cuotaMensualPorDefecto
                  );
                  const isActivo = student.activo !== false;
                  const age = calculateAge(student.fechaNacimiento);

                  return (
                    <tr
                      key={student.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        !isActivo ? 'bg-slate-50/40 text-slate-500' : ''
                      }`}
                    >
                      {/* Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <span>{student.nombres} {student.apellidos}</span>
                          {!isActivo && (
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-200 px-1.5 py-0.2 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                        {student.observaciones && (
                          <div className="text-[11px] text-slate-500 truncate max-w-xs">
                            {student.observaciones}
                          </div>
                        )}
                      </td>

                      {/* RUT */}
                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {student.rut}
                      </td>

                      {/* Estado */}
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          disabled={isAuditor}
                          onClick={() => setTogglingStudent(student)}
                          title={
                            isActivo
                              ? 'Alumno Activo · Haz clic para desactivar (los pagos se conservan en balances)'
                              : 'Alumno Inactivo · Haz clic para reactivar a la nómina activa'
                          }
                          className={`cursor-pointer transition-transform hover:scale-105 ${
                            isAuditor ? 'cursor-default pointer-events-none' : ''
                          }`}
                        >
                          {isActivo ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                              Activo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-300 hover:bg-slate-200 shadow-2xs">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                              Inactivo
                            </span>
                          )}
                        </button>
                      </td>

                      {/* Nacimiento / Ingreso */}
                      <td className="py-3.5 px-3 space-y-1">
                        <div className="text-slate-800 flex items-center gap-1.5 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="text-slate-500 text-[11px]">Nac:</span>
                          <span className="font-semibold text-slate-700">
                            {student.fechaNacimiento
                              ? formatDateCL(student.fechaNacimiento)
                              : 'No informada'}
                          </span>
                          {age !== null && (
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
                              {age}a
                            </span>
                          )}
                        </div>
                        <div className="text-slate-600 flex items-center gap-1.5 text-xs">
                          <CalendarDays className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="text-slate-500 text-[11px]">Ingreso:</span>
                          <span className="font-semibold text-slate-700">
                            {student.fechaIngreso
                              ? formatDateCL(student.fechaIngreso)
                              : 'No informada'}
                          </span>
                        </div>
                      </td>

                      {/* Parent */}
                      <td className="py-3.5 px-3">
                        <div className="font-semibold text-slate-800">
                          {student.nombreApoderado || 'No registrado'}
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-0.5">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{student.telefonoApoderado || '-'}</span>
                        </div>
                      </td>

                      {/* Admission Type */}
                      <td className="py-3.5 px-3">
                        {student.tipoIngreso === 'full_year' ? (
                          <span className="text-slate-700">Año Completo</span>
                        ) : (
                          <span className="text-amber-700 font-medium">
                            Mediado Año ({MONTH_NAMES[student.mesIngreso]})
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-3 text-center">
                        {!isActivo ? (
                          <span className="text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold border border-slate-200" title="Alumno inactivo: pagos históricos registrados en balances sin deuda pendiente">
                            Inactivo ({summary.paidMonthsCount} pagos)
                          </span>
                        ) : student.noPagaCuota ? (
                          <span className="text-purple-700 bg-purple-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-purple-200">
                            Exento
                          </span>
                        ) : summary.isUpToDate ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-emerald-200">
                            Al Día ({summary.paidMonthsCount}/{summary.applicableMonthsCount})
                          </span>
                        ) : (
                          <span className="text-red-700 bg-red-50 px-2 py-0.5 rounded text-[11px] font-semibold border border-red-200">
                            Con Deuda ({summary.pendingMonthsCount} mes(es))
                          </span>
                        )}
                      </td>

                      {/* Total Debt */}
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-slate-900">
                        {!isActivo ? (
                          <span className="text-slate-400">$0</span>
                        ) : student.noPagaCuota ? (
                          <span className="text-slate-400">$0</span>
                        ) : summary.totalDebt > 0 ? (
                          <span className="text-red-600">
                            {formatCurrency(summary.totalDebt)}
                          </span>
                        ) : (
                          <span className="text-emerald-600">$0</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* Ficha Button */}
                          <button
                            onClick={() => setViewingStudent(student)}
                            title="Ver Ficha Completa del Alumno"
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* WhatsApp Button */}
                          <button
                            onClick={() =>
                              openWhatsAppChat(student, year, payments, config)
                            }
                            title="Enviar estado por WhatsApp"
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>

                          {/* Edit Button */}
                          <button
                            disabled={isAuditor}
                            onClick={() => openEditModal(student)}
                            title="Editar Datos"
                            className={`p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors cursor-pointer ${
                              isAuditor ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Activar / Desactivar Button */}
                          {isActivo ? (
                            <button
                              disabled={isAuditor}
                              onClick={() => setTogglingStudent(student)}
                              title="Desactivar Alumno: se mantiene el historial y pagos en balances, pero se considera inactivo de los reportes"
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-2xs transition-colors cursor-pointer ${
                                isAuditor ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <UserX className="w-3.5 h-3.5 text-amber-600" />
                              <span>Desactivar</span>
                            </button>
                          ) : (
                            <button
                              disabled={isAuditor}
                              onClick={() => setTogglingStudent(student)}
                              title="Reactivar Alumno como alumno regular activo en la nómina"
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-2xs transition-colors cursor-pointer ${
                                isAuditor ? 'opacity-40 cursor-not-allowed' : ''
                              }`}
                            >
                              <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Reactivar</span>
                            </button>
                          )}
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

      {/* CREATE / EDIT STUDENT MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-indigo-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {modalMode === 'create' ? 'Agregar Nuevo Alumno' : 'Editar Datos del Alumno'}
                </h3>
                <p className="text-xs text-indigo-200">
                  {config.nombreCurso} · Período {year}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-indigo-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStudent} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombres *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNombres}
                    onChange={(e) => setFormNombres(e.target.value)}
                    placeholder="Ej: Alexis Andrés"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Apellidos *
                  </label>
                  <input
                    type="text"
                    required
                    value={formApellidos}
                    onChange={(e) => setFormApellidos(e.target.value)}
                    placeholder="Ej: Herrera González"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    RUT Alumno *
                  </label>
                  <input
                    type="text"
                    required
                    value={formRut}
                    onChange={(e) => setFormRut(e.target.value)}
                    placeholder="Ej: 22.987.654-3"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre Apoderado *
                  </label>
                  <input
                    type="text"
                    required
                    value={formNombreApoderado}
                    onChange={(e) => setFormNombreApoderado(e.target.value)}
                    placeholder="Ej: Eduardo Herrera"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Teléfono Apoderado (WhatsApp) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTelefonoApoderado}
                    onChange={(e) => setFormTelefonoApoderado(e.target.value)}
                    placeholder="Ej: +56 9 1234 5678"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Apoderado *
                  </label>
                  <input
                    type="email"
                    required
                    value={formEmailApoderado}
                    onChange={(e) => setFormEmailApoderado(e.target.value)}
                    placeholder="apoderado@ejemplo.com"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                </div>
              </div>

              {/* FECHA DE NACIMIENTO Y FECHA DE INGRESO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Nacimiento
                  </label>
                  <input
                    type="date"
                    value={formFechaNacimiento}
                    onChange={(e) => setFormFechaNacimiento(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                  {formFechaNacimiento && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Edad calculada: <strong>{calculateAge(formFechaNacimiento) ?? '-'} años</strong>
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha de Ingreso Oficial
                  </label>
                  <input
                    type="date"
                    value={formFechaIngreso}
                    onChange={(e) => setFormFechaIngreso(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 bg-white"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Fecha de incorporación a la nómina de alumnos.
                  </p>
                </div>
              </div>

              {/* ESTADO DEL ALUMNO (ACTIVO / INACTIVO) */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Condición de Matrícula / Estado del Alumno
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    formActivo ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900 shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="formActivo"
                      checked={formActivo}
                      onChange={() => setFormActivo(true)}
                      className="text-emerald-600"
                    />
                    <div>
                      <span className="text-xs font-bold block">Alumno Activo</span>
                      <span className="text-[10px] text-emerald-700">Participa y registra cuotas regulares</span>
                    </div>
                  </label>

                  <label className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-all ${
                    !formActivo ? 'bg-amber-50/80 border-amber-300 text-amber-900 shadow-xs' : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                  }`}>
                    <input
                      type="radio"
                      name="formActivo"
                      checked={!formActivo}
                      onChange={() => setFormActivo(false)}
                      className="text-amber-600"
                    />
                    <div>
                      <span className="text-xs font-bold block">Alumno Inactivo (Retirado)</span>
                      <span className="text-[10px] text-amber-700">Conserva pagos en balances sin generar deuda</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* TIPO DE INGRESO: Año completo o Mediado año */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <label className="block text-xs font-bold text-slate-800">
                  Tipo de Ingreso al Curso
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-400">
                    <input
                      type="radio"
                      name="tipoIngreso"
                      checked={formTipoIngreso === 'full_year'}
                      onChange={() => setFormTipoIngreso('full_year')}
                      className="text-indigo-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">Año Completo</span>
                  </label>

                  <label className="flex items-center gap-2 p-2.5 bg-white rounded-lg border border-slate-200 cursor-pointer hover:border-indigo-400">
                    <input
                      type="radio"
                      name="tipoIngreso"
                      checked={formTipoIngreso === 'mid_year'}
                      onChange={() => setFormTipoIngreso('mid_year')}
                      className="text-indigo-600"
                    />
                    <span className="text-xs font-semibold text-slate-800">Mediado Año</span>
                  </label>
                </div>

                {/* Conditional Month Selector if Mediado Año */}
                {formTipoIngreso === 'mid_year' && (
                  <div className="pt-2 animate-fadeIn">
                    <label className="block text-xs font-semibold text-amber-800 mb-1">
                      Mes de Ingreso al Curso (los meses previos figurarán como &quot;No aplica&quot;)
                    </label>
                    <select
                      value={formMesIngreso}
                      onChange={(e) => setFormMesIngreso(Number(e.target.value) as MonthIndex)}
                      className="w-full px-3 py-2 text-xs border border-amber-300 bg-amber-50/50 rounded-lg font-semibold text-slate-900 focus:ring-2 focus:ring-amber-500"
                    >
                      {MONTH_NAMES.map((name, idx) => (
                        <option key={name} value={idx}>
                          {name} (A partir de {name})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* No paga cuota toggle switch */}
              <div className="flex items-center justify-between p-3 bg-purple-50/60 rounded-xl border border-purple-200">
                <div>
                  <span className="text-xs font-bold text-purple-900 block">
                    Beneficio de Beca / Exento de Cuota
                  </span>
                  <span className="text-[11px] text-purple-700">
                    Activar si el alumno no paga cuotas mensuales por acuerdo de curso o directiva.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formNoPagaCuota}
                    onChange={(e) => setFormNoPagaCuota(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                </label>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones / Notas Adicionales
                </label>
                <textarea
                  rows={2}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Información relevante del alumno o apoderado..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
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
                  className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs"
                >
                  {modalMode === 'create' ? 'Crear Alumno' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STUDENT PROFILE SHEET ("FICHA DEL ALUMNO") */}
      {viewingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-100">
            {/* Header */}
            <div className="p-6 bg-slate-900 text-white flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-lg text-white">
                    {viewingStudent.nombres} {viewingStudent.apellidos}
                  </h3>
                  {viewingStudent.activo === false ? (
                    <span className="text-[10px] bg-slate-600 text-white px-2 py-0.5 rounded font-bold">
                      Inactivo / Retirado
                    </span>
                  ) : (
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                      Activo
                    </span>
                  )}
                  {viewingStudent.noPagaCuota && (
                    <span className="text-[10px] bg-purple-600 text-white px-2 py-0.5 rounded font-bold">
                      Exento de Cuota
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  RUT: {viewingStudent.rut} · {config.nombreCurso}
                </p>
              </div>
              <button
                onClick={() => setViewingStudent(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {/* Contact and meta cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Datos del Alumno
                  </h4>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold block">Fecha de Nacimiento:</span>
                    {viewingStudent.fechaNacimiento ? (
                      <span>
                        {formatDateCL(viewingStudent.fechaNacimiento)}
                        {calculateAge(viewingStudent.fechaNacimiento) !== null && (
                          <strong className="text-slate-900 ml-1">
                            ({calculateAge(viewingStudent.fechaNacimiento)} años)
                          </strong>
                        )}
                      </span>
                    ) : (
                      'No registrada'
                    )}
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold block">Fecha de Ingreso Oficial:</span>
                    {viewingStudent.fechaIngreso
                      ? formatDateCL(viewingStudent.fechaIngreso)
                      : 'No registrada'}
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold block">Condición de Matrícula:</span>
                    <span className={viewingStudent.activo !== false ? 'text-emerald-700 font-bold' : 'text-slate-600 font-bold'}>
                      {viewingStudent.activo !== false ? 'Alumno Activo' : 'Alumno Inactivo'}
                    </span>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Datos del Apoderado
                  </h4>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold block">Nombre:</span>
                    {viewingStudent.nombreApoderado || 'No registrado'}
                  </div>
                  <div className="text-xs text-slate-700 flex items-center justify-between">
                    <div>
                      <span className="font-semibold block">Teléfono:</span>
                      {viewingStudent.telefonoApoderado}
                    </div>
                    <button
                      onClick={() =>
                        openWhatsAppChat(viewingStudent, year, payments, config)
                      }
                      className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700 shadow-xs cursor-pointer"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      WhatsApp
                    </button>
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold block">Email:</span>
                    {viewingStudent.emailApoderado}
                  </div>
                </div>
              </div>

              {/* Monthly breakdown table */}
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-2">
                  Historial de Cuotas Mensuales {year}
                </h4>
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Mes</th>
                        <th className="py-2 px-3">Estado</th>
                        <th className="py-2 px-3 text-right">Monto Pagado</th>
                        <th className="py-2 px-3">Fecha de Pago</th>
                        <th className="py-2 px-3">N° Comprobante</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {MONTH_NAMES.map((name, idx) => {
                        const m = idx as MonthIndex;
                        const statusData = getMonthlyStatus(
                          viewingStudent,
                          m,
                          payments,
                          year,
                          config.cuotaMensualPorDefecto
                        );

                        return (
                          <tr key={name} className="hover:bg-slate-50">
                            <td className="py-2 px-3 font-semibold text-slate-800">
                              {name}
                            </td>
                            <td className="py-2 px-3">
                              {statusData.status === 'not_applicable' ? (
                                <span className="text-slate-400">No aplica</span>
                              ) : statusData.status === 'exempt' ? (
                                <span className="text-purple-600 font-semibold">Exento</span>
                              ) : statusData.status === 'paid' ? (
                                <span className="text-emerald-700 font-semibold">✓ Pagado</span>
                              ) : statusData.status === 'partial' ? (
                                <span className="text-sky-700 font-semibold">Abonado</span>
                              ) : (
                                <span className="text-amber-700 font-semibold">Pendiente</span>
                              )}
                            </td>
                            <td className="py-2 px-3 text-right font-mono font-semibold">
                              {statusData.paidAmount > 0
                                ? formatCurrency(statusData.paidAmount)
                                : '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {statusData.payment?.fechaPago || '-'}
                            </td>
                            <td className="py-2 px-3 text-slate-500 font-mono">
                              {statusData.payment?.numeroComprobante || '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() =>
                  openWhatsAppChat(viewingStudent, year, payments, config)
                }
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                Enviar Reporte por WhatsApp
              </button>

              <div className="flex items-center gap-2">
                {!isAuditor && (
                  viewingStudent.activo !== false ? (
                    <button
                      type="button"
                      onClick={() => setTogglingStudent(viewingStudent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-lg shadow-xs cursor-pointer"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      <span>Desactivar Alumno</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setTogglingStudent(viewingStudent)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg shadow-xs cursor-pointer"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Reactivar Alumno</span>
                    </button>
                  )
                )}
                <button
                  type="button"
                  onClick={() => setViewingStudent(null)}
                  className="px-4 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM TOGGLE ACTIVE / INACTIVE MODAL */}
      {togglingStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl text-center space-y-4 border border-slate-100">
            <div className={`w-12 h-12 rounded-2xl mx-auto flex items-center justify-center shadow-xs ${
              togglingStudent.activo !== false ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
            }`}>
              {togglingStudent.activo !== false ? (
                <UserX className="w-6 h-6" />
              ) : (
                <UserCheck className="w-6 h-6" />
              )}
            </div>

            <div>
              <h4 className="font-bold text-slate-900 text-base">
                {togglingStudent.activo !== false ? '¿Desactivar Alumno?' : '¿Reactivar Alumno?'}
              </h4>
              <p className="text-xs text-slate-600 mt-2">
                {togglingStudent.activo !== false ? (
                  <>
                    ¿Deseas marcar como inactivo a <strong>{togglingStudent.nombres} {togglingStudent.apellidos}</strong>?
                    <br /><br />
                    <span className="block p-2.5 bg-slate-50 text-slate-700 rounded-lg border border-slate-200 text-left text-[11px]">
                      <strong>✓ Pagos protegidos:</strong> Todos sus pagos ya realizados se seguirán considerando en los balances financieros y caja, pero el alumno no generará nuevas cuotas pendientes en los reportes de cobranza.
                    </span>
                  </>
                ) : (
                  <>
                    ¿Deseas reactivar a <strong>{togglingStudent.nombres} {togglingStudent.apellidos}</strong> como alumno activo regular en la nómina?
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setTogglingStudent(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleToggleStatus(togglingStudent)}
                className={`px-4 py-2 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer ${
                  togglingStudent.activo !== false
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                {togglingStudent.activo !== false ? 'Sí, desactivar' : 'Sí, reactivar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
