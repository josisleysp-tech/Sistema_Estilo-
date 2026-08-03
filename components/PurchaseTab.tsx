'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  ChevronRight, 
  ChevronLeft, 
  DollarSign, 
  Truck, 
  UserCheck, 
  ShoppingBag,
  Inbox
} from 'lucide-react';
import { PurchaseOrder, Supplier } from '../lib/types';

interface PurchaseTabProps {
  purchaseOrders: PurchaseOrder[];
  suppliers?: Supplier[];
  onAddPurchaseOrder: (order: Omit<PurchaseOrder, 'id'>) => void;
  onUpdatePurchaseStatus: (id: string, newStatus: PurchaseOrder['status']) => void;
}

const PURCHASE_STAGES: PurchaseOrder['status'][] = [
  'Rascunho',
  'Aguardando Aprovação',
  'Enviado ao Fornecedor',
  'Recebido Parcial',
  'Concluído'
];

export default function PurchaseTab({
  purchaseOrders,
  suppliers,
  onAddPurchaseOrder,
  onUpdatePurchaseStatus
}: PurchaseTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState('Metalúrgica Alfa');
  const [newValue, setNewValue] = useState('');

  const handleCreatePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier || !newValue) return;

    onAddPurchaseOrder({
      supplier: newSupplier,
      value: parseFloat(newValue) || 0,
      status: 'Rascunho',
      date: new Date().toISOString().split('T')[0]
    });

    setNewSupplier('Metalúrgica Alfa');
    setNewValue('');
    setIsAddOpen(false);
  };

  const movePurchaseCard = (id: string, direction: 'left' | 'right', currentStatus: PurchaseOrder['status']) => {
    const currentIndex = PURCHASE_STAGES.indexOf(currentStatus);
    if (direction === 'left' && currentIndex > 0) {
      onUpdatePurchaseStatus(id, PURCHASE_STAGES[currentIndex - 1]);
    } else if (direction === 'right' && currentIndex < PURCHASE_STAGES.length - 1) {
      onUpdatePurchaseStatus(id, PURCHASE_STAGES[currentIndex + 1]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="purchase-panel-heading" className="text-xl font-bold text-slate-800 tracking-tight">Ordens de Compra & Suprimentos</h2>
          <p className="text-xs text-slate-500 mt-1">Gestão de aquisições de insumos por fornecedor homologado</p>
        </div>
        <button 
          onClick={() => setIsAddOpen(!isAddOpen)}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-lg font-medium shadow transition-colors self-start"
        >
          <Plus className="w-4 h-4" />
          Nova Solicitação de Compra
        </button>
      </div>

      {/* Add purchase order drawer layout */}
      {isAddOpen && (
        <form onSubmit={handleCreatePurchase} className="bg-white border border-indigo-100 rounded-xl p-5 shadow-[0_4px_12px_rgba(79,70,229,0.05)] space-y-4 animate-in fade-in duration-200">
          <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Abertura de Compra de Insumos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Fornecedor Destinatário</label>
              <select 
                value={newSupplier} 
                onChange={(e) => setNewSupplier(e.target.value)} 
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none font-medium text-slate-700"
              >
                {suppliers && suppliers.length > 0 ? (
                  suppliers.map(s => (
                    <option key={s.id} value={s.name}>
                      {s.name} ({s.category})
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Metalúrgica Alfa S.A.">Metalúrgica Alfa S.A.</option>
                    <option value="Eletrônicos China Import Ltda">Eletrônicos China Import Ltd.</option>
                    <option value="Usiminas Chapas Industriais">Usiminas Chapas Industriais</option>
                    <option value="Siemens Brasil S.A.">Siemens Brasil S.A.</option>
                  </>
                )}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor Bruto do Contrato (R$)</label>
              <input 
                type="number" 
                value={newValue} 
                onChange={(e) => setNewValue(e.target.value)} 
                required 
                placeholder="Ex: 54000"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button 
              type="button" 
              onClick={() => setIsAddOpen(false)}
              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium"
            >
              Emitir Ordem Rascunho
            </button>
          </div>
        </form>
      )}

      {/* Kanban Board Grid columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 items-start">
        {PURCHASE_STAGES.map((stage) => {
          const ordersInStage = purchaseOrders.filter(o => o.status === stage);
          return (
            <div key={stage} className="bg-slate-50 border border-slate-200/60 rounded-xl p-3 min-h-[420px] flex flex-col">
              {/* Header column */}
              <div className="flex items-center justify-between mb-3 border-b border-slate-200/50 pb-2">
                <div className="flex items-center gap-1.5 truncate">
                  <span className={`w-2 h-2 rounded-full ${
                    stage === 'Rascunho' ? 'bg-slate-400' :
                    stage === 'Aguardando Aprovação' ? 'bg-amber-400' :
                    stage === 'Enviado ao Fornecedor' ? 'bg-blue-500' :
                    stage === 'Recebido Parcial' ? 'bg-indigo-500' :
                    'bg-emerald-500'
                  }`}></span>
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider truncate" title={stage}>{stage}</span>
                </div>
                <span className="px-1.5 py-0.5 bg-slate-200/60 text-slate-600 font-mono text-[9px] rounded-full">
                  {ordersInStage.length}
                </span>
              </div>

              {/* Cards columns list */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[500px]">
                {ordersInStage.length === 0 ? (
                  <div className="text-center py-12 text-[10px] text-slate-400 font-medium">
                    Sem pedidos.
                  </div>
                ) : (
                  ordersInStage.map((o) => {
                    return (
                      <div 
                        key={o.id} 
                        className="bg-white border border-slate-200 rounded-xl p-3 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:shadow-md transition-all"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-[10px] font-mono font-bold text-slate-400">{o.id}</span>
                          <span className="text-[9px] text-slate-400 font-mono">{o.date}</span>
                        </div>

                        <h4 className="text-xs font-bold text-slate-800 leading-tight mb-2">{o.supplier}</h4>
                        
                        <div className="flex items-center gap-1 text-xs font-semibold text-slate-700 font-sans mb-3">
                          <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                          <span>{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(o.value)}</span>
                        </div>

                        <div className="text-[9px] text-indigo-600 font-bold font-mono mb-2">
                          👤 Op: {o.operator || 'Eduardo Fontes'}
                        </div>

                        <div className="flex justify-between items-center border-t border-slate-100 pt-2 text-[10px] text-slate-400">
                          <span>Ações de Estado</span>
                          <div className="flex gap-0.5 border border-slate-100 rounded bg-slate-50 p-0.5">
                            <button 
                              onClick={() => movePurchaseCard(o.id, 'left', o.status)}
                              disabled={stage === 'Rascunho'}
                              className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-40 rounded"
                            >
                              <ChevronLeft className="w-3 h-3" />
                            </button>
                            <button 
                              onClick={() => movePurchaseCard(o.id, 'right', o.status)}
                              disabled={stage === 'Concluído'}
                              className="p-0.5 hover:bg-white text-slate-400 hover:text-indigo-600 disabled:opacity-40 rounded"
                            >
                              <ChevronRight className="w-3 h-3" />
                            </button>
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

      {/* Policy procurement advice banner */}
      <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center gap-3">
        <Inbox className="w-5 h-5 text-slate-400" />
        <div>
          <h4 className="text-xs font-bold text-slate-700 uppercase">Política de Compras Industriais</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Pedidos criados entram como Rascunho. O fluxo exige aprovação da diretoria para faturamento, seguido por rastreamento logístico até o recebimento parcial ou conclusão no almoxarifado principal.
          </p>
        </div>
      </div>
    </div>
  );
}
