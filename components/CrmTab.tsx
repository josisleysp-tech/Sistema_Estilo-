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
  MessageSquare, 
  Send, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  DollarSign, 
  TrendingUp, 
  UserPlus, 
  Edit3, 
  Trash2, 
  Sliders, 
  Share2, 
  Copy, 
  Check, 
  Settings, 
  Wifi, 
  WifiOff, 
  QrCode, 
  Sparkles, 
  Calendar, 
  ChevronRight, 
  Tag, 
  FileText, 
  ExternalLink,
  Kanban,
  List,
  MessageCircle,
  PhoneCall,
  UserCheck,
  Activity
} from 'lucide-react';
import { CrmLead, CrmInteraction, Customer, SalesOrder, UserAccess, WhatsAppMessageTemplate, WhatsAppConfig } from '../lib/types';
import WhatsAppQRCodeModal from './WhatsAppQRCodeModal';
import WhatsAppDashboard from './WhatsAppDashboard';

interface CrmTabProps {
  leads: CrmLead[];
  customers: Customer[];
  salesOrders: SalesOrder[];
  onAddLead: (lead: Omit<CrmLead, 'id' | 'createdAt'>) => void;
  onUpdateLead: (id: string, updatedFields: Partial<CrmLead>) => void;
  onDeleteLead: (id: string) => void;
  onConvertLeadToCustomer: (lead: CrmLead) => void;
  onAddSalesOrderFromLead?: (lead: CrmLead) => void;
  industrialSegments?: string[];
  currentUser?: UserAccess;
  users?: UserAccess[];
  whatsappConfig: WhatsAppConfig;
  onUpdateWhatsAppConfig: (config: WhatsAppConfig) => void;
}

const DEFAULT_TEMPLATES: WhatsAppMessageTemplate[] = [
  {
    id: 'TPL-1',
    title: 'Boas-Vindas & Apresentação',
    category: 'Primeiro Contato',
    content: 'Olá {nome}, tudo bem? Sou {vendedor} da Estilo Coifas. Vi seu interesse no projeto de exaustão/coifa para a {empresa}. Como posso ajudar você hoje?'
  },
  {
    id: 'TPL-2',
    title: 'Envio de Orçamento Técnico',
    category: 'Orçamento',
    content: 'Olá {nome}! Segue o link do orçamento técnico referente ao projeto da {empresa}. Valor estimado: {valor}. Ficamos à disposição para esclarecer qualquer dúvida!'
  },
  {
    id: 'TPL-3',
    title: 'Follow-up de Negociação',
    category: 'Orçamento',
    content: 'Olá {nome}, passando para saber se conseguiu avaliar a proposta enviada para a {empresa}. Temos condições especiais para fechamento esta semana!'
  },
  {
    id: 'TPL-4',
    title: 'Atualização de Status de Pedido',
    category: 'Status de Pedido',
    content: 'Olá {nome}! Seu pedido #{pedido} na Estilo Coifas já entrou na fase de produção. Qualquer novidade informamos por aqui!'
  },
  {
    id: 'TPL-5',
    title: 'Lembrete Amigável / Atendimento',
    category: 'Cobrança',
    content: 'Olá {nome}, tudo bem? Gostaria de saber se precisa de mais informações para dar andamento ao pedido da {empresa}.'
  }
];

const STAGES: Array<CrmLead['stage']> = [
  'Novo Lead',
  'Qualificação',
  'Proposta Enviada',
  'Em Negociação',
  'Fechado (Ganho)',
  'Perdido'
];

