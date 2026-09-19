import React, { useState } from 'react';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  ChevronRight, 
  ChevronLeft, 
  X, 
  Bell, 
  RefreshCw, 
  ArrowRight 
} from 'lucide-react';
import { AlertMessage } from '../types';

interface AlertBannerProps {
  alerts: AlertMessage[];
  onOpenAlertsCenter: () => void;
  onDismiss: (id: string) => void;
  onRequestRefillTab?: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onOpenAlertsCenter,
  onDismiss,
  onRequestRefillTab,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Filter for unread or high-priority alerts
  const priorityAlerts = alerts.filter(a => a.severity === 'urgent' || a.severity === 'warning' || a.is_read === 0);

  if (priorityAlerts.length === 0) return null;

  const currentAlert = priorityAlerts[Math.min(currentIndex, priorityAlerts.length - 1)];

  const isUrgent = currentAlert.severity === 'urgent';
  const isWarning = currentAlert.severity === 'warning';

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % priorityAlerts.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + priorityAlerts.length) % priorityAlerts.length);
  };

  return (
    <div 
      id="system-alert-banner"
      className={`border-b transition-colors relative ${
        isUrgent 
          ? 'bg-rose-950/70 border-rose-800/80 text-rose-100' 
          : isWarning
          ? 'bg-amber-950/60 border-amber-800/70 text-amber-100'
          : 'bg-teal-950/50 border-teal-800/50 text-teal-100'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${
            isUrgent ? 'bg-rose-500/20 text-rose-400' : isWarning ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'
          }`}>
            {isUrgent ? (
              <AlertCircle className="w-4 h-4 animate-pulse" />
            ) : isWarning ? (
              <AlertTriangle className="w-4 h-4" />
            ) : (
              <Info className="w-4 h-4" />
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 flex-1 min-w-0">
            <span className="font-semibold text-xs uppercase tracking-wider px-2 py-0.5 rounded bg-black/30 w-fit">
              {currentAlert.type.replace('_', ' ')}
            </span>
            <span className="font-medium text-slate-100 text-xs sm:text-sm truncate">
              {currentAlert.title}:
            </span>
            <span className="text-xs sm:text-sm opacity-90 truncate max-w-xl">
              {currentAlert.message}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-shrink-0">
          {priorityAlerts.length > 1 && (
            <div className="flex items-center gap-1 text-xs opacity-70 mr-1">
              <span>{currentIndex + 1}/{priorityAlerts.length}</span>
              <button 
                onClick={handlePrev}
                id="alert-prev-btn"
                className="p-0.5 rounded hover:bg-white/10"
                title="Previous alert"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={handleNext}
                id="alert-next-btn"
                className="p-0.5 rounded hover:bg-white/10"
                title="Next alert"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {onRequestRefillTab && (currentAlert.type === 'low_stock' || currentAlert.type === 'refill_due') && (
            <button
              onClick={onRequestRefillTab}
              id="alert-refill-action-btn"
              className="text-xs font-medium px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Manage Refill
            </button>
          )}

          <button
            onClick={onOpenAlertsCenter}
            id="view-all-alerts-btn"
            className="text-xs underline font-medium hover:text-white flex items-center gap-1 px-1.5 py-1"
          >
            All Alerts ({priorityAlerts.length})
            <ArrowRight className="w-3 h-3" />
          </button>

          <button
            onClick={() => onDismiss(currentAlert.id)}
            id="dismiss-alert-banner-btn"
            className="p-1 rounded hover:bg-white/10 opacity-70 hover:opacity-100 transition-opacity ml-1"
            title="Dismiss this alert banner"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
