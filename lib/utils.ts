import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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

