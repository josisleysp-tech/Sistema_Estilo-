'use client';

import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Package, 
  TrendingUp, 
  DollarSign, 
  Tag, 
  Scale, 
  Percent,
  CheckCircle2,
  FileCode,
  X,
  AlertCircle,
  Sliders,
  Save
} from 'lucide-react';
import { InventoryItem } from '../lib/types';

interface ProductTabProps {
  inventory: InventoryItem[];
  onAddProduct: (product: Omit<InventoryItem, 'stock' | 'image'> & { stock?: number }) => void;
  onUpdateProduct: (sku: string, updatedFields: Partial<InventoryItem>) => void;
  onDeleteProduct: (sku: string) => void;
}

export default function ProductTab({
  inventory,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct
}: ProductTabProps) {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [activeFilter, setActiveFilter] = useState<'ativos' | 'inativos' | 'todos'>('ativos');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [unit, setUnit] = useState('UN');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salesPrice, setSalesPrice] = useState('');
  const [category, setCategory] = useState('Mecânica');
  const [maxStock, setMaxStock] = useState('100');
  const [selectedStages, setSelectedStages] = useState<string[]>(['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS']);
  const [initialStock, setInitialStock] = useState('0');
  const [active, setActive] = useState(true);

  // Categories state (with preset defaults and any extra from inventory)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    const defaults = [
      'Mecânica',
      'Eletrônica',
      'Automação',
      'Pneumática',
      'Hidráulica',
      'Matéria-Prima',
      'Massa Corrente',
      'Serviços'
    ];
    const inventoryCats = inventory.map(item => item.category).filter(Boolean);
    const combined = new Set([...defaults, ...inventoryCats]);
    return Array.from(combined);
  });

  // Category Manager States
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [categoryError, setCategoryError] = useState('');

  const handleAddCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed) return;
    if (customCategories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setCategoryError('Esta categoria já existe.');
      return;
    }
    setCustomCategories(prev => [...prev, trimmed]);
    setCategoryInput('');
    setCategoryError('');
    setCategory(trimmed); // Auto select the newly added category
  };

  const handleSaveEditCategory = () => {
    const trimmed = categoryInput.trim();
    if (!trimmed || !editingCategory) return;
    if (trimmed.toLowerCase() === editingCategory.toLowerCase()) {
      setEditingCategory(null);
      setCategoryInput('');
      setCategoryError('');
      return;
    }
    if (customCategories.filter(c => c !== editingCategory).map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setCategoryError('Esta categoria já existe.');
      return;
    }
    
    setCustomCategories(prev => prev.map(c => c === editingCategory ? trimmed : c));
    
    if (category === editingCategory) {
      setCategory(trimmed);
    }
    if (categoryFilter === editingCategory) {
      setCategoryFilter(trimmed);
    }

    // Update all items in inventory that have this old category
    inventory.forEach(item => {
      if (item.category === editingCategory) {
        onUpdateProduct(item.sku, { category: trimmed });
      }
    });

    setEditingCategory(null);
    setCategoryInput('');
    setCategoryError('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    if (customCategories.length <= 1) {
      setCategoryError('É necessário manter pelo menos uma categoria.');
      return;
    }
    
    if (!confirm(`Tem certeza de que deseja excluir a categoria "${catToDelete}"? Produtos associados a ela serão movidos para outra categoria.`)) {
      return;
    }

    const updatedCats = customCategories.filter(c => c !== catToDelete);
    setCustomCategories(updatedCats);

    const fallbackCat = updatedCats[0] || 'Geral';

    if (category === catToDelete) {
      setCategory(fallbackCat);
    }
    if (categoryFilter === catToDelete) {
      setCategoryFilter('Todos');
    }

    inventory.forEach(item => {
      if (item.category === catToDelete) {
        onUpdateProduct(item.sku, { category: fallbackCat });
      }
    });

    setCategoryError('');
  };

  // Categories list
  const categories = useMemo(() => {
    const list = new Set<string>();
    inventory.forEach(item => {
      if (item.category) list.add(item.category);
    });
    return ['Todos', ...Array.from(list)];
  }, [inventory]);

  // KPIs
  const totalProducts = inventory.length;
  
  const avgPurchasePrice = useMemo(() => {
    if (inventory.length === 0) return 0;
    return inventory.reduce((sum, item) => sum + (item.purchasePrice || 0), 0) / inventory.length;
  }, [inventory]);

  const avgSalesPrice = useMemo(() => {
    if (inventory.length === 0) return 0;
    return inventory.reduce((sum, item) => sum + (item.salesPrice || 0), 0) / inventory.length;
  }, [inventory]);

  const avgMargin = useMemo(() => {
    if (inventory.length === 0) return 0;
    let itemsWithPrices = 0;
    const totalPercentage = inventory.reduce((sum, item) => {
      const p = item.purchasePrice || 0;
      const s = item.salesPrice || 0;
      if (p > 0) {
        itemsWithPrices++;
        return sum + (((s - p) / p) * 100);
      }
      return sum;
    }, 0);
    return itemsWithPrices > 0 ? totalPercentage / itemsWithPrices : 0;
  }, [inventory]);

  // Filtering
  const filteredProducts = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
                            item.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory = categoryFilter === 'Todos' || item.category === categoryFilter;
      const matchesActive = activeFilter === 'todos' ||
                            (activeFilter === 'ativos' && item.active !== false) ||
                            (activeFilter === 'inativos' && item.active === false);
      return matchesSearch && matchesCategory && matchesActive;
    });
  }, [inventory, search, categoryFilter, activeFilter]);

  const handleEdit = (item: InventoryItem) => {
    setEditingSku(item.sku);
    setSku(item.sku);
    setName(item.name);
    setUnit(item.unit || 'UN');
    setPurchasePrice((item.purchasePrice || 0).toString());
    setSalesPrice((item.salesPrice || 0).toString());
    setCategory(item.category);
    setMaxStock((item.max || 100).toString());
    setSelectedStages(item.stages || ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS']);
    setActive(item.active !== false);
    setIsFormOpen(true);
  };

  const handleResetForm = () => {
    setEditingSku(null);
    setSku('');
    setName('');
    setUnit('UN');
    setPurchasePrice('');
    setSalesPrice('');
    setCategory('Mecânica');
    setMaxStock('100');
    setSelectedStages(['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS']);
    setInitialStock('0');
    setActive(true);
    setIsFormOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !purchasePrice || !salesPrice) return;

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(salesPrice) || 0;
    const limitStock = parseInt(maxStock) || 100;
    const startStock = parseInt(initialStock) || 0;

    if (editingSku) {
      // Update
      onUpdateProduct(editingSku, {
        name,
        unit,
        purchasePrice: pPrice,
        salesPrice: sPrice,
        price: sPrice, // Keep in sync with old field
        category,
        max: limitStock,
        stages: selectedStages,
        active
      });
    } else {
      // Generate unique SKU automatically
      let counter = inventory.length + 1;
      let candidate = `PRD-${String(counter).padStart(4, '0')}`;
      while (inventory.some(item => item.sku.toLowerCase() === candidate.toLowerCase())) {
        counter++;
        candidate = `PRD-${String(counter).padStart(4, '0')}`;
      }
      
      // Add
      onAddProduct({
        sku: candidate,
        name,
        unit,
        purchasePrice: pPrice,
        salesPrice: sPrice,
        price: sPrice,
        category,
        max: limitStock,
        stages: selectedStages,
        stock: startStock,
        active
      });
    }

    handleResetForm();
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 id="product-tab-heading" className="text-xl font-bold text-slate-800 tracking-tight">Cadastro Geral de Produtos & Insumos</h2>
          <p className="text-xs text-slate-500 mt-1">Configuração de catálogo, precificação, tipificação de materiais e controle de margem</p>
        </div>
        <button 
          onClick={() => {
            if (isFormOpen && editingSku) {
              handleResetForm();
            }
            setIsFormOpen(!isFormOpen);
          }}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2.5 rounded-lg font-medium shadow transition-colors self-start"
        >
          {isFormOpen ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {isFormOpen ? 'Fechar Formulário' : 'Novo Produto / Insumo'}
        </button>
      </div>

      {/* Product Registry Form drawer */}
      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-white border border-indigo-100 rounded-xl p-5 shadow-[0_4px_12px_rgba(79,70,229,0.05)] space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
            <Package className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase text-indigo-600 tracking-wider">
              {editingSku ? `Editar Produto (${editingSku})` : 'Ficha de Cadastro de Produto'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nome do Produto *</label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
                placeholder="Ex: Eixo Trator Dianteiro 50mm"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Unidade de Medida *</label>
              <select 
                value={unit} 
                onChange={(e) => setUnit(e.target.value)} 
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                <option value="UN">UN (Unidade)</option>
                <option value="KG">KG (Quilograma)</option>
                <option value="T">T (Tonelada)</option>
                <option value="M">M (Metro)</option>
                <option value="M2">M² (Metro Quadrado)</option>
                <option value="L">L (Litro)</option>
                <option value="PCT">PCT (Pacote)</option>
                <option value="CX">CX (Caixa)</option>
              </select>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">Tipificação / Categoria *</label>
                <button
                  type="button"
                  onClick={() => {
                    setIsCategoryManagerOpen(true);
                    setCategoryError('');
                  }}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <Sliders className="w-3 h-3" /> Gerenciar
                </button>
              </div>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
              >
                {customCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor de Compra (R$) *</label>
              <input 
                type="number" 
                step="0.01"
                value={purchasePrice} 
                onChange={(e) => setPurchasePrice(e.target.value)} 
                required 
                placeholder="Ex: 150.00"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Valor de Venda (R$) *</label>
              <input 
                type="number" 
                step="0.01"
                value={salesPrice} 
                onChange={(e) => setSalesPrice(e.target.value)} 
                required 
                placeholder="Ex: 380.00"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono font-semibold"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estoque Recomendado (Máximo / Meta)</label>
              <input 
                type="number" 
                value={maxStock} 
                onChange={(e) => setMaxStock(e.target.value)} 
                placeholder="Ex: 100"
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status de Ativação</label>
              <select 
                value={active ? "Ativo" : "Inativo"} 
                onChange={(e) => setActive(e.target.value === "Ativo")} 
                className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium text-slate-700"
              >
                <option value="Ativo">🟢 Ativo (Em uso)</option>
                <option value="Inativo">🔴 Inativo (Em desuso)</option>
              </select>
            </div>
            {!editingSku && (
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Estoque Inicial</label>
                <input 
                  type="number" 
                  value={initialStock} 
                  onChange={(e) => setInitialStock(e.target.value)} 
                  placeholder="Ex: 0"
                  className="w-full text-xs border border-slate-200 px-3 py-2.5 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-mono"
                />
              </div>
            )}
            <div className="md:col-span-3 border-t border-slate-100 pt-3">
              <label className="block text-[10px] font-bold text-indigo-650 uppercase mb-2">
                Etapas do Processo de Produção (Selecione as etapas pelas quais este produto passará ou defina como INSUMO se não passar por produção)
              </label>
              <div className="flex flex-wrap gap-2.5">
                {['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS', 'INSUMO'].map(stg => {
                  const isChecked = selectedStages.includes(stg);
                  return (
                    <label 
                      key={stg} 
                      className={`flex items-center gap-2 px-3 py-2 border rounded-lg cursor-pointer transition-all text-xs font-semibold select-none ${
                        isChecked 
                          ? stg === 'INSUMO'
                            ? 'bg-emerald-50 border-emerald-200 text-emerald-750 font-bold shadow-sm'
                            : stg === 'CAD'
                              ? 'bg-cyan-50/70 border-cyan-200 text-cyan-750 font-bold shadow-sm'
                              : 'bg-indigo-50/70 border-indigo-200 text-indigo-750 font-bold shadow-sm' 
                          : 'bg-slate-50 border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                      }`}
                    >
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {
                          setSelectedStages(prev => {
                            if (stg === 'INSUMO') {
                              return prev.includes('INSUMO') 
                                ? ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS'] 
                                : ['INSUMO'];
                            }
                            const filtered = prev.filter(x => x !== 'INSUMO');
                            if (filtered.includes(stg)) {
                              if (filtered.length === 1) return filtered;
                              return filtered.filter(x => x !== stg);
                            } else {
                              const order = ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS'];
                              const next = [...filtered, stg];
                              return order.filter(x => next.includes(x));
                            }
                          });
                        }}
                        className={`rounded border-slate-300 ${stg === 'INSUMO' ? 'text-emerald-600 focus:ring-emerald-500' : 'text-indigo-600 focus:ring-indigo-500'} w-3.5 h-3.5 cursor-pointer`}
                      />
                      <span>{stg}</span>
                    </label>
                  );
                })}
              </div>
              <p className="text-[9px] text-slate-400 mt-1.5 font-medium">
                * Produtos marcados como <strong className="text-emerald-600 font-semibold">INSUMO</strong> são considerados estoque imediato, não passam pela produção e dão baixa no estoque automaticamente no momento da venda.
              </p>
            </div>
            <div className="md:col-span-3 flex items-end justify-end gap-2 pt-2">
              <button 
                type="button" 
                onClick={handleResetForm}
                className="text-xs text-slate-500 hover:text-slate-800 px-3 py-2 rounded-lg"
              >
                Limpar / Cancelar
              </button>
              <button 
                type="submit" 
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold shadow-sm transition-colors"
              >
                {editingSku ? 'Atualizar Produto' : 'Cadastrar Produto'}
              </button>
            </div>
          </div>
        </form>
      )}

      {/* KPI Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Total Products */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Package className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Produtos Cadastrados</p>
            <p className="text-lg font-bold text-slate-800">{totalProducts} Itens</p>
          </div>
        </div>

        {/* Avg purchase price */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-slate-100 text-slate-600 rounded-lg">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Custo Médio de Compra</p>
            <p className="text-lg font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgPurchasePrice)}
            </p>
          </div>
        </div>

        {/* Avg sale price */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Preço Médio de Venda</p>
            <p className="text-lg font-bold text-slate-800">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(avgSalesPrice)}
            </p>
          </div>
        </div>

        {/* Avg margin markup */}
        <div className="bg-white border border-slate-200/80 p-4 rounded-xl shadow-[0_1px_2px_rgba(0,0,0,0.05)] flex items-center gap-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">Markup Médio</p>
            <p className="text-lg font-bold text-amber-700">
              +{avgMargin.toFixed(1)}%
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
                placeholder="Buscar por nome, SKU..." 
                value={search} 
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <Filter className="w-3.5 h-3.5" />
              <select 
                value={categoryFilter} 
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="Todos">Todas Categorias</option>
                {customCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${activeFilter === 'ativos' ? 'bg-emerald-500' : activeFilter === 'inativos' ? 'bg-rose-500' : 'bg-slate-400'}`}></span>
              <select 
                value={activeFilter} 
                onChange={(e) => setActiveFilter(e.target.value as any)}
                className="bg-transparent text-slate-700 focus:outline-none cursor-pointer font-medium"
              >
                <option value="ativos">🟢 Apenas Ativos</option>
                <option value="inativos">🔴 Apenas Inativos</option>
                <option value="todos">🔄 Mostrar Todos</option>
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-400 font-medium">
            Mostrando <span className="text-slate-700 font-bold">{filteredProducts.length}</span> produtos
          </div>
        </div>

        {/* Table List view */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200/85 bg-slate-50/50 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <th className="px-5 py-3.5">Código SKU</th>
                <th className="px-5 py-3.5">Nome do Produto</th>
                <th className="px-5 py-3.5">Operador</th>
                <th className="px-5 py-3.5">Unidade</th>
                <th className="px-5 py-3.5">Valor de Compra</th>
                <th className="px-5 py-3.5">Valor de Venda</th>
                <th className="px-5 py-3.5">Markup (%)</th>
                <th className="px-5 py-3.5">Tipificação</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Etapas</th>
                <th className="px-5 py-3.5 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-12 text-slate-400 font-medium">
                    Nenhum produto cadastrado com os filtros aplicados.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((item) => {
                  const pPrice = item.purchasePrice || 0;
                  const sPrice = item.salesPrice || 0;
                  const markup = pPrice > 0 ? ((sPrice - pPrice) / pPrice) * 100 : 0;
                  return (
                    <tr key={item.sku} className={`transition-colors ${item.active === false ? 'bg-slate-50/40 opacity-70 hover:bg-slate-100/50' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-5 py-4 font-mono font-bold text-slate-600">{item.sku}</td>
                      <td className="px-5 py-4 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          {item.name}
                          {item.active === false && (
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                              Em desuso
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-mono text-slate-500">
                        <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold">
                          👤 {item.operator || 'Eduardo Fontes'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 text-[10px] font-bold rounded-md font-mono">
                          {item.unit || 'UN'}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono font-semibold text-slate-700">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(pPrice)}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(sPrice)}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center text-[10px] font-bold ${
                          markup >= 40 ? 'text-emerald-600' : markup >= 20 ? 'text-indigo-600' : 'text-amber-600'
                        }`}>
                          +{markup.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium rounded-md">
                          <Tag className="w-3 h-3 text-slate-400" />
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 border rounded-md text-[10px] font-bold ${
                          item.active !== false 
                            ? 'bg-emerald-50 border-emerald-100 text-emerald-700' 
                            : 'bg-rose-50 border-rose-100 text-rose-700'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${item.active !== false ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                          {item.active !== false ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1 max-w-[180px]">
                          {(item.stages && item.stages.length > 0 ? item.stages : ['CAD', 'LASER', 'CORTE DOBRA', 'PINTURA', 'ELÉTRICA FILTROS']).map(stg => (
                            <span 
                              key={stg} 
                              className={`px-1.5 py-0.5 rounded text-[8px] font-bold whitespace-nowrap ${
                                stg === 'CAD' ? 'bg-cyan-50 text-cyan-700 border border-cyan-100' :
                                stg === 'LASER' ? 'bg-indigo-50 text-indigo-700 border border-indigo-100' :
                                stg === 'CORTE DOBRA' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                                stg === 'PINTURA' ? 'bg-purple-50 text-purple-700 border border-purple-100' :
                                'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}
                            >
                              {stg}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              onUpdateProduct(item.sku, { active: item.active === false });
                            }}
                            className={`p-1.5 rounded transition-colors ${
                              item.active !== false 
                                ? 'hover:bg-amber-50 text-slate-500 hover:text-amber-600' 
                                : 'hover:bg-emerald-50 text-slate-500 hover:text-emerald-600'
                            }`}
                            title={item.active !== false ? "Inativar Produto (itens em desuso)" : "Ativar Produto"}
                          >
                            {item.active !== false ? (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            )}
                          </button>
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded transition-colors"
                            title="Editar Dados"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remover o produto ${item.name} do catálogo?`)) {
                                onDeleteProduct(item.sku);
                              }
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="Excluir Produto"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
      </div>

      {/* Category Manager Modal */}
      {isCategoryManagerOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-800">Gerenciador de Categorias</h3>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCategory(null);
                  setCategoryInput('');
                  setCategoryError('');
                }}
                className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-600 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Form to add or edit */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  {editingCategory ? 'Alterar Nome da Categoria' : 'Nova Categoria'}
                </label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={categoryInput} 
                    onChange={(e) => setCategoryInput(e.target.value)} 
                    placeholder={editingCategory ? "Novo nome da categoria" : "Ex: Ferragens, Elétrica"}
                    className="flex-1 text-xs border border-slate-200 px-3 py-2 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        editingCategory ? handleSaveEditCategory() : handleAddCategory();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={editingCategory ? handleSaveEditCategory : handleAddCategory}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded-lg font-semibold shadow-sm transition-colors flex items-center gap-1.5"
                  >
                    {editingCategory ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                    {editingCategory ? 'Salvar' : 'Adicionar'}
                  </button>
                </div>
                {categoryError && (
                  <p className="text-[10px] text-rose-500 font-semibold">{categoryError}</p>
                )}
                {editingCategory && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCategory(null);
                      setCategoryInput('');
                      setCategoryError('');
                    }}
                    className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              {/* Existing categories list */}
              <div className="space-y-2 pt-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Categorias Cadastradas ({customCategories.length})</h4>
                <div className="divide-y divide-slate-100 border border-slate-100 rounded-lg overflow-hidden max-h-60 overflow-y-auto">
                  {customCategories.map((cat) => (
                    <div key={cat} className="flex items-center justify-between p-2.5 hover:bg-slate-50/50 bg-white transition-colors group">
                      <span className="text-xs text-slate-700 font-medium">{cat}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCategory(cat);
                            setCategoryInput(cat);
                            setCategoryError('');
                          }}
                          className="p-1 hover:bg-indigo-50 text-slate-400 hover:text-indigo-600 rounded transition-colors"
                          title="Editar nome"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(cat)}
                          className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors"
                          title="Excluir categoria"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                type="button"
                onClick={() => {
                  setIsCategoryManagerOpen(false);
                  setEditingCategory(null);
                  setCategoryInput('');
                  setCategoryError('');
                }}
                className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
