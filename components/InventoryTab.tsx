'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  Plus, 
  PackageCheck, 
  Building, 
  Wrench, 
  CheckCircle, 
  Database, 
  FileText, 
  Download, 
  ArrowUpRight, 
  ArrowDownRight, 
  ClipboardList,
  User,
  Tags,
  SlidersHorizontal,
  ChevronRight,
  Info,
  Layers,
  Sparkles,
  X
} from 'lucide-react';
import { InventoryItem, UserAccess } from '../lib/types';
import { safeSetItem } from '../lib/utils';

interface InventoryTabProps {
  inventory: InventoryItem[];
  users?: UserAccess[];
  onUpdateStock: (sku: string, newQuantity: number) => void;
  isUpdateOpen: boolean;
  onCloseUpdate: () => void;
}

// Custom hook to highlight items whose stock is below 20% of max value
export function useLowStockHighlight(inventory: InventoryItem[]) {
  return useMemo(() => {
    const lowStockSkus = new Set<string>();
    const criticalItems = inventory.filter(item => {
      if (item.active === false) return false;
      const maxCap = item.max > 0 ? item.max : 100;
      const threshold = maxCap * 0.20; // < 20% of max
      if (item.stock < threshold) {
        lowStockSkus.add(item.sku);
        return true;
      }
      return false;
    });

    return {
      lowStockSkus,
      criticalItems,
      criticalCount: criticalItems.length
    };
  }, [inventory]);
}

