'use client';

import React, { useState, useMemo } from 'react';
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
  FileText, 
  Printer,
  CheckCircle,
  FileCheck
} from 'lucide-react';
import { SalesOrder, ProductionOrder } from '../lib/types';

interface BudgetQueryTabProps {
  salesOrders: SalesOrder[];
  productionOrders: ProductionOrder[];
  onUpdateStatus: (id: string, newStatus: SalesOrder['status']) => void;
  onUpdatePaymentMethod: (id: string, newPaymentMethod: string) => void;
  hideOrderValues?: boolean;
  systemParams?: any;
}

export default function BudgetQueryTab({ 
  salesOrders, 
  productionOrders,
  onUpdateStatus,
  onUpdatePaymentMethod, 
  hideOrderValues = false,
  systemParams
}: BudgetQueryTabProps) {
  // Filters state
  const [clientSearch, setClientSearch] = useState('');
  const [orderIdSearch, setOrderIdSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');

  // Selected budget for detailed modal
  const [selectedOrder, setSelectedOrder] = useState<SalesOrder | null>(null);
  const [printOrder, setPrintOrder] = useState<SalesOrder | null>(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Clear all search fields
  const handleClearFilters = () => {
    setClientSearch('');
    setOrderIdSearch('');
    setProductSearch('');
    setCurrentPage(1);
  };

  // Only consider orders that are Budgets (status === 'Orçamento')
  const budgetsOnly = useMemo(() => {
    return salesOrders.filter(order => order.status === 'Orçamento');
  }, [salesOrders]);

  // Filtering logic
  const filteredBudgets = useMemo(() => {
    return budgetsOnly.filter(order => {
      // 1. Client filter
      const matchesClient = clientSearch.trim() === '' || 
        order.client.toLowerCase().includes(clientSearch.toLowerCase());

      // 2. Order number / ID filter
      const matchesId = orderIdSearch.trim() === '' || 
        order.id.toLowerCase().includes(orderIdSearch.toLowerCase());

      // 3. Product filter
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
  }, [budgetsOnly, clientSearch, orderIdSearch, productSearch]);

  // Paginated budgets
  const totalPages = Math.ceil(filteredBudgets.length / itemsPerPage);
  const paginatedBudgets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBudgets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBudgets, currentPage]);

  // KPIs based on budgets list
  const stats = useMemo(() => {
    const totalCount = filteredBudgets.length;
    const totalSum = filteredBudgets.reduce((sum, order) => sum + order.value, 0);
    const avgValue = totalCount > 0 ? totalSum / totalCount : 0;
    return { totalCount, totalSum, avgValue };
  }, [filteredBudgets]);

  const handlePrint = (order: SalesOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleApproveBudget = (id: string) => {
    onUpdateStatus(id, 'Pendente');
    alert(`Orçamento ${id} foi aprovado com sucesso e convertido em Pedido de Venda ativo!`);
    if (selectedOrder?.id === id) {
      setSelectedOrder(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 id="budget-query-heading" className="text-xl font-bold text-slate-800 tracking-tight">Consulta de Orçamentos</h2>
        <p className="text-xs text-slate-500 mt-1">Gestão, busca avançada e aprovação de cotações e orçamentos em aberto com clientes homologados</p>
      </div>

      {/* Query Filters Card */}
      <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-pink-600" />
            <span className="text-xs font-bold uppercase text-slate-700 tracking-wider">Filtros de Orçamentos</span>
          </div>
          {(clientSearch || orderIdSearch || productSearch) && (
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Query by Client */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Buscar por Cliente</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={clientSearch}
                onChange={(e) => { setClientSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: Gerdau, WEG..." 
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>

          {/* Query by Order Number */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Cód. do Orçamento</label>
            <div className="relative">
              <Hash className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                value={orderIdSearch}
                onChange={(e) => { setOrderIdSearch(e.target.value); setCurrentPage(1); }}
                placeholder="Ex: VD-1092" 
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 font-mono"
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
                placeholder="Ex: Eixo, Sensor..." 
                className="w-full text-xs pl-9 pr-3 py-2 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Query Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Orçamentos Ativos</p>
          <p className="text-lg font-black text-slate-800 mt-0.5">{stats.totalCount}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Soma dos Orçamentos</p>
          <p className="text-lg font-black text-pink-600 mt-0.5 font-mono">
            {hideOrderValues ? (
              <span className="text-slate-300 font-sans tracking-widest text-sm bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 font-bold">R$ •••••</span>
            ) : (
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.totalSum)
            )}
          </p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Média por Proposta</p>
          <p className="text-lg font-black text-indigo-600 mt-0.5 font-mono">
            {hideOrderValues ? (
              <span className="text-slate-300 font-sans tracking-widest text-sm bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 font-bold">R$ •••••</span>
            ) : (
              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(stats.avgValue)
            )}
          </p>
        </div>
      </div>

      {/* Query Results Table */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Cotações e Orçamentos Registrados</h3>
          <span className="text-[10px] text-slate-400 font-mono">Mostrando {filteredBudgets.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3">Código</th>
                <th className="px-5 py-3">Cliente / Razão Social</th>
                <th className="px-5 py-3">Elaborado por</th>
                <th className="px-5 py-3">Data Proposta</th>
                <th className="px-5 py-3">Forma Pagamento</th>
                <th className="px-5 py-3">Itens Descritivos</th>
                <th className="px-5 py-3">Valor Estimado</th>
                <th className="px-5 py-3">Estado</th>
                <th className="px-5 py-3 text-right">Ações de Venda</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedBudgets.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-12 text-slate-400">
                    <p className="font-semibold text-sm">Nenhum orçamento em aberto encontrado.</p>
                    <p className="text-[11px] mt-1 text-slate-400/80">Use o Formulário de Pedido de Venda para criar novos orçamentos.</p>
                  </td>
                </tr>
              ) : (
                paginatedBudgets.map((order) => {
                  const payment = order.paymentMethod || 'Faturamento Convencional';
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-mono">
                        <div className="font-bold text-slate-700">{order.id}</div>
                        {order.serialNumber && (
                          <div className="text-[10px] text-slate-400 font-medium whitespace-nowrap">Nº {order.serialNumber}</div>
                        )}
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-800">{order.client}</td>
                      <td className="px-5 py-4 font-mono text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-pink-50 text-pink-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          👤 {order.operator || 'Eduardo Fontes'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500">{order.date}</td>
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
                        <div>
                          {hideOrderValues ? (
                            <span className="text-slate-300 font-sans tracking-widest text-[11px] bg-slate-50 border border-slate-100 rounded px-1.5 py-0.5 w-max">R$ •••••</span>
                          ) : (
                            <span className={order.discountPercentage ? "text-emerald-600" : "text-slate-800"}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-50 text-pink-700 border border-pink-200">
                          <span className="w-1 h-1 rounded-full bg-pink-500"></span>
                          Orçamento
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(order)}
                            className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 px-2.5 py-1.5 rounded-md font-medium text-[11px] transition-all"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Visualizar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproveBudget(order.id)}
                            className="inline-flex items-center gap-1 bg-emerald-550 hover:bg-emerald-600 text-white px-2.5 py-1.5 rounded-md font-bold text-[11px] transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Aprovar
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

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>Mostrando {paginatedBudgets.length} de {filteredBudgets.length} orçamentos</span>
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
                    currentPage === page ? 'bg-pink-600 border-pink-600 text-white font-medium' : 'border-slate-200 bg-white hover:bg-slate-50'
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
      </div>

      {/* Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-pink-600 rounded-lg">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Ficha Técnica de Orçamento</h3>
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

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 border border-slate-100 rounded-xl">
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Cliente</span>
                  <p className="font-bold text-slate-800">{selectedOrder.client}</p>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Operador</span>
                  <p className="font-bold text-pink-700">👤 {selectedOrder.operator || 'Eduardo Fontes'}</p>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Lançamento</span>
                  <p className="font-mono text-slate-600 font-semibold">{selectedOrder.date}</p>
                </div>
                <div>
                  <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Forma Pagamento</span>
                  <p className="font-bold text-slate-800">{selectedOrder.paymentMethod || 'PIX'}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[9px]">Especificações dos Produtos</h4>
                <div className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50 p-4">
                  <p className="text-slate-700 font-medium text-xs leading-relaxed font-mono">
                    {selectedOrder.items}
                  </p>
                </div>
              </div>

              {selectedOrder.notes && (
                <div>
                  <h4 className="font-bold text-slate-700 mb-2 uppercase tracking-wide text-[9px]">Observação do Cliente / Instruções</h4>
                  <div className="border border-amber-100/80 rounded-xl overflow-hidden bg-amber-50/40 p-4">
                    <p className="text-slate-700 font-medium text-xs leading-relaxed whitespace-pre-wrap">
                      {selectedOrder.notes}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center p-4 border border-pink-100 bg-pink-50/20 rounded-xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Valor Estimado com Descontos</span>
                  <p className="text-xl font-black text-pink-600 font-mono mt-0.5">
                    {hideOrderValues ? 'R$ •••••' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedOrder.value)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrint(selectedOrder)}
                    className="inline-flex items-center gap-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-lg font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <Printer className="w-4 h-4 text-slate-400" />
                    Imprimir Proposta
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApproveBudget(selectedOrder.id)}
                    className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-3.5 py-2 rounded-lg font-bold shadow-xs cursor-pointer transition-all"
                  >
                    <FileCheck className="w-4 h-4 text-white" />
                    Aprovar Orçamento
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ÁREA DE IMPRESSÃO DO ORÇAMENTO (HIDDEN POR PADRÃO, APENAS ATIVADO NO PRINT) */}
      {printOrder && (
        <>
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              /* Oculta tudo na tela mantendo a árvore DOM acessível para os filhos */
              body * {
                visibility: hidden !important;
              }
              /* Garante que o recibo e todos os seus filhos sejam visíveis */
              #printable-receipt-area, #printable-receipt-area * {
                visibility: visible !important;
              }
              html, body {
                background: white !important;
                color: black !important;
                height: auto !important;
                overflow: visible !important;
              }
              /* Exibe apenas o recibo de impressão */
              #printable-receipt-area {
                display: block !important;
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                padding: 10px !important;
                background: white !important;
                color: black !important;
                z-index: 99999 !important;
              }
            }
          `}} />
          
          <div id="printable-receipt-area" className="hidden text-slate-900 bg-white font-sans">
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
                <div className="bg-pink-600 text-white font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider inline-block">
                  PROPOSTA DE ORÇAMENTO
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
                <p className="text-slate-500 mt-0.5">Previsão de Validade: <span className="font-mono font-bold text-slate-700">10 dias úteis</span></p>
              </div>
              <div className="text-right">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsável & Operação</h3>
                <p className="text-slate-700">Operador Emissor: <span className="font-bold text-pink-700">👤 {printOrder.operator || 'Eduardo Fontes'}</span></p>
                <p className="text-slate-500 mt-0.5">Condição de Pagamento: <span className="font-semibold text-slate-700">{printOrder.paymentMethod || 'A combinar / PIX'}</span></p>
                <p className="text-slate-500">Status da Proposta: <span className="font-bold text-slate-800">ORÇAMENTO</span></p>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="my-5">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Grade de Itens do Orçamento</h3>
              <table className="w-full text-[11px] text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-900 text-[9px] font-bold uppercase text-slate-500 bg-slate-50">
                    <th className="py-1.5 px-2">SKU</th>
                    <th className="py-1.5 px-2">Descrição do Item</th>
                    <th className="py-1.5 px-2 text-center">Un.</th>
                    <th className="py-1.5 px-2 text-center">Qtd.</th>
                    <th className="py-1.5 px-2 text-right">Valor Unitário</th>
                    <th className="py-1.5 px-2 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printOrder.products && printOrder.products.length > 0 ? (
                    printOrder.products.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-2 font-mono font-bold text-slate-600">{item.sku}</td>
                        <td className="py-2 px-2 font-semibold text-slate-800">{item.name}</td>
                        <td className="py-2 px-2 text-center font-mono text-slate-500">{item.unit || 'UN'}</td>
                        <td className="py-2 px-2 text-center font-mono font-bold text-slate-700">{item.qty}</td>
                        <td className="py-2 px-2 text-right font-mono text-slate-600">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.price)}
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-slate-950">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-3 px-2 font-mono text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {printOrder.items}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Totais do Orçamento */}
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
                  <span className="text-slate-800">Valor Estimado Líquido:</span>
                  <span className="font-mono text-sm font-black text-slate-950">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(printOrder.value)}
                  </span>
                </div>
              </div>
            </div>

            {/* Observacoes */}
            {printOrder.notes && (
              <div className="my-4 border border-slate-200 rounded p-3 bg-slate-50/50 text-[11px]">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observações / Condições Especiais</h4>
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{printOrder.notes}</p>
              </div>
            )}

            {/* Linhas de Assinaturas */}
            <div className="grid grid-cols-2 gap-8 mt-14 pt-6 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Responsável</p>
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
              {systemParams?.companyName || 'Estilo Coifas'} ERP • Proposta de Orçamento Comercial • Documento gerado por {printOrder.operator || 'Eduardo Fontes'}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
