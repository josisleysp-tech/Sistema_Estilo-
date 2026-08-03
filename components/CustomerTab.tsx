'use client';

import React, { useState, useMemo } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  Building2, 
  Mail, 
  Phone, 
  MapPin, 
  Tag, 
  ShieldCheck, 
  UserPlus, 
  TrendingUp, 
  Briefcase,
  ToggleLeft,
  ToggleRight,
  Trash2,
  SlidersHorizontal,
  Edit2,
  Coins,
  History,
  X,
  CheckCircle2,
  FileText,
  Printer,
  ShoppingCart
} from 'lucide-react';
import { Customer, CustomerCreditRecord, SalesOrder, UserAccess } from '../lib/types';
import SegmentManagerModal from './SegmentManagerModal';

interface CustomerTabProps {
  customers: Customer[];
  salesOrders?: SalesOrder[];
  onAddCustomer: (customer: Omit<Customer, 'id' | 'totalPurchased'>) => void;
  onToggleCustomerStatus: (id: string) => void;
  onDeleteCustomer: (id: string) => void;
  onUpdateCustomer?: (id: string, updatedFields: Partial<Customer>) => void;
  industrialSegments?: string[];
  onUpdateSegments?: (
    newSegments: string[],
    renameMapping?: { old: string; new: string },
    deletedSegment?: string
  ) => void;
  currentUser?: UserAccess;
  users?: UserAccess[];
}

