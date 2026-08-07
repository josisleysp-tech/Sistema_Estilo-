import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Sanitiza recursivamente objetos e arrays removendo strings extensas (como imagens/anexos em base64)
 * mantendo a estrutura de dados enxuta para salvamento em cache no localStorage.
 */
function deepSanitizeForLocalStorage(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    if (obj.startsWith('data:') || obj.length > 1000) {
      return '[Anexo/Imagem omitida do cache local]';
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => deepSanitizeForLocalStorage(item));
  }

  if (typeof obj === 'object') {
    const cleaned: Record<string, any> = {};
    for (const [k, v] of Object.entries(obj)) {
      const lowerK = k.toLowerCase();
      if (
        typeof v === 'string' &&
        (v.startsWith('data:') ||
         v.length > 1000 ||
         lowerK.includes('base64') ||
         lowerK.includes('attachment') ||
         lowerK.includes('drawing') ||
         lowerK.includes('file'))
      ) {
        cleaned[k] = '[Anexo/Imagem omitida do cache local]';
      } else {
        cleaned[k] = deepSanitizeForLocalStorage(v);
      }
    }
    return cleaned;
  }

  return obj;
}

/**
 * Executa limpeza e otimização específica para sales_orders e cache no localStorage:
 * 1. Remove chaves obsoletas/duplicadas (ex: 'sales_orders', 'erpf_sales_orders_backup', 'erpf_temp_*')
 * 2. Limpa anexos pesados e base64 contidos nas ordens de venda armazenadas em localStorage
 * 3. Trunca históricos extensos de pedidos antigos ou cancelados no cache local
 */
export function cleanupObsoleteSalesOrders(): { clearedKeys: number; cleanedOrders: number; freedKB: number } {
  if (typeof window === 'undefined') {
    return { clearedKeys: 0, cleanedOrders: 0, freedKB: 0 };
  }

  let clearedKeys = 0;
  let cleanedOrders = 0;
  let initialSizeKB = 0;
  let finalSizeKB = 0;

  try {
    // Medir tamanho inicial aproximado
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        initialSizeKB += ((localStorage.getItem(k) || '').length * 2) / 1024;
      }
    }

    // 1. Remover chaves duplicadas/obsoletas de pedidos de vendas e backups
    const obsoleteSalesKeys = [
      'sales_orders',
      'erpf_sales_orders_backup',
      'erpf_temp_sales',
      'erpf_sales_orders_old',
      'erpf_sales_cache',
      'erpf_log',
      'system_parameters_backup'
    ];

    obsoleteSalesKeys.forEach((key) => {
      if (localStorage.getItem(key) !== null) {
        localStorage.removeItem(key);
        clearedKeys++;
      }
    });

    // Remover qualquer outra chave temporária (começando com erpf_temp_ ou contendo _backup)
    const tempKeysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('erpf_temp_') || k.includes('_backup') || k.includes('_old'))) {
        tempKeysToRemove.push(k);
      }
    }
    tempKeysToRemove.forEach((k) => {
      localStorage.removeItem(k);
      clearedKeys++;
    });

    // 2. Processar a chave principal 'erpf_sales_orders'
    const rawSales = localStorage.getItem('erpf_sales_orders');
    if (rawSales) {
      try {
        const salesList = JSON.parse(rawSales);
        if (Array.isArray(salesList)) {
          // Otimizar lista de ordens removendo anexos pesados/base64 de projectImages e projectFiles
          const optimizedSales = salesList.map((order: any) => {
            if (!order || typeof order !== 'object') return order;
            cleanedOrders++;

            const copy = { ...order };

            // Otimiza projectImages se existirem (base64 ou strings longas)
            if (Array.isArray(copy.projectImages)) {
              copy.projectImages = copy.projectImages.map((img: string) =>
                typeof img === 'string' && (img.startsWith('data:') || img.length > 500)
                  ? '[Imagem omitida do cache local]'
                  : img
              );
            }

            // Otimiza projectFiles se existirem
            if (Array.isArray(copy.projectFiles)) {
              copy.projectFiles = copy.projectFiles.map((file: any) => {
                if (file && typeof file === 'object') {
                  return {
                    ...file,
                    data: typeof file.data === 'string' && (file.data.startsWith('data:') || file.data.length > 500)
                      ? '[Anexo omitido do cache local]'
                      : file.data
                  };
                }
                return file;
              });
            }

            // Se a ordem estiver cancelada ou for muito antiga com histórico extenso, simplifica o histórico
            if ((copy.status === 'Cancelado' || copy.status === 'Entregue') && Array.isArray(copy.history) && copy.history.length > 5) {
              copy.history = copy.history.slice(-5);
            }

            return copy;
          });

          localStorage.setItem('erpf_sales_orders', JSON.stringify(optimizedSales));
        }
      } catch (e) {
        console.warn('Erro ao otimizar erpf_sales_orders em localStorage:', e);
      }
    }

    // Recalcular tamanho final
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k) {
        finalSizeKB += ((localStorage.getItem(k) || '').length * 2) / 1024;
      }
    }
  } catch (err) {
    console.warn('Erro na limpeza de sales_orders em localStorage:', err);
  }

  const freedKB = Math.max(0, Math.round(initialSizeKB - finalSizeKB));
  return { clearedKeys, cleanedOrders, freedKB };
}

