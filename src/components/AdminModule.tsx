import React, { useState, useMemo } from 'react';
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
  Image as ImageIcon,
  RotateCcw,
  Check,
  ClipboardList,
  FileSpreadsheet,
  Filter,
  Search,
  Eye,
  EyeOff,
  History,
  Mail,
  Send,
  Loader2,
  ExternalLink,
  Copy,
  Sparkles,
  CheckCheck,
  BellRing,
  Server,
  Key,
  AtSign,
  Globe,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  CourseConfig,
  ExpenseCategory,
  UserRole,
  GestorUser,
  MovementLog,
  Student,
  FeePayment,
  ExtraIncome,
  MonthIndex,
  MONTH_NAMES,
  SmtpConfig,
} from '../types';
import {
  exportAllDataAsJson,
  importAllDataFromJson,
  resetAllDataToDefaults,
  formatCurrency,
  getStoredMovementLogs,
  clearStoredMovementLogs,
  getMonthlyStatus,
  addMovementLog,
  getStoredAuthSession,
} from '../services/storage';
import { testSmtpConnection, sendEmailViaSmtp } from '../services/emailService';
import { getEffectiveLogo } from '../assets/logo';

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
  students?: Student[];
  payments?: FeePayment[];
  extraIncomes?: ExtraIncome[];
  year?: number;
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
  students = [],
  payments = [],
  extraIncomes = [],
  year = new Date().getFullYear(),
}) => {
  const isAuditor = currentRole === 'auditor';
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // New Gestor User Form State
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'auditor'>('auditor');
  const [showAddUserModal, setShowAddUserModal] = useState(false);

  // Password visibility controls
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showSmtpPassword, setShowSmtpPassword] = useState(false);

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
    setShowEditPassword(false);
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
  const [logoUrl, setLogoUrl] = useState<string>(config.logoUrl || '');
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);

  // Bank details
  const [banco, setBanco] = useState(config.datosBancarios.banco);
  const [tipoCuenta, setTipoCuenta] = useState(config.datosBancarios.tipoCuenta);
  const [numeroCuenta, setNumeroCuenta] = useState(config.datosBancarios.numeroCuenta);
  const [titularNombre, setTitularNombre] = useState(config.datosBancarios.titularNombre);
  const [titularRut, setTitularRut] = useState(config.datosBancarios.titularRut);
  const [emailConfirmacion, setEmailConfirmacion] = useState(config.datosBancarios.emailConfirmacion);

  // SMTP Configuration State
  const initialSmtp: SmtpConfig = config.smtpConfig || {
    activo: false,
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    user: '',
    pass: '',
    fromEmail: config.datosBancarios.emailConfirmacion || 'tesoreria.curso@gmail.com',
    fromName: `Tesorería ${config.nombreCurso}`,
  };

  const [smtpActivo, setSmtpActivo] = useState(initialSmtp.activo);
  const [smtpHost, setSmtpHost] = useState(initialSmtp.host);
  const [smtpPort, setSmtpPort] = useState(initialSmtp.port);
  const [smtpSecure, setSmtpSecure] = useState(initialSmtp.secure);
  const [smtpUser, setSmtpUser] = useState(initialSmtp.user);
  const [smtpPass, setSmtpPass] = useState(initialSmtp.pass);
  const [smtpFromEmail, setSmtpFromEmail] = useState(initialSmtp.fromEmail);
  const [smtpFromName, setSmtpFromName] = useState(initialSmtp.fromName);

  // SMTP Test State
  const [testEmailRecipient, setTestEmailRecipient] = useState(
    initialSmtp.user || config.datosBancarios.emailConfirmacion || 'eduardo.herrera22@gmail.com'
  );
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [smtpTestResult, setSmtpTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleApplyPreset = (provider: 'gmail' | 'outlook' | 'yahoo') => {
    if (provider === 'gmail') {
      setSmtpHost('smtp.gmail.com');
      setSmtpPort(587);
      setSmtpSecure(false);
      setSmtpActivo(true);
    } else if (provider === 'outlook') {
      setSmtpHost('smtp.office365.com');
      setSmtpPort(587);
      setSmtpSecure(false);
      setSmtpActivo(true);
    } else if (provider === 'yahoo') {
      setSmtpHost('smtp.mail.yahoo.com');
      setSmtpPort(465);
      setSmtpSecure(true);
      setSmtpActivo(true);
    }
  };

  const handleTestSmtp = async () => {
    if (!smtpUser.trim() || !smtpPass.trim()) {
      setSmtpTestResult({
        success: false,
        message: 'Debes ingresar el usuario SMTP y la contraseña o clave de aplicación de 16 caracteres para probar la conexión.',
      });
      return;
    }

    setIsTestingSmtp(true);
    setSmtpTestResult(null);

    const testConfig: SmtpConfig = {
      activo: smtpActivo,
      host: smtpHost.trim(),
      port: Number(smtpPort),
      secure: smtpSecure,
      user: smtpUser.trim(),
      pass: smtpPass.trim(),
      fromEmail: smtpFromEmail.trim() || smtpUser.trim(),
      fromName: smtpFromName.trim() || `Tesorería ${nombreCurso}`,
    };

    const res = await testSmtpConnection(testConfig, testEmailRecipient.trim());
    setIsTestingSmtp(false);

    if (res.success) {
      setSmtpTestResult({
        success: true,
        message: `¡Conexión SMTP exitosa! Se envió el correo de prueba a ${testEmailRecipient.trim()}. Revisa tu bandeja de entrada o spam.`,
      });
      // Guardar automáticamente configuración válida
      onUpdateConfig({
        ...config,
        smtpConfig: testConfig,
      });
    } else {
      setSmtpTestResult({
        success: false,
        message: res.error || 'Error al conectar con el servidor SMTP.',
      });
    }
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoUploadError(null);

    // Limit to 2.5 MB
    if (file.size > 2.5 * 1024 * 1024) {
      setLogoUploadError('La imagen seleccionada supera los 2.5 MB. Elige una imagen más comprimida.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setLogoUrl(base64);
      onUpdateConfig({
        ...config,
        logoUrl: base64,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    };
    reader.onerror = () => {
      setLogoUploadError('Ocurrió un error al procesar la imagen seleccionada.');
    };
    reader.readAsDataURL(file);
  };

  const handleResetLogoToDefault = () => {
    setLogoUrl('');
    setLogoUploadError(null);
    onUpdateConfig({
      ...config,
      logoUrl: undefined,
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CourseConfig = {
      ...config,
      nombreCurso: nombreCurso.trim(),
      institucion: institucion.trim(),
      cuotaMensualPorDefecto: Number(cuotaMensual),
      logoUrl: logoUrl.trim() || undefined,
      datosBancarios: {
        banco: banco.trim(),
        tipoCuenta: tipoCuenta.trim(),
        numeroCuenta: numeroCuenta.trim(),
        titularNombre: titularNombre.trim(),
        titularRut: titularRut.trim(),
        emailConfirmacion: emailConfirmacion.trim(),
      },
      smtpConfig: {
        activo: smtpActivo,
        host: smtpHost.trim(),
        port: Number(smtpPort),
        secure: smtpSecure,
        user: smtpUser.trim(),
        pass: smtpPass.trim(),
        fromEmail: smtpFromEmail.trim() || smtpUser.trim(),
        fromName: smtpFromName.trim() || `Tesorería ${nombreCurso.trim()}`,
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

  // Movement Logs State & Handlers
  const [movementLogs, setMovementLogs] = useState<MovementLog[]>(() => getStoredMovementLogs());
  const [logFilterModulo, setLogFilterModulo] = useState<string>('todos');
  const [logSearchQuery, setLogSearchQuery] = useState<string>('');
  const [selectedLogDetail, setSelectedLogDetail] = useState<MovementLog | null>(null);
  const [showConfirmClearLogsModal, setShowConfirmClearLogsModal] = useState(false);

  // Email Notification Task State
  const [showEmailNotifyModal, setShowEmailNotifyModal] = useState(false);
  const [isSendingEmails, setIsSendingEmails] = useState(false);
  const [sentDebtorIds, setSentDebtorIds] = useState<string[]>([]);
  const [currentSendingIndex, setCurrentSendingIndex] = useState<number>(-1);
  const [emailTaskCompleted, setEmailTaskCompleted] = useState(false);
  const [copiedEmailId, setCopiedEmailId] = useState<string | null>(null);
  const [previewDebtor, setPreviewDebtor] = useState<{
    student: Student;
    email: string;
    apoderadoNombre: string;
    totalDebt: number;
    unpaidItems: { concepto: string; monto: number }[];
    emailSubject: string;
    emailBody: string;
  } | null>(null);

  const currentYear = year || config.currentYear || new Date().getFullYear();

  // Calculate list of debtors with pending payments up to current date
  const debtorList = useMemo(() => {
    if (!students || students.length === 0) return [];

    const result: {
      student: Student;
      email: string;
      apoderadoNombre: string;
      totalDebt: number;
      unpaidItems: { concepto: string; monto: number }[];
      emailSubject: string;
      emailBody: string;
    }[] = [];

    const today = new Date();
    const isCurrentYear = today.getFullYear() === currentYear;
    const maxMonthIndex = isCurrentYear ? today.getMonth() : 11;

    students.forEach((student) => {
      if (student.noPagaCuota || student.activo === false) return;

      const unpaidItems: { concepto: string; monto: number }[] = [];

      // Monthly fees up to current date/month
      for (let m = 0; m <= Math.min(11, maxMonthIndex); m++) {
        const { status, paidAmount, expectedAmount } = getMonthlyStatus(
          student,
          m as MonthIndex,
          payments,
          currentYear,
          config.cuotaMensualPorDefecto
        );

        if (status === 'pending' && expectedAmount > 0) {
          unpaidItems.push({
            concepto: `Cuota ${MONTH_NAMES[m as MonthIndex]} ${currentYear}`,
            monto: expectedAmount,
          });
        } else if (status === 'partial' && expectedAmount > paidAmount) {
          unpaidItems.push({
            concepto: `Cuota ${MONTH_NAMES[m as MonthIndex]} ${currentYear} (Saldo Restante)`,
            monto: expectedAmount - paidAmount,
          });
        }
      }

      // Extra fixed incomes
      if (extraIncomes && extraIncomes.length > 0) {
        extraIncomes
          .filter(
            (e) =>
              e.year === currentYear &&
              e.tipoCobro === 'fijo_por_alumno' &&
              (e.montoPorAlumno || 0) > 0
          )
          .forEach((e) => {
            const isPaid = (e.alumnosPagados || []).includes(student.id);
            const isExempt = (e.alumnosExentos || []).includes(student.id);
            if (!isPaid && !isExempt) {
              unpaidItems.push({
                concepto: `Actividad Extra: ${e.concepto}`,
                monto: e.montoPorAlumno || 0,
              });
            }
          });
      }

      if (unpaidItems.length > 0) {
        const totalDebt = unpaidItems.reduce((acc, it) => acc + it.monto, 0);
        const email = student.emailApoderado?.trim() || '';
        const apoderadoNombre = student.nombreApoderado?.trim() || 'Apoderado/a';

        const emailSubject = `[Recordatorio de Pago] Estado de Cuotas - ${config.nombreCurso} - Alumno: ${student.nombres} ${student.apellidos}`;

        const emailBody = `Estimado/a ${apoderadoNombre}:

Junto con saludar cordialmente desde la directiva y tesorería de ${config.nombreCurso} (${config.institucion}), le escribimos para informarle el estado de cuotas y compromisos financieros a la fecha para su pupilo/a: ${student.nombres} ${student.apellidos} (RUT: ${student.rut}).

DETALLE DE CUOTAS Y CONCEPTOS PENDIENTES:
${unpaidItems.map((item, idx) => `${idx + 1}. ${item.concepto}: ${formatCurrency(item.monto)}`).join('\n')}

TOTAL ADEUDADO A LA FECHA: ${formatCurrency(totalDebt)}

DATOS BANCARIOS PARA TRANSFERENCIA ELECTRÓNICA:
• Banco: ${config.datosBancarios.banco}
• Tipo de Cuenta: ${config.datosBancarios.tipoCuenta}
• N° de Cuenta: ${config.datosBancarios.numeroCuenta}
• Titular: ${config.datosBancarios.titularNombre}
• RUT: ${config.datosBancarios.titularRut}
• Email para envío de comprobante: ${config.datosBancarios.emailConfirmacion}

IMPORTANTE:
Al transferir, por favor indique en el asunto o comentario el nombre del alumno/a (${student.nombres} ${student.apellidos}) y envíe el comprobante a ${config.datosBancarios.emailConfirmacion}.

Agradecemos su compromiso y puntualidad con los fondos del curso.

Atentamente,
Tesorería y Directiva
${config.nombreCurso} · ${config.institucion}`;

        result.push({
          student,
          email,
          apoderadoNombre,
          totalDebt,
          unpaidItems,
          emailSubject,
          emailBody,
        });
      }
    });

    return result;
  }, [students, payments, extraIncomes, currentYear, config]);

  const totalConsolidatedDebt = useMemo(() => {
    return debtorList.reduce((acc, d) => acc + d.totalDebt, 0);
  }, [debtorList]);

  // Execute Automated Notification Task
  const handleExecuteAutomatedNotifications = async () => {
    if (isSendingEmails || debtorList.length === 0) return;

    setIsSendingEmails(true);
    setEmailTaskCompleted(false);
    setSentDebtorIds([]);
    setCurrentSendingIndex(0);

    const session = getStoredAuthSession();
    const gestorName = session?.gestorUser?.nombre || gestorUsers.find((u) => u.role === currentRole)?.nombre || 'Administrador General';

    // Current active SMTP config
    const activeSmtp: SmtpConfig = config.smtpConfig || {
      activo: smtpActivo,
      host: smtpHost.trim(),
      port: Number(smtpPort),
      secure: smtpSecure,
      user: smtpUser.trim(),
      pass: smtpPass.trim(),
      fromEmail: smtpFromEmail.trim() || smtpUser.trim(),
      fromName: smtpFromName.trim() || `Tesorería ${config.nombreCurso}`,
    };

    const isSmtpReady = Boolean(activeSmtp.user && activeSmtp.pass);

    for (let i = 0; i < debtorList.length; i++) {
      setCurrentSendingIndex(i);
      const debtor = debtorList[i];

      let deliveryStatus = 'Registrado';
      let messageId: string | undefined;
      let sendError: string | undefined;

      // Real email dispatch via backend SMTP endpoint
      if (isSmtpReady && debtor.email) {
        try {
          const res = await sendEmailViaSmtp({
            to: debtor.email,
            subject: debtor.emailSubject,
            text: debtor.emailBody,
            smtpConfig: activeSmtp,
          });
          if (res.success) {
            deliveryStatus = 'Enviado y entregado vía SMTP';
            messageId = res.messageId;
          } else {
            deliveryStatus = `Fallo SMTP: ${res.error}`;
            sendError = res.error;
          }
        } catch (e: any) {
          deliveryStatus = `Error: ${e.message}`;
          sendError = e.message;
        }
      } else {
        // Pausa breve en caso de que aún no configure SMTP
        await new Promise((resolve) => setTimeout(resolve, 350));
      }

      // Register in Audit Movement Log
      addMovementLog({
        modulo: 'cuotas',
        tipoAccion: 'notificacion_enviada',
        titulo: 'Correo de Cobranza Despachado a Apoderado',
        descripcion: `Notificación para ${debtor.email || 'correo no registrado'} (${debtor.apoderadoNombre}) por deuda de ${formatCurrency(debtor.totalDebt)} para el alumno ${debtor.student.nombres} ${debtor.student.apellidos}. Estado: ${deliveryStatus}.`,
        usuario: gestorName,
        rol: currentRole,
        montoAfectado: debtor.totalDebt,
        referenciaId: debtor.student.id,
        referenciaNombre: `${debtor.student.nombres} ${debtor.student.apellidos}`,
        detallesAdicionales: {
          emailDestino: debtor.email || 'No registrado',
          apoderado: debtor.apoderadoNombre,
          conceptosImpagos: debtor.unpaidItems.map((u) => u.concepto).join(', '),
          totalAdeudado: debtor.totalDebt,
          asunto: debtor.emailSubject,
          servidorSmtp: isSmtpReady ? `${activeSmtp.host}:${activeSmtp.port}` : 'Cliente local / Sin credenciales SMTP',
          messageId,
          error: sendError,
        },
      });

      setSentDebtorIds((prev) => [...prev, debtor.student.id]);
    }

    setIsSendingEmails(false);
    setEmailTaskCompleted(true);
    setMovementLogs(getStoredMovementLogs());
  };

  const handleCopyEmail = (debtor: (typeof debtorList)[0]) => {
    navigator.clipboard.writeText(debtor.emailBody);
    setCopiedEmailId(debtor.student.id);
    setTimeout(() => setCopiedEmailId(null), 2500);
  };

  const handleExportDebtorsReport = () => {
    const exportData = debtorList.map((d) => ({
      Alumno: `${d.student.nombres} ${d.student.apellidos}`,
      RUT: d.student.rut,
      Apoderado: d.apoderadoNombre,
      'Email Apoderado': d.email || 'Sin correo',
      'Total Adeudado': formatCurrency(d.totalDebt),
      'Conceptos Impagos': d.unpaidItems.map((u) => u.concepto).join('; '),
      'Estado Notificación': sentDebtorIds.includes(d.student.id) ? 'Notificado por Correo' : 'Pendiente',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reporte_Impagos');
    XLSX.writeFile(
      wb,
      `Reporte_Impagos_${config.nombreCurso.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
  };

  const handleRefreshLogs = () => {
    setMovementLogs(getStoredMovementLogs());
  };

  const handleClearLogs = () => {
    if (currentRole === 'auditor') {
      return;
    }
    setShowConfirmClearLogsModal(true);
  };

  const handleConfirmClearLogs = () => {
    clearStoredMovementLogs();
    setMovementLogs([]);
    setShowConfirmClearLogsModal(false);
  };

  const filteredLogs = useMemo(() => {
    return movementLogs.filter((log) => {
      if (logFilterModulo !== 'todos' && log.modulo !== logFilterModulo) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const query = logSearchQuery.toLowerCase().trim();
        const inTitle = log.titulo.toLowerCase().includes(query);
        const inDesc = log.descripcion.toLowerCase().includes(query);
        const inUser = (log.usuario || '').toLowerCase().includes(query);
        const inRef = (log.referenciaNombre || '').toLowerCase().includes(query);
        const inAction = log.tipoAccion.toLowerCase().includes(query);
        if (!inTitle && !inDesc && !inUser && !inRef && !inAction) {
          return false;
        }
      }
      return true;
    });
  }, [movementLogs, logFilterModulo, logSearchQuery]);

  const handleExportLogsToExcel = () => {
    const exportData = filteredLogs.map((l) => ({
      ID: l.id,
      'Fecha y Hora': new Date(l.fechaHora).toLocaleString('es-CL'),
      Módulo: l.modulo.toUpperCase(),
      Acción: l.tipoAccion,
      Título: l.titulo,
      Descripción: l.descripcion,
      'Monto Afectado': l.montoAfectado ? formatCurrency(l.montoAfectado) : '$0',
      Usuario: l.usuario || 'Sistema',
      Rol: l.rol || 'admin',
      Referencia: l.referenciaNombre || '-',
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Historial_Movimientos');
    XLSX.writeFile(
      wb,
      `Auditoria_Movimientos_${config.nombreCurso.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
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

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            type="button"
            disabled={isAuditor}
            onClick={() => {
              if (isAuditor) return;
              setShowEmailNotifyModal(true);
            }}
            className={`flex items-center gap-2 px-3.5 py-2 text-xs font-bold rounded-xl shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
            }`}
            title={
              isAuditor
                ? 'Función deshabilitada para el rol Auditor (solo administradores pueden notificar impagos)'
                : 'Ejecutar tarea automática para notificar por correo a todos los apoderados con pagos pendientes a la fecha'
            }
          >
            <Mail className="w-4 h-4 text-indigo-200" />
            <span>Notificar Impagos por Correo</span>
            {debtorList.length > 0 && (
              <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${isAuditor ? 'bg-slate-400 text-white' : 'bg-red-500 text-white'}`}>
                {debtorList.length}
              </span>
            )}
          </button>

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
      </div>

      {/* BANNER INFORMATIVO CUANDO ES ROL AUDITOR */}
      {isAuditor && (
        <div className="p-3.5 bg-amber-50 border border-amber-300/80 rounded-xl text-xs text-amber-950 flex items-start gap-3 shadow-xs">
          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-0.5">
            <strong className="font-bold text-amber-950 block text-xs">
              Sesión con Rol Auditor (Modo Consulta y Fiscalización)
            </strong>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Las funciones de gestión de usuarios, edición de parámetros del curso, cambio de logo, cuentas bancarias, configuración SMTP, notificación masiva de impagos y respaldo/restauración de base de datos se encuentran deshabilitadas para este perfil.
            </p>
          </div>
        </div>
      )}

      {/* BANNER TAREA AUTOMÁTICA DE COBRANZA POR CORREO */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-900 rounded-2xl p-5 text-white shadow-md border border-indigo-800/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="p-1.5 bg-indigo-500/20 rounded-lg border border-indigo-400/30">
              <Mail className="w-4 h-4 text-indigo-300" />
            </span>
            <h3 className="font-bold text-sm text-white tracking-tight">
              Tarea Automática: Notificar Impagos por Correo a Apoderados
            </h3>
            {debtorList.length > 0 ? (
              <span className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-red-400/30">
                {debtorList.length} apoderados con deuda ({formatCurrency(totalConsolidatedDebt)})
              </span>
            ) : (
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-emerald-400/30">
                Todos los alumnos al día a la fecha
              </span>
            )}
          </div>
          <p className="text-xs text-indigo-200 max-w-2xl leading-relaxed">
            Ejecuta un proceso que calcula todos los meses y actividades impagas hasta la fecha, redacta el desglose formal con los datos bancarios para transferencia y notifica a cada apoderado a su casilla de correo registrada, registrando la auditoría en el sistema.
          </p>
        </div>

        <button
          type="button"
          disabled={isAuditor}
          onClick={() => {
            if (isAuditor) return;
            setShowEmailNotifyModal(true);
          }}
          className={`flex items-center gap-2 px-4 py-2.5 font-black text-xs rounded-xl shadow-lg transition-all shrink-0 ${
            isAuditor
              ? 'bg-slate-800 text-slate-400 border border-slate-700 cursor-not-allowed opacity-60'
              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20 cursor-pointer'
          }`}
          title={isAuditor ? 'Función deshabilitada para el rol Auditor' : 'Notificar Impagos por Correo'}
        >
          <Send className="w-4 h-4" />
          <span>Notificar Impagos por Correo</span>
        </button>
      </div>

      {/* 1. SELECCIÓN DE ROLES DE USUARIO (SOLO INFORMATIVO) */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-600" />
              Roles y Perfiles de Acceso al Sistema
            </h3>
            <span className="text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200 px-2.5 py-0.5 rounded-full">
              Panel Informativo de Permisos
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Los permisos se determinan de forma estricta al iniciar sesión con las credenciales de cada usuario. No es posible conmutar roles manualmente para garantizar la seguridad de la auditoría y la integridad de los registros contables.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Admin card (Solo informativo) */}
          <div
            className={`p-4 rounded-xl border-2 cursor-default select-none transition-all ${
              currentRole === 'admin'
                ? 'border-indigo-600 bg-indigo-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Usuario Administrador
              </span>
              {currentRole === 'admin' ? (
                <span className="text-[10px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  ACTIVO EN SESIÓN
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  INFORMATIVO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Control total: registrar y anular pagos, eximir cuotas del mes, agregar y editar alumnos, gastos con boletas, ingresos extras y parámetros bancarios.
            </p>
          </div>

          {/* Auditor card (Solo informativo) */}
          <div
            className={`p-4 rounded-xl border-2 cursor-default select-none transition-all ${
              currentRole === 'auditor'
                ? 'border-amber-600 bg-amber-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-amber-900">
                <UserCheck className="w-4 h-4 text-amber-600" />
                Usuario Auditor
              </span>
              {currentRole === 'auditor' ? (
                <span className="text-[10px] font-bold bg-amber-600 text-white px-2 py-0.5 rounded-full">
                  ACTIVO EN SESIÓN
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  INFORMATIVO
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600">
              Revisar cuotas, fondos, boletas, rendiciones y reportes. Modo solo lectura de fiscalización que protege los datos contra modificaciones o nuevos períodos contables.
            </p>
          </div>

          {/* Apoderado card (Solo informativo) */}
          <div
            className={`p-4 rounded-xl border-2 cursor-default select-none transition-all ${
              currentRole === 'apoderado'
                ? 'border-emerald-600 bg-emerald-50/50 shadow-xs'
                : 'border-slate-200 bg-slate-50/50 opacity-80'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="flex items-center gap-1.5 font-bold text-xs text-emerald-900">
                <User className="w-4 h-4 text-emerald-600" />
                Portal Apoderado
              </span>
              {currentRole === 'apoderado' ? (
                <span className="text-[10px] font-bold bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                  ACTIVO EN SESIÓN
                </span>
              ) : (
                <span className="text-[10px] font-semibold bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full">
                  INFORMATIVO
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
            disabled={isAuditor}
            onClick={() => {
              if (isAuditor) return;
              setNewUsername('');
              setNewPassword('');
              setNewNombre('');
              setNewRole('auditor');
              setShowAddUserModal(true);
            }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
            }`}
            title={isAuditor ? 'Función deshabilitada para el rol Auditor (solo administradores)' : 'Crear nuevo usuario gestor'}
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
                  <td className="py-3 px-3 font-mono text-slate-500 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-slate-600 select-all tracking-wider text-xs">
                        {revealedPasswords[user.id] ? user.password : '••••••••'}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedPasswords((prev) => ({
                            ...prev,
                            [user.id]: !prev[user.id],
                          }))
                        }
                        className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                        title={revealedPasswords[user.id] ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {revealedPasswords[user.id] ? (
                          <EyeOff className="w-3.5 h-3.5" />
                        ) : (
                          <Eye className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
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
                        disabled={isAuditor}
                        onClick={() => {
                          if (isAuditor) return;
                          handleOpenEditUser(user);
                        }}
                        className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                          isAuditor
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                            : 'text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer'
                        }`}
                        title={isAuditor ? 'Función deshabilitada para el rol Auditor' : `Editar usuario ${user.nombre}`}
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Editar</span>
                      </button>

                      {user.username !== 'admin' && user.username !== 'auditor' ? (
                        <button
                          type="button"
                          disabled={isAuditor}
                          onClick={() => {
                            if (isAuditor) return;
                            if (window.confirm(`¿Seguro que deseas eliminar al usuario "${user.nombre}"?`)) {
                              onUpdateGestorUsers(gestorUsers.filter((u) => u.id !== user.id));
                            }
                          }}
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-md transition-colors ${
                            isAuditor
                              ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-50'
                              : 'text-red-600 hover:text-red-800 bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer'
                          }`}
                          title={isAuditor ? 'Función deshabilitada para el rol Auditor' : 'Eliminar usuario'}
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
                  <div className="relative">
                    <input
                      type={showEditPassword ? 'text' : 'password'}
                      required
                      value={editPassword}
                      onChange={(e) => setEditPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowEditPassword(!showEditPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showEditPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showEditPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title={showNewPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                    >
                      {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
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

      {/* 3. LOG Y REGISTRO DE AUDITORÍA DE MOVIMIENTOS CONTABLES */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              <History className="w-4 h-4 text-emerald-600" />
              Registro y Auditoría de Movimientos (Pagos, Gastos y Exenciones)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historial de trazabilidad cronológica de todas las transacciones: cuotas pagadas, exenciones, anulaciones, egresos rendidos con boleta y actividades extraordinarias.
            </p>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={handleExportLogsToExcel}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Descargar libro de auditoría en formato Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exportar Excel</span>
            </button>
            <button
              type="button"
              onClick={handleRefreshLogs}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Recargar los registros de movimientos"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
              <span>Actualizar</span>
            </button>
            <button
              type="button"
              onClick={handleClearLogs}
              disabled={currentRole === 'auditor'}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              title={currentRole === 'auditor' ? 'Solo administradores pueden vaciar logs' : 'Vaciar todo el historial de auditoría'}
            >
              <Trash2 className="w-3.5 h-3.5 text-red-500" />
              <span className="hidden md:inline">Vaciar Logs</span>
            </button>
          </div>
        </div>

        {/* KPI Mini Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-slate-500 block">Total Movimientos</span>
            <span className="text-lg font-black text-slate-900 font-mono">
              {movementLogs.length}
            </span>
          </div>
          <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-emerald-700 block">Pagos de Cuotas</span>
            <span className="text-lg font-black text-emerald-900 font-mono">
              {movementLogs.filter((l) => l.modulo === 'cuotas').length}
            </span>
          </div>
          <div className="bg-teal-50/70 border border-teal-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-teal-700 block">Cuotas Eximidas</span>
            <span className="text-lg font-black text-teal-900 font-mono">
              {
                movementLogs.filter(
                  (l) =>
                    l.tipoAccion.includes('eximi') ||
                    l.titulo.toLowerCase().includes('exim') ||
                    l.descripcion.toLowerCase().includes('eximi')
                ).length
              }
            </span>
          </div>
          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3">
            <span className="text-[11px] font-semibold text-rose-700 block">Gastos Rendidos</span>
            <span className="text-lg font-black text-rose-900 font-mono">
              {movementLogs.filter((l) => l.modulo === 'gastos').length}
            </span>
          </div>
        </div>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
          {/* Module Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setLogFilterModulo('todos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logFilterModulo === 'todos'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({movementLogs.length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilterModulo('cuotas')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logFilterModulo === 'cuotas'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
            >
              Cuotas ({movementLogs.filter((l) => l.modulo === 'cuotas').length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilterModulo('gastos')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logFilterModulo === 'gastos'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              Gastos ({movementLogs.filter((l) => l.modulo === 'gastos').length})
            </button>
            <button
              type="button"
              onClick={() => setLogFilterModulo('ingresos_extra')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                logFilterModulo === 'ingresos_extra'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
            >
              Ingresos Extra ({movementLogs.filter((l) => l.modulo === 'ingresos_extra').length})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={logSearchQuery}
              onChange={(e) => setLogSearchQuery(e.target.value)}
              placeholder="Buscar en auditoría..."
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
            />
            {logSearchQuery && (
              <button
                type="button"
                onClick={() => setLogSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="max-h-[460px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-10 bg-slate-100 border-b border-slate-200 shadow-2xs">
                <tr className="text-slate-700 font-bold">
                  <th className="py-2.5 px-3 whitespace-nowrap">Fecha y Hora</th>
                  <th className="py-2.5 px-3">Módulo</th>
                  <th className="py-2.5 px-3">Acción Registrada</th>
                  <th className="py-2.5 px-3">Descripción y Referencia</th>
                  <th className="py-2.5 px-3 text-right">Monto Afectado</th>
                  <th className="py-2.5 px-3 text-center">Gestor Responsable</th>
                  <th className="py-2.5 px-2 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No se encontraron registros de auditoría para los filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log) => {
                    const isExemption =
                      log.tipoAccion.includes('eximi') ||
                      log.titulo.toLowerCase().includes('exim') ||
                      log.descripcion.toLowerCase().includes('eximi');
                    const isRevoke = log.tipoAccion.includes('anula') || log.tipoAccion.includes('elimina');
                    const isCuota = log.modulo === 'cuotas';
                    const isGasto = log.modulo === 'gastos';

                    return (
                      <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 text-slate-600 font-mono whitespace-nowrap text-[11px]">
                          {new Date(log.fechaHora).toLocaleDateString('es-CL', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                          })}{' '}
                          <span className="text-slate-400">
                            {new Date(log.fechaHora).toLocaleTimeString('es-CL', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isCuota && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Cuotas
                            </span>
                          )}
                          {isGasto && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                              Gastos
                            </span>
                          )}
                          {log.modulo === 'ingresos_extra' && (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              Extra
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {isExemption ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-teal-50 text-teal-800 border border-teal-200">
                              <ShieldCheck className="w-3 h-3 text-teal-600" />
                              Eximido / Saldado
                            </span>
                          ) : isRevoke ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
                              <AlertCircle className="w-3 h-3 text-red-500" />
                              Anulado / Eliminado
                            </span>
                          ) : isCuota ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Pago Registrado
                            </span>
                          ) : isGasto ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-800 border border-purple-200">
                              Rendición Boleta
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                              {log.tipoAccion}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium">
                          <div className="line-clamp-1 text-xs">
                            <strong className="text-slate-900 font-semibold">{log.titulo}:</strong>{' '}
                            <span className="text-slate-600">{log.descripcion}</span>
                          </div>
                          {log.referenciaNombre && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Ref: {log.referenciaNombre}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold whitespace-nowrap">
                          {isExemption ? (
                            <span className="text-teal-700 bg-teal-50 border border-teal-200 px-1.5 py-0.5 rounded text-[11px]">
                              $0 (Saldado)
                            </span>
                          ) : log.montoAfectado ? (
                            <span className={isGasto ? 'text-rose-700' : 'text-emerald-700'}>
                              {isGasto ? '-' : '+'}
                              {formatCurrency(log.montoAfectado)}
                            </span>
                          ) : (
                            <span className="text-slate-400">$0</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 font-bold text-xs text-slate-800 border border-slate-200">
                            {log.usuario || 'Gestor'}
                          </span>
                        </td>
                        <td className="py-2.5 px-2 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedLogDetail(log)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                            title="Ver detalles completos del movimiento"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <div className="bg-slate-50 px-4 py-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
            <span>
              Mostrando <strong>{filteredLogs.length}</strong> de <strong>{movementLogs.length}</strong> movimientos registrados
            </span>
            <span className="font-mono text-slate-400">Trazabilidad SHA / LocalStorage v1</span>
          </div>
        </div>
      </div>

      {/* MODAL DETALLES COMPLETOS DEL MOVIMIENTO */}
      {selectedLogDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-sm">Detalle de Registro de Auditoría</h4>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLogDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">{selectedLogDetail.titulo}</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    ID: {selectedLogDetail.id}
                  </span>
                </div>
                <p className="text-slate-600">{selectedLogDetail.descripcion}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Fecha y Hora Exacta
                  </span>
                  <span className="font-mono font-semibold text-slate-800">
                    {new Date(selectedLogDetail.fechaHora).toLocaleString('es-CL')}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Monto Involucrado
                  </span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {selectedLogDetail.montoAfectado
                      ? formatCurrency(selectedLogDetail.montoAfectado)
                      : '$0 (Exención/Ajuste)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Gestor Responsable
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedLogDetail.usuario || 'Gestor'}
                  </span>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Módulo / Tipo
                  </span>
                  <span className="font-bold text-slate-800 uppercase">
                    {selectedLogDetail.modulo}
                  </span>{' '}
                  <span className="text-[10px] text-slate-500 block">
                    {selectedLogDetail.tipoAccion}
                  </span>
                </div>
              </div>

              {selectedLogDetail.referenciaNombre && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                    Referencia (Alumno / Proveedor / Actividad)
                  </span>
                  <span className="font-bold text-slate-800">
                    {selectedLogDetail.referenciaNombre}
                  </span>
                  {selectedLogDetail.referenciaId && (
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      (ID: {selectedLogDetail.referenciaId})
                    </span>
                  )}
                </div>
              )}

              {selectedLogDetail.detallesAdicionales && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1.5">
                    Metadatos y Parámetros Adicionales
                  </span>
                  <div className="space-y-1 font-mono text-[11px] text-slate-700">
                    {Object.entries(selectedLogDetail.detallesAdicionales).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between border-b border-slate-200/60 pb-0.5">
                        <span className="text-slate-500 capitalize">{key}:</span>
                        <span className="font-bold">{String(val)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedLogDetail(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR VACIAR LOGS (Compatible con iframes sin window.confirm) */}
      {showConfirmClearLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-red-200 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-100 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-bold text-base text-slate-900">
                  ¿Vaciar Historial de Auditoría?
                </h3>
                <p className="text-xs text-slate-500">
                  Se eliminarán permanentemente {movementLogs.length} registros de movimientos.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 bg-red-50 p-3 rounded-xl border border-red-100 leading-relaxed">
              Esta acción borrará todos los registros de pagos, exenciones, anulaciones y rendiciones de gastos guardados en el historial de auditoría. Esta operación no se puede deshacer.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmClearLogsModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmClearLogs}
                className="px-4 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                <span>Sí, Vaciar Historial</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAREA AUTOMÁTICA: NOTIFICACIÓN DE IMPAGOS POR CORREO */}
      {showEmailNotifyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] shadow-2xl overflow-hidden border border-slate-200 flex flex-col">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-indigo-500/20 border border-indigo-400/30 rounded-xl">
                  <Mail className="w-5 h-5 text-indigo-300" />
                </div>
                <div>
                  <h3 className="font-bold text-base flex items-center gap-2">
                    Tarea Automática: Notificar Impagos por Correo
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Período Contable {currentYear} · {config.nombreCurso} ({config.institucion})
                  </p>
                </div>
              </div>
              <button
                type="button"
                disabled={isSendingEmails}
                onClick={() => setShowEmailNotifyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg disabled:opacity-30 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs flex-1">
              {/* Summary KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-indigo-700 block">
                    Apoderados con Deuda a la Fecha
                  </span>
                  <span className="text-xl font-black text-indigo-950 font-mono">
                    {debtorList.length}{' '}
                    <span className="text-xs font-normal text-indigo-600">apoderados</span>
                  </span>
                </div>
                <div className="bg-red-50/70 border border-red-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-red-700 block">
                    Deuda Total Consolidada
                  </span>
                  <span className="text-xl font-black text-red-950 font-mono">
                    {formatCurrency(totalConsolidatedDebt)}
                  </span>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5">
                  <span className="text-[11px] font-semibold text-slate-600 block">
                    Cuenta Bancaria para Transferencias
                  </span>
                  <span className="text-xs font-bold text-slate-800 block truncate">
                    {config.datosBancarios.banco} · {config.datosBancarios.tipoCuenta}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono block">
                    N° {config.datosBancarios.numeroCuenta}
                  </span>
                </div>
              </div>

              {/* SMTP Status banner in notification modal */}
              {config.smtpConfig?.user && config.smtpConfig?.pass ? (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="p-1 bg-emerald-100 rounded-md text-emerald-700 shrink-0">
                      <Server className="w-4 h-4" />
                    </span>
                    <div>
                      <strong className="text-emerald-900 block">
                        Servidor SMTP Configurado para Envío Real
                      </strong>
                      <span className="text-emerald-700 font-mono text-[11px]">
                        {config.smtpConfig.host}:{config.smtpConfig.port} · Remitente: {config.smtpConfig.fromEmail || config.smtpConfig.user}
                      </span>
                    </div>
                  </div>
                  <span className="bg-emerald-600 text-white font-bold text-[10px] px-2.5 py-1 rounded-full shrink-0 shadow-2xs">
                    ✓ Envío a Bandeja de Entrada Activo
                  </span>
                </div>
              ) : (
                <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                    <div>
                      <strong className="text-amber-900 block">
                        Servidor SMTP no configurado aún
                      </strong>
                      <span className="text-amber-800 text-[11px]">
                        Para que los correos lleguen directamente a las bandejas de entrada de los apoderados, ingresa tu cuenta de correo en la sección de Configuración SMTP más abajo.
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEmailNotifyModal(false);
                      setTimeout(() => {
                        const el = document.getElementById('seccion-smtp');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }, 100);
                    }}
                    className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[11px] font-bold rounded-lg shrink-0 cursor-pointer shadow-2xs"
                  >
                    ⚙️ Configurar Servidor SMTP
                  </button>
                </div>
              )}

              {/* Action trigger & Progress */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-amber-500" />
                      Ejecutar Envío de Notificaciones
                    </h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      El proceso notificará a cada apoderado, incluirá el detalle de meses impagos y los datos de transferencia, y registrará cada correo en el Log de Auditoría.
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={handleExportDebtorsReport}
                      disabled={debtorList.length === 0}
                      className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl font-bold text-xs transition-colors cursor-pointer shadow-2xs disabled:opacity-40"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Exportar Lista Excel</span>
                    </button>

                    <button
                      type="button"
                      disabled={isAuditor || isSendingEmails || debtorList.length === 0}
                      onClick={handleExecuteAutomatedNotifications}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      title={isAuditor ? 'Función deshabilitada para el rol Auditor' : undefined}
                    >
                      {isSendingEmails ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Enviando... ({currentSendingIndex + 1}/{debtorList.length})</span>
                        </>
                      ) : emailTaskCompleted ? (
                        <>
                          <RotateCcw className="w-4 h-4" />
                          <span>Reenviar Notificaciones</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4" />
                          <span>Iniciar Envío Automático</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Progress bar during automated execution */}
                {isSendingEmails && (
                  <div className="space-y-1.5 pt-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-600 font-semibold">
                      <span>
                        Enviando correo a {debtorList[currentSendingIndex]?.email || 'apoderado'} ({debtorList[currentSendingIndex]?.student.nombres})...
                      </span>
                      <span className="font-mono">
                        {Math.round(((currentSendingIndex + 1) / debtorList.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${Math.round(((currentSendingIndex + 1) / debtorList.length) * 100)}%`,
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Completed state banner */}
                {emailTaskCompleted && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                    <div className="flex items-center gap-2 font-medium">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>
                        <strong>¡Tarea ejecutada exitosamente!</strong> Se procesaron {debtorList.length} notificaciones de impagos y se añadieron los registros correspondientes al historial de auditoría del sistema.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Debtors List Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-slate-800 uppercase tracking-wider">
                    Nómina de Alumnos y Apoderados a Notificar ({debtorList.length})
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Solo incluye cuotas con vencimiento a la fecha de hoy
                  </span>
                </div>

                {debtorList.length === 0 ? (
                  <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <CheckCheck className="w-8 h-8 text-emerald-500 mx-auto" />
                    <h5 className="font-bold text-slate-800 text-sm">¡Excelente noticia!</h5>
                    <p className="text-xs text-slate-500">
                      No hay ningún alumno con cuotas o actividades extraordinarias impagas hasta la fecha. Todos se encuentran al día.
                    </p>
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-100 border-b border-slate-200 font-bold text-slate-700">
                        <tr>
                          <th className="py-2.5 px-3">Alumno</th>
                          <th className="py-2.5 px-3">Apoderado y Correo</th>
                          <th className="py-2.5 px-3">Conceptos Impagos</th>
                          <th className="py-2.5 px-3 text-right">Deuda Total</th>
                          <th className="py-2.5 px-3 text-center">Estado Envío</th>
                          <th className="py-2.5 px-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {debtorList.map((debtor, idx) => {
                          const isSent = sentDebtorIds.includes(debtor.student.id);
                          const isCurrentlySending = isSendingEmails && currentSendingIndex === idx;

                          return (
                            <tr key={debtor.student.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="py-2.5 px-3">
                                <span className="font-bold text-slate-900 block">
                                  {debtor.student.nombres} {debtor.student.apellidos}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  RUT: {debtor.student.rut}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <span className="text-slate-800 font-medium block">
                                  {debtor.apoderadoNombre}
                                </span>
                                <span className="text-indigo-600 font-mono text-[11px] block">
                                  {debtor.email || 'Sin correo registrado'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="space-y-0.5 max-w-xs">
                                  {debtor.unpaidItems.map((item, itemIdx) => (
                                    <div key={itemIdx} className="text-[11px] text-slate-700 flex items-center justify-between gap-2">
                                      <span className="truncate">• {item.concepto}</span>
                                      <span className="font-mono font-semibold text-slate-900 shrink-0">
                                        {formatCurrency(item.monto)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono font-black text-red-600 whitespace-nowrap text-sm">
                                {formatCurrency(debtor.totalDebt)}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                {isSent ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                                    <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                                    Notificado
                                  </span>
                                ) : isCurrentlySending ? (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full animate-pulse">
                                    <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
                                    Enviando...
                                  </span>
                                ) : (
                                  <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                                    Pendiente
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => setPreviewDebtor(debtor)}
                                    className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                    title="Ver mensaje y cuerpo del correo electrónico"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleCopyEmail(debtor)}
                                    className="p-1.5 text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                    title="Copiar texto del correo al portapapeles"
                                  >
                                    {copiedEmailId === debtor.student.id ? (
                                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    ) : (
                                      <Copy className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                  {debtor.email && (
                                    <a
                                      href={`mailto:${encodeURIComponent(debtor.email)}?subject=${encodeURIComponent(debtor.emailSubject)}&body=${encodeURIComponent(debtor.emailBody)}`}
                                      className="p-1.5 text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer inline-flex items-center"
                                      title="Abrir en cliente de correo local (Gmail, Outlook, etc.)"
                                    >
                                      <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Los correos contienen el número de cuenta bancaria registrado en la configuración.
              </span>
              <button
                type="button"
                onClick={() => setShowEmailNotifyModal(false)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL VISTA PREVIA INDIVIDUAL DEL CORREO */}
      {previewDebtor && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <h4 className="font-bold text-sm">Vista Previa del Correo de Cobranza</h4>
              </div>
              <button
                type="button"
                onClick={() => setPreviewDebtor(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3 text-xs">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Destinatario</span>
                <span className="font-mono text-slate-900 font-bold">
                  {previewDebtor.email || 'Sin correo registrado'}
                </span>{' '}
                <span className="text-slate-500">({previewDebtor.apoderadoNombre})</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Asunto</span>
                <span className="font-bold text-slate-800">{previewDebtor.emailSubject}</span>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Cuerpo del Correo</span>
                <pre className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-sans text-slate-800 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto text-[11px]">
                  {previewDebtor.emailBody}
                </pre>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleCopyEmail(previewDebtor)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  {copiedEmailId === previewDebtor.student.id ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Texto</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  {previewDebtor.email && (
                    <a
                      href={`mailto:${encodeURIComponent(previewDebtor.email)}?subject=${encodeURIComponent(previewDebtor.emailSubject)}&body=${encodeURIComponent(previewDebtor.emailBody)}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Abrir en Cliente de Correo</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setPreviewDebtor(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 font-bold rounded-xl"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. FORMULARIO CONFIGURACIÓN GENERAL Y BANCO */}
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
              disabled={isAuditor}
              value={nombreCurso}
              onChange={(e) => setNombreCurso(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Institución Educativa
            </label>
            <input
              type="text"
              required
              disabled={isAuditor}
              value={institucion}
              onChange={(e) => setInstitucion(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Cuota Mensual Estándar ($ CLP)
            </label>
            <input
              type="number"
              required
              disabled={isAuditor}
              min={1}
              value={cuotaMensual}
              onChange={(e) => setCuotaMensual(Number(e.target.value))}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* LOGO INSTITUCIONAL / AGRUPACIÓN */}
        <div className="pt-4 border-t border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-indigo-600" />
                Logo Institucional del Curso / Agrupación
              </h4>
              <p className="text-xs text-slate-500">
                Sube la insignia o logo oficial. Se actualiza de inmediato en el Login, en la barra superior y en el Reporte PDF.
              </p>
            </div>

            {logoUrl && (
              <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 inline-flex items-center gap-1 self-start sm:self-auto">
                <Check className="w-3.5 h-3.5" />
                Logo personalizado activo
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            {/* Logo Preview */}
            <div className="relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-emerald-500/40 bg-white shadow-md p-1 shrink-0 flex items-center justify-center">
              <img
                src={getEffectiveLogo(logoUrl)}
                alt="Vista previa del logo"
                className="w-full h-full object-contain rounded-xl"
              />
            </div>

            {/* Action buttons */}
            <div className="flex-1 space-y-2 text-center sm:text-left">
              <div className="flex flex-wrap items-center gap-2.5 justify-center sm:justify-start">
                <label className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-colors shadow-xs ${
                  isAuditor
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 opacity-60 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer'
                }`}
                title={isAuditor ? 'Función deshabilitada para el rol Auditor' : undefined}
                >
                  <Upload className="w-4 h-4" />
                  <span>Subir Nueva Imagen de Logo</span>
                  <input
                    type="file"
                    accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
                    disabled={isAuditor}
                  />
                </label>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleResetLogoToDefault}
                    disabled={isAuditor}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-colors ${
                      isAuditor
                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-50'
                        : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-300 cursor-pointer'
                    }`}
                    title={isAuditor ? 'Función deshabilitada para el rol Auditor' : 'Restablecer al emblema predeterminado'}
                  >
                    <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                    <span>Restablecer Emblema Predeterminado</span>
                  </button>
                )}
              </div>

              <p className="text-[11px] text-slate-500">
                Formatos permitidos: PNG, JPG, WebP o SVG (Recomendado: imagen cuadrada o circular con fondo transparente o blanco, máx. 2.5 MB).
              </p>

              {logoUploadError && (
                <p className="text-xs text-red-600 font-semibold flex items-center gap-1 mt-1 justify-center sm:justify-start">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{logoUploadError}</span>
                </p>
              )}
            </div>
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
                disabled={isAuditor}
                value={banco}
                onChange={(e) => setBanco(e.target.value)}
                placeholder="Ej: Banco Estado"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tipo de Cuenta
              </label>
              <input
                type="text"
                required
                disabled={isAuditor}
                value={tipoCuenta}
                onChange={(e) => setTipoCuenta(e.target.value)}
                placeholder="Ej: Cuenta RUT / Vista"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Número de Cuenta
              </label>
              <input
                type="text"
                required
                disabled={isAuditor}
                value={numeroCuenta}
                onChange={(e) => setNumeroCuenta(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
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
                disabled={isAuditor}
                value={titularNombre}
                onChange={(e) => setTitularNombre(e.target.value)}
                placeholder="Ej: Directiva Tesorería"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                RUT del Titular
              </label>
              <input
                type="text"
                required
                disabled={isAuditor}
                value={titularRut}
                onChange={(e) => setTitularRut(e.target.value)}
                placeholder="Ej: 12.345.678-9"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email para Envío de Comprobantes
              </label>
              <input
                type="email"
                required
                disabled={isAuditor}
                value={emailConfirmacion}
                onChange={(e) => setEmailConfirmacion(e.target.value)}
                placeholder="tesoreria@colegio.cl"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* 4. CONFIGURACIÓN DEL SERVIDOR DE CORREO SMTP */}
        <div id="seccion-smtp" className="pt-5 border-t border-slate-200 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Server className="w-4 h-4 text-indigo-600" />
                Configuración del Servidor de Correo (SMTP para Envío Real)
              </h4>
              <p className="text-xs text-slate-500 mt-0.5">
                Configura tu cuenta de correo electrónico para que las notificaciones de impagos y cobranzas lleguen directamente a las casillas de los apoderados.
              </p>
            </div>

            <label className={`flex items-center gap-2 select-none shrink-0 px-3 py-1.5 rounded-xl border transition-colors ${
              isAuditor
                ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                : 'bg-slate-50 border-slate-200 hover:bg-slate-100 cursor-pointer'
            }`}>
              <input
                type="checkbox"
                disabled={isAuditor}
                checked={smtpActivo}
                onChange={(e) => setSmtpActivo(e.target.checked)}
                className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 disabled:cursor-not-allowed cursor-pointer"
              />
              <span className="text-xs font-bold text-slate-800">
                {smtpActivo ? 'Habilitado para Envío Real' : 'Deshabilitado'}
              </span>
            </label>
          </div>

          {/* Quick presets */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block">
              Preconfiguración Rápida de Proveedores (Presets):
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isAuditor}
                onClick={() => handleApplyPreset('gmail')}
                className={`px-3 py-1.5 font-bold text-xs border rounded-lg shadow-2xs transition-colors ${
                  isAuditor
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 border-slate-300 cursor-pointer'
                }`}
                title={isAuditor ? 'Función deshabilitada para el rol Auditor' : undefined}
              >
                🔴 Gmail (smtp.gmail.com:587)
              </button>
              <button
                type="button"
                disabled={isAuditor}
                onClick={() => handleApplyPreset('outlook')}
                className={`px-3 py-1.5 font-bold text-xs border rounded-lg shadow-2xs transition-colors ${
                  isAuditor
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 border-slate-300 cursor-pointer'
                }`}
                title={isAuditor ? 'Función deshabilitada para el rol Auditor' : undefined}
              >
                🔷 Outlook / Hotmail (smtp.office365.com:587)
              </button>
              <button
                type="button"
                disabled={isAuditor}
                onClick={() => handleApplyPreset('yahoo')}
                className={`px-3 py-1.5 font-bold text-xs border rounded-lg shadow-2xs transition-colors ${
                  isAuditor
                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed opacity-60'
                    : 'bg-white hover:bg-purple-50 hover:text-purple-700 text-slate-700 border-slate-300 cursor-pointer'
                }`}
                title={isAuditor ? 'Función deshabilitada para el rol Auditor' : undefined}
              >
                🟣 Yahoo Mail (smtp.mail.yahoo.com:465)
              </button>
            </div>
          </div>

          {/* Inputs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Servidor SMTP (Host) *
              </label>
              <input
                type="text"
                disabled={isAuditor}
                value={smtpHost}
                onChange={(e) => setSmtpHost(e.target.value)}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Puerto SMTP *
              </label>
              <input
                type="number"
                disabled={isAuditor}
                value={smtpPort}
                onChange={(e) => setSmtpPort(Number(e.target.value))}
                placeholder="587"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Seguridad de Cifrado
              </label>
              <select
                disabled={isAuditor}
                value={smtpSecure ? 'ssl' : 'tls'}
                onChange={(e) => setSmtpSecure(e.target.value === 'ssl')}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              >
                <option value="tls">STARTTLS (Puerto 587 - Recomendado para Gmail/Outlook)</option>
                <option value="ssl">SSL / TLS Directo (Puerto 465)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Usuario SMTP / Correo Remitente *
              </label>
              <input
                type="email"
                disabled={isAuditor}
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                placeholder="tesoreria.curso@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Contraseña / Clave de Aplicación *</span>
                <span className="text-[10px] text-indigo-600 font-normal">Gmail App Password (16 letras)</span>
              </label>
              <div className="relative">
                <input
                  type={showSmtpPassword ? 'text' : 'password'}
                  disabled={isAuditor}
                  value={smtpPass}
                  onChange={(e) => setSmtpPass(e.target.value)}
                  placeholder="••••••••••••••••"
                  className="w-full pl-3 pr-9 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  disabled={isAuditor}
                  onClick={() => setShowSmtpPassword(!showSmtpPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 disabled:opacity-40 cursor-pointer"
                  title={showSmtpPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                >
                  {showSmtpPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre a Mostrar en el Correo
              </label>
              <input
                type="text"
                disabled={isAuditor}
                value={smtpFromName}
                onChange={(e) => setSmtpFromName(e.target.value)}
                placeholder={`Tesorería ${config.nombreCurso}`}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Correo para Respuestas y Comprobantes
              </label>
              <input
                type="email"
                disabled={isAuditor}
                value={smtpFromEmail}
                onChange={(e) => setSmtpFromEmail(e.target.value)}
                placeholder="tesoreria.curso@gmail.com"
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Guide for Gmail */}
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-1.5 text-xs text-indigo-900 leading-relaxed">
            <div className="flex items-center gap-1.5 font-bold text-indigo-950">
              <Globe className="w-4 h-4 text-indigo-600" />
              <span>¿Cómo configurar tu cuenta de Gmail para enviar correos?</span>
            </div>
            <p className="text-[11px] text-indigo-800">
              Por políticas de seguridad de Google, <strong>no uses tu contraseña personal</strong> habitual. Debes generar una <strong>Contraseña de Aplicación</strong> de 16 caracteres:
            </p>
            <ol className="list-decimal list-inside text-[11px] text-indigo-800 space-y-0.5 ml-1">
              <li>Ingresa a tu cuenta de Google en <span className="font-mono underline">myaccount.google.com</span>.</li>
              <li>En la pestaña <strong>Seguridad</strong>, activa la <strong>Verificación en 2 pasos</strong> si aún no la tienes.</li>
              <li>Busca <strong>Contraseñas de aplicaciones</strong> (o visita <span className="font-mono underline">myaccount.google.com/apppasswords</span>).</li>
              <li>Ingresa un nombre (ej: <em>Tesorería Escolar</em>) y presiona <strong>Crear</strong>.</li>
              <li>Copia el código amarillo de 16 letras generado (ej: <span className="font-mono bg-white px-1 py-0.5 rounded border border-indigo-200">abcd efgh ijkl mnop</span>) y pégalo en el campo <strong>Contraseña / Clave de Aplicación</strong> arriba.</li>
            </ol>
          </div>

          {/* Test connection panel */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <h5 className="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <CheckCheck className="w-4 h-4 text-emerald-600" />
                Probar Conexión SMTP y Enviar Correo de Prueba
              </h5>
              <span className="text-[10px] text-slate-500">
                {isAuditor ? 'Función reservada para Administradores' : 'Verifica tus credenciales en vivo'}
              </span>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1">
                <input
                  type="email"
                  disabled={isAuditor}
                  value={testEmailRecipient}
                  onChange={(e) => setTestEmailRecipient(e.target.value)}
                  placeholder="Ingresa tu correo para recibir la prueba (ej: tu@correo.com)"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
                />
              </div>
              <button
                type="button"
                disabled={isAuditor || isTestingSmtp}
                onClick={handleTestSmtp}
                className={`px-4 py-2 font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 shrink-0 ${
                  isAuditor
                    ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer disabled:opacity-50'
                }`}
                title={isAuditor ? 'Función deshabilitada para el rol Auditor' : undefined}
              >
                {isTestingSmtp ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Verificando conexión...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Enviar Correo de Prueba</span>
                  </>
                )}
              </button>
            </div>

            {smtpTestResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in ${
                  smtpTestResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-red-50 border-red-200 text-red-900'
                }`}
              >
                {smtpTestResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1">
                  <strong className="block font-bold">
                    {smtpTestResult.success ? 'Conexión verificada exitosamente' : 'Error al conectar con el servidor SMTP'}
                  </strong>
                  <span className="text-[11px] leading-relaxed block mt-0.5">
                    {smtpTestResult.message}
                  </span>
                </div>
              </div>
            )}
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
            disabled={isAuditor}
            className={`px-5 py-2 text-xs font-bold rounded-lg shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed opacity-60'
                : 'text-white bg-slate-900 hover:bg-slate-800 cursor-pointer'
            }`}
            title={isAuditor ? 'Función deshabilitada para el rol Auditor (solo administradores pueden guardar cambios)' : undefined}
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
            type="button"
            disabled={isAuditor}
            onClick={handleDownloadBackup}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer'
            }`}
            title={isAuditor ? 'Función deshabilitada para el rol Auditor' : 'Descargar archivo JSON con todos los datos'}
          >
            <Download className="w-4 h-4 text-slate-500" />
            Descargar Respaldo JSON
          </button>

          <label
            className={`flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                : 'text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 cursor-pointer'
            }`}
            title={isAuditor ? 'Función deshabilitada para el rol Auditor' : 'Restaurar datos desde archivo JSON'}
          >
            <Upload className="w-4 h-4 text-slate-500" />
            Restaurar desde JSON
            <input
              type="file"
              accept=".json"
              onChange={handleFileImport}
              className="hidden"
              disabled={isAuditor}
            />
          </label>
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