export default function InventoryTab({
  inventory,
  users = [],
  onUpdateStock,
  isUpdateOpen,
  onCloseUpdate
}: InventoryTabProps) {
  // Navigation active tab
  const [activeSubTab, setActiveSubTab] = useState<'levels' | 'movements'>('levels');

  // List of registered collaborators for movement form
  const collaboratorsList = useMemo(() => {
    if (users && users.length > 0) {
      return users.map(u => ({
        name: u.name,
        role: u.role,
        label: `${u.name}${u.role ? ` (${u.role})` : ''}`
      }));
    }
    return [
      { name: 'Eduardo Fontes', role: 'Administrador', label: 'Eduardo Fontes (Administrador)' },
      { name: 'Roberto Carlos', role: 'Operador de Produção', label: 'Roberto Carlos (Operador de Produção)' },
      { name: 'Carlos Eduardo', role: 'Estoquista', label: 'Carlos Eduardo (Estoquista)' },
      { name: 'Ana Paula', role: 'Supervisora de Qualidade', label: 'Ana Paula (Supervisora de Qualidade)' },
      { name: 'Mariana Santos', role: 'Logística', label: 'Mariana Santos (Logística)' },
      { name: 'Fernanda Oliveira', role: 'Operadora', label: 'Fernanda Oliveira (Operadora)' }
    ];
  }, [users]);

  // Low stock hook (< 20% of max)
  const { lowStockSkus, criticalItems, criticalCount } = useLowStockHighlight(inventory);

  // Search & filter states for STOCK LEVELS tab
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Todos');
  const [showInactive, setShowInactive] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustType, setAdjustType] = useState<'add' | 'set'>('set');

  // Categories list
  const categories = useMemo(() => {
    return ['Todos', ...Array.from(new Set(inventory.map(item => item.category)))];
  }, [inventory]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchSearch = String(item.name || '').toLowerCase().includes(search.toLowerCase()) || 
                          String(item.sku || '').toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === 'Todos' || item.category === categoryFilter;
      const matchActive = showInactive || item.active !== false;
      return matchSearch && matchCategory && matchActive;
    });
  }, [inventory, search, categoryFilter, showInactive]);

  // Low stock warning alerts
  const lowStockItems = useMemo(() => {
    return inventory.filter(item => item.active !== false && item.stock <= item.max * 0.25);
  }, [inventory]);

  const activeEditingItem = editingItem || (isUpdateOpen && inventory.length > 0 ? inventory[0] : null);

  const handleOpenAdjust = (item: InventoryItem) => {
    setEditingItem(item);
    setAdjustAmount(item.stock.toString());
    setAdjustType('set');
  };

  const handleApplyAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    const currentItem = activeEditingItem;
    if (!currentItem) return;

    const currentVal = adjustAmount !== '' ? adjustAmount : currentItem.stock.toString();
    const amount = parseInt(currentVal) || 0;
    let finalQty = amount;
    if (adjustType === 'add') {
      finalQty = currentItem.stock + amount;
    }
    if (finalQty < 0) finalQty = 0;

    const diff = finalQty - currentItem.stock;
    if (diff !== 0) {
      const now = new Date();
      const formattedDate = now.toISOString().split('T')[0];
      const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const timeMs = now.getTime();

      const newMovement = {
        id: `MOV-${timeMs.toString().slice(-4)}`,
        sku: currentItem.sku,
        itemName: currentItem.name,
        type: diff > 0 ? 'ENTRADA' : 'SAÍDA',
        quantity: Math.abs(diff),
        date: formattedDate,
        time: formattedTime,
        collaboratorId: undefined,
        reason: 'Ajuste Manual de Balanço',
        previousStock: currentItem.stock,
        currentStock: finalQty
      };

      setMovements(prev => [newMovement, ...prev]);
    }
    
    onUpdateStock(currentItem.sku, finalQty);
    setEditingItem(null);
    setAdjustAmount('');
    onCloseUpdate();
  };

  // Helper to detect if an inventory item belongs to "INSUMO" (supplies)
  const isItemInsumo = (item: InventoryItem) => {
    return (
      item.stages?.includes('INSUMO') ||
      String(item.category || '').toLowerCase().includes('insumo') ||
      String(item.category || '').toLowerCase().includes('massa corrente') ||
      String(item.sku || '').startsWith('IN-')
    );
  };

  // LEDGER OF STOCK MOVEMENTS
  const [movements, setMovements] = useState<any[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('inventory_movements');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          // Fallback
        }
      }
    }
    return [
      {
        id: 'MOV-1001',
        sku: 'ST-2041',
        itemName: 'Eixo de Transmissão Principal',
        type: 'SAÍDA',
        quantity: 5,
        date: '2026-07-08',
        time: '14:25',
        collaboratorId: 'COL-8492',
        reason: 'Abastecimento de Produção',
        previousStock: 77,
        currentStock: 72
      },
      {
        id: 'MOV-1002',
        sku: 'ST-5091',
        itemName: 'Aço Laminado G-42 (Bobina)',
        type: 'ENTRADA',
        quantity: 10,
        date: '2026-07-09',
        time: '09:15',
        collaboratorId: undefined,
        reason: 'Recebimento de Compra',
        previousStock: 35,
        currentStock: 45
      },
      {
        id: 'MOV-1003',
        sku: 'ST-9012',
        itemName: 'Placa Servo Controladora C3',
        type: 'SAÍDA',
        quantity: 2,
        date: '2026-07-09',
        time: '16:40',
        collaboratorId: 'COL-5211',
        reason: 'Reposição em Linha B',
        previousStock: 17,
        currentStock: 15
      },
      {
        id: 'MOV-1004',
        sku: 'ST-4082',
        itemName: 'Sensor Indutivo de Presença IP67',
        type: 'ENTRADA',
        quantity: 25,
        date: '2026-07-10',
        time: '11:30',
        collaboratorId: undefined,
        reason: 'Recebimento de Compra',
        previousStock: 95,
        currentStock: 120
      }
    ];
  });

  // Save movements
  useEffect(() => {
    if (typeof window !== 'undefined') {
      safeSetItem('inventory_movements', JSON.stringify(movements));
    }
  }, [movements]);

  // MOVEMENT LAUNCH FORM STATES
  const [selectedSku, setSelectedSku] = useState('');
  const [movementType, setMovementType] = useState<'ENTRADA' | 'SAÍDA'>('ENTRADA');
  const [moveQuantity, setMoveQuantity] = useState('');
  const [collabId, setCollabId] = useState('');
  const [moveReason, setMoveReason] = useState('Abastecimento de Produção');
  const [customReason, setCustomReason] = useState('');
  const [filterInsumoOnly, setFilterInsumoOnly] = useState(true);

  // REPORT FILTERS STATES
  const [reportStartDate, setReportStartDate] = useState('2026-07-01');
  const [reportEndDate, setReportEndDate] = useState('2026-07-15');
  const [reportTypeFilter, setReportTypeFilter] = useState<'TODOS' | 'ENTRADA' | 'SAÍDA'>('TODOS');
  const [reportSkuFilter, setReportSkuFilter] = useState('Todos');
  const [reportCollabFilter, setReportCollabFilter] = useState('');

  // Sku selection items (filtered by category if requested)
  const selectableItems = useMemo(() => {
    const activeInventory = inventory.filter(item => item.active !== false);
    if (filterInsumoOnly) {
      return activeInventory.filter(item => isItemInsumo(item));
    }
    return activeInventory;
  }, [inventory, filterInsumoOnly]);

  // Handle confirming a stock movement
  const handleConfirmMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSku) {
      alert('Selecione um item do estoque!');
      return;
    }

    const item = inventory.find(i => i.sku === selectedSku);
    if (!item) {
      alert('Material não encontrado!');
      return;
    }

    // STRICT MANDATORY COLLABORATOR ID FOR "SAÍDA" (RETIRADA)
    if (movementType === 'SAÍDA' && !collabId.trim()) {
      alert('O ID do Colaborador é OBRIGATÓRIO para retiradas / saídas de materiais!');
      return;
    }

    const qty = parseInt(moveQuantity);
    if (isNaN(qty) || qty <= 0) {
      alert('A quantidade deve ser um número inteiro positivo!');
      return;
    }

    // Prevent overdrafts
    if (movementType === 'SAÍDA' && qty > item.stock) {
      alert(`Erro: Quantidade insuficiente em estoque. Saldo disponível: ${item.stock} unidades.`);
      return;
    }

    const previousStock = item.stock;
    const finalQty = previousStock + (movementType === 'ENTRADA' ? qty : -qty);

    const now = new Date();
    const formattedDate = now.toISOString().split('T')[0];
    const formattedTime = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    const newMovement = {
      id: `MOV-${Date.now().toString().slice(-4)}`,
      sku: item.sku,
      itemName: item.name,
      type: movementType,
      quantity: qty,
      date: formattedDate,
      time: formattedTime,
      collaboratorId: collabId.trim() || undefined,
      reason: moveReason === 'Outro' ? customReason.trim() || 'Ajuste manual' : moveReason,
      previousStock,
      currentStock: finalQty
    };

    // Update parent stock counts
    onUpdateStock(item.sku, finalQty);

    // Save movement to list
    setMovements(prev => [newMovement, ...prev]);

    // Reset fields
    setMoveQuantity('');
    setCollabId('');
    setCustomReason('');
    
    alert(`Sucesso! Lançamento de estoque efetuado. Novo saldo para ${item.name}: ${finalQty} un.`);
  };

  // Filter movements for the Period Report
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      const matchDate = m.date >= reportStartDate && m.date <= reportEndDate;
      const matchType = reportTypeFilter === 'TODOS' || m.type === reportTypeFilter;
      const matchSku = reportSkuFilter === 'Todos' || m.sku === reportSkuFilter;
      const matchCollab = !reportCollabFilter.trim() || (m.collaboratorId && m.collaboratorId.toLowerCase().includes(reportCollabFilter.toLowerCase()));
      return matchDate && matchType && matchSku && matchCollab;
    });
  }, [movements, reportStartDate, reportEndDate, reportTypeFilter, reportSkuFilter, reportCollabFilter]);

  // Report statistics
  const reportStats = useMemo(() => {
    let totalIn = 0;
    let totalOut = 0;
    filteredMovements.forEach(m => {
      if (m.type === 'ENTRADA') {
        totalIn += m.quantity;
      } else {
        totalOut += m.quantity;
      }
    });
    return {
      totalIn,
      totalOut,
      netChange: totalIn - totalOut,
      count: filteredMovements.length
    };
  }, [filteredMovements]);

  // Export report to CSV Spreadsheet
  const handleExportCSV = () => {
    if (filteredMovements.length === 0) {
      alert('Nenhuma movimentação encontrada para exportar no período selecionado.');
      return;
    }

    const headers = ['ID', 'Data', 'Hora', 'SKU', 'Material', 'Tipo', 'Quantidade', 'ID Colaborador', 'Motivo / Destino', 'Saldo Anterior', 'Saldo Atual'];
    const rows = filteredMovements.map(m => [
      m.id,
      m.date,
      m.time,
      m.sku,
      m.itemName,
      m.type,
      m.quantity,
      m.collaboratorId || 'N/A',
      m.reason,
      m.previousStock,
      m.currentStock
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' 
      + [headers.join(';'), ...rows.map(e => e.join(';'))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_movimentacao_${reportStartDate}_a_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 antialiased text-slate-800">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50/70 border border-indigo-100 rounded-full px-2.5 py-1 uppercase tracking-wider inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Almoxarifado Inteligente
          </span>
          <h2 id="inventory-control-heading" className="text-2xl font-extrabold text-slate-900 tracking-tight mt-1.5 flex items-center gap-2">
            Controle de Estoque & Suprimentos
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Gestão de níveis de insumos e matérias-primas com módulo de rastreabilidade integrada.</p>
        </div>
        
        {/* Navigation Tab Pills - Modern and lightweight */}
        <div className="bg-slate-50/80 p-1 rounded-xl flex items-center border border-slate-200/60 max-w-max">
          <button
            onClick={() => setActiveSubTab('levels')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'levels'
                ? 'bg-white text-indigo-600 shadow-[0_1px_4px_rgba(99,102,241,0.08)] border border-slate-100 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            Níveis de Estoque
          </button>
          <button
            onClick={() => setActiveSubTab('movements')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'movements'
                ? 'bg-white text-indigo-600 shadow-[0_1px_4px_rgba(99,102,241,0.08)] border border-slate-100 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
            Movimentação & Retiradas
          </button>
        </div>
      </div>

      {/* 2. SUB-TAB CONTENT 1: Levels of Stock */}
      {activeSubTab === 'levels' && (
        <>
          {/* Low stock critical banner - Sleeker design */}
          {criticalCount > 0 && (
            <div className="p-4 bg-red-50/80 border border-red-200/80 rounded-2xl flex items-start gap-3.5 animate-in slide-in-from-top duration-300 shadow-2xs">
              <div className="p-2 bg-red-100 text-red-700 rounded-lg flex-shrink-0">
                <AlertTriangle className="w-4 h-4 animate-pulse" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider flex items-center gap-1.5">
                  Aviso de Estoque Crítico (&lt; 20% do limite máximo)
                </h4>
                <p className="text-xs text-red-700 leading-relaxed">
                  Atenção: {criticalCount} {criticalCount === 1 ? 'item está' : 'itens estão'} com saldo inferior a 20% da capacidade e necessita(m) de reabastecimento imediato:
                  {criticalItems.map((item) => (
                    <span key={item.sku} className="inline-block bg-white border border-red-200 text-red-800 font-mono text-[10px] font-bold px-2 py-0.5 rounded-md ml-1.5 shadow-2xs">
                      {item.name} ({item.stock}/{item.max} {item.unit})
                    </span>
                  ))}
                </p>
              </div>
            </div>
          )}

          {/* Filtering and search row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-slate-100 p-4 rounded-2xl shadow-2xs">
            <div className="flex flex-wrap items-center gap-3.5 flex-1">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px] max-w-sm">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Pesquisar por SKU ou insumo..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full text-xs pl-9 pr-4 py-2 bg-slate-50/50 hover:bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/40 transition-all placeholder:text-slate-400"
                />
              </div>

              {/* Category selector */}
              <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50/50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <select 
                  value={categoryFilter} 
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="bg-transparent text-slate-700 focus:outline-none cursor-pointer font-medium text-xs"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>Categoria: {cat}</option>
                  ))}
                </select>
              </div>

              {/* Show inactive toggle */}
              <label className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50/50 border border-slate-200 px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer select-none">
                <input 
                  type="checkbox" 
                  checked={showInactive}
                  onChange={(e) => setShowInactive(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                />
                <span>Mostrar itens inativos</span>
              </label>
            </div>

            <div className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5 self-end sm:self-auto bg-indigo-50/30 border border-indigo-100/30 px-3 py-1.5 rounded-xl font-mono">
              <Building className="w-3.5 h-3.5 text-indigo-500" />
              <span>ALMOXARIFADO ALPHA</span>
            </div>
          </div>

          {/* Table Container - clean white shadow borderless layout */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.02)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/40 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                    <th className="px-6 py-4">SKU</th>
                    <th className="px-6 py-4">Item do Estoque</th>
                    <th className="px-6 py-4">Categoria</th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4">Proporção</th>
                    <th className="px-6 py-4">Saldo Físico</th>
                    <th className="px-6 py-4">Preço Médio</th>
                    <th className="px-6 py-4">Resp. Registro</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {filteredInventory.map((item) => {
                    const fillPercent = Math.min((item.stock / item.max) * 100, 100);
                    const isCriticalLow = lowStockSkus.has(item.sku);
                    const isLow = isCriticalLow || item.stock <= item.max * 0.25;
                    const isInsumo = isItemInsumo(item);

                    return (
                      <tr 
                        key={item.sku} 
                        className={`transition-colors ${
                          isCriticalLow 
                            ? 'bg-red-50/70 hover:bg-red-50/90 border-l-4 border-l-red-500' 
                            : 'hover:bg-indigo-50/10'
                        }`}
                      >
                        <td className="px-6 py-4 font-mono font-bold text-slate-500">
                          {isCriticalLow && (
                            <span title="Estoque abaixo de 20% do máximo!">
                              <AlertTriangle className="w-3.5 h-3.5 text-red-600 inline-block mr-1.5 animate-pulse" />
                            </span>
                          )}
                          {item.sku}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl overflow-hidden bg-slate-50 flex-shrink-0 relative border border-slate-100">
                              <img 
                                src={item.image} 
                                alt={item.name} 
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-semibold block text-[13px] ${isCriticalLow ? 'text-red-950 font-bold' : 'text-slate-800'}`}>
                                  {item.name}
                                </span>
                                {isCriticalLow && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-red-100 text-red-700 text-[9px] font-extrabold rounded uppercase tracking-wider border border-red-200">
                                    <AlertTriangle className="w-2.5 h-2.5 text-red-600" /> Crítico (&lt;20%)
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] font-mono text-slate-400">Escopo: {item.unit}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-0.5 bg-slate-50 border border-slate-200/60 text-slate-600 text-[10px] font-bold rounded-lg uppercase tracking-wide">
                            {item.category}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isInsumo ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold rounded-md shadow-3xs uppercase font-mono">
                              Insumo
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100/80 text-slate-500 border border-slate-200/50 text-[9px] font-bold rounded-md uppercase font-mono">
                              Produto
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 w-40">
                          <div className="space-y-1">
                            <div className="flex bg-slate-100 h-1.5 rounded-full overflow-hidden w-28">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${
                                  isCriticalLow ? 'bg-red-600' : isLow ? 'bg-amber-400' : 'bg-indigo-500'
                                }`}
                                style={{ width: `${fillPercent}%` }}
                              ></div>
                            </div>
                            <span className={`text-[10px] font-mono ${isCriticalLow ? 'text-red-600 font-bold' : 'text-slate-400'}`}>
                              {Math.round(fillPercent)}% da capacidade
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-baseline gap-1">
                            <span className={`text-[13px] font-bold ${isCriticalLow ? 'text-red-700 font-black' : isLow ? 'text-amber-600 font-black' : 'text-slate-800'}`}>
                              {item.stock}
                            </span>
                            <span className="text-[10px] text-slate-400">/ {item.max} {item.unit}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono font-medium text-slate-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </td>
                        <td className="px-6 py-4 font-mono">
                          <span className="inline-flex items-center gap-1 bg-slate-50 text-slate-600 border border-slate-150 px-2 py-0.5 rounded-lg text-[10px] font-bold">
                            👤 {item.operator || 'Eduardo Fontes'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button 
                            onClick={() => handleOpenAdjust(item)}
                            className="text-xs bg-slate-50 hover:bg-slate-100/80 text-slate-700 border border-slate-200/80 px-3 py-1.5 rounded-xl font-semibold transition-all shadow-3xs hover:shadow-2xs cursor-pointer inline-flex items-center gap-1"
                          >
                            <SlidersHorizontal className="w-3 h-3 text-slate-400" /> Ajustar
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {filteredInventory.length === 0 && (
              <div className="p-12 text-center text-slate-400 italic">
                Nenhum item localizado com os filtros selecionados.
              </div>
            )}
          </div>

          {/* Elegant Bento-style statistics summary cards at the bottom */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-all">
              <div className="p-3 bg-indigo-50/70 text-indigo-600 rounded-2xl border border-indigo-100/50">
                <PackageCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ocupação Física Total</h4>
                <p className="text-base font-extrabold text-slate-800 font-mono">62% ocupado</p>
                <div className="w-24 bg-slate-100 h-1 rounded-full overflow-hidden mt-1">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '62%' }}></div>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-all">
              <div className="p-3 bg-emerald-50/70 text-emerald-600 rounded-2xl border border-emerald-100/50">
                <CheckCircle className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Último Inventário Geral</h4>
                <p className="text-[13px] font-bold text-slate-800">Concluído em Conformidade</p>
                <p className="text-[10px] text-slate-400 font-mono">Data do censo: 15/06/2026</p>
              </div>
            </div>

            <div className="bg-white border border-slate-100 p-5 rounded-2xl shadow-3xs flex items-center gap-4 hover:shadow-2xs transition-all">
              <div className="p-3 bg-amber-50/70 text-amber-600 rounded-2xl border border-amber-100/50">
                <Wrench className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Custo Corrente de Armazenagem</h4>
                <p className="text-base font-extrabold text-slate-800 font-mono">R$ 14.520 / mês</p>
                <p className="text-[10px] text-slate-400">Diferença de depreciação estável</p>
              </div>
            </div>
          </div>
        </>
      )}

      {/* 3. SUB-TAB CONTENT 2: STOCK MOVEMENTS (NEW SECTION!) */}
      {activeSubTab === 'movements' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* COLUMN 1: REGISTER STOCK MOVEMENT (Sleeker design) */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Lançar Movimentação
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Registre entradas de novos insumos ou retiradas justificadas de materiais.
                </p>
              </div>

              <form onSubmit={handleConfirmMovement} className="space-y-4">
                {/* Select Category Filter Toggle */}
                <div className="flex items-center justify-between bg-slate-50/50 px-3 py-2 rounded-xl border border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Filtro de Exibição</span>
                  <label className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-700 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={filterInsumoOnly} 
                      onChange={(e) => {
                        setFilterInsumoOnly(e.target.checked);
                        setSelectedSku('');
                      }}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    Apenas Insumos
                  </label>
                </div>

                {/* Select Material */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item / Insumo *</label>
                  <select
                    value={selectedSku}
                    onChange={(e) => setSelectedSku(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-xl bg-slate-50/30 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all text-slate-700 font-medium cursor-pointer"
                  >
                    <option value="">Escolha o item...</option>
                    {selectableItems.map(item => (
                      <option key={item.sku} value={item.sku}>
                        {item.name} ({item.sku}) - Estoque: {item.stock} {item.unit}
                      </option>
                    ))}
                  </select>
                  {selectableItems.length === 0 && (
                    <p className="text-[9px] text-amber-600 font-medium italic">Nenhum insumo encontrado para esta listagem.</p>
                  )}
                </div>

                {/* Operation Type Switcher */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Ação Operacional *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMovementType('ENTRADA');
                        setMoveReason('Recebimento de Compra');
                      }}
                      className={`text-xs py-2 px-1 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        movementType === 'ENTRADA' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-2xs' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
                      (+) Entrada
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMovementType('SAÍDA');
                        setMoveReason('Abastecimento de Produção');
                      }}
                      className={`text-xs py-2 px-1 rounded-xl font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        movementType === 'SAÍDA' 
                          ? 'bg-rose-50 text-rose-750 border-rose-200 shadow-2xs' 
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
                      (-) Retirada / Baixa
                    </button>
                  </div>
                </div>

                {/* Quantity input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quantidade *</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Quantidade de unidades..."
                    value={moveQuantity}
                    onChange={(e) => setMoveQuantity(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-xl bg-slate-50/30 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500/30 transition-all font-mono font-semibold"
                  />
                </div>

                {/* COLLABORATOR ID (SELECT FROM REGISTERED COLLABORATORS) */}
                <div className={`space-y-1.5 animate-in slide-in-from-top duration-150 p-3 rounded-xl border ${movementType === 'SAÍDA' ? 'bg-rose-50/30 border-rose-100/50' : 'bg-slate-50/50 border-slate-100'}`}>
                  <label className={`block text-[10px] font-bold uppercase tracking-wider flex items-center justify-between ${movementType === 'SAÍDA' ? 'text-rose-800' : 'text-slate-500'}`}>
                    <span>Colaborador / Operador {movementType === 'SAÍDA' ? '*' : '(Opcional)'}</span>
                    {movementType === 'SAÍDA' && (
                      <span className="text-[8px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-md font-black">
                        OBRIGATÓRIO
                      </span>
                    )}
                  </label>
                  <select
                    value={collabId}
                    onChange={(e) => setCollabId(e.target.value)}
                    required={movementType === 'SAÍDA'}
                    className={`w-full text-xs border px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 font-bold cursor-pointer ${
                      movementType === 'SAÍDA'
                        ? 'border-rose-200 focus:ring-rose-500/10 text-slate-800'
                        : 'border-slate-200 focus:ring-indigo-500/10 text-slate-700'
                    }`}
                  >
                    <option value="">Selecione o colaborador cadastrado...</option>
                    {collaboratorsList.map(c => (
                      <option key={c.name} value={c.name}>{c.label}</option>
                    ))}
                    {collabId && !collaboratorsList.some(c => c.name === collabId) && (
                      <option value={collabId}>{collabId}</option>
                    )}
                  </select>
                  <p className={`text-[9px] font-medium leading-tight ${movementType === 'SAÍDA' ? 'text-rose-500' : 'text-slate-400'}`}>
                    {movementType === 'SAÍDA'
                      ? 'Selecione o funcionário cadastrado responsável pela retirada para o relatório de auditoria.'
                      : 'Selecione o funcionário cadastrado responsável pelo lançamento.'
                    }
                  </p>
                </div>

                {/* Reason Selection */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Finalidade / Motivo *</label>
                  <select
                    value={moveReason}
                    onChange={(e) => setMoveReason(e.target.value)}
                    required
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-xl bg-slate-50/30 hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-700 font-medium cursor-pointer"
                  >
                    {movementType === 'ENTRADA' ? (
                      <>
                        <option value="Recebimento de Compra">Recebimento de Compra</option>
                        <option value="Ajuste de Saldo">Ajuste de Saldo / Inventário</option>
                        <option value="Devolução de Linha">Devolução da Produção</option>
                        <option value="Outro">Outro Motivo</option>
                      </>
                    ) : (
                      <>
                        <option value="Abastecimento de Produção">Abastecimento de Produção</option>
                        <option value="Reposição em Linha A">Reposição - Linha A</option>
                        <option value="Reposição em Linha B">Reposição - Linha B</option>
                        <option value="Perda ou Descarte de Insumo">Descarte ou Perda de Insumo</option>
                        <option value="Outro">Outro Motivo</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Custom Reason */}
                {moveReason === 'Outro' && (
                  <div className="space-y-1 animate-in slide-in-from-top duration-150">
                    <label className="block text-[10px] font-bold text-slate-500 uppercase">Especifique a Justificativa *</label>
                    <input
                      type="text"
                      placeholder="Descreva brevemente..."
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      required={moveReason === 'Outro'}
                      className="w-full text-xs border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 text-slate-700 font-medium"
                    />
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full text-xs py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-2xs hover:shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Confirmar Lançamento
                </button>
              </form>
            </div>

            {/* COLUMN 2: PERIOD REPORT AND LOG TABLES (Light, clean, functional dashboard) */}
            <div className="lg:col-span-2 bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
              
              {/* Report Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                    <FileText className="w-4 h-4 text-indigo-500" />
                    Auditoria de Movimentação do Período
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">Filtragem temporal e exportação analítica de fluxo de materiais.</p>
                </div>

                <button
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-white text-[11px] font-bold rounded-xl transition-all cursor-pointer shadow-3xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  Exportar (CSV)
                </button>
              </div>

              {/* Filters Panel - Clean Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50/50 p-3 rounded-2xl border border-slate-100/70">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Período De</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Até</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1 font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 bg-white"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Operação</label>
                  <select
                    value={reportTypeFilter}
                    onChange={(e) => setReportTypeFilter(e.target.value as any)}
                    className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 bg-white font-medium cursor-pointer"
                  >
                    <option value="TODOS">Todas</option>
                    <option value="ENTRADA">Entrada / Acréscimo</option>
                    <option value="SAÍDA">Saída / Retirada</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Insumo</label>
                  <select
                    value={reportSkuFilter}
                    onChange={(e) => setReportSkuFilter(e.target.value)}
                    className="w-full text-[11px] border border-slate-200 rounded-lg px-2 py-1.5 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 bg-white font-medium cursor-pointer"
                  >
                    <option value="Todos">Todos os itens</option>
                    {inventory.filter(item => item.active !== false).map(item => (
                      <option key={item.sku} value={item.sku}>{item.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Collaborator search ID */}
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por ID de Colaborador (Ex: COL-8492)..."
                  value={reportCollabFilter}
                  onChange={(e) => setReportCollabFilter(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/10 bg-slate-50/40 text-slate-750 placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Report Metrics Dashboard Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-emerald-50/20 border border-emerald-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block font-mono">Entradas</span>
                  <strong className="text-lg font-extrabold text-emerald-700 font-mono block mt-0.5">+{reportStats.totalIn}</strong>
                </div>
                <div className="bg-rose-50/20 border border-rose-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-rose-750 uppercase tracking-wider block font-mono">Retiradas</span>
                  <strong className="text-lg font-extrabold text-rose-750 font-mono block mt-0.5">-{reportStats.totalOut}</strong>
                </div>
                <div className="bg-slate-50 border border-slate-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Fluxo Líquido</span>
                  <strong className={`text-lg font-black font-mono block mt-0.5 ${reportStats.netChange >= 0 ? 'text-emerald-750' : 'text-rose-750'}`}>
                    {reportStats.netChange >= 0 ? '+' : ''}{reportStats.netChange}
                  </strong>
                </div>
                <div className="bg-indigo-50/20 border border-indigo-100 p-3 rounded-2xl text-center">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block font-mono">Ocorrências</span>
                  <strong className="text-lg font-extrabold text-indigo-700 font-mono block mt-0.5">{reportStats.count}</strong>
                </div>
              </div>

              {/* Ledger Table */}
              <div className="border border-slate-100 rounded-2xl overflow-hidden bg-white">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/30 border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                        <th className="px-4 py-3">Código / Data</th>
                        <th className="px-4 py-3">Insumo Referente</th>
                        <th className="px-4 py-3">Ação</th>
                        <th className="px-4 py-3 text-right">Qtd</th>
                        <th className="px-4 py-3 text-center">Colaborador</th>
                        <th className="px-4 py-3">Justificativa</th>
                        <th className="px-4 py-3 text-right">Saldos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 text-[11px] text-slate-600">
                      {filteredMovements.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-10 text-center text-slate-400 italic font-medium">
                            Nenhuma movimentação localizada para os filtros e data selecionados.
                          </td>
                        </tr>
                      ) : (
                        filteredMovements.map((m) => {
                          const isWithdrawal = m.type === 'SAÍDA';

                          return (
                            <tr key={m.id} className="hover:bg-slate-50/20 transition-colors">
                              <td className="px-4 py-3 whitespace-nowrap">
                                <span className="font-bold text-slate-800 font-mono">{m.id}</span>
                                <span className="block text-[9px] text-slate-400 font-mono mt-0.5">
                                  {m.date.split('-').reverse().join('/')} {m.time}
                                </span>
                              </td>
                              <td className="px-4 py-3">
                                <div className="text-slate-800 font-semibold truncate max-w-[140px]">{m.itemName}</div>
                                <span className="text-[9px] font-mono text-slate-400 block">{m.sku}</span>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap">
                                {isWithdrawal ? (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-rose-50 text-rose-750 border border-rose-100 text-[9px] font-extrabold rounded-md font-mono">
                                    <ArrowDownRight className="w-2.5 h-2.5 text-rose-500" />
                                    RETIRADA
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-extrabold rounded-md font-mono">
                                    <ArrowUpRight className="w-2.5 h-2.5 text-emerald-500" />
                                    ENTRADA
                                  </span>
                                )}
                              </td>
                              <td className={`px-4 py-3 text-right font-mono font-bold text-[13px] ${
                                isWithdrawal ? 'text-rose-600' : 'text-emerald-600'
                              }`}>
                                {isWithdrawal ? '-' : '+'}{m.quantity}
                              </td>
                              <td className="px-4 py-3 text-center whitespace-nowrap">
                                {m.collaboratorId ? (
                                  <span className="inline-flex items-center gap-1 bg-slate-900 text-slate-50 font-mono text-[9px] font-extrabold px-2 py-0.5 rounded-lg shadow-3xs border border-slate-800">
                                    <User className="w-2.5 h-2.5 text-slate-300" /> {m.collaboratorId}
                                  </span>
                                ) : (
                                  <span className="text-slate-350 font-mono italic">Automático</span>
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500 font-medium leading-normal max-w-[150px] truncate" title={m.reason}>
                                {m.reason}
                              </td>
                              <td className="px-4 py-3 text-right font-mono text-[10px] text-slate-400 whitespace-nowrap">
                                <div className="text-[9px]">Anterior: {m.previousStock}</div>
                                <div className="font-bold text-slate-700">Atual: {m.currentStock}</div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Informational footer bar */}
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-start gap-2.5 text-[10px] text-slate-400 leading-normal">
                <Info className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
                <p>
                  As retiradas registradas alimentam diretamente o relatório de conformidade de período. Divergências físicas devem ser reportadas à gerência industrial com a devida assinatura do colaborador responsável.
                </p>
              </div>

            </div>

          </div>
        </div>
      )}

      {/* 4. STOCK ADJUSTMENT MODAL DIALOG */}
      {(activeEditingItem || isUpdateOpen) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full max-h-[85vh] flex flex-col p-5 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3.5 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl border border-indigo-100">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">Ajustar Nível de Estoque</h3>
                  <p className="text-xs text-slate-400 mt-0.5">Ajuste direto do saldo físico em almoxarifado</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingItem(null);
                  onCloseUpdate();
                }}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form Container with internal scroll */}
            <form onSubmit={handleApplyAdjustment} className="flex flex-col min-h-0 flex-1 pt-3">
              <div className="overflow-y-auto pr-2 space-y-3.5 flex-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_#f1f5f9] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-track]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb:hover]:bg-slate-400">
                {/* Select Item */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Item Selecionado *</label>
                  <select
                    value={activeEditingItem?.sku || ''}
                    onChange={(e) => {
                      const found = inventory.find(i => i.sku === e.target.value);
                      if (found) {
                        setEditingItem(found);
                        setAdjustAmount(found.stock.toString());
                      }
                    }}
                    className="w-full text-xs border border-slate-200 px-3 py-2 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-800 cursor-pointer"
                  >
                    {inventory.map(item => (
                      <option key={item.sku} value={item.sku}>
                        {item.name} ({item.sku}) - Atual: {item.stock} {item.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {activeEditingItem && (
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-150 flex justify-between items-center text-xs font-mono">
                    <div>
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Saldo Físico Atual</span>
                      <span className="font-extrabold text-slate-800 text-sm">{activeEditingItem.stock} {activeEditingItem.unit}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px] uppercase font-bold">Capacidade Máxima</span>
                      <span className="font-bold text-slate-600">{activeEditingItem.max} {activeEditingItem.unit}</span>
                    </div>
                  </div>
                )}

                {/* Adjustment Mode */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Tipo de Operação *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setAdjustType('set')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        adjustType === 'set'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Definir Novo Saldo
                    </button>
                    <button
                      type="button"
                      onClick={() => setAdjustType('add')}
                      className={`py-2 px-3 rounded-xl text-xs font-bold transition-all border text-center cursor-pointer ${
                        adjustType === 'add'
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-3xs'
                          : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Adicionar ao Saldo
                    </button>
                  </div>
                </div>

                {/* Amount Input */}
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    {adjustType === 'set' ? 'Novo Valor Total de Estoque *' : 'Quantidade a Adicionar / Subtrair (+ / -) *'}
                  </label>
                  <input
                    type="number"
                    value={adjustAmount !== '' ? adjustAmount : (activeEditingItem?.stock.toString() || '')}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    placeholder={adjustType === 'set' ? 'Ex: 50' : 'Ex: 10 ou -5'}
                    required
                    className="w-full text-sm border border-slate-200 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-slate-800 bg-white"
                  />
                </div>

                {/* Preview of resultant stock */}
                {activeEditingItem && (
                  <div className="p-2.5 bg-indigo-50/50 border border-indigo-100 rounded-xl flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-600">Novo Saldo Resultante:</span>
                    <span className="font-extrabold font-mono text-indigo-700 text-sm">
                      {(() => {
                        const valStr = adjustAmount !== '' ? adjustAmount : activeEditingItem.stock.toString();
                        const amount = parseInt(valStr) || 0;
                        let finalQty = amount;
                        if (adjustType === 'add') {
                          finalQty = activeEditingItem.stock + amount;
                        }
                        return Math.max(0, finalQty);
                      })()} {activeEditingItem.unit}
                    </span>
                  </div>
                )}
              </div>

              {/* Modal Actions - Pinned at bottom */}
              <div className="flex gap-2 justify-end pt-3 mt-3 border-t border-slate-100 flex-shrink-0 bg-white">
                <button
                  type="button"
                  onClick={() => {
                    setEditingItem(null);
                    onCloseUpdate();
                  }}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-md hover:shadow-lg flex items-center gap-1.5"
                >
                  <CheckCircle className="w-4 h-4" />
                  Salvar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
