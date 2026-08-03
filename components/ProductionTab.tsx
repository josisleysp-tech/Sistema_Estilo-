'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  Paperclip, 
  User, 
  Clock, 
  Sliders, 
  ExternalLink,
  SlidersHorizontal,
  FolderOpen,
  Calendar,
  Layers,
  FileCheck,
  Search,
  Filter,
  RefreshCcw,
  AlertCircle,
  CheckCircle2,
  Edit3,
  TrendingUp,
  Cpu,
  Printer,
  UserCheck,
  ClipboardList,
  X
} from 'lucide-react';
import { ProductionOrder, InventoryItem, SalesOrder, Customer, UserAccess } from '../lib/types';

interface ProductionTabProps {
  productionOrders: ProductionOrder[];
  salesOrders: SalesOrder[];
  inventory: InventoryItem[];
  customers?: Customer[];
  users?: UserAccess[];
  onAddOP: (op: Omit<ProductionOrder, 'id'>) => void;
  onUpdateOPStatus: (id: string, newStatus: ProductionOrder['status']) => void;
  onUpdateOPProgress: (id: string, newProgress: number) => void;
  onUpdateOPDetails?: (id: string, updatedFields: Partial<ProductionOrder>) => void;
  onSelectOPForViewer: (op: ProductionOrder) => void;
  isNewOPModalOpen: boolean;
  onOpenNewOP: () => void;
  onCloseNewOP: () => void;
  systemParams?: any;
}

const KANBAN_STAGES: ProductionOrder['status'][] = [
  'CAD',
  'LASER',
  'CORTE DOBRA',
  'PINTURA',
  'ELÉTRICA FILTROS',
  'CONCLUÍDO'
];

