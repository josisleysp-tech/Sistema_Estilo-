'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Search, 
  Filter, 
  ShoppingBag, 
  Calendar, 
  CreditCard, 
  Package, 
  X, 
  User, 
  Hash, 
  Eye, 
  ChevronRight, 
  ChevronLeft, 
  CornerDownRight,
  TrendingUp,
  FileText,
  FileImage,
  ShieldAlert,
  Clock,
  Printer,
  SlidersHorizontal,
  Plus,
  Edit,
  UploadCloud,
  ClipboardList
} from 'lucide-react';
import { SalesOrder, ProjectFile, ProductionOrder, InventoryItem, Customer } from '../lib/types';
import { getDeliveryAlertStatus } from '../lib/utils';

interface OrderQueryTabProps {
  salesOrders: SalesOrder[];
  productionOrders: ProductionOrder[];
  inventory?: InventoryItem[];
  customers?: Customer[];
  onUpdatePaymentMethod: (id: string, newPaymentMethod: string) => void;
  onUpdateStatus?: (id: string, newStatus: SalesOrder['status']) => void;
  onUpdateSalesOrder?: (id: string, updatedFields: Partial<SalesOrder>) => void;
  onGenerateOPsFromOrder?: (order: SalesOrder) => void;
  hideOrderValues?: boolean;
  alertRiskDays?: number;
  systemParams?: any;
}

