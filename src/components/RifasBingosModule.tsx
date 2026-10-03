import React, { useState, useMemo, useEffect } from 'react';
import {
  Ticket,
  PlusCircle,
  Printer,
  Download,
  Edit2,
  Trash2,
  Sparkles,
  Trophy,
  Calendar,
  MapPin,
  Building,
  CreditCard,
  QrCode,
  CheckCircle2,
  AlertCircle,
  X,
  Plus,
  ArrowUp,
  ArrowDown,
  Layers,
  FileText,
  Search,
  Users,
  Eye,
  Check,
} from 'lucide-react';
import { RifaBingoItem, RifaPremio, Student, CourseConfig, UserRole } from '../types';
import { formatCurrency, addMovementLog } from '../services/storage';
import { getEffectiveLogo } from '../assets/logo';
import { formatThousands, parseThousands } from '../services/formatters';
import {
  generateAuthenticityCode,
  buildQrVerificationText,
  generateQrDataUrl,
  generateBingoCardMatrix,
  downloadRifaBingoPdf,
} from '../services/rifaBingoService';

interface RifasBingosModuleProps {
  year: number;
  rifasBingos: RifaBingoItem[];
  onUpdateRifasBingos: (items: RifaBingoItem[]) => void;
  students: Student[];
  config: CourseConfig;
  userRole: UserRole;
}