export default function ProductionTab({
  productionOrders,
  salesOrders,
  inventory,
  customers = [],
  users = [],
  onAddOP,
  onUpdateOPStatus,
  onUpdateOPProgress,
  onUpdateOPDetails,
  onSelectOPForViewer,
  isNewOPModalOpen,
  onOpenNewOP,
  onCloseNewOP,
  systemParams
}: ProductionTabProps) {
  
  // Printing Painting stage state
  const [isPrintingPainting, setIsPrintingPainting] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Filter out any production order whose linked sales order is in 'Orçamento' status
  const activeProductionOrders = useMemo(() => {
    return productionOrders.filter(op => {
      if (!op.salesOrderId) return true;
      const linkedSO = salesOrders.find(so => so.id === op.salesOrderId);
      return !linkedSO || linkedSO.status !== 'Orçamento';
    });
  }, [productionOrders, salesOrders]);

  // Memoized list of items in the Painting (PINTURA) stage
  const paintingOrders = useMemo(() => {
    return activeProductionOrders.filter(op => op.status === 'PINTURA');
  }, [activeProductionOrders]);

  // Painting period report states
  const [isPaintingReportOpen, setIsPaintingReportOpen] = useState(false);
  const [reportStartDate, setReportStartDate] = useState('');
  const [reportEndDate, setReportEndDate] = useState('');
  const [reportStatusFilter, setReportStatusFilter] = useState('Todos');
  const [isPrintingPaintingReport, setIsPrintingPaintingReport] = useState(false);

  const periodPaintingOrders = useMemo(() => {
    return activeProductionOrders.filter(op => {
      const touchedPainting = op.status === 'PINTURA' || op.status === 'ELÉTRICA FILTROS' || op.status === 'CONCLUÍDO' || (op.history && op.history.some(h => h.newStatus === 'PINTURA'));
      if (!touchedPainting) return false;

      if (reportStatusFilter !== 'Todos' && op.status !== reportStatusFilter) {
        return false;
      }

      if (reportStartDate || reportEndDate) {
        if (!op.date) return false;
        let opDateObj: Date | null = null;
        if (op.date.includes('/')) {
          const parts = op.date.split('/');
          if (parts.length === 3) {
            opDateObj = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
          }
        } else {
          opDateObj = new Date(op.date);
        }

        if (opDateObj && !isNaN(opDateObj.getTime())) {
          if (reportStartDate) {
            const startObj = new Date(reportStartDate);
            if (opDateObj < startObj) return false;
          }
          if (reportEndDate) {
            const endObj = new Date(reportEndDate);
            endObj.setHours(23, 59, 59, 999);
            if (opDateObj > endObj) return false;
          }
        }
      }

      return true;
    });
  }, [activeProductionOrders, reportStartDate, reportEndDate, reportStatusFilter]);

  const handlePrintPaintingReportModal = () => {
    setIsPrintingPaintingReport(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingPaintingReport(false);
      }, 500);
    }, 150);
  };

  const handlePrintPaintingQueue = () => {
    if (paintingOrders.length === 0) {
      alert("Não há ordens de produção na etapa de Pintura atualmente!");
      return;
    }
    setIsPrintingPainting(true);
    setTimeout(() => {
      window.print();
      setTimeout(() => {
        setIsPrintingPainting(false);
      }, 500);
    }, 150);
  };
  
  // Search & Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [lineFilter, setLineFilter] = useState('Todas');
  const [priorityFilter, setPriorityFilter] = useState('Todas');
  const [supervisorFilter, setSupervisorFilter] = useState('Todos');

  // New OP Form states
  const [newProductSku, setNewProductSku] = useState('');
  const [newQty, setNewQty] = useState('');
  const [newLine, setNewLine] = useState('Linha A');
  const [newPriority, setNewPriority] = useState<ProductionOrder['priority']>('Alta');
  const [newDate, setNewDate] = useState('');
  const [newSupervisor, setNewSupervisor] = useState('Carlos Eduardo');
  const [newFilesList, setNewFilesList] = useState<string[]>([]);
  const [newFileNameInput, setNewFileNameInput] = useState('');
  const [newSalesOrderId, setNewSalesOrderId] = useState('');
  const [newNote, setNewNote] = useState('');

  // Editing OP state
  const [editingOP, setEditingOP] = useState<ProductionOrder | null>(null);
  const [editQty, setEditQty] = useState('');
  const [editLine, setEditLine] = useState('Linha A');
  const [editPriority, setEditPriority] = useState<ProductionOrder['priority']>('Alta');
  const [editSupervisor, setEditSupervisor] = useState('Carlos Eduardo');
  const [editOperator, setEditOperator] = useState('');
  const [editProgress, setEditProgress] = useState(0);
  const [editStatus, setEditStatus] = useState<ProductionOrder['status']>('CAD');
  const [editDate, setEditDate] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [editFilesList, setEditFilesList] = useState<string[]>([]);
  const [editNote, setEditNote] = useState('');
  const [editStageSupervisors, setEditStageSupervisors] = useState<Record<string, string>>({});

  const allowedEditStages = useMemo(() => {
    if (!editingOP) return ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS', 'CONCLUÍDO'];
    const prod = inventory.find(item => item.name === editingOP.product);
    if (prod && prod.stages && prod.stages.length > 0) {
      return [...prod.stages, 'CONCLUÍDO'];
    }
    return ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS', 'CONCLUÍDO'];
  }, [editingOP, inventory]);

  const supervisorsList = useMemo(() => {
    if (users && users.length > 0) {
      return users.map(u => u.name);
    }
    return [
      'Carlos Eduardo',
      'Ana Paula',
      'Fernanda Souza',
      'Marcos Silva'
    ];
  }, [users]);

  // Apply filters on production orders
  const filteredOrders = useMemo(() => {
    return activeProductionOrders.filter(op => {
      const customerMatch = op.salesOrderClient ? customers.find(c => c.name === op.salesOrderClient) : null;
      const clientNickname = customerMatch?.nickname || '';

      const matchesSearch = 
        op.product.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        op.supervisor.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (op.operator && op.operator.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (op.salesOrderId && op.salesOrderId.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (op.salesOrderClient && (
          op.salesOrderClient.toLowerCase().includes(searchTerm.toLowerCase()) ||
          clientNickname.toLowerCase().includes(searchTerm.toLowerCase())
        ));
      
      const matchesLine = lineFilter === 'Todas' || op.line === lineFilter;
      const matchesPriority = priorityFilter === 'Todas' || op.priority === priorityFilter;
      const matchesSupervisor = supervisorFilter === 'Todos' || op.supervisor === supervisorFilter;

      return matchesSearch && matchesLine && matchesPriority && matchesSupervisor;
    });
  }, [activeProductionOrders, customers, searchTerm, lineFilter, priorityFilter, supervisorFilter]);

  // General Production metrics
  const stats = useMemo(() => {
    const totalActive = activeProductionOrders.filter(op => op.status !== 'CONCLUÍDO').length;
    const critical = activeProductionOrders.filter(op => op.status !== 'CONCLUÍDO' && (op.priority === 'Crítica' || op.priority === 'Alta')).length;
    
    // Average progress of active OPs
    const activeOPs = activeProductionOrders.filter(op => op.status !== 'CONCLUÍDO');
    const avgProgress = activeOPs.length > 0 
      ? Math.round(activeOPs.reduce((sum, op) => sum + op.progress, 0) / activeOPs.length)
      : 0;

    // Manufactured vs target volume
    const completedQty = activeProductionOrders.filter(op => op.status === 'CONCLUÍDO').reduce((sum, op) => sum + op.qty, 0);
    const totalQty = activeProductionOrders.reduce((sum, op) => sum + op.qty, 0);

    return {
      totalActive,
      critical,
      avgProgress,
      completedQty,
      totalQty
    };
  }, [activeProductionOrders]);

  // Load Balance metrics by Production Line
  const lineMetrics = useMemo(() => {
    const lines = ['Linha A', 'Linha B', 'Linha C'];
    return lines.map(lineName => {
      const lineOPs = activeProductionOrders.filter(op => op.line === lineName && op.status !== 'CONCLUÍDO');
      const unitsCount = lineOPs.reduce((sum, op) => sum + op.qty, 0);
      const avgProg = lineOPs.length > 0
        ? Math.round(lineOPs.reduce((sum, op) => sum + op.progress, 0) / lineOPs.length)
        : 0;
      
      return {
        name: lineName,
        opsCount: lineOPs.length,
        unitsCount,
        avgProgress: avgProg
      };
    });
  }, [activeProductionOrders]);

  const handleCreateOP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductSku || !newQty) return;
    
    const selectedProd = inventory.find(i => i.sku === newProductSku);
    const prodName = selectedProd ? selectedProd.name : 'Componente Customizado';
    const selectedSalesOrder = salesOrders.find(so => so.id === newSalesOrderId);

    let initialStatus: ProductionOrder['status'] = 'CAD';
    if (selectedProd && selectedProd.stages && selectedProd.stages.length > 0) {
      initialStatus = selectedProd.stages[0] as ProductionOrder['status'];
    }

    onAddOP({
      product: prodName,
      qty: parseFloat(newQty) || 1,
      line: newLine,
      priority: newPriority,
      status: initialStatus,
      supervisor: newSupervisor,
      progress: 0,
      date: newDate || new Date().toISOString().split('T')[0],
      files: newFilesList.length > 0 ? newFilesList : [`Desenho_${newProductSku}.dwg`],
      salesOrderId: newSalesOrderId || undefined,
      salesOrderClient: selectedSalesOrder ? selectedSalesOrder.client : undefined,
      note: newNote || undefined
    });

    // Reset Form
    setNewProductSku('');
    setNewQty('');
    setNewLine('Linha A');
    setNewPriority('Alta');
    setNewDate('');
    setNewSupervisor('Carlos Eduardo');
    setNewFilesList([]);
    setNewFileNameInput('');
    setNewSalesOrderId('');
    setNewNote('');
    onCloseNewOP();
  };

  const handleOpenEditModal = (op: ProductionOrder) => {
    setEditingOP(op);
    setEditQty(op.qty.toString());
    setEditLine(op.line);
    setEditPriority(op.priority);
    setEditSupervisor(op.supervisor);
    setEditOperator(op.operator || '');
    setEditProgress(op.progress);
    setEditStatus(op.status);
    setEditDate(op.date);
    setEditFilesList([...op.files]);
    setEditFileName('');
    setEditNote(op.note || '');
    setEditStageSupervisors(op.stageSupervisors || {});
  };

  const handleSaveEditOP = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOP) return;

    const updatedStageSupervisors = {
      ...editStageSupervisors,
      [editStatus]: editStageSupervisors[editStatus] || editSupervisor
    };

    if (onUpdateOPDetails) {
      onUpdateOPDetails(editingOP.id, {
        qty: parseFloat(editQty) || 1,
        line: editLine,
        priority: editPriority,
        supervisor: editSupervisor,
        operator: editOperator || undefined,
        progress: editProgress,
        status: editStatus,
        date: editDate,
        files: editFilesList,
        note: editNote || undefined,
        stageSupervisors: updatedStageSupervisors
      });
    } else {
      // Fallback if prop not defined
      onUpdateOPStatus(editingOP.id, editStatus);
      onUpdateOPProgress(editingOP.id, editProgress);
    }

    setEditingOP(null);
  };

  const handleAddFileToForm = () => {
    if (!newFileNameInput.trim()) return;
    setNewFilesList(prev => [...prev, newFileNameInput.trim()]);
    setNewFileNameInput('');
  };

  const handleAddFileToEditForm = () => {
    if (!editFileName.trim()) return;
    setEditFilesList(prev => [...prev, editFileName.trim()]);
    setEditFileName('');
  };

  const handleRemoveFileFromEditForm = (fileName: string) => {
    setEditFilesList(prev => prev.filter(f => f !== fileName));
  };

  const moveCard = (id: string, direction: 'left' | 'right', currentStatus: ProductionOrder['status']) => {
    const op = productionOrders.find(o => o.id === id);
    if (!op) return;

    const prod = inventory.find(item => item.name === op.product);
    let allowedStages: ProductionOrder['status'][] = [];
    if (prod && prod.stages && prod.stages.length > 0) {
      allowedStages = [...(prod.stages as ProductionOrder['status'][]), 'CONCLUÍDO'];
    } else {
      allowedStages = ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS', 'CONCLUÍDO'];
    }

    const currentAllowedIndex = allowedStages.indexOf(currentStatus);

    if (direction === 'left' && currentAllowedIndex > 0) {
      const newStatus = allowedStages[currentAllowedIndex - 1];
      onUpdateOPStatus(id, newStatus);
      const newIndex = KANBAN_STAGES.indexOf(newStatus);
      const calculatedProgress = Math.round((newIndex / (KANBAN_STAGES.length - 1)) * 100);
      onUpdateOPProgress(id, calculatedProgress);
    } else if (direction === 'right' && currentAllowedIndex < allowedStages.length - 1) {
      const newStatus = allowedStages[currentAllowedIndex + 1];
      onUpdateOPStatus(id, newStatus);
      const newIndex = KANBAN_STAGES.indexOf(newStatus);
      const calculatedProgress = Math.round((newIndex / (KANBAN_STAGES.length - 1)) * 100);
      onUpdateOPProgress(id, calculatedProgress);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setLineFilter('Todas');
    setPriorityFilter('Todas');
    setSupervisorFilter('Todos');
  };

  // Supervisor avatar mapping (Unsplash URLs)
  const getAvatarUrl = (name: string) => {
    switch (name) {
      case 'Ana Paula':
        return 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&h=150&q=80';
      case 'Carlos Eduardo':
        return 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80';
      case 'Marcos Silva':
        return 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80';
      case 'Fernanda Souza':
        return 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=150&h=150&q=80';
      default:
        return 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header element */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 id="production-panel-heading" className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-600 animate-pulse" />
            Painel de Controle de Produção
          </h2>
          <p className="text-xs text-slate-500 mt-1">Supervisão de ordens por etapas Kanban e arquivos CAD</p>
        </div>
        <div className="flex flex-wrap gap-2.5 self-start">
          <button 
            onClick={() => setIsPaintingReportOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-md transition-all duration-250 hover:shadow-lg hover:scale-[1.01] cursor-pointer"
          >
            <Printer className="w-4 h-4 text-purple-400" />
            Relatório de Pintura Terceirizada (Período)
          </button>
          <button 
            onClick={handlePrintPaintingQueue}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-md transition-all duration-250 hover:shadow-lg hover:scale-[1.01] cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            Imprimir Fila de Pintura
          </button>
          <button 
            onClick={onOpenNewOP}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-md transition-all duration-250 hover:shadow-lg hover:scale-[1.01] self-start cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Abertura de Nova OP
          </button>
        </div>
      </div>

      {/* KPI Stats Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">OPs Ativas</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
                {stats.totalActive}
              </span>
            </div>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-medium">
            Em desenvolvimento nas linhas
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Urgências Críticas</span>
              <span className={`text-2xl font-black font-mono mt-1 block ${stats.critical > 0 ? 'text-rose-600 animate-pulse' : 'text-slate-800'}`}>
                {stats.critical}
              </span>
            </div>
            <div className={`p-2 rounded-lg ${stats.critical > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-medium">
            Prioridade Alta ou Crítica
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Progresso Médio</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
                {stats.avgProgress}%
              </span>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full rounded-full" style={{ width: `${stats.avgProgress}%` }}></div>
            </div>
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-xl p-4 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lote Concluído</span>
              <span className="text-2xl font-black text-slate-800 font-mono mt-1 block">
                {stats.completedQty} <span className="text-xs font-normal text-slate-400">/ {stats.totalQty} un</span>
              </span>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-[10px] text-slate-500 font-medium">
            Peças finalizadas com qualidade
          </div>
        </div>
      </div>

      {/* Advanced Filter Toolbar */}
      <div className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>Filtros e Consulta Rápida</span>
          </div>
          {(searchTerm || lineFilter !== 'Todas' || priorityFilter !== 'Todas' || supervisorFilter !== 'Todos') && (
            <button 
              onClick={clearFilters}
              className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 transition-colors cursor-pointer"
            >
              <RefreshCcw className="w-3 h-3" />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Text Search Input */}
          <div className="relative">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-3.5 h-3.5 text-slate-400" />
            </span>
            <input
              type="text"
              placeholder="Buscar por produto, OP, cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-9 pr-3 py-2 border border-slate-200 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          {/* Line Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Linha</span>
            <select
              value={lineFilter}
              onChange={(e) => setLineFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 px-2 py-2 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none"
            >
              <option value="Todas">Todas as Linhas</option>
              <option value="Linha A">Linha A</option>
              <option value="Linha B">Linha B</option>
              <option value="Linha C">Linha C</option>
            </select>
          </div>

          {/* Priority Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Prioridade</span>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 px-2 py-2 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none"
            >
              <option value="Todas">Todas</option>
              <option value="Baixa">Baixa</option>
              <option value="Média">Média</option>
              <option value="Alta">Alta</option>
              <option value="Crítica">Crítica</option>
            </select>
          </div>

          {/* Supervisor Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0">Supervisor</span>
            <select
              value={supervisorFilter}
              onChange={(e) => setSupervisorFilter(e.target.value)}
              className="w-full text-xs border border-slate-200 px-2 py-2 rounded-lg bg-slate-50/50 focus:bg-white focus:outline-none"
            >
              <option value="Todos">Todos</option>
              {supervisorsList.map(name => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Kanban main grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {KANBAN_STAGES.map((stage) => {
          const ordersInStage = filteredOrders.filter(op => op.status === stage);
          return (
            <div key={stage} className="bg-slate-100 border border-slate-200/50 rounded-xl p-4 min-h-[500px] flex flex-col shadow-xs">
              {/* Stage header */}
              <div className="flex items-center justify-between mb-4 border-b border-slate-200/60 pb-2">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${
                    stage === 'CAD' ? 'bg-cyan-500' :
                    stage === 'LASER' ? 'bg-indigo-400' :
                    stage === 'CORTE DOBRA' ? 'bg-blue-500' :
                    stage === 'PINTURA' ? 'bg-purple-500' :
                    stage === 'ELÉTRICA FILTROS' ? 'bg-amber-500' :
                    'bg-emerald-500 font-bold animate-pulse'
                  }`}></span>
                  <span className="text-xs font-extrabold text-slate-700">{stage}</span>
                </div>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-600 font-mono text-[10px] rounded-full font-bold">
                  {ordersInStage.length}
                </span>
              </div>

              {/* Cards render container */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[600px] scrollbar-thin">
                {ordersInStage.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-slate-400 font-medium">
                    Sem ordens nesta etapa.
                  </div>
                ) : (
                  ordersInStage.map((op) => {
                    const isCritical = op.priority === 'Crítica';
                    const isHigh = op.priority === 'Alta';
                    const opProductItem = inventory.find(item => item.name === op.product);
                    let cardAllowedStages: string[] = [];
                    if (opProductItem && opProductItem.stages && opProductItem.stages.length > 0) {
                      cardAllowedStages = [...opProductItem.stages, 'CONCLUÍDO'];
                    } else {
                      cardAllowedStages = ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS', 'CONCLUÍDO'];
                    }
                    const isFirstAllowed = cardAllowedStages.indexOf(op.status) <= 0;
                    const isLastAllowed = cardAllowedStages.indexOf(op.status) === cardAllowedStages.length - 1;
                    return (
                      <div 
                        key={op.id} 
                        className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all group duration-200"
                      >
                        {/* OP Tag & Priority Header */}
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-mono font-bold text-slate-500">{op.id}</span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                            isCritical ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                            isHigh ? 'bg-amber-50 text-amber-700 border border-amber-100' :
                            op.priority === 'Média' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                            'bg-slate-100 text-slate-600 border border-slate-150'
                          }`}>
                            {op.priority}
                          </span>
                        </div>

                        {/* Product Title */}
                        <h4 className="text-xs font-bold text-slate-800 leading-tight mb-1">{op.product}</h4>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-2">
                          <Layers className="w-3.5 h-3.5 text-slate-300" />
                          <span>Qtd: <strong className="font-bold text-slate-700">{op.qty} un</strong></span>
                          <span>•</span>
                          <span className="font-medium text-slate-500">{op.line}</span>
                        </div>

                        {op.salesOrderId && (
                          <div className="mb-3 px-2 py-1 bg-indigo-50/70 border border-indigo-100/50 rounded-lg text-[9px] font-bold text-indigo-700 flex items-center gap-1">
                            <span className="shrink-0">📦 Pedido:</span>
                            <span className="font-mono text-indigo-900">{op.salesOrderId}</span>
                            <span className="text-indigo-300 font-normal">|</span>
                            {(() => {
                              const customerMatch = customers.find(c => c.name === op.salesOrderClient);
                              const clientDisplayName = (customerMatch?.nickname && customerMatch.nickname.trim()) || op.salesOrderClient || 'Estoque';
                              return (
                                <span className="truncate text-[8px] text-indigo-800 max-w-[120px]" title={op.salesOrderClient}>{clientDisplayName}</span>
                              );
                            })()}
                          </div>
                        )}

                        {op.note && (
                          <div className="mb-3 px-2 py-1 bg-amber-50 border border-amber-200/60 rounded-lg text-[9px] text-amber-800 font-semibold flex items-start gap-1">
                            <span className="shrink-0 text-amber-600">📝</span>
                            <span className="break-words">Obs: {op.note}</span>
                          </div>
                        )}

                        {/* Interactive Sliders (Progress) */}
                        <div className="space-y-1.5 mb-3">
                          <div className="flex justify-between text-[10px] text-slate-400">
                            <span>Progresso</span>
                            <span className="font-mono text-slate-600 font-bold">{op.progress}%</span>
                          </div>
                          <div className="relative flex items-center">
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={op.progress}
                              onChange={(e) => onUpdateOPProgress(op.id, parseInt(e.target.value))}
                              className="w-full h-1 bg-slate-100 rounded-lg appearance-none cursor-ew-resize accent-indigo-600"
                            />
                          </div>
                        </div>

                        {/* Supervisor row & metadata */}
                        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1 text-[10px]">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full overflow-hidden bg-slate-150">
                                <img 
                                  src={getAvatarUrl(op.supervisor)} 
                                  alt={op.supervisor} 
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <span className="text-slate-600 font-bold truncate max-w-[80px]">{op.supervisor}</span>
                            </div>
                            <span className="text-[9px] text-indigo-600 font-bold font-mono">👤 Op: {op.operator || 'Eduardo Fontes'}</span>
                            {op.stageSupervisors && Object.keys(op.stageSupervisors).length > 0 && (
                              <div className="mt-1.5 flex flex-col gap-1 text-[8px] bg-slate-50 border border-slate-150/50 rounded-lg p-1.5 max-w-[150px]">
                                <span className="font-extrabold text-slate-500 uppercase tracking-wider block text-[7px]">Fizeram Parte:</span>
                                <div className="flex flex-col gap-0.5">
                                  {Object.entries(op.stageSupervisors).map(([stage, supName]) => (
                                    <div 
                                      key={stage} 
                                      className="flex justify-between items-center bg-white border border-slate-100 px-1 py-0.5 rounded-md text-slate-600 text-[8px]"
                                      title={`${stage}: ${supName}`}
                                    >
                                      <span className="font-extrabold text-indigo-600 uppercase text-[7px]">{stage}</span>
                                      <span className="truncate font-bold text-slate-500 text-[7.5px] max-w-[80px] text-right">{supName}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="flex items-center gap-2">
                            {/* CAD blueprint attachments button */}
                            {(() => {
                              const salesOrderId = op.salesOrderId;
                              const assocSO = salesOrderId ? salesOrders.find(so => so.id.trim().toLowerCase() === salesOrderId.trim().toLowerCase()) : null;
                              
                              // Count unique sales order attachments (preventing double-counting if an image is in both arrays)
                              let salesOrderFilesCount = 0;
                              if (assocSO) {
                                const seenData = new Set<string>();
                                if (assocSO.projectFiles) {
                                  assocSO.projectFiles.forEach(f => {
                                    if (f.data) seenData.add(f.data);
                                    else salesOrderFilesCount++; // count if no base64 data but has a file entry
                                  });
                                }
                                salesOrderFilesCount += seenData.size;
                                
                                if (assocSO.projectImages) {
                                  assocSO.projectImages.forEach(img => {
                                    if (!seenData.has(img)) {
                                      seenData.add(img);
                                      salesOrderFilesCount++;
                                    }
                                  });
                                }
                              }

                              const totalFilesCount = op.files.length + salesOrderFilesCount;
                              if (totalFilesCount === 0) return null;
                              return (
                                <button 
                                  onClick={() => onSelectOPForViewer(op)}
                                  className="p-1 text-indigo-500 hover:text-indigo-700 bg-indigo-50/50 hover:bg-indigo-50 rounded-lg p-1.5 transition-colors flex items-center gap-0.5 border border-indigo-100/50"
                                  title="Visualizar Desenhos Técnicos e Anexos do Pedido"
                                >
                                  <Paperclip className="w-3.5 h-3.5" />
                                  <span className="text-[9px] font-mono font-bold">{totalFilesCount}</span>
                                </button>
                              );
                            })()}

                            {/* Edit OP trigger */}
                            <button
                              onClick={() => handleOpenEditModal(op)}
                              className="p-1 text-slate-400 hover:text-indigo-600 rounded hover:bg-slate-100 transition-colors"
                              title="Editar Detalhes da OP"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>

                            {/* Move card state controller */}
                            <div className="flex gap-0.5 border border-slate-150 rounded-md bg-slate-50 p-0.5">
                              <button 
                                onClick={() => moveCard(op.id, 'left', op.status)}
                                disabled={isFirstAllowed}
                                className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-40 rounded transition-all cursor-pointer"
                                title="Voltar etapa"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                              <button 
                                onClick={() => moveCard(op.id, 'right', op.status)}
                                disabled={isLastAllowed}
                                className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-40 rounded transition-all cursor-pointer"
                                title="Avançar etapa"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* New OP Modal overlay form */}
      {isNewOPModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-white shrink-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                Criar Nova Ordem de Produção
              </h3>
              <button 
                onClick={onCloseNewOP}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Fechar [X]
              </button>
            </div>

            <form onSubmit={handleCreateOP} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Select Insumo / Product SKU */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Insumo Referente</label>
                  <select 
                    value={newProductSku}
                    onChange={(e) => setNewProductSku(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="">Selecione o Item do Estoque</option>
                    {inventory.filter(item => item.active !== false).map(item => (
                      <option key={item.sku} value={item.sku}>
                        {item.name} ({item.sku})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Production Line */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Linha de Produção</label>
                  <select 
                    value={newLine}
                    onChange={(e) => setNewLine(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    <option value="Linha A">Linha de Montagem A</option>
                    <option value="Linha B">Linha de Montagem B</option>
                    <option value="Linha C">Linha de Montagem C</option>
                  </select>
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade do Lote</label>
                  <input 
                    type="number" 
                    value={newQty} 
                    onChange={(e) => setNewQty(e.target.value)}
                    required
                    placeholder="Ex: 50"
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>

                {/* supervisor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Engenheiro Supervisor</label>
                  <select 
                    value={newSupervisor}
                    onChange={(e) => setNewSupervisor(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {supervisorsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Delivery Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Prometida de Entrega</label>
                  <input 
                    type="date" 
                    value={newDate} 
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                {/* Priority Selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Grau de Prioridade</label>
                  <div className="flex gap-1.5">
                    {(['Baixa', 'Média', 'Alta', 'Crítica'] as ProductionOrder['priority'][]).map(prio => (
                      <button 
                        key={prio}
                        type="button" 
                        onClick={() => setNewPriority(prio)}
                        className={`text-[10px] font-bold flex-1 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          newPriority === prio 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Linked Sales Order */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Vincular a Pedido de Venda (Opcional)</label>
                  <select 
                    value={newSalesOrderId}
                    onChange={(e) => setNewSalesOrderId(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    <option value="">Nenhum - OP Avulsa de Estoque</option>
                    {salesOrders.filter(so => so.status !== 'Orçamento' && so.status !== 'Cancelado').map(so => (
                      <option key={so.id} value={so.id}>
                        {so.id} - {so.client} ({so.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Observation Note */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observação / Instruções Especiais de Produção</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Medida sob medida, acabamento em aço escovado, furos adicionais, etc."
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Technical Drawing File attachment sandbox zone */}
              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3 mt-4">
                <div className="text-center">
                  <FolderOpen className="w-8 h-8 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">Zona de Arquivos CAD / Desenhos Técnicos</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Anexe documentos CAD (.dwg, .dxf) vinculados a esta OP</p>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ex: Esquematico_Bomba.dwg" 
                    value={newFileNameInput}
                    onChange={(e) => setNewFileNameInput(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddFileToForm}
                    className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Vincular Documento
                  </button>
                </div>

                {newFilesList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {newFilesList.map(file => (
                      <span key={file} className="inline-flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-600 shadow-xs">
                        {file}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end shrink-0">
                <button 
                  type="button" 
                  onClick={onCloseNewOP}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 cursor-pointer font-bold"
                >
                  Descartar
                </button>
                <button 
                  type="submit" 
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-extrabold shadow-md cursor-pointer"
                >
                  Emitir Ordem de Produção
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Editing Existing OP Modal overlay form */}
      {editingOP && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 p-5 bg-white shrink-0">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-indigo-600 animate-pulse" />
                Editar Detalhes da Ordem de Produção: <span className="font-mono text-indigo-900">{editingOP.id}</span>
              </h3>
              <button 
                onClick={() => setEditingOP(null)}
                className="text-xs text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
              >
                Fechar [X]
              </button>
            </div>

            <form onSubmit={handleSaveEditOP} className="flex flex-col flex-1 overflow-hidden">
              <div className="p-6 overflow-y-auto flex-1 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Product Name (readonly) */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Insumo Referente (Não Editável)</label>
                  <input 
                    type="text" 
                    value={editingOP.product} 
                    disabled
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-100 text-slate-500 font-bold outline-none"
                  />
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Quantidade do Lote</label>
                  <input 
                    type="number" 
                    value={editQty} 
                    onChange={(e) => setEditQty(e.target.value)}
                    required
                    placeholder="Ex: 50"
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold"
                  />
                </div>

                {/* Supervisor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Engenheiro Supervisor Geral / Ativo</label>
                  <select 
                    value={editSupervisor}
                    onChange={(e) => {
                      const val = e.target.value;
                      setEditSupervisor(val);
                      setEditStageSupervisors(prev => ({
                        ...prev,
                        [editStatus]: val
                      }));
                    }}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {supervisorsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Operator Assigned */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Operador Alocado</label>
                  <select 
                    value={editOperator} 
                    onChange={(e) => setEditOperator(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium cursor-pointer"
                  >
                    <option value="">Selecione o operador / colaborador...</option>
                    {supervisorsList.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    {editOperator && !supervisorsList.includes(editOperator) && (
                      <option value={editOperator}>{editOperator}</option>
                    )}
                  </select>
                </div>

                {/* Delivery Date */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Prometida de Entrega</label>
                  <input 
                    type="date" 
                    value={editDate} 
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>

                {/* Status selection */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estágio Atual (Kanban)</label>
                  <select 
                    value={editStatus}
                    onChange={(e) => {
                      const newStat = e.target.value as ProductionOrder['status'];
                      setEditStatus(newStat);
                      if (newStat === 'CONCLUÍDO') {
                        setEditProgress(100);
                      }
                      
                      if (editStageSupervisors[newStat]) {
                        setEditSupervisor(editStageSupervisors[newStat]);
                      } else {
                        setEditStageSupervisors(prev => ({
                          ...prev,
                          [newStat]: editSupervisor
                        }));
                      }
                    }}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
                  >
                    {allowedEditStages.map(stage => (
                      <option key={stage} value={stage}>{stage}</option>
                    ))}
                  </select>
                </div>

                {/* Progress Slider */}
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Progresso Atual</label>
                    <span className="text-xs font-mono font-bold text-slate-700">{editProgress}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={editProgress} 
                    onChange={(e) => {
                      const newProg = parseInt(e.target.value);
                      setEditProgress(newProg);
                      if (newProg === 100) {
                        setEditStatus('CONCLUÍDO');
                      } else if (editStatus === 'CONCLUÍDO') {
                        const fallbackStage = allowedEditStages.length > 1
                          ? allowedEditStages[allowedEditStages.length - 2] as ProductionOrder['status']
                          : 'ELÉTRICA FILTROS';
                        setEditStatus(fallbackStage);
                      }
                    }}
                    className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-ew-resize accent-indigo-600 mt-2.5"
                  />
                </div>

                {/* Priority Selection */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2">Grau de Prioridade</label>
                  <div className="flex gap-1.5">
                    {(['Baixa', 'Média', 'Alta', 'Crítica'] as ProductionOrder['priority'][]).map(prio => (
                      <button 
                        key={prio}
                        type="button" 
                        onClick={() => setEditPriority(prio)}
                        className={`text-[10px] font-bold flex-1 py-2 rounded-lg border text-center transition-all cursor-pointer ${
                          editPriority === prio 
                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                            : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {prio}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Observation Note */}
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observação / Instruções Especiais de Produção</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Medida sob medida, acabamento em aço escovado, furos adicionais, etc."
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Supervisors per Production Stage */}
                <div className="md:col-span-2 border-t border-slate-100 pt-3">
                  <h4 className="text-[10px] font-extrabold text-indigo-900 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5" />
                    Responsáveis por Etapa de Produção (Supervisores)
                  </h4>
                  <div className="bg-slate-50 border border-slate-200/50 p-3.5 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {allowedEditStages.map(stage => {
                      const currentAssignedSupervisor = editStageSupervisors[stage] || editSupervisor;
                      return (
                        <div key={stage} className="flex flex-col gap-1">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight flex items-center gap-1">
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              stage === 'CAD' ? 'bg-cyan-500' :
                              stage === 'LASER' ? 'bg-indigo-400' :
                              stage === 'CORTE DOBRA' ? 'bg-blue-500' :
                              stage === 'PINTURA' ? 'bg-purple-500' :
                              stage === 'ELÉTRICA FILTROS' ? 'bg-amber-500' :
                              'bg-green-500'
                            }`} />
                            {stage} {stage === editStatus ? <span className="text-[8px] bg-indigo-100 text-indigo-800 px-1 rounded-sm ml-1 font-extrabold">Ativo</span> : null}
                          </span>
                          <select 
                            value={currentAssignedSupervisor}
                            onChange={(e) => {
                              const newSupervisorName = e.target.value;
                              setEditStageSupervisors(prev => ({
                                ...prev,
                                [stage]: newSupervisorName
                              }));
                              if (stage === editStatus) {
                                setEditSupervisor(newSupervisorName);
                              }
                            }}
                            className="text-xs border border-slate-200 px-2.5 py-1.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                          >
                            {supervisorsList.map(name => (
                              <option key={name} value={name}>{name}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Technical Drawing File attachment sandbox zone */}
              <div className="border border-dashed border-slate-300 rounded-xl p-4 bg-slate-50/50 space-y-3 mt-4">
                <div className="text-center">
                  <FolderOpen className="w-6 h-6 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-bold text-slate-700">Arquivos Técnicos CAD / Desenhos Técnicos Vinculados</p>
                  <p className="text-[10px] text-slate-400">Anexe ou remova documentos CAD vinculados a esta OP</p>
                </div>

                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Ex: Nova_Versao_Layout.dwg" 
                    value={editFileName}
                    onChange={(e) => setEditFileName(e.target.value)}
                    className="flex-1 text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white focus:outline-none"
                  />
                  <button 
                    type="button" 
                    onClick={handleAddFileToEditForm}
                    className="text-xs bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer"
                  >
                    Vincular Documento
                  </button>
                </div>

                {editFilesList.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {editFilesList.map(file => (
                      <span key={file} className="inline-flex items-center gap-1.5 bg-white border border-slate-200 px-2 py-1 rounded text-[10px] font-mono font-bold text-slate-600 shadow-xs">
                        {file}
                        <button 
                          type="button"
                          onClick={() => handleRemoveFileFromEditForm(file)}
                          className="text-[10px] text-rose-500 hover:text-rose-700 font-bold ml-1 cursor-pointer"
                          title="Remover arquivo"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Status History Log */}
              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/80 space-y-2 mt-4">
                <h4 className="text-[11px] font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
                  Histórico de Alterações de Status
                </h4>
                {editingOP.history && editingOP.history.length > 0 ? (
                  <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1 text-[11px]">
                    {editingOP.history.map((entry, idx) => (
                      <div key={idx} className="bg-white p-2 rounded-lg border border-slate-200/70 flex justify-between items-center text-xs shadow-2xs">
                        <div>
                          <span className="font-bold text-slate-800">{entry.newStatus}</span>
                          {entry.previousStatus && (
                            <span className="text-slate-400 font-mono text-[10px] ml-1.5">(de: {entry.previousStatus})</span>
                          )}
                          <p className="text-[10px] text-slate-500">{entry.notes || 'Alteração de status realizada'}</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-400 font-mono">
                          <span className="block font-bold text-slate-600">👤 {entry.user}</span>
                          <span>{entry.timestamp}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">Nenhuma alteração de status registrada no histórico.</p>
                )}
              </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-2 justify-end shrink-0">
                <button 
                  type="button" 
                  onClick={() => setEditingOP(null)}
                  className="text-xs text-slate-500 hover:text-slate-800 px-4 py-2 cursor-pointer font-bold"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-extrabold shadow-md cursor-pointer"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Industrial flow tip box */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
        <div className="p-2 bg-slate-200/60 rounded-lg text-slate-700">
          <FileCheck className="w-5 h-5" />
        </div>
        <div>
          <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide">Instruções de Navegação e Operação Técnica</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Arrastar e soltar não é necessário: mova os cards horizontalmente de forma rápida usando os botões de navegação lateral (<ChevronLeft className="inline w-3 h-3" /> / <ChevronRight className="inline w-3 h-3" />) ou atualize instantaneamente qualquer detalhe técnico (como operador alocado e quantidades) clicando no ícone de lápis para abrir o menu avançado da OP.
          </p>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO DA FILA DE PINTURA (HIDDEN POR PADRÃO, APENAS ATIVADO NO PRINT) */}
      {mounted && isPrintingPainting && createPortal(
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            /* Oculta completamente na tela */
            #printable-painting-area {
              display: none;
            }
            @media print {
              /* Oculta absolutamente tudo no body exceto a área de impressão */
              body > *:not(#printable-painting-area) {
                display: none !important;
              }
              html, body {
                background: white !important;
                color: black !important;
                height: auto !important;
                min-height: 0 !important;
                overflow: visible !important;
                margin: 0 !important;
                padding: 0 !important;
              }
              #printable-painting-area {
                display: block !important;
                width: 100% !important;
                padding: 20px !important;
                background: white !important;
                color: black !important;
              }
            }
          `}} />
          
          <div id="printable-painting-area" className="text-slate-900 bg-white font-sans p-6">
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
                <div className="bg-purple-600 text-white font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider inline-block rounded">
                  FILA DE PROCESSO: PINTURA
                </div>
                <p className="text-xs font-mono font-bold mt-1 text-slate-700">Total de OPs: {paintingOrders.length}</p>
                <p className="text-[10px] text-slate-500 font-mono">Gerado em: {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>

            {/* Resumo de Carga */}
            <div className="bg-slate-100 border border-slate-200 rounded p-3 my-4 text-[11px] grid grid-cols-3 gap-4">
              <div>
                <p className="text-slate-500 uppercase font-bold text-[9px]">Lote Total de Peças</p>
                <p className="text-base font-black font-mono text-purple-700">
                  {paintingOrders.reduce((sum, op) => sum + op.qty, 0)} un
                </p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[9px]">Urgências / Críticos</p>
                <p className="text-base font-black font-mono text-rose-600">
                  {paintingOrders.filter(op => op.priority === 'Alta' || op.priority === 'Crítica').length} OPs
                </p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[9px]">Operadores de Pintura</p>
                <p className="text-[10px] font-semibold text-slate-700 mt-1">
                  Definidos por OP / Assinatura
                </p>
              </div>
            </div>

            {/* Tabela de OPs em Pintura */}
            <div className="my-5">
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-[10px] font-bold uppercase text-slate-700 bg-slate-100">
                    <th className="py-2 px-2 border border-slate-300 w-24">Nº Pedido</th>
                    <th className="py-2 px-2 border border-slate-300">Produto / Equipamento</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-12">Qtd</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-20">Linha</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-20">Prioridade</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-24">Supervisor</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-24">Operador Alocado</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-28">Assinatura / Visto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {paintingOrders.map((op) => (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-700 border border-slate-300">{op.salesOrderId || `OP: ${op.id}`}</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-900 border border-slate-300">
                        {op.product}
                        {op.salesOrderClient && (() => {
                          const customerMatch = customers.find(c => c.name === op.salesOrderClient);
                          const clientDisplayName = (customerMatch?.nickname && customerMatch.nickname.trim()) || op.salesOrderClient;
                          return (
                            <span className="block text-[9px] text-slate-500 font-normal">Cliente: {clientDisplayName}</span>
                          );
                        })()}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 border border-slate-300">{op.qty}</td>
                      <td className="py-2.5 px-2 text-center font-medium text-slate-700 border border-slate-300">{op.line}</td>
                      <td className="py-2.5 px-2 text-center border border-slate-300">
                        <span className={`px-1.5 py-0.5 rounded font-bold text-[9px] uppercase ${
                          op.priority === 'Crítica' ? 'bg-red-100 text-red-800 border border-red-200' :
                          op.priority === 'Alta' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          op.priority === 'Média' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {op.priority}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center text-slate-600 border border-slate-300">{op.supervisor}</td>
                      <td className="py-2.5 px-2 text-center text-slate-700 font-medium border border-slate-300">
                        {op.operator || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center border border-slate-300">
                        <div className="w-24 border-b border-slate-400 h-5 mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Observações técnicas do setor */}
            <div className="my-6 border border-slate-200 rounded p-3 bg-purple-50/20 text-[10px] space-y-2">
              <h4 className="text-[9px] font-bold text-purple-800 uppercase tracking-wider">REQUISITOS E RECOMENDAÇÕES PARA ETAPA DE PINTURA:</h4>
              <ul className="list-disc pl-4 space-y-1 text-slate-600">
                <li>Garantir a limpeza completa de resíduos metálicos e óleos antes da aplicação da tinta.</li>
                <li>Verificar uniformidade de camada nas dobras internas de coifas e peças de exaustão.</li>
                <li>Qualquer imperfeição ou retrabalho necessário deve ser reportado imediatamente ao supervisor alocado.</li>
                <li>Assinar e datar este formulário após a conclusão física de cada OP antes do avanço no ERP.</li>
              </ul>
            </div>

            {/* Linhas de Assinaturas */}
            <div className="grid grid-cols-2 gap-8 mt-16 pt-6 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Supervisor de Produção</p>
                <p className="font-mono mt-0.5">Responsável pela Liberação</p>
              </div>
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Operador de Pintura</p>
                <p className="font-mono mt-0.5">Responsável pela Execução</p>
              </div>
            </div>

            {/* Rodape de Auditoria */}
            <div className="text-center text-[8px] text-slate-400 mt-12 pt-3 border-t border-slate-100 font-mono">
              {systemParams?.companyName || 'Estilo Coifas'} ERP • Fila de Processo e Rastreabilidade • Impresso em {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </>,
        document.body
      )}

      {/* MODAL & RELATÓRIO DE PINTURA TERCEIRIZADA (POR PERÍODO) */}
      {isPaintingReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-600/30 rounded-lg text-purple-400">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Relatório de Material em Pintura Terceirizada por Período</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Filtre por período e gere relatórios de materiais enviados para a etapa terceirizada de pintura</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPaintingReportModal}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Relatório PDF
                </button>
                <button 
                  onClick={() => setIsPaintingReportOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Filter Toolbar inside Modal */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Inicial</label>
                <input 
                  type="date"
                  value={reportStartDate}
                  onChange={(e) => setReportStartDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Final</label>
                <input 
                  type="date"
                  value={reportEndDate}
                  onChange={(e) => setReportEndDate(e.target.value)}
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status na Produção</label>
                <select
                  value={reportStatusFilter}
                  onChange={(e) => setReportStatusFilter(e.target.value)}
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/20 font-medium"
                >
                  <option value="Todos">Todos (Pintura, Elétrica, Concluído)</option>
                  <option value="PINTURA">Apenas Em Pintura</option>
                  <option value="ELÉTRICA FILTROS">Apenas Elétrica / Montagem</option>
                  <option value="CONCLUÍDO">Concluídos</option>
                </select>
              </div>
            </div>

            {/* Content Preview Table */}
            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-600 bg-purple-50/50 border border-purple-100 p-3 rounded-xl">
                <span>Total de OPs no período: <strong className="text-purple-800 font-bold">{periodPaintingOrders.length}</strong></span>
                <span>Volume total de peças: <strong className="text-purple-800 font-bold">{periodPaintingOrders.reduce((s, o) => s + o.qty, 0)} un</strong></span>
              </div>

              {periodPaintingOrders.length === 0 ? (
                <div className="text-center py-12 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Printer className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs text-slate-500 font-bold">Nenhum registro de material em pintura encontrado para o período selecionado.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Tente ajustar as datas de filtro ou cadastrar ordens de produção nesta etapa.</p>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                        <th className="px-4 py-3">Data OP</th>
                        <th className="px-4 py-3">Nº Pedido / OP</th>
                        <th className="px-4 py-3">Produto / Material</th>
                        <th className="px-4 py-3 text-center">Quantidade</th>
                        <th className="px-4 py-3 text-center">Status Atual</th>
                        <th className="px-4 py-3">Supervisor</th>
                        <th className="px-4 py-3">Operador / Pintor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {periodPaintingOrders.map(op => (
                        <tr key={op.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500 text-[11px] whitespace-nowrap">{op.date || '—'}</td>
                          <td className="px-4 py-3 font-mono font-bold text-slate-800">{op.salesOrderId || op.id}</td>
                          <td className="px-4 py-3 font-bold text-slate-800">
                            {op.product}
                            {op.salesOrderClient && <span className="block text-[10px] text-slate-500 font-normal">Cliente: {op.salesOrderClient}</span>}
                          </td>
                          <td className="px-4 py-3 text-center font-mono font-bold text-purple-700">{op.qty} un</td>
                          <td className="px-4 py-3 text-center">
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              {op.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-slate-600">{op.supervisor}</td>
                          <td className="px-4 py-3 text-slate-600">{op.operator || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">Etapa Terceirizada de Pintura • Rastreabilidade completa</span>
              <div className="flex gap-2">
                <button
                  onClick={handlePrintPaintingReportModal}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Relatório
                </button>
                <button
                  onClick={() => setIsPaintingReportOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO DO RELATÓRIO DE PINTURA POR PERÍODO */}
      {mounted && isPrintingPaintingReport && createPortal(
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            #printable-painting-report-area { display: none; }
            @media print {
              body > *:not(#printable-painting-report-area) { display: none !important; }
              html, body { background: white !important; color: black !important; margin: 0 !important; padding: 0 !important; }
              #printable-painting-report-area { display: block !important; width: 100% !important; padding: 20px !important; background: white !important; color: black !important; }
            }
          `}} />
          <div id="printable-painting-report-area" className="text-slate-900 bg-white font-sans p-6">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5">
              <div className="flex items-start gap-4">
                {systemParams?.companyLogo && (
                  <div className="flex-shrink-0">
                    <img src={systemParams.companyLogo} alt="Logo" className="max-h-16 max-w-[140px] object-contain" />
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
                <div className="bg-purple-700 text-white font-bold px-2.5 py-1 text-[10px] uppercase tracking-wider inline-block rounded">
                  RELATÓRIO DE PINTURA TERCEIRIZADA
                </div>
                <p className="text-xs font-mono font-bold mt-1 text-slate-700">Período: {reportStartDate || 'Início'} até {reportEndDate || 'Atual'}</p>
                <p className="text-[10px] text-slate-500 font-mono">Impresso em: {new Date().toLocaleString('pt-BR')}</p>
              </div>
            </div>

            <div className="bg-slate-100 border border-slate-200 rounded p-3 my-4 text-[11px] grid grid-cols-3 gap-4">
              <div>
                <p className="text-slate-500 uppercase font-bold text-[9px]">Total de Ordens (OPs)</p>
                <p className="text-base font-black font-mono text-purple-700">{periodPaintingOrders.length} OPs</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[9px]">Volume Total de Peças</p>
                <p className="text-base font-black font-mono text-slate-900">{periodPaintingOrders.reduce((s, o) => s + o.qty, 0)} un</p>
              </div>
              <div>
                <p className="text-slate-500 uppercase font-bold text-[9px]">Status Filtrado</p>
                <p className="text-[10px] font-semibold text-slate-700 mt-1">{reportStatusFilter}</p>
              </div>
            </div>

            <div className="my-5">
              <table className="w-full text-[11px] text-left border-collapse border border-slate-300">
                <thead>
                  <tr className="border-b-2 border-slate-900 text-[10px] font-bold uppercase text-slate-700 bg-slate-100">
                    <th className="py-2 px-2 border border-slate-300 w-24">Data OP</th>
                    <th className="py-2 px-2 border border-slate-300 w-28">Nº Pedido / OP</th>
                    <th className="py-2 px-2 border border-slate-300">Produto / Equipamento</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-14">Qtd</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-24">Status</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-24">Supervisor</th>
                    <th className="py-2 px-2 border border-slate-300 text-center w-28">Assinatura / Visto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodPaintingOrders.map(op => (
                    <tr key={op.id} className="hover:bg-slate-50">
                      <td className="py-2.5 px-2 font-mono text-slate-600 border border-slate-300">{op.date || '—'}</td>
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-800 border border-slate-300">{op.salesOrderId || op.id}</td>
                      <td className="py-2.5 px-2 font-semibold text-slate-900 border border-slate-300">
                        {op.product}
                        {op.salesOrderClient && <span className="block text-[9px] text-slate-500 font-normal">Cliente: {op.salesOrderClient}</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-slate-800 border border-slate-300">{op.qty} un</td>
                      <td className="py-2.5 px-2 text-center text-slate-700 font-semibold border border-slate-300">{op.status}</td>
                      <td className="py-2.5 px-2 text-center text-slate-600 border border-slate-300">{op.supervisor}</td>
                      <td className="py-2.5 px-2 text-center border border-slate-300">
                        <div className="w-24 border-b border-slate-400 h-5 mx-auto"></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 mt-16 pt-6 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura da Empresa Terceirizada (Pintura)</p>
                <p className="font-mono mt-0.5">Recebimento e Conferência de Lote</p>
              </div>
              <div>
                <div className="border-t border-slate-400 w-48 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Aprovação do Controle de Qualidade Interno</p>
                <p className="font-mono mt-0.5">Liberação para Retorno</p>
              </div>
            </div>

            <div className="text-center text-[8px] text-slate-400 mt-12 pt-3 border-t border-slate-100 font-mono">
              {systemParams?.companyName || 'Estilo Coifas'} ERP • Relatório de Pintura Terceirizada por Período • Impresso em {new Date().toLocaleString('pt-BR')}
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
