'use client';

import React from 'react';
import { 
  DollarSign, 
  ShoppingBag, 
  Cpu, 
  AlertTriangle, 
  TrendingUp, 
  Plus, 
  FileText, 
  Users, 
  ArrowRight,
  Package,
  Calendar,
  Clock,
  ShieldAlert
} from 'lucide-react';
import { InventoryItem, ProductionOrder, SalesOrder } from '../lib/types';
import { getDeliveryAlertStatus } from '../lib/utils';

interface DashboardTabProps {
  inventory: InventoryItem[];
  productionOrders: ProductionOrder[];
  salesOrders: SalesOrder[];
  onNavigate: (tab: string) => void;
  onOpenNewOP: () => void;
  onOpenUpdateStock: () => void;
  hideOrderValues?: boolean;
  alertRiskDays?: number;
}

export default function DashboardTab({
  inventory,
  productionOrders,
  salesOrders,
  onNavigate,
  onOpenNewOP,
  onOpenUpdateStock,
  hideOrderValues,
  alertRiskDays
}: DashboardTabProps) {
  
  // Calculate real-time metrics
  const totalSalesRevenue = salesOrders
    .filter(o => o.status !== 'Cancelado')
    .reduce((acc, curr) => acc + curr.value, 0);

  const activeSalesCount = salesOrders.filter(o => o.status === 'Pendente' || o.status === 'Faturado').length;
  
  const activeProductionCount = productionOrders.filter(p => p.status !== 'CONCLUÍDO').length;

  const lowStockItems = inventory.filter(item => item.active !== false && item.stock <= item.max * 0.25);
  const lowStockCount = lowStockItems.length;

  const deliveryAlerts = salesOrders
    .map(order => {
      const alertInfo = getDeliveryAlertStatus(order.deliveryDate, order.status, alertRiskDays);
      return {
        order,
        ...alertInfo
      };
    })
    .filter(item => item.isWarningActive);
  
  const activeAlertsCount = deliveryAlerts.length;

  // Static series for Sales Trend chart
  const salesHistory = [
    { month: 'Jan', value: 45000 },
    { month: 'Fev', value: 52000 },
    { month: 'Mar', value: 49000 },
    { month: 'Abr', value: 63000 },
    { month: 'Mai', value: 58000 },
    { month: 'Jun', value: 74000 }
  ];

  const maxChartValue = Math.max(...salesHistory.map(s => s.value)) * 1.1;

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
        <div>
          <h2 id="dashboard-welcome-heading" className="text-xl font-semibold text-slate-800 tracking-tight">Painel de Operações Industriais</h2>
          <p className="text-sm text-slate-500 mt-1">Bem-vindo de volta! Monitoramento em tempo real da manufatura e fluxos comerciais.</p>
        </div>
        <div className="flex items-center gap-3 text-xs bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-600 font-mono">
          <Calendar className="w-3.5 h-3.5 text-slate-400" />
          <span>Servidor Principal: {new Date().toLocaleDateString('pt-BR')} | UTC-3</span>
        </div>
      </div>

      {/* Grid of four key KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 - Revenue */}
        <div id="kpi-revenue" className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Faturamento Total</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1 font-sans">
                {hideOrderValues ? (
                  <span className="text-slate-300 font-sans">••••</span>
                ) : (
                  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalSalesRevenue)
                )}
              </h3>
            </div>
            <span className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <DollarSign className="w-5 h-5" />
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-4 text-xs text-emerald-600 font-medium">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+14.2% em relação ao mês anterior</span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-emerald-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* KPI 2 - Active Orders */}
        <div id="kpi-orders" className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Pedidos Ativos</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeSalesCount}</h3>
            </div>
            <span className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
              <ShoppingBag className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-4">Aguardando faturamento/expedição</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* KPI 3 - Production Efficiency */}
        <div id="kpi-production" className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden group">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">OPs em Andamento</p>
              <h3 className="text-2xl font-bold text-slate-800 mt-1">{activeProductionCount}</h3>
            </div>
            <span className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Cpu className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-4">Distribuídas em 3 linhas de montagem</p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-indigo-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>

        {/* KPI 4 - Alerts */}
        <div id="kpi-alerts" className={`border p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden group transition-colors ${
          (lowStockCount > 0 || activeAlertsCount > 0) ? 'bg-rose-50/40 border-rose-200' : 'bg-white border-slate-200/80'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Alertas Ativos</p>
              <h3 className={`text-2xl font-bold mt-1 ${(lowStockCount > 0 || activeAlertsCount > 0) ? 'text-rose-700' : 'text-slate-800'}`}>
                {lowStockCount + activeAlertsCount}
              </h3>
            </div>
            <span className={`p-2.5 rounded-lg ${(lowStockCount > 0 || activeAlertsCount > 0) ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-5 h-5" />
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-4 leading-relaxed">
            {lowStockCount > 0 ? `${lowStockCount} estoque baixo` : ''}
            {lowStockCount > 0 && activeAlertsCount > 0 ? ' | ' : ''}
            {activeAlertsCount > 0 ? `${activeAlertsCount} entrega crítica` : ''}
            {lowStockCount === 0 && activeAlertsCount === 0 ? 'Nenhum alerta pendente no sistema' : ''}
          </p>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-rose-500 transform scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
        </div>
      </div>

      {/* Dynamic layouts: chart and actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales trend visual graph */}
        <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Desempenho Comercial do Semestre</h4>
              <p className="text-xs text-slate-400 mt-0.5">Faturamento comercial por fita de data mensal</p>
            </div>
            <button 
              onClick={() => onNavigate('Relatórios')}
              className="text-xs font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors"
            >
              Ver Detalhes
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* SVG Custom Interactive Chart */}
          <div className="h-64 relative flex items-end justify-between px-2 pt-4">
            {/* Grid background lines */}
            <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="border-t border-slate-100 w-full h-0 relative">
                  <span className="absolute -top-2 left-0 text-[9px] text-slate-400 bg-white pr-1.5 font-mono">
                    {hideOrderValues ? '•••' : `${Math.round((maxChartValue * (3 - i)) / 3 / 1000)}k`}
                  </span>
                </div>
              ))}
            </div>

            {/* Columns render */}
            <div className="w-full h-full flex items-end justify-around z-10 pl-6">
              {salesHistory.map((s, index) => {
                const barHeight = (s.value / maxChartValue) * 100;
                return (
                  <div key={index} className="flex flex-col items-center flex-1 group/bar max-w-[40px]">
                    {/* Tooltip */}
                    <div className="opacity-0 group-hover/bar:opacity-100 absolute -top-1 bg-slate-800 text-white text-[10px] px-2 py-1 rounded font-mono shadow transition-opacity pointer-events-none mb-2 z-20">
                      {hideOrderValues ? 'R$ ••••' : `R$ ${(s.value / 1000).toFixed(1)}k`}
                    </div>
                    {/* Bar */}
                    <div 
                      className="w-full bg-indigo-500/80 hover:bg-indigo-600 rounded-t transition-all duration-500 ease-out cursor-pointer relative"
                      style={{ height: `${barHeight}%` }}
                    >
                      <div className="absolute inset-x-0 top-0 h-1 bg-indigo-400 opacity-60 rounded-t"></div>
                    </div>
                    <span className="text-[11px] text-slate-500 font-medium mt-2">{s.month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Quick action grid panel */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-semibold text-slate-800 mb-1">Ações Rápidas de Operação</h4>
            <p className="text-xs text-slate-400 mb-5">Atalhos para processos críticos do sistema</p>

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onOpenNewOP}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-center group transition-all"
              >
                <Plus className="w-5 h-5 text-slate-500 group-hover:text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">Nova OP</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Ordem Produção</span>
              </button>

              <button 
                onClick={onOpenUpdateStock}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-center group transition-all"
              >
                <Package className="w-5 h-5 text-slate-500 group-hover:text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">Lançar Estoque</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Ajuste Manual</span>
              </button>

              <button 
                onClick={() => onNavigate('Controle de Acessos')}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-center group transition-all"
              >
                <Users className="w-5 h-5 text-slate-500 group-hover:text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">Permissões</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Controle de TI</span>
              </button>

              <button 
                onClick={() => onNavigate('Relatórios')}
                className="flex flex-col items-center justify-center p-4 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 rounded-xl text-center group transition-all"
              >
                <FileText className="w-5 h-5 text-slate-500 group-hover:text-indigo-500 mb-2" />
                <span className="text-xs font-semibold text-slate-700 group-hover:text-indigo-600">Relatórios</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Finanças e Custos</span>
              </button>
            </div>
          </div>

          <div className="mt-6 p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-3">
            <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-700">Fluxo Integrado</p>
              <p className="text-[10px] text-slate-500 mt-0.5">Telas interconectadas: OPs geradas afetam o estoque e custos!</p>
            </div>
          </div>
        </div>
      </div>

      {/* Three core columns: low stock items, delivery alerts & recent factory activity logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Inventory alert card table */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Insumos de Risco Critíco</h4>
              <p className="text-xs text-slate-400 mt-0.5">Estoque real abaixo do nível de seguridade operacional</p>
            </div>
            <button 
              onClick={() => onNavigate('Controle de Estoque')}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Gerenciar Estoque
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {lowStockItems.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Nenhum alerta de insumo crítico em estoque. Excelente!
              </div>
            ) : (
              lowStockItems.map((item) => {
                const fillPercent = Math.min((item.stock / item.max) * 100, 100);
                return (
                  <div key={item.sku} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 flex-shrink-0 relative">
                        <img 
                          src={item.image} 
                          alt={item.name} 
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-800">{item.name}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{item.sku} | {item.category}</p>
                      </div>
                    </div>

                    <div className="w-32 flex flex-col items-end">
                      <div className="flex justify-between w-full text-[10px] mb-1">
                        <span className="font-semibold text-amber-600">{item.stock} un</span>
                        <span className="text-slate-400">Max: {item.max}</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-500 h-full rounded-full" 
                          style={{ width: `${fillPercent}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Order delivery warnings column */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h4 className="text-sm font-semibold text-slate-800">Alertas de Prazos de Entrega</h4>
              <p className="text-xs text-slate-400 mt-0.5">Pedidos pendentes com vencimento em até 3 dias ou já vencidos</p>
            </div>
            <button 
              onClick={() => onNavigate('Consulta de Pedidos')}
              className="text-xs text-indigo-600 hover:underline font-medium"
            >
              Consultar Todos
            </button>
          </div>

          <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto pr-1 scrollbar-thin">
            {deliveryAlerts.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <span className="text-2xl">🎉</span>
                <p className="font-semibold text-slate-700">Nenhum prazo em risco!</p>
                <p className="text-[11px] text-slate-400">Todos os pedidos estão perfeitamente dentro do cronograma operacional.</p>
              </div>
            ) : (
              deliveryAlerts.map(({ order, alertLabel, alertColorClass }) => {
                return (
                  <div key={order.id} className="py-3 space-y-1.5 hover:bg-slate-50/40 px-1 rounded transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-slate-900 text-xs">{order.id}</span>
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-bold border ${alertColorClass}`}>
                        {alertLabel}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-800 line-clamp-1">{order.client}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{order.items}</p>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500/80" />
                        Limite: {order.deliveryDate}
                      </span>
                      <button 
                        onClick={() => onNavigate('Consulta de Pedidos')}
                        className="text-indigo-600 font-semibold hover:underline text-[10px]"
                      >
                        Visualizar →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Real-time manufacturing activity feed */}
        <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Linha de Tempo de Atividades</h4>
          <p className="text-xs text-slate-400 mb-4">Eventos automáticos gerados pelo chão de fábrica e faturamento</p>

          <div className="space-y-4 font-sans text-xs">
            {/* Timeline element 1 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full ring-4 ring-blue-50"></div>
                <div className="w-0.5 h-12 bg-slate-100"></div>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Pedido faturado com sucesso</p>
                <p className="text-slate-500 mt-0.5">O pedido <strong className="font-mono">VD-1093</strong> para WEG Motores foi atualizado para faturado.</p>
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">Há 15 min | Comercial</span>
              </div>
            </div>

            {/* Timeline element 2 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full ring-4 ring-indigo-50"></div>
                <div className="w-0.5 h-12 bg-slate-100"></div>
              </div>
              <div>
                <p className="font-semibold text-slate-700">OP-4292 em Inspeção de Qualidade</p>
                <p className="text-slate-500 mt-0.5">Lote de Placas Servo Controladora finalizou a montagem sob a supervisão de Ana Paula.</p>
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">Há 1 hora | Manufatura</span>
              </div>
            </div>

            {/* Timeline element 3 */}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="w-2.5 h-2.5 bg-amber-500 rounded-full ring-4 ring-amber-50"></div>
              </div>
              <div>
                <p className="font-semibold text-slate-700">Alerta de Estoque Crítico</p>
                <p className="text-slate-500 mt-0.5">Válvula Hidráulica Direcional operando com apenas 8 unidades em estoque do almoxarifado principal.</p>
                <span className="text-[9px] text-slate-400 font-mono mt-1 block">Há 3 horas | Almoxarifado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
