'use client';

import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Calendar,
  Filter,
  Plus,
  Search,
  CheckCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
  SlidersHorizontal,
  Building,
  User,
  Tag,
  Download,
  CreditCard,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  Printer,
  FileText,
  Eye,
  ListFilter,
  Percent,
  ShoppingBag
} from 'lucide-react';
import { FinancialTransaction, SalesOrder, PurchaseOrder, Customer, UserAccess, CommissionPayout } from '../lib/types';

interface FinanceTabProps {
  salesOrders: SalesOrder[];
  purchaseOrders: PurchaseOrder[];
  customers?: Customer[];
  manualTransactions?: FinancialTransaction[];
  collaborators?: UserAccess[];
  commissionPayouts?: CommissionPayout[];
  onAddManualTransaction?: (tx: FinancialTransaction) => void;
  onToggleManualTransactionStatus?: (id: string, newStatus?: 'PAGO' | 'PENDENTE') => void;
  onDeleteManualTransaction?: (id: string) => void;
  onUpdateSalesOrder?: (id: string, updatedFields: Partial<SalesOrder>) => void;
  onAddCommissionPayout?: (
    payout: CommissionPayout, 
    updatedOrders: SalesOrder[], 
    newExpenseTx: FinancialTransaction
  ) => void;
}

