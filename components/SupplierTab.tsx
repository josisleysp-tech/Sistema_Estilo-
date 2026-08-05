'use client';

import React, { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  Building2, 
  MapPin, 
  Mail, 
  Phone, 
  Award, 
  Clock, 
  AlertOctagon, 
  ShieldCheck, 
  FileText, 
  Layers, 
  History,
  CheckCircle2,
  Plus,
  Search,
  Filter,
  Edit3,
  Trash2,
  Printer,
  Eye,
  X,
  UserCheck,
  Check,
  Ban,
  TrendingUp,
  Star,
  ExternalLink,
  Tag
} from 'lucide-react';
import { Supplier, UserAccess } from '../lib/types';

interface SupplierTabProps {
  suppliers?: Supplier[];
  onAddSupplier?: (supplier: Omit<Supplier, 'id'>) => void;
  onUpdateSupplier?: (supplier: Supplier) => void;
  onDeleteSupplier?: (id: string) => void;
  onToggleSupplierStatus?: (id: string, newStatus: Supplier['status']) => void;
  currentUser?: UserAccess;
}

const DEFAULT_SUPPLIERS: Supplier[] = [
  {
    id: 'FORN-001',
    name: 'Metalúrgica Alfa S.A.',
    tradeName: 'Alfa Metalurgia',
    cnpj: '12.345.678/0001-90',
    email: 'comercial@metalurgicaalfa.com.br',
    phone: '(11) 3456-7890',
    contactPerson: 'Ricardo Silveira (Vendas)',
    category: 'Matéria-Prima',
    address: 'Av. das Indústrias, 1200 - Distrito Industrial',
    cityState: 'Sorocaba / SP',
    status: 'Ativo',
    reliabilityScore: 94,
    leadTime: '4.2 dias',
    rejectionRate: '0.8%',
    paymentTerms: '30/60 dias',
    certifications: ['ISO 9001', 'ISO 14001', 'AS9100D'],
    notes: 'Fornecedor chave para bobinas e chapas de aço inoxidável. Ótima pontualidade.',
    suppliedItemsCount: 12,
    operator: 'Administrador'
  },
  {
    id: 'FORN-002',
    name: 'Usiminas Chapas Industriais Ltda',
    tradeName: 'Usiminas Chapas',
    cnpj: '98.765.432/0001-21',
    email: 'vendas@usiminaschapas.com.br',
    phone: '(31) 3891-2000',
    contactPerson: 'Mariana Costa',
    category: 'Matéria-Prima',
    address: 'Rodovia dos Metalúrgicos, Km 45',
    cityState: 'Ipatinga / MG',
    status: 'Ativo',
    reliabilityScore: 98,
    leadTime: '3.0 dias',
    rejectionRate: '0.3%',
    paymentTerms: '28 ddl',
    certifications: ['ISO 9001', 'IATF 16949'],
    notes: 'Chapas laminadas de alta resistência mecânica.',
    suppliedItemsCount: 8,
    operator: 'Administrador'
  },
  {
    id: 'FORN-003',
    name: 'Siemens Brasil Eletrônica S.A.',
    tradeName: 'Siemens Brasil',
    cnpj: '45.123.890/0001-55',
    email: 'suporte.br@siemens.com',
    phone: '(11) 4004-0000',
    contactPerson: 'Eng. Fernando Mendes',
    category: 'Componentes Elétricos',
    address: 'Rua Siemens, 100 - Anhanguera',
    cityState: 'São Paulo / SP',
    status: 'Ativo',
    reliabilityScore: 96,
    leadTime: '2.5 dias',
    rejectionRate: '0.1%',
    paymentTerms: '30 dias',
    certifications: ['ISO 9001', 'ISO 50001', 'CE'],
    notes: 'Controladores lógicos, contatores e inversores de frequência.',
    suppliedItemsCount: 24,
    operator: 'Administrador'
  },
  {
    id: 'FORN-004',
    name: 'Pintura & Acabamentos Eletrostáticos Eireli',
    tradeName: 'Pintura & Acabamentos',
    cnpj: '23.890.112/0001-44',
    email: 'atendimento@pinturaacabamentos.com.br',
    phone: '(11) 98765-4321',
    contactPerson: 'Marcos Roberto',
    category: 'Serviços de Pintura',
    address: 'Rua dos Galvanizadores, 80 - Jd. Industrial',
    cityState: 'Guarulhos / SP',
    status: 'Em Homologação',
    reliabilityScore: 82,
    leadTime: '5.0 dias',
    rejectionRate: '1.5%',
    paymentTerms: 'A combinar',
    certifications: ['ISO 9001'],
    notes: 'Prestador de pintura em pó eletrostática terceirizada em teste de lote.',
    suppliedItemsCount: 3,
    operator: 'Carlos Eduardo'
  },
  {
    id: 'FORN-005',
    name: 'Eletrônicos China Import Ltda',
    tradeName: 'China Import Direct',
    cnpj: '67.432.109/0001-88',
    email: 'compras@chinadirect.com.br',
    phone: '(11) 2233-4455',
    contactPerson: 'Lin Chen',
    category: 'Componentes Elétricos',
    address: 'Av. Paulista, 1500 - Cj 82',
    cityState: 'São Paulo / SP',
    status: 'Inativo',
    reliabilityScore: 65,
    leadTime: '15.0 dias',
    rejectionRate: '4.2%',
    paymentTerms: 'À vista / Pix',
    certifications: [],
    notes: 'Inativado por atrasos recorrentes no desembaraço alfandegário e rebarbas.',
    suppliedItemsCount: 5,
    operator: 'Administrador'
  }
];

