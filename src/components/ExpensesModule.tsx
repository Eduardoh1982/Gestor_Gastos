import React, { useState, useMemo } from 'react';
import {
  Receipt,
  PlusCircle,
  Search,
  Filter,
  Image as ImageIcon,
  Edit2,
  Trash2,
  ExternalLink,
  Calendar,
  Layers,
  X,
  AlertCircle,
  Upload,
  CheckCircle2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCw,
} from 'lucide-react';
import { Expense, ExpenseCategory, UserRole } from '../types';
import { formatCurrency, addMovementLog } from '../services/storage';

interface ExpensesModuleProps {
  year: number;
  expenses: Expense[];
  onUpdateExpenses: (expenses: Expense[]) => void;
  categories: ExpenseCategory[];
  onUpdateCategories: (categories: ExpenseCategory[]) => void;
  userRole: UserRole;
}

export const ExpensesModule: React.FC<ExpensesModuleProps> = ({
  year,
  expenses,
  onUpdateExpenses,
  categories,
  onUpdateCategories,
  userRole,
}) => {
  const isAuditor = userRole === 'auditor';

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [deletingExpense, setDeletingExpense] = useState<Expense | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<Expense | null>(null);
  const [showCategoryManager, setShowCategoryManager] = useState(false);

  // Zoom & receipt viewer states
  const [receiptZoom, setReceiptZoom] = useState<number>(1);
  const [receiptRotation, setReceiptRotation] = useState<number>(0);
  const [isFullscreenReceipt, setIsFullscreenReceipt] = useState<boolean>(false);

  const handleOpenReceiptModal = (expense: Expense) => {
    setReceiptZoom(1);
    setReceiptRotation(0);
    setIsFullscreenReceipt(false);
    setViewingReceipt(expense);
  };

  const handleZoomIn = () => {
    setReceiptZoom((prev) => Math.min(3.5, Number((prev + 0.35).toFixed(2))));
  };

  const handleZoomOut = () => {
    setReceiptZoom((prev) => Math.max(0.6, Number((prev - 0.35).toFixed(2))));
  };

  const handleResetZoom = () => {
    setReceiptZoom(1);
    setReceiptRotation(0);
  };

  const handleRotate = () => {
    setReceiptRotation((prev) => (prev + 90) % 360);
  };

  const handleToggleClickZoom = () => {
    setReceiptZoom((prev) => (prev <= 1 ? 1.8 : 1));
  };

  // Form states for Expense
  const [formDescripcion, setFormDescripcion] = useState('');
  const [formCategoriaId, setFormCategoriaId] = useState(categories[0]?.id || '');
  const [formMonto, setFormMonto] = useState<number | ''>('');
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formProveedor, setFormProveedor] = useState('');
  const [formNumeroBoleta, setFormNumeroBoleta] = useState('');
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formComprobanteUrl, setFormComprobanteUrl] = useState<string>('');

  // Category Manager states
  const [newCatNombre, setNewCatNombre] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3B82F6');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);

  // Filter expenses by active year
  const yearExpenses = useMemo(() => {
    return expenses.filter((e) => e.year === year);
  }, [expenses, year]);

  const filteredExpenses = useMemo(() => {
    return yearExpenses.filter((e) => {
      const matchesSearch =
        e.descripcion.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.proveedor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.numeroBoleta.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCat =
        selectedCategory === 'all' || e.categoriaId === selectedCategory;

      return matchesSearch && matchesCat;
    });
  }, [yearExpenses, searchTerm, selectedCategory]);

  const totalGastos = useMemo(() => {
    return yearExpenses.reduce((acc, curr) => acc + curr.monto, 0);
  }, [yearExpenses]);

  // Open modal for new expense
  const openCreateModal = () => {
    setFormDescripcion('');
    setFormCategoriaId(categories[0]?.id || '');
    setFormMonto('');
    setFormFecha(new Date().toISOString().split('T')[0]);
    setFormProveedor('');
    setFormNumeroBoleta('');
    setFormObservaciones('');
    setFormComprobanteUrl('');
    setEditingExpense(null);
    setModalMode('create');
  };

  // Open modal for editing expense
  const openEditModal = (expense: Expense) => {
    setFormDescripcion(expense.descripcion);
    setFormCategoriaId(expense.categoriaId);
    setFormMonto(expense.monto);
    setFormFecha(expense.fecha);
    setFormProveedor(expense.proveedor);
    setFormNumeroBoleta(expense.numeroBoleta);
    setFormObservaciones(expense.observaciones || '');
    setFormComprobanteUrl(expense.comprobanteUrl || '');
    setEditingExpense(expense);
    setModalMode('edit');
  };

  // Handle image upload from file input (convert to base64)
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: 5MB
    if (file.size > 5 * 1024 * 1024) {
      alert('La imagen es demasiado pesada. El tamaño máximo recomendado es 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setFormComprobanteUrl(result);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAuditor) return;
    if (!formMonto || Number(formMonto) <= 0) return;

    const matchedCat = categories.find((c) => c.id === formCategoriaId);
    const catNombre = matchedCat ? matchedCat.nombre : 'General';

    if (modalMode === 'create') {
      const newExp: Expense = {
        id: `exp-${Date.now()}`,
        year,
        descripcion: formDescripcion.trim(),
        categoriaId: formCategoriaId,
        categoriaNombre: catNombre,
        monto: Number(formMonto),
        fecha: formFecha,
        proveedor: formProveedor.trim(),
        numeroBoleta: formNumeroBoleta.trim(),
        observaciones: formObservaciones.trim(),
        comprobanteUrl: formComprobanteUrl,
      };
      onUpdateExpenses([newExp, ...expenses]);

      addMovementLog({
        modulo: 'gastos',
        tipoAccion: 'gasto_creado',
        titulo: `Rendición de Gasto Registrada ($${Number(formMonto).toLocaleString('es-CL')})`,
        descripcion: `Gasto "${newExp.descripcion}" registrado. Proveedor: ${newExp.proveedor || 'N/A'}, Boleta: ${newExp.numeroBoleta || 'S/N'}, Categoría: ${catNombre}.`,
        rol: userRole,
        montoAfectado: Number(formMonto),
        referenciaId: newExp.id,
        referenciaNombre: newExp.proveedor || newExp.descripcion,
        detallesAdicionales: { categoria: catNombre, boleta: newExp.numeroBoleta, fecha: formFecha },
      });
    } else if (modalMode === 'edit' && editingExpense) {
      const updated = expenses.map((item) =>
        item.id === editingExpense.id
          ? {
              ...item,
              descripcion: formDescripcion.trim(),
              categoriaId: formCategoriaId,
              categoriaNombre: catNombre,
              monto: Number(formMonto),
              fecha: formFecha,
              proveedor: formProveedor.trim(),
              numeroBoleta: formNumeroBoleta.trim(),
              observaciones: formObservaciones.trim(),
              comprobanteUrl: formComprobanteUrl,
            }
          : item
      );
      onUpdateExpenses(updated);

      addMovementLog({
        modulo: 'gastos',
        tipoAccion: 'gasto_editado',
        titulo: `Gasto Modificado: ${formDescripcion.trim()}`,
        descripcion: `Se actualizaron los datos del gasto. Nuevo monto: $${Number(formMonto).toLocaleString('es-CL')} CLP. Proveedor: ${formProveedor.trim() || 'N/A'}.`,
        rol: userRole,
        montoAfectado: Number(formMonto),
        referenciaId: editingExpense.id,
        referenciaNombre: formProveedor.trim() || formDescripcion.trim(),
      });
    }

    setModalMode(null);
    setEditingExpense(null);
  };

  const handleDeleteExpense = (id: string) => {
    if (isAuditor) return;
    const target = expenses.find((e) => e.id === id);
    onUpdateExpenses(expenses.filter((e) => e.id !== id));

    if (target) {
      addMovementLog({
        modulo: 'gastos',
        tipoAccion: 'gasto_eliminado',
        titulo: `Gasto Eliminado: ${target.descripcion}`,
        descripcion: `Se eliminó el registro de gasto por $${target.monto.toLocaleString('es-CL')} CLP (Boleta: ${target.numeroBoleta || 'S/N'}, Proveedor: ${target.proveedor || 'N/A'}).`,
        rol: userRole,
        montoAfectado: target.monto,
        referenciaId: target.id,
        referenciaNombre: target.proveedor || target.descripcion,
      });
    }

    setDeletingExpense(null);
  };

  // Category Manager CRUD
  const handleAddCategory = () => {
    if (!newCatNombre.trim()) return;
    const newCat: ExpenseCategory = {
      id: `cat-${Date.now()}`,
      nombre: newCatNombre.trim(),
      color: newCatColor,
    };
    onUpdateCategories([...categories, newCat]);
    setNewCatNombre('');
  };

  const handleDeleteCategory = (catId: string) => {
    if (categories.length <= 1) {
      alert('Debe existir al menos una categoría de gasto en el sistema.');
      return;
    }
    onUpdateCategories(categories.filter((c) => c.id !== catId));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner and Summary */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-red-600" />
            Gastos y Egresos ({year})
          </h2>
          <p className="text-xs text-slate-500">
            Control de egresos, compras de insumos, boletas y rendición de cuentas con comprobantes.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCategoryManager(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 shadow-xs cursor-pointer transition-colors"
          >
            <Layers className="w-4 h-4 text-slate-500" />
            Mantenedor de Categorías
          </button>

          <button
            disabled={isAuditor}
            onClick={openCreateModal}
            className={`flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors cursor-pointer ${
              isAuditor ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            Registrar Gasto
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Total Gastos {year}</p>
          <p className="text-3xl font-extrabold text-red-600 tabular-nums">
            {formatCurrency(totalGastos)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Comprobantes Registrados</p>
          <p className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {yearExpenses.length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 mb-1">Boletas con Foto Adjunta</p>
          <p className="text-3xl font-extrabold text-emerald-600 tabular-nums">
            {yearExpenses.filter((e) => e.comprobanteUrl).length}
          </p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por descripción, proveedor o número de boleta..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600 bg-white"
          >
            <option value="all">Todas las categorías ({categories.length})</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4">Fecha</th>
                <th className="py-3 px-4">Descripción del Gasto</th>
                <th className="py-3 px-3">Categoría</th>
                <th className="py-3 px-3">Proveedor</th>
                <th className="py-3 px-3 font-mono">N° Boleta</th>
                <th className="py-3 px-3 text-right">Monto</th>
                <th className="py-3 px-3 text-center">Boleta</th>
                <th className="py-3 px-4 text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No hay gastos registrados para el criterio de búsqueda en el año {year}.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((expense) => {
                  const cat = categories.find((c) => c.id === expense.categoriaId);
                  return (
                    <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-slate-600 whitespace-nowrap">
                        {expense.fecha}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-xs">
                          {expense.descripcion}
                        </div>
                        {expense.observaciones && (
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {expense.observaciones}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-3 whitespace-nowrap">
                        <span
                          className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold"
                          style={{
                            backgroundColor: `${cat?.color || '#3B82F6'}15`,
                            color: cat?.color || '#3B82F6',
                          }}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cat?.color || '#3B82F6' }}
                          />
                          {expense.categoriaNombre}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-700">
                        {expense.proveedor || '-'}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-600">
                        {expense.numeroBoleta || '-'}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono font-bold text-red-600 text-sm">
                        {formatCurrency(expense.monto)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {expense.comprobanteUrl ? (
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => handleOpenReceiptModal(expense)}
                              title="Agrandar imagen de la boleta con lupa"
                              className="group inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 rounded-lg transition-all shadow-xs cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5 text-indigo-600 group-hover:text-white transition-colors" />
                              <span>Ver Boleta (Lupa)</span>
                            </button>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Sin foto</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            disabled={isAuditor}
                            onClick={() => openEditModal(expense)}
                            title="Editar gasto"
                            className={`p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors ${
                              isAuditor ? 'opacity-40 cursor-not-allowed' : ''
                            }`}
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            disabled={isAuditor}
                            onClick={() => setDeletingExpense(expense)}
                            title="Eliminar gasto"
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

      {/* CREATE / EDIT EXPENSE MODAL */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-red-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {modalMode === 'create' ? 'Registrar Nuevo Gasto' : 'Editar Gasto'}
                </h3>
                <p className="text-xs text-red-200">
                  Período Contable {year}
                </p>
              </div>
              <button
                onClick={() => setModalMode(null)}
                className="text-red-200 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Descripción del Gasto *
                </label>
                <input
                  type="text"
                  required
                  value={formDescripcion}
                  onChange={(e) => setFormDescripcion(e.target.value)}
                  placeholder="Ej: Compra de útiles de aseo, cloro y toallas nova"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Categoría *
                  </label>
                  <select
                    required
                    value={formCategoriaId}
                    onChange={(e) => setFormCategoriaId(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600 bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.nombre}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Monto ($ CLP) *
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={formMonto}
                    onChange={(e) => setFormMonto(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="Ej: 15000"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Fecha del Gasto *
                  </label>
                  <input
                    type="date"
                    required
                    value={formFecha}
                    onChange={(e) => setFormFecha(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Proveedor / Comercio
                  </label>
                  <input
                    type="text"
                    value={formProveedor}
                    onChange={(e) => setFormProveedor(e.target.value)}
                    placeholder="Ej: Supermercado Líder"
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Número de Boleta / Factura
                </label>
                <input
                  type="text"
                  value={formNumeroBoleta}
                  onChange={(e) => setFormNumeroBoleta(e.target.value)}
                  placeholder="Ej: BOL-193847"
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg font-mono focus:ring-2 focus:ring-red-600"
                />
              </div>

              {/* UPLOAD RECEIPT PHOTO */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Foto de la Boleta o Comprobante
                </label>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shadow-xs">
                    <Upload className="w-4 h-4 text-slate-500" />
                    Subir Foto / Archivo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageFileChange}
                      className="hidden"
                    />
                  </label>
                  {formComprobanteUrl && (
                    <button
                      type="button"
                      onClick={() => setFormComprobanteUrl('')}
                      className="text-xs text-red-600 hover:underline"
                    >
                      Quitar foto
                    </button>
                  )}
                </div>

                {formComprobanteUrl && (
                  <div className="mt-2 flex items-center gap-3">
                    <div className="relative w-28 h-28 rounded-xl border border-slate-300 overflow-hidden bg-slate-100 shadow-xs group">
                      <img
                        src={formComprobanteUrl}
                        alt="Boleta preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenReceiptModal({
                            id: 'preview-form',
                            year,
                            descripcion: formDescripcion || 'Comprobante de Boleta',
                            monto: Number(formMonto) || 0,
                            fecha: formFecha,
                            categoriaId: formCategoriaId,
                            categoriaNombre: '',
                            proveedor: formProveedor,
                            numeroBoleta: formNumeroBoleta,
                            comprobanteUrl: formComprobanteUrl,
                          })
                        }
                        title="Agrandar imagen de la boleta con lupa"
                        className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity cursor-pointer p-1 text-center"
                      >
                        <ZoomIn className="w-5 h-5 mb-1 text-emerald-400" />
                        <span className="text-[10px] font-bold">Agrandar</span>
                      </button>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenReceiptModal({
                            id: 'preview-form',
                            year,
                            descripcion: formDescripcion || 'Comprobante de Boleta',
                            monto: Number(formMonto) || 0,
                            fecha: formFecha,
                            categoriaId: formCategoriaId,
                            categoriaNombre: '',
                            proveedor: formProveedor,
                            numeroBoleta: formNumeroBoleta,
                            comprobanteUrl: formComprobanteUrl,
                          })
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-200 transition-colors cursor-pointer shadow-xs"
                      >
                        <ZoomIn className="w-4 h-4 text-indigo-600" />
                        <span>Agrandar Imagen (Lupa)</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormComprobanteUrl('')}
                        className="text-xs text-red-600 hover:text-red-700 text-left hover:underline"
                      >
                        Eliminar foto
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  rows={2}
                  value={formObservaciones}
                  onChange={(e) => setFormObservaciones(e.target.value)}
                  placeholder="Detalles adicionales sobre la rendición..."
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-600"
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
                  className="px-5 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs"
                >
                  {modalMode === 'create' ? 'Guardar Gasto' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW RECEIPT MODAL WITH ZOOM & LUPA CONTROLS */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-2 sm:p-4">
          <div
            className={`bg-white rounded-2xl w-full shadow-2xl overflow-hidden border border-slate-700 flex flex-col transition-all duration-200 ${
              isFullscreenReceipt
                ? 'fixed inset-2 z-50 max-w-none max-h-none h-[calc(100vh-1rem)]'
                : 'max-w-4xl max-h-[92vh] h-auto'
            }`}
          >
            {/* Top Toolbar */}
            <div className="p-3 sm:p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white leading-tight">
                    {viewingReceipt.descripcion}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-300 mt-0.5">
                    <span className="font-bold text-emerald-400 font-mono">
                      {formatCurrency(viewingReceipt.monto)}
                    </span>
                    {viewingReceipt.proveedor && (
                      <>
                        <span>•</span>
                        <span>{viewingReceipt.proveedor}</span>
                      </>
                    )}
                    {viewingReceipt.numeroBoleta && (
                      <>
                        <span>•</span>
                        <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700 text-[11px]">
                          N° {viewingReceipt.numeroBoleta}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* LUPA & ZOOM CONTROLS TOOLBAR */}
              <div className="flex items-center flex-wrap gap-1.5 self-end sm:self-auto">
                {/* BOTÓN PRINCIPAL DE LUPA PARA AGRANDAR IMAGEN */}
                <button
                  type="button"
                  onClick={handleZoomIn}
                  title="Agrandar imagen de la boleta con lupa"
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold shadow-md shadow-emerald-950/40 transition-all cursor-pointer"
                >
                  <ZoomIn className="w-4 h-4 text-emerald-100" />
                  <span>Agrandar (Lupa)</span>
                </button>

                {/* BOTÓN REDUCIR */}
                <button
                  type="button"
                  onClick={handleZoomOut}
                  disabled={receiptZoom <= 0.6}
                  title="Reducir imagen"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors disabled:opacity-40 cursor-pointer"
                >
                  <ZoomOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Reducir</span>
                </button>

                {/* ZOOM LEVEL BADGE & RESET */}
                <button
                  type="button"
                  onClick={handleResetZoom}
                  title="Restablecer tamaño original (100%)"
                  className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-mono font-semibold border border-slate-700 transition-colors cursor-pointer"
                >
                  {Math.round(receiptZoom * 100)}%
                </button>

                {/* BOTÓN ROTAR */}
                <button
                  type="button"
                  onClick={handleRotate}
                  title="Girar imagen 90°"
                  className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  <RotateCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Rotar</span>
                </button>

                {/* TOGGLE FULLSCREEN */}
                <button
                  type="button"
                  onClick={() => setIsFullscreenReceipt(!isFullscreenReceipt)}
                  title={isFullscreenReceipt ? 'Salir de pantalla completa' : 'Ver a pantalla completa'}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700 transition-colors cursor-pointer"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>

                {/* CLOSE MODAL */}
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  title="Cerrar visor"
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors ml-1 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Viewport / Image Container with Zoom & Pan */}
            <div className="relative flex-1 bg-slate-950 p-4 sm:p-6 overflow-auto flex items-center justify-center min-h-[340px] max-h-[72vh] select-none">
              {/* Floating Quick Lupa Helper Badge in corner */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-md p-1.5 rounded-xl border border-slate-700/80 shadow-lg">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  title="Agrandar imagen con lupa"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                  <span>Agrandar Imagen</span>
                </button>
                <button
                  type="button"
                  onClick={handleRotate}
                  className="p-1 text-slate-300 hover:text-white hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  title="Rotar 90°"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                </button>
              </div>

              {viewingReceipt.comprobanteUrl ? (
                <div
                  onClick={handleToggleClickZoom}
                  title={receiptZoom > 1 ? 'Haz clic para restablecer tamaño' : 'Haz clic para agrandar imagen'}
                  className={`transition-all duration-200 flex items-center justify-center ${
                    receiptZoom > 1 ? 'cursor-zoom-out' : 'cursor-zoom-in'
                  }`}
                >
                  <img
                    src={viewingReceipt.comprobanteUrl}
                    alt="Comprobante de boleta"
                    style={{
                      transform: `scale(${receiptZoom}) rotate(${receiptRotation}deg)`,
                      transformOrigin: 'center center',
                      transition: 'transform 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
                    }}
                    className="max-h-[58vh] max-w-full object-contain rounded-xl shadow-2xl border border-slate-800"
                  />
                </div>
              ) : (
                <div className="text-center p-8 text-slate-400">
                  <Receipt className="w-12 h-12 mx-auto text-slate-600 mb-2" />
                  <p className="text-sm font-semibold">Sin imagen de boleta disponible.</p>
                </div>
              )}
            </div>

            {/* Bottom Bar: Metadata & Quick instructions */}
            <div className="p-3 sm:p-4 bg-slate-900 border-t border-slate-800 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 text-slate-400">
                <span className="text-emerald-400 font-semibold">💡 Tip de lectura:</span>
                <span>
                  Usa el botón <strong>Agrandar (Lupa)</strong> para ampliar números, RUT y detalles pequeños de la boleta.
                </span>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-auto">
                <button
                  type="button"
                  onClick={handleResetZoom}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-medium border border-slate-700 transition-colors cursor-pointer"
                >
                  Tamaño Original (100%)
                </button>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="px-4 py-1.5 bg-white text-slate-950 font-bold rounded-lg text-xs hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cerrar Visor
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CATEGORY MANAGER MODAL */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-100">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Mantenedor de Categorías</h3>
              </div>
              <button
                onClick={() => setShowCategoryManager(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Add category form */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <p className="text-xs font-bold text-slate-800">Crear Nueva Categoría</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Nombre (ej: Premios, Botiquín)"
                    value={newCatNombre}
                    onChange={(e) => setNewCatNombre(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-600"
                  />
                  <input
                    type="color"
                    value={newCatColor}
                    onChange={(e) => setNewCatColor(e.target.value)}
                    title="Color identificador"
                    className="w-8 h-8 rounded-lg border border-slate-300 cursor-pointer"
                  />
                  <button
                    disabled={isAuditor || !newCatNombre.trim()}
                    onClick={handleAddCategory}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs disabled:opacity-50"
                  >
                    Agregar
                  </button>
                </div>
              </div>

              {/* List of categories */}
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {categories.map((cat) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-2.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: cat.color || '#3B82F6' }}
                      />
                      <span className="font-semibold text-slate-800">{cat.nombre}</span>
                    </div>

                    {!isAuditor && (
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        title="Eliminar categoría"
                        className="text-slate-400 hover:text-red-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowCategoryManager(false)}
                  className="px-4 py-1.5 text-xs font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {deletingExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl max-w-sm w-full p-5 shadow-xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 mx-auto flex items-center justify-center">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-base">¿Eliminar gasto?</h4>
              <p className="text-xs text-slate-600 mt-1">
                Se eliminará el gasto <strong>{deletingExpense.descripcion}</strong> por{' '}
                <strong>{formatCurrency(deletingExpense.monto)}</strong>.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeletingExpense(null)}
                className="px-4 py-2 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteExpense(deletingExpense.id)}
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