export default function CrmTab({
  leads,
  customers,
  salesOrders,
  onAddLead,
  onUpdateLead,
  onDeleteLead,
  onConvertLeadToCustomer,
  onAddSalesOrderFromLead,
  industrialSegments = ["Cliente Final", "Lojista", "Metalurgia", "Siderurgia", "Restaurante / Gastronomia", "Outros"],
  currentUser,
  users = [],
  whatsappConfig,
  onUpdateWhatsAppConfig
}: CrmTabProps) {
  const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'whatsapp' | 'dashboard' | 'settings'>('kanban');
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState<string>('Todos');
  const [assignedFilter, setAssignedFilter] = useState<string>('Todos');

  // New Lead Modal
  const [isAddLeadModalOpen, setIsAddLeadModalOpen] = useState(false);
  const [newLeadName, setNewLeadName] = useState('');
  const [newLeadCompany, setNewLeadCompany] = useState('');
  const [newLeadPhone, setNewLeadPhone] = useState('');
  const [newLeadEmail, setNewLeadEmail] = useState('');
  const [newLeadSegment, setNewLeadSegment] = useState(industrialSegments[0] || 'Restaurante / Gastronomia');
  const [newLeadValue, setNewLeadValue] = useState('');
  const [newLeadPriority, setNewLeadPriority] = useState<CrmLead['priority']>('Média');
  const [newLeadStage, setNewLeadStage] = useState<CrmLead['stage']>('Novo Lead');
  const [newLeadAssigned, setNewLeadAssigned] = useState(currentUser?.name || 'Eduardo Fontes');
  const [newLeadNotes, setNewLeadNotes] = useState('');

  // Selected Lead for Detail Drawer / Modal
  const [selectedLead, setSelectedLead] = useState<CrmLead | null>(null);
  const [interactionNote, setInteractionNote] = useState('');
  const [interactionChannel, setInteractionChannel] = useState<'WhatsApp' | 'Telefone' | 'E-mail' | 'Reunião'>('WhatsApp');

  // WhatsApp Quick Sender Drawer
  const [waTargetLead, setWaTargetLead] = useState<CrmLead | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(DEFAULT_TEMPLATES[0].id);
  const [customWaMessage, setCustomWaMessage] = useState<string>('');
  const [copiedText, setCopiedText] = useState(false);

  // Filtered Leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = 
        lead.name.toLowerCase().includes(search.toLowerCase()) ||
        lead.company.toLowerCase().includes(search.toLowerCase()) ||
        lead.phone.includes(search) ||
        lead.email.toLowerCase().includes(search.toLowerCase());
      
      const matchesStage = stageFilter === 'Todos' || lead.stage === stageFilter;
      const matchesAssigned = assignedFilter === 'Todos' || lead.assignedTo === assignedFilter;

      return matchesSearch && matchesStage && matchesAssigned;
    });
  }, [leads, search, stageFilter, assignedFilter]);

  // Key Metrics
  const metrics = useMemo(() => {
    const totalLeads = leads.length;
    const pipelineValue = leads
      .filter(l => l.stage !== 'Perdido')
      .reduce((acc, l) => acc + (l.estimatedValue || 0), 0);
    const wonLeads = leads.filter(l => l.stage === 'Fechado (Ganho)').length;
    const conversionRate = totalLeads > 0 ? ((wonLeads / totalLeads) * 100).toFixed(1) : '0.0';
    const activeNegotiations = leads.filter(l => l.stage === 'Em Negociação' || l.stage === 'Proposta Enviada').length;

    return { totalLeads, pipelineValue, wonLeads, conversionRate, activeNegotiations };
  }, [leads]);

  // Clean phone string for wa.me link
  const formatPhoneForWa = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    if (digits.length === 10 || digits.length === 11) {
      return `55${digits}`;
    }
    return digits;
  };

  // Open WhatsApp Link
  const handleOpenWhatsApp = (phone: string, text?: string) => {
    const cleanPhone = formatPhoneForWa(phone);
    const encodedText = text ? encodeURIComponent(text) : '';
    const url = `https://wa.me/${cleanPhone}${encodedText ? `?text=${encodedText}` : ''}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  // Handle Create Lead
  const handleCreateLeadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadName.trim() || !newLeadPhone.trim()) return;

    onAddLead({
      name: newLeadName.trim(),
      company: newLeadCompany.trim() || 'Pessoa Física',
      phone: newLeadPhone.trim(),
      email: newLeadEmail.trim(),
      segment: newLeadSegment,
      estimatedValue: Number(newLeadValue) || 0,
      priority: newLeadPriority,
      stage: newLeadStage,
      assignedTo: newLeadAssigned,
      notes: newLeadNotes,
      lastContactDate: new Date().toLocaleDateString('pt-BR'),
      history: [
        {
          id: `INT-${Date.now()}`,
          timestamp: new Date().toLocaleString('pt-BR'),
          user: currentUser?.name || 'Sistema',
          channel: 'WhatsApp',
          type: 'Nota Interna',
          notes: 'Lead criado no CRM.'
        }
      ]
    });

    // Reset Form
    setNewLeadName('');
    setNewLeadCompany('');
    setNewLeadPhone('');
    setNewLeadEmail('');
    setNewLeadValue('');
    setNewLeadNotes('');
    setIsAddLeadModalOpen(false);
  };

  // Add Interaction History to Lead
  const handleAddInteraction = () => {
    if (!selectedLead || !interactionNote.trim()) return;

    const newInteraction: CrmInteraction = {
      id: `INT-${Date.now()}`,
      timestamp: new Date().toLocaleString('pt-BR'),
      user: currentUser?.name || 'Operador',
      channel: interactionChannel,
      type: 'Enviada',
      notes: interactionNote.trim()
    };

    const updatedHistory = [...(selectedLead.history || []), newInteraction];
    onUpdateLead(selectedLead.id, {
      history: updatedHistory,
      lastContactDate: new Date().toLocaleDateString('pt-BR')
    });

    setSelectedLead({
      ...selectedLead,
      history: updatedHistory,
      lastContactDate: new Date().toLocaleDateString('pt-BR')
    });

    setInteractionNote('');
  };

  // Generate template message text for target lead
  const buildTemplateText = (template: WhatsAppMessageTemplate, lead: CrmLead) => {
    let text = template.content;
    text = text.replace(/{nome}/g, lead.name);
    text = text.replace(/{empresa}/g, lead.company || 'sua empresa');
    text = text.replace(/{valor}/g, lead.estimatedValue ? `R$ ${lead.estimatedValue.toLocaleString('pt-BR')}` : 'a combinar');
    text = text.replace(/{vendedor}/g, currentUser?.name || 'Comercial Estilo Coifas');
    text = text.replace(/{pedido}/g, 'ORC-' + lead.id.replace('LEAD-', ''));
    return text;
  };

  return (
    <div className="space-y-6">
      
      {/* CRM HEADER & WHATSAPP INTEGRATION BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.15),transparent)] pointer-events-none"></div>
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
                <MessageSquare className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold tracking-tight">CRM & WhatsApp Integrado</h1>
                  <button
                    onClick={() => setIsQrModalOpen(true)}
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase border cursor-pointer hover:opacity-90 transition-opacity flex items-center gap-1 ${
                      whatsappConfig.isConnected 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' 
                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    }`}
                    title="Clique para ver o status / QR Code"
                  >
                    <span>{whatsappConfig.isConnected ? '● WhatsApp Ativo' : '○ Conexão Pendente'}</span>
                    <QrCode className="w-3 h-3 text-emerald-400" />
                  </button>
                </div>
                <p className="text-xs text-slate-300 mt-0.5">
                  Funil de vendas industrial, disparo direto via WhatsApp Web/API e conversão rápida de leads em clientes e pedidos.
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIsQrModalOpen(true)}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <QrCode className="w-4 h-4" />
              <span>Escanear QR Code</span>
            </button>
            <button
              onClick={() => setIsAddLeadModalOpen(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <UserPlus className="w-4 h-4 text-emerald-400" />
              <span>Novo Lead</span>
            </button>
            <button
              onClick={() => setViewMode(viewMode === 'settings' ? 'kanban' : 'settings')}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold text-xs rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Settings className="w-4 h-4 text-emerald-400" />
              <span>Configurações</span>
            </button>
          </div>
        </div>

        {/* STATS STRIP */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800 font-mono">
          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Total de Leads</span>
            <p className="text-lg font-extrabold text-white mt-1">{metrics.totalLeads}</p>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Valor do Funil</span>
            <p className="text-lg font-extrabold text-emerald-400 mt-1">
              R$ {metrics.pipelineValue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
            </p>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Em Negociação</span>
            <p className="text-lg font-extrabold text-indigo-400 mt-1">{metrics.activeNegotiations}</p>
          </div>

          <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800/80">
            <span className="text-[10px] uppercase font-bold text-slate-400">Taxa de Conversão</span>
            <p className="text-lg font-extrabold text-amber-400 mt-1">{metrics.conversionRate}%</p>
          </div>
        </div>
      </div>

      {/* TOOLBAR CONTROLS */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* VIEW MODE SELECTOR */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
          <button
            onClick={() => setViewMode('kanban')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'kanban' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Kanban className="w-3.5 h-3.5 text-indigo-600" />
            <span>Funil Kanban</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'list' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <List className="w-3.5 h-3.5 text-indigo-600" />
            <span>Lista de Leads</span>
          </button>
          <button
            onClick={() => setViewMode('whatsapp')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'whatsapp' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
            <span>Mensagens & Modelos</span>
          </button>
          <button
            onClick={() => setViewMode('dashboard')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              viewMode === 'dashboard' 
                ? 'bg-white text-slate-800 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-500" />
            <span>Painel Gateway</span>
          </button>
        </div>

        {/* SEARCH AND FILTERS */}
        <div className="flex flex-wrap items-center gap-2.5 flex-1 max-w-xl">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar por nome, empresa, telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            />
          </div>

          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="Todos">Todas as Etapas</option>
            {STAGES.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <option value="Todos">Todos os Vendedores</option>
            {users.map(u => (
              <option key={u.name} value={u.name}>{u.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* MAIN VIEW CONTENTS */}

      {/* 1. KANBAN FUNNEL VIEW */}
      {viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
          {STAGES.map(stage => {
            const stageLeads = filteredLeads.filter(l => l.stage === stage);
            const stageTotal = stageLeads.reduce((sum, l) => sum + (l.estimatedValue || 0), 0);

            return (
              <div key={stage} className="bg-slate-100/80 rounded-2xl p-3 border border-slate-200 flex flex-col min-h-[500px]">
                
                {/* Column Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-200/80">
                  <div>
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">{stage}</h3>
                    <p className="text-[10px] font-mono text-slate-500 font-semibold mt-0.5">
                      R$ {stageTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-mono font-bold text-[10px] rounded-full">
                    {stageLeads.length}
                  </span>
                </div>

                {/* Cards Container */}
                <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-1">
                  {stageLeads.length === 0 ? (
                    <div className="p-4 border border-dashed border-slate-200 rounded-xl text-center text-[10px] text-slate-400">
                      Nenhum lead nesta etapa
                    </div>
                  ) : (
                    stageLeads.map(lead => (
                      <div
                        key={lead.id}
                        className="bg-white p-3.5 rounded-xl border border-slate-200/90 shadow-xs hover:shadow-md transition-all space-y-2.5 relative group"
                      >
                        {/* Priority Badge & ID */}
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] font-mono font-bold text-slate-400">{lead.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            lead.priority === 'Alta' 
                              ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                              : lead.priority === 'Média'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            {lead.priority}
                          </span>
                        </div>

                        {/* Title & Company */}
                        <div>
                          <h4 
                            onClick={() => setSelectedLead(lead)}
                            className="text-xs font-bold text-slate-900 hover:text-indigo-600 cursor-pointer line-clamp-1"
                          >
                            {lead.name}
                          </h4>
                          <p className="text-[10px] font-medium text-slate-500 flex items-center gap-1 mt-0.5 truncate">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {lead.company}
                          </p>
                        </div>

                        {/* Value & Segment */}
                        <div className="flex justify-between items-center pt-1 border-t border-slate-100 text-xs">
                          <span className="font-mono font-extrabold text-emerald-600">
                            R$ {lead.estimatedValue.toLocaleString('pt-BR')}
                          </span>
                          <span className="text-[9px] text-slate-400 font-medium truncate max-w-[80px]">
                            {lead.segment}
                          </span>
                        </div>

                        {/* Fast Action WhatsApp Button */}
                        <div className="flex items-center gap-1.5 pt-1">
                          <button
                            onClick={() => {
                              setWaTargetLead(lead);
                              setViewMode('whatsapp');
                            }}
                            className="flex-1 py-1 px-2 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                            title="Enviar WhatsApp"
                          >
                            <MessageSquare className="w-3 h-3 text-emerald-600" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-lg transition-colors cursor-pointer"
                            title="Ver Detalhes"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* 2. LIST VIEW */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  <th className="p-3">ID / Lead</th>
                  <th className="p-3">Empresa / Segmento</th>
                  <th className="p-3">Contato WhatsApp</th>
                  <th className="p-3">Valor Estimado</th>
                  <th className="p-3">Etapa / Funil</th>
                  <th className="p-3">Responsável</th>
                  <th className="p-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLeads.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-slate-400 text-xs">
                      Nenhum lead encontrado com os filtros atuais.
                    </td>
                  </tr>
                ) : (
                  filteredLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold text-indigo-600 text-[11px]">{lead.id}</div>
                        <div className="font-bold text-slate-900">{lead.name}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800">{lead.company}</div>
                        <div className="text-[10px] text-slate-400">{lead.segment}</div>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono">{lead.phone}</span>
                          <button
                            onClick={() => handleOpenWhatsApp(lead.phone)}
                            className="p-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-md transition-colors cursor-pointer"
                            title="Abrir WhatsApp"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-emerald-600">
                        R$ {lead.estimatedValue.toLocaleString('pt-BR')}
                      </td>
                      <td className="p-3">
                        <select
                          value={lead.stage}
                          onChange={(e) => onUpdateLead(lead.id, { stage: e.target.value as CrmLead['stage'] })}
                          className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none cursor-pointer"
                        >
                          {STAGES.map(s => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </td>
                      <td className="p-3 font-medium text-slate-600">
                        {lead.assignedTo}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setWaTargetLead(lead);
                              setViewMode('whatsapp');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[10px] rounded-lg shadow-xs transition-all flex items-center gap-1 cursor-pointer"
                          >
                            <Send className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </button>

                          <button
                            onClick={() => onConvertLeadToCustomer(lead)}
                            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-lg border border-indigo-200 transition-all flex items-center gap-1 cursor-pointer"
                            title="Converter em Cliente no ERP"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Virar Cliente</span>
                          </button>

                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
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
      )}

      {/* 3. WHATSAPP TEMPLATES & DIRECT DISPATCHER */}
      {viewMode === 'whatsapp' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Select Target Lead & Template */}
          <div className="lg:col-span-5 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-5">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                Gerador de Mensagem WhatsApp
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Selecione um lead e um modelo de mensagem para personalizar e enviar direto.
              </p>
            </div>

            {/* Target Lead Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-500">
                1. Selecionar Lead Destinatário
              </label>
              <select
                value={waTargetLead?.id || ''}
                onChange={(e) => {
                  const found = leads.find(l => l.id === e.target.value);
                  setWaTargetLead(found || null);
                }}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
              >
                <option value="">-- Selecione um Lead --</option>
                {leads.map(lead => (
                  <option key={lead.id} value={lead.id}>
                    {lead.name} ({lead.company}) — {lead.phone}
                  </option>
                ))}
              </select>
            </div>

            {/* Template Selector */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-500">
                2. Selecionar Modelo Pró-Forma
              </label>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {DEFAULT_TEMPLATES.map(tpl => {
                  const isSelected = selectedTemplateId === tpl.id;
                  return (
                    <div
                      key={tpl.id}
                      onClick={() => {
                        setSelectedTemplateId(tpl.id);
                        if (waTargetLead) {
                          setCustomWaMessage(buildTemplateText(tpl, waTargetLead));
                        } else {
                          setCustomWaMessage(tpl.content);
                        }
                      }}
                      className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                        isSelected 
                          ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-400' 
                          : 'bg-slate-50/50 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <div className="flex justify-between items-center font-bold text-slate-800 mb-1">
                        <span>{tpl.title}</span>
                        <span className="text-[9px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono">
                          {tpl.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 italic">
                        &quot;{tpl.content}&quot;
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Column: Live Message Preview & Direct Send */}
          <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Pré-visualização do Envio</h3>
                  <p className="text-xs text-slate-500">
                    {waTargetLead ? `Destino: ${waTargetLead.name} (${waTargetLead.phone})` : 'Escolha um lead para habilitar as variáveis automáticas'}
                  </p>
                </div>

                {waTargetLead && (
                  <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-lg font-mono">
                    {waTargetLead.phone}
                  </span>
                )}
              </div>

              {/* Message Editor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-500">
                  Texto da Mensagem (Editável)
                </label>
                <textarea
                  rows={6}
                  value={customWaMessage || (waTargetLead ? buildTemplateText(DEFAULT_TEMPLATES[0], waTargetLead) : DEFAULT_TEMPLATES[0].content)}
                  onChange={(e) => setCustomWaMessage(e.target.value)}
                  className="w-full p-3.5 bg-slate-900 text-slate-100 font-sans text-xs rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 leading-relaxed"
                  placeholder="Digite a mensagem para enviar via WhatsApp..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
              <button
                onClick={() => {
                  const text = customWaMessage || (waTargetLead ? buildTemplateText(DEFAULT_TEMPLATES[0], waTargetLead) : DEFAULT_TEMPLATES[0].content);
                  navigator.clipboard.writeText(text);
                  setCopiedText(true);
                  setTimeout(() => setCopiedText(false), 2000);
                }}
                className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                {copiedText ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                <span>{copiedText ? 'Copiado!' : 'Copiar Texto'}</span>
              </button>

              <button
                disabled={!waTargetLead}
                onClick={() => {
                  if (!waTargetLead) return;
                  const text = customWaMessage || buildTemplateText(DEFAULT_TEMPLATES[0], waTargetLead);
                  handleOpenWhatsApp(waTargetLead.phone, text);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Disparar no WhatsApp Web / App</span>
              </button>
            </div>

          </div>

        </div>
      )}

      {/* 4. WHATSAPP GATEWAY REAL-TIME DASHBOARD */}
      {viewMode === 'dashboard' && (
        <WhatsAppDashboard
          whatsappConfig={whatsappConfig}
          onUpdateWhatsAppConfig={onUpdateWhatsAppConfig}
          leads={leads}
          onOpenQrModal={() => setIsQrModalOpen(true)}
        />
      )}

      {/* 5. WHATSAPP SETTINGS & GATEWAY CONFIG */}
      {viewMode === 'settings' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs space-y-6 max-w-3xl mx-auto">
          <div className="border-b border-slate-100 pb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">Configurações da Conexão WhatsApp</h2>
                <p className="text-xs text-slate-500">Parâmetros de integração com API/Gateway de WhatsApp (Z-API, Evolution API, Cloud API).</p>
              </div>
            </div>

            <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${
              whatsappConfig.isConnected 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {whatsappConfig.isConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{whatsappConfig.isConnected ? 'Conectado' : 'Simulação Off-line'}</span>
            </span>
          </div>

          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-500">Número Principal da Empresa</label>
                <input
                  type="text"
                  value={whatsappConfig.companyNumber}
                  onChange={(e) => onUpdateWhatsAppConfig({ ...whatsappConfig, companyNumber: e.target.value })}
                  placeholder="(11) 99876-5432"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-mono uppercase font-bold text-slate-500">Nome da Instância / Gateway</label>
                <input
                  type="text"
                  value={whatsappConfig.instanceName}
                  onChange={(e) => onUpdateWhatsAppConfig({ ...whatsappConfig, instanceName: e.target.value })}
                  placeholder="estilocoifas_prod"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-500">API Key / Token de Autenticação</label>
              <input
                type="password"
                value={whatsappConfig.apiKey}
                onChange={(e) => onUpdateWhatsAppConfig({ ...whatsappConfig, apiKey: e.target.value })}
                placeholder="••••••••••••••••••••••••••••••••"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-mono uppercase font-bold text-slate-500">URL do Servidor Gateway (Webhook / REST)</label>
              <input
                type="text"
                value={whatsappConfig.serverUrl}
                onChange={(e) => onUpdateWhatsAppConfig({ ...whatsappConfig, serverUrl: e.target.value })}
                placeholder="https://api.whatsapp-gateway.com/v1"
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-bold text-slate-800">Status de Ativação do QR Code / Instância</p>
                <p className="text-[11px] text-slate-500">Escaneie o QR Code para parear o aparelho ou alterne a simulação de conexão.</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsQrModalOpen(true)}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                >
                  <QrCode className="w-4 h-4" />
                  <span>Abrir QR Code</span>
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateWhatsAppConfig({ ...whatsappConfig, isConnected: !whatsappConfig.isConnected })}
                  className={`px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    whatsappConfig.isConnected 
                      ? 'bg-rose-100 text-rose-700 hover:bg-rose-200' 
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {whatsappConfig.isConnected ? 'Desconectar' : 'Ativar Rápido'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVO LEAD */}
      {isAddLeadModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Cadastrar Novo Lead no CRM</h3>
              </div>
              <button onClick={() => setIsAddLeadModalOpen(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateLeadSubmit} className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Nome do Contato *</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: Roberto Silva"
                    value={newLeadName}
                    onChange={(e) => setNewLeadName(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Empresa / Razão Social</label>
                  <input
                    type="text"
                    placeholder="Ex: Madero Gastronomia"
                    value={newLeadCompany}
                    onChange={(e) => setNewLeadCompany(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">WhatsApp / Telefone *</label>
                  <input
                    required
                    type="text"
                    placeholder="(11) 98888-7777"
                    value={newLeadPhone}
                    onChange={(e) => setNewLeadPhone(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">E-mail</label>
                  <input
                    type="email"
                    placeholder="contato@empresa.com.br"
                    value={newLeadEmail}
                    onChange={(e) => setNewLeadEmail(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Segmento</label>
                  <select
                    value={newLeadSegment}
                    onChange={(e) => setNewLeadSegment(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    {industrialSegments.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Valor Estimado (R$)</label>
                  <input
                    type="number"
                    placeholder="25000"
                    value={newLeadValue}
                    onChange={(e) => setNewLeadValue(e.target.value)}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Prioridade</label>
                  <select
                    value={newLeadPriority}
                    onChange={(e) => setNewLeadPriority(e.target.value as CrmLead['priority'])}
                    className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Baixa">Baixa</option>
                    <option value="Média">Média</option>
                    <option value="Alta">Alta</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Observações Iniciais</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Projeto de exaustão industrial para cozinha comercial com coifa inox 304..."
                  value={newLeadNotes}
                  onChange={(e) => setNewLeadNotes(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddLeadModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DRAWER / MODAL: LEAD DETAILS & INTERACTION HISTORY */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex justify-end z-50">
          <div className="bg-white w-full max-w-xl h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
            
            {/* Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div>
                <span className="text-[10px] font-mono font-bold text-emerald-400">{selectedLead.id}</span>
                <h3 className="text-base font-bold">{selectedLead.name}</h3>
                <p className="text-xs text-slate-400">{selectedLead.company} • {selectedLead.segment}</p>
              </div>
              <button 
                onClick={() => setSelectedLead(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 text-xs flex-1">
              
              {/* Quick Action Bar */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-800 block">Contato WhatsApp</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">{selectedLead.phone}</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenWhatsApp(selectedLead.phone)}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Abrir Chat</span>
                  </button>
                  
                  <button
                    onClick={() => {
                      onConvertLeadToCustomer(selectedLead);
                      setSelectedLead(null);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg shadow-xs flex items-center gap-1.5 cursor-pointer"
                    title="Converter Lead em Cliente ERP"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>Virar Cliente</span>
                  </button>
                </div>
              </div>

              {/* Lead Information Card */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Valor Estimado</span>
                    <span className="font-mono font-extrabold text-emerald-600 text-sm">
                      R$ {selectedLead.estimatedValue.toLocaleString('pt-BR')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Etapa no Funil</span>
                    <select
                      value={selectedLead.stage}
                      onChange={(e) => {
                        const stage = e.target.value as CrmLead['stage'];
                        onUpdateLead(selectedLead.id, { stage });
                        setSelectedLead({ ...selectedLead, stage });
                      }}
                      className="mt-0.5 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                    >
                      {STAGES.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/60">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">E-mail</span>
                    <span className="font-medium text-slate-800 truncate block">{selectedLead.email || 'Não informado'}</span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Responsável</span>
                    <span className="font-semibold text-slate-800">{selectedLead.assignedTo}</span>
                  </div>
                </div>
              </div>

              {/* Add Interaction Log */}
              <div className="space-y-2">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] font-mono">
                  Registrar Nova Interação / Nota
                </h4>

                <div className="flex gap-2">
                  <select
                    value={interactionChannel}
                    onChange={(e) => setInteractionChannel(e.target.value as any)}
                    className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Telefone">Telefone</option>
                    <option value="E-mail">E-mail</option>
                    <option value="Reunião">Reunião</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Escreva a nota da conversa ou orçamento..."
                    value={interactionNote}
                    onChange={(e) => setInteractionNote(e.target.value)}
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />

                  <button
                    onClick={handleAddInteraction}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-xs cursor-pointer"
                  >
                    Salvar
                  </button>
                </div>
              </div>

              {/* Interaction Timeline */}
              <div className="space-y-3">
                <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] font-mono">
                  Histórico de Interações ({selectedLead.history?.length || 0})
                </h4>

                <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                  {(!selectedLead.history || selectedLead.history.length === 0) ? (
                    <p className="text-slate-400 italic text-[11px]">Nenhuma interação registrada ainda.</p>
                  ) : (
                    selectedLead.history.slice().reverse().map((item) => (
                      <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-1">
                        <div className="flex justify-between items-center text-[10px]">
                          <span className="font-bold text-indigo-600 font-mono">{item.channel} • {item.user}</span>
                          <span className="text-slate-400 font-mono">{item.timestamp}</span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{item.notes}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                onClick={() => {
                  if (confirm('Tem certeza que deseja excluir este lead?')) {
                    onDeleteLead(selectedLead.id);
                    setSelectedLead(null);
                  }
                }}
                className="px-3 py-1.5 bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Lead</span>
              </button>

              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

      {/* MODAL: WHATSAPP QR CODE */}
      <WhatsAppQRCodeModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        whatsappConfig={whatsappConfig}
        onUpdateWhatsAppConfig={onUpdateWhatsAppConfig}
      />

    </div>
  );
}