export default function CustomerTab({
  customers,
  salesOrders = [],
  onAddCustomer,
  onToggleCustomerStatus,
  onDeleteCustomer,
  onUpdateCustomer,
  industrialSegments = ["Metalurgia", "Siderurgia", "Automobilístico", "Celulose / Papel", "Petroquímico", "Eletroeletrônica", "Mineração", "Energia"],
  onUpdateSegments = () => {},
  currentUser,
  users = []
}: CustomerTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | 'Ativo' | 'Inativo'>('Todos');
  const [segmentFilter, setSegmentFilter] = useState<string>('Todos');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // New customer form state
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [segment, setSegment] = useState('Metalurgia');
  const [isSegmentManagerOpen, setIsSegmentManagerOpen] = useState(false);

  // Credit Modal & History states
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [isCreditHistoryModalOpen, setIsCreditHistoryModalOpen] = useState(false);
  const [creditCustomerId, setCreditCustomerId] = useState('');
  const [creditAmount, setCreditAmount] = useState('');
  const [creditReason, setCreditReason] = useState('');
  const [creditOperator, setCreditOperator] = useState('');
  const [creditSuccessToast, setCreditSuccessToast] = useState<string | null>(null);

  // History search & filter
  const [creditHistorySearch, setCreditHistorySearch] = useState('');
  const [creditHistoryCustomerFilter, setCreditHistoryCustomerFilter] = useState('Todos');
  const [creditHistoryTab, setCreditHistoryTab] = useState<'grants' | 'usage'>('grants');

  // Selected customer for credit modal preview
  const selectedCreditCustomer = useMemo(() => {
    return customers.find(c => c.id === creditCustomerId);
  }, [customers, creditCustomerId]);

  // Total customer credits KPI
  const totalCustomerCredits = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.creditBalance || 0), 0);
  }, [customers]);

  // Aggregate all credit history records across customers
  const allCreditRecords = useMemo(() => {
    const records: CustomerCreditRecord[] = [];
    customers.forEach(cust => {
      if (cust.creditHistory && cust.creditHistory.length > 0) {
        records.push(...cust.creditHistory);
      }
    });
    return records.sort((a, b) => b.id.localeCompare(a.id));
  }, [customers]);

  // Filtered credit records
  const filteredCreditRecords = useMemo(() => {
    return allCreditRecords.filter(rec => {
      const matchSearch = !creditHistorySearch.trim() || 
        rec.customerName.toLowerCase().includes(creditHistorySearch.toLowerCase()) ||
        rec.reason.toLowerCase().includes(creditHistorySearch.toLowerCase()) ||
        (rec.operator && rec.operator.toLowerCase().includes(creditHistorySearch.toLowerCase()));
      const matchCustomer = creditHistoryCustomerFilter === 'Todos' || rec.customerId === creditHistoryCustomerFilter;
      return matchSearch && matchCustomer;
    });
  }, [allCreditRecords, creditHistorySearch, creditHistoryCustomerFilter]);

  // Credit usage in sales orders
  const creditUsageOrders = useMemo(() => {
    if (!salesOrders) return [];
    return salesOrders.filter(so => so.creditUsed && so.creditUsed > 0);
  }, [salesOrders]);

  const filteredCreditUsageOrders = useMemo(() => {
    return creditUsageOrders.filter(so => {
      const matchSearch = !creditHistorySearch.trim() || 
        so.client.toLowerCase().includes(creditHistorySearch.toLowerCase()) ||
        String(so.serialNumber || so.id).toLowerCase().includes(creditHistorySearch.toLowerCase()) ||
        (so.operator && so.operator.toLowerCase().includes(creditHistorySearch.toLowerCase()));
      const matchCustomer = creditHistoryCustomerFilter === 'Todos' || so.client.toLowerCase() === customers.find(c => c.id === creditHistoryCustomerFilter)?.name.toLowerCase();
      return matchSearch && matchCustomer;
    });
  }, [creditUsageOrders, creditHistorySearch, creditHistoryCustomerFilter, customers]);

  const handlePrintCreditReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="utf-8">
        <title>Relatório de Créditos e Utilização em Pedidos</title>
        <style>
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; margin: 20px; }
          h1 { font-size: 18px; margin-bottom: 4px; color: #0f172a; }
          .subtitle { font-size: 11px; color: #64748b; margin-bottom: 20px; }
          .section-title { font-size: 14px; font-weight: bold; margin-top: 25px; margin-bottom: 10px; border-bottom: 2px solid #cbd5e1; padding-bottom: 4px; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; margin-bottom: 20px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; font-size: 11px; }
          th { background-color: #f1f5f9; font-weight: bold; color: #475569; text-transform: uppercase; }
          .summary-box { background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; }
          @media print {
            body { margin: 10px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <h1>Relatório Gerencial de Créditos e Utilização em Pedidos de Venda</h1>
        <div class="subtitle">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} por ${currentUser?.name || 'Administrador'}</div>
        
        <div class="summary-box">
          <div>Total de Créditos Concedidos: <span style="color: #059669; font-weight: bold;">R$ ${allCreditRecords.reduce((s, r) => s + r.amount, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          <div>Total Utilizado em Pedidos: <span style="color: #2563eb; font-weight: bold;">R$ ${creditUsageOrders.reduce((s, o) => s + (o.creditUsed || 0), 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
          <div>Saldo Atual Consolidado: <span style="color: #0d9488; font-weight: bold;">R$ ${totalCustomerCredits.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span></div>
        </div>

        <div class="section-title">1. Histórico de Créditos Concedidos (Lançamentos)</div>
        <table>
          <thead>
            <tr>
              <th>Data / Hora</th>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Motivo / Justificativa</th>
              <th>Operador</th>
            </tr>
          </thead>
          <tbody>
            ${allCreditRecords.map(r => `
              <tr>
                <td>${r.date} ${r.time || ''}</td>
                <td><strong>${r.customerName}</strong></td>
                <td style="color: #059669; font-weight: bold;">R$ ${r.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${r.reason}</td>
                <td>${r.operator || 'Sistema'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">2. Utilização de Créditos em Pedidos de Venda</div>
        <table>
          <thead>
            <tr>
              <th>Nº Pedido</th>
              <th>Data</th>
              <th>Cliente</th>
              <th>Valor do Pedido</th>
              <th>Crédito Utilizado</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${creditUsageOrders.map(o => `
              <tr>
                <td><strong>#${o.serialNumber || o.id.slice(-6)}</strong></td>
                <td>${o.date}</td>
                <td><strong>${o.client}</strong></td>
                <td>R$ ${o.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td style="color: #2563eb; font-weight: bold;">R$ ${(o.creditUsed || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                <td>${o.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="no-print" style="text-align: center; margin-top: 30px;">
          <button onclick="window.print()" style="background: #0f172a; color: white; border: none; padding: 10px 20px; font-weight: bold; border-radius: 6px; cursor: pointer;">Imprimir Relatório / Salvar PDF</button>
        </div>
      </body>
      </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleOpenCreditModal = (preselectedCustId?: string) => {
    if (preselectedCustId) {
      setCreditCustomerId(preselectedCustId);
    } else if (customers.length > 0 && !creditCustomerId) {
      setCreditCustomerId(customers[0].id);
    }
    setCreditOperator(currentUser?.name || 'Administrador');
    setIsCreditModalOpen(true);
  };

  const resetCreditForm = () => {
    setCreditCustomerId('');
    setCreditAmount('');
    setCreditReason('');
    setCreditOperator(currentUser?.name || 'Administrador');
  };

  const handleGrantCreditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!creditCustomerId) {
      alert('Por favor, selecione o cliente que receberá o crédito.');
      return;
    }
    const amountNum = parseFloat(creditAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Por favor, informe um valor de crédito válido maior que zero.');
      return;
    }
    if (!creditReason.trim()) {
      alert('Por favor, descreva o motivo do crédito para registro e consultas futuras.');
      return;
    }

    const targetCustomer = customers.find(c => c.id === creditCustomerId);
    if (!targetCustomer) {
      alert('Cliente não encontrado.');
      return;
    }

    const newRecord: CustomerCreditRecord = {
      id: `CRD-${Date.now().toString().slice(-6)}`,
      customerId: targetCustomer.id,
      customerName: targetCustomer.name,
      amount: amountNum,
      reason: creditReason.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      operator: creditOperator || currentUser?.name || 'Administrador'
    };

    const newBalance = (targetCustomer.creditBalance || 0) + amountNum;
    const updatedHistory = [...(targetCustomer.creditHistory || []), newRecord];

    if (onUpdateCustomer) {
      onUpdateCustomer(targetCustomer.id, {
        creditBalance: newBalance,
        creditHistory: updatedHistory
      });
    }

    setCreditSuccessToast(`Crédito de R$ ${amountNum.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} lançado com sucesso para ${targetCustomer.name}!`);
    setTimeout(() => {
      setCreditSuccessToast(null);
    }, 6000);

    resetCreditForm();
    setIsCreditModalOpen(false);
  };

  // KPIs
  const totalCustomers = customers.length;
  const activeCustomers = customers.filter(c => c.status === 'Ativo').length;
  const inactiveCustomers = customers.filter(c => c.status === 'Inativo').length;
  
  const totalSalesVolume = useMemo(() => {
    return customers.reduce((sum, c) => sum + c.totalPurchased, 0);
  }, [customers]);

  // Segments list for filter
  const segments = useMemo(() => {
    return industrialSegments;
  }, [industrialSegments]);

  // Filter customers
  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const matchesSearch = c.name.toLowerCase().includes(search.toLowerCase()) ||
                            (c.nickname && c.nickname.toLowerCase().includes(search.toLowerCase())) ||
                            c.cnpj.replace(/\D/g, '').includes(search.replace(/\D/g, '')) ||
                            c.email.toLowerCase().includes(search.toLowerCase()) ||
                            c.address.toLowerCase().includes(search.toLowerCase());
      
      const matchesStatus = statusFilter === 'Todos' || c.status === statusFilter;
      const matchesSegment = segmentFilter === 'Todos' || c.segment === segmentFilter;

      return matchesSearch && matchesStatus && matchesSegment;
    });
  }, [customers, search, statusFilter, segmentFilter]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !cnpj || !email) return;

    if (editingCustomerId) {
      if (onUpdateCustomer) {
        onUpdateCustomer(editingCustomerId, {
          name,
          nickname,
          cnpj,
          email,
          phone: phone || '(00) 0000-0000',
          address: address || 'Não informado',
          segment,
        });
      }
    } else {
      onAddCustomer({
        name,
        nickname,
        cnpj,
        email,
        phone: phone || '(00) 0000-0000',
        address: address || 'Não informado',
        segment,
        status: 'Ativo'
      });
    }

    // Reset Form
    setName('');
    setNickname('');
    setCnpj('');
    setEmail('');
    setPhone('');
    setAddress('');
    setSegment('Metalurgia');
    setEditingCustomerId(null);
    setIsAddOpen(false);
  };

  const handleToggleAddForm = () => {
    if (isAddOpen) {
      setName('');
      setNickname('');
      setCnpj('');
      setEmail('');
      setPhone('');
      setAddress('');
      setSegment('Metalurgia');
      setEditingCustomerId(null);
      setIsAddOpen(false);
    } else {
      setName('');
      setNickname('');
      setCnpj('');
      setEmail('');
      setPhone('');
      setAddress('');
      setSegment('Metalurgia');
      setEditingCustomerId(null);
      setIsAddOpen(true);
    }
  };

  const handleEditClick = (customer: Customer) => {
    setEditingCustomerId(customer.id);
    setName(customer.name);
    setNickname(customer.nickname || '');
    setCnpj(customer.cnpj);
    setEmail(customer.email);
    setPhone(customer.phone === 'Não informado' || customer.phone === '(00) 0000-0000' ? '' : customer.phone);
    setAddress(customer.address === 'Não informado' ? '' : customer.address);
    setSegment(customer.segment || 'Metalurgia');
    setIsAddOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header and Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="customer-tab-heading" className="text-xl font-bold text-slate-800 tracking-tight">Cadastro & Carteira de Clientes</h2>
          <p className="text-xs text-slate-500 mt-1">Homologação de novos parceiros comerciais, concessão de créditos e receita consolidada</p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          {/* BOTAO CRÉDITO PARA CLIENTE */}
          <button 
            onClick={() => handleOpenCreditModal()}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-4 py-2.5 rounded-lg font-bold shadow-sm transition-all hover:shadow-emerald-600/20 active:scale-[0.98] cursor-pointer"
          >
            <Coins className="w-4 h-4 text-emerald-100" />
            CRÉDITO PARA CLIENTE
          </button>

          {/* BOTAO HISTÓRICO DE CRÉDITOS */}
          <button 
            onClick={() => setIsCreditHistoryModalOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 text-xs px-3.5 py-2.5 rounded-lg font-semibold transition-colors cursor-pointer"
            title="Consultar Histórico de Créditos Concedidos"
          >
            <History className="w-4 h-4 text-slate-500" />
            <span className="hidden md:inline">Consultar Créditos</span>
            {allCreditRecords.length > 0 && (
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                {allCreditRecords.length}
              </span>
            )}
          </button>

          {/* BOTAO NOVO CLIENTE */}
          <button 
            onClick={handleToggleAddForm}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-lg font-medium shadow transition-colors cursor-pointer"
          >
            <UserPlus className="w-4 h-4" />
            {editingCustomerId ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
          </button>
        </div>
      </div>

      {/* Toast banner upon granting credit */}
      {creditSuccessToast && (
        <div className="bg-emerald-600 text-white p-3.5 rounded-xl shadow-lg flex items-center justify-between text-xs font-bold animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 text-emerald-100 flex-shrink-0" />
            <span>{creditSuccessToast}</span>
          </div>
          <button 
            onClick={() => setIsCreditHistoryModalOpen(true)}
            className="underline text-emerald-100 hover:text-white text-[11px] font-semibold ml-4 cursor-pointer"
          >
            Ver no Histórico
          </button>
        </div>
      )}

      {/* Add Customer Form Draw */}
      {isAddOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-indigo-100 rounded-xl p-5 shadow-[0_4px_12px_rgba(79,70,229,0.05)] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Building2 className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">
              {editingCustomerId ? 'Formulário de Edição de Cliente' : 'Formulário de Homologação de Cliente'}
            </h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Razão Social / Nome Fantasia *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Ex: Siderúrgica Gerdau S.A."
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Apelido / Nome Curto</label>
              <input 
                type="text" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="Ex: Gerdau"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CNPJ / CPF *</label>
              <input 
                type="text" 
                value={cnpj} 
                onChange={(e) => setCnpj(e.target.value)} 
                required 
                placeholder="Ex: 12.345.678/0001-90"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Segmento Industrial</label>
                <button 
                  type="button"
                  onClick={() => setIsSegmentManagerOpen(true)}
                  className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors focus:outline-none bg-indigo-50 hover:bg-indigo-100/80 px-2 py-0.5 rounded-md cursor-pointer"
                >
                  <SlidersHorizontal className="w-2.5 h-2.5" />
                  Editar
                </button>
              </div>
              <select 
                value={industrialSegments.includes(segment) ? segment : (industrialSegments[0] || 'Metalurgia')} 
                onChange={(e) => setSegment(e.target.value)} 
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer"
              >
                {industrialSegments.map((seg) => (
                  <option key={seg} value={seg}>{seg}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail Comercial *</label>
              <input 
                type="text" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="Ex: compras@gerdau.com.br"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone de Contato</label>
              <input 
                type="text" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
                placeholder="Ex: (11) 4004-5000"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Localização (Cidade - UF)</label>
              <input 
                type="text" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
                placeholder="Ex: Porto Alegre - RS"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-2 border-t border-slate-100">
            <button 
              type="button" 
              onClick={handleToggleAddForm}
              className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5 rounded-lg cursor-pointer"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-1.5 rounded-lg font-medium shadow-sm transition-colors cursor-pointer"
            >
              {editingCustomerId ? 'Atualizar Registro' : 'Salvar Registro'}
            </button>
          </div>
        </form>
      )}

      {/* KPI Dashboard grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {/* KPI 1: Total */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Total Homologados</p>
            <p className="text-lg font-bold text-slate-800">{totalCustomers} Clientes</p>
          </div>
        </div>

        {/* KPI 2: Ativos */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Clientes Ativos</p>
            <p className="text-lg font-bold text-slate-800">{activeCustomers} Parceiros</p>
          </div>
        </div>

        {/* KPI 3: Inativos */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Suspensos / Inativos</p>
            <p className="text-lg font-bold text-slate-800">{inactiveCustomers} Registros</p>
          </div>
        </div>

        {/* KPI 4: Total Créditos Concedidos */}
        <div className="bg-white border border-emerald-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3 bg-emerald-50/20">
          <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-lg">
            <Coins className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-emerald-700 uppercase tracking-wider">Créditos Ativos</p>
            <p className="text-lg font-bold text-emerald-900">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalCustomerCredits)}
            </p>
          </div>
        </div>

        {/* KPI 5: Faturamento Consolidado */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-indigo-950 text-indigo-200 rounded-lg">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Receita Consolidada</p>
            <p className="text-lg font-bold text-slate-850">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }).format(totalSalesVolume)}
            </p>
          </div>
        </div>
      </div>

      {/* Filter and Table List */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Controls header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por nome, CNPJ, e-mail..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5" />
              <select 
                value={statusFilter} 
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Todos">Status: Todos</option>
                <option value="Ativo">Ativos</option>
                <option value="Inativo">Inativos</option>
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <Tag className="w-3.5 h-3.5" />
              <select 
                value={segmentFilter} 
                onChange={(e) => setSegmentFilter(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Todos">Segmento: Todos</option>
                {segments.map(seg => (
                  <option key={seg} value={seg}>{seg}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Mostrando <span className="text-slate-700 font-bold">{filteredCustomers.length}</span> clientes
          </div>
        </div>

        {/* List table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Cliente / Razão Social</th>
                <th className="px-5 py-3.5">CNPJ</th>
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Segmento</th>
                <th className="px-5 py-3.5">Contato</th>
                <th className="px-5 py-3.5">Localização</th>
                <th className="px-5 py-3.5">Compras Acumuladas</th>
                <th className="px-5 py-3.5">Crédito Disponível</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-slate-400 font-medium">
                    Nenhum cliente cadastrado atende aos filtros definidos.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 text-slate-600 rounded-lg">
                          <Building2 className="w-4 h-4 text-indigo-500" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold text-slate-800 leading-tight">{customer.name}</p>
                            {customer.nickname && (
                              <span className="inline-flex items-center bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-100">
                                {customer.nickname}
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">{customer.id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-500">{customer.cnpj}</td>
                    <td className="px-5 py-4 font-mono text-slate-500">
                      <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                        👤 {customer.operator || 'Eduardo Fontes'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-medium rounded-md">
                        {customer.segment}
                      </span>
                    </td>
                    <td className="px-5 py-4 space-y-1">
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-1 text-slate-500 text-[11px]">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{customer.phone}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1 text-slate-600">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        <span>{customer.address}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 font-semibold text-slate-700 font-sans">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.totalPurchased)}
                    </td>
                    <td className="px-5 py-4">
                      {customer.creditBalance && customer.creditBalance > 0 ? (
                        <button 
                          onClick={() => {
                            setCreditHistoryCustomerFilter(customer.id);
                            setIsCreditHistoryModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2.5 py-1 rounded-md text-[11px] font-bold border border-emerald-200/80 transition-colors cursor-pointer group"
                          title="Clique para ver o histórico de créditos deste cliente"
                        >
                          <Coins className="w-3 h-3 text-emerald-600 group-hover:scale-110 transition-transform" />
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customer.creditBalance)}
                        </button>
                      ) : (
                        <span className="text-slate-400 text-xs font-mono">-</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                        customer.status === 'Ativo' 
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                          : 'bg-slate-50 text-slate-500 border-slate-200'
                      }`}>
                        <span className={`w-1 h-1 rounded-full ${customer.status === 'Ativo' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenCreditModal(customer.id)}
                          className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded transition-colors cursor-pointer"
                          title="Conceder Crédito para este Cliente"
                        >
                          <Coins className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEditClick(customer)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                          title="Editar Cadastro"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onToggleCustomerStatus(customer.id)}
                          className="p-1 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                          title={customer.status === 'Ativo' ? "Desativar Cliente" : "Ativar Cliente"}
                        >
                          {customer.status === 'Ativo' ? (
                            <ToggleRight className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="w-5 h-5 text-slate-400" />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Tem certeza que deseja remover o cliente ${customer.name}?`)) {
                              onDeleteCustomer(customer.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                          title="Excluir Registro"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL CRÉDITO PARA CLIENTE */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/10 backdrop-blur-md rounded-xl text-white">
                  <Coins className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Concessão de Crédito para Cliente</h3>
                  <p className="text-[11px] text-emerald-100 mt-0.5">Lançamento de saldo comercial e registro de motivo para consulta</p>
                </div>
              </div>
              <button 
                onClick={() => { setIsCreditModalOpen(false); resetCreditForm(); }}
                className="text-white/80 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleGrantCreditSubmit} className="p-6 space-y-5">
              {/* Customer Select Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Cliente Beneficiário *</span>
                  <span className="text-[9px] text-emerald-600 font-semibold">Selecione na lista</span>
                </label>
                <select 
                  value={creditCustomerId}
                  onChange={(e) => setCreditCustomerId(e.target.value)}
                  required
                  className="w-full text-xs font-semibold border border-slate-200 px-3.5 py-2.5 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 cursor-pointer"
                >
                  <option value="">-- Selecione o cliente na lista --</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.cnpj}) {c.creditBalance && c.creditBalance > 0 ? `- Saldo Atual: R$ ${c.creditBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Customer Info Banner */}
              {selectedCreditCustomer && (
                <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-emerald-950">{selectedCreditCustomer.name}</p>
                    <p className="text-[10px] text-emerald-700 font-mono">CNPJ: {selectedCreditCustomer.cnpj} | Segmento: {selectedCreditCustomer.segment}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-emerald-600 font-semibold block uppercase">Saldo Atual de Crédito</span>
                    <span className="font-bold text-emerald-800 text-sm">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedCreditCustomer.creditBalance || 0)}
                    </span>
                  </div>
                </div>
              )}

              {/* Credit Value & Operator */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Valor do Crédito (R$) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-400">R$</span>
                    <input 
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0,00"
                      value={creditAmount}
                      onChange={(e) => setCreditAmount(e.target.value)}
                      required
                      className="w-full text-xs font-bold pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Operador Responsável
                  </label>
                  <select
                    value={creditOperator}
                    onChange={(e) => setCreditOperator(e.target.value)}
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-700 font-medium cursor-pointer"
                  >
                    <option value={currentUser?.name || 'Administrador'}>{currentUser?.name || 'Administrador'} (Usuário Atual)</option>
                    {users && users.map(u => (
                      <option key={u.name} value={u.name}>{u.name} - {u.role}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Motivo do Crédito (Caixa de texto) */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>Motivo do Crédito (Caixa de Texto) *</span>
                  <span className="text-[9px] text-slate-400 font-normal">Registro armazenado para consulta</span>
                </label>
                <textarea
                  rows={3}
                  value={creditReason}
                  onChange={(e) => setCreditReason(e.target.value)}
                  required
                  placeholder="Digite o motivo detalhado para a concessão de crédito (Ex: Bonificação comercial por atingimento de meta, ressarcimento de peça com avaria, ajuste comercial ou devolução de saldo...)"
                  className="w-full text-xs border border-slate-200 p-3 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-800 placeholder:text-slate-400 font-medium leading-relaxed"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => { setIsCreditModalOpen(false); setIsCreditHistoryModalOpen(true); }}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1.5 hover:underline cursor-pointer"
                >
                  <History className="w-3.5 h-3.5" />
                  Consultar Histórico
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => { setIsCreditModalOpen(false); resetCreditForm(); }}
                    className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800 rounded-xl transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Coins className="w-4 h-4" />
                    Lançar Crédito
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONSULTA DE HISTÓRICO DE CRÉDITOS */}
      {isCreditHistoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">Relatório de Créditos e Utilização em Pedidos</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Histórico completo de lançamentos de créditos e em quais pedidos de venda eles foram utilizados</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintCreditReport}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
                  title="Imprimir relatório completo ou salvar em PDF"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir / Relatório PDF
                </button>
                <button 
                  onClick={() => setIsCreditHistoryModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tab navigation & Filters */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2 bg-slate-200/70 p-1 rounded-xl">
                <button
                  onClick={() => setCreditHistoryTab('grants')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    creditHistoryTab === 'grants'
                      ? 'bg-white text-emerald-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Coins className="w-3.5 h-3.5 text-emerald-600" />
                  Créditos Concedidos ({allCreditRecords.length})
                </button>
                <button
                  onClick={() => setCreditHistoryTab('usage')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    creditHistoryTab === 'usage'
                      ? 'bg-white text-blue-800 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 text-blue-600" />
                  Uso em Pedidos ({creditUsageOrders.length})
                </button>
              </div>

              <div className="flex items-center gap-3 w-full md:w-auto flex-1 justify-end">
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text"
                    placeholder="Buscar por cliente, motivo ou pedido..."
                    value={creditHistorySearch}
                    onChange={(e) => setCreditHistorySearch(e.target.value)}
                    className="w-full text-xs pl-9 pr-4 py-2 border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <select
                  value={creditHistoryCustomerFilter}
                  onChange={(e) => setCreditHistoryCustomerFilter(e.target.value)}
                  className="text-xs border border-slate-200 px-3 py-2 rounded-xl bg-white text-slate-700 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="Todos">Todos os Clientes</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content Table by Tab */}
            <div className="overflow-y-auto p-4 space-y-3 flex-1">
              {creditHistoryTab === 'grants' ? (
                /* Tab 1: Créditos Concedidos */
                filteredCreditRecords.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <Coins className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-bold">Nenhum registro de crédito encontrado.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Os créditos concedidos ficarão armazenados aqui para consultas futuras.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Data / Hora</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Valor Concedido</th>
                          <th className="px-4 py-3">Motivo do Crédito (Justificativa)</th>
                          <th className="px-4 py-3">Operador</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCreditRecords.map(rec => (
                          <tr key={rec.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              <div>{rec.date}</div>
                              {rec.time && <div className="text-[9px] text-slate-400">{rec.time}</div>}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              {rec.customerName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md border border-emerald-200/60 text-xs">
                                + {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(rec.amount)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="bg-slate-50 border border-slate-200/80 p-2.5 rounded-lg text-slate-700 text-xs leading-relaxed max-w-md">
                                {rec.reason}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-medium whitespace-nowrap">
                              👤 {rec.operator || 'Sistema'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              ) : (
                /* Tab 2: Utilização em Pedidos de Venda */
                filteredCreditUsageOrders.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                    <ShoppingCart className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-xs text-slate-500 font-bold">Nenhum pedido de venda utilizou crédito de cliente até o momento.</p>
                    <p className="text-[11px] text-slate-400 mt-1">Ao registrar pedidos utilizando &quot;Crédito do Cliente&quot; como forma de pagamento, eles aparecerão aqui.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-4 py-3">Nº Pedido</th>
                          <th className="px-4 py-3">Data</th>
                          <th className="px-4 py-3">Cliente</th>
                          <th className="px-4 py-3">Valor Total</th>
                          <th className="px-4 py-3">Crédito Utilizado</th>
                          <th className="px-4 py-3">Status</th>
                          <th className="px-4 py-3">Operador / Vendedor</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-xs">
                        {filteredCreditUsageOrders.map(so => (
                          <tr key={so.id} className="hover:bg-slate-50/80 transition-colors">
                            <td className="px-4 py-3 font-mono font-bold text-slate-800">
                              #{so.serialNumber || so.id.slice(-6)}
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-mono text-[11px]">
                              {so.date}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-800">
                              {so.client}
                            </td>
                            <td className="px-4 py-3 text-slate-700 font-semibold">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(so.value)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-md border border-blue-200/60 text-xs">
                                - {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(so.creditUsed || 0)}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                so.status === 'Faturado' || so.status === 'Entregue' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {so.status}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500 font-medium">
                              👤 {so.operator || 'Sistema'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center text-xs">
              <span className="text-slate-500 font-medium">
                {creditHistoryTab === 'grants' ? (
                  <span>Volume Total Concedido: <strong className="text-emerald-700 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredCreditRecords.reduce((sum, r) => sum + r.amount, 0))}</strong></span>
                ) : (
                  <span>Total Utilizado em Pedidos: <strong className="text-blue-700 font-bold">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(filteredCreditUsageOrders.reduce((sum, o) => sum + (o.creditUsed || 0), 0))}</strong></span>
                )}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintCreditReport}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir Relatório
                </button>
                <button
                  onClick={() => setIsCreditHistoryModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Segment Manager Modal */}
      <SegmentManagerModal 
        isOpen={isSegmentManagerOpen}
        onClose={() => setIsSegmentManagerOpen(false)}
        segments={industrialSegments}
        customers={customers}
        onUpdateSegments={onUpdateSegments}
      />
    </div>
  );
}