export default function FinanceTab({
  salesOrders,
  purchaseOrders,
  customers = [],
  manualTransactions: propManualTransactions,
  collaborators = [],
  commissionPayouts = [],
  onAddManualTransaction,
  onToggleManualTransactionStatus,
  onDeleteManualTransaction,
  onUpdateSalesOrder,
  onAddCommissionPayout
}: FinanceTabProps) {
  // Local state for manually added transactions fallback
  const [localManualTransactions, setLocalManualTransactions] = useState<FinancialTransaction[]>([
    {
      id: 'FTX-001',
      description: 'Pagamento de Salários da Produção',
      type: 'DESPESA',
      category: 'Salários',
      amount: 24500,
      dueDate: '2026-07-05',
      paymentDate: '2026-07-05',
      status: 'PAGO',
      clientOrSupplier: 'Operadores de Produção',
      paymentMethod: 'Pix'
    },
    {
      id: 'FTX-002',
      description: 'Conta de Energia Elétrica Industrial',
      type: 'DESPESA',
      category: 'Infraestrutura',
      amount: 4850,
      dueDate: '2026-07-10',
      paymentDate: '2026-07-09',
      status: 'PAGO',
      clientOrSupplier: 'Enel Distribuição',
      paymentMethod: 'Boleto Bancário'
    },
    {
      id: 'FTX-003',
      description: 'Venda de Sucata de Aço Inox (Lote #41)',
      type: 'RECEITA',
      category: 'Sucatas / Outros',
      amount: 6800,
      dueDate: '2026-07-15',
      status: 'PENDENTE',
      clientOrSupplier: 'Recicla Metais Ltda'
    },
    {
      id: 'FTX-004',
      description: 'Manutenção Preventiva de Corte e Dobra',
      type: 'DESPESA',
      category: 'Infraestrutura',
      amount: 3200,
      dueDate: '2026-07-01',
      paymentDate: '2026-07-01',
      status: 'PAGO',
      clientOrSupplier: 'DobraSul Máquinas',
      paymentMethod: 'Pix'
    },
    {
      id: 'FTX-005',
      description: 'Serviço Integrado de Frete Logístico',
      type: 'DESPESA',
      category: 'Logística',
      amount: 1950,
      dueDate: '2026-07-08',
      status: 'ATRASADO',
      clientOrSupplier: 'Rapidez Transportes'
    }
  ]);

  // Use props if provided, otherwise fall back to local state
  const manualTransactions = propManualTransactions !== undefined ? propManualTransactions : localManualTransactions;

  const setManualTransactions = (updater: any) => {
    if (propManualTransactions !== undefined) {
      if (typeof updater === 'function') {
        const nextVal = updater(propManualTransactions);
        if (nextVal.length > propManualTransactions.length) {
          if (onAddManualTransaction) onAddManualTransaction(nextVal[0]);
        } else if (nextVal.length < propManualTransactions.length) {
          const deletedItem = propManualTransactions.find((x: FinancialTransaction) => !nextVal.some((y: FinancialTransaction) => y.id === x.id));
          if (deletedItem && onDeleteManualTransaction) {
            onDeleteManualTransaction(deletedItem.id);
          }
        } else {
          const changedItem = nextVal.find((x: FinancialTransaction) => {
            const original = propManualTransactions.find((y: FinancialTransaction) => y.id === x.id);
            return original && original.status !== x.status;
          });
          if (changedItem && onToggleManualTransactionStatus) {
            onToggleManualTransactionStatus(changedItem.id);
          }
        }
      }
    } else {
      setLocalManualTransactions(updater);
    }
  };

  // Active sub-tab state for Finance view
  const [activeSubTab, setActiveSubTab] = useState<'LANÇAMENTOS' | 'COMISSOES'>('LANÇAMENTOS');

  // Collaborator Commission Payout Modal state
  const [selectedCollabPayout, setSelectedCollabPayout] = useState<any | null>(null);
  const [payoutNotes, setPayoutNotes] = useState<string>('');

  // Filter states for Commission Reports
  const [commCollabFilter, setCommCollabFilter] = useState<string>('TODOS');
  const [commPeriodPreset, setCommPeriodPreset] = useState<'TODOS' | 'ESTE_MES' | 'MES_ANTERIOR' | 'ULTIMOS_30' | 'ANO_ATUAL' | 'CUSTOM'>('TODOS');
  const [commStartDate, setCommStartDate] = useState<string>('');
  const [commEndDate, setCommEndDate] = useState<string>('');
  const [commStatusFilter, setCommStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'PAGO'>('TODOS');
  const [commSearchTerm, setCommSearchTerm] = useState<string>('');

  // Expandable cards state per collaborator name
  const [expandedCollabCards, setExpandedCollabCards] = useState<Record<string, boolean>>({});

  // Detailed modal report state for a specific collaborator
  const [detailedReportCollab, setDetailedReportCollab] = useState<any | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState<string>('');

  // Filter sales orders by period for commissions
  const periodFilteredSalesOrders = useMemo(() => {
    const TODAY = new Date('2026-07-10');
    const currentYear = TODAY.getFullYear();
    const currentMonth = TODAY.getMonth();

    return salesOrders.filter(so => {
      if (!so.date) return true;
      const orderDate = new Date(so.date + (so.date.includes('T') ? '' : 'T00:00:00'));

      switch (commPeriodPreset) {
        case 'ESTE_MES':
          return orderDate.getFullYear() === currentYear && orderDate.getMonth() === currentMonth;
        case 'MES_ANTERIOR': {
          const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
          const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
          return orderDate.getFullYear() === prevYear && orderDate.getMonth() === prevMonth;
        }
        case 'ULTIMOS_30': {
          const thirtyDaysAgo = new Date(TODAY);
          thirtyDaysAgo.setDate(TODAY.getDate() - 30);
          return orderDate >= thirtyDaysAgo;
        }
        case 'ANO_ATUAL':
          return orderDate.getFullYear() === currentYear;
        case 'CUSTOM': {
          if (commStartDate) {
            const start = new Date(commStartDate + 'T00:00:00');
            if (orderDate < start) return false;
          }
          if (commEndDate) {
            const end = new Date(commEndDate + 'T23:59:59');
            if (orderDate > end) return false;
          }
          return true;
        }
        case 'TODOS':
        default:
          return true;
      }
    });
  }, [salesOrders, commPeriodPreset, commStartDate, commEndDate]);

  // Collaborators Commissions calculation
  const commissionSummary = useMemo(() => {
    if (!collaborators || collaborators.length === 0) {
      return { eligibleCollabs: [], totalPendingValue: 0, totalPaidValue: 0, totalSalesVolume: 0, totalOrdersCount: 0 };
    }

    const matchOperator = (op: string | undefined, collabName: string) => {
      if (!op || !collabName) return false;
      return String(op).trim().toLowerCase() === String(collabName).trim().toLowerCase();
    };

    const isEligibleOrder = (so: SalesOrder) => {
      if (!so || so.status === 'Orçamento' || so.status === 'Cancelado') return false;

      // Explicit commission set on order
      if ((so.commissionPercentage !== undefined && so.commissionPercentage !== null && so.commissionPercentage > 0) || (so.commissionValue !== undefined && so.commissionValue !== null && so.commissionValue > 0)) {
        return true;
      }

      // Check clientSegment or customer segment - exclude ONLY if explicitly Lojista or Revenda
      if (so.clientSegment) {
        const segLower = String(so.clientSegment).toLowerCase();
        if (segLower.includes('lojista') || segLower.includes('revenda')) return false;
      }

      const clientStr = String(so.client || '').trim().toLowerCase();
      const cust = customers.find(c => {
        const cName = String(c?.name || '').trim().toLowerCase();
        const cNick = String(c?.nickname || '').trim().toLowerCase();
        return (cName && clientStr && cName === clientStr) || (cNick && clientStr && cNick === clientStr);
      });

      if (cust && cust.segment) {
        const custSegLower = String(cust.segment).toLowerCase();
        if (custSegLower.includes('lojista') || custSegLower.includes('revenda')) return false;
      }

      const clientLower = String(so.client || '').toLowerCase();
      if (clientLower.includes('lojista') || clientLower.includes('revenda')) return false;

      return true;
    };

    const searchLower = String(commSearchTerm || '').toLowerCase().trim();

    // Group sales orders by collaborator / operator
    const eligibleCollabs = collaborators
      .filter(c => {
        if (commCollabFilter !== 'TODOS' && c.name !== commCollabFilter) return false;
        if (c.commissionEligible || (c.commissionPercentage || 0) > 0) return true;
        return periodFilteredSalesOrders.some(so => (matchOperator(so.operator, c.name) || matchOperator(so.lastOperator, c.name)) && isEligibleOrder(so));
      })
      .map(collab => {
        const defaultPct = collab.commissionPercentage || 0;

        // Find orders in period for this collaborator
        const collabOrders = periodFilteredSalesOrders.filter(so => {
          if (!isEligibleOrder(so)) return false;
          const isOperator = matchOperator(so.operator, collab.name) || matchOperator(so.lastOperator, collab.name);
          if (!isOperator) return false;

          if (commStatusFilter === 'PENDENTE' && so.commissionPaid) return false;
          if (commStatusFilter === 'PAGO' && !so.commissionPaid) return false;

          if (searchLower) {
            const matchesId = String(so.id || '').toLowerCase().includes(searchLower);
            const matchesClient = String(so.client || '').toLowerCase().includes(searchLower);
            const matchesItems = String(so.items || '').toLowerCase().includes(searchLower);
            if (!matchesId && !matchesClient && !matchesItems) return false;
          }

          return true;
        });

        const pendingOrders = collabOrders.filter(o => !o.commissionPaid);
        const paidOrders = collabOrders.filter(o => o.commissionPaid);

        const calculateOrderCommission = (o: SalesOrder) => {
          if (o.commissionValue && o.commissionValue > 0) return o.commissionValue;
          const orderPct = (o.commissionPercentage !== undefined && o.commissionPercentage !== null && o.commissionPercentage > 0)
            ? o.commissionPercentage
            : defaultPct;
          return ((o.value || 0) * orderPct) / 100;
        };

        const totalSalesAmount = collabOrders.reduce((sum, o) => sum + (o.value || 0), 0);
        const pendingCommissionAmount = pendingOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0);
        const paidCommissionAmount = paidOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0);
        const totalCommissionAmount = pendingCommissionAmount + paidCommissionAmount;

        return {
          collaborator: collab,
          allOrders: collabOrders,
          eligibleOrders: pendingOrders, // For payout compatibility
          pendingOrders,
          paidOrders,
          pendingOrdersCount: pendingOrders.length,
          paidOrdersCount: paidOrders.length,
          totalOrdersCount: collabOrders.length,
          totalSalesAmount,
          pendingCommissionAmount,
          paidCommissionAmount,
          commissionAmount: pendingCommissionAmount, // For payout compatibility
          totalCommissionAmount
        };
      });

    // Handle unassigned orders
    if (commCollabFilter === 'TODOS' || commCollabFilter === 'Outros Operadores / Geral') {
      const processedOrderIds = new Set(eligibleCollabs.flatMap(item => item.allOrders.map(o => o.id)));
      const unassignedOrders = periodFilteredSalesOrders.filter(so => {
        if (processedOrderIds.has(so.id)) return false;
        if (!isEligibleOrder(so)) return false;

        if (commStatusFilter === 'PENDENTE' && so.commissionPaid) return false;
        if (commStatusFilter === 'PAGO' && !so.commissionPaid) return false;

        if (searchLower) {
          const matchesId = String(so.id || '').toLowerCase().includes(searchLower);
          const matchesClient = String(so.client || '').toLowerCase().includes(searchLower);
          const matchesItems = String(so.items || '').toLowerCase().includes(searchLower);
          if (!matchesId && !matchesClient && !matchesItems) return false;
        }

        return true;
      });

      if (unassignedOrders.length > 0) {
        const pendingOrders = unassignedOrders.filter(o => !o.commissionPaid);
        const paidOrders = unassignedOrders.filter(o => o.commissionPaid);
        const totalSalesAmount = unassignedOrders.reduce((sum, o) => sum + (o.value || 0), 0);

        const calculateOrderCommission = (o: SalesOrder) => {
          if (o.commissionValue && o.commissionValue > 0) return o.commissionValue;
          return ((o.value || 0) * (o.commissionPercentage || 0)) / 100;
        };

        const pendingCommissionAmount = pendingOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0);
        const paidCommissionAmount = paidOrders.reduce((sum, o) => sum + calculateOrderCommission(o), 0);

        eligibleCollabs.push({
          collaborator: {
            name: 'Outros Operadores / Geral',
            role: 'Vendedor Operacional',
            email: 'vendas@estilocoifas.com.br',
            commissionPercentage: 0,
            commissionEligible: true,
            status: 'Ativo'
          } as any,
          allOrders: unassignedOrders,
          eligibleOrders: pendingOrders,
          pendingOrders,
          paidOrders,
          pendingOrdersCount: pendingOrders.length,
          paidOrdersCount: paidOrders.length,
          totalOrdersCount: unassignedOrders.length,
          totalSalesAmount,
          pendingCommissionAmount,
          paidCommissionAmount,
          commissionAmount: pendingCommissionAmount,
          totalCommissionAmount: pendingCommissionAmount + paidCommissionAmount
        });
      }
    }

    const totalPendingValue = eligibleCollabs.reduce((sum, item) => sum + item.pendingCommissionAmount, 0);
    const totalPaidValue = eligibleCollabs.reduce((sum, item) => sum + item.paidCommissionAmount, 0);
    const totalSalesVolume = eligibleCollabs.reduce((sum, item) => sum + item.totalSalesAmount, 0);
    const totalOrdersCount = eligibleCollabs.reduce((sum, item) => sum + item.totalOrdersCount, 0);

    return {
      eligibleCollabs,
      totalPendingValue,
      totalPaidValue,
      totalSalesVolume,
      totalOrdersCount,
      totalPendingOrdersCount: eligibleCollabs.reduce((sum, item) => sum + item.pendingOrdersCount, 0)
    };
  }, [collaborators, periodFilteredSalesOrders, customers, commCollabFilter, commStatusFilter, commSearchTerm]);

  // CSV Export helper for collaborator commission breakdown
  const handleExportCSV = (item: any) => {
    const headers = ['ID Pedido', 'Data', 'Cliente', 'Segmento', 'Itens / Produtos', 'Valor Pedido (R$)', '% Comissão', 'Valor Comissão (R$)', 'Status Comissão'];
    const rows = item.allOrders.map((o: SalesOrder) => {
      const pct = (o.commissionPercentage !== undefined && o.commissionPercentage !== null && o.commissionPercentage > 0)
        ? o.commissionPercentage
        : (item.collaborator.commissionPercentage || 0);
      const commVal = (o.commissionValue && o.commissionValue > 0)
        ? o.commissionValue
        : ((o.value || 0) * pct) / 100;

      return [
        o.id,
        o.date || '',
        `"${String(o.client || '').replace(/"/g, '""')}"`,
        `"${String(o.clientSegment || 'Cliente Final').replace(/"/g, '""')}"`,
        `"${String(o.items || '').replace(/"/g, '""')}"`,
        (o.value || 0).toFixed(2),
        pct.toFixed(2),
        commVal.toFixed(2),
        o.commissionPaid ? 'PAGO' : 'PENDENTE'
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((e: string[]) => e.join(';'))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `relatorio_comissoes_${String(item.collaborator.name).replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Derive pending commission expense items for the financial ledger
  const commissionPendingExpenses = useMemo(() => {
    return commissionSummary.eligibleCollabs
      .filter(item => item.commissionAmount > 0)
      .map(item => ({
        id: `FTX-COMM-PEND-${item.collaborator.name}`,
        description: `Comissão Pendente - ${item.collaborator.name} (${item.pendingOrdersCount} ped. Cliente Final)`,
        type: 'DESPESA' as const,
        category: 'Comissões Pendentes',
        amount: item.commissionAmount,
        dueDate: new Date().toISOString().split('T')[0],
        status: 'PENDENTE' as const,
        clientOrSupplier: item.collaborator.name,
        paymentMethod: 'A Pagar (Crédito)'
      }));
  }, [commissionSummary]);

  // Derive paid commission payouts into expenses ledger
  const commissionPaidExpenses = useMemo(() => {
    return commissionPayouts.map(p => ({
      id: p.financialTransactionId || `FTX-COMM-PAID-${p.id}`,
      description: `Pagamento de Comissão - ${p.collaboratorName} (${p.orderCount} ped. Cliente Final)`,
      type: 'DESPESA' as const,
      category: 'Comissões de Vendas',
      amount: p.amount,
      dueDate: p.paymentDate,
      paymentDate: p.paymentDate,
      status: 'PAGO' as const,
      clientOrSupplier: p.collaboratorName,
      paymentMethod: 'Pix'
    }));
  }, [commissionPayouts]);

  // Combined transactions: derived from SalesOrders + PurchaseOrders + manualTransactions + Commissions
  const allTransactions = useMemo(() => {
    const TODAY = new Date('2026-07-10');
    const OVERDUE_LIMIT_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

    // 1. Derive from Sales Orders (excluding draft or cancelled ones)
    const derivedSales: FinancialTransaction[] = salesOrders
      .filter(so => so.status !== 'Orçamento' && so.status !== 'Cancelado')
      .flatMap(so => {
        const isBoleto = so.paymentMethod?.toLowerCase().includes('boleto');

        // Map sales status to financial status
        let status: 'PENDENTE' | 'PAGO' | 'ATRASADO' = 'PENDENTE';
        
        if (isBoleto) {
          if (so.boletoPaid) {
            status = 'PAGO';
          } else {
            const dueDateObj = so.boletoDueDate ? new Date(so.boletoDueDate) : null;
            if (dueDateObj && dueDateObj < TODAY) {
              status = 'ATRASADO';
            } else {
              status = 'PENDENTE';
            }
          }
        } else {
          if (so.status === 'Entregue') status = 'PAGO';
          else if (so.status === 'Enviado' || so.status === 'Faturado') status = 'PAGO'; // Assume received/billed

          // If delivery date has passed and status is pending, mark as overdue
          const isOverdue = so.status === 'Pendente' && so.deliveryDate && new Date(so.deliveryDate) < TODAY;
          if (isOverdue) status = 'ATRASADO';
        }

        const dueDate = isBoleto ? (so.boletoDueDate || so.deliveryDate || so.date) : (so.deliveryDate || so.date);

        // If there's a partial payment (paidAmount > 0 and paidAmount < value)
        if (so.paidAmount && so.paidAmount > 0 && so.paidAmount < so.value) {
          const paidPart: FinancialTransaction = {
            id: `FTX-${so.id}-PAID`,
            description: `Venda - Pedido ${so.id} (Parte Recebida)`,
            type: 'RECEITA',
            category: 'Vendas',
            amount: so.paidAmount,
            dueDate: so.date,
            paymentDate: so.date,
            status: 'PAGO',
            clientOrSupplier: so.client,
            paymentMethod: so.paymentMethod || 'Faturado PJ',
            salesOrderId: so.id
          };

          const openAmount = so.value - so.paidAmount;
          const openPart: FinancialTransaction = {
            id: `FTX-${so.id}-OPEN`,
            description: `Venda - Pedido ${so.id} (Saldo em Aberto)`,
            type: 'RECEITA',
            category: 'Vendas',
            amount: openAmount,
            dueDate,
            paymentDate: status === 'PAGO' ? so.date : undefined,
            status: status === 'PAGO' ? 'PENDENTE' : status,
            clientOrSupplier: so.client,
            paymentMethod: so.paymentMethod || 'Faturado PJ',
            salesOrderId: so.id
          };

          return [paidPart, openPart];
        }

        // If fully paid via paidAmount
        if (so.paidAmount && so.paidAmount >= so.value) {
          return [{
            id: `FTX-${so.id}`,
            description: `Venda - Pedido ${so.id} (Pago)`,
            type: 'RECEITA',
            category: 'Vendas',
            amount: so.value,
            dueDate,
            paymentDate: so.date,
            status: 'PAGO',
            clientOrSupplier: so.client,
            paymentMethod: so.paymentMethod || 'Faturado PJ',
            salesOrderId: so.id
          }];
        }

        return [{
          id: `FTX-${so.id}`,
          description: `Venda - Pedido ${so.id}`,
          type: 'RECEITA',
          category: 'Vendas',
          amount: so.value,
          dueDate,
          paymentDate: status === 'PAGO' ? so.date : undefined,
          status,
          clientOrSupplier: so.client,
          paymentMethod: so.paymentMethod || 'Faturado PJ',
          salesOrderId: so.id
        }];
      });

    // 2. Derive from Purchase Orders
    const derivedPurchases: FinancialTransaction[] = purchaseOrders
      .map(po => {
        let status: 'PENDENTE' | 'PAGO' | 'ATRASADO' = 'PENDENTE';
        if (po.status === 'Concluído') status = 'PAGO';

        // Check overdue (older than 30 days from anchor)
        const poDate = new Date(po.date);
        const isOverdue = po.status !== 'Concluído' && poDate.getTime() < (TODAY.getTime() - OVERDUE_LIMIT_MS);
        if (isOverdue) status = 'ATRASADO';

        return {
          id: `FTX-${po.id}`,
          description: `Compra - Ordem ${po.id}`,
          type: 'DESPESA',
          category: 'Matéria-Prima / Insumos',
          amount: po.value,
          dueDate: po.date,
          paymentDate: status === 'PAGO' ? po.date : undefined,
          status,
          clientOrSupplier: po.supplier,
          paymentMethod: 'Faturado Fornecedor',
          purchaseOrderId: po.id
        };
      });

    return [
      ...derivedSales, 
      ...derivedPurchases, 
      ...manualTransactions, 
      ...commissionPendingExpenses, 
      ...commissionPaidExpenses
    ];
  }, [salesOrders, purchaseOrders, manualTransactions, commissionPendingExpenses, commissionPaidExpenses]);

  // States for search and filter controls
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'TODOS' | 'RECEITA' | 'DESPESA'>('TODOS');
  const [statusFilter, setStatusFilter] = useState<'TODOS' | 'PENDENTE' | 'PAGO' | 'ATRASADO'>('TODOS');
  const [categoryFilter, setCategoryFilter] = useState('Todas');

  // Period filter state
  const [periodMode, setPeriodMode] = useState<'TODOS' | 'MES_ATUAL' | 'ULTIMOS_30' | 'ULTIMOS_90' | 'ANO_ATUAL' | 'PERSONALIZADO'>('TODOS');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Primary filtering of transactions by period
  const periodFilteredTransactions = useMemo(() => {
    const TODAY = new Date('2026-07-10');
    
    return allTransactions.filter(tx => {
      const txDateStr = tx.dueDate || ('paymentDate' in tx ? (tx as any).paymentDate : undefined);
      if (!txDateStr) return true;
      const txDate = new Date(txDateStr);
      
      switch (periodMode) {
        case 'MES_ATUAL': {
          // July 2026 (Month index 6)
          return txDate.getFullYear() === 2026 && txDate.getMonth() === 6;
        }
        case 'ULTIMOS_30': {
          const thirtyDaysAgo = new Date(TODAY);
          thirtyDaysAgo.setDate(TODAY.getDate() - 30);
          return txDate >= thirtyDaysAgo && txDate <= TODAY;
        }
        case 'ULTIMOS_90': {
          const ninetyDaysAgo = new Date(TODAY);
          ninetyDaysAgo.setDate(TODAY.getDate() - 90);
          return txDate >= ninetyDaysAgo && txDate <= TODAY;
        }
        case 'ANO_ATUAL': {
          return txDate.getFullYear() === 2026;
        }
        case 'PERSONALIZADO': {
          if (startDate) {
            const start = new Date(startDate + 'T00:00:00');
            if (txDate < start) return false;
          }
          if (endDate) {
            const end = new Date(endDate + 'T23:59:59');
            if (txDate > end) return false;
          }
          return true;
        }
        case 'TODOS':
        default:
          return true;
      }
    });
  }, [allTransactions, periodMode, startDate, endDate]);

  // Form State for manual entry
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDesc, setNewDesc] = useState('');
  const [newType, setNewType] = useState<'RECEITA' | 'DESPESA'>('DESPESA');
  const [newCategory, setNewCategory] = useState('Infraestrutura');
  const [newAmount, setNewAmount] = useState('');
  const [newDueDate, setNewDueDate] = useState('');
  const [newPartner, setNewPartner] = useState('');
  const [newMethod, setNewMethod] = useState('Pix');
  const [newNotes, setNewNotes] = useState('');

  // Categories list
  const categories = useMemo(() => {
    const list = new Set<string>();
    allTransactions.forEach(t => list.add(t.category));
    return ['Todas', ...Array.from(list)];
  }, [allTransactions]);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    const searchLower = String(searchTerm || '').toLowerCase();
    return periodFilteredTransactions.filter(tx => {
      const matchSearch =
        String(tx.description || '').toLowerCase().includes(searchLower) ||
        String(tx.id || '').toLowerCase().includes(searchLower) ||
        (tx.clientOrSupplier && String(tx.clientOrSupplier).toLowerCase().includes(searchLower));

      const matchType = typeFilter === 'TODOS' || tx.type === typeFilter;
      const matchStatus = statusFilter === 'TODOS' || tx.status === statusFilter;
      const matchCategory = categoryFilter === 'Todas' || tx.category === categoryFilter;

      return matchSearch && matchType && matchStatus && matchCategory;
    });
  }, [periodFilteredTransactions, searchTerm, typeFilter, statusFilter, categoryFilter]);

  // Boletos Due Today Alert Calculation
  const boletosDueToday = useMemo(() => {
    const TODAY_STR = '2026-07-10'; // Matches the system anchor date
    return salesOrders.filter(so => {
      const isBoleto = so.paymentMethod?.toLowerCase().includes('boleto');
      const isPending = !so.boletoPaid;
      const isDueToday = so.boletoDueDate === TODAY_STR;
      return isBoleto && isPending && isDueToday;
    });
  }, [salesOrders]);

  // Financial Dashboard Metrics
  const metrics = useMemo(() => {
    let totalIncomeRealized = 0;
    let totalIncomePending = 0;
    let totalExpenseRealized = 0;
    let totalExpensePending = 0;

    periodFilteredTransactions.forEach(tx => {
      if (tx.type === 'RECEITA') {
        if (tx.status === 'PAGO') {
          totalIncomeRealized += tx.amount;
        } else {
          totalIncomePending += tx.amount;
        }
      } else {
        if (tx.status === 'PAGO') {
          totalExpenseRealized += tx.amount;
        } else {
          totalExpensePending += tx.amount;
        }
      }
    });

    const netCashFlow = totalIncomeRealized - totalExpenseRealized;
    const totalReceivables = totalIncomePending;
    const totalPayables = totalExpensePending;

    return {
      totalIncomeRealized,
      totalIncomePending,
      totalExpenseRealized,
      totalExpensePending,
      netCashFlow,
      totalReceivables,
      totalPayables
    };
  }, [periodFilteredTransactions]);

  // Quick action: Toggle payment status of manual transactions
  const handleToggleStatus = (id: string) => {
    if (id.startsWith('FTX-VD-')) {
      const orderId = id.replace('FTX-', '');
      const order = salesOrders.find(o => o.id === orderId);
      if (order && order.paymentMethod?.toLowerCase().includes('boleto')) {
        if (onUpdateSalesOrder) {
          const nextPaid = !order.boletoPaid;
          const nextPaymentStatus = nextPaid ? 'Pago' : 'Pendente';
          onUpdateSalesOrder(order.id, { boletoPaid: nextPaid, paymentStatus: nextPaymentStatus });
          alert(`Boleto do Pedido ${order.id} ${nextPaid ? 'BAIXADO COM SUCESSO! Registrado como entrada.' : 'marcado como PENDENTE.'}`);
          return;
        }
      }
    }

    if (!id.startsWith('FTX-00')) {
      // Derived from Orders
      alert('As transações integradas a Pedidos de Venda ou Ordens de Compra devem ser baixadas alterando o status do próprio Pedido correspondente.');
      return;
    }

    if (onToggleManualTransactionStatus) {
      const tx = manualTransactions.find((t: FinancialTransaction) => t.id === id);
      const targetStatus = tx?.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
      onToggleManualTransactionStatus(id, targetStatus);
    } else {
      setManualTransactions((prev: FinancialTransaction[]) =>
        prev.map((tx: FinancialTransaction) => {
          if (tx.id === id) {
            const nextStatus = tx.status === 'PAGO' ? 'PENDENTE' : 'PAGO';
            return {
              ...tx,
              status: nextStatus,
              paymentDate: nextStatus === 'PAGO' ? new Date().toISOString().split('T')[0] : undefined
            };
          }
          return tx;
        })
      );
    }
  };

  // Delete manual transaction
  const handleDeleteManual = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!id.startsWith('FTX-00')) {
      alert('Apenas transações inseridas manualmente podem ser excluídas diretamente daqui.');
      return;
    }
    if (confirm('Tem certeza que deseja excluir esta transação financeira?')) {
      setManualTransactions((prev: FinancialTransaction[]) => prev.filter((tx: FinancialTransaction) => tx.id !== id));
    }
  };

  // Handle Form submit
  const handleCreateTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDesc || !newAmount || !newDueDate) {
      alert('Preencha os campos obrigatórios (*)');
      return;
    }

    const value = parseFloat(newAmount);
    if (isNaN(value) || value <= 0) {
      alert('O valor inserido deve ser maior que zero');
      return;
    }

    const newTx: FinancialTransaction = {
      id: `FTX-00${manualTransactions.length + 6}`,
      description: newDesc,
      type: newType,
      category: newCategory,
      amount: value,
      dueDate: newDueDate,
      status: 'PENDENTE',
      clientOrSupplier: newPartner || undefined,
      paymentMethod: newMethod,
      notes: newNotes || undefined
    };

    setManualTransactions((prev: FinancialTransaction[]) => [newTx, ...prev]);
    setIsAddModalOpen(false);

    // Reset Form
    setNewDesc('');
    setNewAmount('');
    setNewDueDate('');
    setNewPartner('');
    setNewNotes('');
  };

  // Static/Animated SVG Bar Chart for Cashflow Inflow vs Outflow over Categories
  const categoryChartData = useMemo(() => {
    const catsMap: { [key: string]: { income: number; expense: number } } = {};
    
    periodFilteredTransactions.forEach(tx => {
      if (!catsMap[tx.category]) {
        catsMap[tx.category] = { income: 0, expense: 0 };
      }
      if (tx.type === 'RECEITA') {
        catsMap[tx.category].income += tx.amount;
      } else {
        catsMap[tx.category].expense += tx.amount;
      }
    });

    return Object.entries(catsMap).map(([name, val]) => ({
      name,
      income: val.income,
      expense: val.expense,
      total: val.income + val.expense
    })).sort((a, b) => b.total - a.total).slice(0, 5); // top 5 categories
  }, [periodFilteredTransactions]);

  // Execute commission payout and zero out credits
  const handleConfirmPayout = () => {
    if (!selectedCollabPayout) return;

    const { collaborator, eligibleOrders, commissionAmount } = selectedCollabPayout;
    if (!eligibleOrders || eligibleOrders.length === 0 || commissionAmount <= 0) {
      alert('Não há créditos pendentes válidos para realizar o pagamento.');
      return;
    }

    const payoutId = `PAYOUT-${Date.now()}`;
    const todayStr = new Date().toISOString().split('T')[0];

    const payout: CommissionPayout = {
      id: payoutId,
      collaboratorName: collaborator.name,
      amount: commissionAmount,
      percentage: collaborator.commissionPercentage || 0,
      periodStart: eligibleOrders[0]?.date || todayStr,
      periodEnd: eligibleOrders[eligibleOrders.length - 1]?.date || todayStr,
      paymentDate: todayStr,
      orderCount: eligibleOrders.length,
      salesOrderIds: eligibleOrders.map((o: SalesOrder) => o.id),
      financialTransactionId: `FTX-COMM-PAID-${payoutId}`,
      notes: payoutNotes || `Pagamento de comissão zerado por ADM em ${todayStr}`
    };

    const updatedOrders: SalesOrder[] = eligibleOrders.map((o: SalesOrder) => ({
      ...o,
      commissionPaid: true,
      commissionPayoutId: payoutId
    }));

    const newExpenseTx: FinancialTransaction = {
      id: `FTX-COMM-PAID-${payoutId}`,
      description: `Pagamento de Comissão - ${collaborator.name} (${eligibleOrders.length} ped. Cliente Final)`,
      type: 'DESPESA',
      category: 'Comissões de Vendas',
      amount: commissionAmount,
      dueDate: todayStr,
      paymentDate: todayStr,
      status: 'PAGO',
      clientOrSupplier: collaborator.name,
      paymentMethod: 'Pix',
      notes: payoutNotes || `Crédito zerado pelo financeiro em ${todayStr}`
    };

    if (onAddCommissionPayout) {
      onAddCommissionPayout(payout, updatedOrders, newExpenseTx);
    } else {
      if (onUpdateSalesOrder) {
        updatedOrders.forEach(o => onUpdateSalesOrder(o.id, { commissionPaid: true, commissionPayoutId: payoutId }));
      }
      if (onAddManualTransaction) {
        onAddManualTransaction(newExpenseTx);
      }
    }

    alert(`PAGAMENTO DE COMISSÃO REALIZADO COM SUCESSO!\n\nColaborador: ${collaborator.name}\nValor Pago: R$ ${commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}\nOs créditos foram zerados e a despesa foi registrada no financeiro.`);
    setSelectedCollabPayout(null);
    setPayoutNotes('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. Header and Add Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-slate-100 rounded-lg text-slate-800">
              <DollarSign className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Fluxo Financeiro & Comissões
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Gestão integrada de faturamentos, contas a pagar, receber, despesas e controle de comissão de colaboradores.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Subtab Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/60 shadow-3xs">
            <button
              type="button"
              onClick={() => setActiveSubTab('LANÇAMENTOS')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeSubTab === 'LANÇAMENTOS'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Lançamentos & Caixa
            </button>
            <button
              type="button"
              onClick={() => setActiveSubTab('COMISSOES')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                activeSubTab === 'COMISSOES'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Relatório de Comissões</span>
              {commissionSummary.totalPendingValue > 0 && (
                <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-md ${
                  activeSubTab === 'COMISSOES' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-900'
                }`}>
                  R$ {commissionSummary.totalPendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              )}
            </button>
          </div>

          {activeSubTab === 'LANÇAMENTOS' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-950 hover:bg-slate-900 text-white text-xs font-medium rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Lançar Movimentação
            </button>
          )}
        </div>
      </div>

      {/* 1.5. Subtab Condition: LANÇAMENTOS */}
      {activeSubTab === 'LANÇAMENTOS' && (
        <>
          {/* Period Verification Mode Control Panel */}
          <div className="bg-white rounded-xl border border-slate-200/60 p-4 shadow-3xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="p-1.5 bg-slate-50 text-slate-600 rounded-lg border border-slate-100 shrink-0">
            <Calendar className="w-4 h-4" />
          </span>
          <div>
            <h4 className="text-xs font-bold text-slate-800 tracking-wide font-sans">Verificação por Período</h4>
            <p className="text-[10px] text-slate-400">Verifique a movimentação e métricas em intervalos específicos</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/70 p-1 rounded-lg">
            {[
              { id: 'TODOS', label: 'Todo Período' },
              { id: 'MES_ATUAL', label: 'Este Mês (Jul/26)' },
              { id: 'ULTIMOS_30', label: 'Últimos 30 dias' },
              { id: 'ULTIMOS_90', label: 'Últimos 90 dias' },
              { id: 'ANO_ATUAL', label: 'Ano de 2026' },
              { id: 'PERSONALIZADO', label: 'Personalizado' },
            ].map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => setPeriodMode(item.id as any)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                  periodMode === item.id
                    ? 'bg-white text-slate-900 shadow-3xs border-b border-slate-100 font-semibold'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          {periodMode === 'PERSONALIZADO' && (
            <div className="flex items-center gap-2 animate-in slide-in-from-right-2 duration-200">
              <span className="text-[10px] text-slate-400 font-mono">De</span>
              <input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="text-xs border border-slate-200 px-2 py-1 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-700"
              />
              <span className="text-[10px] text-slate-400 font-mono">até</span>
              <input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="text-xs border border-slate-200 px-2 py-1 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-700"
              />
            </div>
          )}
        </div>
      </div>

      {/* Alert for Boletos Due Today */}
      {boletosDueToday.length > 0 && (
        <div className="bg-amber-50/40 border border-amber-200/60 p-4 rounded-xl shadow-xs animate-in slide-in-from-top-4 duration-250">
          <div className="flex items-start gap-3">
            <div className="bg-amber-100 text-amber-800 p-1.5 rounded-lg shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div className="flex-1 space-y-2">
              <div>
                <h5 className="text-xs font-bold text-amber-900 tracking-wide font-sans">Boletos Vencendo Hoje ({boletosDueToday.length})</h5>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Os seguintes boletos de clientes estão com vencimento programado para hoje. Registre a baixa para computar no caixa ativo:
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {boletosDueToday.map(so => (
                  <div key={so.id} className="flex items-center justify-between bg-white/80 p-2 rounded-lg border border-amber-200/40 text-xs text-slate-700">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="bg-amber-100 text-amber-900 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold shrink-0">{so.id}</span>
                      <span className="truncate font-medium text-slate-900">{so.client}</span>
                      <span className="text-slate-400 font-mono text-[10px] shrink-0">R$ {so.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onUpdateSalesOrder) {
                          onUpdateSalesOrder(so.id, { boletoPaid: true });
                          alert(`Boleto do Pedido ${so.id} baixado com sucesso! Contabilizado como Entrada.`);
                        }
                      }}
                      className="text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-2 py-1 rounded transition-colors cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      Dar Baixa
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Visual KPIs - Minimal Bento Style */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Realized Income */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-3xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider font-mono">Receitas Realizadas</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalIncomeRealized)}
            </h3>
            <p className="text-[9px] text-slate-400 mt-1">
              Valores liquidados e disponíveis
            </p>
          </div>
        </div>

        {/* KPI 2: Accounts Receivable */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-3xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider font-mono">Contas a Receber</span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalReceivables)}
            </h3>
            <p className="text-[9px] text-slate-400 mt-1">
              Faturamento comercial a faturar
            </p>
          </div>
        </div>

        {/* KPI 3: Accounts Payable */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-3xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider font-mono">Contas a Pagar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          </div>
          <div className="mt-2">
            <h3 className="text-lg font-bold text-slate-900 font-mono tracking-tight">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalPayables + metrics.totalExpenseRealized)}
            </h3>
            <p className="text-[9px] text-slate-400 mt-1">
              Previsão de saídas homologadas
            </p>
          </div>
        </div>

        {/* KPI 4: Cash Flow Balance */}
        <div className="bg-white rounded-xl border border-slate-200/70 p-4 shadow-3xs flex flex-col justify-between min-h-[105px]">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wider font-mono">Saldo Operacional</span>
            <span className={`w-1.5 h-1.5 rounded-full ${metrics.netCashFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          </div>
          <div className="mt-2">
            <h3 className={`text-lg font-bold font-mono tracking-tight ${metrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.netCashFlow)}
            </h3>
            <p className="text-[9px] text-slate-400 mt-1">
              Receitas (-) Despesas liquidadas
            </p>
          </div>
        </div>
      </div>

      {/* 3. Analytics Section: Category Distribution & Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: SVG Chart of Top Categories */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200/60 p-5 shadow-3xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-sans">Categorias por Fluxo Financeiro</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">Top 5 categorias ordenadas pelo volume total integrado</p>
          </div>

          <div className="mt-5 space-y-4">
            {categoryChartData.map((cat) => {
              const maxVal = Math.max(...categoryChartData.map(c => Math.max(c.income, c.expense)));
              const incomePct = maxVal > 0 ? (cat.income / maxVal) * 100 : 0;
              const expensePct = maxVal > 0 ? (cat.expense / maxVal) * 100 : 0;

              return (
                <div key={cat.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-700 font-medium">{cat.name}</span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(cat.total)}
                    </span>
                  </div>
                  <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden flex">
                    {/* Income Bar (Green) */}
                    {cat.income > 0 && (
                      <div 
                        style={{ width: `${incomePct * 0.5}%` }} 
                        className="h-full bg-emerald-500/80 hover:bg-emerald-500 transition-all rounded-l-full"
                        title={`Receita: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.income)}`}
                      />
                    )}
                    {/* Expense Bar (Red) */}
                    {cat.expense > 0 && (
                      <div 
                        style={{ width: `${expensePct * 0.5}%` }} 
                        className="h-full bg-rose-500/80 hover:bg-rose-500 transition-all rounded-r-full"
                        title={`Despesa: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(cat.expense)}`}
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[9px] font-medium text-slate-500 uppercase mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span>Entradas / Receitas</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 bg-rose-500 rounded-full" />
              <span>Saídas / Despesas</span>
            </div>
          </div>
        </div>

        {/* Right Column: Mini Accounts summary & Quick Insight */}
        <div className="bg-slate-50/50 rounded-xl border border-slate-200/60 p-5 flex flex-col justify-between shadow-3xs">
          <div>
            <span className="text-[9px] font-bold tracking-widest text-slate-400 uppercase font-mono">DRE Operacional</span>
            <h2 className="text-sm font-bold text-slate-800 mt-0.5">Dedução de Resultado e Caixa</h2>
            
            <div className="mt-4 space-y-2.5 text-xs border-t border-slate-100 pt-4 font-sans">
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1 text-slate-500"><span className="font-mono text-[10px] text-emerald-600 font-bold">+</span> Entradas Liquidadas</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalIncomeRealized)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span className="flex items-center gap-1 text-slate-500"><span className="font-mono text-[10px] text-rose-600 font-bold">-</span> Saídas Liquidadas</span>
                <span className="font-mono text-slate-900 font-semibold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalExpenseRealized)}
                </span>
              </div>
              
              <div className="h-px bg-slate-200/60 my-1" />

              <div className="flex justify-between items-center text-slate-800 font-bold">
                <span>Saldo Realizado</span>
                <span className={`font-mono ${metrics.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-700'}`}>
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.netCashFlow)}
                </span>
              </div>
              
              <div className="h-px bg-slate-200/60 my-1" />

              <div className="flex justify-between items-center text-slate-500">
                <span className="flex items-center gap-1"><span className="font-mono text-[10px]">+</span> Receitas Pendentes</span>
                <span className="font-mono text-slate-700 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalReceivables)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-500">
                <span className="flex items-center gap-1"><span className="font-mono text-[10px]">-</span> Despesas Pendentes</span>
                <span className="font-mono text-slate-700 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.totalPayables)}
                </span>
              </div>

              <div className="h-px bg-slate-200/60 my-1" />

              <div className="flex justify-between items-center text-slate-900 font-bold">
                <span>Projeção de Caixa Futura</span>
                <span className="font-mono text-slate-950 font-bold">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.netCashFlow + metrics.totalReceivables - metrics.totalPayables)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-5 p-2 bg-white rounded-lg border border-slate-150 flex items-start gap-2 text-[10px] text-slate-500">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              A projeção engloba pedidos em carteira e faturamentos programados.
            </p>
          </div>
        </div>
      </div>

      {/* 4. Transactions Ledger / List */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-3xs space-y-4">
        {/* Ledger Control Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          {/* Segmented Filter Pills */}
          <div className="flex flex-wrap items-center gap-1 bg-slate-100/70 p-1 rounded-lg self-start">
            <button
              onClick={() => setTypeFilter('TODOS')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                typeFilter === 'TODOS' ? 'bg-white text-slate-900 shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Todos ({allTransactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('RECEITA')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                typeFilter === 'RECEITA' ? 'bg-emerald-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Entradas
            </button>
            <button
              onClick={() => setTypeFilter('DESPESA')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer ${
                typeFilter === 'DESPESA' ? 'bg-rose-600 text-white shadow-3xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Saídas
            </button>
            <span className="h-4 w-px bg-slate-200 mx-1"></span>
            <button
              onClick={() => setStatusFilter(statusFilter === 'PENDENTE' ? 'TODOS' : 'PENDENTE')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'PENDENTE' ? 'bg-amber-100 text-amber-800' : 'text-slate-500 hover:text-slate-855'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter(statusFilter === 'ATRASADO' ? 'TODOS' : 'ATRASADO')}
              className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'ATRASADO' ? 'bg-red-100 text-red-800 font-bold' : 'text-slate-500 hover:text-slate-855'
              }`}
            >
              Atrasados
            </button>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="relative w-full sm:w-56">
              <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Filtrar lançamentos..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 focus:outline-none focus:ring-1 focus:ring-slate-400 text-slate-700"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0 justify-end">
              <select
                className="text-xs border border-slate-200 px-2 py-1.5 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 font-medium text-slate-600"
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
              >
                {categories.map(c => (
                  <option key={c} value={c}>{c === 'Todas' ? 'Todas Categorias' : c}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ledger Table */}
        <div className="overflow-x-auto mt-4 border border-slate-100 rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100">
                <th className="py-3 px-4">Lançamento / Descrição</th>
                <th className="py-3 px-4">Cliente / Fornecedor</th>
                <th className="py-3 px-4">Categoria</th>
                <th className="py-3 px-4 font-mono">Vencimento</th>
                <th className="py-3 px-4 font-mono text-right">Valor</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400 font-medium italic">
                    Nenhuma movimentação financeira encontrada para os critérios informados.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map(tx => {
                  const isManual = tx.id.startsWith('FTX-00');

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-800">{tx.description}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1 py-0.2 rounded font-bold">
                            {tx.id}
                          </span>
                          {tx.paymentMethod && (
                            <span className="text-[8px] font-mono text-indigo-500 bg-indigo-50/40 px-1.5 py-0.2 rounded font-semibold">
                              {tx.paymentMethod}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {tx.clientOrSupplier || <span className="text-slate-400 font-normal">Não informado</span>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200/50 rounded-md text-[10px] font-semibold text-slate-500 uppercase font-mono">
                          {tx.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-medium text-slate-500">
                        {tx.dueDate ? new Date(tx.dueDate).toLocaleDateString('pt-BR') : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-mono font-bold text-sm ${
                        tx.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'RECEITA' ? '+' : '-'}
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(tx.amount)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(tx.id)}
                          title={isManual ? 'Clique para alternar o pagamento' : 'Lançamento integrado - Baixe no módulo original'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase transition-all shadow-sm ${
                            tx.status === 'PAGO'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-emerald-100/50'
                              : tx.status === 'PENDENTE'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100 hover:bg-amber-100/50'
                              : 'bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100/50 animate-pulse'
                          } ${isManual ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                        >
                          {tx.status === 'PAGO' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : tx.status === 'PENDENTE' ? (
                            <Clock className="w-3 h-3" />
                          ) : (
                            <AlertTriangle className="w-3 h-3" />
                          )}
                          {tx.status}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isManual ? (
                            <button
                              onClick={(e) => handleDeleteManual(tx.id, e)}
                              className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
                              title="Excluir Lançamento Manual"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 uppercase font-mono px-1.5 py-0.5 bg-slate-50 border border-slate-100 rounded">
                              Integrado
                            </span>
                          )}
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
      </>
      )}

      {/* 1.5. Subtab Condition: COMISSOES */}
      {activeSubTab === 'COMISSOES' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Rule Notification Banner */}
          <div className="bg-emerald-50/60 border border-emerald-200/80 p-4 rounded-xl flex items-start gap-3">
            <div className="bg-emerald-100 text-emerald-800 p-2 rounded-lg shrink-0 mt-0.5">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-emerald-950 uppercase tracking-wide">
                Regra Operacional de Comissões (Apenas Cliente Final)
              </h4>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                As comissões são calculadas automaticamente com base no percentual cadastrado no perfil de cada colaborador elegível, <strong>exclusivamente para vendas destinadas a &quot;Cliente Final&quot;</strong> (vendas para &quot;Lojista&quot; são isentas de comissão). Utilize os filtros abaixo para visualizar os relatórios detalhados por <strong>Colaborador, Período e Pedidos Específicos</strong>.
              </p>
            </div>
          </div>

          {/* COMMISSION FILTER CONTROL BAR */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-3xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Filtros do Relatório de Comissões</h3>
              </div>
              {(commCollabFilter !== 'TODOS' || commPeriodPreset !== 'TODOS' || commStatusFilter !== 'TODOS' || commSearchTerm) && (
                <button
                  type="button"
                  onClick={() => {
                    setCommCollabFilter('TODOS');
                    setCommPeriodPreset('TODOS');
                    setCommStatusFilter('TODOS');
                    setCommSearchTerm('');
                    setCommStartDate('');
                    setCommEndDate('');
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold underline cursor-pointer"
                >
                  Limpar Todos os Filtros
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Filter 1: By Collaborator */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Colaborador / Vendedor</label>
                <select
                  value={commCollabFilter}
                  onChange={e => setCommCollabFilter(e.target.value)}
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700"
                >
                  <option value="TODOS">Todos os Colaboradores</option>
                  {collaborators.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.commissionPercentage || 0}%)
                    </option>
                  ))}
                  <option value="Outros Operadores / Geral">Outros Operadores / Geral</option>
                </select>
              </div>

              {/* Filter 2: By Period Preset */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Período de Aferição</label>
                <select
                  value={commPeriodPreset}
                  onChange={e => setCommPeriodPreset(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700"
                >
                  <option value="TODOS">Todos os Períodos (Geral)</option>
                  <option value="ESTE_MES">Este Mês (Mês Atual)</option>
                  <option value="MES_ANTERIOR">Mês Anterior</option>
                  <option value="ULTIMOS_30">Últimos 30 Dias</option>
                  <option value="ANO_ATUAL">Ano Atual (2026)</option>
                  <option value="CUSTOM">Personalizado (Data de/até)</option>
                </select>
              </div>

              {/* Filter 3: By Commission Status */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Status da Comissão</label>
                <select
                  value={commStatusFilter}
                  onChange={e => setCommStatusFilter(e.target.value as any)}
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700"
                >
                  <option value="TODOS">Todas (Pendentes e Pagas)</option>
                  <option value="PENDENTE">Somente Pendentes (A Zerar)</option>
                  <option value="PAGO">Somente Já Quitadas (Pagas)</option>
                </select>
              </div>

              {/* Filter 4: Text Search */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Buscar Pedido / Cliente / Produto</label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Ex: #VD-001, Maria, Coifa..."
                    value={commSearchTerm}
                    onChange={e => setCommSearchTerm(e.target.value)}
                    className="w-full text-xs border border-slate-200 pl-8 pr-3 py-1.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>
              </div>
            </div>

            {/* Custom Date Inputs if CUSTOM mode selected */}
            {commPeriodPreset === 'CUSTOM' && (
              <div className="flex items-center gap-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                <div className="flex-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Data Inicial</label>
                  <input
                    type="date"
                    value={commStartDate}
                    onChange={e => setCommStartDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Data Final</label>
                  <input
                    type="date"
                    value={commEndDate}
                    onChange={e => setCommEndDate(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-1.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Key Executive Metrics Cards for Filtered Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Volume de Vendas</span>
              <h3 className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                R$ {commissionSummary.totalSalesVolume.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Vendas elegíveis no filtro</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-emerald-100 bg-emerald-50/20 shadow-3xs">
              <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-wider font-mono block">Créditos Pendentes</span>
              <h3 className="text-lg font-bold text-emerald-700 font-mono mt-0.5">
                R$ {commissionSummary.totalPendingValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-emerald-600 mt-0.5">A pagar aos vendedores</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-indigo-100 bg-indigo-50/20 shadow-3xs">
              <span className="text-[9px] font-bold text-indigo-800 uppercase tracking-wider font-mono block">Comissões Quitadas</span>
              <h3 className="text-lg font-bold text-indigo-700 font-mono mt-0.5">
                R$ {commissionSummary.totalPaidValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-indigo-600 mt-0.5">Já baixadas pelo ADM</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Comissão Total Aferida</span>
              <h3 className="text-lg font-bold text-slate-800 font-mono mt-0.5">
                R$ {(commissionSummary.totalPendingValue + commissionSummary.totalPaidValue).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Pendente + Quitada</p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-3xs">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-mono block">Qtd. Pedidos Elegíveis</span>
              <h3 className="text-lg font-bold text-slate-900 font-mono mt-0.5">
                {commissionSummary.totalOrdersCount} Pedidos
              </h3>
              <p className="text-[9px] text-slate-400 mt-0.5">Com comissão gerada</p>
            </div>
          </div>

          {/* SECTION 1: RELATÓRIO POR COLABORADOR COM DETALHAMENTO DE PEDIDOS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
                  <User className="w-4 h-4 text-indigo-600" />
                  Relatório por Colaborador & Pedidos Geradores de Comissão
                </h3>
                <p className="text-[11px] text-slate-500">
                  Clique no botão do colaborador para expandir a lista com os pedidos exatos que geraram cada comissão.
                </p>
              </div>
              <span className="text-[10px] bg-slate-100 font-mono font-bold text-slate-600 px-2 py-1 rounded">
                {commissionSummary.eligibleCollabs.length} Colaborador(es)
              </span>
            </div>

            {commissionSummary.eligibleCollabs.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 italic space-y-2">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto" />
                <p>Nenhum registro de comissão encontrado para os filtros selecionados.</p>
              </div>
            ) : (
              commissionSummary.eligibleCollabs.map(item => {
                const collabName = item.collaborator.name;
                const isExpanded = !!expandedCollabCards[collabName];

                return (
                  <div key={collabName} className="bg-white rounded-xl border border-slate-200 shadow-3xs overflow-hidden transition-all">
                    {/* Collaborator Card Header */}
                    <div className="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-black text-sm shrink-0">
                          {collabName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-slate-900 text-sm">{collabName}</h4>
                            <span className="px-2 py-0.5 bg-indigo-50 border border-indigo-100 text-indigo-700 text-[10px] font-bold rounded-full font-mono">
                              Taxa: {item.collaborator.commissionPercentage || 0}%
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium">
                            {item.collaborator.role || 'Vendedor'} • {item.collaborator.email || 'vendas@estilocoifas.com.br'}
                          </p>
                        </div>
                      </div>

                      {/* KPI Summary Pill for this Collaborator */}
                      <div className="flex flex-wrap items-center gap-3 text-xs">
                        <div className="bg-white px-3 py-1.5 rounded-lg border border-slate-200 font-mono">
                          <span className="text-[9px] text-slate-400 uppercase font-bold block">Vendas</span>
                          <span className="font-bold text-slate-800">
                            R$ {item.totalSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="bg-emerald-50/80 px-3 py-1.5 rounded-lg border border-emerald-200/80 font-mono">
                          <span className="text-[9px] text-emerald-800 uppercase font-bold block">Pendente (A Zerar)</span>
                          <span className="font-bold text-emerald-700">
                            R$ {item.pendingCommissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        <div className="bg-indigo-50/80 px-3 py-1.5 rounded-lg border border-indigo-200/80 font-mono">
                          <span className="text-[9px] text-indigo-800 uppercase font-bold block">Quitado (Pago)</span>
                          <span className="font-bold text-indigo-700">
                            R$ {item.paidCommissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          {item.pendingCommissionAmount > 0 && (
                            <button
                              type="button"
                              onClick={() => setSelectedCollabPayout(item)}
                              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                              title="Pagar e Zerar Créditos Pendentes"
                            >
                              <DollarSign className="w-3.5 h-3.5" />
                              <span>Pagar / Zerar</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => setDetailedReportCollab(item)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] rounded-lg shadow-2xs transition-all cursor-pointer inline-flex items-center gap-1"
                            title="Abrir Relatório Analítico de Pedidos"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>Relatório Detalhado</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleExportCSV(item)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all cursor-pointer"
                            title="Baixar Planilha CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setExpandedCollabCards(prev => ({ ...prev, [collabName]: !prev[collabName] }))}
                            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold text-[11px] rounded-lg transition-all cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>{isExpanded ? 'Ocultar Pedidos' : `Ver Pedidos (${item.totalOrdersCount})`}</span>
                            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Table: Exact Orders that generated this Commission */}
                    {isExpanded && (
                      <div className="p-4 bg-slate-50/30 border-t border-slate-100 space-y-3 animate-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center justify-between">
                          <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                            <ShoppingBag className="w-3.5 h-3.5 text-indigo-600" />
                            Pedidos Que Geraram Comissão para {collabName} ({item.totalOrdersCount} Pedidos)
                          </h5>
                          <span className="text-[10px] text-slate-400 font-mono">
                            Apenas vendas destinadas a Cliente Final
                          </span>
                        </div>

                        {item.allOrders.length === 0 ? (
                          <div className="p-4 bg-white rounded-lg border border-slate-200 text-center text-slate-400 italic text-xs">
                            Nenhum pedido encontrado para o filtro selecionado.
                          </div>
                        ) : (
                          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
                            <table className="w-full text-left border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-wider font-mono border-b border-slate-200">
                                  <th className="py-2.5 px-3">Nº Pedido</th>
                                  <th className="py-2.5 px-3 font-mono">Data</th>
                                  <th className="py-2.5 px-3">Cliente / Razão Social</th>
                                  <th className="py-2.5 px-3">Itens / Produtos</th>
                                  <th className="py-2.5 px-3 text-right font-mono">Valor Pedido (R$)</th>
                                  <th className="py-2.5 px-3 text-center">% Comissão</th>
                                  <th className="py-2.5 px-3 text-right font-mono">Comissão Gerada (R$)</th>
                                  <th className="py-2.5 px-3 text-center">Status Comissão</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                                {item.allOrders.map((o: SalesOrder) => {
                                  const orderPct = (o.commissionPercentage !== undefined && o.commissionPercentage !== null && o.commissionPercentage > 0)
                                    ? o.commissionPercentage
                                    : (item.collaborator.commissionPercentage || 0);
                                  const commVal = (o.commissionValue && o.commissionValue > 0)
                                    ? o.commissionValue
                                    : ((o.value || 0) * orderPct) / 100;

                                  return (
                                    <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                                      <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">
                                        <div className="flex items-center gap-1.5">
                                          <span>{o.id}</span>
                                          <span className="text-[8px] px-1.5 py-0.2 rounded font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                            {o.status}
                                          </span>
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                                        {o.date ? new Date(o.date + (o.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '-'}
                                      </td>
                                      <td className="py-2.5 px-3 font-semibold text-slate-900">
                                        <div>{o.client}</div>
                                        <div className="text-[9px] text-slate-400 font-normal">
                                          {o.clientSegment || 'Cliente Final'}
                                        </div>
                                      </td>
                                      <td className="py-2.5 px-3 text-[11px] text-slate-600 max-w-xs truncate" title={o.items}>
                                        {o.items || 'Produtos sob medida'}
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-800">
                                        R$ {(o.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-center font-mono font-bold text-indigo-600">
                                        {orderPct}%
                                      </td>
                                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                                        R$ {commVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                      </td>
                                      <td className="py-2.5 px-3 text-center">
                                        {o.commissionPaid ? (
                                          <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono inline-flex items-center gap-1">
                                            <CheckCircle2 className="w-3 h-3" />
                                            QUITADA
                                          </span>
                                        ) : (
                                          <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold font-mono inline-flex items-center gap-1">
                                            <Clock className="w-3 h-3" />
                                            PENDENTE
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* SECTION 2: HISTÓRICO DE PAGAMENTOS QUITADOS */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-3xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                  Histórico Permanente de Comissões Pagas (Quitadas)
                </h3>
                <p className="text-[11px] text-slate-500">
                  Registro oficial de baixas realizadas com lançamento integrado de despesa financeira.
                </p>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-800 font-mono font-bold px-2 py-1 rounded">
                {commissionPayouts.length} Pagamento(s) Baixado(s)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono border-b border-slate-100">
                    <th className="py-3 px-4">Código / Data Quitação</th>
                    <th className="py-3 px-4">Colaborador</th>
                    <th className="py-3 px-4 text-center">Taxa (%)</th>
                    <th className="py-3 px-4 text-center">Qtd. Pedidos</th>
                    <th className="py-3 px-4 text-right font-mono">Valor Pago (R$)</th>
                    <th className="py-3 px-4 text-center">Status Financeiro</th>
                    <th className="py-3 px-4">Observações do ADM</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                  {commissionPayouts.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-400 italic">
                        Nenhum histórico de baixa de comissão registrado até o momento.
                      </td>
                    </tr>
                  ) : (
                    commissionPayouts.map(payout => (
                      <tr key={payout.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-[10px]">
                          <div className="font-bold text-slate-800">{payout.id}</div>
                          <div className="text-slate-400">{payout.paymentDate}</div>
                        </td>
                        <td className="py-3 px-4 font-bold text-slate-900">
                          {payout.collaboratorName}
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold text-indigo-600">
                          {payout.percentage}%
                        </td>
                        <td className="py-3 px-4 text-center font-mono font-bold">
                          {payout.orderCount} pedido(s)
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-emerald-700">
                          R$ {payout.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2 py-0.5 rounded font-mono inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            DESPESA PAGA
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-500 text-[11px] truncate max-w-xs">
                          {payout.notes || 'Quitado pelo Administrador'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DETALHADO COMPLETO POR COLABORADOR */}
      {detailedReportCollab && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg">
                  <FileText className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-base tracking-tight">
                    Relatório Analítico de Comissões por Pedido
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    Demonstrativo detalhado de vendas e créditos do colaborador {detailedReportCollab.collaborator.name}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setDetailedReportCollab(null);
                  setModalSearchTerm('');
                }}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-700">
              {/* Report Header Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-bold uppercase text-indigo-600 tracking-wider">Perfil do Colaborador</span>
                  <h4 className="text-lg font-black text-slate-900">{detailedReportCollab.collaborator.name}</h4>
                  <p className="text-[11px] text-slate-500">
                    Cargo: {detailedReportCollab.collaborator.role || 'Vendedor'} • Email: {detailedReportCollab.collaborator.email || 'N/I'} • Percentual Cadastrado: <strong>{detailedReportCollab.collaborator.commissionPercentage || 0}%</strong>
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportCSV(detailedReportCollab)}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Download className="w-4 h-4" />
                    <span>Baixar Planilha CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Imprimir / PDF</span>
                  </button>
                </div>
              </div>

              {/* KPI Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-mono">Volume de Vendas</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    R$ {detailedReportCollab.totalSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                  <span className="text-[9px] font-bold text-emerald-800 uppercase block font-mono">Comissão Pendente</span>
                  <span className="text-base font-bold text-emerald-700 font-mono">
                    R$ {detailedReportCollab.pendingCommissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <span className="text-[9px] font-bold text-indigo-800 uppercase block font-mono">Comissão Quitada</span>
                  <span className="text-base font-bold text-indigo-700 font-mono">
                    R$ {detailedReportCollab.paidCommissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>

                <div className="bg-slate-100/80 p-3 rounded-lg border border-slate-200">
                  <span className="text-[9px] font-bold text-slate-500 uppercase block font-mono">Total de Pedidos</span>
                  <span className="text-base font-bold text-slate-900 font-mono">
                    {detailedReportCollab.totalOrdersCount} Pedidos
                  </span>
                </div>
              </div>

              {/* Search Inside Modal */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filtrar pedidos dentro deste relatório (ID, Cliente ou Produto)..."
                  value={modalSearchTerm}
                  onChange={e => setModalSearchTerm(e.target.value)}
                  className="w-full text-xs border border-slate-200 pl-9 pr-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                />
              </div>

              {/* Comprehensive Orders Table */}
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-[9px] font-bold text-slate-600 uppercase tracking-wider font-mono border-b border-slate-200">
                      <th className="py-3 px-3">Pedido ID</th>
                      <th className="py-3 px-3 font-mono">Data Pedido</th>
                      <th className="py-3 px-3">Cliente / Segmento</th>
                      <th className="py-3 px-3">Especificação dos Produtos / Itens</th>
                      <th className="py-3 px-3 text-right font-mono">Valor Total (R$)</th>
                      <th className="py-3 px-3 text-center">% Aplicada</th>
                      <th className="py-3 px-3 text-right font-mono">Comissão (R$)</th>
                      <th className="py-3 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                    {detailedReportCollab.allOrders
                      .filter((o: SalesOrder) => {
                        if (!modalSearchTerm) return true;
                        const search = modalSearchTerm.toLowerCase();
                        return (
                          String(o.id || '').toLowerCase().includes(search) ||
                          String(o.client || '').toLowerCase().includes(search) ||
                          String(o.items || '').toLowerCase().includes(search)
                        );
                      })
                      .map((o: SalesOrder) => {
                        const orderPct = (o.commissionPercentage !== undefined && o.commissionPercentage !== null && o.commissionPercentage > 0)
                          ? o.commissionPercentage
                          : (detailedReportCollab.collaborator.commissionPercentage || 0);
                        const commVal = (o.commissionValue && o.commissionValue > 0)
                          ? o.commissionValue
                          : ((o.value || 0) * orderPct) / 100;

                        return (
                          <tr key={o.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-3 px-3 font-mono font-bold text-indigo-700">
                              <div>{o.id}</div>
                              <span className="text-[8px] text-slate-400 uppercase font-mono">{o.status}</span>
                            </td>
                            <td className="py-3 px-3 font-mono text-slate-500 text-[11px]">
                              {o.date ? new Date(o.date + (o.date.includes('T') ? '' : 'T00:00:00')).toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="py-3 px-3 font-semibold text-slate-900">
                              <div>{o.client}</div>
                              <div className="text-[9px] text-slate-400 font-normal">{o.clientSegment || 'Cliente Final'}</div>
                            </td>
                            <td className="py-3 px-3 text-[11px] text-slate-600 max-w-xs truncate" title={o.items}>
                              {o.items || 'Produtos industriais sob medida'}
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-slate-800">
                              R$ {(o.value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-center font-mono font-bold text-indigo-600">
                              {orderPct}%
                            </td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700">
                              R$ {commVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </td>
                            <td className="py-3 px-3 text-center">
                              {o.commissionPaid ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold font-mono">
                                  QUITADA
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold font-mono">
                                  PENDENTE
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
              <span className="text-[10px] text-slate-400 font-mono">
                Estilo Coifas ERP • Relatório Gerado em {new Date().toLocaleDateString('pt-BR')}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDetailedReportCollab(null);
                  setModalSearchTerm('');
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-lg cursor-pointer"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Commission Payout Confirmation Modal */}
      {selectedCollabPayout && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                  <DollarSign className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm tracking-tight">Dar Baixa & Quitar Comissão</h3>
                  <p className="text-[10px] text-slate-300">Confirme o pagamento do crédito de comissão ao colaborador</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCollabPayout(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs text-slate-700">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 space-y-2 font-sans">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Colaborador Beneficiário:</span>
                  <span className="font-bold text-slate-900">{selectedCollabPayout.collaborator.name}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Percentual de Comissão:</span>
                  <span className="font-mono font-bold text-indigo-600">{selectedCollabPayout.collaborator.commissionPercentage}%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Qtd. Pedidos (Cliente Final):</span>
                  <span className="font-mono font-bold text-slate-800">{selectedCollabPayout.pendingOrdersCount} pedidos</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500 font-medium">Volume Total em Vendas:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    R$ {selectedCollabPayout.totalSalesAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="h-px bg-slate-200 my-1" />
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-emerald-900">Crédito a Pagar (A Zerar):</span>
                  <span className="font-mono text-emerald-700 font-extrabold text-base">
                    R$ {selectedCollabPayout.commissionAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Observações / Comprovante Pix (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Pagamento via Pix com chave CPF no dia 10/07/2026..."
                  value={payoutNotes}
                  onChange={e => setPayoutNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/60 text-[10px] text-amber-800 leading-relaxed">
                <strong>Atenção ADM:</strong> Ao confirmar o pagamento, os créditos acumulados do colaborador serão <strong>zerados</strong>, os pedidos correspondentes serão marcados como pagos e um lançamento de <strong>Despesa Financeira</strong> será gerado.
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedCollabPayout(null)}
                className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-bold rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmPayout}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar Pagamento & Zerar Crédito</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Create Transaction Sidebar / Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-1.5 text-sm">
                  <DollarSign className="w-4 h-4 text-indigo-600" />
                  Nova Transação Financeira Manual
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Registre fluxos operacionais adicionais como contas, pix e salários.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateTransaction} className="p-4 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                {/* Flow Type */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Tipo de Movimentação *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setNewType('RECEITA');
                        setNewCategory('Sucatas / Outros');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        newType === 'RECEITA'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 shadow-sm'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      (+) Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNewType('DESPESA');
                        setNewCategory('Infraestrutura');
                      }}
                      className={`py-2 text-xs font-bold rounded-lg border transition-all cursor-pointer text-center ${
                        newType === 'DESPESA'
                          ? 'bg-rose-50 text-rose-700 border-rose-200 shadow-sm'
                          : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      (-) Despesa
                    </button>
                  </div>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Valor da Operação (R$) *</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0,00"
                    className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                    value={newAmount}
                    onChange={e => setNewAmount(e.target.value)}
                    required
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Descrição do Lançamento *</label>
                <input
                  type="text"
                  placeholder="Ex: Aluguel do galpão industrial, compra de parafusos..."
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Category */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Categoria *</label>
                  <select
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700"
                    value={newCategory}
                    onChange={e => setNewCategory(e.target.value)}
                  >
                    {newType === 'DESPESA' ? (
                      <>
                        <option value="Infraestrutura">Infraestrutura / Contas Fixas</option>
                        <option value="Salários">Salários e Benefícios</option>
                        <option value="Impostos">Impostos e Tributos</option>
                        <option value="Matéria-Prima / Insumos">Matéria-Prima / Insumos</option>
                        <option value="Logística">Logística / Fretes</option>
                        <option value="Marketing">Marketing / Comercial</option>
                        <option value="Outros">Outras Despesas</option>
                      </>
                    ) : (
                      <>
                        <option value="Vendas">Vendas Comerciais</option>
                        <option value="Sucatas / Outros">Sucatas e Sobras</option>
                        <option value="Rendimentos">Rendimentos Financeiros</option>
                        <option value="Outros">Outras Receitas</option>
                      </>
                    )}
                  </select>
                </div>

                {/* Due Date */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Data de Vencimento *</label>
                  <input
                    type="date"
                    className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                    value={newDueDate}
                    onChange={e => setNewDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Partner */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Parceiro / Contraparte (Opcional)</label>
                  <input
                    type="text"
                    placeholder="Fornecedor, operador, cliente..."
                    className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold"
                    value={newPartner}
                    onChange={e => setNewPartner(e.target.value)}
                  />
                </div>

                {/* Payment Method */}
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Meio de Pagamento Preferencial</label>
                  <select
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700"
                    value={newMethod}
                    onChange={e => setNewMethod(e.target.value)}
                  >
                    <option value="Pix">Transferência Pix</option>
                    <option value="Boleto Bancário">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Transferência TED/DOC">TED / DOC</option>
                    <option value="Dinheiro">Dinheiro Físico</option>
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Observações Adicionais</label>
                <textarea
                  rows={2}
                  placeholder="Detalhamento técnico ou justificativa operacional..."
                  className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 text-slate-700"
                  value={newNotes}
                  onChange={e => setNewNotes(e.target.value)}
                />
              </div>

              {/* Footer Actions */}
              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-500 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm hover:shadow transition-all cursor-pointer"
                >
                  Salvar Lançamento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