export default function OrderQueryTab({ 
  salesOrders, 
  productionOrders,
  inventory = [],
  customers = [],
  onUpdatePaymentMethod, 
  onUpdateStatus,
  onUpdateSalesOrder,
  onGenerateOPsFromOrder,
  hideOrderValues = false,
  alertRiskDays,
  systemParams
}: OrderQueryTabProps) {
  // Filters state
  const [clientSearch, setClientSearch] = useState('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | SalesOrder['status']>('Todos');
  const [onlyAlertsFilter, setOnlyAlertsFilter] = useState(false);

  // Selected order for detailed modal / side panel
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editOrder, setEditOrder] = useState<SalesOrder | null>(null);

  // Edit handlers for products in Order details
  const handleAddProductRow = () => {
    if (!editOrder) return;
    const newProduct = {
      sku: '',
      name: '',
      qty: 1,
      price: 0,
      total: 0
    };
    const updatedProducts = [...(editOrder.products || []), newProduct];
    
    // Recalculate total value
    const subtotal = updatedProducts.reduce((acc, p) => acc + p.total, 0);
    const pct = editOrder.discountPercentage || 0;
    const discountAmount = (subtotal * pct) / 100;
    const newValue = subtotal - discountAmount;
    
    const itemsString = updatedProducts.map(p => p.name ? `${p.name} (${p.qty}x)` : '').filter(Boolean).join(', ');

    setEditOrder({
      ...editOrder,
      products: updatedProducts,
      items: itemsString,
      value: newValue
    });
  };

  const handleUpdateProductRow = (index: number, updatedFields: any) => {
    if (!editOrder) return;
    const updatedProducts = (editOrder.products || []).map((p, idx) => {
      if (idx === index) {
        const merged = { ...p, ...updatedFields };
        merged.total = merged.qty * merged.price;
        return merged;
      }
      return p;
    });

    // Recalculate total value
    const subtotal = updatedProducts.reduce((acc, p) => acc + p.total, 0);
    const pct = editOrder.discountPercentage || 0;
    const discountAmount = (subtotal * pct) / 100;
    const newValue = subtotal - discountAmount;
    
    const itemsString = updatedProducts.map(p => `${p.name} (${p.qty}x)`).join(', ');

    setEditOrder({
      ...editOrder,
      products: updatedProducts,
      items: itemsString,
      value: newValue
    });
  };

  const handleRemoveProductRow = (index: number) => {
    if (!editOrder) return;
    const updatedProducts = (editOrder.products || []).filter((_, idx) => idx !== index);

    // Recalculate total value
    const subtotal = updatedProducts.reduce((acc, p) => acc + p.total, 0);
    const pct = editOrder.discountPercentage || 0;
    const discountAmount = (subtotal * pct) / 100;
    const newValue = subtotal - discountAmount;
    
    const itemsString = updatedProducts.map(p => `${p.name} (${p.qty}x)`).join(', ');

    setEditOrder({
      ...editOrder,
      products: updatedProducts,
      items: itemsString,
      value: newValue
    });
  };

  const handleEditOrderFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!editOrder || !e.target.files) return;
    const filesArray = Array.from(e.target.files);
    filesArray.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        showToast('Por favor, envie apenas arquivos de imagem ou PDF.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const newFile: ProjectFile = {
            name: file.name,
            type: file.type,
            data: reader.result as string
          };
          
          setEditOrder(prev => {
            if (!prev) return null;
            const existingFiles = prev.projectFiles || (prev.projectImages || []).map((img, idx) => ({
              name: `desenho-${idx + 1}.png`,
              type: 'image/png',
              data: img
            }));
            const updatedFiles = [...existingFiles, newFile];
            const updatedImages = updatedFiles.filter(f => f.type.startsWith('image/')).map(f => f.data);
            return {
              ...prev,
              projectFiles: updatedFiles,
              projectImages: updatedImages
            };
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleEditOrderRemoveFile = (index: number) => {
    if (!editOrder) return;
    setEditOrder(prev => {
      if (!prev) return null;
      const existingFiles = prev.projectFiles || (prev.projectImages || []).map((img, idx) => ({
        name: `desenho-${idx + 1}.png`,
        type: 'image/png',
        data: img
      }));
      const updatedFiles = existingFiles.filter((_, i) => i !== index);
      const updatedImages = updatedFiles.filter(f => f.type.startsWith('image/')).map(f => f.data);
      return {
        ...prev,
        projectFiles: updatedFiles,
        projectImages: updatedImages
      };
    });
  };

  const [activePreviewImage, setActivePreviewImage] = useState<string | null>(null);
  const [printOrder, setPrintOrder] = useState<SalesOrder | null>(null);
  const [printServiceOrder, setPrintServiceOrder] = useState<SalesOrder | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  // Agenda / Calendar integrated state
  const [viewMode, setViewMode] = useState<'table' | 'agenda'>('table');
  const [agendaYear, setAgendaYear] = useState(new Date().getFullYear());
  const [agendaMonth, setAgendaMonth] = useState(new Date().getMonth());
  const [selectedAgendaDate, setSelectedAgendaDate] = useState<string | null>(null);

  const MONTH_NAMES = useMemo(() => [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ], []);

  const handlePrevMonth = () => {
    if (agendaMonth === 0) {
      setAgendaMonth(11);
      setAgendaYear(prev => prev - 1);
    } else {
      setAgendaMonth(prev => prev - 1);
    }
    setSelectedAgendaDate(null);
  };

  const handleNextMonth = () => {
    if (agendaMonth === 11) {
      setAgendaMonth(0);
      setAgendaYear(prev => prev + 1);
    } else {
      setAgendaMonth(prev => prev + 1);
    }
    setSelectedAgendaDate(null);
  };

  const handleGoToToday = () => {
    const today = new Date();
    setAgendaYear(today.getFullYear());
    setAgendaMonth(today.getMonth());
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedAgendaDate(`${y}-${m}-${d}`);
  };

  const handleCellClick = (dateString: string) => {
    setSelectedAgendaDate(prev => prev === dateString ? null : dateString);
  };

  // Generate Calendar cells for the month
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(agendaYear, agendaMonth, 1).getDay();
    const totalDays = new Date(agendaYear, agendaMonth + 1, 0).getDate();
    const prevMonthTotalDays = new Date(agendaYear, agendaMonth, 0).getDate();

    const cells = [];

    // Fill previous month days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthTotalDays - i;
      const prevDate = new Date(agendaYear, agendaMonth - 1, dayNum);
      const y = prevDate.getFullYear();
      const m = String(prevDate.getMonth() + 1).padStart(2, '0');
      const d = String(prevDate.getDate()).padStart(2, '0');
      cells.push({
        date: prevDate,
        dayNum,
        isCurrentMonth: false,
        dateString: `${y}-${m}-${d}`
      });
    }

    // Fill current month days
    for (let i = 1; i <= totalDays; i++) {
      const currentDate = new Date(agendaYear, agendaMonth, i);
      const y = currentDate.getFullYear();
      const m = String(currentDate.getMonth() + 1).padStart(2, '0');
      const d = String(currentDate.getDate()).padStart(2, '0');
      cells.push({
        date: currentDate,
        dayNum: i,
        isCurrentMonth: true,
        dateString: `${y}-${m}-${d}`
      });
    }

    // Fill next month days to complete grid structure (multiples of 7)
    const totalCells = Math.ceil(cells.length / 7) * 7;
    const nextMonthDaysToAdd = totalCells - cells.length;
    for (let i = 1; i <= nextMonthDaysToAdd; i++) {
      const nextDate = new Date(agendaYear, agendaMonth + 1, i);
      const y = nextDate.getFullYear();
      const m = String(nextDate.getMonth() + 1).padStart(2, '0');
      const d = String(nextDate.getDate()).padStart(2, '0');
      cells.push({
        date: nextDate,
        dayNum: i,
        isCurrentMonth: false,
        dateString: `${y}-${m}-${d}`
      });
    }

    return cells;
  }, [agendaYear, agendaMonth]);

  // Filter pending orders matching criteria
  const agendaPendingOrders = useMemo(() => {
    return salesOrders.filter(order => {
      // Must not be delivered or canceled (any other status is pending delivery)
      if (order.status === 'Entregue' || order.status === 'Cancelado') return false;

      // Apply client search
      const matchesClient = clientSearch.trim() === '' || 
        order.client.toLowerCase().includes(clientSearch.toLowerCase());

      // Apply order id search
      const matchesId = orderIdSearch.trim() === '' || 
        order.id.toLowerCase().includes(orderIdSearch.toLowerCase());

      // Apply product search
      const query = productSearch.toLowerCase().trim();
      let matchesProduct = query === '';
      if (query !== '') {
        if (order.items && order.items.toLowerCase().includes(query)) {
          matchesProduct = true;
        }
        if (order.products && order.products.length > 0) {
          const hasMatchingProduct = order.products.some(p => 
            p.name.toLowerCase().includes(query) || 
            p.sku.toLowerCase().includes(query)
          );
          if (hasMatchingProduct) {
            matchesProduct = true;
          }
        }
      }

      return matchesClient && matchesId && matchesProduct;
    });
  }, [salesOrders, clientSearch, orderIdSearch, productSearch]);

  // Get orders for the selected calendar date or fallback to all of the current month
  const selectedAgendaOrders = useMemo(() => {
    if (selectedAgendaDate) {
      return agendaPendingOrders.filter(o => o.deliveryDate === selectedAgendaDate);
    } else {
      return agendaPendingOrders.filter(o => {
        if (!o.deliveryDate) return false;
        const [y, m] = o.deliveryDate.split('-').map(Number);
        return y === agendaYear && (m - 1) === agendaMonth;
      });
    }
  }, [agendaPendingOrders, selectedAgendaDate, agendaYear, agendaMonth]);

  const handlePrint = (order: SalesOrder) => {
    setPrintServiceOrder(null);
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handlePrintServiceOrder = (order: SalesOrder) => {
    setPrintOrder(null);
    setPrintServiceOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Clear all search fields
  const handleClearFilters = () => {
    setClientSearch('');
    setOrderIdSearch('');
    setProductSearch('');
    setStatusFilter('Todos');
    setOnlyAlertsFilter(false);
    setCurrentPage(1);
  };

  // Main filtering logic: client, order number, and products
  const filteredOrders = useMemo(() => {
    return salesOrders.filter(order => {
      // 1. Client filter
      const matchesClient = clientSearch.trim() === '' || 
        order.client.toLowerCase().includes(clientSearch.toLowerCase());

      // 2. Order number / ID filter
      const matchesId = orderIdSearch.trim() === '' || 
        order.id.toLowerCase().includes(orderIdSearch.toLowerCase());

      // 3. Product filter (can match product name, SKU in the products array, or raw items string for legacy)
      const query = productSearch.toLowerCase().trim();
      let matchesProduct = query === '';
      if (query !== '') {
        // Check items description string
        if (order.items && order.items.toLowerCase().includes(query)) {
          matchesProduct = true;
        }
        // Check the structured products array if present
        if (order.products && order.products.length > 0) {
          const hasMatchingProduct = order.products.some(p => 
            p.name.toLowerCase().includes(query) || 
            p.sku.toLowerCase().includes(query)
          );
          if (hasMatchingProduct) {
            matchesProduct = true;
          }
        }
      }

      // 4. Status filter
      const matchesStatus = statusFilter === 'Todos' || order.status === statusFilter;

      // 5. Deadline Alert filter
      let matchesAlert = true;
      if (onlyAlertsFilter) {
        const alertInfo = getDeliveryAlertStatus(order.deliveryDate, order.status, alertRiskDays);
        matchesAlert = alertInfo.isWarningActive;
      }

      return matchesClient && matchesId && matchesProduct && matchesStatus && matchesAlert;
    });
  }, [salesOrders, clientSearch, orderIdSearch, productSearch, statusFilter, onlyAlertsFilter, alertRiskDays]);

  // Paginated orders
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // KPIs based on filtered list (helps user understand results in real-time)
  const stats = useMemo(() => {
    const totalCount = filteredOrders.length;
    const totalSum = filteredOrders.reduce((sum, order) => sum + order.value, 0);
    const pendingCount = filteredOrders.filter(o => o.status === 'Pendente').length;
    const deliveredCount = filteredOrders.filter(o => o.status === 'Entregue').length;
    return { totalCount, totalSum, pendingCount, deliveredCount };
  }, [filteredOrders]);

  return (
    <div className="space-y-6 relative">
      {/* Sleek Alert / Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/50' 
            : 'bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/50'
        }`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Page Header */}
      <div>
        <h2 id="order-query-heading" className="text-xl font-bold text-slate-800 tracking-tight">Consulta de Pedidos</h2>
        <p className="text-xs text-slate-500 mt-1">Busca avançada e detalhada de pedidos comerciais por cliente, código do pedido e itens/produtos vinculados</p>
      </div>

      {/* Query Filters Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">Filtros de Pesquisa Avançada</span>
          </div>
          {(clientSearch || orderIdSearch || productSearch || statusFilter !== 'Todos') && (
            <button 
              type="button"
              onClick={handleClearFilters}
              className="text-[10px] font-bold text-rose-600 hover:text-rose-700 uppercase tracking-wider flex items-center gap-1 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Query by Client */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar por Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: Alimentos Silva ou josisley..." 
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Query by Order Number */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Número do Pedido (ID)</label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={orderIdSearch}
                onChange={(e) => { setOrderIdSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: VD-1001" 
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
          </div>

          {/* Query by Product Name / SKU */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar por Produto ou SKU</label>
            <div className="relative">
              <Package className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={productSearch}
                onChange={(e) => { setProductSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: PRD-0001 ou Parafuso..." 
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Query by Status */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status do Pedido</label>
            <select 
              value={statusFilter} 
              onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
              className="w-full text-xs px-3 py-2 bg-slate-50 hover:bg-slate-100/50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="Todos">Todos os Status</option>
              <option value="Pendente">Pendente</option>
              <option value="Faturado">Faturado</option>
              <option value="Enviado">Enviado</option>
              <option value="Entregue">Entregue</option>
              <option value="Cancelado">Cancelado</option>
            </select>
          </div>

          {/* Query by Deadline Alerts */}
          <div className="flex flex-col justify-end">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filtro de Logística</label>
            <button
              type="button"
              onClick={() => { setOnlyAlertsFilter(!onlyAlertsFilter); setCurrentPage(1); }}
              className={`w-full text-xs px-3 py-2 rounded-lg border transition-all flex items-center justify-between gap-1.5 font-semibold shadow-sm ${
                onlyAlertsFilter 
                  ? 'bg-rose-50 border-rose-300 text-rose-700 font-bold' 
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span className="flex items-center gap-1.5">
                <ShieldAlert className={`w-3.5 h-3.5 ${onlyAlertsFilter ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`} />
                <span>Prazos Críticos</span>
              </span>
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold ${
                onlyAlertsFilter ? 'bg-rose-600 text-white font-black' : 'bg-slate-100 text-slate-500'
              }`}>
                {salesOrders.filter(o => getDeliveryAlertStatus(o.deliveryDate, o.status, alertRiskDays).isWarningActive).length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Query Statistics and Information Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Pedidos Encontrados</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">{stats.totalCount}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soma dos Resultados</p>
          <p className="text-lg font-black text-emerald-600 mt-0.5 font-mono">
            {hideOrderValues ? (
              <span className="text-slate-300 font-sans tracking-widest text-sm bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">R$ •••••</span>
            ) : (
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSum)
            )}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-mono">Aguardando Faturamento</p>
          <p className="text-lg font-black text-amber-600 mt-0.5">{stats.pendingCount} pendentes</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Finalizados / Entregues</p>
          <p className="text-lg font-black text-indigo-600 mt-0.5">{stats.deliveredCount} entregues</p>
        </div>
      </div>

      {/* Query Results & Integrated Agenda Container */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Container Header with View Switcher Tabs */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Resultado da Consulta</h3>
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono font-bold px-2 py-0.5 rounded-full border border-indigo-100">
              {viewMode === 'table' ? `${filteredOrders.length} registros` : `${agendaPendingOrders.length} a entregar`}
            </span>
          </div>

          {/* View Toggle */}
          <div className="flex bg-slate-200/50 p-0.5 rounded-lg border border-slate-200/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'table'
                  ? 'bg-white text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Tabela
            </button>
            <button
              type="button"
              onClick={() => setViewMode('agenda')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all ${
                viewMode === 'agenda'
                  ? 'bg-white text-indigo-700 shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-slate-200/40'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Agenda de Entregas
            </button>
          </div>
        </div>

        {viewMode === 'table' ? (
          /* ==============================================
             1. STANDARD TABLE VIEW
             ============================================== */
          <>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Cliente / Razão Social</th>
                <th className="px-5 py-3">Operador</th>
                <th className="px-5 py-3">Data Lançamento</th>
                <th className="px-5 py-3">Previsão Entrega</th>
                <th className="px-5 py-3">Forma Pagamento</th>
                <th className="px-5 py-3">Itens/Produtos do Pedido</th>
                <th className="px-5 py-3">Valor Total</th>
                <th className="px-5 py-3">Produção</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400">
                    <p className="font-semibold text-sm">Nenhum pedido atende aos filtros de consulta.</p>
                    <p className="text-[11px] mt-1 text-slate-400/80">Verifique a grafia do cliente, número ou nome do produto digitado acima.</p>
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const payment = order.paymentMethod || 'Faturamento Convencional';
                  const delivery = order.deliveryDate || 'N/A';
                  const alertInfo = getDeliveryAlertStatus(order.deliveryDate, order.status, alertRiskDays);
                  return (
                    <tr 
                      key={order.id} 
                      className={`transition-colors border-l-2 ${
                        alertInfo.isWarningActive 
                          ? 'bg-rose-50/10 hover:bg-rose-50/20 border-l-rose-500' 
                          : 'hover:bg-slate-50/50 border-l-transparent'
                      }`}
                    >
                      <td className="px-5 py-4 font-mono">
                        <div className="font-bold text-slate-700">{order.id}</div>
                        {order.serialNumber && (
                          <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Nº {order.serialNumber}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{order.client}</td>
                      <td className="px-5 py-4 font-mono text-slate-500">
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold w-fit">
                            👤 {order.operator || 'Eduardo Fontes'}
                          </span>
                          {order.lastOperator && order.lastOperator !== order.operator && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-semibold w-fit" title={`Última alteração por ${order.lastOperator}`}>
                              ✎ {order.lastOperator}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500">{order.date}</td>
                      <td className="px-5 py-4 font-mono font-bold">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-1 text-slate-800">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            {delivery}
                          </div>
                          {alertInfo.isWarningActive && (
                            <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border w-max ${alertInfo.alertColorClass}`}>
                              <ShieldAlert className="w-2.5 h-2.5" />
                              {alertInfo.alertLabel}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded shadow-sm">
                          <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                          <select
                            value={payment}
                            onChange={(e) => onUpdatePaymentMethod(order.id, e.target.value)}
                            className="bg-transparent border-none text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
                          >
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="PIX">PIX à vista</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Crédito do Cliente">Crédito do Cliente</option>
                            <option value="Depósito Identificado">Depósito Identificado</option>
                            <option value="Faturamento 30 Dias">Faturamento 30 Dias</option>
                            <option value="Faturamento 30/60 Dias">Faturamento 30/60 Dias</option>
                            <option value="Faturamento 30/60/90 Dias">Faturamento 30/60/90 Dias</option>
                            {!['Boleto Bancário', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Crédito do Cliente', 'Depósito Identificado', 'Faturamento 30 Dias', 'Faturamento 30/60 Dias', 'Faturamento 30/60/90 Dias', 'Faturamento Convencional'].includes(payment) && (
                              <option value={payment}>{payment}</option>
                            )}
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 max-w-[240px]" title={order.items}>
                        <p className="line-clamp-2 leading-relaxed text-[11px]">
                          {order.items}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold font-mono text-slate-800">
                        <div className="flex flex-col gap-1">
                          {hideOrderValues ? (
                            <span className="text-slate-300 font-sans tracking-widest text-[11px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 w-max">R$ •••••</span>
                          ) : (
                            <>
                              <span className={order.discountPercentage ? "text-emerald-600 font-black" : "text-slate-800 font-extrabold"}>
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                              </span>
                              {order.discountPercentage ? (
                                <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 py-0.5 rounded w-max">
                                  -{order.discountPercentage}% desc.
                                </span>
                              ) : null}
                              {(order.paidAmount !== undefined && order.paidAmount > 0) ? (
                                <div className="space-y-0.5 text-[9px] font-bold mt-1">
                                  <div className="text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100/50 w-max whitespace-nowrap">
                                    Pago: R$ {order.paidAmount.toFixed(2)}
                                  </div>
                                  {order.value - order.paidAmount > 0 ? (
                                    <div className="text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-100/50 w-max whitespace-nowrap">
                                      Aberto: R$ {(order.value - order.paidAmount).toFixed(2)}
                                    </div>
                                  ) : (
                                    <div className="text-emerald-700 bg-emerald-100 px-1 py-0.5 rounded w-max whitespace-nowrap">
                                      Total Pago
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50/50 px-1.5 py-0.5 rounded border border-amber-150/40 w-max whitespace-nowrap mt-1">
                                  Aberto: R$ {order.value.toFixed(2)}
                                </span>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const linkedOPs = productionOrders.filter(op => op.salesOrderId === order.id);
                          if (linkedOPs.length === 0) {
                            return (
                              <span className="text-[10px] text-slate-400 font-medium bg-slate-50 border border-slate-200/50 rounded px-1.5 py-0.5 whitespace-nowrap">
                                Sem OP
                              </span>
                            );
                          }
                          const totalProgress = linkedOPs.reduce((acc, op) => acc + op.progress, 0) / linkedOPs.length;
                          const finished = linkedOPs.filter(op => op.status === 'CONCLUÍDO').length;
                          return (
                            <div className="flex flex-col gap-1 min-w-[100px]">
                              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                                <span>{finished}/{linkedOPs.length} itens</span>
                                <span className="font-mono text-indigo-600">{Math.round(totalProgress)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    totalProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`} 
                                  style={{ width: `${totalProgress}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        {onUpdateStatus ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            order.status === 'Entregue' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                            order.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            order.status === 'Faturado' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            order.status === 'Cancelado' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                            order.status === 'Orçamento' ? 'bg-pink-50 text-pink-700 border-pink-200' :
                            'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                              order.status === 'Entregue' ? 'bg-emerald-500' :
                              order.status === 'Enviado' ? 'bg-blue-500' :
                              order.status === 'Faturado' ? 'bg-indigo-500' :
                              order.status === 'Cancelado' ? 'bg-slate-400' :
                              order.status === 'Orçamento' ? 'bg-pink-500' :
                              'bg-amber-500'
                            }`}></span>
                            <select
                              value={order.status}
                              onChange={(e) => onUpdateStatus(order.id, e.target.value as any)}
                              className="bg-transparent border-none text-[10px] font-semibold focus:outline-none cursor-pointer pr-1 py-0.5"
                            >
                              <option value="Pendente" className="text-slate-800 bg-white">Pendente</option>
                              <option value="Faturado" className="text-slate-800 bg-white">Faturado</option>
                              <option value="Enviado" className="text-slate-800 bg-white">Enviado</option>
                              <option value="Entregue" className="text-slate-800 bg-white">Entregue</option>
                              <option value="Cancelado" className="text-slate-800 bg-white">Cancelado</option>
                              <option value="Orçamento" className="text-slate-800 bg-white">Orçamento</option>
                            </select>
                          </div>
                        ) : (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            order.status === 'Entregue' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                            order.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                            order.status === 'Faturado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                            order.status === 'Cancelado' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                            order.status === 'Orçamento' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                            'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className={`w-1 h-1 rounded-full ${
                              order.status === 'Entregue' ? 'bg-emerald-500' :
                              order.status === 'Enviado' ? 'bg-blue-500' :
                              order.status === 'Faturado' ? 'bg-indigo-500' :
                              order.status === 'Cancelado' ? 'bg-slate-400' :
                              order.status === 'Orçamento' ? 'bg-pink-500' :
                              'bg-amber-500'
                            }`}></span>
                            {order.status}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-md font-medium text-[11px] transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Detalhes
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedOrder(order);
                              setEditOrder({ ...order });
                              setIsEditing(true);
                            }}
                            className="inline-flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-750 text-amber-700 hover:text-amber-900 px-2.5 py-1.5 rounded-md font-medium text-[11px] transition-all"
                          >
                            <Edit className="w-3.5 h-3.5 animate-pulse" />
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(order)}
                            className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 px-2.5 py-1.5 rounded-md font-medium text-[11px] transition-all"
                            title="Imprimir Pedido"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimir
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>Mostrando {paginatedOrders.length} de {filteredOrders.length} pedidos</span>
            <div className="flex gap-1">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
                className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50 text-xs"
              >
                Anterior
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button 
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`px-3 py-1.5 border rounded text-xs ${
                    currentPage === page ? 'bg-indigo-600 border-indigo-600 text-white font-medium' : 'border-slate-200 bg-white hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
                className="px-2.5 py-1.5 border border-slate-200 rounded bg-white hover:bg-slate-50 disabled:opacity-50 text-xs"
              >
                Próximo
              </button>
            </div>
          </div>
        )}
          </>
        ) : (
          /* ==============================================
             2. INTEGRATED PENDING ORDERS AGENDA VIEW
             ============================================== */
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
            {/* LEFT SIDE: Month Calendar (7 cols) */}
            <div className="lg:col-span-7 p-5">
              {/* Calendar Controls */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 pb-2 border-b border-slate-100 gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="p-1.5 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-lg shrink-0">
                    <Calendar className="w-4 h-4" />
                  </span>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Planejamento de Entregas</h4>
                    <p className="text-[10px] text-slate-400 font-medium font-sans">Pedidos Pendentes de Entrega</p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 self-end sm:self-auto">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded transition-all shadow-sm"
                    title="Mês Anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[11px] font-black text-slate-800 tracking-tight select-none min-w-[110px] text-center uppercase font-mono">
                    {MONTH_NAMES[agendaMonth]} {agendaYear}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded transition-all shadow-sm"
                    title="Próximo Mês"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleGoToToday}
                    className="px-2 py-1 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100/75 text-indigo-700 rounded text-[9px] font-bold uppercase tracking-wider transition-all shadow-sm ml-1"
                  >
                    Hoje
                  </button>
                </div>
              </div>

              {/* Day-of-week labels */}
              <div className="grid grid-cols-7 gap-1 text-center mb-1 bg-slate-50 py-1 rounded">
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((dayLabel, idx) => (
                  <div 
                    key={dayLabel} 
                    className={`text-[9px] font-bold uppercase tracking-wider ${
                      idx === 0 || idx === 6 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {dayLabel}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1">
                {calendarCells.map((cell, idx) => {
                  const ordersForDay = agendaPendingOrders.filter(o => o.deliveryDate === cell.dateString);
                  const isCellSelected = selectedAgendaDate === cell.dateString;
                  const todayStr = (() => {
                    const t = new Date();
                    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
                  })();
                  const isToday = cell.dateString === todayStr;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleCellClick(cell.dateString)}
                      className={`min-h-[64px] sm:min-h-[75px] p-1 flex flex-col justify-between rounded border text-left transition-all relative outline-none select-none ${
                        cell.isCurrentMonth 
                          ? 'bg-slate-50/20 hover:bg-slate-50/80 border-slate-200/70' 
                          : 'bg-slate-50/5 hover:bg-slate-50/20 border-slate-200/20 text-slate-300'
                      } ${
                        isCellSelected 
                          ? 'bg-indigo-50/30 border-indigo-500/80 ring-1 ring-indigo-500/40' 
                          : ''
                      } ${
                        isToday 
                          ? 'border-indigo-500 bg-indigo-50/10' 
                          : ''
                      }`}
                    >
                      {/* Day Number and Indicators */}
                      <div className="flex items-center justify-between w-full">
                        {isToday ? (
                          <span className="text-[7px] font-black bg-indigo-600 text-white px-1 py-0.5 rounded uppercase leading-none font-sans scale-90 origin-left">
                            Hoje
                          </span>
                        ) : <span className="w-1" />}
                        <span className={`text-[9px] font-mono font-bold ${
                          isCellSelected ? 'text-indigo-600 font-extrabold text-xs' : 
                          isToday ? 'text-indigo-600 font-extrabold' :
                          cell.isCurrentMonth ? 'text-slate-700' : 'text-slate-300/80'
                        }`}>
                          {cell.dayNum}
                        </span>
                      </div>

                      {/* Pending Orders Pill List */}
                      <div className="w-full mt-1 flex flex-col gap-0.5 grow justify-end">
                        {ordersForDay.length > 0 ? (
                          <>
                            {/* Mobile marker dot */}
                            <div className="flex justify-center gap-0.5 sm:hidden py-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${isCellSelected ? 'bg-indigo-600' : 'bg-amber-500'} animate-pulse`} />
                              {ordersForDay.length > 1 && (
                                <span className="text-[7px] font-black text-slate-500">+{ordersForDay.length - 1}</span>
                              )}
                            </div>

                             {/* Desktop pills */}
                             <div className="hidden sm:flex flex-col gap-0.5 w-full max-w-full overflow-hidden">
                               {ordersForDay.slice(0, 2).map(order => {
                                 const alertInfo = getDeliveryAlertStatus(order.deliveryDate, order.status, alertRiskDays);
                                 const pillColorClass = (() => {
                                   if (alertInfo.isWarningActive) {
                                     return 'bg-rose-50 text-rose-700 border-rose-200';
                                   }
                                   switch (order.status) {
                                     case 'Pendente':
                                       return 'bg-amber-50 text-amber-800 border-amber-200/60';
                                     case 'Faturado':
                                       return 'bg-indigo-50 text-indigo-800 border-indigo-200/60';
                                     case 'Enviado':
                                       return 'bg-blue-50 text-blue-800 border-blue-200/60';
                                     case 'Orçamento':
                                       return 'bg-pink-50 text-pink-800 border-pink-200/60';
                                     default:
                                       return 'bg-slate-50 text-slate-700 border-slate-200';
                                   }
                                 })();
                                 return (
                                   <div 
                                     key={order.id} 
                                     className={`text-[8px] px-1 py-0.5 rounded truncate font-bold border leading-none tracking-tight ${pillColorClass}`}
                                     title={`${order.id} - ${order.client}`}
                                   >
                                     {order.id.split('-')[1] || order.id} • {order.client}
                                   </div>
                                 );
                               })}
                              {ordersForDay.length > 2 && (
                                <div className="text-[7px] text-slate-400 font-bold pl-1 uppercase tracking-wider text-right">
                                  + {ordersForDay.length - 2} mais
                                </div>
                              )}
                            </div>
                          </>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT SIDE: Master-Detail Pending Orders Panel (5 cols) */}
            <div className="lg:col-span-5 bg-slate-50/45 p-5 flex flex-col max-h-[580px] overflow-y-auto">
               {/* Selection Header */}
               <div className="flex items-center justify-between mb-4 pb-2.5 border-b border-slate-200/80">
                 <div>
                   <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                     {selectedAgendaDate ? (
                       <>
                         <Clock className="w-3.5 h-3.5 text-indigo-600" />
                         Dia {selectedAgendaDate.split('-').reverse().join('/')}
                       </>
                     ) : (
                       <>
                         <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                         Entregas de {MONTH_NAMES[agendaMonth]}
                       </>
                     )}
                   </h4>
                   <p className="text-[10px] text-slate-400 mt-0.5">
                     {selectedAgendaOrders.length} {selectedAgendaOrders.length === 1 ? 'entrega listada' : 'entregas listadas'}
                   </p>
                 </div>
 
                 {selectedAgendaDate && (
                   <button
                     type="button"
                     onClick={() => setSelectedAgendaDate(null)}
                     className="p-1 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-600 transition-colors"
                     title="Exibir todas do mês"
                   >
                     <X className="w-4 h-4" />
                   </button>
                 )}
               </div>
 
               {/* Selection Metrics summary */}
               {selectedAgendaOrders.length > 0 && (
                 <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl shadow-sm flex items-center justify-between mb-4">
                   <div>
                     <span className="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest font-mono font-semibold">Cronograma de Entrega</span>
                     <span className="block text-xs font-bold text-indigo-900 mt-0.5">Acompanhamento de prazos</span>
                   </div>
                   <div className="text-right">
                     <span className="block text-[8px] font-bold text-indigo-400 uppercase tracking-widest font-mono">Total de Pedidos</span>
                     <span className="block text-sm font-black text-indigo-700 mt-0.5">{selectedAgendaOrders.length} un.</span>
                   </div>
                 </div>
               )}
 
               {/* Feed of Cards */}
               <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                 {selectedAgendaOrders.length === 0 ? (
                   <div className="text-center py-12 px-4 bg-white border border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center">
                     <Calendar className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                     <p className="text-xs font-semibold text-slate-400">Nenhuma entrega pendente</p>
                     <p className="text-[10px] text-slate-400/80 mt-1 max-w-[200px] leading-relaxed mx-auto text-center font-medium">
                       {selectedAgendaDate 
                         ? 'Nenhum pedido pendente com entrega programada para este dia.' 
                         : 'Nenhum pedido pendente registrado com entrega prevista neste mês.'}
                     </p>
                   </div>
                ) : (
                  selectedAgendaOrders.map(order => {
                    const alertInfo = getDeliveryAlertStatus(order.deliveryDate, order.status, alertRiskDays);
                    const linkedOPs = productionOrders.filter(op => op.salesOrderId === order.id);

                    return (
                      <div 
                        key={order.id}
                        className={`bg-white border p-4 rounded-xl shadow-sm transition-all hover:shadow-md relative border-l-4 ${
                          alertInfo.isWarningActive ? 'border-l-rose-500' : 'border-l-amber-400'
                        }`}
                      >
                        {/* ID and quick action dropdown */}
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                          <div className="font-mono">
                            <span className="text-xs font-black text-slate-800">{order.id}</span>
                            {order.serialNumber && (
                              <span className="text-[9px] text-slate-400 ml-1.5 font-medium">Nº {order.serialNumber}</span>
                            )}
                          </div>

                          {/* Quick Change Status Dropdown */}
                          {onUpdateStatus ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-50 text-amber-700 border-amber-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                              <select
                                value={order.status}
                                onChange={(e) => onUpdateStatus(order.id, e.target.value as any)}
                                className="bg-transparent border-none text-[9px] font-extrabold focus:outline-none cursor-pointer py-0.5"
                              >
                                <option value="Pendente" className="text-slate-800 bg-white">Pendente</option>
                                <option value="Faturado" className="text-slate-800 bg-white">Faturado</option>
                                <option value="Enviado" className="text-slate-800 bg-white">Enviado</option>
                                <option value="Entregue" className="text-slate-800 bg-white">Entregue</option>
                                <option value="Cancelado" className="text-slate-800 bg-white">Cancelado</option>
                                <option value="Orçamento" className="text-slate-800 bg-white">Orçamento</option>
                              </select>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              {order.status}
                            </span>
                          )}
                        </div>

                         {/* Customer and info details */}
                        <div className="space-y-2 text-[11px]">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Cliente</span>
                              <span className="font-semibold text-slate-800">{order.client}</span>
                            </div>
                            {!hideOrderValues && (
                              <div className="text-right">
                                <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Valor Total</span>
                                <span className="font-mono font-black text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}</span>
                              </div>
                            )}
                          </div>

                          {/* Partial payment stats if present */}
                          {!hideOrderValues && (
                            <div className="bg-slate-50 border border-slate-150 p-1.5 rounded-lg grid grid-cols-2 gap-1.5 text-[10px] font-semibold">
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Valor Pago</span>
                                <span className="font-mono text-emerald-600 font-bold">R$ {(order.paidAmount || 0).toFixed(2)}</span>
                              </div>
                              <div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Em Aberto</span>
                                <span className={`font-mono font-bold ${order.value - (order.paidAmount || 0) > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>R$ {Math.max(0, order.value - (order.paidAmount || 0)).toFixed(2)}</span>
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Lançamento</span>
                              <span className="font-mono text-slate-600 font-medium">{order.date}</span>
                            </div>
                            <div>
                              <span className="text-[9px] font-bold text-slate-400 uppercase block leading-none mb-0.5">Previsão</span>
                              <span className="font-mono font-bold text-slate-800 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-slate-400" />
                                {order.deliveryDate || 'N/A'}
                              </span>
                            </div>
                          </div>

                          {/* Critical alert banner */}
                          {alertInfo.isWarningActive && (
                            <div className={`p-1.5 rounded-lg border text-[9px] font-bold flex items-center gap-1 w-full ${alertInfo.alertColorClass}`}>
                              <ShieldAlert className="w-3.5 h-3.5" />
                              <span>{alertInfo.alertLabel} ({alertInfo.daysRemaining} {alertInfo.daysRemaining === 1 ? 'dia restante' : 'dias restantes'})</span>
                            </div>
                          )}

                          {/* Items / Products list inside the card */}
                          <div className="bg-slate-50 border border-slate-150 p-2 rounded-lg">
                            <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none mb-1">Produtos do Pedido</span>
                            <p className="text-[10px] text-slate-600 line-clamp-2 leading-relaxed">{order.items}</p>
                          </div>

                          {/* Delivery stage instead of financial value */}
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                            <div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none">Progresso</span>
                              <span className="text-[10px] font-bold text-slate-700">
                                {order.status === 'Pendente' ? 'Aguardando Liberação' :
                                 order.status === 'Faturado' ? 'Pronto para Envio' :
                                 order.status === 'Enviado' ? 'Em Transporte' :
                                 order.status === 'Orçamento' ? 'Orçamento' : order.status}
                              </span>
                            </div>

                            {/* Linked production orders status indicator */}
                            <div className="text-right">
                              <span className="text-[8px] font-bold text-slate-400 uppercase block leading-none">Produção OP</span>
                              {linkedOPs.length === 0 ? (
                                <span className="text-[9px] text-slate-400 font-medium">Nenhuma</span>
                              ) : (
                                <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[8px] font-bold border bg-indigo-50 text-indigo-700 border-indigo-200 font-mono">
                                  #{linkedOPs[0].id.split('-')[1]} • {linkedOPs[0].status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="grid grid-cols-2 gap-2 mt-3 pt-2.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-2 py-1.5 rounded-lg font-bold text-[10px] transition-all"
                          >
                            <Eye className="w-3 h-3" />
                            Detalhes
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePrint(order)}
                            className="inline-flex items-center justify-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-900 px-2 py-1.5 rounded-lg font-bold text-[10px] transition-all"
                          >
                            <Printer className="w-3 h-3" />
                            Imprimir
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal overlay */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Ficha Detalhada do Pedido</h3>
                  <p className="text-[10px] text-slate-400 font-mono font-bold mt-0.5">{selectedOrder.id} • {selectedOrder.date}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedOrder(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Scrollable */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              
              {/* Top Summary Info */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cliente</span>
                  {isEditing && editOrder ? (
                    <input
                      type="text"
                      value={editOrder.client}
                      onChange={(e) => setEditOrder({ ...editOrder, client: e.target.value })}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="font-bold text-slate-800">{selectedOrder.client}</p>
                  )}
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Operador</span>
                  <div className="flex flex-col gap-0.5">
                    <p className="font-bold text-indigo-700">👤 {selectedOrder.operator || 'Eduardo Fontes'}</p>
                    {selectedOrder.lastOperator && selectedOrder.lastOperator !== selectedOrder.operator && (
                      <p className="text-[9px] font-semibold text-amber-700">✎ Editado por: {selectedOrder.lastOperator}</p>
                    )}
                  </div>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lançamento</span>
                  {isEditing && editOrder ? (
                    <input
                      type="text"
                      value={editOrder.date}
                      onChange={(e) => setEditOrder({ ...editOrder, date: e.target.value })}
                      className="w-full text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="font-mono text-slate-600 font-semibold">{selectedOrder.date}</p>
                  )}
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Previsão de Entrega</span>
                  {isEditing && editOrder ? (
                    <input
                      type="date"
                      value={editOrder.deliveryDate || ''}
                      onChange={(e) => setEditOrder({ ...editOrder, deliveryDate: e.target.value })}
                      className="w-full text-xs font-mono font-semibold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  ) : (
                    <p className="font-mono font-bold text-indigo-600">{selectedOrder.deliveryDate || 'N/A'}</p>
                  )}
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Forma Pagamento</span>
                  {isEditing && editOrder ? (
                    <select
                      value={editOrder.paymentMethod || 'Boleto Bancário'}
                      onChange={(e) => setEditOrder({ ...editOrder, paymentMethod: e.target.value })}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Boleto Bancário">Boleto Bancário</option>
                      <option value="PIX">PIX à vista</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Crédito do Cliente">Crédito do Cliente</option>
                      <option value="Depósito Identificado">Depósito Identificado</option>
                      <option value="Faturamento 30 Dias">Faturamento 30 Dias</option>
                      <option value="Faturamento 30/60 Dias">Faturamento 30/60 Dias</option>
                      <option value="Faturamento 30/60/90 Dias">Faturamento 30/60/90 Dias</option>
                      {editOrder.paymentMethod && !['Boleto Bancário', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Crédito do Cliente', 'Depósito Identificado', 'Faturamento 30 Dias', 'Faturamento 30/60 Dias', 'Faturamento 30/60/90 Dias', 'Faturamento Convencional'].includes(editOrder.paymentMethod) && (
                        <option value={editOrder.paymentMethod}>{editOrder.paymentMethod}</option>
                      )}
                    </select>
                  ) : (
                    <select
                      value={selectedOrder.paymentMethod || 'Boleto Bancário'}
                      onChange={(e) => {
                        const newPay = e.target.value;
                        onUpdatePaymentMethod(selectedOrder.id, newPay);
                        setSelectedOrder(prev => prev ? { ...prev, paymentMethod: newPay } : null);
                      }}
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Boleto Bancário">Boleto Bancário</option>
                      <option value="PIX">PIX à vista</option>
                      <option value="Cartão de Crédito">Cartão de Crédito</option>
                      <option value="Cartão de Débito">Cartão de Débito</option>
                      <option value="Dinheiro">Dinheiro</option>
                      <option value="Crédito do Cliente">Crédito do Cliente</option>
                      <option value="Depósito Identificado">Depósito Identificado</option>
                      <option value="Faturamento 30 Dias">Faturamento 30 Dias</option>
                      <option value="Faturamento 30/60 Dias">Faturamento 30/60 Dias</option>
                      <option value="Faturamento 30/60/90 Dias">Faturamento 30/60/90 Dias</option>
                      {selectedOrder.paymentMethod && !['Boleto Bancário', 'PIX', 'Cartão de Crédito', 'Cartão de Débito', 'Dinheiro', 'Crédito do Cliente', 'Depósito Identificado', 'Faturamento 30 Dias', 'Faturamento 30/60 Dias', 'Faturamento 30/60/90 Dias', 'Faturamento Convencional'].includes(selectedOrder.paymentMethod) && (
                        <option value={selectedOrder.paymentMethod}>{selectedOrder.paymentMethod}</option>
                      )}
                    </select>
                  )}
                </div>
                {(((isEditing && editOrder && editOrder.paymentMethod?.includes('Boleto')) || 
                  (!isEditing && selectedOrder && selectedOrder.paymentMethod?.includes('Boleto')))) && (
                  <>
                    {isEditing && editOrder ? (
                      (() => {
                        const editInstallments = editOrder.boletoInstallments || [
                          {
                            id: "1",
                            dueDate: editOrder.boletoDueDate || '',
                            value: editOrder.value,
                            paid: !!editOrder.boletoPaid
                          }
                        ];
                        const editInstallmentsCount = editOrder.boletoInstallmentsCount || editInstallments.length || 1;

                        return (
                          <div className="col-span-1 sm:col-span-2 bg-amber-50/40 p-3 rounded-xl border border-amber-200/50 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-black uppercase text-amber-800 tracking-wider">Detalhamento do Boleto (Máx 3X)</span>
                              <div className="flex items-center gap-1">
                                {[1, 2, 3].map((num) => (
                                  <button
                                    key={num}
                                    type="button"
                                    onClick={() => {
                                      const currentInsts = [...editInstallments];
                                      let newInsts = [];
                                      const baseValue = parseFloat((editOrder.value / num).toFixed(2));
                                      let sum = 0;
                                      for (let i = 0; i < num; i++) {
                                        let val = baseValue;
                                        if (i === num - 1) {
                                          val = parseFloat((editOrder.value - sum).toFixed(2));
                                        }
                                        sum += val;
                                        newInsts.push({
                                          id: `${i + 1}`,
                                          dueDate: currentInsts[i]?.dueDate || '',
                                          value: val,
                                          paid: currentInsts[i]?.paid || false
                                        });
                                      }
                                      setEditOrder({
                                        ...editOrder,
                                        boletoInstallmentsCount: num,
                                        boletoInstallments: newInsts,
                                        boletoDueDate: newInsts[0]?.dueDate || undefined
                                      });
                                    }}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer transition-colors ${
                                      editInstallmentsCount === num
                                        ? 'bg-amber-600 border-amber-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                                    }`}
                                  >
                                    {num}X
                                  </button>
                                ))}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {editInstallments.map((inst, index) => (
                                <div key={inst.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-amber-100 shadow-3xs">
                                  <div className="sm:col-span-2 text-[10px] font-bold text-amber-800 bg-amber-100/50 px-1.5 py-0.5 rounded text-center">
                                    Parcela {inst.id}
                                  </div>
                                  <div className="sm:col-span-5 flex flex-col gap-0.5">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Vencimento *</span>
                                    <input
                                      type="date"
                                      required
                                      value={inst.dueDate}
                                      onChange={(e) => {
                                        const updated = [...editInstallments];
                                        updated[index] = { ...updated[index], dueDate: e.target.value };
                                        setEditOrder({
                                          ...editOrder,
                                          boletoInstallments: updated,
                                          boletoDueDate: index === 0 ? e.target.value : editOrder.boletoDueDate
                                        });
                                      }}
                                      className="w-full text-xs font-mono font-semibold text-slate-700 bg-slate-50 border border-slate-150 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                    />
                                  </div>
                                  <div className="sm:col-span-3 flex flex-col gap-0.5">
                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Status</span>
                                    <select
                                      value={inst.paid ? 'true' : 'false'}
                                      onChange={(e) => {
                                        const updated = [...editInstallments];
                                        updated[index] = { ...updated[index], paid: e.target.value === 'true' };
                                        // Auto-calculate paid amount and overall paid state
                                        const allPaid = updated.every(i => i.paid);
                                        const totalPaidVal = updated.reduce((acc, curr) => acc + (curr.paid ? curr.value : 0), 0);
                                        setEditOrder({
                                          ...editOrder,
                                          boletoInstallments: updated,
                                          boletoPaid: allPaid,
                                          paidAmount: totalPaidVal
                                        });
                                      }}
                                      className="w-full text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-150 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                                    >
                                      <option value="false">Pendente</option>
                                      <option value="true">Pago</option>
                                    </select>
                                  </div>
                                  <div className="sm:col-span-2 text-right text-xs font-mono font-black text-slate-700 pr-1">
                                    R$ {inst.value.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })()
                    ) : (
                      <div className="col-span-1 sm:col-span-2 bg-slate-50/50 p-3 rounded-xl border border-slate-200/50 space-y-2">
                        <span className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">Detalhamento do Boleto</span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {(selectedOrder.boletoInstallments && selectedOrder.boletoInstallments.length > 0
                            ? selectedOrder.boletoInstallments
                            : [
                                {
                                  id: "1",
                                  dueDate: selectedOrder.boletoDueDate || 'Não informado',
                                  value: selectedOrder.value,
                                  paid: !!selectedOrder.boletoPaid
                                }
                              ]
                          ).map((inst) => (
                            <div key={inst.id} className="bg-white p-2.5 rounded-lg border border-slate-100 flex flex-col gap-1.5 shadow-3xs">
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] font-bold text-slate-500 uppercase">Parcela {inst.id}</span>
                                <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded ${
                                  inst.paid
                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                    : 'bg-amber-50 text-amber-700 border border-amber-100 animate-pulse'
                                }`}>
                                  {inst.paid ? 'PAGO' : 'PENDENTE'}
                                </span>
                              </div>
                              <div className="flex justify-between items-end">
                                <div>
                                  <span className="text-[8px] font-bold text-slate-400 block leading-none mb-0.5">Vencimento</span>
                                  <span className="text-xs font-mono font-semibold text-slate-700">{inst.dueDate || 'Não informado'}</span>
                                </div>
                                <span className="text-xs font-mono font-black text-slate-800">R$ {inst.value.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Status and Total */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-3 px-4 border border-slate-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status Atual:</span>
                  {isEditing && editOrder ? (
                    <select
                      value={editOrder.status}
                      onChange={(e) => setEditOrder({ ...editOrder, status: e.target.value as any })}
                      className="text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Faturado">Faturado</option>
                      <option value="Enviado">Enviado</option>
                      <option value="Entregue">Entregue</option>
                      <option value="Cancelado">Cancelado</option>
                      <option value="Orçamento">Orçamento</option>
                    </select>
                  ) : (
                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-bold ${
                      selectedOrder.status === 'Entregue' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                      selectedOrder.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                      selectedOrder.status === 'Faturado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                      selectedOrder.status === 'Cancelado' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                      'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        selectedOrder.status === 'Entregue' ? 'bg-emerald-500' :
                        selectedOrder.status === 'Enviado' ? 'bg-blue-500' :
                        selectedOrder.status === 'Faturado' ? 'bg-indigo-500' :
                        selectedOrder.status === 'Cancelado' ? 'bg-slate-400' :
                        'bg-amber-500'
                      }`}></span>
                      {selectedOrder.status}
                    </span>
                  )}
                </div>

                <div className="text-right flex flex-col items-end gap-1">
                  {isEditing && editOrder ? (
                    <div className="flex flex-col items-end gap-1.5">
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold">
                        <span>Desconto (%):</span>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={editOrder.discountPercentage || 0}
                          onChange={(e) => {
                            const pct = parseFloat(e.target.value) || 0;
                            const subtotal = editOrder.products?.reduce((acc, p) => acc + (p.qty * p.price), 0) || editOrder.value;
                            const discountAmount = (subtotal * pct) / 100;
                            const newValue = subtotal - discountAmount;
                            setEditOrder({
                              ...editOrder,
                              discountPercentage: pct,
                              value: newValue
                            });
                          }}
                          className="w-16 font-mono text-center text-xs text-slate-700 bg-white border border-slate-200 rounded px-1 py-0.5 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      
                      {(!editOrder.products || editOrder.products.length === 0) ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">Valor Total (R$):</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editOrder.value}
                            onChange={(e) => setEditOrder({ ...editOrder, value: parseFloat(e.target.value) || 0 })}
                            className="w-28 text-right font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1"
                          />
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Valor Total Líquido (Recalculado)</span>
                          <span className="text-sm font-black text-slate-800 font-mono">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(editOrder.value)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-bold border-t border-slate-100 pt-1.5 w-full justify-end">
                        <span className="text-emerald-700">Valor Pago (R$):</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max={editOrder.value}
                          value={editOrder.paidAmount || 0}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setEditOrder({
                              ...editOrder,
                              paidAmount: val
                            });
                          }}
                          className="w-28 text-right font-mono text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-2 py-1 focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100/30 px-2 py-0.5 rounded">
                        Em Aberto: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, editOrder.value - (editOrder.paidAmount || 0)))}
                      </div>
                    </div>
                  ) : (
                    <>
                      {selectedOrder.discountPercentage && !hideOrderValues ? (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 mb-1 animate-pulse">
                          Desconto de {selectedOrder.discountPercentage}% aplicado
                        </span>
                      ) : null}
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mb-0.5">Valor Total Líquido</span>
                      <span className="text-base font-black text-slate-800 font-mono mb-1">
                        {hideOrderValues ? (
                          <span className="text-slate-300 font-sans tracking-widest text-[11px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5">R$ •••••</span>
                        ) : (
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.value)
                        )}
                      </span>
                      
                      {!hideOrderValues && (
                        <div className="text-[10px] text-right text-slate-500 space-y-0.5 font-bold border-t border-slate-100 pt-1.5 w-full">
                          <div>Valor Pago: <span className="font-mono text-emerald-600 font-bold">R$ {(selectedOrder.paidAmount || 0).toFixed(2)}</span></div>
                          <div>Valor em Aberto: <span className={`font-mono px-1.5 py-0.5 rounded font-black ${selectedOrder.value - (selectedOrder.paidAmount || 0) > 0 ? 'text-rose-600 bg-rose-50 border border-rose-150/30 animate-pulse' : 'text-emerald-700 bg-emerald-50 border border-emerald-150/30'}`}>R$ {Math.max(0, selectedOrder.value - (selectedOrder.paidAmount || 0)).toFixed(2)}</span></div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Detailed Products List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-indigo-600" />
                  Grade de Produtos do Pedido
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2">SKU</th>
                        <th className="px-4 py-2">Produto</th>
                        <th className="px-4 py-2 text-center">Qtd.</th>
                        <th className="px-4 py-2 text-right">Preço Un.</th>
                        <th className="px-4 py-2 text-right">Subtotal</th>
                        {isEditing && <th className="px-4 py-2 text-center w-10">Ação</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isEditing && editOrder ? (
                        editOrder.products && editOrder.products.length > 0 ? (
                          editOrder.products.map((item, index) => (
                            <tr key={`edit-item-${index}`} className="hover:bg-slate-50/30">
                              <td className="px-3 py-2">
                                {inventory.some(inv => inv.sku === item.sku) && item.sku !== 'SKU-TEMP' ? (
                                  <span className="font-mono text-[11px] text-slate-600 font-bold bg-slate-100 px-2 py-1 rounded block text-center">
                                    {item.sku}
                                  </span>
                                ) : (
                                  <input
                                    type="text"
                                    value={item.sku}
                                    placeholder="SKU"
                                    onChange={(e) => handleUpdateProductRow(index, { sku: e.target.value })}
                                    className="w-full font-mono text-[11px] text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                )}
                              </td>
                              <td className="px-3 py-2 space-y-1">
                                <select
                                  value={inventory.some(inv => inv.sku === item.sku) ? item.sku : (item.sku === 'SKU-TEMP' ? 'custom' : '')}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val === 'custom') {
                                      handleUpdateProductRow(index, { sku: 'SKU-TEMP', name: 'Item Personalizado', price: 0 });
                                    } else if (val === '') {
                                      handleUpdateProductRow(index, { sku: '', name: '', price: 0 });
                                    } else {
                                      const prod = inventory.find(p => p.sku === val);
                                      if (prod) {
                                        handleUpdateProductRow(index, {
                                          sku: prod.sku,
                                          name: prod.name,
                                          price: prod.salesPrice || prod.price || 0
                                        });
                                      }
                                    }
                                  }}
                                  className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                >
                                  <option value="">-- Selecione um Produto Cadastrado --</option>
                                  {inventory.filter(inv => inv.active !== false || inv.sku === item.sku).map((inv) => (
                                    <option key={inv.sku} value={inv.sku}>
                                      {inv.name} ({inv.sku}) - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(inv.salesPrice || inv.price || 0)}
                                    </option>
                                  ))}
                                  <option value="custom">✍️ Produto Personalizado (Digitar Manual)</option>
                                </select>
                                
                                {(!inventory.some(inv => inv.sku === item.sku) || item.sku === 'SKU-TEMP') && (
                                  <input
                                    type="text"
                                    value={item.name}
                                    placeholder="Nome do produto personalizado..."
                                    onChange={(e) => handleUpdateProductRow(index, { name: e.target.value })}
                                    className="w-full text-xs font-semibold text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                  />
                                )}

                                <input
                                  type="text"
                                  value={item.note || ''}
                                  placeholder="Observação deste item..."
                                  onChange={(e) => handleUpdateProductRow(index, { note: e.target.value })}
                                  className="w-full text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 mt-1 placeholder:text-slate-400"
                                />
                              </td>
                              <td className="px-3 py-2 text-center">
                                <input
                                  type="number"
                                  min="0.01"
                                  step="any"
                                  value={item.qty}
                                  onChange={(e) => handleUpdateProductRow(index, { qty: parseFloat(e.target.value) || 1 })}
                                  className="w-16 font-mono text-center text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price}
                                  onChange={(e) => handleUpdateProductRow(index, { price: parseFloat(e.target.value) || 0 })}
                                  className="w-24 font-mono text-right text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                />
                              </td>
                              <td className="px-3 py-2 text-right font-mono font-bold text-indigo-600">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                              </td>
                              <td className="px-3 py-2 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleRemoveProductRow(index)}
                                  className="text-rose-500 hover:text-rose-700 font-bold p-1 hover:bg-rose-50 rounded transition-colors text-sm"
                                  title="Remover produto"
                                >
                                  ×
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-5 text-center text-slate-400">
                              Nenhum produto cadastrado neste pedido. Clique em &quot;Adicionar Produto&quot; abaixo para adicionar.
                            </td>
                          </tr>
                        )
                      ) : (
                        selectedOrder.products && selectedOrder.products.length > 0 ? (
                          selectedOrder.products.map((item, index) => (
                            <tr key={`${item.sku}-${index}`} className="hover:bg-slate-50/30">
                              <td className="px-4 py-3 font-mono text-slate-500 font-bold">{item.sku}</td>
                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{item.name}</div>
                                {item.note && (
                                  <div className="text-[10px] text-indigo-600 mt-1 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-md inline-block font-medium">
                                    Obs: {item.note}
                                  </div>
                                )}
                              </td>
                              <td className="px-4 py-3 text-center font-mono font-bold text-slate-700 bg-slate-50/20">{item.qty}</td>
                              <td className="px-4 py-3 text-right font-mono text-slate-600">
                                {hideOrderValues ? (
                                  <span className="text-slate-300 select-none font-sans">••••</span>
                                ) : (
                                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)
                                )}
                              </td>
                              <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                                {hideOrderValues ? (
                                  <span className="text-slate-300 select-none font-sans">••••</span>
                                ) : (
                                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)
                                )}
                              </td>
                            </tr>
                          ))
                        ) : (
                          // Fallback parsing for orders created prior to having structured products state
                          <tr>
                            <td colSpan={5} className="px-4 py-5 text-slate-500 leading-relaxed">
                              {isEditing && editOrder ? (
                                <div className="space-y-2">
                                  <p className="font-bold text-slate-700">Produtos (Legado):</p>
                                  <textarea
                                    value={editOrder.items}
                                    onChange={(e) => setEditOrder({ ...editOrder, items: e.target.value })}
                                    className="w-full text-xs font-mono text-slate-700 bg-white border border-slate-200 rounded p-2 focus:ring-1 focus:ring-indigo-500 h-20"
                                    placeholder="Lista de produtos por extenso..."
                                  />
                                </div>
                              ) : (
                                <div className="flex items-start gap-2 text-slate-500">
                                  <CornerDownRight className="w-4 h-4 text-slate-400 mt-0.5 flex-shrink-0" />
                                  <div>
                                    <p className="font-semibold text-slate-700">Produtos (Legado / Descritivo Simplificado):</p>
                                    <p className="mt-1 font-mono text-[11px] bg-slate-50 p-2.5 rounded-lg border border-slate-100">{selectedOrder.items}</p>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                  
                  {isEditing && editOrder && (
                    <div className="p-3 bg-slate-50 border-t border-slate-200 flex justify-end">
                      <button
                        type="button"
                        onClick={handleAddProductRow}
                        className="inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-indigo-200"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Adicionar Produto
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Observações do Pedido */}
              {(!isEditing && selectedOrder.notes) && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Observações / Instruções Especiais
                  </h4>
                  <p className="text-xs text-slate-700 leading-relaxed font-medium bg-white/70 p-3 rounded-lg border border-amber-100 whitespace-pre-wrap">
                    {selectedOrder.notes}
                  </p>
                </div>
              )}

              {(isEditing && editOrder) && (
                <div className="bg-amber-50/50 border border-amber-200/60 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-600" />
                    Observações / Instruções Especiais (Edição)
                  </h4>
                  <textarea
                    value={editOrder.notes || ''}
                    onChange={(e) => setEditOrder({ ...editOrder, notes: e.target.value })}
                    className="w-full text-xs font-medium text-slate-700 bg-white border border-amber-200 rounded-lg p-3 h-24 focus:outline-none focus:ring-1 focus:ring-indigo-500 whitespace-pre-wrap"
                    placeholder="Escreva observações do cliente ou instruções de fabricação..."
                  />
                </div>
              )}

              {/* Attached Project Files Section */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <FileImage className="w-4 h-4 text-indigo-600" />
                  Arquivos e Projetos Anexados ao Pedido {isEditing && editOrder && <span className="text-[10px] text-indigo-600 lowercase font-semibold font-sans">(modo edição - envie ou remova arquivos)</span>}
                </h4>

                {isEditing && editOrder ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {/* Upload Card */}
                    <label className="flex flex-col items-center justify-center border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/20 hover:bg-indigo-50/40 rounded-xl cursor-pointer transition-all p-3 text-center aspect-video min-h-[80px]">
                      <UploadCloud className="w-6 h-6 text-indigo-500 hover:text-indigo-600 animate-pulse" />
                      <span className="text-[9px] font-bold text-indigo-700 mt-1">Anexar Novo Arquivo</span>
                      <span className="text-[7px] text-slate-400 font-medium">Imagem ou PDF</span>
                      <input 
                        type="file" 
                        accept="image/*,application/pdf" 
                        multiple 
                        onChange={handleEditOrderFileUpload} 
                        className="hidden" 
                      />
                    </label>

                    {(() => {
                      const attachedFiles = editOrder.projectFiles || (editOrder.projectImages || []).map((img, idx) => ({
                        name: `desenho-${idx + 1}.png`,
                        type: 'image/png',
                        data: img
                      }));

                      return attachedFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div 
                            key={index}
                            className="relative group border border-slate-200 rounded-xl overflow-hidden aspect-video bg-white flex items-center justify-center animate-in fade-in duration-200"
                          >
                            {isImage ? (
                              <>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img 
                                  src={file.data} 
                                  alt={file.name} 
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all">
                                  <button
                                    type="button"
                                    onClick={() => setActivePreviewImage(file.data)}
                                    className="p-1 bg-white/80 hover:bg-white text-slate-800 rounded-lg text-[9px] font-bold shadow-md cursor-pointer mr-1"
                                  >
                                    Ver
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleEditOrderRemoveFile(index)}
                                    className="p-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[9px] font-bold shadow-md cursor-pointer"
                                  >
                                    Excluir
                                  </button>
                                </div>
                                <span className="absolute bottom-1.5 left-1.5 bg-slate-900/75 text-[7px] text-white px-1 py-0.2 rounded font-mono font-bold">
                                  Img #{index + 1}
                                </span>
                              </>
                            ) : (
                              <div className="w-full h-full p-2.5 flex flex-col justify-between">
                                <div className="flex items-start gap-1.5 min-w-0">
                                  <div className="p-1 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                                    <FileText className="w-3.5 h-3.5" />
                                  </div>
                                  <div className="overflow-hidden min-w-0">
                                    <h5 className="font-bold text-slate-700 text-[9px] truncate leading-tight" title={file.name}>
                                      {file.name}
                                    </h5>
                                    <span className="text-[7px] text-rose-600 uppercase font-mono font-bold">PDF</span>
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <a 
                                    href={file.data} 
                                    download={file.name}
                                    className="flex-1 text-center bg-white hover:bg-slate-50 border border-slate-200 text-slate-650 py-1 rounded-md font-bold text-[8px] transition-all cursor-pointer"
                                  >
                                    Baixar
                                  </a>
                                  <button
                                    type="button"
                                    onClick={() => handleEditOrderRemoveFile(index)}
                                    className="px-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 rounded-md font-bold text-[8px] transition-all cursor-pointer"
                                  >
                                    Excluir
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  (() => {
                    const attachedFiles = selectedOrder.projectFiles || (selectedOrder.projectImages || []).map((img, idx) => ({
                      name: `desenho-${idx + 1}.png`,
                      type: 'image/png',
                      data: img
                    }));

                    if (attachedFiles.length === 0) {
                      return (
                        <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 bg-slate-50/40">
                          <FileImage className="w-6 h-6 mx-auto opacity-30 mb-1" />
                          <p className="text-[10px] font-medium">Nenhum arquivo ou projeto anexado a este pedido.</p>
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {attachedFiles.map((file, index) => {
                          const isImage = file.type.startsWith('image/');
                          return isImage ? (
                            <div 
                              key={index} 
                              onClick={() => setActivePreviewImage(file.data)}
                              className="relative group border border-slate-200 rounded-xl overflow-hidden aspect-video bg-slate-50 cursor-pointer hover:border-indigo-400 hover:shadow-md transition-all flex items-center justify-center animate-in fade-in duration-200"
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img 
                                src={file.data} 
                                alt={file.name} 
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                              />
                              <div className="absolute inset-0 bg-slate-900/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <Eye className="w-5 h-5 text-white" />
                              </div>
                              <span className="absolute bottom-2 left-2 bg-slate-900/75 text-[8px] text-white px-1.5 py-0.5 rounded font-mono font-bold">
                                Imagem #{index + 1}
                              </span>
                            </div>
                          ) : (
                            <div 
                              key={index}
                              className="relative group border border-slate-200 rounded-xl p-3 bg-slate-50/70 flex flex-col justify-between hover:border-indigo-400 hover:shadow-md transition-all aspect-video animate-in fade-in duration-200"
                            >
                              <div className="flex items-start gap-2">
                                <div className="p-1.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
                                  <FileText className="w-4 h-4" />
                                </div>
                                <div className="overflow-hidden min-w-0">
                                  <h5 className="font-bold text-slate-700 text-[10px] truncate leading-tight" title={file.name}>
                                    {file.name}
                                  </h5>
                                  <span className="text-[8px] text-rose-600 uppercase font-mono font-bold">PDF</span>
                                </div>
                              </div>

                              <div className="mt-2 shrink-0">
                                <a 
                                  href={file.data} 
                                  download={file.name}
                                  className="w-full text-center bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-600 py-1.5 rounded-lg font-bold text-[9px] transition-all shadow-sm flex items-center justify-center gap-1 cursor-pointer"
                                >
                                  Baixar PDF
                                </a>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()
                )}
              </div>

              {/* STATUS DE PRODUÇÃO EM TEMPO REAL */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-xs font-extrabold text-indigo-950 uppercase tracking-widest flex items-center gap-2 bg-indigo-50/60 border border-indigo-100/50 px-3 py-1.5 rounded-lg w-fit shadow-xs">
                  <SlidersHorizontal className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Status de Produção dos Itens (Kanban)
                </h4>

                {(() => {
                  const linkedOPs = productionOrders.filter(op => op.salesOrderId === selectedOrder.id);
                  if (linkedOPs.length === 0) {
                    return (
                      <div className="border border-dashed border-slate-200 rounded-xl p-5 text-center bg-slate-50/40">
                        <p className="text-[10px] text-slate-500 font-medium mb-3">
                          Este pedido ainda não possui ordens de produção (OPs) vinculadas.
                        </p>
                        {onGenerateOPsFromOrder && (
                          <button
                            type="button"
                            onClick={() => {
                              onGenerateOPsFromOrder(selectedOrder);
                            }}
                            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold shadow-sm transition-all cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            Enviar Itens do Pedido para Produção
                          </button>
                        )}
                      </div>
                    );
                  }

                  const totalProgress = linkedOPs.reduce((acc, op) => acc + op.progress, 0) / linkedOPs.length;
                  const finishedItems = linkedOPs.filter(op => op.status === 'CONCLUÍDO').length;

                  return (
                    <div className="space-y-3">
                      {/* Resumo visual do progresso geral */}
                      <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase block">Progresso Geral de Fabricação</span>
                          <span className="text-[11px] text-slate-700 font-semibold">
                            {finishedItems} de {linkedOPs.length} itens finalizados
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-1 sm:max-w-[200px]">
                          <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${totalProgress}%` }}></div>
                          </div>
                          <span className="font-mono text-[11px] font-bold text-slate-700">{Math.round(totalProgress)}%</span>
                        </div>
                      </div>

                      {/* Lista de cada item em produção */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {linkedOPs.map((op) => {
                          const isFinished = op.status === 'CONCLUÍDO';
                          return (
                            <div key={op.id} className="bg-white border border-slate-150 rounded-xl p-3 shadow-xs relative overflow-hidden group">
                              {/* Visual Indicator Line based on status */}
                              <div className={`absolute top-0 left-0 bottom-0 w-1 ${
                                op.status === 'CAD' ? 'bg-cyan-400' :
                                op.status === 'LASER' ? 'bg-indigo-400' :
                                op.status === 'CORTE DOBRA' ? 'bg-blue-500' :
                                op.status === 'PINTURA' ? 'bg-purple-500' :
                                op.status === 'ELÉTRICA FILTROS' ? 'bg-amber-500' :
                                'bg-emerald-500'
                              }`} />

                              <div className="pl-2">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <span className="font-mono text-[9px] font-bold text-slate-400">{op.id}</span>
                                  <span className={`px-1.5 py-0.5 rounded text-[8px] font-bold ${
                                    op.status === 'CAD' ? 'bg-cyan-50 text-cyan-700' :
                                    op.status === 'LASER' ? 'bg-indigo-50 text-indigo-700' :
                                    op.status === 'CORTE DOBRA' ? 'bg-blue-50 text-blue-700' :
                                    op.status === 'PINTURA' ? 'bg-purple-50 text-purple-700' :
                                    op.status === 'ELÉTRICA FILTROS' ? 'bg-amber-50 text-amber-700' :
                                    'bg-emerald-50 text-emerald-700 border border-emerald-100'
                                  }`}>
                                    {op.status}
                                  </span>
                                </div>

                                <h5 className="font-bold text-slate-850 text-xs leading-snug line-clamp-1">{op.product}</h5>
                                <div className="text-[10px] text-slate-500 mt-1">
                                  Qtd: <strong className="font-semibold text-slate-700">{op.qty} un</strong> • Supervisor: <strong className="font-medium text-slate-700">{op.supervisor}</strong>
                                  {op.stageSupervisors && Object.keys(op.stageSupervisors).length > 0 && (
                                    <div className="mt-1.5 bg-slate-50 border border-slate-100 rounded-md p-1.5 text-[8.5px] text-slate-500">
                                      <span className="font-bold uppercase text-[7.5px] text-indigo-700 block mb-0.5">Participaram da Produção:</span>
                                      <div className="flex flex-wrap gap-1 mt-0.5">
                                        {Object.entries(op.stageSupervisors).map(([stage, sup]) => (
                                          <span key={stage} className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-700">
                                            <strong className="text-slate-500 font-semibold">{stage}:</strong> {sup}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>

                                {/* Barra de progresso individual */}
                                <div className="flex items-center gap-2 mt-2 pt-1.5 border-t border-slate-100">
                                  <div className="flex-1 bg-slate-100 h-1 rounded-full overflow-hidden">
                                    <div className={`h-full transition-all ${
                                      op.status === 'CAD' ? 'bg-cyan-400' :
                                      op.status === 'LASER' ? 'bg-indigo-400' :
                                      op.status === 'CORTE DOBRA' ? 'bg-blue-500' :
                                      op.status === 'PINTURA' ? 'bg-purple-500' :
                                      op.status === 'ELÉTRICA FILTROS' ? 'bg-amber-500' :
                                      'bg-emerald-500'
                                    }`} style={{ width: `${op.progress}%` }}></div>
                                  </div>
                                  <span className="font-mono text-[9px] font-bold text-slate-500">{op.progress}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Status History Log for Order */}
              {((isEditing ? editOrder?.history : selectedOrder.history) || []).length > 0 && (
                <div className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/80 space-y-2 mt-4">
                  <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                    Histórico de Alterações do Pedido
                  </h4>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                    {((isEditing ? editOrder?.history : selectedOrder.history) || []).map((entry, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/70 flex justify-between items-center text-xs shadow-2xs">
                        <div>
                          <span className="font-bold text-slate-800">{entry.newStatus}</span>
                          {entry.previousStatus && (
                            <span className="text-slate-400 font-mono text-[10px] ml-1.5">(de: {entry.previousStatus})</span>
                          )}
                          <p className="text-[10px] text-slate-500">{entry.notes || 'Alteração de status registrada'}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 font-mono">
                          <span className="block font-bold text-slate-600">👤 {entry.user}</span>
                          <span>{entry.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-between items-center gap-2">
              <div>
                {isEditing && editOrder && (!editOrder.products || editOrder.products.length === 0) && (
                  <button
                    type="button"
                    onClick={handleAddProductRow}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs px-3 py-2 rounded-lg font-bold border border-indigo-200 transition-colors"
                  >
                    + Novo Item (Estruturado)
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {isEditing && editOrder ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        if (editOrder) {
                          // Validate installment due dates if payment method is Boleto
                          if (editOrder.paymentMethod?.includes('Boleto')) {
                            const insts = editOrder.boletoInstallments && editOrder.boletoInstallments.length > 0 
                              ? editOrder.boletoInstallments 
                              : [
                                  {
                                    id: "1",
                                    dueDate: editOrder.boletoDueDate || '',
                                    value: editOrder.value,
                                    paid: !!editOrder.boletoPaid
                                  }
                                ];
                            const hasEmptyDate = insts.some(i => !i.dueDate);
                            if (hasEmptyDate) {
                              showToast('Por favor, informe a Data de Vencimento de cada uma das parcelas do Boleto.', 'error');
                              return;
                            }
                          }
                          onUpdateSalesOrder?.(editOrder.id, editOrder);
                          setSelectedOrder(editOrder);
                          setIsEditing(false);
                          setEditOrder(null);
                          showToast('Alterações salvas com sucesso!', 'success');
                        }
                      }}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow transition-colors"
                    >
                      Salvar Alterações
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(false);
                        setEditOrder(null);
                      }}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-4 py-2 rounded-lg font-bold transition-colors"
                    >
                      Cancelar
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsEditing(true);
                        setEditOrder({ ...selectedOrder });
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-white text-xs px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1.5 transition-colors"
                    >
                      <Edit className="w-4 h-4 animate-bounce" />
                      Editar Pedido
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrint(selectedOrder)}
                      className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1.5 transition-colors"
                    >
                      <Printer className="w-4 h-4" />
                      Imprimir Pedido
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePrintServiceOrder(selectedOrder)}
                      className="bg-teal-600 hover:bg-teal-700 text-white text-xs px-4 py-2 rounded-lg font-bold shadow flex items-center gap-1.5 transition-colors"
                      title="Imprimir Ordem de Serviço sem valores"
                    >
                      <FileText className="w-4 h-4" />
                      Imprimir O.S.
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(null);
                        setIsEditing(false);
                        setEditOrder(null);
                      }}
                      className="bg-slate-800 hover:bg-slate-900 text-white text-xs px-5 py-2 rounded-lg font-bold shadow transition-colors"
                    >
                      Fechar Detalhes
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Full-size Image Preview Modal */}
      {activePreviewImage && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 z-[60] animate-in fade-in duration-150">
          <div className="relative max-w-4xl w-full flex flex-col items-center">
            <button 
              type="button"
              onClick={() => setActivePreviewImage(null)}
              className="absolute -top-12 right-0 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
              title="Fechar Visualização"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="bg-slate-900/50 p-1 rounded-2xl border border-white/10 overflow-hidden shadow-2xl max-h-[80vh] flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img 
                src={activePreviewImage} 
                alt="Desenho do Projeto Ampliado" 
                className="max-w-full max-h-[75vh] object-contain rounded-xl"
              />
            </div>
            
            <p className="text-white/60 text-[11px] mt-3 font-semibold tracking-wide">
              Clique no botão de fechar (X) ou no plano de fundo para voltar aos detalhes do pedido.
            </p>
          </div>
          {/* Clickable background overlay */}
          <div 
            className="absolute inset-0 -z-10" 
            onClick={() => setActivePreviewImage(null)}
          />
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO DO COMPROVANTE (HIDDEN POR PADRÃO, APENAS ATIVADO NO PRINT) */}
      {printOrder && typeof window !== 'undefined' && createPortal(
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body > *:not(#printable-receipt-area) {
                display: none !important;
              }
              #printable-receipt-area {
                display: block !important;
                width: 100% !important;
                padding: 15px !important;
                background: white !important;
                color: black !important;
                position: relative !important;
                z-index: 99999 !important;
              }
            }
          `}} />
          
          <div id="printable-receipt-area" className="block text-slate-900 bg-white font-sans">
            {/* Cabecalho da Empresa */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="flex items-start gap-4">
                {systemParams?.companyLogo && (
                  <div className="flex-shrink-0">
                    <img 
                      src={systemParams.companyLogo} 
                      alt="Logo" 
                      className="max-h-16 max-w-[140px] object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {systemParams?.companyName || 'Estilo Coifas'}
                  </h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                    {systemParams?.companyEmail || 'comercial@estilocoifas.com.br'} • {systemParams?.companyPhone || '(11) 4002-8922'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    CNPJ: {systemParams?.companyCnpj || '12.345.678/0001-90'} • {systemParams?.companyAddress || 'Rua Industrial, 1000 - São Paulo, SP'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-slate-900 text-white font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider inline-block">
                  COMPROVANTE DE PEDIDO
                </div>
                <p className="text-xs font-mono font-bold mt-1 text-slate-700">Nº {printOrder.id}</p>
                <p className="text-[10px] text-slate-500 font-mono">Emissão: {printOrder.date}</p>
              </div>
            </div>

            {/* Grid de Informacoes de Clientes e Operador */}
            <div className="grid grid-cols-2 gap-4 my-5 text-[11px] border-b border-slate-200 pb-5">
              <div>
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dados do Cliente</h3>
                <p className="font-bold text-slate-800 text-xs">{printOrder.client}</p>
                <p className="text-slate-500 mt-0.5">Previsão de Entrega: <span className="font-mono font-bold text-slate-700">{printOrder.deliveryDate || 'N/A'}</span></p>
              </div>
              <div className="text-right">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsável & Operação</h3>
                <p className="text-slate-700">Operador Emissor: <span className="font-bold text-indigo-700">👤 {printOrder.operator || 'Eduardo Fontes'}</span></p>
                <p className="text-slate-500 mt-0.5">Forma de Pagamento: <span className="font-semibold text-slate-700">{printOrder.paymentMethod || 'Boleto Bancário'}</span></p>
                <p className="text-slate-500">Status do Pedido: <span className="font-bold text-slate-800">{printOrder.status}</span></p>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="my-5">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Grade de Itens do Pedido</h3>
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] font-bold uppercase text-slate-500 bg-slate-50">
                    <th className="py-1.5 px-2">SKU</th>
                    <th className="py-1.5 px-2">Descrição do Item</th>
                    <th className="py-1.5 px-2 text-center">Un.</th>
                    <th className="py-1.5 px-2 text-center">Qtd.</th>
                    {!hideOrderValues && (
                      <>
                        <th className="py-1.5 px-2 text-right">Valor Unitário</th>
                        <th className="py-1.5 px-2 text-right">Subtotal</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printOrder.products && printOrder.products.length > 0 ? (
                    printOrder.products.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-mono font-bold text-slate-600">{item.sku}</td>
                        <td className="py-2 px-2">
                          <div className="font-semibold text-slate-800">{item.name}</div>
                          {item.note && (
                            <div className="text-[9px] text-indigo-700 font-medium mt-0.5">
                              Obs: {item.note}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500">{item.unit || 'UN'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700">{item.qty}</td>
                        {!hideOrderValues && (
                          <>
                            <td className="py-2 px-2 text-right font-mono text-slate-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                            </td>
                            <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                            </td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={hideOrderValues ? 4 : 6} className="py-3 px-2 font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {printOrder.items}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais do Pedido */}
            {!hideOrderValues && (
              <div className="flex justify-end my-4 border-t border-slate-200 pt-3">
                <div className="w-56 text-[11px] space-y-1 text-right">
                  {printOrder.discountPercentage ? (
                    <div className="flex justify-between text-slate-500">
                      <span>Desconto ({printOrder.discountPercentage}%):</span>
                      <span className="font-mono font-bold text-rose-600">
                        -{printOrder.discountPercentage}%
                      </span>
                    </div>
                  ) : null}
                  <div className="flex justify-between text-xs font-bold border-t border-slate-100 pt-1">
                    <span className="text-slate-800">Valor Total Líquido:</span>
                    <span className="font-mono text-sm font-black text-slate-950">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(printOrder.value)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Observacoes */}
            {printOrder.notes && (
              <div className="my-4 border border-slate-200 rounded p-3 bg-slate-50/50 text-[11px]">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observações / Instruções Especiais</h4>
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{printOrder.notes}</p>
              </div>
            )}

            {/* Linhas de Assinaturas */}
            <div className="grid grid-cols-2 gap-8 mt-14 pt-6 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Operador</p>
                <p className="font-mono mt-0.5">{printOrder.operator || 'Eduardo Fontes'}</p>
              </div>
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Cliente</p>
                <p className="font-mono mt-0.5">{printOrder.client}</p>
              </div>
            </div>

            {/* Rodape de Auditoria */}
            <div className="text-center text-[8px] text-slate-400 mt-10 pt-3 border-t border-slate-100 font-mono">
              Estilo Coifas ERP • Sistema de Auditoria Interna de Produção e Vendas • Documento impresso por {printOrder.operator || 'Eduardo Fontes'}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* ÁREA DE IMPRESSÃO DA ORDEM DE SERVIÇO (HIDDEN POR PADRÃO, APENAS ATIVADO NO PRINT) */}
      {printServiceOrder && typeof window !== 'undefined' && createPortal(
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              html, body {
                background: white !important;
                color: black !important;
                height: auto !important;
                min-height: 0 !important;
                max-height: none !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              body > *:not(#printable-os-area) {
                display: none !important;
              }
              #printable-os-area {
                display: block !important;
                width: 100% !important;
                padding: 15px !important;
                background: white !important;
                color: black !important;
                position: relative !important;
                z-index: 99999 !important;
              }
            }
          `}} />
          
          <div id="printable-os-area" className="block text-slate-900 bg-white font-sans">
            {/* Cabecalho da Empresa */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="flex items-start gap-4">
                {systemParams?.companyLogo && (
                  <div className="flex-shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img 
                      src={systemParams.companyLogo} 
                      alt="Logo" 
                      className="max-h-16 max-w-[140px] object-contain"
                    />
                  </div>
                )}
                <div>
                  <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                    {systemParams?.companyName || 'Estilo Coifas'}
                  </h1>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mt-0.5">
                    {systemParams?.companyEmail || 'comercial@estilocoifas.com.br'} • {systemParams?.companyPhone || '(11) 4002-8922'}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    CNPJ: {systemParams?.companyCnpj || '12.345.678/0001-90'} • {systemParams?.companyAddress || 'Rua Industrial, 1000 - São Paulo, SP'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <div className="bg-teal-600 text-white font-bold px-2.5 py-0.5 text-[10px] uppercase tracking-wider inline-block">
                  ORDEM DE SERVIÇO (O.S.)
                </div>
                <p className="text-xs font-mono font-bold mt-1 text-slate-700">Nº OS-{printServiceOrder.id.replace('VD-', '')}</p>
                <p className="text-[10px] text-slate-500 font-mono">Pedido: {printServiceOrder.id}</p>
                <p className="text-[10px] text-slate-500 font-mono font-semibold">Emissão: {printServiceOrder.date}</p>
              </div>
            </div>

            {/* Grid de Informacoes de Clientes e Operador */}
            <div className="grid grid-cols-2 gap-4 my-5 text-[11px] border-b border-slate-200 pb-5">
              <div>
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Dados do Cliente</h3>
                <p className="font-bold text-slate-800 text-xs">
                  {customers.find(c => c.name === printServiceOrder.client)?.nickname || printServiceOrder.client}
                </p>
                <p className="text-slate-500 mt-0.5">Previsão de Entrega: <span className="font-mono font-bold text-slate-700">{printServiceOrder.deliveryDate || 'N/A'}</span></p>
              </div>
              <div className="text-right">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsável & Operação</h3>
                <p className="text-slate-700">Operador Emissor: <span className="font-bold text-indigo-700">👤 {printServiceOrder.operator || 'Eduardo Fontes'}</span></p>
                <p className="text-slate-500">Status do Pedido: <span className="font-bold text-slate-800">{printServiceOrder.status}</span></p>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="my-5">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Detalhamento dos Serviços / Observações de Fabricação</h3>
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] font-bold uppercase text-slate-500 bg-slate-50">
                    <th className="py-1.5 px-2 w-[15%]">SKU</th>
                    <th className="py-1.5 px-2 w-[70%]">Observações / Descrição do Item</th>
                    <th className="py-1.5 px-2 text-center w-[15%]">Quantidade</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printServiceOrder.products && printServiceOrder.products.length > 0 ? (
                    printServiceOrder.products.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2.5 px-2 font-mono font-bold text-slate-600">{item.sku}</td>
                        <td className="py-2.5 px-2">
                          <div className="font-bold text-slate-900 text-xs whitespace-pre-wrap">
                            {item.note || item.name}
                          </div>
                          {item.note && (
                            <div className="text-[9px] text-slate-500 mt-1 italic font-medium">
                              Item: {item.name}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-950 text-sm">{item.qty} {item.unit || 'UN'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="py-4 px-2 font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {printServiceOrder.items}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Observacoes Gerais */}
            {printServiceOrder.notes && (
              <div className="my-5 border border-slate-200 rounded p-3 bg-slate-50/50 text-[11px]">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observações Gerais / Instruções de Entrega e Instalação</h4>
                <p className="text-slate-800 leading-relaxed font-semibold whitespace-pre-wrap">{printServiceOrder.notes}</p>
              </div>
            )}

            {/* Linhas de Assinaturas */}
            <div className="grid grid-cols-2 gap-8 mt-16 pt-6 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Responsável</p>
                <p className="font-mono mt-0.5">{printServiceOrder.operator || 'Eduardo Fontes'}</p>
              </div>
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Conformidade de Produção / Supervisor</p>
                <p className="font-mono mt-0.5">Carlos Eduardo</p>
              </div>
            </div>

            {/* Rodape de Auditoria */}
            <div className="text-center text-[8px] text-slate-400 mt-12 pt-3 border-t border-slate-100 font-mono">
              Estilo Coifas ERP • Ordem de Serviço de Fabricação e Instalação • Sem valores financeiros • Documento impresso por {printServiceOrder.operator || 'Eduardo Fontes'}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
