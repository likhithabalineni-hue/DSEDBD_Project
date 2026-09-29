import React, { useState } from 'react';
import { 
  Bell, 
  X, 
  CheckCheck, 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  Trash2, 
  Clock, 
  RefreshCw, 
  Plus, 
  Check, 
  ExternalLink 
} from 'lucide-react';
import { AlertMessage, AlertType, AlertSeverity } from '../types';

interface AlertsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  alerts: AlertMessage[];
  unreadCount: number;
  userId: string;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteAlert: (id: string) => void;
  onSelectRefill?: (refillId?: string | null) => void;
  onRefreshAlerts: () => void;
}

export const AlertsDrawer: React.FC<AlertsDrawerProps> = ({
  isOpen,
  onClose,
  alerts,
  unreadCount,
  userId,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteAlert,
  onSelectRefill,
  onRefreshAlerts,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'refills' | 'doses'>('all');
  const [showCreateCustom, setShowCreateCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState('');
  const [customMsg, setCustomMsg] = useState('');
  const [customSeverity, setCustomSeverity] = useState<AlertSeverity>('warning');
  const [customType, setCustomType] = useState<AlertType>('refill_due');

  if (!isOpen) return null;

  const filteredAlerts = alerts.filter((alert) => {
    if (filter === 'unread') return alert.is_read === 0;
    if (filter === 'refills') return alert.type.includes('refill') || alert.type === 'low_stock';
    if (filter === 'doses') return alert.type === 'missed_dose' || alert.type === 'upcoming_dose';
    return true;
  });

  const handleCreateTestAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customTitle || !customMsg) return;

    try {
      await fetch('/api/alerts/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          type: customType,
          severity: customSeverity,
          title: customTitle,
          message: customMsg,
        }),
      });
      setCustomTitle('');
      setCustomMsg('');
      setShowCreateCustom(false);
      onRefreshAlerts();
    } catch (err) {
      console.error('Failed to create alert:', err);
    }
  };

  const formatTimeAgo = (isoDate: string) => {
    try {
      const diffMs = Date.now() - new Date(isoDate).getTime();
      const mins = Math.floor(diffMs / (1000 * 60));
      if (mins < 1) return 'Just now';
      if (mins < 60) return `${mins}m ago`;
      const hours = Math.floor(mins / 60);
      if (hours < 24) return `${hours}h ago`;
      const days = Math.floor(hours / 24);
      return `${days}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        id="alerts-drawer-panel"
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 text-slate-100 flex flex-col h-full shadow-2xl"
      >
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center relative">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                Alerts & Notifications
                <span className="text-xs font-mono font-normal text-slate-400">({alerts.length})</span>
              </h2>
              <p className="text-xs text-slate-400">Refill schedules, low supply & dose alerts</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreateCustom(!showCreateCustom)}
              id="new-alert-toggle-btn"
              className="p-1.5 rounded-lg text-slate-400 hover:text-teal-400 hover:bg-slate-800 transition-colors"
              title="Test custom alert"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              id="close-alerts-drawer-btn"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Custom Alert Test Form */}
        {showCreateCustom && (
          <form onSubmit={handleCreateTestAlert} className="p-4 bg-slate-800/80 border-b border-slate-700 text-xs flex flex-col gap-2.5">
            <div className="font-semibold text-teal-400 flex items-center justify-between">
              <span>Create Alert Message</span>
              <button 
                type="button" 
                onClick={() => setShowCreateCustom(false)} 
                className="text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>
            <input 
              type="text" 
              placeholder="Alert Title (e.g. Low Stock Alert)"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
              required
            />
            <textarea 
              placeholder="Alert message details..."
              value={customMsg}
              onChange={(e) => setCustomMsg(e.target.value)}
              rows={2}
              className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-200 focus:outline-none focus:border-teal-500"
              required
            />
            <div className="flex gap-2">
              <select 
                value={customSeverity}
                onChange={(e) => setCustomSeverity(e.target.value as AlertSeverity)}
                className="flex-1 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
              >
                <option value="urgent">Urgent (Red)</option>
                <option value="warning">Warning (Amber)</option>
                <option value="info">Info (Teal)</option>
              </select>
              <select 
                value={customType}
                onChange={(e) => setCustomType(e.target.value as AlertType)}
                className="flex-1 px-2 py-1.5 rounded bg-slate-900 border border-slate-700 text-slate-300"
              >
                <option value="refill_due">Refill Due</option>
                <option value="low_stock">Low Stock</option>
                <option value="missed_dose">Missed Dose</option>
                <option value="upcoming_dose">Upcoming Dose</option>
                <option value="refill_approved">Refill Approved</option>
              </select>
            </div>
            <button 
              type="submit"
              id="submit-custom-alert-btn"
              className="px-3 py-1.5 rounded bg-teal-600 hover:bg-teal-500 text-white font-medium"
            >
              Dispatch Alert
            </button>
          </form>
        )}

        {/* Action Controls & Filters */}
        <div className="px-4 py-2.5 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
          <div className="flex gap-1">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'all' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'unread' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
            <button
              onClick={() => setFilter('refills')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'refills' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Refills
            </button>
            <button
              onClick={() => setFilter('doses')}
              className={`px-2.5 py-1 rounded-md transition-colors ${filter === 'doses' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'}`}
            >
              Doses
            </button>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={onMarkAllAsRead}
              id="mark-all-read-btn"
              className="text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>

        {/* Alert List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filteredAlerts.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-center text-slate-500">
              <Check className="w-8 h-8 text-teal-500/40 mb-2" />
              <p className="text-sm font-medium text-slate-400">All caught up!</p>
              <p className="text-xs text-slate-500 mt-1">No alerts match the selected filter.</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => {
              const isUrgent = alert.severity === 'urgent';
              const isWarning = alert.severity === 'warning';
              const isRefillAlert = alert.type.includes('refill') || alert.type === 'low_stock';

              return (
                <div
                  key={alert.id}
                  id={`alert-card-${alert.id}`}
                  className={`p-3.5 rounded-xl border transition-all relative ${
                    alert.is_read === 0
                      ? isUrgent
                        ? 'bg-rose-950/40 border-rose-800/80 shadow-sm'
                        : isWarning
                        ? 'bg-amber-950/30 border-amber-800/60 shadow-sm'
                        : 'bg-teal-950/30 border-teal-800/60 shadow-sm'
                      : 'bg-slate-800/40 border-slate-800 opacity-75 hover:opacity-100'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className={`p-1 rounded-md ${
                        isUrgent
                          ? 'bg-rose-500/20 text-rose-400'
                          : isWarning
                          ? 'bg-amber-500/20 text-amber-400'
                          : 'bg-teal-500/20 text-teal-400'
                      }`}>
                        {isUrgent ? (
                          <AlertCircle className="w-3.5 h-3.5" />
                        ) : isWarning ? (
                          <AlertTriangle className="w-3.5 h-3.5" />
                        ) : (
                          <Info className="w-3.5 h-3.5" />
                        )}
                      </div>

                      <span className="font-semibold text-xs text-slate-100">
                        {alert.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-3 h-3" />
                        {formatTimeAgo(alert.created_at)}
                      </span>
                      <button
                        onClick={() => onDeleteAlert(alert.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete alert"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed pl-6 mb-2">
                    {alert.message}
                  </p>

                  <div className="flex items-center justify-between pl-6 pt-1 text-[11px]">
                    <span className="capitalize px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-400 border border-slate-700/60">
                      {alert.type.replace('_', ' ')}
                    </span>

                    <div className="flex items-center gap-2">
                      {isRefillAlert && onSelectRefill && (
                        <button
                          onClick={() => {
                            onSelectRefill(alert.related_entity_id);
                            onClose();
                          }}
                          className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                        >
                          <RefreshCw className="w-3 h-3" />
                          View Refill
                        </button>
                      )}

                      {alert.is_read === 0 && (
                        <button
                          onClick={() => onMarkAsRead(alert.id)}
                          className="text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1"
                        >
                          <Check className="w-3 h-3" />
                          Mark read
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-800 bg-slate-900 text-center text-xs text-slate-500">
          Live alert synchronization enabled via SQL engine
        </div>
      </div>
    </div>
  );
};
