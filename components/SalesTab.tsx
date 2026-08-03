'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Truck, 
  RotateCcw,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  Trash2,
  X,
  CreditCard,
  ChevronRight,
  Package,
  AlertCircle,
  UploadCloud,
  FileImage,
  FileText,
  Printer,
  SlidersHorizontal,
  UserPlus,
  Check,
  ChevronsUpDown
} from 'lucide-react';
import { SalesOrder, Customer, InventoryItem, ProjectFile, ProductionOrder } from '../lib/types';
import SegmentManagerModal from './SegmentManagerModal';

interface SalesTabProps {
  salesOrders: SalesOrder[];
  productionOrders: ProductionOrder[];
  customers: Customer[];
  inventory: InventoryItem[];
  onAddSalesOrder: (order: Omit<SalesOrder, 'id'>) => void;
  onUpdateStatus: (id: string, newStatus: SalesOrder['status']) => void;
  onUpdatePaymentMethod: (id: string, newPaymentMethod: string) => void;
  onGenerateOPsFromOrder?: (order: SalesOrder) => void;
  onAddCustomer?: (customer: Omit<Customer, 'id' | 'totalPurchased'>) => void;
  industrialSegments?: string[];
  onUpdateSegments?: (
    newSegments: string[],
    renameMapping?: { old: string; new: string },
    deletedSegment?: string
  ) => void;
  systemParams?: any;
}

interface DraftOrderItem {
  sku: string;
  name: string;
  qty: number;
  price: number;
  total: number;
  unit: string;
  note?: string;
}