const CATEGORIES = [
  'Todas',
  'Matéria-Prima',
  'Componentes Elétricos',
  'Serviços de Pintura',
  'Usinagem & Corte',
  'Fixadores',
  'Pneumática & Hidráulica',
  'Embalagens',
  'Ferramental',
  'Outros'
];

export default function SupplierTab({
  suppliers: propSuppliers,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onToggleSupplierStatus,
  currentUser
}: SupplierTabProps) {
  // Local fallback state if parent doesn't manage suppliers
  const [localSuppliers, setLocalSuppliers] = useState<Supplier[]>(DEFAULT_SUPPLIERS);

  const suppliers = propSuppliers && propSuppliers.length > 0 ? propSuppliers : localSuppliers;

  // Filter & Search states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState<'Todos' | 'Ativo' | 'Em Homologação' | 'Inativo'>('Todos');

  // Modals state
  const [isAddEditModalOpen, setIsAddEditModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [detailSupplier, setDetailSupplier] = useState<Supplier | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);

  // Detail Sheet active tab inside modal
  const [detailTab, setDetailTab] = useState<'geral' | 'produtos' | 'contratos' | 'historico'>('geral');

  // Form Fields
  const [formData, setFormData] = useState({
    name: '',
    tradeName: '',
    cnpj: '',
    email: '',
    phone: '',
    contactPerson: '',
    category: 'Matéria-Prima',
    address: '',
    cityState: '',
    paymentTerms: '30/60 dias',
    leadTime: '3 dias',
    rejectionRate: '0.5%',
    reliabilityScore: 90,
    certifications: 'ISO 9001',
    notes: '',
    status: 'Ativo' as Supplier['status']
  });

  // Filtered Suppliers list
  const filteredSuppliers = useMemo(() => {
    const searchLower = String(searchTerm || '').toLowerCase();
    return suppliers.filter(s => {
      const matchText = 
        String(s.name || '').toLowerCase().includes(searchLower) ||
        (s.tradeName && String(s.tradeName).toLowerCase().includes(searchLower)) ||
        String(s.cnpj || '').includes(searchTerm) ||
        String(s.email || '').toLowerCase().includes(searchLower) ||
        (s.contactPerson && String(s.contactPerson).toLowerCase().includes(searchLower)) ||
        String(s.category || '').toLowerCase().includes(searchLower);

      const matchCategory = selectedCategory === 'Todas' || s.category === selectedCategory;
      const matchStatus = selectedStatus === 'Todos' || s.status === selectedStatus;

      return matchText && matchCategory && matchStatus;
    });
  }, [suppliers, searchTerm, selectedCategory, selectedStatus]);

  // Statistics KPIs
  const stats = useMemo(() => {
    const total = suppliers.length;
    const active = suppliers.filter(s => s.status === 'Ativo').length;
    const homologating = suppliers.filter(s => s.status === 'Em Homologação').length;
    
    const avgReliability = total > 0
      ? Math.round(suppliers.reduce((acc, s) => acc + (s.reliabilityScore || 80), 0) / total)
      : 0;

    return { total, active, homologating, avgReliability };
  }, [suppliers]);

  // Handle Open Add Modal
  const handleOpenAddModal = () => {
    setEditingSupplier(null);
    setFormData({
      name: '',
      tradeName: '',
      cnpj: '',
      email: '',
      phone: '',
      contactPerson: '',
      category: 'Matéria-Prima',
      address: '',
      cityState: '',
      paymentTerms: '30/60 dias',
      leadTime: '3 dias',
      rejectionRate: '0.5%',
      reliabilityScore: 90,
      certifications: 'ISO 9001',
      notes: '',
      status: 'Ativo'
    });
    setIsAddEditModalOpen(true);
  };

  // Handle Open Edit Modal
  const handleOpenEditModal = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      name: supplier.name,
      tradeName: supplier.tradeName || '',
      cnpj: supplier.cnpj,
      email: supplier.email,
      phone: supplier.phone,
      contactPerson: supplier.contactPerson || '',
      category: supplier.category,
      address: supplier.address,
      cityState: supplier.cityState || '',
      paymentTerms: supplier.paymentTerms || '30/60 dias',
      leadTime: supplier.leadTime,
      rejectionRate: supplier.rejectionRate || '0.5%',
      reliabilityScore: supplier.reliabilityScore || 90,
      certifications: supplier.certifications ? supplier.certifications.join(', ') : 'ISO 9001',
      notes: supplier.notes || '',
      status: supplier.status
    });
    setIsAddEditModalOpen(true);
  };

  // Handle Save Form (Add or Edit)
  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.cnpj.trim()) {
      alert('Por favor, preencha os campos obrigatórios (Razão Social e CNPJ).');
      return;
    }

    const certList = formData.certifications
      ? formData.certifications.split(',').map(c => c.trim()).filter(Boolean)
      : [];

    if (editingSupplier) {
      const updated: Supplier = {
        ...editingSupplier,
        name: formData.name,
        tradeName: formData.tradeName,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        contactPerson: formData.contactPerson,
        category: formData.category,
        address: formData.address,
        cityState: formData.cityState,
        paymentTerms: formData.paymentTerms,
        leadTime: formData.leadTime,
        rejectionRate: formData.rejectionRate,
        reliabilityScore: Number(formData.reliabilityScore) || 90,
        certifications: certList,
        notes: formData.notes,
        status: formData.status,
        operator: currentUser?.name || 'Administrador',
        updatedAt: new Date().toISOString()
      };

      if (onUpdateSupplier) {
        onUpdateSupplier(updated);
      } else {
        setLocalSuppliers(prev => prev.map(s => s.id === updated.id ? updated : s));
      }
    } else {
      const newSupplierData: Omit<Supplier, 'id'> = {
        name: formData.name,
        tradeName: formData.tradeName,
        cnpj: formData.cnpj,
        email: formData.email,
        phone: formData.phone,
        contactPerson: formData.contactPerson,
        category: formData.category,
        address: formData.address,
        cityState: formData.cityState,
        paymentTerms: formData.paymentTerms,
        leadTime: formData.leadTime,
        rejectionRate: formData.rejectionRate,
        reliabilityScore: Number(formData.reliabilityScore) || 90,
        certifications: certList,
        notes: formData.notes,
        status: formData.status,
        suppliedItemsCount: 0,
        operator: currentUser?.name || 'Administrador',
        updatedAt: new Date().toISOString()
      };

      if (onAddSupplier) {
        onAddSupplier(newSupplierData);
      } else {
        const generatedId = `FORN-${String(localSuppliers.length + 1).padStart(3, '0')}`;
        setLocalSuppliers(prev => [{ id: generatedId, ...newSupplierData }, ...prev]);
      }
    }

    setIsAddEditModalOpen(false);
  };

  // Handle Delete
  const handleDelete = (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o fornecedor "${name}"?`)) {
      if (onDeleteSupplier) {
        onDeleteSupplier(id);
      } else {
        setLocalSuppliers(prev => prev.filter(s => s.id !== id));
      }
    }
  };

  // Handle Toggle Status
  const handleToggleStatus = (id: string, currentStatus: Supplier['status']) => {
    const nextStatusMap: Record<Supplier['status'], Supplier['status']> = {
      'Ativo': 'Em Homologação',
      'Em Homologação': 'Inativo',
      'Inativo': 'Ativo'
    };
    const newStatus = nextStatusMap[currentStatus];

    if (onToggleSupplierStatus) {
      onToggleSupplierStatus(id, newStatus);
    } else {
      setLocalSuppliers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    }
  };

  // Handle Print
  const handleTriggerPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-indigo-600/10 text-indigo-600 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Cadastro de Fornecedores</h2>
              <p className="text-xs text-slate-500 mt-0.5">Gestão de parceiros homologados, insumos, lead time e índices de qualidade</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button 
            onClick={() => setIsPrintModalOpen(true)}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white text-xs px-4 py-2.5 rounded-xl font-bold shadow-xs transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4 text-indigo-400" />
            <span>Relatório / Impressão</span>
          </button>

          <button 
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4.5 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 transition-all hover:scale-[1.01] active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Fornecedor</span>
          </button>
        </div>
      </div>

      {/* KPI METRICS ROW */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Cadastrados</p>
            <p className="text-xl font-extrabold text-slate-800 font-mono mt-0.5">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ativos Homologados</p>
            <p className="text-xl font-extrabold text-emerald-600 font-mono mt-0.5">{stats.active}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Em Homologação</p>
            <p className="text-xl font-extrabold text-amber-600 font-mono mt-0.5">{stats.homologating}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center gap-3.5">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Confiabilidade Média</p>
            <p className="text-xl font-extrabold text-purple-700 font-mono mt-0.5">{stats.avgReliability}%</p>
          </div>
        </div>
      </div>

      {/* FILTER TOOLBAR */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search Bar */}
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input 
              type="text"
              placeholder="Buscar por Razão Social, Nome Fantasia, CNPJ, Contato, E-mail ou Categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium transition-all"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2 w-full md:w-auto">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as any)}
              className="w-full md:w-44 text-xs border border-slate-200 rounded-xl px-3 py-2.5 bg-slate-50 focus:bg-white font-bold text-slate-700 focus:outline-none"
            >
              <option value="Todos">Status: Todos</option>
              <option value="Ativo">🟢 Ativos</option>
              <option value="Em Homologação">🟡 Em Homologação</option>
              <option value="Inativo">🔴 Inativos</option>
            </select>
          </div>
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 scrollbar-none text-xs">
          <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0 mr-1 font-mono">Categorias:</span>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* SUPPLIERS LIST TABLE */}
      <div className="bg-white border border-slate-200/80 rounded-2xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <span className="text-xs font-bold text-slate-600">
            Exibindo <strong className="text-slate-900">{filteredSuppliers.length}</strong> fornecedor(es)
          </span>
          <span className="text-[10px] text-slate-400 font-mono">Atualizado em tempo real</span>
        </div>

        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-16 px-4">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-slate-700">Nenhum fornecedor encontrado</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Tente alterar os termos de busca, limpar os filtros ou cadastrar um novo fornecedor.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-xs hover:bg-indigo-700 transition-colors"
            >
              + Cadastrar Fornecedor Agora
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-[10px] font-extrabold text-slate-500 uppercase tracking-wider font-mono">
                  <th className="px-4 py-3.5">Fornecedor / Razão Social</th>
                  <th className="px-4 py-3.5">CNPJ</th>
                  <th className="px-4 py-3.5">Categoria</th>
                  <th className="px-4 py-3.5">Contato / E-mail</th>
                  <th className="px-4 py-3.5 text-center">Lead Time</th>
                  <th className="px-4 py-3.5 text-center">Confiabilidade</th>
                  <th className="px-4 py-3.5 text-center">Status</th>
                  <th className="px-4 py-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSuppliers.map(s => {
                  const statusBadgeClass = 
                    s.status === 'Ativo' 
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                      : s.status === 'Em Homologação'
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-slate-100 text-slate-600 border-slate-200';

                  return (
                    <tr key={s.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Name & Trade Name */}
                      <td className="px-4 py-3.5">
                        <div className="flex items-start gap-2.5">
                          <div className="p-2 bg-slate-100 text-slate-600 rounded-lg shrink-0 mt-0.5">
                            <Building2 className="w-4 h-4 text-indigo-600" />
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 block">{s.name}</span>
                            {s.tradeName && (
                              <span className="text-[10px] text-slate-500 font-medium block">Fantasia: {s.tradeName}</span>
                            )}
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5 block">{s.address}</span>
                          </div>
                        </div>
                      </td>

                      {/* CNPJ */}
                      <td className="px-4 py-3.5 font-mono text-slate-600 font-semibold whitespace-nowrap">
                        {s.cnpj}
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5">
                        <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-700 font-medium rounded-lg text-[10px]">
                          {s.category}
                        </span>
                      </td>

                      {/* Contact & Email */}
                      <td className="px-4 py-3.5">
                        <span className="font-semibold text-slate-800 block">{s.contactPerson || '—'}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1"><Mail className="w-3 h-3 text-slate-400" /> {s.email}</span>
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          <span className="flex items-center gap-1 font-mono"><Phone className="w-3 h-3 text-slate-400" /> {s.phone}</span>
                        </div>
                      </td>

                      {/* Lead Time */}
                      <td className="px-4 py-3.5 text-center font-mono font-bold text-slate-700">
                        {s.leadTime}
                      </td>

                      {/* Reliability Score */}
                      <td className="px-4 py-3.5 text-center">
                        <div className="inline-flex items-center gap-1 font-bold text-xs">
                          <span className={`${s.reliabilityScore >= 90 ? 'text-emerald-600' : s.reliabilityScore >= 75 ? 'text-amber-600' : 'text-rose-600'}`}>
                            {s.reliabilityScore}%
                          </span>
                        </div>
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full mx-auto mt-1 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${s.reliabilityScore >= 90 ? 'bg-emerald-500' : s.reliabilityScore >= 75 ? 'bg-amber-500' : 'bg-rose-500'}`}
                            style={{ width: `${s.reliabilityScore}%` }}
                          ></div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 text-center">
                        <button
                          onClick={() => handleToggleStatus(s.id, s.status)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-bold border transition-all cursor-pointer ${statusBadgeClass}`}
                          title="Clique para alternar o status do fornecedor"
                        >
                          {s.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setDetailSupplier(s);
                              setDetailTab('geral');
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Ficha do Fornecedor"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Editar Cadastro"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.name)}
                            className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Excluir Fornecedor"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL: CADASTRAR / EDITAR FORNECEDOR */}
      {isAddEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-600/30 rounded-lg text-indigo-400">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold tracking-tight">
                    {editingSupplier ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor'}
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">Preencha os dados corporativos e técnicos do parceiro fornecedor</p>
                </div>
              </div>
              <button 
                onClick={() => setIsAddEditModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveForm} className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Razão Social */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    Razão Social / Nome da Empresa <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="Ex: Metalúrgica Alfa S.A."
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Nome Fantasia */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome Fantasia</label>
                  <input 
                    type="text"
                    placeholder="Ex: Alfa Metalurgia"
                    value={formData.tradeName}
                    onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* CNPJ */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                    CNPJ <span className="text-rose-500">*</span>
                  </label>
                  <input 
                    type="text"
                    required
                    placeholder="00.000.000/0001-00"
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-medium"
                  />
                </div>

                {/* E-mail */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail Comercial</label>
                  <input 
                    type="email"
                    placeholder="comercial@fornecedor.com.br"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="text"
                    placeholder="(11) 99999-9999"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-medium"
                  />
                </div>

                {/* Pessoa de Contato / Vendedor */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pessoa de Contato / Vendedor</label>
                  <input 
                    type="text"
                    placeholder="Ex: Carlos Roberto (Gerente de Conta)"
                    value={formData.contactPerson}
                    onChange={(e) => setFormData({ ...formData, contactPerson: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Categoria */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Categoria de Fornecimento</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  >
                    {CATEGORIES.filter(c => c !== 'Todas').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                {/* Endereço */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço Completo & Cidade/UF</label>
                  <input 
                    type="text"
                    placeholder="Ex: Av. Industrial, 1000 - Distrito Industrial - Sorocaba / SP"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Condições de Pagamento */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Condições de Pagamento</label>
                  <input 
                    type="text"
                    placeholder="Ex: 30/60 dias, À vista, 28 ddl"
                    value={formData.paymentTerms}
                    onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Lead Time Estimado */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Lead Time Médio</label>
                  <input 
                    type="text"
                    placeholder="Ex: 3 dias"
                    value={formData.leadTime}
                    onChange={(e) => setFormData({ ...formData, leadTime: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Confiabilidade Score */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Score Confiabilidade (0 - 100%)</label>
                  <input 
                    type="number"
                    min="0"
                    max="100"
                    value={formData.reliabilityScore}
                    onChange={(e) => setFormData({ ...formData, reliabilityScore: Number(e.target.value) })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status de Homologação</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-slate-700"
                  >
                    <option value="Ativo">🟢 Ativo (Homologado)</option>
                    <option value="Em Homologação">🟡 Em Homologação</option>
                    <option value="Inativo">🔴 Inativo</option>
                  </select>
                </div>

                {/* Certificações */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Certificações (separadas por vírgula)</label>
                  <input 
                    type="text"
                    placeholder="Ex: ISO 9001, ISO 14001, AS9100D, IATF 16949"
                    value={formData.certifications}
                    onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                    className="w-full border border-slate-200 px-3.5 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>

                {/* Observações */}
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Observações Internas / Histórico</label>
                  <textarea
                    rows={3}
                    placeholder="Anotações sobre homologação, garantias, acordos comerciais..."
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                  />
                </div>
              </div>

              {/* Form Footer */}
              <div className="pt-4 border-t border-slate-200 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddEditModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingSupplier ? 'Salvar Alterações' : 'Cadastrar Fornecedor'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FICHA COMPLETA DO FORNECEDOR (DETAIL SHEET) */}
      {detailSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-900 text-white p-6 relative overflow-hidden shrink-0">
              <div className="flex justify-between items-start z-10 relative">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-slate-800 rounded-xl border border-slate-700 text-indigo-400">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-white">{detailSupplier.name}</h3>
                      <span className={`px-2 py-0.5 text-[9px] font-bold uppercase rounded border ${
                        detailSupplier.status === 'Ativo' 
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      }`}>
                        {detailSupplier.status}
                      </span>
                    </div>
                    {detailSupplier.tradeName && <p className="text-xs text-slate-300 mt-0.5">Fantasia: {detailSupplier.tradeName}</p>}
                    <p className="text-xs text-slate-400 font-mono mt-1">CNPJ: {detailSupplier.cnpj}</p>
                    
                    <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3 text-xs text-slate-300">
                      <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-500" /> {detailSupplier.address}</span>
                      <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5 text-slate-500" /> {detailSupplier.email}</span>
                      <span className="flex items-center gap-1 font-mono"><Phone className="w-3.5 h-3.5 text-slate-500" /> {detailSupplier.phone}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => {
                      setEditingSupplier(detailSupplier);
                      setIsAddEditModalOpen(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5" /> Editar
                  </button>
                  <button 
                    onClick={() => setDetailSupplier(null)}
                    className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* KPI Performance grid */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Índice de Confiabilidade</span>
                <span className="text-2xl font-extrabold text-indigo-600 font-mono mt-1">{detailSupplier.reliabilityScore}%</span>
                <span className="text-[9px] text-emerald-600 font-bold uppercase mt-0.5">
                  {detailSupplier.reliabilityScore >= 90 ? 'Excelente' : 'Satisfatório'}
                </span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lead Time de Entrega</span>
                <span className="text-2xl font-extrabold text-slate-800 mt-1">{detailSupplier.leadTime}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Prazo Médio de Recebimento</span>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col justify-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Condição de Pagamento</span>
                <span className="text-base font-extrabold text-slate-800 mt-1">{detailSupplier.paymentTerms || '30/60 dias'}</span>
                <span className="text-[9px] text-slate-400 mt-0.5">Termo Comercial Homologado</span>
              </div>
            </div>

            {/* Navigation Tabs Inside Sheet */}
            <div className="flex border-b border-slate-200 bg-slate-100/60 text-xs shrink-0">
              <button 
                onClick={() => setDetailTab('geral')}
                className={`px-5 py-2.5 font-bold uppercase tracking-wider border-r border-slate-200 transition-colors ${
                  detailTab === 'geral' ? 'bg-white text-slate-900 border-b-2 border-b-indigo-600' : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                Informações Gerais
              </button>
              <button 
                onClick={() => setDetailTab('produtos')}
                className={`px-5 py-2.5 font-bold uppercase tracking-wider border-r border-slate-200 transition-colors ${
                  detailTab === 'produtos' ? 'bg-white text-slate-900 border-b-2 border-b-indigo-600' : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                Materiais / Insumos
              </button>
            </div>

            {/* Content Body */}
            <div className="p-6 overflow-y-auto flex-1 text-xs space-y-4">
              {detailTab === 'geral' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Pessoa de Contato</span>
                      <span className="text-xs font-bold text-slate-800">{detailSupplier.contactPerson || 'Não informado'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Categoria Principal</span>
                      <span className="text-xs font-bold text-slate-800">{detailSupplier.category}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Cadastrado / Operador</span>
                      <span className="text-xs font-bold text-slate-800">{detailSupplier.operator || 'Sistema'}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Taxa de Rejeição de Lote</span>
                      <span className="text-xs font-bold text-slate-800">{detailSupplier.rejectionRate || '0.5%'}</span>
                    </div>
                  </div>

                  {detailSupplier.certifications && detailSupplier.certifications.length > 0 && (
                    <div>
                      <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Certificações de Qualidade</h4>
                      <div className="flex flex-wrap gap-2">
                        {detailSupplier.certifications.map(cert => (
                          <span key={cert} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 font-bold rounded-lg font-mono text-xs">
                            <Award className="w-3.5 h-3.5 text-indigo-600" />
                            {cert}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {detailSupplier.notes && (
                    <div className="bg-amber-50/60 border border-amber-200/80 p-4 rounded-xl">
                      <h4 className="text-[10px] font-bold uppercase text-amber-800 tracking-wider mb-1">Observações Internas</h4>
                      <p className="text-xs text-amber-900 leading-relaxed font-medium">{detailSupplier.notes}</p>
                    </div>
                  )}
                </div>
              )}

              {detailTab === 'produtos' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500">Insumos e matérias-primas fornecidas habitualmente por este fornecedor:</p>
                  <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
                    <div className="p-3 bg-slate-50 flex items-center justify-between text-xs font-bold text-slate-700">
                      <span>Item / Insumo</span>
                      <span>Prazo / Lead Time</span>
                    </div>
                    <div className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Bobina de Aço Laminado Frio G-42</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: ST-5091 • Aço Inoxidável 304</p>
                      </div>
                      <span className="font-mono font-bold text-indigo-600">{detailSupplier.leadTime}</span>
                    </div>
                    <div className="p-3 flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-slate-800">Eixo de Transmissão Principal Forjado</p>
                        <p className="text-[10px] text-slate-400 font-mono">SKU: ST-2041 • Usinagem Mecânica</p>
                      </div>
                      <span className="font-mono font-bold text-indigo-600">3 dias</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button 
                onClick={() => setDetailSupplier(null)}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINT / REPORT MODAL & PRINTABLE AREA */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-3xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Printer className="w-5 h-5 text-indigo-400" />
                <div>
                  <h3 className="text-sm font-bold">Relatório do Cadastro de Fornecedores</h3>
                  <p className="text-[11px] text-slate-400">Imprimir listagem oficial de parceiros cadastrados</p>
                </div>
              </div>
              <button 
                onClick={() => setIsPrintModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                O relatório conterá a listagem de <strong>{filteredSuppliers.length}</strong> fornecedor(es) com CNPJ, contatos, categorias, lead time e status de homologação.
              </p>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 max-h-60 overflow-y-auto space-y-2">
                {filteredSuppliers.map(s => (
                  <div key={s.id} className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
                    <div>
                      <p className="font-bold text-slate-800">{s.name}</p>
                      <p className="text-[10px] text-slate-500 font-mono">CNPJ: {s.cnpj} • {s.category}</p>
                    </div>
                    <span className="font-bold text-xs text-indigo-600">{s.status}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleTriggerPrint}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" />
                  <span>Imprimir Agora</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
