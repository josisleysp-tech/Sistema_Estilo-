'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Send, 
  MessageSquare, 
  Search, 
  Filter, 
  Server, 
  Key, 
  Clock, 
  CheckCheck, 
  AlertCircle, 
  Smartphone, 
  QrCode, 
  Sparkles, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Eye, 
  EyeOff, 
  Download, 
  Trash2, 
  User, 
  Building2, 
  Zap, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  PhoneCall, 
  ShieldCheck,
  SendHorizontal,
  Bot
} from 'lucide-react';
import { WhatsAppConfig, CrmLead, WhatsAppMessageLog, WhatsAppThread, WhatsAppChatMessage } from '../lib/types';

interface WhatsAppDashboardProps {
  whatsappConfig: WhatsAppConfig;
  onUpdateWhatsAppConfig: (config: WhatsAppConfig) => void;
  leads?: CrmLead[];
  onOpenQrModal?: () => void;
}

export default function WhatsAppDashboard({
  whatsappConfig,
  onUpdateWhatsAppConfig,
  leads = [],
  onOpenQrModal
}: WhatsAppDashboardProps) {
  const [activeSubTab, setActiveSubTab] = useState<'status' | 'threads' | 'logs'>('status');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isPingTesting, setIsPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'success' | 'error'; latency: number; message: string } | null>(null);

  // Search & Filter States for Threads & Logs
  const [threadSearch, setThreadSearch] = useState('');
  const [threadFilter, setThreadFilter] = useState<'TODOS' | 'AGUARDANDO' | 'ATENDIDOS'>('TODOS');
  const [selectedThreadId, setSelectedThreadId] = useState<string>('THREAD-001');

  const [logSearch, setLogSearch] = useState('');
  const [logDirectionFilter, setLogDirectionFilter] = useState<'TODOS' | 'SAIDA' | 'ENTRADA'>('TODOS');
  const [logStatusFilter, setLogStatusFilter] = useState<'TODOS' | 'LIDO' | 'ENTREGUE' | 'ENVIADO' | 'FALHA'>('TODOS');

  // Interactive Message State
  const [chatInputText, setChatInputText] = useState('');

  // Initial Threads state initialized with leads context or default mock data
  const [threads, setThreads] = useState<WhatsAppThread[]>(() => [
    {
      id: 'THREAD-001',
      leadId: 'LEAD-001',
      contactName: 'Roberto Madero',
      phone: '(11) 99876-5432',
      company: 'Madero Gastronomia S.A.',
      unreadCount: 2,
      lastMessage: 'Conseguem me enviar as especificações técnicas da coifa em inox 304?',
      lastMessageTime: '11:24',
      status: 'AGUARDANDO_RESPOSTA',
      avatarColor: 'bg-emerald-600',
      messages: [
        { id: 'M-1', sender: 'company', text: 'Olá Roberto! Obrigado pelo contato com a Estilo Coifas.', timestamp: '10:15', status: 'LIDO' },
        { id: 'M-2', sender: 'company', text: 'Analisamos o projeto da sua cozinha comercial.', timestamp: '10:16', status: 'LIDO' },
        { id: 'M-3', sender: 'customer', text: 'Perfeito! Gostaria de saber o prazo estimado para entrega.', timestamp: '11:20' },
        { id: 'M-4', sender: 'customer', text: 'Conseguem me enviar as especificações técnicas da coifa em inox 304?', timestamp: '11:24' }
      ]
    },
    {
      id: 'THREAD-002',
      leadId: 'LEAD-002',
      contactName: 'Eng. Fernando Mendes',
      phone: '(11) 98765-4321',
      company: 'Galpão Logístico DHL',
      unreadCount: 0,
      lastMessage: 'Proposta recebida e encaminhada ao setor de suprimentos. Obrigado!',
      lastMessageTime: 'Ontem',
      status: 'ATENDIDO',
      avatarColor: 'bg-indigo-600',
      messages: [
        { id: 'M-201', sender: 'company', text: 'Olá Eng. Fernando, segue em anexo a proposta para exaustão do galpão.', timestamp: 'Ontem 15:30', status: 'LIDO' },
        { id: 'M-202', sender: 'customer', text: 'Proposta recebida e encaminhada ao setor de suprimentos. Obrigado!', timestamp: 'Ontem 16:05' }
      ]
    },
    {
      id: 'THREAD-003',
      leadId: 'LEAD-003',
      contactName: 'Carla Silveira',
      phone: '(11) 97654-3210',
      company: 'Shopping Center Norte',
      unreadCount: 1,
      lastMessage: 'Qual seria o valor aproximado para a renovação de ar do praça de alimentação?',
      lastMessageTime: '09:40',
      status: 'AGUARDANDO_RESPOSTA',
      avatarColor: 'bg-amber-600',
      messages: [
        { id: 'M-301', sender: 'customer', text: 'Bom dia! Gostaria de uma cotação.', timestamp: '09:38' },
        { id: 'M-302', sender: 'customer', text: 'Qual seria o valor aproximado para a renovação de ar do praça de alimentação?', timestamp: '09:40' }
      ]
    }
  ]);

  // Initial Logs state
  const [logs, setLogs] = useState<WhatsAppMessageLog[]>(() => [
    {
      id: 'LOG-1092',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      recipientName: 'Roberto Madero',
      phone: '(11) 99876-5432',
      message: 'Conseguem me enviar as especificações técnicas da coifa em inox 304?',
      direction: 'ENTRADA',
      status: 'LIDO',
      latencyMs: 64,
      leadId: 'LEAD-001'
    },
    {
      id: 'LOG-1091',
      timestamp: '11:20:05',
      recipientName: 'Roberto Madero',
      phone: '(11) 99876-5432',
      message: 'Perfeito! Gostaria de saber o prazo estimado para entrega.',
      direction: 'ENTRADA',
      status: 'LIDO',
      latencyMs: 78,
      leadId: 'LEAD-001'
    },
    {
      id: 'LOG-1090',
      timestamp: '10:16:12',
      recipientName: 'Roberto Madero',
      phone: '(11) 99876-5432',
      message: 'Analisamos o projeto da sua cozinha comercial.',
      direction: 'SAIDA',
      status: 'LIDO',
      latencyMs: 112,
      leadId: 'LEAD-001'
    },
    {
      id: 'LOG-1089',
      timestamp: '09:40:22',
      recipientName: 'Carla Silveira',
      phone: '(11) 97654-3210',
      message: 'Qual seria o valor aproximado para a renovação de ar do praça de alimentação?',
      direction: 'ENTRADA',
      status: 'ENTREGUE',
      latencyMs: 52,
      leadId: 'LEAD-003'
    },
    {
      id: 'LOG-1088',
      timestamp: 'Ontem 15:30:10',
      recipientName: 'Eng. Fernando Mendes',
      phone: '(11) 98765-4321',
      message: 'Olá Eng. Fernando, segue em anexo a proposta para exaustão do galpão.',
      direction: 'SAIDA',
      status: 'LIDO',
      latencyMs: 95,
      leadId: 'LEAD-002'
    }
  ]);

  // Selected Thread Object
  const currentThread = useMemo(() => {
    return threads.find(t => t.id === selectedThreadId) || threads[0];
  }, [threads, selectedThreadId]);

  // Filtered Threads
  const filteredThreads = useMemo(() => {
    return threads.filter(t => {
      const matchesSearch = 
        t.contactName.toLowerCase().includes(threadSearch.toLowerCase()) ||
        t.phone.includes(threadSearch) ||
        (t.company && t.company.toLowerCase().includes(threadSearch.toLowerCase()));

      const matchesStatus = 
        threadFilter === 'TODOS' ||
        (threadFilter === 'AGUARDANDO' && t.status === 'AGUARDANDO_RESPOSTA') ||
        (threadFilter === 'ATENDIDOS' && t.status === 'ATENDIDO');

      return matchesSearch && matchesStatus;
    });
  }, [threads, threadSearch, threadFilter]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter(l => {
      const matchesSearch = 
        l.recipientName.toLowerCase().includes(logSearch.toLowerCase()) ||
        l.phone.includes(logSearch) ||
        l.message.toLowerCase().includes(logSearch.toLowerCase());

      const matchesDirection = logDirectionFilter === 'TODOS' || l.direction === logDirectionFilter;
      const matchesStatus = logStatusFilter === 'TODOS' || l.status === logStatusFilter;

      return matchesSearch && matchesDirection && matchesStatus;
    });
  }, [logs, logSearch, logDirectionFilter, logStatusFilter]);

  // Ping Gateway Health Check Simulation
  const handleTestPing = () => {
    setIsPingTesting(true);
    setPingResult(null);

    setTimeout(() => {
      setIsPingTesting(false);
      if (whatsappConfig.isConnected) {
        const simulatedLatency = Math.floor(Math.random() * 40) + 35; // 35ms - 75ms
        setPingResult({
          status: 'success',
          latency: simulatedLatency,
          message: `Gateway operacional. Resposta HTTP 200 OK (${simulatedLatency}ms)`
        });
      } else {
        setPingResult({
          status: 'error',
          latency: 0,
          message: 'Falha de conexão: Instância do WhatsApp está desconectada ou aguardando leitura do QR Code.'
        });
      }
    }, 1200);
  };

  // Send reply in thread
  const handleSendMessage = () => {
    if (!chatInputText.trim() || !currentThread) return;

    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const timeFull = new Date().toLocaleTimeString('pt-BR');

    const newMsg: WhatsAppChatMessage = {
      id: `M-${Date.now()}`,
      sender: 'company',
      text: chatInputText.trim(),
      timestamp: timeString,
      status: 'ENTREGUE'
    };

    // Update Threads
    setThreads(prev => prev.map(t => {
      if (t.id === currentThread.id) {
        return {
          ...t,
          unreadCount: 0,
          lastMessage: chatInputText.trim(),
          lastMessageTime: timeString,
          status: 'ATENDIDO',
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));

    // Add to Logs
    const newLog: WhatsAppMessageLog = {
      id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
      timestamp: timeFull,
      recipientName: currentThread.contactName,
      phone: currentThread.phone,
      message: chatInputText.trim(),
      direction: 'SAIDA',
      status: 'ENTREGUE',
      latencyMs: Math.floor(Math.random() * 50) + 40,
      leadId: currentThread.leadId
    };

    setLogs(prev => [newLog, ...prev]);
    setChatInputText('');
  };

  // Simulate Incoming Customer Message
  const handleSimulateIncomingMessage = () => {
    if (!currentThread) return;

    const simulatedTexts = [
      'Obrigado pelo retorno! Vou analisar com a diretoria.',
      'Perfeito, pode enviar o técnico para fazer a medição.',
      'Vocês aceitam faturamento para 30 dias?',
      'Consegue me mandar algumas fotos de instalações anteriores em inox?'
    ];
    const text = simulatedTexts[Math.floor(Math.random() * simulatedTexts.length)];
    const timeString = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    const timeFull = new Date().toLocaleTimeString('pt-BR');

    const newMsg: WhatsAppChatMessage = {
      id: `M-INC-${Date.now()}`,
      sender: 'customer',
      text,
      timestamp: timeString
    };

    setThreads(prev => prev.map(t => {
      if (t.id === currentThread.id) {
        return {
          ...t,
          unreadCount: t.unreadCount + 1,
          lastMessage: text,
          lastMessageTime: timeString,
          status: 'AGUARDANDO_RESPOSTA',
          messages: [...t.messages, newMsg]
        };
      }
      return t;
    }));

    setLogs(prev => [
      {
        id: `LOG-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: timeFull,
        recipientName: currentThread.contactName,
        phone: currentThread.phone,
        message: text,
        direction: 'ENTRADA',
        status: 'LIDO',
        latencyMs: Math.floor(Math.random() * 30) + 20,
        leadId: currentThread.leadId
      },
      ...prev
    ]);
  };

  // Clear Logs
  const handleClearLogs = () => {
    setLogs([]);
  };

  // Export Logs CSV
  const handleExportLogsCsv = () => {
    if (logs.length === 0) return;

    const headers = ['ID', 'Timestamp', 'Direcao', 'Nome', 'Telefone', 'Status', 'Mensagem'];
    const rows = logs.map(l => [
      l.id,
      l.timestamp,
      l.direction,
      `"${l.recipientName}"`,
      `"${l.phone}"`,
      l.status,
      `"${l.message.replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `whatsapp_logs_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* DASHBOARD HEADER & SUB-TAB NAVIGATION */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        <div className="flex items-center gap-3">
          <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
            <Activity className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Painel de Monitoramento WhatsApp Gateway
            </h2>
            <p className="text-xs text-slate-500">
              Instância: <strong className="font-mono text-slate-800">{whatsappConfig.instanceName || 'estilocoifas_prod'}</strong> • Status em Tempo Real
            </p>
          </div>
        </div>

        {/* Sub-Tab Navigation Chips */}
        <div className="flex items-center p-1 bg-slate-100 rounded-xl gap-1">
          <button
            onClick={() => setActiveSubTab('status')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'status' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Server className="w-4 h-4 text-emerald-600" />
            <span>Status da Instância</span>
          </button>

          <button
            onClick={() => setActiveSubTab('threads')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
              activeSubTab === 'threads' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-4 h-4 text-indigo-600" />
            <span>Conversas Ativas</span>
            {threads.some(t => t.unreadCount > 0) && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-1 right-1" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('logs')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
              activeSubTab === 'logs' 
                ? 'bg-white text-slate-900 shadow-xs' 
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-600" />
            <span>Logs de Disparo</span>
          </button>
        </div>

      </div>

      {/* SUB-TAB 1: STATUS DA INSTÂNCIA */}
      {activeSubTab === 'status' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Main Status Cards */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Real-time Status Card */}
            <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.2),transparent)] pointer-events-none" />

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10 border-b border-slate-800 pb-5">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${
                    whatsappConfig.isConnected 
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' 
                      : 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                  }`}>
                    {whatsappConfig.isConnected ? <Wifi className="w-6 h-6 animate-pulse" /> : <WifiOff className="w-6 h-6" />}
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 font-mono">Conexão REST / WebSockets</span>
                    <h3 className="text-lg font-bold flex items-center gap-2">
                      {whatsappConfig.isConnected ? 'Instância Ativa & Operacional' : 'Instância Off-line / Pendente'}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleTestPing}
                    disabled={isPingTesting}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isPingTesting ? 'animate-spin text-emerald-400' : ''}`} />
                    <span>{isPingTesting ? 'Testando...' : 'Testar Ping'}</span>
                  </button>

                  {onOpenQrModal && (
                    <button
                      onClick={onOpenQrModal}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                      <span>Escanear QR Code</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Ping Result Alert */}
              {pingResult && (
                <div className={`mt-4 p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                  pingResult.status === 'success' 
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' 
                    : 'bg-rose-950/60 text-rose-300 border-rose-800'
                }`}>
                  {pingResult.status === 'success' ? <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" /> : <XCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />}
                  <span>{pingResult.message}</span>
                </div>
              )}

              {/* Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6 text-xs font-mono">
                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Número da Empresa</span>
                  <p className="text-sm font-extrabold text-white">{whatsappConfig.companyNumber || '(11) 99876-5432'}</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Instância do Gateway</span>
                  <p className="text-sm font-extrabold text-emerald-400">{whatsappConfig.instanceName || 'estilocoifas_prod'}</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <span className="text-[10px] text-slate-500 uppercase font-bold">Servidor API / Webhook</span>
                  <p className="text-xs text-slate-300 truncate">{whatsappConfig.serverUrl || 'https://api.z-api.io/instances/estilocoifas'}</p>
                </div>

                <div className="p-3.5 bg-slate-950/60 rounded-2xl border border-slate-800/80 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-slate-500 uppercase font-bold">Token API / Secret</span>
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-slate-400 hover:text-white"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 font-mono">
                    {showApiKey ? (whatsappConfig.apiKey || 'api_key_estilo_coifas_2026') : '••••••••••••••••••••••••'}
                  </p>
                </div>
              </div>

            </div>

            {/* Diagnostics & Automation Cards */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Automações de Disparo em Segundo Plano
              </h3>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-xs text-slate-900">Notificações Automáticas de Atualização de Pedidos</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Disparar WhatsApp ao cliente quando a Ordem de Produção mudar para &quot;Faturado&quot; ou &quot;Entregue&quot;.</p>
                </div>

                <button
                  onClick={() => onUpdateWhatsAppConfig({
                    ...whatsappConfig,
                    autoSendOrderUpdates: !whatsappConfig.autoSendOrderUpdates
                  })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    whatsappConfig.autoSendOrderUpdates 
                      ? 'bg-emerald-600 text-white shadow-xs' 
                      : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  }`}
                >
                  {whatsappConfig.autoSendOrderUpdates ? 'Ativado' : 'Desativado'}
                </button>
              </div>
            </div>

          </div>

          {/* Right Info Panel */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 shadow-md space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>Protocolos de Comunicação</span>
              </div>

              <p className="text-xs text-slate-300 leading-relaxed">
                O gateway de mensagens utiliza conexão segura TLS 1.3 com criptografia de ponta a ponta via WhatsApp Business API e WebSockets para sincronização de eventos de leitura em tempo real.
              </p>

              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-[11px] font-mono">
                <div className="flex justify-between text-slate-400">
                  <span>Modo do Webhook:</span>
                  <span className="text-emerald-400 font-bold">Ativo (POST JSON)</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tempo Médio de Envio:</span>
                  <span className="text-white font-bold">~65 ms</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Logs Armazenados:</span>
                  <span className="text-white font-bold">{logs.length} registros</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* SUB-TAB 2: CONVERSAS ATIVAS (CHAT HUB) */}
      {activeSubTab === 'threads' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[650px]">
          
          {/* Threads List Sidebar */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            
            {/* Search & Filter Header */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 space-y-2.5">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar conversa por nome ou fone..."
                  value={threadSearch}
                  onChange={(e) => setThreadSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                />
              </div>

              <div className="flex items-center gap-1 text-[10px] font-bold">
                <button
                  onClick={() => setThreadFilter('TODOS')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    threadFilter === 'TODOS' ? 'bg-slate-900 text-white' : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Todos ({threads.length})
                </button>
                <button
                  onClick={() => setThreadFilter('AGUARDANDO')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    threadFilter === 'AGUARDANDO' ? 'bg-amber-600 text-white' : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Aguardando ({threads.filter(t => t.status === 'AGUARDANDO_RESPOSTA').length})
                </button>
                <button
                  onClick={() => setThreadFilter('ATENDIDOS')}
                  className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                    threadFilter === 'ATENDIDOS' ? 'bg-emerald-600 text-white' : 'bg-slate-200/70 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  Atendidos ({threads.filter(t => t.status === 'ATENDIDO').length})
                </button>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
              {filteredThreads.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs">
                  Nenhuma conversa encontrada.
                </div>
              ) : (
                filteredThreads.map(thread => {
                  const isSelected = thread.id === currentThread?.id;
                  return (
                    <div
                      key={thread.id}
                      onClick={() => setSelectedThreadId(thread.id)}
                      className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start gap-3 relative ${
                        isSelected ? 'bg-emerald-50/60 border-l-4 border-emerald-600' : ''
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-full ${thread.avatarColor || 'bg-emerald-600'} text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-xs`}>
                        {thread.contactName.substring(0, 2).toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-bold text-slate-900 truncate">{thread.contactName}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{thread.lastMessageTime}</span>
                        </div>

                        <p className="text-[11px] text-slate-500 truncate">{thread.company || thread.phone}</p>
                        <p className="text-[11px] text-slate-600 line-clamp-1 italic">&quot;{thread.lastMessage}&quot;</p>
                      </div>

                      {thread.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-rose-500 text-white font-bold text-[10px] rounded-full font-mono flex-shrink-0 animate-pulse">
                          {thread.unreadCount}
                        </span>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Active Chat Window Pane */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col overflow-hidden">
            
            {currentThread ? (
              <>
                {/* Chat Header */}
                <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full ${currentThread.avatarColor || 'bg-emerald-600'} text-white font-bold text-xs flex items-center justify-center`}>
                      {currentThread.contactName.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center gap-2">
                        {currentThread.contactName}
                        <span className="text-[10px] font-mono font-normal text-emerald-400">{currentThread.phone}</span>
                      </h3>
                      <p className="text-[10px] text-slate-400">{currentThread.company || 'Cliente Final'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSimulateIncomingMessage}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                      title="Simular cliente respondendo no WhatsApp"
                    >
                      <Bot className="w-3 h-3 text-emerald-400" />
                      <span>Simular Resposta</span>
                    </button>
                  </div>
                </div>

                {/* Chat Messages Body */}
                <div className="flex-1 p-4 bg-slate-100/70 overflow-y-auto space-y-3 font-sans text-xs">
                  {currentThread.messages.map(msg => {
                    const isCompany = msg.sender === 'company';
                    return (
                      <div
                        key={msg.id}
                        className={`flex flex-col ${isCompany ? 'items-end' : 'items-start'}`}
                      >
                        <div className={`max-w-[80%] p-3 rounded-2xl text-xs shadow-xs space-y-1 ${
                          isCompany 
                            ? 'bg-emerald-700 text-white rounded-tr-none' 
                            : 'bg-white text-slate-800 rounded-tl-none border border-slate-200'
                        }`}>
                          <p className="leading-relaxed">{msg.text}</p>
                          <div className={`flex items-center justify-end gap-1 text-[9px] ${
                            isCompany ? 'text-emerald-200' : 'text-slate-400'
                          }`}>
                            <span>{msg.timestamp}</span>
                            {isCompany && <CheckCheck className="w-3 h-3 text-emerald-200" />}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Chat Input Bar */}
                <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Digite a resposta para enviar no WhatsApp..."
                    value={chatInputText}
                    onChange={(e) => setChatInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />

                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInputText.trim()}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                  >
                    <SendHorizontal className="w-4 h-4" />
                    <span>Enviar</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-12 text-center text-slate-400 text-xs my-auto">
                Selecione uma conversa para visualizar o histórico de mensagens.
              </div>
            )}

          </div>

        </div>
      )}

      {/* SUB-TAB 3: LOGS DE DISPARO */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs space-y-4 p-5">
          
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-3 border-b border-slate-100">
            
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filtrar logs por contato ou conteúdo..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
              </div>

              <select
                value={logDirectionFilter}
                onChange={(e) => setLogDirectionFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Direção: Todos</option>
                <option value="SAIDA">Saída (Enviadas)</option>
                <option value="ENTRADA">Entrada (Recebidas)</option>
              </select>

              <select
                value={logStatusFilter}
                onChange={(e) => setLogStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="TODOS">Status: Todos</option>
                <option value="LIDO">Lido</option>
                <option value="ENTREGUE">Entregue</option>
                <option value="ENVIADO">Enviado</option>
                <option value="FALHA">Falha</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportLogsCsv}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Exportar CSV</span>
              </button>

              <button
                onClick={handleClearLogs}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Limpar Logs</span>
              </button>
            </div>

          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-mono uppercase text-slate-500 tracking-wider">
                  <th className="p-3">ID / Horário</th>
                  <th className="p-3">Fluxo</th>
                  <th className="p-3">Destinatário / Fone</th>
                  <th className="p-3">Conteúdo da Mensagem</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Latência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                      Nenhum registro de log encontrado.
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3">
                        <div className="font-mono font-bold text-slate-900 text-[11px]">{log.id}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.timestamp}</div>
                      </td>

                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          log.direction === 'SAIDA'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          {log.direction === 'SAIDA' ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownLeft className="w-3 h-3" />}
                          <span>{log.direction}</span>
                        </span>
                      </td>

                      <td className="p-3">
                        <div className="font-bold text-slate-900">{log.recipientName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.phone}</div>
                      </td>

                      <td className="p-3 max-w-xs">
                        <p className="text-slate-700 truncate italic">&quot;{log.message}&quot;</p>
                      </td>

                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                          log.status === 'LIDO' 
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : log.status === 'ENTREGUE'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'ENVIADO'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono text-[11px] text-slate-500">
                        {log.latencyMs ? `${log.latencyMs}ms` : '-'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>
      )}

    </div>
  );
}
