'use client';

import React, { useState } from 'react';
import { 
  Building2, 
  CreditCard, 
  Percent, 
  Clock, 
  Settings, 
  Check, 
  SlidersHorizontal, 
  Save, 
  Plus, 
  Trash2, 
  Edit2, 
  AlertCircle,
  Bell,
  Database,
  Briefcase,
  Lock,
  RefreshCw,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Customer } from '../lib/types';

interface SystemParams {
  companyName: string;
  companyCnpj: string;
  companyEmail: string;
  companyPhone: string;
  companyAddress: string;
  companyLogo?: string;
  defaultCurrency: string;
  targetProfitMargin: number;
  defaultDeliveryLeadTime: number;
  maxDiscountAllowed: number;
  alertRiskDays: number;
  enableDelayAlerts: boolean;
  enableLowStockAlerts: boolean;
  enableAutoBackup: boolean;
}

interface ParametersTabProps {
  params: SystemParams;
  onUpdateParams: (params: SystemParams) => void;
  industrialSegments: string[];
  customers: Customer[];
  onUpdateSegments: (
    newSegments: string[],
    renameMapping?: { old: string; new: string },
    deletedSegment?: string
  ) => void;
}

export default function ParametersTab({
  params,
  onUpdateParams,
  industrialSegments,
  customers,
  onUpdateSegments
}: ParametersTabProps) {
  // Form states for general settings
  const [companyName, setCompanyName] = useState(params.companyName);
  const [companyCnpj, setCompanyCnpj] = useState(params.companyCnpj);
  const [companyEmail, setCompanyEmail] = useState(params.companyEmail);
  const [companyPhone, setCompanyPhone] = useState(params.companyPhone);
  const [companyAddress, setCompanyAddress] = useState(params.companyAddress);
  const [companyLogo, setCompanyLogo] = useState(params.companyLogo || '');
  const [defaultCurrency, setDefaultCurrency] = useState(params.defaultCurrency);
  const [targetProfitMargin, setTargetProfitMargin] = useState(params.targetProfitMargin);
  const [defaultDeliveryLeadTime, setDefaultDeliveryLeadTime] = useState(params.defaultDeliveryLeadTime);
  const [maxDiscountAllowed, setMaxDiscountAllowed] = useState(params.maxDiscountAllowed);
  const [alertRiskDays, setAlertRiskDays] = useState(params.alertRiskDays || 3);
  const [enableDelayAlerts, setEnableDelayAlerts] = useState(params.enableDelayAlerts);
  const [enableLowStockAlerts, setEnableLowStockAlerts] = useState(params.enableLowStockAlerts);
  const [enableAutoBackup, setEnableAutoBackup] = useState(params.enableAutoBackup);

  // States for Segment management
  const [newSegmentName, setNewSegmentName] = useState('');
  const [editingSegmentIdx, setEditingSegmentIdx] = useState<number | null>(null);
  const [editingSegmentValue, setEditingSegmentValue] = useState('');

  // Toast / notification state
  const [saveSuccess, setSaveSuccess] = useState(false);

  // States for live Supabase Database Table Verification
  const [dbStatus, setDbStatus] = useState<'idle' | 'checking' | 'connected' | 'error' | 'unconfigured'>('checking');
  const [dbError, setDbError] = useState<string | null>(null);
  const [tablesList, setTablesList] = useState<Array<{ name: string; label: string; count: number; exists: boolean }>>([
    { name: 'customers', label: 'Clientes (customers)', count: 0, exists: false },
    { name: 'inventory_items', label: 'Insumos / Estoque (inventory_items)', count: 0, exists: false },
    { name: 'production_orders', label: 'Ordens de Produção (production_orders)', count: 0, exists: false },
    { name: 'project_files', label: 'Arquivos Técnicos (project_files)', count: 0, exists: false },
    { name: 'sales_orders', label: 'Pedidos de Venda (sales_orders)', count: 0, exists: false },
    { name: 'collaborators', label: 'Colaboradores (collaborators)', count: 0, exists: false },
    { name: 'purchase_orders', label: 'Ordens de Compra (purchase_orders)', count: 0, exists: false },
    { name: 'financial_transactions', label: 'Fluxo de Caixa (financial_transactions)', count: 0, exists: false },
    { name: 'system_parameters', label: 'Parâmetros (system_parameters)', count: 0, exists: false },
  ]);

  const verifyDatabaseConnection = async () => {
    setDbStatus('checking');
    setDbError(null);
    try {
      const res = await fetch(`/api/db/sync?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Pragma': 'no-cache',
          'Cache-Control': 'no-cache'
        }
      });
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data = await res.json();
      if (data.success && data.isConfigured) {
        setDbStatus('connected');
        const syncData = data.data || {};
        setTablesList([
          { name: 'customers', label: 'Clientes (customers)', count: Array.isArray(syncData.customers) ? syncData.customers.length : 0, exists: true },
          { name: 'inventory_items', label: 'Insumos / Estoque (inventory_items)', count: Array.isArray(syncData.inventory) ? syncData.inventory.length : 0, exists: true },
          { name: 'production_orders', label: 'Ordens de Produção (production_orders)', count: Array.isArray(syncData.productionOrders) ? syncData.productionOrders.length : 0, exists: true },
          { name: 'project_files', label: 'Arquivos Técnicos (project_files)', count: Array.isArray(syncData.projectFiles) ? syncData.projectFiles.length : 0, exists: true },
          { name: 'sales_orders', label: 'Pedidos de Venda (sales_orders)', count: Array.isArray(syncData.salesOrders) ? syncData.salesOrders.length : 0, exists: true },
          { name: 'collaborators', label: 'Colaboradores (collaborators)', count: Array.isArray(syncData.collaborators) ? syncData.collaborators.length : 0, exists: true },
          { name: 'purchase_orders', label: 'Ordens de Compra (purchase_orders)', count: Array.isArray(syncData.purchaseOrders) ? syncData.purchaseOrders.length : 0, exists: true },
          { name: 'financial_transactions', label: 'Fluxo de Caixa (financial_transactions)', count: Array.isArray(syncData.financialTransactions) ? syncData.financialTransactions.length : 0, exists: true },
          { name: 'system_parameters', label: 'Parâmetros (system_parameters)', count: Array.isArray(syncData.systemParameters) ? syncData.systemParameters.length : 0, exists: true },
        ]);
      } else if (data.isConfigured === false) {
        setDbStatus('unconfigured');
        setDbError(data.error || 'DATABASE_URL não está configurada no ambiente.');
        setTablesList(prev => prev.map(t => ({ ...t, count: 0, exists: false })));
      } else {
        setDbStatus('error');
        setDbError(data.error || 'Erro ao sincronizar com o banco de dados Supabase.');
        setTablesList(prev => prev.map(t => ({ ...t, count: 0, exists: false })));
      }
    } catch (err: any) {
      console.error('Error checking database:', err);
      setDbStatus('error');
      setDbError(err.message || 'Erro de rede ou falha ao chamar a API de sincronização.');
      setTablesList(prev => prev.map(t => ({ ...t, count: 0, exists: false })));
    }
  };

  React.useEffect(() => {
    let active = true;
    const timer = setTimeout(() => {
      if (active) {
        verifyDatabaseConnection();
      }
    }, 100);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, []);

  // Check if a segment is in use by customers
  const isSegmentInUse = (segment: string) => {
    return customers.some(c => c.segment === segment);
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateParams({
      companyName,
      companyCnpj,
      companyEmail,
      companyPhone,
      companyAddress,
      companyLogo,
      defaultCurrency,
      targetProfitMargin: Number(targetProfitMargin),
      defaultDeliveryLeadTime: Number(defaultDeliveryLeadTime),
      maxDiscountAllowed: Number(maxDiscountAllowed),
      alertRiskDays: Number(alertRiskDays),
      enableDelayAlerts,
      enableLowStockAlerts,
      enableAutoBackup
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  // Segment action handlers
  const handleAddSegment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newSegmentName.trim();
    if (!cleanName) return;

    if (industrialSegments.some(s => s.toLowerCase() === cleanName.toLowerCase())) {
      alert('Este segmento já existe.');
      return;
    }

    const updated = [...industrialSegments, cleanName];
    onUpdateSegments(updated);
    setNewSegmentName('');
  };

  const handleStartEditSegment = (idx: number, currentVal: string) => {
    setEditingSegmentIdx(idx);
    setEditingSegmentValue(currentVal);
  };

  const handleSaveSegmentEdit = (idx: number) => {
    const cleanVal = editingSegmentValue.trim();
    if (!cleanVal) return;

    const oldVal = industrialSegments[idx];
    if (oldVal === cleanVal) {
      setEditingSegmentIdx(null);
      return;
    }

    if (industrialSegments.some((s, i) => i !== idx && s.toLowerCase() === cleanVal.toLowerCase())) {
      alert('Este segmento já existe.');
      return;
    }

    const updated = [...industrialSegments];
    updated[idx] = cleanVal;
    
    onUpdateSegments(updated, { old: oldVal, new: cleanVal });
    setEditingSegmentIdx(null);
  };

  const handleDeleteSegment = (idx: number) => {
    const segToDelete = industrialSegments[idx];
    if (isSegmentInUse(segToDelete)) {
      alert('Este segmento está em uso por clientes cadastrados e não pode ser excluído.');
      return;
    }

    const confirmDel = window.confirm(`Tem certeza que deseja excluir o segmento "${segToDelete}"?`);
    if (!confirmDel) return;

    const updated = industrialSegments.filter((_, i) => i !== idx);
    onUpdateSegments(updated, undefined, segToDelete);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">Parâmetros do Sistema</h2>
          <p className="text-xs text-slate-500 mt-1">Configuração de preferências globais, dados tributários e comerciais do ERP</p>
        </div>
        {saveSuccess && (
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs px-3.5 py-2 rounded-lg font-medium shadow-sm animate-in fade-in slide-in-from-top-1">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Configurações salvas com sucesso!</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left/Middle Column: Forms */}
        <div className="lg:col-span-2 space-y-6">
          <form onSubmit={handleSaveGeneral} className="space-y-6">
            
            {/* 1. Company Profile Card */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Dados Corporativos da Empresa</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Razão Social / Nome Fantasia</label>
                  <input 
                    type="text" 
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">CNPJ Corporativo</label>
                  <input 
                    type="text" 
                    value={companyCnpj}
                    onChange={(e) => setCompanyCnpj(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">E-mail Comercial de Contato</label>
                  <input 
                    type="email" 
                    value={companyEmail}
                    onChange={(e) => setCompanyEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Telefone Comercial</label>
                  <input 
                    type="text" 
                    value={companyPhone}
                    onChange={(e) => setCompanyPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Endereço Sede</label>
                  <input 
                    type="text" 
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                    required
                  />
                </div>

                {/* Company Logo Upload Section */}
                <div className="md:col-span-2 border-t border-slate-100 pt-4 mt-1">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-indigo-600 mb-2">Logomarca da Empresa</label>
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-slate-50 border border-dashed border-slate-300 rounded-xl p-4">
                    {companyLogo ? (
                      <div className="relative group w-32 h-20 bg-white border border-slate-200 rounded-lg overflow-hidden flex items-center justify-center p-2 shadow-sm">
                        <img 
                          src={companyLogo} 
                          alt="Logo da Empresa" 
                          className="max-w-full max-h-full object-contain"
                        />
                        <button
                          type="button"
                          onClick={() => setCompanyLogo('')}
                          className="absolute inset-0 bg-slate-900/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px] font-bold uppercase cursor-pointer"
                        >
                          Remover
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-20 bg-slate-100 border border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400">
                        <Building2 className="w-6 h-6 stroke-1 mb-1" />
                        <span className="text-[9px] font-bold uppercase">Sem Logo</span>
                      </div>
                    )}
                    <div className="flex-1 text-center sm:text-left space-y-1.5">
                      <p className="text-xs font-semibold text-slate-700">Selecione o logotipo oficial da empresa</p>
                      <p className="text-[10px] text-slate-400">Formatos recomendados: PNG, JPG ou SVG. Tamanho ideal: retangular, até 500kb.</p>
                      <div className="flex gap-2 justify-center sm:justify-start">
                        <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-[11px] px-3 py-1.5 rounded-lg border border-indigo-200 cursor-pointer transition-colors inline-block">
                          Escolher Arquivo
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 5 * 1024 * 1024) {
                                  alert('O arquivo de imagem é muito grande! Por favor, selecione um logotipo de até 5MB.');
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  if (typeof reader.result === 'string') {
                                    const img = new Image();
                                    img.src = reader.result;
                                    img.onload = () => {
                                      const canvas = document.createElement('canvas');
                                      const ctx = canvas.getContext('2d');
                                      
                                      // Redimensiona mantendo proporção (Largura Max: 320px, Altura Max: 160px)
                                      const MAX_WIDTH = 320;
                                      const MAX_HEIGHT = 160;
                                      let width = img.width;
                                      let height = img.height;
                                      
                                      if (width > height) {
                                        if (width > MAX_WIDTH) {
                                          height = Math.round((height * MAX_WIDTH) / width);
                                          width = MAX_WIDTH;
                                        }
                                      } else {
                                        if (height > MAX_HEIGHT) {
                                          width = Math.round((width * MAX_HEIGHT) / height);
                                          height = MAX_HEIGHT;
                                        }
                                      }
                                      
                                      canvas.width = width;
                                      canvas.height = height;
                                      
                                      if (ctx) {
                                        ctx.drawImage(img, 0, 0, width, height);
                                        // Comprime como PNG para preservar a transparência
                                        const compressedBase64 = canvas.toDataURL('image/png');
                                        setCompanyLogo(compressedBase64);
                                      }
                                    };
                                  }
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Commercial Parameters */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Diretrizes e Regras de Negócio</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Símbolo Monetário Padrão</label>
                  <select
                    value={defaultCurrency}
                    onChange={(e) => setDefaultCurrency(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs focus:bg-white outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="BRL R$">Real Brasileiro (R$)</option>
                    <option value="USD $">Dólar Americano ($)</option>
                    <option value="EUR €">Euro (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Margem de Lucro Alvo (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={targetProfitMargin}
                      onChange={(e) => setTargetProfitMargin(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      min="0"
                      max="100"
                      required
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400 text-xs">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Prazo de Entrega Padrão (Dias Úteis)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={defaultDeliveryLeadTime}
                      onChange={(e) => setDefaultDeliveryLeadTime(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      min="1"
                      required
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400 text-xs">
                      <Clock className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Desconto Máximo Autorizado (%)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={maxDiscountAllowed}
                      onChange={(e) => setMaxDiscountAllowed(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      min="0"
                      max="100"
                      required
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400 text-xs">
                      <Percent className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Controle de Alerta do Pedido (Dias de Antecedência)</label>
                  <div className="relative">
                    <input 
                      type="number" 
                      value={alertRiskDays}
                      onChange={(e) => setAlertRiskDays(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-12 py-2 text-xs focus:bg-white focus:ring-1 focus:ring-indigo-500 outline-none"
                      min="1"
                      max="60"
                      required
                    />
                    <div className="absolute right-3 top-2.5 text-slate-400 text-[10px] font-bold font-mono">
                      DIAS
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">Sinalizar se o prazo de faturamento/entrega está a essa quantidade de dias ou menos.</p>
                </div>
              </div>
            </div>

            {/* 3. System Preferences & Alerts */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
                <Bell className="w-4 h-4 text-indigo-600" />
                <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Alertas e Monitoramento do ERP</h3>
              </div>

              <div className="space-y-3.5 pt-1">
                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input 
                    type="checkbox" 
                    checked={enableDelayAlerts}
                    onChange={(e) => setEnableDelayAlerts(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Notificar Atrasos de Entrega</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Disparar alertas visuais no painel operacional para vendas com prazos estourados ou próximos do vencimento.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input 
                    type="checkbox" 
                    checked={enableLowStockAlerts}
                    onChange={(e) => setEnableLowStockAlerts(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Alertas de Segurança de Estoque</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Destacar em vermelho matérias-primas e insumos que atingiram nível crítico ou estoque mínimo.</p>
                  </div>
                </label>

                <label className="flex items-start gap-3 cursor-pointer select-none group">
                  <input 
                    type="checkbox" 
                    checked={enableAutoBackup}
                    onChange={(e) => setEnableAutoBackup(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <div>
                    <p className="text-xs font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">Sincronização e Backup Automático Local</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">Garantir a persistência local (LocalStorage) a cada modificação e sincronização com banco relacional se conectado.</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-5 py-2.5 rounded-lg shadow transition-colors cursor-pointer"
              >
                <Save className="w-4 h-4" />
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Segment Manager & Info Box */}
        <div className="space-y-6">
          
          {/* A. Industrial Segments Management card */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-2.5 border-b border-slate-100">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">Segmentos Industriais</h3>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Segmentações para classificar os clientes cadastrados. Segmentações atualmente em uso por clientes homologados não podem ser excluídas.
            </p>

            {/* Quick Add Form */}
            <form onSubmit={handleAddSegment} className="flex gap-2">
              <input 
                type="text" 
                placeholder="Ex: Farmacêutico"
                value={newSegmentName}
                onChange={(e) => setNewSegmentName(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs outline-none focus:bg-white focus:ring-1 focus:ring-indigo-500"
              />
              <button 
                type="submit" 
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg p-2 transition-colors cursor-pointer"
                title="Adicionar Segmento"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </form>

            {/* List of current segments */}
            <div className="border border-slate-100 rounded-lg divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {industrialSegments.map((seg, idx) => {
                const inUse = isSegmentInUse(seg);
                const isEditing = editingSegmentIdx === idx;

                return (
                  <div key={`${seg}-${idx}`} className="flex items-center justify-between p-2.5 hover:bg-slate-50/50 transition-colors">
                    {isEditing ? (
                      <div className="flex items-center gap-1.5 w-full">
                        <input 
                          type="text" 
                          value={editingSegmentValue}
                          onChange={(e) => setEditingSegmentValue(e.target.value)}
                          className="flex-1 bg-white border border-indigo-400 rounded-md px-1.5 py-0.5 text-xs outline-none"
                          autoFocus
                        />
                        <button 
                          onClick={() => handleSaveSegmentEdit(idx)}
                          className="p-1 rounded bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button 
                          onClick={() => setEditingSegmentIdx(null)}
                          className="p-1 rounded bg-slate-100 text-slate-500 hover:bg-slate-200"
                        >
                          <span className="text-[10px] font-bold">X</span>
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="text-xs text-slate-700 font-medium">{seg}</span>
                        <div className="flex items-center gap-1">
                          <button 
                            onClick={() => handleStartEditSegment(idx, seg)}
                            className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded transition-colors"
                            title="Editar Nome"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          {inUse ? (
                            <span 
                              className="p-1 text-slate-300 cursor-not-allowed" 
                              title="Este segmento está em uso por clientes e não pode ser excluído"
                            >
                              <Lock className="w-3 h-3 text-slate-300" />
                            </span>
                          ) : (
                            <button 
                              onClick={() => handleDeleteSegment(idx)}
                              className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="Excluir Segmento"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. Database and Infrastructure Info Card (Real-time Supabase Table Verifier) */}
          <div className="bg-slate-900 border border-slate-950 rounded-xl p-5 shadow-sm text-slate-300 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400 animate-pulse" />
                <h3 className="text-xs font-bold uppercase text-emerald-400 tracking-wider">Status do Supabase</h3>
              </div>
              <button
                type="button"
                onClick={verifyDatabaseConnection}
                disabled={dbStatus === 'checking'}
                className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-[10px] text-slate-300 hover:text-white px-2 py-1 rounded transition-colors cursor-pointer border border-slate-700/50"
                title="Re-verificar Tabelas no Supabase"
              >
                <RefreshCw className={`w-3 h-3 ${dbStatus === 'checking' ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Atualizar</span>
              </button>
            </div>

            {/* Connection State Badge */}
            <div className="bg-slate-950/60 border border-slate-800/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2.5">
                <span className="relative flex h-2 w-2">
                  {dbStatus === 'connected' && (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </>
                  )}
                  {dbStatus === 'checking' && (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                    </>
                  )}
                  {dbStatus === 'error' && (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                    </>
                  )}
                  {dbStatus === 'unconfigured' && (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-500"></span>
                  )}
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider">
                  {dbStatus === 'connected' && <span className="text-emerald-400">Banco Conectado</span>}
                  {dbStatus === 'checking' && <span className="text-amber-400">Verificando Tabelas...</span>}
                  {dbStatus === 'error' && <span className="text-rose-400">Falha de Conexão</span>}
                  {dbStatus === 'unconfigured' && <span className="text-slate-400">Supabase Não Configurado</span>}
                </span>
              </div>

              {dbError && (
                <div className="bg-rose-950/40 border border-rose-900/40 rounded p-2 text-[9.5px] text-rose-300 leading-relaxed font-mono whitespace-pre-wrap break-words">
                  {dbError}
                </div>
              )}
            </div>

            {/* Tables Checklist */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tabelas no Supabase (Public):</p>
              
              <div className="grid grid-cols-1 gap-1.5 max-h-[220px] overflow-y-auto pr-1">
                {tablesList.map((table) => (
                  <div 
                    key={table.name} 
                    className="flex items-center justify-between bg-slate-950/30 border border-slate-800/40 px-2.5 py-1.5 rounded-lg text-[11px] hover:border-slate-850 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      {dbStatus === 'checking' ? (
                        <div className="w-3.5 h-3.5 rounded-full border border-slate-700 border-t-emerald-400 animate-spin" />
                      ) : table.exists ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5 text-slate-600" />
                      )}
                      <span className="font-medium text-slate-300 font-mono text-[10px]">{table.name}</span>
                    </div>
                    
                    <span className="text-[10px] font-bold font-mono">
                      {dbStatus === 'checking' ? (
                        <span className="text-slate-500">...</span>
                      ) : table.exists ? (
                        <span className="text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded text-[9px]">
                          {table.count} {table.count === 1 ? 'registro' : 'registros'}
                        </span>
                      ) : (
                        <span className="text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded text-[9px] uppercase">
                          Ausente / Sem Sync
                        </span>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* General Database Specs */}
            <div className="border-t border-slate-800/50 pt-2.5 space-y-1.5 text-[10px] text-slate-400">
              <div className="flex justify-between items-center">
                <span>Modo de Armazenamento:</span>
                <span className="font-mono text-emerald-400 font-semibold">CLOUD POSTGRESQL</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Mecanismo ORM:</span>
                <span className="font-mono text-slate-300">Drizzle ORM & Postgres.js</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Sincronização Ativa:</span>
                <span className="font-mono text-slate-300">Em tempo real (API Sync)</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