export const RifasBingosModule: React.FC<RifasBingosModuleProps> = ({
  year,
  rifasBingos,
  onUpdateRifasBingos,
  students,
  config,
  userRole,
}) => {
  const isAuditor = userRole === 'auditor';

  // Alumnos activos y exentos (excluyendo únicamente los deshabilitados con activo === false)
  const eligibleStudents = useMemo(() => {
    return students.filter((s) => s.activo !== false);
  }, [students]);

  // Modal Crear / Editar
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingItem, setEditingItem] = useState<RifaBingoItem | null>(null);

  // Form states
  const [formTipo, setFormTipo] = useState<'rifa' | 'bingo'>('rifa');
  const [formTitulo, setFormTitulo] = useState('');
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formFechaSorteo, setFormFechaSorteo] = useState('');
  const [formHoraSorteo, setFormHoraSorteo] = useState('18:30 hrs');
  const [formLugarSorteo, setFormLugarSorteo] = useState('');
  const [formValorNumero, setFormValorNumero] = useState<number | ''>(1000);
  const [formCantidadNumeros, setFormCantidadNumeros] = useState<number>(10);
  const [formCodigoRegistroBase, setFormCodigoRegistroBase] = useState('RF-2026');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formPremios, setFormPremios] = useState<RifaPremio[]>([]);

  // Estado para nuevo premio en modal
  const [newPremioNombre, setNewPremioNombre] = useState('');
  const [newPremioDescripcion, setNewPremioDescripcion] = useState('');

  // Visor de Emisión / Impresión
  const [viewingItemForPrint, setViewingItemForPrint] = useState<RifaBingoItem | null>(null);
  const [selectedStudentIdFilter, setSelectedStudentIdFilter] = useState<string>('all');
  const [qrCache, setQrCache] = useState<Record<string, string>>({});
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfSuccessMessage, setPdfSuccessMessage] = useState<string | null>(null);

  // Filtrar actividades por año seleccionado
  const yearItems = useMemo(() => {
    return rifasBingos.filter((item) => item.year === year);
  }, [rifasBingos, year]);

  // Pre-generar QRs cuando se abre el visor de emisión
  useEffect(() => {
    if (!viewingItemForPrint) return;

    let isMounted = true;
    const generateAllQrs = async () => {
      const newCache: Record<string, string> = {};
      const targetStudents =
        selectedStudentIdFilter === 'all'
          ? eligibleStudents
          : eligibleStudents.filter((s) => s.id === selectedStudentIdFilter);

      for (let idx = 0; idx < targetStudents.length; idx++) {
        const student = targetStudents[idx];
        const folio =
          viewingItemForPrint.foliosPorAlumno?.[student.id] ||
          String(idx + 1).padStart(3, '0');
        const authCode = generateAuthenticityCode(viewingItemForPrint, student.id, folio);
        const qrText = buildQrVerificationText({
          item: viewingItemForPrint,
          student,
          folio,
          config,
          authCode,
        });
        const qrUrl = await generateQrDataUrl(qrText);
        if (isMounted) {
          newCache[`${student.id}_${folio}`] = qrUrl;
        }
      }

      if (isMounted) {
        setQrCache(newCache);
      }
    };

    generateAllQrs();

    return () => {
      isMounted = false;
    };
  }, [viewingItemForPrint, selectedStudentIdFilter, eligibleStudents, config]);

  // Abrir modal de creación
  const handleOpenCreateModal = (tipo: 'rifa' | 'bingo' = 'rifa') => {
    setFormTipo(tipo);
    setFormTitulo(
      tipo === 'rifa'
        ? `Gran Rifa Oficial Pro-Fondos ${year}`
        : `Gran Bingo Familiar y Kermesse ${year}`
    );
    setFormDescripcion(
      tipo === 'rifa'
        ? 'Actividad comunitaria para recaudar fondos para proyectos escolares y actividades de los alumnos.'
        : 'Gran jornada recreativa, tarde de juegos, kermesse y sorteos familiares.'
    );
    const inTwoMonths = new Date();
    inTwoMonths.setMonth(inTwoMonths.getMonth() + 2);
    setFormFechaSorteo(inTwoMonths.toISOString().split('T')[0]);
    setFormHoraSorteo('18:00 hrs');
    setFormLugarSorteo(`Gimnasio del Establecimiento (${config.institucion})`);
    setFormValorNumero(tipo === 'rifa' ? 1000 : 2000);
    setFormCantidadNumeros(tipo === 'rifa' ? 10 : 4);
    setFormCodigoRegistroBase(tipo === 'rifa' ? `RF-${year}` : `BG-${year}`);
    setFormObservaciones(
      tipo === 'rifa'
        ? 'Cada número cancelado participa en el sorteo oficial. Entregar talonario y recaudación antes de la fecha límite.'
        : 'Cartón válido únicamente con timbre oficial y código QR emitido por la directiva. Prohibido tachaduras.'
    );
    setFormPremios(
      tipo === 'rifa'
        ? [
            { id: 'p-1', lugar: 1, nombre: '1° Premio: Smart TV 43" 4K', descripcion: 'Marca Samsung o LG con garantía' },
            { id: 'p-2', lugar: 2, nombre: '2° Premio: Freidora de Aire Digital', descripcion: '5.5 litros multifunción' },
            { id: 'p-3', lugar: 3, nombre: '3° Premio: Set Parrillero + Tabla Nativa', descripcion: 'Cuchillos forjados y accesorios' },
          ]
        : [
            { id: 'pb-1', lugar: 1, nombre: 'Premio Mayor: $150.000 en Efectivo', descripcion: 'Cartón Lleno' },
            { id: 'pb-2', lugar: 2, nombre: 'Premio Línea: Horno Eléctrico / Microondas', descripcion: 'Primera línea horizontal o vertical' },
            { id: 'pb-3', lugar: 3, nombre: 'Premio Consuelo: Canasta Familiar Gourmet', descripcion: 'Sorteo al agua con número de cartón' },
          ]
    );
    setEditingItem(null);
    setModalMode('create');
  };

  // Abrir modal de edición
  const handleOpenEditModal = (item: RifaBingoItem) => {
    setFormTipo(item.tipo);
    setFormTitulo(item.titulo);
    setFormDescripcion(item.descripcion);
    setFormFechaSorteo(item.fechaSorteo);
    setFormHoraSorteo(item.horaSorteo || '18:00 hrs');
    setFormLugarSorteo(item.lugarSorteo);
    setFormValorNumero(item.valorNumero);
    setFormCantidadNumeros(item.cantidadNumerosPorAlumno);
    setFormCodigoRegistroBase(item.codigoRegistroBase);
    setFormObservaciones(item.observaciones || '');
    setFormPremios(item.premios ? [...item.premios] : []);
    setEditingItem(item);
    setModalMode('edit');
  };

  // Agregar nuevo premio a la lista en el formulario
  const handleAddPremio = () => {
    if (!newPremioNombre.trim()) return;
    const nuevoPremio: RifaPremio = {
      id: `prem-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      lugar: formPremios.length + 1,
      nombre: newPremioNombre.trim(),
      descripcion: newPremioDescripcion.trim() || undefined,
    };
    setFormPremios([...formPremios, nuevoPremio]);
    setNewPremioNombre('');
    setNewPremioDescripcion('');
  };

  // Eliminar premio
  const handleRemovePremio = (premioId: string) => {
    const filtered = formPremios.filter((p) => p.id !== premioId);
    // Reordenar lugares 1, 2, 3...
    const reordered = filtered.map((p, idx) => ({ ...p, lugar: idx + 1 }));
    setFormPremios(reordered);
  };

  // Mover premio arriba o abajo
  const handleMovePremio = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === formPremios.length - 1) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    const copy = [...formPremios];
    const temp = copy[index];
    copy[index] = copy[targetIdx];
    copy[targetIdx] = temp;
    const reordered = copy.map((p, idx) => ({ ...p, lugar: idx + 1 }));
    setFormPremios(reordered);
  };

  // Guardar formulario
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuditor) return;

    if (!formTitulo.trim()) {
      alert('Debes ingresar un título para la actividad.');
      return;
    }

    const valor = typeof formValorNumero === 'number' ? formValorNumero : parseThousands(formValorNumero);
    if (valor <= 0) {
      alert('El valor de cada número o cartón debe ser mayor a 0.');
      return;
    }

    if (modalMode === 'create') {
      // Asignar folios correlativos automáticos iniciales por alumno (001, 002, 003...)
      const initialFolios: Record<string, string> = {};
      eligibleStudents.forEach((st, idx) => {
        initialFolios[st.id] = String(idx + 1).padStart(3, '0');
      });

      const newItem: RifaBingoItem = {
        id: `rb-${Date.now()}`,
        tipo: formTipo,
        titulo: formTitulo.trim(),
        descripcion: formDescripcion.trim(),
        fechaSorteo: formFechaSorteo,
        horaSorteo: formHoraSorteo.trim(),
        lugarSorteo: formLugarSorteo.trim(),
        valorNumero: valor,
        cantidadNumerosPorAlumno: Number(formCantidadNumeros) || 10,
        premios: formPremios,
        codigoRegistroBase: formCodigoRegistroBase.trim() || (formTipo === 'rifa' ? 'RF' : 'BG'),
        observaciones: formObservaciones.trim(),
        year,
        fechaCreacion: new Date().toISOString(),
        estado: 'activa',
        foliosPorAlumno: initialFolios,
      };

      const updated = [newItem, ...rifasBingos];
      onUpdateRifasBingos(updated);

      addMovementLog({
        modulo: 'rifas_bingos',
        tipoAccion: 'rifa_bingo_creado',
        titulo: `Nueva ${formTipo === 'rifa' ? 'Rifa' : 'Bingo'}: ${newItem.titulo}`,
        descripcion: `Se creó el modelo de gestión para "${newItem.titulo}". Valor: $${valor.toLocaleString('es-CL')} CLP, ${newItem.premios.length} premios configurados.`,
        rol: userRole,
        referenciaId: newItem.id,
        referenciaNombre: newItem.titulo,
      });
    } else if (modalMode === 'edit' && editingItem) {
      const updated = rifasBingos.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              tipo: formTipo,
              titulo: formTitulo.trim(),
              descripcion: formDescripcion.trim(),
              fechaSorteo: formFechaSorteo,
              horaSorteo: formHoraSorteo.trim(),
              lugarSorteo: formLugarSorteo.trim(),
              valorNumero: valor,
              cantidadNumerosPorAlumno: Number(formCantidadNumeros) || 10,
              premios: formPremios,
              codigoRegistroBase: formCodigoRegistroBase.trim() || item.codigoRegistroBase,
              observaciones: formObservaciones.trim(),
            }
          : item
      );
      onUpdateRifasBingos(updated);

      addMovementLog({
        modulo: 'rifas_bingos',
        tipoAccion: 'rifa_bingo_editado',
        titulo: `Actividad Editada: ${formTitulo.trim()}`,
        descripcion: `Se actualizaron los parámetros de la rifa/bingo "${formTitulo.trim()}".`,
        rol: userRole,
        referenciaId: editingItem.id,
        referenciaNombre: formTitulo.trim(),
      });
    }

    setModalMode(null);
    setEditingItem(null);
  };

  // Eliminar actividad
  const handleDeleteItem = (item: RifaBingoItem) => {
    if (isAuditor) return;
    if (!window.confirm(`¿Estás seguro de eliminar "${item.titulo}"? Esta acción no se puede deshacer.`)) {
      return;
    }

    const filtered = rifasBingos.filter((rb) => rb.id !== item.id);
    onUpdateRifasBingos(filtered);

    addMovementLog({
      modulo: 'rifas_bingos',
      tipoAccion: 'rifa_bingo_eliminado',
      titulo: `Actividad Eliminada: ${item.titulo}`,
      descripcion: `Se eliminó el registro de "${item.titulo}".`,
      rol: userRole,
      referenciaId: item.id,
      referenciaNombre: item.titulo,
    });
  };

  // Ejecutar descarga de PDF mediante jsPDF
  const handleDownloadPdf = async (item: RifaBingoItem) => {
    setIsGeneratingPdf(true);
    setPdfSuccessMessage(null);
    try {
      const targetStudents =
        selectedStudentIdFilter === 'all'
          ? eligibleStudents
          : eligibleStudents.filter((s) => s.id === selectedStudentIdFilter);

      await downloadRifaBingoPdf({
        item,
        students: targetStudents,
        config,
        qrMap: qrCache,
      });

      setPdfSuccessMessage(`¡PDF generado exitosamente para ${targetStudents.length} alumno(s)!`);
      setTimeout(() => setPdfSuccessMessage(null), 4000);

      addMovementLog({
        modulo: 'rifas_bingos',
        tipoAccion: 'rifa_bingo_emitido',
        titulo: `PDF Emitido: ${item.titulo}`,
        descripcion: `Se generó y descargó el archivo PDF oficial de "${item.titulo}" para ${targetStudents.length} alumno(s) activos y exentos.`,
        rol: userRole,
        referenciaId: item.id,
        referenciaNombre: item.titulo,
      });
    } catch (err: any) {
      alert(`Error al generar PDF: ${err.message || 'Error de exportación'}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Imprimir directo con CSS @media print
  const handlePrintWindow = () => {
    window.print();
  };

  const effectiveLogoUrl = getEffectiveLogo(config.logoUrl);

  return (
    <div className="space-y-6">
      {/* 1. HEADER SECTION (Oculto al imprimir) */}
      <div className="print:hidden bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <Ticket className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">
              Gestión de Rifas y Bingos
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800 border border-rose-200">
              Período {year}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
            Emisión de talonarios de <strong>rifas oficiales en 1 hoja carta por alumno</strong> y <strong>cartones de bingo en 1/4 de hoja carta</strong> para todos los alumnos activos y exentos de cuota (excluyendo deshabilitados). Incluye logo, datos bancarios para transferencia, número correlativo de folio y <strong>código QR de autenticidad único</strong> sin exponer el RUT del alumno.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            disabled={isAuditor}
            onClick={() => handleOpenCreateModal('rifa')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                : 'text-white bg-rose-600 hover:bg-rose-700 cursor-pointer'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Crear Rifa Oficial</span>
          </button>
          <button
            type="button"
            disabled={isAuditor}
            onClick={() => handleOpenCreateModal('bingo')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-xl shadow-xs transition-colors ${
              isAuditor
                ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed'
                : 'text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Crear Bingo Familiar</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPI (Oculto al imprimir) */}
      <div className="print:hidden grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Actividades del Período</span>
            <span className="text-xl font-extrabold text-slate-900 font-mono">
              {yearItems.length} eventos
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
            <Layers className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Nómina Habilitada Emisión</span>
            <span className="text-xl font-extrabold text-indigo-700 font-mono">
              {eligibleStudents.length} alumnos
            </span>
            <span className="text-[10px] text-slate-400 block">Activos y exentos de cuota</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Rifas en Hoja Carta</span>
            <span className="text-xl font-extrabold text-rose-700 font-mono">
              {yearItems.filter((i) => i.tipo === 'rifa').length} activas
            </span>
            <span className="text-[10px] text-slate-400 block">1 hoja tamaño carta c/u</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <Ticket className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[11px] text-slate-500 font-medium block">Bingos en 1/4 Carta</span>
            <span className="text-xl font-extrabold text-purple-700 font-mono">
              {yearItems.filter((i) => i.tipo === 'bingo').length} activos
            </span>
            <span className="text-[10px] text-slate-400 block">4 cartones por hoja carta</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3. LIST OF RIFAS & BINGOS (Oculto al imprimir) */}
      <div className="print:hidden space-y-4">
        {yearItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-300">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Ticket className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              No hay Rifas ni Bingos registrados para el período {year}
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-5">
              Crea tu primer modelo de rifa oficial o bingo para emitir e imprimir talonarios personalizados por alumno con folios, premios, QR de autenticidad y datos de cuenta bancaria.
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => handleOpenCreateModal('rifa')}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 shadow-xs cursor-pointer"
              >
                Crear Primera Rifa
              </button>
              <button
                type="button"
                onClick={() => handleOpenCreateModal('bingo')}
                className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 shadow-xs cursor-pointer"
              >
                Crear Primer Bingo
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {yearItems.map((item) => {
              const isRifa = item.tipo === 'rifa';
              const totalEsperado =
                (item.valorNumero || 0) * (item.cantidadNumerosPorAlumno || 0) * eligibleStudents.length;

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col hover:border-slate-300 transition-all"
                >
                  {/* Card Header */}
                  <div
                    className={`p-5 text-white flex items-start justify-between gap-3 ${
                      isRifa
                        ? 'bg-linear-to-r from-rose-700 to-red-800'
                        : 'bg-linear-to-r from-indigo-700 to-purple-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/20 backdrop-blur-xs text-white border border-white/30">
                          {isRifa ? 'Rifa en 1 Hoja Carta' : 'Bingo en 1/4 Hoja Carta'}
                        </span>
                        <span className="text-[11px] text-white/80 font-mono">
                          Reg: {item.codigoRegistroBase}
                        </span>
                      </div>
                      <h3 className="font-extrabold text-base sm:text-lg leading-snug">
                        {item.titulo}
                      </h3>
                      <p className="text-xs text-white/80 mt-1 line-clamp-2">
                        {item.descripcion}
                      </p>
                    </div>

                    <div className="text-right shrink-0 bg-white/10 backdrop-blur-xs p-2.5 rounded-xl border border-white/20">
                      <span className="text-[10px] text-white/80 uppercase block">Valor Número</span>
                      <span className="text-lg font-black font-mono">
                        ${item.valorNumero.toLocaleString('es-CL')}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-5 flex-1 space-y-4 text-xs">
                    {/* Event metadata */}
                    <div className="grid grid-cols-2 gap-3 text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Fecha del Sorteo</span>
                          <span className="font-semibold text-slate-800 text-[11px]">
                            {item.fechaSorteo} {item.horaSorteo ? `(${item.horaSorteo})` : ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase font-bold">Lugar del Evento</span>
                          <span className="font-semibold text-slate-800 text-[11px] truncate block" title={item.lugarSorteo}>
                            {item.lugarSorteo}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Premios destacados */}
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
                          <Trophy className="w-3.5 h-3.5 text-amber-500" />
                          <span>Premios Oficiales ({item.premios.length}):</span>
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {item.premios.slice(0, 3).map((premio) => (
                          <div
                            key={premio.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-amber-50/60 border border-amber-200 text-amber-950 text-xs"
                          >
                            <span className="font-semibold">{premio.nombre}</span>
                            {premio.descripcion && (
                              <span className="text-[10px] text-amber-800 truncate max-w-[140px]">
                                {premio.descripcion}
                              </span>
                            )}
                          </div>
                        ))}
                        {item.premios.length > 3 && (
                          <span className="text-[10px] text-slate-400 block italic text-center">
                            + {item.premios.length - 3} premios adicionales configurados
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Summary metrics */}
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-500 block text-[11px]">
                          {isRifa ? 'Números por Alumno:' : 'Cartones por Alumno:'}
                        </span>
                        <strong className="font-mono text-slate-800 font-bold">
                          {item.cantidadNumerosPorAlumno} {isRifa ? 'números en 1 hoja carta' : 'cartones (1/4 carta c/u)'}
                        </strong>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-500 block text-[11px]">Recaudación Potencial:</span>
                        <strong className="font-mono text-emerald-700 font-bold text-sm">
                          {formatCurrency(totalEsperado)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  <div className="p-4 bg-slate-50/80 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setViewingItemForPrint(item);
                          setSelectedStudentIdFilter('all');
                        }}
                        className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs cursor-pointer ${
                          isRifa
                            ? 'bg-rose-600 hover:bg-rose-700'
                            : 'bg-indigo-600 hover:bg-indigo-700'
                        }`}
                      >
                        <Printer className="w-4 h-4" />
                        <span>Emitir e Imprimir</span>
                      </button>

                      <button
                        type="button"
                        disabled={isGeneratingPdf}
                        onClick={() => handleDownloadPdf(item)}
                        className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs cursor-pointer"
                        title="Descargar archivo PDF directamente"
                      >
                        <Download className="w-3.5 h-3.5 text-slate-500" />
                        <span>Descargar PDF</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={isAuditor}
                        onClick={() => handleOpenEditModal(item)}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Editar parámetros y premios"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={isAuditor}
                        onClick={() => handleDeleteItem(item)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Eliminar actividad"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. MODAL: CREAR / EDITAR RIFA O BINGO (Oculto al imprimir) */}
      {modalMode && (
        <div className="print:hidden fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden border border-slate-200 my-8">
            {/* Modal Top */}
            <div
              className={`p-5 text-white flex items-center justify-between ${
                formTipo === 'rifa' ? 'bg-rose-700' : 'bg-indigo-700'
              }`}
            >
              <div>
                <h3 className="font-bold text-base flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-rose-200" />
                  <span>
                    {modalMode === 'create'
                      ? `Crear ${formTipo === 'rifa' ? 'Rifa Oficial' : 'Bingo Familiar'}`
                      : `Editar ${formTipo === 'rifa' ? 'Rifa' : 'Bingo'}`}
                  </span>
                </h3>
                <p className="text-xs text-white/80">
                  {formTipo === 'rifa'
                    ? 'La rifa se emitirá en 1 hoja tamaño carta por alumno.'
                    : 'El bingo se emitirá en formato de 1/4 de hoja carta.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalMode(null)}
                className="text-white/80 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveForm} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto text-xs">
              {/* Selector de Tipo */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormTipo('rifa')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    formTipo === 'rifa'
                      ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Ticket className={`w-5 h-5 shrink-0 ${formTipo === 'rifa' ? 'text-rose-600' : 'text-slate-400'}`} />
                  <div>
                    <strong className="block text-slate-900 font-bold">Rifa Oficial</strong>
                    <span className="text-[11px] text-slate-500">Talonario en 1 hoja tamaño carta completa</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setFormTipo('bingo')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                    formTipo === 'bingo'
                      ? 'border-indigo-500 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className={`w-5 h-5 shrink-0 ${formTipo === 'bingo' ? 'text-indigo-600' : 'text-slate-400'}`} />
                  <div>
                    <strong className="block text-slate-900 font-bold">Bingo Familiar</strong>
                    <span className="text-[11px] text-slate-500">Cartones en formato de 1/4 de hoja carta</span>
                  </div>
                </button>
              </div>

              {/* Título y Código */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Título de la Actividad *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitulo}
                    onChange={(e) => setFormTitulo(e.target.value)}
                    placeholder="Ej: Gran Rifa Pro-Fondos de Fin de Año"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Prefijo Registro Único *
                  </label>
                  <input
                    type="text"
                    required
                    value={formCodigoRegistroBase}
                    onChange={(e) => setFormCodigoRegistroBase(e.target.value)}
                    placeholder="Ej: RF-2026"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-rose-600 uppercase"
                  />
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción o Motivo
                </label>
                <input
                  type="text"
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Para financiar gira de estudios y despedida de fin de año"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600"
                />
              </div>

              {/* Fecha, Hora y Lugar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha del Sorteo / Evento *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFechaSorteo}
                    onChange={(e) => setFormFechaSorteo(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Hora del Sorteo
                  </label>
                  <input
                    type="text"
                    value={formHoraSorteo}
                    onChange={(e) => setFormHoraSorteo(e.target.value)}
                    placeholder="Ej: 18:30 hrs"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Lugar del Sorteo *
                  </label>
                  <input
                    type="text"
                    required
                    value={formLugarSorteo}
                    onChange={(e) => setFormLugarSorteo(e.target.value)}
                    placeholder="Ej: Gimnasio Colegio / Online"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600"
                  />
                </div>
              </div>

              {/* Valor por número y Cantidad por alumno */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {formTipo === 'rifa' ? 'Valor de cada Número ($ CLP) *' : 'Valor de cada Cartón ($ CLP) *'}
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    value={formValorNumero !== '' ? formatThousands(formValorNumero) : ''}
                    onChange={(e) => {
                      const p = parseThousands(e.target.value);
                      setFormValorNumero(e.target.value === '' ? '' : p);
                    }}
                    placeholder="Ej: 1.000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-rose-600 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    Formato dinámico en miles (ej: 1.000, 2.000, 5.000)
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    {formTipo === 'rifa'
                      ? 'Cantidad de Números por Alumno (Hoja Carta) *'
                      : 'Cantidad de Cartones por Alumno (1/4 Carta) *'}
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    max={formTipo === 'rifa' ? 30 : 16}
                    value={formCantidadNumeros}
                    onChange={(e) => setFormCantidadNumeros(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-rose-600 bg-white"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">
                    {formTipo === 'rifa'
                      ? 'Recomendado: 10 o 15 números por hoja carta'
                      : 'Recomendado: 4 cartones (1 hoja carta dividida en 4)'}
                  </span>
                </div>
              </div>

              {/* SECCIÓN GESTIÓN DE PREMIOS */}
              <div className="space-y-3 p-4 bg-amber-50/70 border border-amber-200 rounded-xl">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-xs text-amber-950 flex items-center gap-1.5">
                    <Trophy className="w-4 h-4 text-amber-600" />
                    <span>Premios a Sortear ({formPremios.length})</span>
                  </h4>
                  <span className="text-[11px] text-amber-800">
                    Aparecerán impresos en la hoja de cada alumno
                  </span>
                </div>

                {/* Lista actual de premios */}
                <div className="space-y-2">
                  {formPremios.map((premio, pIndex) => (
                    <div
                      key={premio.id}
                      className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-amber-200 shadow-2xs gap-2"
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="w-6 h-6 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shrink-0">
                          {pIndex + 1}°
                        </span>
                        <div className="truncate">
                          <strong className="block text-slate-800 text-xs truncate">
                            {premio.nombre}
                          </strong>
                          {premio.descripcion && (
                            <span className="text-[10px] text-slate-500 truncate block">
                              {premio.descripcion}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={pIndex === 0}
                          onClick={() => handleMovePremio(pIndex, 'up')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Mover arriba"
                        >
                          <ArrowUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={pIndex === formPremios.length - 1}
                          onClick={() => handleMovePremio(pIndex, 'down')}
                          className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                          title="Mover abajo"
                        >
                          <ArrowDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemovePremio(premio.id)}
                          className="p-1 text-red-500 hover:text-red-700 cursor-pointer"
                          title="Eliminar premio"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Formulario rápido para agregar premio */}
                <div className="pt-2 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <div className="sm:col-span-2">
                    <input
                      type="text"
                      value={newPremioNombre}
                      onChange={(e) => setNewPremioNombre(e.target.value)}
                      placeholder="Nombre del premio (ej: Smart TV 43 pulgadas)"
                      className="w-full px-3 py-1.5 text-xs border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newPremioDescripcion}
                      onChange={(e) => setNewPremioDescripcion(e.target.value)}
                      placeholder="Detalle o donación (opcional)"
                      className="w-full px-2.5 py-1.5 text-xs border border-amber-300 rounded-lg bg-white focus:ring-2 focus:ring-amber-600"
                    />
                    <button
                      type="button"
                      onClick={handleAddPremio}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg shrink-0 cursor-pointer"
                    >
                      + Agregar
                    </button>
                  </div>
                </div>
              </div>

              {/* Observaciones e Instrucciones */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reglamento, Observaciones o Instrucciones de Rendición
                </label>
                <textarea
                  rows={2}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Detalles sobre entrega de dinero, condiciones de cobro de premios, etc."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-600"
                />
              </div>

              {/* Botones de acción */}
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalMode(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold text-white rounded-lg shadow-xs cursor-pointer ${
                    formTipo === 'rifa' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {modalMode === 'create' ? 'Crear Actividad' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. VISOR INTERACTIVO DE EMISIÓN E IMPRESIÓN (PRINT STUDIO) */}
      {viewingItemForPrint && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-900/90 backdrop-blur-xs overflow-hidden">
          {/* Top Control Bar (Oculto al imprimir) */}
          <div className="print:hidden p-4 bg-slate-900 border-b border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30">
                <Printer className="w-5 h-5" />
              </span>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-2">
                  <span>Emisión Oficial: {viewingItemForPrint.titulo}</span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-600 text-white">
                    {viewingItemForPrint.tipo === 'rifa' ? '1 Hoja Carta' : '1/4 Hoja Carta'}
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  {config.institucion} · Período {viewingItemForPrint.year} · Alumnos habilitados: {eligibleStudents.length} (Activos y Exentos)
                </p>
              </div>
            </div>

            {/* Selectores de impresión */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Filtro de alumno */}
              <div className="flex items-center gap-1.5 bg-slate-800 p-1 rounded-xl border border-slate-700">
                <Users className="w-3.5 h-3.5 text-slate-400 ml-1.5" />
                <select
                  value={selectedStudentIdFilter}
                  onChange={(e) => setSelectedStudentIdFilter(e.target.value)}
                  className="bg-transparent text-white text-xs py-1 px-2 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-white">
                    Todos los alumnos ({eligibleStudents.length} hojas carta)
                  </option>
                  {eligibleStudents.map((st, sIdx) => {
                    const fol = viewingItemForPrint.foliosPorAlumno?.[st.id] || String(sIdx + 1).padStart(3, '0');
                    return (
                      <option key={st.id} value={st.id} className="bg-slate-900 text-white">
                        Folio #{fol} - {st.nombres} {st.apellidos} {st.noPagaCuota ? '(Exento)' : ''}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Botón Imprimir con navegador */}
              <button
                type="button"
                onClick={handlePrintWindow}
                className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-transform transform hover:scale-105"
                title="Abre el cuadro de diálogo de impresión para imprimir directamente o guardar en PDF"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimir / Guardar PDF</span>
              </button>

              {/* Botón Descargar PDF directo */}
              <button
                type="button"
                disabled={isGeneratingPdf}
                onClick={() => handleDownloadPdf(viewingItemForPrint)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>{isGeneratingPdf ? 'Generando...' : 'Descargar .PDF'}</span>
              </button>

              {/* Cerrar visor */}
              <button
                type="button"
                onClick={() => setViewingItemForPrint(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
                title="Cerrar visor"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Mensaje de éxito de exportación */}
          {pdfSuccessMessage && (
            <div className="print:hidden p-2.5 bg-emerald-500 text-white text-xs font-bold text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{pdfSuccessMessage}</span>
            </div>
          )}

          {/* Canvas de Hojas para Imprimir / Previsualizar */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col items-center gap-8 bg-slate-950/80">
            {(() => {
              const studentsToRender =
                selectedStudentIdFilter === 'all'
                  ? eligibleStudents
                  : eligibleStudents.filter((s) => s.id === selectedStudentIdFilter);

              return studentsToRender.map((student, sIdx) => {
                const folio =
                  viewingItemForPrint.foliosPorAlumno?.[student.id] ||
                  String(sIdx + 1).padStart(3, '0');
                const authCode = generateAuthenticityCode(viewingItemForPrint, student.id, folio);
                const qrUrl = qrCache[`${student.id}_${folio}`];

                if (viewingItemForPrint.tipo === 'rifa') {
                  // ===== PLANTILLA RIFA: 1 HOJA CARTA EXACTA =====
                  return (
                    <div
                      key={student.id}
                      className="print-page-break bg-white text-slate-900 w-[215.9mm] min-h-[279.4mm] max-h-[279.4mm] p-[8mm] shadow-2xl rounded-sm flex flex-col justify-between border border-slate-300 relative box-border overflow-hidden"
                    >
                      {/* Borde exterior decorativo */}
                      <div className="border-2 border-rose-700 rounded-xl p-3.5 flex flex-col justify-between h-full box-border">
                        {/* 1. Header con Logo, Institución, Título y Folio */}
                        <div className="flex items-start justify-between gap-3 border-b-2 border-rose-200 pb-3">
                          <div className="flex items-center gap-3">
                            {effectiveLogoUrl && (
                              <img
                                src={effectiveLogoUrl}
                                alt="Logo Institución"
                                className="w-14 h-14 object-contain rounded-lg border border-slate-200 p-0.5"
                              />
                            )}
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-900 font-extrabold text-[10px] rounded uppercase tracking-wider">
                                  Talonario Oficial
                                </span>
                                <span className="text-[11px] font-bold text-slate-600">
                                  {config.institucion} — {config.nombreCurso}
                                </span>
                              </div>
                              <h1 className="text-xl font-black text-rose-900 uppercase tracking-tight mt-0.5">
                                {viewingItemForPrint.titulo}
                              </h1>
                              <p className="text-[11px] text-slate-600">
                                Sorteo: <strong>{viewingItemForPrint.fechaSorteo}</strong> {viewingItemForPrint.horaSorteo ? `a las ${viewingItemForPrint.horaSorteo}` : ''} | Lugar: <strong>{viewingItemForPrint.lugarSorteo}</strong>
                              </p>
                            </div>
                          </div>

                          <div className="bg-rose-700 text-white px-4 py-2 rounded-xl text-center shadow-xs shrink-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider block">FOLIO N°</span>
                            <span className="text-2xl font-black font-mono leading-none">#{folio}</span>
                          </div>
                        </div>

                        {/* 2. Barra de Alumno Responsable (SOLO NOMBRE Y APELLIDO, SIN RUT) */}
                        <div className="bg-slate-100 p-2 rounded-lg border border-slate-200 flex items-center justify-between text-xs my-2">
                          <div>
                            <span className="text-slate-500 font-medium">Alumno(a) Responsable:</span>{' '}
                            <strong className="text-slate-900 font-bold text-sm">
                              {student.nombres} {student.apellidos}
                            </strong>
                          </div>
                          <div className="flex items-center gap-3 font-mono text-[11px]">
                            <span>
                              Valor Número: <strong className="text-rose-700">${viewingItemForPrint.valorNumero.toLocaleString('es-CL')} CLP</strong>
                            </span>
                            <span className="text-slate-400">|</span>
                            <span>
                              Reg: <strong className="text-slate-700">{authCode}</strong>
                            </span>
                          </div>
                        </div>

                        {/* 3. Cuerpo Central: Izquierda Premios & Banco; Derecha Grilla de Números */}
                        <div className="grid grid-cols-12 gap-3.5 my-1 flex-1">
                          {/* Columna Izquierda (5 columnas de 12) */}
                          <div className="col-span-5 flex flex-col justify-between space-y-2.5">
                            {/* Caja de Premios */}
                            <div className="border border-amber-200 bg-amber-50/50 rounded-xl overflow-hidden p-2.5 flex-1">
                              <div className="bg-amber-600 text-white px-2 py-1 rounded-md text-[11px] font-bold flex items-center gap-1.5 mb-2">
                                <Trophy className="w-3.5 h-3.5 text-yellow-300" />
                                <span>LISTA DE PREMIOS OFICIALES</span>
                              </div>
                              <div className="space-y-1.5">
                                {viewingItemForPrint.premios.map((premio) => (
                                  <div key={premio.id} className="text-[10px] leading-tight">
                                    <strong className="text-slate-900 block font-bold">
                                      {premio.nombre}
                                    </strong>
                                    {premio.descripcion && (
                                      <span className="text-slate-500 text-[9px] block">
                                        {premio.descripcion}
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Datos Bancarios para Transferencia */}
                            <div className="border border-sky-200 bg-sky-50/60 rounded-xl p-2.5 text-[10px] space-y-1">
                              <div className="bg-sky-700 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 mb-1.5">
                                <CreditCard className="w-3 h-3 text-sky-200" />
                                <span>DATOS PARA TRANSFERENCIA BANCARIA</span>
                              </div>
                              <div className="text-slate-800 space-y-0.5">
                                <div>Banco: <strong>{config.datosBancarios.banco}</strong></div>
                                <div>Tipo de Cuenta: <strong>{config.datosBancarios.tipoCuenta}</strong></div>
                                <div>N° Cuenta: <strong>{config.datosBancarios.numeroCuenta}</strong></div>
                                <div>Titular: <strong>{config.datosBancarios.titularNombre}</strong></div>
                                <div>RUT Titular Cuenta: <strong>{config.datosBancarios.titularRut}</strong></div>
                                <div>Email: <strong>{config.datosBancarios.emailConfirmacion || 'tesoreria.curso@gmail.com'}</strong></div>
                              </div>
                              <p className="text-[8.5px] text-slate-500 italic pt-0.5">
                                * Indicar en el comprobante: Folio #{folio} y Nombre del Comprador.
                              </p>
                            </div>

                            {/* Sello QR de Autenticidad */}
                            <div className="border border-slate-200 bg-slate-50 rounded-xl p-2 flex items-center gap-2">
                              {qrUrl ? (
                                <img
                                  src={qrUrl}
                                  alt="Código QR de Autenticidad"
                                  className="w-16 h-16 object-contain shrink-0 bg-white p-0.5 rounded border border-slate-200"
                                />
                              ) : (
                                <div className="w-16 h-16 bg-slate-200 rounded flex items-center justify-center text-[9px] text-slate-500 text-center shrink-0">
                                  Generando QR...
                                </div>
                              )}
                              <div className="text-[9px] text-slate-600 leading-tight">
                                <strong className="text-slate-900 block font-bold text-[10px]">
                                  Autenticidad Verificada
                                </strong>
                                <span>Escanea este código QR con tu celular para validar la rifa.</span>
                                <span className="font-mono text-slate-700 font-bold block mt-1">
                                  {authCode}
                                </span>
                                <span className="text-[8px] text-slate-400 block">
                                  Privacidad garantizada (sin RUT alumno)
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Columna Derecha: Grilla de Números para vender (7 columnas de 12) */}
                          <div className="col-span-7 flex flex-col">
                            <div className="bg-rose-700 text-white py-1.5 px-3 rounded-t-xl font-bold text-[11px] flex justify-between items-center">
                              <span>NÚMEROS A VENDER — TALONARIO FOLIO #{folio}</span>
                              <span className="text-[9px] text-rose-200">
                                Total: {viewingItemForPrint.cantidadNumerosPorAlumno} números
                              </span>
                            </div>

                            <table className="w-full text-left text-[10.5px] border border-slate-300 border-t-0 divide-y divide-slate-200 flex-1">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 font-bold text-[10px]">
                                  <th className="py-1 px-1.5 text-center w-10 border-r border-slate-200">N°</th>
                                  <th className="py-1 px-2 border-r border-slate-200">Nombre del Comprador</th>
                                  <th className="py-1 px-2 border-r border-slate-200">Teléfono Contacto</th>
                                  <th className="py-1 px-1.5 text-center w-16">Pagado / Firma</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-200">
                                {Array.from({ length: viewingItemForPrint.cantidadNumerosPorAlumno || 10 }).map((_, nIdx) => (
                                  <tr key={nIdx} className="h-6">
                                    <td className="py-1 px-1 text-center font-bold font-mono text-slate-800 border-r border-slate-200 bg-slate-50">
                                      {String(nIdx + 1).padStart(2, '0')}
                                    </td>
                                    <td className="py-1 px-2 border-r border-slate-200 text-slate-400"></td>
                                    <td className="py-1 px-2 border-r border-slate-200 text-slate-400"></td>
                                    <td className="py-1 px-1.5 text-center text-slate-300 text-[9px] font-mono">
                                      ${viewingItemForPrint.valorNumero.toLocaleString('es-CL')}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* 4. Talón Desprendible de Control (Pie de hoja carta) */}
                        <div className="pt-2 border-t-2 border-dashed border-slate-400 mt-2">
                          <div className="bg-yellow-50/80 border border-yellow-300 rounded-xl p-2.5 flex items-center justify-between text-xs">
                            <div className="space-y-0.5">
                              <span className="font-extrabold text-amber-900 block text-[11px]">
                                TALÓN DE RENDICIÓN Y CONTROL — FOLIO #{folio} ({viewingItemForPrint.titulo})
                              </span>
                              <span className="text-[10px] text-slate-700 block">
                                Alumno: <strong>{student.nombres} {student.apellidos}</strong> · Total a rendir:{' '}
                                <strong>
                                  {viewingItemForPrint.cantidadNumerosPorAlumno} números × ${viewingItemForPrint.valorNumero.toLocaleString('es-CL')} = $
                                  {(viewingItemForPrint.cantidadNumerosPorAlumno * viewingItemForPrint.valorNumero).toLocaleString('es-CL')} CLP
                                </strong>
                              </span>
                              <span className="text-[9px] text-slate-500 block">
                                Instrucciones: Devolver este talón con el dinero o comprobantes de transferencia a la Tesorería antes del sorteo.
                              </span>
                            </div>

                            <div className="flex items-center gap-6 text-[10px] text-slate-500 shrink-0">
                              <div className="text-center">
                                <div className="w-24 border-b border-slate-400 mb-1"></div>
                                <span>Firma Apoderado</span>
                              </div>
                              <div className="text-center">
                                <div className="w-24 border-b border-slate-400 mb-1"></div>
                                <span>Recibido Tesorería</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                } else {
                  // ===== PLANTILLA BINGO: FORMATO EN 1/4 DE HOJA CARTA =====
                  // 4 cartones por hoja Carta (distribuidos en grilla 2x2)
                  return (
                    <div
                      key={student.id}
                      className="print-page-break bg-white text-slate-900 w-[215.9mm] min-h-[279.4mm] max-h-[279.4mm] p-[6mm] shadow-2xl rounded-sm grid grid-cols-2 grid-rows-2 gap-[4mm] border border-slate-300 box-border overflow-hidden"
                    >
                      {Array.from({ length: 4 }).map((_, cIdx) => {
                        const matrix = generateBingoCardMatrix(
                          `${viewingItemForPrint.id}-${student.id}-${folio}-${cIdx}`
                        );

                        return (
                          <div
                            key={cIdx}
                            className="border-2 border-dashed border-indigo-400 rounded-xl p-2.5 flex flex-col justify-between bg-white relative box-border overflow-hidden"
                          >
                            {/* Header del Cartón (1/4 de hoja carta) */}
                            <div className="bg-indigo-700 text-white p-2 rounded-lg flex items-center justify-between gap-1.5">
                              <div className="flex items-center gap-2">
                                {effectiveLogoUrl && (
                                  <img
                                    src={effectiveLogoUrl}
                                    alt="Logo"
                                    className="w-8 h-8 object-contain rounded bg-white p-0.5"
                                  />
                                )}
                                <div>
                                  <h4 className="font-black text-xs uppercase leading-tight">
                                    {viewingItemForPrint.titulo}
                                  </h4>
                                  <span className="text-[9px] text-indigo-200 block">
                                    {config.institucion} · {viewingItemForPrint.fechaSorteo}
                                  </span>
                                </div>
                              </div>
                              <div className="text-right shrink-0 bg-white/10 px-2 py-0.5 rounded text-[10px] font-mono">
                                <strong>Cartón {cIdx + 1}/4</strong>
                                <span className="block text-[9px] text-indigo-200">#{folio}</span>
                              </div>
                            </div>

                            {/* Alumno responsable (SIN RUT) */}
                            <div className="bg-indigo-50 px-2 py-1 rounded text-[9.5px] text-indigo-950 font-bold my-1 flex justify-between">
                              <span>Alumno: {student.nombres} {student.apellidos}</span>
                              <span className="font-mono text-indigo-700">${viewingItemForPrint.valorNumero.toLocaleString('es-CL')}</span>
                            </div>

                            {/* Matriz B-I-N-G-O 5x5 */}
                            <div className="my-1 border border-indigo-300 rounded-lg overflow-hidden">
                              {/* Header B-I-N-G-O */}
                              <div className="grid grid-cols-5 bg-indigo-800 text-white text-center font-black text-xs py-1">
                                <div>B</div>
                                <div>I</div>
                                <div>N</div>
                                <div>G</div>
                                <div>O</div>
                              </div>
                              {/* Celdas 5x5 */}
                              {matrix.map((row, rIdx) => (
                                <div
                                  key={rIdx}
                                  className="grid grid-cols-5 text-center text-xs font-bold divide-x divide-indigo-200 border-t border-indigo-200"
                                >
                                  {row.map((cell, colIdx) => (
                                    <div
                                      key={colIdx}
                                      className={`py-1.5 font-mono ${
                                        cell === 'LIBRE'
                                          ? 'bg-amber-100 text-amber-900 font-extrabold text-[9px] flex items-center justify-center'
                                          : 'text-slate-900'
                                      }`}
                                    >
                                      {cell === 'LIBRE' ? '★ LIBRE' : cell}
                                    </div>
                                  ))}
                                </div>
                              ))}
                            </div>

                            {/* Footer del cartón: Premios, Datos Bancarios y QR */}
                            <div className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-between gap-1.5 text-[8.5px]">
                              <div className="space-y-0.5 text-slate-700 leading-tight flex-1">
                                <div className="font-bold text-indigo-900 truncate">
                                  Premios: {viewingItemForPrint.premios.map((p) => p.nombre).join(' | ')}
                                </div>
                                <div className="truncate text-slate-600">
                                  Transf: {config.datosBancarios.banco} | Cta {config.datosBancarios.numeroCuenta}
                                </div>
                                <div className="font-mono text-slate-500 text-[8px]">
                                  Reg: {authCode}
                                </div>
                              </div>

                              {qrUrl && (
                                <img
                                  src={qrUrl}
                                  alt="QR"
                                  className="w-10 h-10 object-contain shrink-0 bg-white p-0.5 rounded border border-slate-200"
                                />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                }
              });
            })()}
          </div>
        </div>
      )}
    </div>
  );
};