export default function SalesTab({
  salesOrders,
  productionOrders,
  customers,
  inventory,
  onAddSalesOrder,
  onUpdateStatus,
  onUpdatePaymentMethod,
  onGenerateOPsFromOrder,
  onAddCustomer,
  industrialSegments = ["Metalurgia", "Siderurgia", "Automobilístico", "Celulose / Papel", "Petroquímico", "Eletroeletrônica", "Mineração", "Energia"],
  onUpdateSegments = () => {},
  systemParams
}: SalesTabProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'Todos' | SalesOrder['status']>('Todos');
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [printOrder, setPrintOrder] = useState<SalesOrder | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const handlePrint = (order: SalesOrder) => {
    setPrintOrder(order);
    setTimeout(() => {
      window.print();
    }, 150);
  };
  
  // New order form states
  const [newClient, setNewClient] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Boleto Bancário');
  const [deliveryDate, setDeliveryDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    return nextWeek.toISOString().split('T')[0];
  });

  // Split payment states
  const [payment1Method, setPayment1Method] = useState('Boleto Bancário');
  const [payment1Amount, setPayment1Amount] = useState<number>(0);
  const [payment2Method, setPayment2Method] = useState('');
  const [payment2Amount, setPayment2Amount] = useState<number>(0);
  const [payment3Method, setPayment3Method] = useState('');
  const [payment3Amount, setPayment3Amount] = useState<number>(0);
  const [boletoDueDate, setBoletoDueDate] = useState('');
  const [boletoInstallmentsCount, setBoletoInstallmentsCount] = useState<number>(1);
  const [boletoDueDates, setBoletoDueDates] = useState<string[]>(['']);

  const handleInstallmentsCountChange = (count: number) => {
    setBoletoInstallmentsCount(count);
    setBoletoDueDates(prev => {
      const next = [...prev];
      if (next.length < count) {
        while (next.length < count) {
          next.push('');
        }
      } else if (next.length > count) {
        next.splice(count);
      }
      return next;
    });
  };

  // Dynamic products list in the form
  const [selectedItems, setSelectedItems] = useState<DraftOrderItem[]>([]);
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [selectedProductSku, setSelectedProductSku] = useState('');
  const [productQty, setProductQty] = useState(1);
  const [productNote, setProductNote] = useState('');
  const [productPrice, setProductPrice] = useState<number>(0);

  // States, refs and helper for intelligent product search combobox
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const productDropdownRef = React.useRef<HTMLDivElement>(null);

  // Helper to normalize strings (accent-insensitive search)
  const normalizeStr = (str: string) => {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (productDropdownRef.current && !productDropdownRef.current.contains(event.target as Node)) {
        setIsProductDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Accent-tolerant smart filtered products memo
  const filteredProducts = useMemo(() => {
    const activeInventory = inventory.filter(item => item.active !== false);
    const normalizedQuery = normalizeStr(productSearchQuery);
    if (!normalizedQuery) return activeInventory;
    
    return activeInventory.filter(item => {
      const nameMatch = normalizeStr(item.name).includes(normalizedQuery);
      const skuMatch = normalizeStr(item.sku || '').includes(normalizedQuery);
      const catMatch = normalizeStr(item.category || '').includes(normalizedQuery);
      return nameMatch || skuMatch || catMatch;
    });
  }, [inventory, productSearchQuery]);
  const [projectImages, setProjectImages] = useState<string[]>([]);
  const [projectFiles, setProjectFiles] = useState<ProjectFile[]>([]);
  const [notes, setNotes] = useState('');
  const [isBudget, setIsBudget] = useState(false);

  // States for inline customer creation
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [custName, setCustName] = useState('');
  const [custCnpj, setCustCnpj] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custAddress, setCustAddress] = useState('');
  const [custSegment, setCustSegment] = useState('Metalurgia');
  const [isSegmentManagerOpen, setIsSegmentManagerOpen] = useState(false);

  const handleInlineAddCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custCnpj.trim() || !custEmail.trim()) {
      alert('Por favor, preencha todos os campos obrigatórios (*)');
      return;
    }
    if (onAddCustomer) {
      onAddCustomer({
        name: custName,
        cnpj: custCnpj,
        email: custEmail,
        phone: custPhone || '(00) 0000-0000',
        address: custAddress || 'Não informado',
        segment: custSegment,
        status: 'Ativo'
      });
      // Automatically select the newly created customer
      setNewClient(custName);
      // Reset form states
      setCustName('');
      setCustCnpj('');
      setCustEmail('');
      setCustPhone('');
      setCustAddress('');
      setCustSegment('Metalurgia');
      setIsAddCustomerOpen(false);
    } else {
      alert('Função de cadastro não disponível no momento.');
    }
  };

  // Handle attachment of project drawings & PDFs
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const filesArray = Array.from(e.target.files);
    filesArray.forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf';
      
      if (!isImage && !isPdf) {
        showToast('Por favor, envie apenas arquivos de imagem ou PDF.', 'error');
        return;
      }

      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          const newFile: ProjectFile = {
            name: file.name,
            type: file.type,
            data: reader.result as string
          };
          setProjectFiles(prev => {
            const updated = [...prev, newFile];
            // Sync with projectImages for any background/older components expecting only images
            setProjectImages(updated.filter(f => f.type.startsWith('image/')).map(f => f.data));
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoveProjectFile = (index: number) => {
    setProjectFiles(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // Sync with projectImages for backward compatibility
      setProjectImages(updated.filter(f => f.type.startsWith('image/')).map(f => f.data));
      return updated;
    });
  };

  // KPIs calculations
  const totalFaturado = useMemo(() => {
    return salesOrders
      .filter(o => o.status !== 'Cancelado')
      .reduce((sum, o) => sum + o.value, 0);
  }, [salesOrders]);

  const activeOrders = useMemo(() => {
    return salesOrders.filter(o => o.status === 'Pendente' || o.status === 'Faturado').length;
  }, [salesOrders]);

  const shippedToday = useMemo(() => {
    return salesOrders.filter(o => o.status === 'Enviado' || o.status === 'Entregue').length;
  }, [salesOrders]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return salesOrders.filter(order => {
      const matchSearch = order.client.toLowerCase().includes(search.toLowerCase()) || 
                          order.id.toLowerCase().includes(search.toLowerCase()) ||
                          order.items.toLowerCase().includes(search.toLowerCase()) ||
                          (order.paymentMethod && order.paymentMethod.toLowerCase().includes(search.toLowerCase()));
      const matchStatus = statusFilter === 'Todos' || order.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [salesOrders, search, statusFilter]);

  // Pagination (5 items per page for dense dashboard look)
  const itemsPerPage = 5;
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const paginatedOrders = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredOrders, currentPage]);

  // Current selected item details helper
  const selectedProductDetails = useMemo(() => {
    if (!selectedProductSku) return null;
    return inventory.find(item => item.sku === selectedProductSku) || null;
  }, [selectedProductSku, inventory]);

  // Add item to draft order
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductDetails || productQty <= 0) {
      alert('Por favor, insira uma quantidade maior que zero.');
      return;
    }

    const currentPrice = productPrice;

    // Check if product with the same note and price is already in the list
    const existingIndex = selectedItems.findIndex(
      item => item.sku === selectedProductSku && (item.note || '') === (productNote || '') && item.price === currentPrice
    );
    if (existingIndex >= 0) {
      setSelectedItems(prev => prev.map((item, idx) => {
        if (idx === existingIndex) {
          const newQty = item.qty + productQty;
          return {
            ...item,
            qty: newQty,
            total: newQty * item.price
          };
        }
        return item;
      }));
    } else {
      setSelectedItems(prev => [
        ...prev,
        {
          sku: selectedProductDetails.sku,
          name: selectedProductDetails.name,
          qty: productQty,
          price: currentPrice,
          total: productQty * currentPrice,
          unit: selectedProductDetails.unit || 'UN',
          note: productNote || undefined
        }
      ]);
    }

    // Reset current item selections
    setSelectedProductSku('');
    setProductQty(1);
    setProductNote('');
    setProductPrice(0);
  };

  // Update item quantity directly in the sales order table
  const handleUpdateItemQty = (index: number, newQty: number) => {
    if (newQty < 0) return;
    setSelectedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          qty: newQty,
          total: newQty * item.price
        };
      }
      return item;
    }));
  };

  // Update item unit price directly in the sales order table
  const handleUpdateItemPrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    setSelectedItems(prev => prev.map((item, idx) => {
      if (idx === index) {
        return {
          ...item,
          price: newPrice,
          total: item.qty * newPrice
        };
      }
      return item;
    }));
  };

  // Remove item from draft order
  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, idx) => idx !== index));
  };

  // Calculate dynamic grand total of current draft order
  const grandTotal = useMemo(() => {
    return selectedItems.reduce((sum, item) => sum + item.total, 0);
  }, [selectedItems]);

  const discountAmount = useMemo(() => {
    return (grandTotal * discountPercent) / 100;
  }, [grandTotal, discountPercent]);

  const finalTotal = useMemo(() => {
    return grandTotal - discountAmount;
  }, [grandTotal, discountAmount]);

  // Helper selectors for customer credit
  const selectedCustomerObj = useMemo(() => {
    if (!newClient) return null;
    return customers.find(c => c.name.toLowerCase() === newClient.toLowerCase() || c.name.toLowerCase().includes(newClient.toLowerCase())) || null;
  }, [newClient, customers]);

  const customerCreditBalance = useMemo(() => {
    return selectedCustomerObj?.creditBalance || 0;
  }, [selectedCustomerObj]);

  const totalPaymentsAllocated = useMemo(() => {
    let sum = payment1Amount;
    if (payment2Method) sum += payment2Amount;
    if (payment3Method) sum += payment3Amount;
    return sum;
  }, [payment1Amount, payment2Method, payment2Amount, payment3Method, payment3Amount]);

  const remainingToAllocate = useMemo(() => {
    return Math.max(0, finalTotal - totalPaymentsAllocated);
  }, [finalTotal, totalPaymentsAllocated]);

  const surplusPayment = useMemo(() => {
    return Math.max(0, totalPaymentsAllocated - finalTotal);
  }, [finalTotal, totalPaymentsAllocated]);

  const creditUsedInOrder = useMemo(() => {
    let sum = 0;
    if (payment1Method === 'Crédito do Cliente') sum += payment1Amount;
    if (payment2Method === 'Crédito do Cliente') sum += payment2Amount;
    if (payment3Method === 'Crédito do Cliente') sum += payment3Amount;
    return sum;
  }, [payment1Method, payment1Amount, payment2Method, payment2Amount, payment3Method, payment3Amount]);

  // Set default payment 1 amount to finalTotal when it changes and no other payments are set asynchronously
  useEffect(() => {
    const hasOtherPayments = (payment2Method && payment2Amount > 0) || (payment3Method && payment3Amount > 0);
    if (!hasOtherPayments) {
      const timer = setTimeout(() => {
        setPayment1Amount(finalTotal);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [finalTotal, payment2Method, payment2Amount, payment3Method, payment3Amount]);

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient) {
      showToast('Por favor, selecione um cliente.', 'error');
      return;
    }
    if (selectedItems.length === 0) {
      showToast('Adicione pelo menos um produto ao pedido de venda.', 'error');
      return;
    }

    if (!isBudget) {
      if (creditUsedInOrder > customerCreditBalance) {
        showToast(`Saldo de crédito do cliente insuficiente! Limite disponível: R$ ${customerCreditBalance.toFixed(2)}`, 'error');
        return;
      }
      if (totalPaymentsAllocated < finalTotal - 0.01) {
        showToast(`O valor total das formas de pagamento é menor que o valor total do pedido! Falta alocar: R$ ${remainingToAllocate.toFixed(2)}`, 'error');
        return;
      }

      const isBoletoSelected = 
        (payment1Amount > 0 && payment1Method === 'Boleto Bancário') ||
        (payment2Method === 'Boleto Bancário' && payment2Amount > 0) ||
        (payment3Method === 'Boleto Bancário' && payment3Amount > 0);

      if (isBoletoSelected) {
        const hasEmptyDate = boletoDueDates.some(date => !date);
        if (hasEmptyDate) {
          showToast('Por favor, informe a Data de Vencimento de cada uma das parcelas do Boleto.', 'error');
          return;
        }
      }
    }

    // Create a detailed items description string for backward compatibility
    const itemsDescription = selectedItems
      .map(item => `${item.name} (x${item.qty} ${item.unit})`)
      .join(', ');

    // Compile dynamic formatted payment method
    const methodsUsed: string[] = [];
    if (payment1Amount > 0) {
      methodsUsed.push(`${payment1Method} (R$ ${payment1Amount.toFixed(2)})`);
    }
    if (payment2Method && payment2Amount > 0) {
      methodsUsed.push(`${payment2Method} (R$ ${payment2Amount.toFixed(2)})`);
    }
    if (payment3Method && payment3Amount > 0) {
      methodsUsed.push(`${payment3Method} (R$ ${payment3Amount.toFixed(2)})`);
    }
    const finalPaymentMethodString = methodsUsed.length > 0 ? methodsUsed.join(' + ') : payment1Method;

    const isBoletoSelectedNow = 
      !isBudget && (
        (payment1Amount > 0 && payment1Method === 'Boleto Bancário') ||
        (payment2Method === 'Boleto Bancário' && payment2Amount > 0) ||
        (payment3Method === 'Boleto Bancário' && payment3Amount > 0)
      );

    // Calculate installments if boleto is selected
    let totalBoletoValue = 0;
    if (payment1Amount > 0 && payment1Method === 'Boleto Bancário') totalBoletoValue += payment1Amount;
    if (payment2Amount > 0 && payment2Method === 'Boleto Bancário') totalBoletoValue += payment2Amount;
    if (payment3Amount > 0 && payment3Method === 'Boleto Bancário') totalBoletoValue += payment3Amount;

    const boletoInstallmentsList = [];
    if (isBoletoSelectedNow && totalBoletoValue > 0) {
      const baseValue = parseFloat((totalBoletoValue / boletoInstallmentsCount).toFixed(2));
      let sum = 0;
      for (let i = 0; i < boletoInstallmentsCount; i++) {
        let val = baseValue;
        if (i === boletoInstallmentsCount - 1) {
          val = parseFloat((totalBoletoValue - sum).toFixed(2));
        }
        sum += val;
        boletoInstallmentsList.push({
          id: `${i + 1}`,
          dueDate: boletoDueDates[i] || '',
          value: val,
          paid: false
        });
      }
    }

    onAddSalesOrder({
      client: newClient,
      value: finalTotal,
      date: new Date().toISOString().split('T')[0],
      status: isBudget ? 'Orçamento' : 'Pendente',
      items: itemsDescription,
      paymentMethod: finalPaymentMethodString,
      deliveryDate,
      projectImages,
      projectFiles,
      notes,
      discountPercentage: discountPercent,
      products: selectedItems,
      creditUsed: !isBudget ? creditUsedInOrder : 0,
      creditGenerated: !isBudget ? surplusPayment : 0,
      boletoDueDate: isBoletoSelectedNow ? (boletoDueDates[0] || undefined) : undefined,
      boletoInstallmentsCount: isBoletoSelectedNow ? boletoInstallmentsCount : undefined,
      boletoInstallments: isBoletoSelectedNow ? boletoInstallmentsList : undefined
    });

    // Reset form states
    setNewClient('');
    setSelectedItems([]);
    setDiscountPercent(0);
    setPaymentMethod('Boleto Bancário');
    setPayment1Method('Boleto Bancário');
    setPayment1Amount(0);
    setPayment2Method('');
    setPayment2Amount(0);
    setPayment3Method('');
    setPayment3Amount(0);
    setBoletoDueDate('');
    setBoletoInstallmentsCount(1);
    setBoletoDueDates(['']);
    setSelectedProductSku('');
    setProductPrice(0);
    setProductQty(1);
    setProjectImages([]);
    setProjectFiles([]);
    setNotes('');
    setIsBudget(false);
    setIsAddOpen(false);
    showToast(isBudget ? 'Orçamento / Cotação lançado com sucesso!' : 'Pedido de Venda lançado com sucesso!', 'success');
  };

  return (
    <div className="space-y-6 relative">
      {/* Sleek Alert / Toast Notification */}
      {toast && (
        <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-lg border ${
          toast.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800 shadow-emerald-100/50' 
            : 'bg-rose-50 border-rose-200 text-rose-800 shadow-rose-100/50'
        }`}>
          <div className={`w-2 h-2 rounded-full ${toast.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
          <span className="text-xs font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Header and Add button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="sales-management-heading" className="text-xl font-bold text-slate-800 tracking-tight">Gestão de Vendas</h2>
          <p className="text-xs text-slate-500 mt-1">Controle de faturamento, faturas emitidas e carteira de pedidos comerciais</p>
        </div>
        <button 
          onClick={() => {
            if (isAddOpen) {
              // clear form
              setSelectedItems([]);
            }
            setIsAddOpen(!isAddOpen);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-lg font-medium shadow transition-colors self-start"
        >
          {isAddOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isAddOpen ? 'Fechar Formulário' : 'Novo Pedido de Venda'}
        </button>
      </div>

      {/* Add Order Form expansion */}
      {isAddOpen && (
        <form onSubmit={handleCreateOrder} className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-indigo-900 text-white rounded-2xl p-5 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-800 rounded-xl">
                <ShoppingBag className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Abertura de Documento Comercial</h3>
                <p className="text-[10px] text-indigo-200 mt-0.5">Preencha os dados abaixo para gerar um novo pedido de venda ou orçamento formal</p>
              </div>
            </div>
            <span className="hidden sm:inline-block text-[10px] bg-indigo-800 text-indigo-100 border border-indigo-700 px-3 py-1 rounded-full font-mono font-bold">ERP Comercial Integrado</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">
            {/* Left Panel: Input Steps (Col span 3) */}
            <div className="lg:col-span-3 space-y-5">
              
              {/* SEÇÃO 1: Informações do Documento */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs">1</span>
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Dados Principais do Documento</h4>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Tipo de Documento */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tipo de Documento *</label>
                    <select 
                      value={isBudget ? "Orçamento" : "Pedido"} 
                      onChange={(e) => setIsBudget(e.target.value === "Orçamento")} 
                      required 
                      className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-bold text-indigo-700 cursor-pointer transition-all"
                    >
                      <option value="Pedido">Pedido de Venda</option>
                      <option value="Orçamento">Orçamento / Cotação</option>
                    </select>
                  </div>

                  {/* Cliente selection */}
                  <div className="md:col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase">Cliente / Razão Social *</label>
                      <button
                        type="button"
                        onClick={() => setIsAddCustomerOpen(true)}
                        className="text-[9px] font-extrabold text-indigo-600 hover:text-indigo-800 uppercase tracking-wider flex items-center gap-0.5 cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded-md transition-all border-none outline-none"
                      >
                        <Plus className="w-2.5 h-2.5" />
                        Novo Cliente
                      </button>
                    </div>
                    <select 
                      value={newClient} 
                      onChange={(e) => setNewClient(e.target.value)} 
                      required 
                      className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-semibold text-slate-700 cursor-pointer"
                    >
                      <option value="">Selecione um cliente homologado...</option>
                      {customers.filter(c => c.status === 'Ativo').map(c => (
                        <option key={c.id} value={c.name}>
                          {c.name} {c.creditBalance && c.creditBalance > 0 ? ` [Crédito R$ ${c.creditBalance.toFixed(2)}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Expected Delivery Date */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Data Prevista para Entrega *</label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                      <input 
                        type="date" 
                        value={deliveryDate} 
                        onChange={(e) => setDeliveryDate(e.target.value)} 
                        required 
                        className="w-full text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Discount (%) */}
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Desconto Comercial (%)</label>
                    <div className="relative">
                      <input 
                        type="number" 
                        min={0}
                        max={100}
                        step={0.1}
                        value={discountPercent || ''} 
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          setDiscountPercent(isNaN(val) ? 0 : Math.min(100, Math.max(0, val)));
                        }} 
                        placeholder="0"
                        className="w-full text-xs px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold text-slate-700"
                      />
                      <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* SEÇÃO 2: Itens do Pedido */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs">2</span>
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Produtos e Materiais do Lote</h4>
                </div>

                <div className="space-y-3 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                    <div className="md:col-span-6">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Selecione o Produto *</label>
                      <div ref={productDropdownRef} className="relative">
                        <button
                          type="button"
                          onClick={() => setIsProductDropdownOpen(!isProductDropdownOpen)}
                          className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 flex items-center justify-between gap-2 text-left shadow-sm cursor-pointer hover:bg-slate-50/50 transition-colors min-h-[38px]"
                        >
                          {selectedProductDetails ? (
                            <div className="truncate flex items-center gap-2">
                              <span className="font-mono bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[9px] font-black shrink-0">
                                {selectedProductDetails.sku}
                              </span>
                              <span className="font-semibold text-slate-750 truncate">
                                {selectedProductDetails.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-bold shrink-0">
                                ({selectedProductDetails.unit || 'UN'})
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">Escolher produto do catálogo comercial...</span>
                          )}
                          <ChevronsUpDown className="w-4 h-4 text-slate-400 shrink-0" />
                        </button>
                        
                        {isProductDropdownOpen && (
                          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-80 flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-1 duration-100">
                            {/* Search bar inside dropdown */}
                            <div className="p-2 border-b border-slate-100 flex items-center gap-2 sticky top-0 bg-white">
                              <Search className="w-4 h-4 text-slate-400 shrink-0" />
                              <input
                                type="text"
                                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500/10 font-semibold placeholder:text-slate-400 text-slate-800"
                                placeholder="Digite SKU, nome ou categoria para buscar..."
                                value={productSearchQuery}
                                onChange={(e) => setProductSearchQuery(e.target.value)}
                                autoFocus
                                onClick={(e) => e.stopPropagation()} // Stop propagation so it doesn't close
                                onKeyDown={(e) => {
                                  if (e.key === 'Escape') {
                                    setIsProductDropdownOpen(false);
                                  }
                                }}
                              />
                              {productSearchQuery && (
                                <button 
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setProductSearchQuery('');
                                  }}
                                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            {/* Options List */}
                            <div className="overflow-y-auto flex-1 max-h-56 divide-y divide-slate-50 py-1">
                              {filteredProducts.length === 0 ? (
                                <div className="p-4 text-center text-xs text-slate-400 italic">
                                  Nenhum produto encontrado para &quot;{productSearchQuery}&quot;
                                </div>
                              ) : (
                                filteredProducts.map(item => {
                                  const isSelected = item.sku === selectedProductSku;
                                  return (
                                    <button
                                      key={item.sku}
                                      type="button"
                                      onClick={() => {
                                        setSelectedProductSku(item.sku);
                                        setProductPrice(item.salesPrice || item.price || 0);
                                        setIsProductDropdownOpen(false);
                                        setProductSearchQuery('');
                                      }}
                                      className={`w-full text-left px-3 py-2.5 text-xs hover:bg-indigo-50/40 transition-colors flex items-center justify-between gap-3 ${
                                        isSelected ? 'bg-indigo-50/50 text-indigo-700 font-bold' : 'text-slate-700'
                                      }`}
                                    >
                                      <div className="min-w-0 flex-1">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                          <span className="font-mono bg-slate-100 text-slate-500 px-1 py-0.5 rounded text-[9px] font-bold">
                                            {item.sku}
                                          </span>
                                          {item.category && (
                                            <span className="bg-emerald-50 text-emerald-700 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-wide">
                                              {item.category}
                                            </span>
                                          )}
                                        </div>
                                        <p className="mt-1 font-semibold truncate text-slate-800">
                                          {item.name}
                                        </p>
                                      </div>
                                      <div className="flex items-center gap-1 text-slate-500 text-[10px] shrink-0 font-bold font-mono">
                                        <span>{item.unit || 'UN'}</span>
                                        {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 ml-1 shrink-0" />}
                                      </div>
                                    </button>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Preço Unitário (R$)</label>
                      <input 
                        type="number" 
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={productPrice === 0 ? '' : productPrice} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setProductPrice(0);
                          } else {
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed)) {
                              setProductPrice(parsed);
                            }
                          }
                        }}
                        className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                        disabled={!selectedProductSku}
                      />
                    </div>

                    <div className="md:col-span-3">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Quantidade ({selectedProductDetails?.unit || 'UN'})</label>
                      <input 
                        type="number" 
                        step="any"
                        min="0.001"
                        placeholder="Qtd"
                        value={productQty === 0 ? '' : productQty} 
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setProductQty(0);
                          } else {
                            const parsed = parseFloat(val);
                            if (!isNaN(parsed)) {
                              setProductQty(parsed);
                            }
                          }
                        }}
                        className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-bold"
                        disabled={!selectedProductSku}
                      />
                    </div>

                    <div className="md:col-span-9">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Observação deste Item</label>
                      <textarea 
                        rows={2}
                        placeholder="Ex: Medida sob medida, acabamento específico, furos adicionais, etc."
                        value={productNote}
                        onChange={(e) => setProductNote(e.target.value)}
                        className="w-full text-xs border border-slate-200 px-3 py-2 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium placeholder:text-slate-400 whitespace-pre-wrap"
                      />
                    </div>

                    <div className="md:col-span-3">
                      <button
                        type="button"
                        onClick={handleAddItem}
                        disabled={!selectedProductSku}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-xs py-2.5 rounded-lg font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        Adicionar Item
                      </button>
                    </div>
                  </div>

                  {selectedProductDetails && (
                    <div className="bg-white border border-indigo-50 p-3 rounded-lg flex items-center justify-between text-xs animate-in fade-in duration-150">
                      <div className="space-y-0.5">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Produto Selecionado</p>
                        <p className="font-bold text-slate-800">{selectedProductDetails.name}</p>
                        <p className="text-[10px] font-mono text-slate-500">Unidade: {selectedProductDetails.unit || 'UN'} • SKU: {selectedProductDetails.sku}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">Preço de Venda Definido</p>
                        <p className="font-extrabold text-indigo-700 font-mono text-sm">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productPrice)}
                        </p>
                        <p className="text-[9px] text-slate-400">Total previsto: <strong className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(productQty * productPrice)}</strong></p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Table of draft items */}
                <div className="border border-slate-200 bg-white rounded-xl overflow-hidden shadow-xs">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3">Código SKU</th>
                        <th className="px-4 py-3">Descrição do Produto</th>
                        <th className="px-4 py-3 text-center">Quant.</th>
                        <th className="px-4 py-3">Valor Unitário</th>
                        <th className="px-4 py-3">Subtotal</th>
                        <th className="px-4 py-3 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="text-center py-8 text-slate-400 font-medium">
                            Nenhum produto adicionado ao lote comercial.
                          </td>
                        </tr>
                      ) : (
                        selectedItems.map((item, index) => (
                          <tr key={`${item.sku}-${index}`} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-4 py-3 font-mono font-semibold text-slate-500">{item.sku}</td>
                            <td className="px-4 py-3">
                              <div className="font-semibold text-slate-800">{item.name}</div>
                              {item.note && (
                                <div className="text-[10px] text-indigo-600 mt-1 bg-indigo-50/70 border border-indigo-100 px-2 py-0.5 rounded-md inline-block font-medium whitespace-pre-wrap">
                                  Obs: {item.note}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-center font-mono font-bold text-slate-700 bg-slate-50/30">
                              <div className="inline-flex items-center gap-1">
                                <input
                                  type="number"
                                  step="any"
                                  min="0.001"
                                  value={item.qty === 0 ? '' : item.qty}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                      handleUpdateItemQty(index, val);
                                    }
                                  }}
                                  className="w-16 text-center border border-slate-200 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-bold"
                                />
                                <span className="text-[10px] text-slate-400 font-normal">{item.unit}</span>
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono text-slate-600">
                              <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400">R$</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={item.price === 0 ? '' : item.price}
                                  onChange={(e) => {
                                    const val = e.target.value === '' ? 0 : parseFloat(e.target.value);
                                    if (!isNaN(val)) {
                                      handleUpdateItemPrice(index, val);
                                    }
                                  }}
                                  className="w-24 border border-slate-200 rounded px-1.5 py-1 text-xs focus:ring-2 focus:ring-indigo-500/20 focus:outline-none bg-white font-bold text-right"
                                />
                              </div>
                            </td>
                            <td className="px-4 py-2.5 font-mono font-bold text-indigo-600">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(index)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                title="Remover Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SEÇÃO 3: Condições de Pagamento */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs">3</span>
                    <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Formas de Pagamento & Crédito</h4>
                  </div>
                  {selectedCustomerObj && (
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Saldo de Crédito:</span>
                      <span className={`text-xs font-black px-2 py-0.5 rounded-md font-mono ${
                        customerCreditBalance > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-500'
                      }`}>
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(customerCreditBalance)}
                      </span>
                    </div>
                  )}
                </div>

                {isBudget ? (
                  <p className="text-[11px] text-slate-500 bg-slate-50 border border-slate-100 p-3 rounded-lg leading-relaxed italic">
                    Este documento é um <strong>Orçamento</strong>. A especificação exata do pagamento e o consumo do crédito de faturamento não se aplicam agora e serão processados apenas quando a cotação for convertida em um Pedido de Venda oficial.
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Payment 1 Card */}
                      <div className="bg-slate-50/50 p-3.5 border border-slate-200/80 rounded-xl space-y-2.5 relative">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">Forma de Pagamento 1 *</span>
                          <span className="text-[9px] text-slate-400 font-bold font-mono">Principal</span>
                        </div>
                        <select
                          value={payment1Method}
                          onChange={(e) => setPayment1Method(e.target.value)}
                          className="w-full text-xs border border-slate-200 px-2.5 py-2 rounded-lg bg-white focus:outline-none"
                        >
                          <option value="Boleto Bancário">Boleto Bancário</option>
                          <option value="PIX">PIX à vista</option>
                          <option value="Cartão de Crédito">Cartão de Crédito</option>
                          <option value="Cartão de Débito">Cartão de Débito</option>
                          <option value="Dinheiro">Dinheiro</option>
                          <option value="Crédito do Cliente" disabled={customerCreditBalance <= 0}>
                            Crédito do Cliente {customerCreditBalance > 0 ? `(R$ ${customerCreditBalance.toFixed(2)})` : '(Sem Saldo)'}
                          </option>
                        </select>
                        <div className="relative">
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={payment1Amount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value);
                              setPayment1Amount(isNaN(val) ? 0 : val);
                            }}
                            className="w-full text-xs border border-slate-200 pl-7 pr-2.5 py-2 rounded-lg bg-white focus:outline-none font-mono font-bold text-slate-800"
                          />
                          <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-mono">R$</span>
                        </div>
                      </div>

                      {/* Payment 2 Card */}
                      {payment2Method ? (
                        <div className="bg-slate-50/50 p-3.5 border border-slate-200/80 rounded-xl space-y-2.5 relative animate-in slide-in-from-bottom-2 duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">Forma de Pagamento 2</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPayment2Method('');
                                setPayment2Amount(0);
                              }}
                              className="text-[10px] text-rose-500 hover:text-rose-700 font-bold font-mono transition-colors"
                              title="Remover meio de pagamento"
                            >
                              Remover
                            </button>
                          </div>
                          <select
                            value={payment2Method}
                            onChange={(e) => setPayment2Method(e.target.value)}
                            className="w-full text-xs border border-slate-200 px-2.5 py-2 rounded-lg bg-white focus:outline-none"
                          >
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="PIX">PIX à vista</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Crédito do Cliente" disabled={customerCreditBalance <= 0}>
                              Crédito do Cliente {customerCreditBalance > 0 ? `(R$ ${customerCreditBalance.toFixed(2)})` : '(Sem Saldo)'}
                            </option>
                          </select>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={payment2Amount || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setPayment2Amount(isNaN(val) ? 0 : val);
                              }}
                              className="w-full text-xs border border-slate-200 pl-7 pr-2.5 py-2 rounded-lg bg-white focus:outline-none font-mono font-bold text-slate-800"
                            />
                            <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-mono">R$</span>
                          </div>
                        </div>
                      ) : null}

                      {/* Payment 3 Card */}
                      {payment3Method ? (
                        <div className="bg-slate-50/50 p-3.5 border border-slate-200/80 rounded-xl space-y-2.5 relative animate-in slide-in-from-bottom-2 duration-150">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded">Forma de Pagamento 3</span>
                            <button
                              type="button"
                              onClick={() => {
                                setPayment3Method('');
                                setPayment3Amount(0);
                              }}
                              className="text-[10px] text-rose-500 hover:text-rose-700 font-bold font-mono transition-colors"
                              title="Remover meio de pagamento"
                            >
                              Remover
                            </button>
                          </div>
                          <select
                            value={payment3Method}
                            onChange={(e) => setPayment3Method(e.target.value)}
                            className="w-full text-xs border border-slate-200 px-2.5 py-2 rounded-lg bg-white focus:outline-none"
                          >
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="PIX">PIX à vista</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Cartão de Débito">Cartão de Débito</option>
                            <option value="Dinheiro">Dinheiro</option>
                            <option value="Crédito do Cliente" disabled={customerCreditBalance <= 0}>
                              Crédito do Cliente {customerCreditBalance > 0 ? `(R$ ${customerCreditBalance.toFixed(2)})` : '(Sem Saldo)'}
                            </option>
                          </select>
                          <div className="relative">
                            <input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0,00"
                              value={payment3Amount || ''}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setPayment3Amount(isNaN(val) ? 0 : val);
                              }}
                              className="w-full text-xs border border-slate-200 pl-7 pr-2.5 py-2 rounded-lg bg-white focus:outline-none font-mono font-bold text-slate-800"
                            />
                            <span className="absolute left-2.5 top-2.5 text-[10px] text-slate-400 font-mono">R$</span>
                          </div>
                        </div>
                      ) : null}

                      {/* Add Payment Button placeholder */}
                      {(!payment2Method || !payment3Method) ? (
                        <div className="border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center min-h-[140px] text-center bg-slate-25/20 hover:bg-slate-50/50 transition-all">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Multimeios / Sinal</p>
                          <button
                            type="button"
                            onClick={() => {
                              if (!payment2Method) {
                                setPayment2Method('PIX');
                                setPayment2Amount(0);
                              } else if (!payment3Method) {
                                setPayment3Method('Dinheiro');
                                setPayment3Amount(0);
                              }
                            }}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-850 bg-indigo-50 px-3.5 py-2 rounded-lg transition-colors border-none outline-none cursor-pointer flex items-center gap-1 shrink-0 shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Dividir Pagamento
                          </button>
                          <p className="text-[9px] text-slate-400 mt-2">Dívida o total em até 3 formas de pagamento integradas</p>
                        </div>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center justify-between p-3.5 bg-indigo-50/40 border border-indigo-100 rounded-xl gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-500 font-sans">Fluxo Financeiro do Lote</span>
                          <div className="flex flex-wrap items-center gap-1.5 mt-0.5 text-xs text-slate-600 font-medium">
                            <span>Total Pedido: <strong className="font-mono text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}</strong></span>
                            <span className="text-slate-300">|</span>
                            <span>Pago: <strong className="font-mono text-slate-800">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPaymentsAllocated)}</strong></span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {remainingToAllocate > 0.01 ? (
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2.5 py-1 rounded-md animate-pulse">
                              Falta alocar: R$ {remainingToAllocate.toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const otherTotal = (payment2Method ? payment2Amount : 0) + (payment3Method ? payment3Amount : 0);
                                setPayment1Amount(Math.max(0, finalTotal - otherTotal));
                              }}
                              className="text-[10px] bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-2 py-1 rounded transition-colors shadow-xs cursor-pointer"
                            >
                              Quitar Restante
                            </button>
                          </div>
                        ) : surplusPayment > 0.01 ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[9px] font-bold uppercase text-emerald-600">Sobrará Crédito ao Cliente!</span>
                            <span className="text-xs font-black text-emerald-700 font-mono bg-emerald-100/60 border border-emerald-200 px-2 py-0.5 rounded">
                              +{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(surplusPayment)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-md">
                            ✓ Valor total quitado perfeitamente!
                          </span>
                        )}
                      </div>
                    </div>

                    {((payment1Amount > 0 && payment1Method === 'Boleto Bancário') ||
                      (payment2Method === 'Boleto Bancário' && payment2Amount > 0) ||
                      (payment3Method === 'Boleto Bancário' && payment3Amount > 0)) && (
                      <div className="p-4 bg-amber-50/50 border border-amber-200 rounded-2xl space-y-3 animate-in slide-in-from-top-2 duration-150">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 text-amber-800">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                            <span className="text-[10px] font-black uppercase tracking-wider font-mono">Boleto Identificado</span>
                          </div>
                          <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-md font-mono">
                            Total Boleto: R$ {((payment1Method === 'Boleto Bancário' ? payment1Amount : 0) + (payment2Method === 'Boleto Bancário' ? payment2Amount : 0) + (payment3Method === 'Boleto Bancário' ? payment3Amount : 0)).toFixed(2)}
                          </span>
                        </div>

                        {/* Installments selection */}
                        <div className="space-y-1">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            Quantidade de Parcelas (Máx. 3X) *
                          </label>
                          <div className="grid grid-cols-3 gap-2">
                            {[1, 2, 3].map((num) => (
                              <button
                                key={num}
                                type="button"
                                onClick={() => handleInstallmentsCountChange(num)}
                                className={`py-2 px-3 text-xs font-bold rounded-xl transition-all border cursor-pointer ${
                                  boletoInstallmentsCount === num
                                    ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                                    : 'bg-white border-slate-200 text-slate-700 hover:border-amber-300'
                                }`}
                              >
                                {num}X
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Dates of each installment */}
                        <div className="space-y-2">
                          <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wide">
                            Vencimentos das Parcelas *
                          </label>
                          <div className="space-y-2">
                            {Array.from({ length: boletoInstallmentsCount }).map((_, index) => {
                              const totalBoletoValue = 
                                (payment1Method === 'Boleto Bancário' ? payment1Amount : 0) +
                                (payment2Method === 'Boleto Bancário' ? payment2Amount : 0) +
                                (payment3Method === 'Boleto Bancário' ? payment3Amount : 0);
                              const baseVal = parseFloat((totalBoletoValue / boletoInstallmentsCount).toFixed(2));
                              const instValue = index === boletoInstallmentsCount - 1 
                                ? totalBoletoValue - (baseVal * (boletoInstallmentsCount - 1))
                                : baseVal;

                              return (
                                <div key={index} className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-200/50 shadow-3xs">
                                  <span className="text-[10px] font-bold text-amber-800 bg-amber-100/60 px-2 py-1 rounded-lg">
                                    {index + 1}ª Parc.
                                  </span>
                                  <div className="flex-1">
                                    <input
                                      type="date"
                                      required
                                      value={boletoDueDates[index] || ''}
                                      onChange={(e) => {
                                        const newDates = [...boletoDueDates];
                                        newDates[index] = e.target.value;
                                        setBoletoDueDates(newDates);
                                        // Update single boletoDueDate for compatibility
                                        if (index === 0) {
                                          setBoletoDueDate(e.target.value);
                                        }
                                      }}
                                      className="w-full text-xs bg-transparent border-0 focus:outline-none text-slate-800 font-bold p-1 cursor-pointer"
                                    />
                                  </div>
                                  <span className="text-xs font-black text-slate-700 font-mono pr-2">
                                    R$ {instValue.toFixed(2)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <p className="text-[10px] text-amber-700 font-medium leading-normal pt-1.5 border-t border-amber-200/40">
                          Cada parcela do boleto deve conter uma data de vencimento obrigatória para o faturamento correto do pedido.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* SEÇÃO 4: Desenhos & Observações */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                  <span className="flex items-center justify-center w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 font-extrabold text-xs">4</span>
                  <h4 className="text-xs font-black uppercase text-slate-700 tracking-wider">Desenhos & Observações Comerciais</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Notes textarea */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-indigo-500" />
                      Observação do Cliente / Instruções
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Digite aqui as observações do cliente, restrições ou instruções de entrega (suporta quebras de linha)..."
                      rows={6}
                      className="w-full text-xs border border-slate-200 p-3 rounded-lg bg-slate-50/30 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 placeholder:text-slate-400 whitespace-pre-wrap"
                    />
                  </div>

                  {/* Project files upload area */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <FileImage className="w-3.5 h-3.5 text-indigo-500" />
                      Anexar Desenhos / PDFs do Projeto
                    </label>
                    
                    <div className="grid grid-cols-3 gap-2.5 h-[130px] overflow-y-auto border border-slate-200 bg-slate-50/20 p-2.5 rounded-lg">
                      {/* Upload Button */}
                      <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/10 rounded-lg cursor-pointer transition-all p-1 text-center h-20">
                        <UploadCloud className="w-5 h-5 text-slate-400 hover:text-indigo-600" />
                        <span className="text-[8px] font-bold text-slate-500 mt-1">Anexar</span>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          multiple 
                          onChange={handleFileUpload} 
                          className="hidden" 
                        />
                      </label>

                      {/* Existing files */}
                      {projectFiles.map((file, index) => {
                        const isImage = file.type.startsWith('image/');
                        return (
                          <div key={index} className="relative w-20 h-20 rounded-lg border border-slate-200 overflow-hidden group shadow-sm bg-white flex flex-col items-center justify-center p-1 shrink-0">
                            {isImage ? (
                              /* eslint-disable-next-line @next/next/no-img-element */
                              <img 
                                src={file.data} 
                                alt={file.name} 
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex flex-col items-center justify-center w-full h-full p-1 text-center">
                                <FileText className="w-6 h-6 text-rose-500 mb-1" />
                                <span className="text-[8px] text-slate-500 font-bold truncate w-full px-0.5" title={file.name}>
                                  {file.name}
                                </span>
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={() => handleRemoveProjectFile(index)}
                              className="absolute top-1 right-1 bg-rose-600 hover:bg-rose-700 text-white p-0.5 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Remover Arquivo"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                            <span className={`absolute bottom-0.5 left-0.5 text-[7px] text-white px-1 py-0.2 rounded font-mono font-bold ${
                              isImage ? 'bg-slate-900/75' : 'bg-rose-600'
                            }`}>
                              {isImage ? `#${index + 1}` : 'PDF'}
                            </span>
                          </div>
                        );
                      })}

                      {projectFiles.length === 0 && (
                        <div className="col-span-2 flex flex-col items-center justify-center text-slate-400 py-3 h-20">
                          <FileImage className="w-5 h-5 opacity-30 mb-0.5" />
                          <span className="text-[8px] font-medium">Sem anexos ainda</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Panel: Sticky Cart / Order Summary Sidebar (Col span 2) */}
            <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-6">
              <div className="bg-gradient-to-br from-indigo-50/70 to-slate-50/50 border border-indigo-100 rounded-2xl p-5 shadow-[0_4px_20px_rgba(79,70,229,0.05)] space-y-5">
                <div>
                  <h4 className="text-xs font-bold uppercase text-slate-400 tracking-widest">Resumo do {isBudget ? 'Orçamento' : 'Pedido'}</h4>
                  <div className="mt-2 flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full ${
                      isBudget ? 'bg-pink-100 text-pink-700 border border-pink-200' : 'bg-indigo-100 text-indigo-700 border border-indigo-200'
                    }`}>
                      {isBudget ? 'Orçamento / Cotação' : 'Pedido de Venda'}
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono font-bold">Rascunho Ativo</span>
                  </div>
                </div>

                {/* Cliente info summary */}
                <div className="border-t border-slate-200/60 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Informações de Envio</span>
                  <div className="bg-white/80 border border-slate-100 rounded-xl p-3 space-y-1.5 shadow-xs">
                    <p className="text-xs text-slate-500 flex justify-between gap-2">
                      <span>Cliente:</span>
                      <strong className="text-slate-800 font-semibold truncate max-w-[150px]">{newClient || 'Não selecionado'}</strong>
                    </p>
                    <p className="text-xs text-slate-500 flex justify-between gap-2">
                      <span>Previsão de entrega:</span>
                      <strong className="text-indigo-600 font-mono font-bold">{deliveryDate || 'Não informada'}</strong>
                    </p>
                  </div>
                </div>

                {/* Items list compact view */}
                <div className="border-t border-slate-200/60 pt-4 space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex justify-between items-center">
                    <span>Itens Selecionados ({selectedItems.length})</span>
                    <span className="font-mono text-slate-700">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}</span>
                  </span>
                  {selectedItems.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic bg-white/40 border border-dashed border-slate-200 rounded-xl p-4 text-center">Nenhum produto adicionado ainda.</p>
                  ) : (
                    <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100">
                      {selectedItems.map((item, index) => (
                        <div key={index} className="flex justify-between items-start pt-1.5 first:pt-0 gap-2">
                          <div className="text-xs">
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <p className="text-[10px] text-slate-400 font-medium font-mono">{item.sku} • {item.qty} {item.unit}</p>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 font-mono whitespace-nowrap">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(item.total)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Financial calculations */}
                <div className="border-t border-indigo-200/60 pt-4 space-y-2 bg-indigo-50/30 -mx-5 -mb-5 p-5 rounded-b-2xl">
                  <div className="space-y-1.5">
                    {discountPercent > 0 && (
                      <div className="text-xs text-slate-500 flex justify-between font-medium">
                        <span>Subtotal:</span>
                        <span className="font-mono">{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(grandTotal)}</span>
                      </div>
                    )}
                    {discountPercent > 0 && (
                      <div className="text-xs text-rose-600 flex justify-between font-bold">
                        <span>Desconto ({discountPercent}%):</span>
                        <span className="font-mono">-{new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-baseline pt-1">
                      <span className="text-xs font-bold text-slate-700 uppercase">Valor Líquido</span>
                      <span className="text-2xl font-black text-indigo-700 font-mono">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(finalTotal)}
                      </span>
                    </div>
                  </div>

                  {/* Payment check alert if it is a real order (not budget) */}
                  {!isBudget && selectedItems.length > 0 && (
                    <div className="pt-2">
                      {remainingToAllocate > 0.01 ? (
                        <div className="bg-rose-50 border border-rose-200 rounded-lg p-2.5 text-[11px] text-rose-700 space-y-1.5 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold">
                            <AlertCircle className="w-3.5 h-3.5" />
                            <span>Pagamento Incompleto</span>
                          </div>
                          <p className="font-medium">Falta alocar o valor de <strong className="font-mono">R$ {remainingToAllocate.toFixed(2)}</strong> nas formas de pagamento.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const otherTotal = (payment2Method ? payment2Amount : 0) + (payment3Method ? payment3Amount : 0);
                              setPayment1Amount(Math.max(0, finalTotal - otherTotal));
                            }}
                            className="w-full text-center bg-rose-600 hover:bg-rose-700 text-white font-bold py-1.5 rounded transition-colors shadow-xs text-[10px]"
                          >
                            Quitar Restante de R$ {remainingToAllocate.toFixed(2)}
                          </button>
                        </div>
                      ) : surplusPayment > 0.01 ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-700 space-y-1 shadow-2xs">
                          <div className="flex items-center gap-1.5 font-bold">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Excedente em Crédito</span>
                          </div>
                          <p className="font-medium">
                            Sobrará um saldo de <strong className="font-mono">R$ {surplusPayment.toFixed(2)}</strong> que será gerado como crédito para compras futuras do cliente.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5 text-[11px] text-emerald-800 flex items-center gap-1.5 font-bold shadow-2xs">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>✓ Pagamento Total Alocado!</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Buttons at bottom of summary card */}
                  <div className="flex flex-col gap-2 pt-3">
                    <button 
                      type="submit" 
                      className="w-full text-xs bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isBudget ? 'Confirmar Orçamento / Cotação' : 'Confirmar Lançamento do Pedido'}
                      <ChevronRight className="w-4 h-4" />
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setSelectedItems([]);
                        setIsAddOpen(false);
                      }}
                      className="w-full text-xs text-slate-500 hover:text-slate-800 bg-white/60 hover:bg-white border border-slate-200 py-2 rounded-xl font-bold transition-all text-center"
                    >
                      Cancelar e Sair
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* Sales Dashboard KPIs row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* KPI 1: Total */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Volume de Contratos</p>
            <p className="text-sm font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalFaturado)}
            </p>
          </div>
        </div>

        {/* KPI 2: Active */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Carteira Ativa</p>
            <p className="text-sm font-bold text-slate-800">{activeOrders} Pedidos</p>
          </div>
        </div>

        {/* KPI 3: Expedited */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Expedidos / Entregues</p>
            <p className="text-sm font-bold text-slate-800">{shippedToday} Clientes</p>
          </div>
        </div>

        {/* KPI 4: Returns */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-lg">
            <RotateCcw className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Devoluções / Pendências</p>
            <p className="text-sm font-bold text-slate-800">0 Registros</p>
          </div>
        </div>
      </div>

      {/* Main filter, search, and list card */}
      <div className="bg-white border border-slate-200/80 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] overflow-hidden">
        {/* Filter bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
              <input 
                type="text" 
                placeholder="Buscar por cliente, pedido, pagamento..." 
                value={search} 
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5" />
              <select 
                value={statusFilter} 
                onChange={(e) => { setStatusFilter(e.target.value as any); setCurrentPage(1); }}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Todos">Status: Todos</option>
                <option value="Pendente">Pendente</option>
                <option value="Faturado">Faturado</option>
                <option value="Enviado">Enviado</option>
                <option value="Entregue">Entregue</option>
                <option value="Cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Planilha Comercial Exportável</span>
          </div>
        </div>

        {/* Table view */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Cód. Pedido</th>
                <th className="px-5 py-3.5">Razão Social / Cliente</th>
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Forma de Pagamento</th>
                <th className="px-5 py-3.5">Data Lançamento</th>
                <th className="px-5 py-3.5">Previsão Entrega</th>
                <th className="px-5 py-3.5">Itens do Lote</th>
                <th className="px-5 py-3.5">Valor Bruto</th>
                <th className="px-5 py-3.5">Status Produção</th>
                <th className="px-5 py-3.5">Estado do Pedido</th>
                <th className="px-5 py-3.5 text-right">Ação Rápida</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-10 text-slate-400 font-medium">
                    Nenhum pedido de venda encontrado para as buscas indicadas.
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order) => {
                  const fallbackPaymentMethod = order.paymentMethod || 'Faturamento 30/60 dias';
                  const fallbackDeliveryDate = order.deliveryDate || '2026-07-03';
                  
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
                        <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold w-fit">
                            👤 {order.operator || 'Eduardo Fontes'}
                          </span>
                          {order.lastOperator && order.lastOperator !== order.operator && (
                            <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded text-[9px] font-semibold w-fit" title={`Última alteração por ${order.lastOperator}`}>
                              ✎ {order.lastOperator}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600 font-medium">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-700 border border-slate-200 text-[10px] font-bold rounded-md shadow-sm">
                          <CreditCard className="w-3 h-3 text-slate-400 shrink-0" />
                          <select
                            value={fallbackPaymentMethod}
                            onChange={(e) => onUpdatePaymentMethod(order.id, e.target.value)}
                            className="bg-transparent border-none text-[10px] font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
                          >
                            <option value="Boleto Bancário">Boleto Bancário</option>
                            <option value="PIX">PIX à vista</option>
                            <option value="Cartão de Crédito">Cartão de Crédito</option>
                            <option value="Depósito Identificado">Depósito Identificado</option>
                            <option value="Faturamento 30 Dias">Faturamento 30 Dias</option>
                            <option value="Faturamento 30/60 Dias">Faturamento 30/60 Dias</option>
                            <option value="Faturamento 30/60/90 Dias">Faturamento 30/60/90 Dias</option>
                          </select>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500">{order.date}</td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-indigo-600 font-mono font-bold">
                          <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                          {fallbackDeliveryDate}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-500 max-w-[200px]" title={order.items}>
                        <p className="line-clamp-2 leading-relaxed text-[11px] font-medium text-slate-600">
                          {order.items}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-bold font-mono text-slate-800">
                        <div className="flex flex-col">
                          <span className={order.discountPercentage ? "text-emerald-600" : "text-slate-800"}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.value)}
                          </span>
                          {order.discountPercentage ? (
                            <span className="text-[9px] font-bold text-rose-500 bg-rose-50 px-1 py-0.5 rounded w-max mt-0.5">
                              -{order.discountPercentage}% desc.
                            </span>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {(() => {
                          const linkedOPs = productionOrders.filter(op => op.salesOrderId === order.id);
                          if (linkedOPs.length === 0) {
                            return (
                              <div className="flex flex-col gap-1 items-start">
                                <span className="text-[10px] text-slate-400 font-medium bg-slate-50 border border-slate-200/50 rounded px-1.5 py-0.5 whitespace-nowrap">
                                  Sem OP
                                </span>
                                {onGenerateOPsFromOrder && (
                                  <button
                                    type="button"
                                    onClick={() => onGenerateOPsFromOrder(order)}
                                    className="text-[9px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline cursor-pointer"
                                  >
                                    + Enviar p/ Produção
                                  </button>
                                )}
                              </div>
                            );
                          }
                          const totalProgress = linkedOPs.reduce((acc, op) => acc + op.progress, 0) / linkedOPs.length;
                          const finished = linkedOPs.filter(op => op.status === 'CONCLUÍDO').length;
                          return (
                            <div className="flex flex-col gap-1 min-w-[100px]">
                              <div className="flex justify-between items-center text-[9px] text-slate-500 font-bold">
                                <span>{finished}/{linkedOPs.length} itens</span>
                                <span className="font-mono text-indigo-600">{Math.round(totalProgress)}%</span>
                              </div>
                              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div 
                                  className={`h-full rounded-full transition-all duration-300 ${
                                    totalProgress === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                                  }`} 
                                  style={{ width: `${totalProgress}%` }}
                                />
                              </div>
                            </div>
                          );
                        })()}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-semibold ${
                          order.status === 'Entregue' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                          order.status === 'Enviado' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                          order.status === 'Faturado' ? 'bg-indigo-50 text-indigo-700 border border-indigo-200' :
                          order.status === 'Cancelado' ? 'bg-slate-100 text-slate-600 border border-slate-200' :
                          order.status === 'Orçamento' ? 'bg-pink-50 text-pink-700 border border-pink-200' :
                          'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            order.status === 'Entregue' ? 'bg-emerald-500' :
                            order.status === 'Enviado' ? 'bg-blue-500' :
                            order.status === 'Faturado' ? 'bg-indigo-500' :
                            order.status === 'Cancelado' ? 'bg-slate-400' :
                            order.status === 'Orçamento' ? 'bg-pink-500' :
                            'bg-amber-500'
                          }`}></span>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <select 
                            value={order.status} 
                            onChange={(e) => onUpdateStatus(order.id, e.target.value as any)}
                            className="text-[11px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded px-2 py-1 font-medium text-slate-700 focus:outline-none cursor-pointer"
                          >
                            <option value="Orçamento">Orçamento</option>
                            <option value="Pendente">Pendente</option>
                            <option value="Faturado">Faturado</option>
                            <option value="Enviado">Enviado</option>
                            <option value="Entregue">Entregue</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => handlePrint(order)}
                            className="inline-flex items-center justify-center p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 hover:text-indigo-950 rounded border border-indigo-100 transition-all shadow-xs"
                            title="Imprimir Comprovante do Pedido"
                          >
                            <Printer className="w-3.5 h-3.5" />
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

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 bg-slate-50/50">
            <span>Mostrando {paginatedOrders.length} de {filteredOrders.length} pedidos</span>
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
                    currentPage === page ? 'bg-indigo-600 border-indigo-600 text-white font-medium' : 'border-slate-200 bg-white hover:bg-slate-50'
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

      {/* Analytics and forecast layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="bg-white border border-slate-200/80 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)]">
          <h4 className="text-sm font-semibold text-slate-800 mb-1">Previsão de Crescimento Comercial</h4>
          <p className="text-xs text-slate-400 mb-4">Mapeamento preditivo com base nos pedidos fechados do trimestre</p>
          
          <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-50 rounded-xl text-indigo-600 text-center">
              <TrendingUp className="w-8 h-8 mx-auto" />
              <p className="text-xl font-bold mt-1">98.4%</p>
              <p className="text-[9px] uppercase tracking-wider font-semibold text-indigo-400 mt-0.5">Atingimento de Meta</p>
            </div>
            <div className="space-y-2 flex-1">
              <div>
                <div className="flex justify-between text-xs font-semibold text-slate-700 mb-1">
                  <span>Previsão Julho</span>
                  <span>R$ 115.000</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-indigo-600 h-full rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400">Modelagem estatística calculada em tempo real com dados da carteira ativa.</p>
            </div>
          </div>
        </div>

        <div className="bg-indigo-900 text-indigo-100 p-5 rounded-xl shadow-[0_1px_3px_rgba(0,0,0,0.05)] relative overflow-hidden">
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-1/4 translate-y-1/4">
            <Calendar className="w-56 h-56" />
          </div>
          <h4 className="text-sm font-semibold text-white mb-1">Dica Integrada</h4>
          <p className="text-xs text-indigo-200 mb-4">Conexão Automática do Fluxo ERP</p>
          <p className="text-xs leading-relaxed text-indigo-100">
            Sempre que um pedido é criado aqui no comercial, ele atualiza as projeções do fluxo de caixa operacional e gera demanda no inventário de insumos industriais. Experimente adicionar novos clientes no painel acima!
          </p>
        </div>
      </div>

      {/* ÁREA DE IMPRESSÃO DO COMPROVANTE (HIDDEN POR PADRÃO, APENAS ATIVADO NO PRINT) */}
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
                <div className="bg-slate-900 text-white font-bold px-2 py-0.5 text-[10px] uppercase tracking-wider inline-block">
                  COMPROVANTE DE PEDIDO
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
                <p className="text-slate-500 mt-0.5">Previsão de Entrega: <span className="font-mono font-bold text-slate-700">{printOrder.deliveryDate || 'N/A'}</span></p>
              </div>
              <div className="text-right">
                <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Responsável & Operação</h3>
                <p className="text-slate-700">Operador Emissor: <span className="font-bold text-indigo-700">👤 {printOrder.operator || 'Eduardo Fontes'}</span></p>
                <p className="text-slate-500 mt-0.5">Forma de Pagamento: <span className="font-semibold text-slate-700">{printOrder.paymentMethod || 'Boleto Bancário'}</span></p>
                <p className="text-slate-500">Status do Pedido: <span className="font-bold text-slate-800">{printOrder.status}</span></p>
              </div>
            </div>

            {/* Tabela de Produtos */}
            <div className="my-5">
              <h3 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-2">Grade de Itens do Pedido</h3>
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

            {/* Totais do Pedido */}
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
                  <span className="text-slate-800">Valor Total Líquido:</span>
                  <span className="font-mono text-sm font-black text-slate-950">
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(printOrder.value)}
                  </span>
                </div>
              </div>
            </div>

            {/* Observacoes */}
            {printOrder.notes && (
              <div className="my-4 border border-slate-200 rounded p-3 bg-slate-50/50 text-[11px]">
                <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Observações / Instruções Especiais</h4>
                <p className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{printOrder.notes}</p>
              </div>
            )}

            {/* Linhas de Assinaturas */}
            <div className="grid grid-cols-2 gap-8 mt-14 pt-6 border-t border-dashed border-slate-300 text-center text-[9px] text-slate-500">
              <div>
                <div className="border-t border-slate-400 w-40 mx-auto mb-1"></div>
                <p className="font-bold text-slate-700 uppercase">Assinatura do Operador</p>
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
              Estilo Coifas ERP • Sistema de Auditoria Interna de Produção e Vendas • Documento impresso por {printOrder.operator || 'Eduardo Fontes'}
            </div>
          </div>
        </>
      )}

      {/* Modal - Cadastro Rápido de Novo Cliente */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl border border-slate-200 max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="bg-indigo-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-indigo-600 rounded-lg">
                  <UserPlus className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-sm tracking-wide">Cadastro Rápido de Cliente</h3>
                  <p className="text-[10px] text-slate-400 mt-0.5">Insira os dados do novo parceiro comercial para faturamento</p>
                </div>
              </div>
              <button 
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-indigo-850 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleInlineAddCustomer} className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Razão Social / Nome Fantasia *</label>
                <input 
                  type="text" 
                  value={custName} 
                  onChange={(e) => setCustName(e.target.value)} 
                  required 
                  placeholder="Ex: Siderúrgica Gerdau S.A."
                  className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CNPJ / CPF *</label>
                  <input 
                    type="text" 
                    value={custCnpj} 
                    onChange={(e) => setCustCnpj(e.target.value)} 
                    required 
                    placeholder="Ex: 12.345.678/0001-90"
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
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
                    value={industrialSegments.includes(custSegment) ? custSegment : (industrialSegments[0] || 'Metalurgia')} 
                    onChange={(e) => setCustSegment(e.target.value)} 
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700 cursor-pointer"
                  >
                    {industrialSegments.map((seg) => (
                      <option key={seg} value={seg}>{seg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">E-mail Comercial *</label>
                  <input 
                    type="email" 
                    value={custEmail} 
                    onChange={(e) => setCustEmail(e.target.value)} 
                    required 
                    placeholder="Ex: compras@cliente.com.br"
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Telefone / WhatsApp</label>
                  <input 
                    type="text" 
                    value={custPhone} 
                    onChange={(e) => setCustPhone(e.target.value)} 
                    placeholder="Ex: (11) 98888-7777"
                    className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Endereço de Faturamento</label>
                <input 
                  type="text" 
                  value={custAddress} 
                  onChange={(e) => setCustAddress(e.target.value)} 
                  placeholder="Ex: Av. das Indústrias, 1500 - Distrito Industrial"
                  className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
                />
              </div>

              {/* Modal Footer */}
              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  Salvar e Selecionar
                </button>
              </div>
            </form>
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
