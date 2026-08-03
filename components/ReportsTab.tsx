'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Download, 
  BarChart3, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  PieChart, 
  ArrowUpRight,
  ChevronRight,
  Percent,
  Cpu,
  Hammer,
  Truck,
  Layers,
  Users,
  Tag,
  Search,
  Building2,
  FolderTree,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Gauge
} from 'lucide-react';
import { SalesOrder, InventoryItem, ProductionOrder, Customer } from '../lib/types';

interface ReportsTabProps {
  salesOrders: SalesOrder[];
  inventory: InventoryItem[];
  productionOrders: ProductionOrder[];
  customers?: Customer[];
}

export default function ReportsTab({
  salesOrders,
  inventory,
  productionOrders,
  customers = []
}: ReportsTabProps) {
  // Navigation: General Sales ('vendas'), Costs ('custos'), Sales by Client ('clientes'), Tipificacao/Segments ('tipificacao')
  const [activeSubTab, setActiveSubTab] = useState<'vendas' | 'custos' | 'clientes' | 'tipificacao'>('vendas');
  const [startDate, setStartDate] = useState('2026-06-01');
  const [endDate, setEndDate] = useState(() => {
    try {
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
      const currentMonthEnd = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      return currentMonthEnd > '2026-07-31' ? currentMonthEnd : '2026-07-31';
    } catch (e) {
      return '2026-07-31';
    }
  });
  const [lineFilter, setLineFilter] = useState('Todas');
  
  // Custom states for newly requested reports
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedDetailSegment, setSelectedDetailSegment] = useState<string | null>(null);
  const [selectedDetailCategory, setSelectedDetailCategory] = useState<string | null>(null);

  // Filter Sales Orders (excluding cancelled ones)
  const filteredSales = useMemo(() => {
    return salesOrders.filter(order => {
      const matchDate = order.date >= startDate && order.date <= endDate;
      return matchDate && order.status !== 'Cancelado';
    });
  }, [salesOrders, startDate, endDate]);

  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((acc, curr) => acc + curr.value, 0);
  }, [filteredSales]);

  const avgOrderValue = useMemo(() => {
    if (filteredSales.length === 0) return 0;
    return totalRevenue / filteredSales.length;
  }, [filteredSales, totalRevenue]);

  // Filter Production Orders (OPs)
  const filteredOPs = useMemo(() => {
    return productionOrders.filter(op => {
      if (op.salesOrderId) {
        const linkedSO = salesOrders.find(so => so.id === op.salesOrderId);
        if (linkedSO && linkedSO.status === 'Orçamento') return false;
      }
      const matchDate = op.date >= startDate && op.date <= endDate;
      const matchLine = lineFilter === 'Todas' || op.line === lineFilter;
      return matchDate && matchLine;
    });
  }, [productionOrders, salesOrders, startDate, endDate, lineFilter]);

  // Cost calculations (from original report logic)
  const costReportKPIs = useMemo(() => {
    let rawMaterialCost = 0;
    let laborCost = 0;
    let logisticalCost = 0;

    filteredOPs.forEach(op => {
      const matchedItem = inventory.find(item => item.name === op.product);
      const unitPrice = matchedItem ? matchedItem.price : 1000;
      const batchValue = op.qty * unitPrice;
      
      const productionCostTotal = batchValue * 0.40;
      rawMaterialCost += productionCostTotal * 0.65;
      laborCost += productionCostTotal * 0.25;
      logisticalCost += productionCostTotal * 0.10;
    });

    const totalCost = rawMaterialCost + laborCost + logisticalCost;
    const avgCostPerOP = filteredOPs.length > 0 ? totalCost / filteredOPs.length : 0;

    return {
      total: totalCost,
      avg: avgCostPerOP,
      materials: rawMaterialCost,
      labor: laborCost,
      logistical: logisticalCost
    };
  }, [filteredOPs, inventory]);

  // ==========================================
  // NEW REPORT 1: GROUP SALES BY CUSTOMER
  // ==========================================
  const salesByCustomer = useMemo(() => {
    const map: Record<string, {
      customerName: string;
      nickname: string;
      segment: string;
      cnpj: string;
      ordersCount: number;
      totalSpent: number;
    }> = {};

    filteredSales.forEach(order => {
      const matchedCust = customers.find(c => c.name === order.client);
      const nickname = matchedCust?.nickname || '';
      const segment = matchedCust?.segment || 'Não Classificado';
      const cnpj = matchedCust?.cnpj || 'N/A';

      if (!map[order.client]) {
        map[order.client] = {
          customerName: order.client,
          nickname,
          segment,
          cnpj,
          ordersCount: 0,
          totalSpent: 0
        };
      }
      map[order.client].ordersCount += 1;
      map[order.client].totalSpent += order.value;
    });

    return Object.values(map).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [filteredSales, customers]);

  const maxSpentByCustomer = useMemo(() => {
    if (salesByCustomer.length === 0) return 1;
    return Math.max(...salesByCustomer.map(c => c.totalSpent), 1);
  }, [salesByCustomer]);

  const searchedSalesByCustomer = useMemo(() => {
    return salesByCustomer.filter(item => {
      const searchLower = customerSearch.toLowerCase();
      return (
        item.customerName.toLowerCase().includes(searchLower) ||
        item.nickname.toLowerCase().includes(searchLower) ||
        item.cnpj.includes(searchLower) ||
        item.segment.toLowerCase().includes(searchLower)
      );
    });
  }, [salesByCustomer, customerSearch]);

  // ==========================================
  // NEW REPORT 2: REPORT BY TIPIFICAÇÃO (Classification/Segmentation)
  // ==========================================
  
  // 2.1 Segmento do Cliente (Industrial, Comercial, Metalúrgica, etc.)
  const salesByCustomerSegment = useMemo(() => {
    const map: Record<string, {
      segmentName: string;
      customerCount: Set<string>;
      ordersCount: number;
      totalRevenue: number;
    }> = {};

    filteredSales.forEach(order => {
      const matchedCust = customers.find(c => c.name === order.client);
      const segment = matchedCust?.segment || 'Outros / Sem Tipificação';

      if (!map[segment]) {
        map[segment] = {
          segmentName: segment,
          customerCount: new Set<string>(),
          ordersCount: 0,
          totalRevenue: 0
        };
      }
      map[segment].customerCount.add(order.client);
      map[segment].ordersCount += 1;
      map[segment].totalRevenue += order.value;
    });

    return Object.values(map)
      .map(item => ({
        segmentName: item.segmentName,
        customerCount: item.customerCount.size,
        ordersCount: item.ordersCount,
        totalRevenue: item.totalRevenue
      }))
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [filteredSales, customers]);

  // 2.2 Categoria de Produto (Chapas, Coifas, Peças, Motores, etc.)
  const salesByProductCategory = useMemo(() => {
    const map: Record<string, {
      categoryName: string;
      unitsSold: number;
      revenue: number;
    }> = {};

    filteredSales.forEach(order => {
      if (order.products && order.products.length > 0) {
        order.products.forEach(p => {
          const matchedItem = inventory.find(item => item.sku === p.sku || item.name === p.name);
          const category = matchedItem?.category || 'Chapas & Aço';

          if (!map[category]) {
            map[category] = {
              categoryName: category,
              unitsSold: 0,
              revenue: 0
            };
          }
          map[category].unitsSold += p.qty;
          map[category].revenue += p.total;
        });
      } else {
        // Parse from `items` text
        const desc = order.items.toLowerCase();
        let category = 'Acessórios';
        if (desc.includes('coifa')) category = 'Coifas & Sistemas';
        else if (desc.includes('duto') || desc.includes('curva') || desc.includes('tubo')) category = 'Dutos & Conexões';
        else if (desc.includes('filtro') || desc.includes('motor') || desc.includes('exaustor')) category = 'Exaustão & Filtros';
        else if (desc.includes('serviço') || desc.includes('instala')) category = 'Serviços de Instalação';

        if (!map[category]) {
          map[category] = {
            categoryName: category,
            unitsSold: 0,
            revenue: 0
          };
        }
        map[category].unitsSold += 1;
        map[category].revenue += order.value;
      }
    });

    return Object.values(map).sort((a, b) => b.revenue - a.revenue);
  }, [filteredSales, inventory]);

  // ==========================================
  // SEGMENT AND CATEGORY DETAILS FOR TIPIFICAÇÃO
  // ==========================================
  const segmentDetails = useMemo(() => {
    if (!selectedDetailSegment) return [];
    
    const productMap: Record<string, {
      sku: string;
      name: string;
      qty: number;
      total: number;
    }> = {};

    filteredSales.forEach(order => {
      const matchedCust = customers.find(c => c.name === order.client);
      const segment = matchedCust?.segment || 'Outros / Sem Tipificação';
      
      if (segment === selectedDetailSegment) {
        if (order.products && order.products.length > 0) {
          order.products.forEach(p => {
            const key = p.sku || p.name;
            if (!productMap[key]) {
              productMap[key] = { sku: p.sku || 'N/A', name: p.name, qty: 0, total: 0 };
            }
            productMap[key].qty += p.qty;
            productMap[key].total += p.total;
          });
        } else {
          const key = order.items;
          if (!productMap[key]) {
            productMap[key] = { sku: 'N/A', name: order.items, qty: 0, total: 0 };
          }
          productMap[key].qty += 1;
          productMap[key].total += order.value;
        }
      }
    });

    return Object.values(productMap).sort((a, b) => b.total - a.total);
  }, [filteredSales, customers, selectedDetailSegment]);

  const categoryDetails = useMemo(() => {
    if (!selectedDetailCategory) return [];

    const productMap: Record<string, {
      sku: string;
      name: string;
      qty: number;
      total: number;
    }> = {};

    filteredSales.forEach(order => {
      if (order.products && order.products.length > 0) {
        order.products.forEach(p => {
          const matchedItem = inventory.find(item => item.sku === p.sku || item.name === p.name);
          const category = matchedItem?.category || 'Chapas & Aço';

          if (category === selectedDetailCategory) {
            const key = p.sku || p.name;
            if (!productMap[key]) {
              productMap[key] = { sku: p.sku || 'N/A', name: p.name, qty: 0, total: 0 };
            }
            productMap[key].qty += p.qty;
            productMap[key].total += p.total;
          }
        });
      } else {
        const desc = order.items.toLowerCase();
        let category = 'Acessórios';
        if (desc.includes('coifa')) category = 'Coifas & Sistemas';
        else if (desc.includes('duto') || desc.includes('curva') || desc.includes('tubo')) category = 'Dutos & Conexões';
        else if (desc.includes('filtro') || desc.includes('motor') || desc.includes('exaustor')) category = 'Exaustão & Filtros';
        else if (desc.includes('serviço') || desc.includes('instala')) category = 'Serviços de Instalação';

        if (category === selectedDetailCategory) {
          const key = order.items;
          if (!productMap[key]) {
            productMap[key] = { sku: 'N/A', name: order.items, qty: 0, total: 0 };
          }
          productMap[key].qty += 1;
          productMap[key].total += order.value;
        }
      }
    });

    return Object.values(productMap).sort((a, b) => b.total - a.total);
  }, [filteredSales, inventory, selectedDetailCategory]);

  const handleExportCSV = () => {
    const sanitizeCSV = (val: any) => {
      if (val === null || val === undefined) return '';
      const str = String(val).replace(/"/g, '""').replace(/[\r\n]+/g, ' ');
      if (str.includes(';') || str.includes('"')) {
        return `"${str}"`;
      }
      return str;
    };

    const csvLines: string[] = [];

    // Header Metadata
    csvLines.push('RELATÓRIO GERENCIAL - ESTILO COIFAS ERP');
    csvLines.push(`Período de Análise: ${startDate} a ${endDate}`);
    csvLines.push(`Data de Extração: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`);
    csvLines.push('');

    // Section 1: Sales Orders (Vendas Filtradas)
    csvLines.push('--- VENDAS FILTRADAS NO PERÍODO ---');
    const salesHeaders = [
      'ID Pedido',
      'Nº Série',
      'Data',
      'Cliente',
      'Itens / Descrição',
      'Valor Total (R$)',
      'Forma de Pagamento',
      'Status'
    ];
    csvLines.push(salesHeaders.join(';'));

    filteredSales.forEach(order => {
      const row = [
        sanitizeCSV(order.id),
        sanitizeCSV(order.serialNumber ? `#${order.serialNumber}` : 'N/A'),
        sanitizeCSV(order.date),
        sanitizeCSV(order.client),
        sanitizeCSV(order.items),
        sanitizeCSV(order.value ? order.value.toFixed(2) : '0.00'),
        sanitizeCSV(order.paymentMethod || 'N/A'),
        sanitizeCSV(order.status)
      ];
      csvLines.push(row.join(';'));
    });

    csvLines.push('');
    csvLines.push(`Total Vendas Registradas no Período: ${filteredSales.length}`);
    csvLines.push(`Faturamento Total no Período (R$): ${totalRevenue.toFixed(2)}`);
    csvLines.push('');

    // Section 2: Inventory & Stock (Estoque de Materiais)
    csvLines.push('--- POSIÇÃO ATUAL DO ESTOQUE E ALMOXARIFADO ---');
    const inventoryHeaders = [
      'SKU',
      'Item / Material',
      'Categoria',
      'Estoque Atual',
      'Unidade',
      'Estoque Máximo',
      'Preço Venda (R$)',
      'Preço Compra (R$)',
      'Status Estoque'
    ];
    csvLines.push(inventoryHeaders.join(';'));

    inventory.forEach(item => {
      const stockStatus = item.stock === 0
        ? 'Sem Estoque'
        : item.max > 0 && item.stock <= (item.max * 0.2)
        ? 'Estoque Baixo (<20%)'
        : 'Normal';

      const row = [
        sanitizeCSV(item.sku),
        sanitizeCSV(item.name),
        sanitizeCSV(item.category),
        sanitizeCSV(item.stock),
        sanitizeCSV(item.unit || 'UN'),
        sanitizeCSV(item.max),
        sanitizeCSV((item.salesPrice || item.price || 0).toFixed(2)),
        sanitizeCSV((item.purchasePrice || 0).toFixed(2)),
        sanitizeCSV(stockStatus)
      ];
      csvLines.push(row.join(';'));
    });

    // Create CSV content with UTF-8 BOM (\uFEFF) so Microsoft Excel opens Brazilian accents seamlessly
    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + csvLines.join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_vendas_estoque_${startDate}_a_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Dynamic Header Tab Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setActiveSubTab('vendas')}
            className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
              activeSubTab === 'vendas' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Faturamento Geral
          </button>

          <button 
            onClick={() => setActiveSubTab('clientes')}
            className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
              activeSubTab === 'clientes' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Vendas por Cliente
          </button>

          <button 
            onClick={() => setActiveSubTab('tipificacao')}
            className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
              activeSubTab === 'tipificacao' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Por Tipificação
          </button>

          <button 
            onClick={() => setActiveSubTab('custos')}
            className={`text-xs font-bold uppercase tracking-wider px-3.5 py-2 rounded-lg border transition-all flex items-center gap-1.5 ${
              activeSubTab === 'custos' 
                ? 'bg-slate-900 text-white border-slate-900 shadow-sm' 
                : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Custos de Produção
          </button>
        </div>

        {/* Date Filter Panel */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input 
              type="date" 
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent focus:outline-none font-mono text-[11px]"
            />
            <span className="text-slate-300">até</span>
            <input 
              type="date" 
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent focus:outline-none font-mono text-[11px]"
            />
          </div>

          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg font-medium shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* ==========================================
          SUBTAB: GENERAL SALES (Faturamento Geral)
          ========================================== */}
      {activeSubTab === 'vendas' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Sales KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Faturamento no Período</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
              </h3>
              <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-semibold mt-2">
                <TrendingUp className="w-3 h-3" />
                <span>Metas industriais superadas</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Ticket Médio Contratos</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgOrderValue)}
              </h3>
              <p className="text-[10px] text-slate-400 mt-2">Mapeado em {filteredSales.length} contratos comerciais</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Conversão de Orçamentos</p>
              <div className="flex items-center gap-3 mt-1.5">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Percent className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800">92.5%</h4>
                  <p className="text-[9px] text-slate-400 uppercase">Aprovação comercial</p>
                </div>
              </div>
            </div>
          </div>

          {/* Graphical Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Vendas por Dia do Mês (Gráfico de Linha do Período)
              </h4>
              <p className="text-xs text-slate-400 mb-6">Detalhamento cronológico de faturamento de pedidos faturados/entregues</p>

              <div className="h-56 w-full relative pt-4">
                <svg className="w-full h-full" viewBox="0 0 500 150" preserveAspectRatio="none">
                  {/* Grid lines */}
                  <line x1="0" y1="37" x2="500" y2="37" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="75" x2="500" y2="75" stroke="#f1f5f9" strokeWidth="1" />
                  <line x1="0" y1="112" x2="500" y2="112" stroke="#f1f5f9" strokeWidth="1" />
                  
                  {/* Line pathway */}
                  <path 
                    d="M 20 120 Q 100 80 180 100 T 340 50 T 480 30" 
                    fill="none" 
                    stroke="rgba(79, 70, 229, 0.8)" 
                    strokeWidth="3" 
                  />
                  {/* Fill Area */}
                  <path 
                    d="M 20 120 Q 100 80 180 100 T 340 50 T 480 30 L 480 150 L 20 150 Z" 
                    fill="rgba(79, 70, 229, 0.05)" 
                  />

                  {/* Interaction Dots */}
                  <circle cx="180" cy="100" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="340" cy="50" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                  <circle cx="480" cy="30" r="4.5" fill="#4f46e5" stroke="#ffffff" strokeWidth="1.5" />
                </svg>

                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-2 px-1">
                  <span>Início (Dia {startDate.substring(8)})</span>
                  <span>Meio</span>
                  <span>Fim (Dia {endDate.substring(8)})</span>
                </div>
              </div>
            </div>

            {/* Quick Overview of Top items and sectors */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-emerald-600" />
                  Divisão de Vendas por Setor
                </h4>
                <p className="text-xs text-slate-400 mb-5">Participação percentual estimada por categoria técnica</p>

                <div className="space-y-3.5">
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Coifas & Sistemas</span>
                      <span>45%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-indigo-600 h-full rounded-full" style={{ width: '45%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Exaustão & Filtros</span>
                      <span>30%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-blue-600 h-full rounded-full" style={{ width: '30%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Dutos & Conexões</span>
                      <span>15%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-emerald-600 h-full rounded-full" style={{ width: '15%' }}></div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                      <span>Serviços de Instalação</span>
                      <span>10%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: '10%' }}></div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center font-mono border-t border-slate-100 pt-3 mt-4">
                Total do portfólio de produtos e faturamentos ativos
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SUBTAB: SALES BY CUSTOMER (Vendas por Cliente)
          ========================================== */}
      {activeSubTab === 'clientes' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Clientes Faturados</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">{salesByCustomer.length} clientes</h3>
              <p className="text-[10px] text-slate-500 mt-1">Com compras registradas no período selecionado</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Maior Comprador</p>
              <h3 className="text-base font-bold text-slate-800 mt-1 truncate">
                {salesByCustomer[0]?.nickname || salesByCustomer[0]?.customerName || 'Nenhum'}
              </h3>
              <p className="text-[11px] text-indigo-600 font-bold mt-0.5">
                {salesByCustomer[0] ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(salesByCustomer[0].totalSpent) : 'R$ 0,00'}
              </p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-sm">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ticket Médio p/ Cliente</p>
              <h3 className="text-xl font-bold text-slate-800 mt-1">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  salesByCustomer.length > 0 ? totalRevenue / salesByCustomer.length : 0
                )}
              </h3>
              <p className="text-[10px] text-slate-500 mt-1">Faturamento total dividido por cliente ativo</p>
            </div>
          </div>

          {/* Search Toolbar */}
          <div className="bg-white border border-slate-200/80 p-4 rounded-xl flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input 
                type="text"
                placeholder="Buscar cliente por nome, apelido, CNPJ ou segmento..."
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-slate-900 focus:bg-white"
              />
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              Exibindo {searchedSalesByCustomer.length} de {salesByCustomer.length} clientes
            </div>
          </div>

          {/* Detailed Customer Ranking Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/70 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3 w-14 text-center">Rank</th>
                    <th className="px-5 py-3">Cliente</th>
                    <th className="px-5 py-3">Apelido (Fantasia)</th>
                    <th className="px-5 py-3">CNPJ / Identificação</th>
                    <th className="px-5 py-3">Tipificação (Segmento)</th>
                    <th className="px-5 py-3 text-center">Qtd Pedidos</th>
                    <th className="px-5 py-3 text-right">Faturamento Total</th>
                    <th className="px-5 py-3 w-48">Market Share Interno</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {searchedSalesByCustomer.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                        Nenhum cliente com vendas encontradas no período selecionado.
                      </td>
                    </tr>
                  ) : (
                    searchedSalesByCustomer.map((item, idx) => {
                      const sharePercentage = Math.round((item.totalSpent / (totalRevenue || 1)) * 100);
                      const relativeBarWidth = Math.round((item.totalSpent / maxSpentByCustomer) * 100);

                      return (
                        <tr key={item.customerName} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-4 text-center font-mono font-bold text-slate-400">
                            #{idx + 1}
                          </td>
                          <td className="px-5 py-4 font-semibold text-slate-800">
                            {item.customerName}
                          </td>
                          <td className="px-5 py-4">
                            {item.nickname ? (
                              <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-md font-bold text-[11px] border border-indigo-100">
                                {item.nickname}
                              </span>
                            ) : (
                              <span className="text-slate-400 italic font-mono">-</span>
                            )}
                          </td>
                          <td className="px-5 py-4 font-mono text-slate-500">
                            {item.cnpj}
                          </td>
                          <td className="px-5 py-4">
                            <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px] font-medium uppercase border border-slate-200">
                              {item.segment}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center font-mono font-bold text-slate-700">
                            {item.ordersCount}
                          </td>
                          <td className="px-5 py-4 text-right font-mono font-bold text-slate-800">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalSpent)}
                          </td>
                          <td className="px-5 py-4">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px] text-slate-500">
                                <span className="font-semibold font-mono">{sharePercentage}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className="bg-indigo-600 h-full rounded-full"
                                  style={{ width: `${relativeBarWidth}%` }}
                                ></div>
                              </div>
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
        </div>
      )}

      {/* ==========================================
          SUBTAB: REPORT BY TIPIFICAÇÃO (Por Tipificação)
          ========================================== */}
      {activeSubTab === 'tipificacao' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Classification by Client Segment */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-600" />
                    Tipificação por Segmento de Cliente
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Faturamento agrupado de acordo com a classificação comercial</p>
                </div>

                <div className="space-y-4">
                  {salesByCustomerSegment.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">Sem faturamentos segmentados no período.</p>
                  ) : (
                    salesByCustomerSegment.map((item) => {
                      const sharePercent = Math.round((item.totalRevenue / (totalRevenue || 1)) * 100);
                      return (
                        <div key={item.segmentName} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{item.segmentName}</span>
                            <span className="text-xs font-mono font-bold text-indigo-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.totalRevenue)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Clientes Ativos: <strong className="text-slate-700 font-bold">{item.customerCount}</strong></span>
                            <span>Pedidos: <strong className="text-slate-700 font-bold">{item.ordersCount}</strong></span>
                          </div>

                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-indigo-600 h-full rounded-full" 
                              style={{ width: `${sharePercent}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/40 mt-1.5">
                            <span className="text-[10px] font-semibold text-slate-400">Participação: <strong className="text-slate-700 font-bold">{sharePercent}%</strong></span>
                            <button
                              onClick={() => setSelectedDetailSegment(item.segmentName)}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 hover:bg-indigo-100/80 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                            >
                              <span>Ver Produtos</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center font-mono border-t border-slate-100 pt-3 mt-6">
                Definições de segmentos ajustadas nos Parâmetros do Sistema
              </div>
            </div>

            {/* Classification by Product Category */}
            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
              <div>
                <div className="border-b border-slate-100 pb-3 mb-4">
                  <h4 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <FolderTree className="w-4 h-4 text-emerald-600" />
                    Tipificação por Categoria de Produtos/Insumos
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">Faturamento agrupado por categoria técnica de materiais vendidos</p>
                </div>

                <div className="space-y-4">
                  {salesByProductCategory.length === 0 ? (
                    <p className="text-xs text-slate-400 italic text-center py-6">Sem vendas registradas no período.</p>
                  ) : (
                    salesByProductCategory.map((item) => {
                      const sharePercent = Math.round((item.revenue / (totalRevenue || 1)) * 100);
                      return (
                        <div key={item.categoryName} className="p-3 bg-slate-50 border border-slate-200/60 rounded-xl space-y-2">
                          <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">{item.categoryName}</span>
                            <span className="text-xs font-mono font-bold text-emerald-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.revenue)}
                            </span>
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-400">
                            <span>Quantidade Unidades Vendidas: <strong className="text-slate-700 font-bold">{item.unitsSold}</strong></span>
                          </div>

                          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className="bg-emerald-600 h-full rounded-full" 
                              style={{ width: `${sharePercent}%` }}
                            ></div>
                          </div>

                          <div className="flex justify-between items-center pt-1.5 border-t border-slate-200/40 mt-1.5">
                            <span className="text-[10px] font-semibold text-slate-400">Participação: <strong className="text-slate-700 font-bold">{sharePercent}%</strong></span>
                            <button
                              onClick={() => setSelectedDetailCategory(item.categoryName)}
                              className="text-[10px] font-bold text-emerald-600 hover:text-emerald-850 bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                            >
                              <span>Ver Produtos</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="text-[10px] text-slate-400 text-center font-mono border-t border-slate-100 pt-3 mt-6">
                As categorias são vinculadas aos SKUs no estoque
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Detail Modal for Client Segment */}
      {selectedDetailSegment && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-indigo-600" />
                  Produtos Vendidos no Período — Segmento: <span className="text-indigo-600 uppercase">{selectedDetailSegment}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Intervalo: <span className="font-mono font-semibold">{startDate}</span> até <span className="font-mono font-semibold">{endDate}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailSegment(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                title="Fechar"
              >
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>

            {/* Content / Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {segmentDetails.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Nenhum produto faturado no período selecionado.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2.5">Cód/SKU</th>
                        <th className="px-4 py-2.5">Produto</th>
                        <th className="px-4 py-2.5 text-center">Quant.</th>
                        <th className="px-4 py-2.5 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {segmentDetails.map((prod, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500 font-bold">{prod.sku}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{prod.name}</td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">{prod.qty} un</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-indigo-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setSelectedDetailSegment(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal for Product Category */}
      {selectedDetailCategory && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-2xl w-full max-h-[85vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-5 border-b border-slate-150 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <FolderTree className="w-5 h-5 text-emerald-600" />
                  Produtos Vendidos no Período — Categoria: <span className="text-emerald-600 uppercase">{selectedDetailCategory}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Intervalo: <span className="font-mono font-semibold">{startDate}</span> até <span className="font-mono font-semibold">{endDate}</span>
                </p>
              </div>
              <button 
                onClick={() => setSelectedDetailCategory(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 hover:bg-slate-50 rounded-lg transition-colors"
                title="Fechar"
              >
                <span className="text-xl font-bold leading-none">&times;</span>
              </button>
            </div>

            {/* Content / Table */}
            <div className="p-6 overflow-y-auto flex-1 space-y-4">
              {categoryDetails.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-8">Nenhum produto faturado no período selecionado.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="px-4 py-2.5">Cód/SKU</th>
                        <th className="px-4 py-2.5">Produto</th>
                        <th className="px-4 py-2.5 text-center">Quant.</th>
                        <th className="px-4 py-2.5 text-right">Valor Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-xs">
                      {categoryDetails.map((prod, index) => (
                        <tr key={index} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 py-3 font-mono text-slate-500 font-bold">{prod.sku}</td>
                          <td className="px-4 py-3 font-semibold text-slate-800">{prod.name}</td>
                          <td className="px-4 py-3 text-center font-mono font-semibold text-slate-700">{prod.qty} un</td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(prod.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setSelectedDetailCategory(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold px-4 py-2 rounded-lg shadow-sm transition-colors"
              >
                Fechar Detalhes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==========================================
          SUBTAB: PRODUCTION COSTS (Custos de Produção)
          ========================================== */}
      {activeSubTab === 'custos' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Top selection line filter */}
          <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-3 rounded-xl shadow-xs">
            <span className="text-xs font-bold text-slate-600 uppercase">Filtro de Linha:</span>
            <div className="flex gap-2">
              {['Todas', 'Linha A', 'Linha B', 'Linha C'].map(line => (
                <button 
                  key={line}
                  onClick={() => setLineFilter(line)}
                  className={`text-xs px-3 py-1 border rounded-lg font-medium transition-all ${
                    lineFilter === line 
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {line}
                </button>
              ))}
            </div>
          </div>

          {/* Cost KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Custo Fabril Total</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costReportKPIs.total)}
                  </h3>
                </div>
                <span className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Cpu className="w-4 h-4" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Mapeado em {filteredOPs.length} lotes de fabricação</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Custo Médio por Lote</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-1">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costReportKPIs.avg)}
                  </h3>
                </div>
                <span className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                  <Layers className="w-4 h-4" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Soma ponderada por OP de produção</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Matéria-Prima vs MO</p>
                  <h3 className="text-lg font-bold text-slate-800 mt-1">65% vs 25%</h3>
                </div>
                <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
                  <Hammer className="w-4 h-4" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Proporção operacional ótima</p>
            </div>

            <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-xs">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Desvio de Ociosidade</p>
                  <h3 className="text-xl font-bold text-slate-800 mt-1">-3.4%</h3>
                </div>
                <span className="p-2 bg-rose-50 text-rose-600 rounded-lg">
                  <Percent className="w-4 h-4" />
                </span>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Otimização fabril excelente</p>
            </div>
          </div>

          {/* Breakdown grids: Trend and Category breakdown */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
              <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                <BarChart3 className="w-4 h-4 text-indigo-600" />
                Curva de Evolução de Custos (OPs por Linha)
              </h4>
              <p className="text-xs text-slate-400 mb-6">Custos industriais segmentados por fita temporal de fabricação</p>

              <div className="h-56 relative flex items-end justify-between px-2 pt-4">
                <div className="absolute inset-x-0 top-0 bottom-6 flex flex-col justify-between pointer-events-none">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className="border-t border-slate-100 w-full h-0 relative">
                      <span className="absolute -top-2 left-0 text-[8px] text-slate-400 bg-white pr-1.5 font-mono">
                        R$ {Math.round((costReportKPIs.total * (3 - i)) / 3 / 1000)}k
                      </span>
                    </div>
                  ))}
                </div>

                <div className="w-full h-full flex items-end justify-around z-10 pl-10">
                  {['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'].map((week, idx) => {
                    const valueFactor = [0.7, 1.2, 0.9, 1.0][idx];
                    const barHeight = Math.min((costReportKPIs.total * valueFactor * 0.25 / (costReportKPIs.total || 1)) * 100, 100);
                    return (
                      <div key={week} className="flex flex-col items-center flex-1 group/costbar max-w-[50px]">
                        <div 
                          className="w-full bg-slate-400/80 hover:bg-slate-500 rounded-t transition-all duration-500 cursor-pointer relative"
                          style={{ height: `${barHeight || 30}%` }}
                        >
                          <div className="absolute inset-x-0 top-0 h-1 bg-slate-300 opacity-60 rounded-t"></div>
                        </div>
                        <span className="text-[10px] text-slate-500 font-medium mt-2">{week}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-xl p-5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-semibold text-slate-800 mb-1 flex items-center gap-1.5">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  Divisão de Gasto Fabril
                </h4>
                <p className="text-xs text-slate-400 mb-5">Custos diretos e indiretos mapeados</p>

                <div className="space-y-4">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-indigo-600 rounded-full"></span>
                      <span className="text-slate-600">Matéria-Prima</span>
                    </div>
                    <strong className="text-slate-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costReportKPIs.materials)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                      <span className="text-slate-600">Mão de Obra Direta</span>
                    </div>
                    <strong className="text-slate-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costReportKPIs.labor)}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full"></span>
                      <span className="text-slate-600">Logística & Depósitos</span>
                    </div>
                    <strong className="text-slate-800">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(costReportKPIs.logistical)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center gap-2 text-[10px] text-indigo-800 font-semibold mt-4">
                <Truck className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                <span>Integração de Contabilidade de Custos Ativada</span>
              </div>
            </div>
          </div>

          {/* Costs by Production Order (OP) directory */}
          <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200/80 text-xs font-semibold text-slate-800">
              Detalhamento de Gasto Técnico por Ordem de Produção (OP)
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-5 py-3">Código OP</th>
                    <th className="px-5 py-3">Lote do Produto</th>
                    <th className="px-5 py-3">Linha Executiva</th>
                    <th className="px-5 py-3">Matéria Prima</th>
                    <th className="px-5 py-3">Mão de Obra</th>
                    <th className="px-5 py-3">Custo Total OP</th>
                    <th className="px-5 py-3 text-right">Progresso</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredOPs.map(op => {
                    const matchedItem = inventory.find(item => item.name === op.product);
                    const unitPrice = matchedItem ? matchedItem.price : 1000;
                    const batchVal = op.qty * unitPrice * 0.40;
                    
                    const mat = batchVal * 0.65;
                    const lab = batchVal * 0.25;

                    return (
                      <tr key={op.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-5 py-4 font-mono font-bold text-slate-600">{op.id}</td>
                        <td className="px-5 py-4 font-semibold text-slate-800">{op.product}</td>
                        <td className="px-5 py-4 font-semibold text-slate-500">{op.line}</td>
                        <td className="px-5 py-4 font-mono text-slate-500">R$ {mat.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-4 font-mono text-slate-500">R$ {lab.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                        <td className="px-5 py-4 font-bold text-slate-800">
                          R$ {batchVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-mono font-bold text-indigo-600">{op.progress}%</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