/**
 * Armazena dados de forma segura no localStorage prevenindo erros de cota (QuotaExceededError).
 * Caso a memória do navegador fique cheia, executa limpeza automática de ordens antigas e sanitiza conteúdos pesados.
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;

  // Se for a chave de pedidos de venda e o valor for grande (>150KB), sanitiza previamente antes de tentar salvar
  let dataToSave = value;
  if (key === 'erpf_sales_orders' && value.length > 150000) {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        dataToSave = JSON.stringify(deepSanitizeForLocalStorage(parsed));
      }
    } catch (e) {
      // ignora se parse falhar
    }
  }

  // 1. Tenta salvar
  try {
    localStorage.setItem(key, dataToSave);
    return true;
  } catch (firstErr) {
    // 2. Executa rotina de limpeza para remover chaves de vendas antigas/obsoletas e temporárias
    cleanupObsoleteSalesOrders();

    // 3. Tenta salvar o valor sanitizado
    let parsedData: any = null;
    try {
      parsedData = JSON.parse(value);
    } catch (e) {
      parsedData = null;
    }

    if (parsedData) {
      try {
        const sanitizedData = deepSanitizeForLocalStorage(parsedData);
        const sanitizedStr = JSON.stringify(sanitizedData);
        localStorage.setItem(key, sanitizedStr);
        return true;
      } catch (sanitizedErr) {
        // Se ainda exceder cota, reduz a lista para as ordens/itens mais recentes
        if (Array.isArray(parsedData) && parsedData.length > 15) {
          try {
            const recentItems = parsedData.slice(-15);
            const sanitizedRecent = deepSanitizeForLocalStorage(recentItems);
            localStorage.setItem(key, JSON.stringify(sanitizedRecent));
            return true;
          } catch (recentErr) {
            // Ignora
          }
        }
      }
    }

    return false;
  }
}

export function getDeliveryAlertStatus(deliveryDateStr?: string, status?: string, customAlertRiskDays?: number) {
  if (!deliveryDateStr || status === 'Entregue' || status === 'Cancelado') {
    return {
      daysRemaining: null,
      isWarningActive: false,
      alertLabel: '',
      alertColorClass: '',
      alertBgClass: '',
      statusLabel: ''
    };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Split and construct date to avoid timezone issues
  const [year, month, day] = deliveryDateStr.split('-').map(Number);
  const deliveryDate = new Date(year, month - 1, day);
  deliveryDate.setHours(0, 0, 0, 0);

  const diffTime = deliveryDate.getTime() - today.getTime();
  const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

  // Determine active warning limit days
  let alertDays = customAlertRiskDays !== undefined ? customAlertRiskDays : 3;
  if (customAlertRiskDays === undefined && typeof window !== 'undefined') {
    const saved = localStorage.getItem('system_parameters');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.alertRiskDays !== undefined) {
          alertDays = Number(parsed.alertRiskDays);
        }
      } catch (e) {
        // ignore
      }
    }
  }

  const isWarningActive = diffDays <= alertDays;
  let alertLabel = '';
  let alertColorClass = '';
  let alertBgClass = '';
  let statusLabel = '';

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    alertLabel = `Atrasado há ${absDays} ${absDays === 1 ? 'dia' : 'dias'}`;
    alertColorClass = 'text-rose-600 border-rose-200 bg-rose-50';
    alertBgClass = 'bg-rose-500';
    statusLabel = 'Atrasado';
  } else if (diffDays === 0) {
    alertLabel = 'Vence hoje!';
    alertColorClass = 'text-rose-700 border-rose-200 bg-rose-50 font-bold';
    alertBgClass = 'bg-rose-500 animate-pulse';
    statusLabel = 'Vence Hoje';
  } else if (diffDays <= alertDays) {
    alertLabel = `Vence em ${diffDays} ${diffDays === 1 ? 'dia' : 'dias'}`;
    alertColorClass = 'text-amber-600 border-amber-200 bg-amber-50';
    alertBgClass = 'bg-amber-500';
    statusLabel = 'A vencer';
  } else {
    alertLabel = `${diffDays} dias restantes`;
    alertColorClass = 'text-slate-500 border-slate-100 bg-slate-50/50';
    alertBgClass = 'bg-slate-400';
    statusLabel = 'No prazo';
  }

  return {
    daysRemaining: diffDays,
    isWarningActive,
    alertLabel,
    alertColorClass,
    alertBgClass,
    statusLabel
  };
}

