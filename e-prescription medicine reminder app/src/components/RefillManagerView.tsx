import React, { useState } from 'react';
import { 
  Pill, 
  Calendar, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Plus, 
  RefreshCw, 
  Building2, 
  Send, 
  Minus, 
  FileText, 
  AlertCircle,
  HelpCircle,
  ShieldCheck
} from 'lucide-react';
import { RefillSchedule, Prescription, Medicine } from '../types';

interface RefillManagerViewProps {
  refills: RefillSchedule[];
  prescriptions: Prescription[];
  patientId: string;
  onRefresh: () => void;
  onOpenScheduleModal: () => void;
  onOpenAlertsCenter: () => void;
}

export const RefillManagerView: React.FC<RefillManagerViewProps> = ({
  refills,
  prescriptions,
  patientId,
  onRefresh,
  onOpenScheduleModal,
  onOpenAlertsCenter,
}) => {
  const [filter, setFilter] = useState<'all' | 'low_stock' | 'pending' | 'approved'>('all');
  const [requestingId, setRequestingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Request refill from doctor
  const handleRequestRefill = async (refill: RefillSchedule) => {
    try {
      setRequestingId(refill.id);
      const res = await fetch(`/api/refills/${refill.id}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notes: `Patient requested immediate refill. Current remaining: ${refill.remaining_quantity} units.`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit refill request');

      setActionSuccess(`Refill requested for ${refill.medicine_name}. Dr. Rajesh and pharmacy have been alerted!`);
      setTimeout(() => setActionSuccess(null), 4000);
      onRefresh();
    } catch (err: any) {
      console.error('Refill request error:', err);
    } finally {
      setRequestingId(null);
    }
  };

  // Adjust remaining pill count
  const handleAdjustQuantity = async (refill: RefillSchedule, delta: number) => {
    const newQty = Math.max(0, refill.remaining_quantity + delta);
    try {
      await fetch(`/api/refills/${refill.id}/update-quantity`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ remaining_quantity: newQty }),
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to update quantity:', err);
    }
  };

  // Metrics
  const lowStockCount = refills.filter((r) => r.remaining_quantity <= 5).length;
  const pendingCount = refills.filter((r) => r.status === 'requested').length;
  const approvedCount = refills.filter((r) => r.status === 'approved' || r.status === 'dispensed').length;

  const filteredRefills = refills.filter((r) => {
    if (filter === 'low_stock') return r.remaining_quantity <= 5;
    if (filter === 'pending') return r.status === 'requested';
    if (filter === 'approved') return r.status === 'approved' || r.status === 'dispensed';
    return true;
  });

  return (
    <div id="refill-manager-container" className="space-y-6">
      {/* Top Banner & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <RefreshCw className="w-5 h-5" />
            </span>
            Refill Scheduling & Pill Inventory
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track remaining medication stock, automate scheduled refills, and request doctor renewal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenScheduleModal}
            id="schedule-new-refill-btn"
            className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-teal-900/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            Schedule Refill
          </button>
        </div>
      </div>

      {actionSuccess && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-800 text-teal-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Tracked Medicines</span>
            <Pill className="w-4 h-4 text-teal-400" />
          </div>
          <div className="text-2xl font-bold text-slate-100">{refills.length}</div>
          <span className="text-[10px] text-slate-400">Prescribed & OTC items</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Low Stock Alerts</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className={`text-2xl font-bold ${lowStockCount > 0 ? 'text-rose-400' : 'text-slate-100'}`}>
            {lowStockCount}
          </div>
          <span className="text-[10px] text-rose-400/80">&le; 5 units remaining</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold text-amber-400">{pendingCount}</div>
          <span className="text-[10px] text-slate-400">Doctor review queued</span>
        </div>

        <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Authorized Refills</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400">{approvedCount}</div>
          <span className="text-[10px] text-slate-400">Ready at pharmacy</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex gap-2 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium ${
              filter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Refills ({refills.length})
          </button>
          <button
            onClick={() => setFilter('low_stock')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              filter === 'low_stock' ? 'bg-rose-950/80 text-rose-300 border border-rose-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Low Stock ({lowStockCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              filter === 'pending' ? 'bg-amber-950/80 text-amber-300 border border-amber-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Requested ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-medium flex items-center gap-1.5 ${
              filter === 'approved' ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ready / Approved ({approvedCount})
          </button>
        </div>

        <button
          onClick={onOpenAlertsCenter}
          className="text-xs text-teal-400 hover:text-teal-300 flex items-center gap-1 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5" />
          View Active Alerts
        </button>
      </div>

      {/* Refills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRefills.length === 0 ? (
          <div className="col-span-full p-8 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-slate-400">
            <Pill className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-medium">No refill schedules in this view.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;Schedule Refill&quot; above to set reminders and track your medicine inventory.
            </p>
          </div>
        ) : (
          filteredRefills.map((refill) => {
            const isLowStock = refill.remaining_quantity <= 5;
            const percentage = Math.min(
              100,
              Math.max(0, Math.round((refill.remaining_quantity / (refill.current_quantity || 30)) * 100))
            );

            // Refill status colors
            let statusBadge = (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                Scheduled
              </span>
            );

            if (refill.status === 'requested') {
              statusBadge = (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-950 text-amber-300 border border-amber-700 flex items-center gap-1 animate-pulse">
                  <Clock className="w-3 h-3" />
                  Approval Requested
                </span>
              );
            } else if (refill.status === 'approved') {
              statusBadge = (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-950 text-emerald-300 border border-emerald-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Refill Authorized
                </span>
              );
            } else if (refill.status === 'dispensed') {
              statusBadge = (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-teal-950 text-teal-300 border border-teal-700 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  Dispensed
                </span>
              );
            }

            return (
              <div
                key={refill.id}
                id={`refill-card-${refill.id}`}
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                  isLowStock
                    ? 'bg-slate-800/80 border-rose-800/80 shadow-md shadow-rose-950/20'
                    : 'bg-slate-800/60 border-slate-700/80 hover:border-slate-600'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold text-slate-100 text-base">{refill.medicine_name}</h3>
                        {isLowStock && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold uppercase tracking-wider border border-rose-500/30 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Low Stock
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {refill.dosage} &bull; Refills authorized: {refill.refills_completed} / {refill.refills_allowed}
                      </p>
                    </div>

                    {statusBadge}
                  </div>

                  {/* Stock Inventory Progress Bar */}
                  <div className="space-y-1.5 my-4">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Medication Supply:</span>
                      <div className="flex items-center gap-1 font-mono font-semibold">
                        <span className={isLowStock ? 'text-rose-400' : 'text-teal-400'}>
                          {refill.remaining_quantity}
                        </span>
                        <span className="text-slate-500">/ {refill.current_quantity} units left</span>
                      </div>
                    </div>

                    <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-slate-700/50">
                      <div
                        className={`h-full transition-all duration-300 rounded-full ${
                          isLowStock
                            ? 'bg-gradient-to-r from-rose-600 to-rose-400'
                            : percentage < 40
                            ? 'bg-gradient-to-r from-amber-600 to-amber-400'
                            : 'bg-gradient-to-r from-teal-600 to-emerald-400'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  {/* Refill Date & Pharmacy info */}
                  <div className="bg-slate-900/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-teal-400" />
                        Scheduled Refill Date:
                      </span>
                      <span className="font-semibold text-slate-200 font-mono">
                        {refill.scheduled_refill_date}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-400" />
                        Pharmacy:
                      </span>
                      <span className="text-slate-300 truncate max-w-[200px]">
                        {refill.pharmacy_name || 'Apollo Health Pharmacy'}
                      </span>
                    </div>

                    {refill.prescription_number && (
                      <div className="flex items-center justify-between pt-1 border-t border-slate-800 text-[11px]">
                        <span className="text-slate-500 flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          Prescription Reference:
                        </span>
                        <span className="font-mono text-teal-400">{refill.prescription_number}</span>
                      </div>
                    )}

                    {refill.notes && (
                      <div className="text-[11px] text-slate-400 italic pt-1 border-t border-slate-800">
                        &quot;{refill.notes}&quot;
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-700/60 flex items-center justify-between gap-2">
                  {/* Manual Pill Count Adjusters */}
                  <div className="flex items-center gap-1">
                    <span className="text-[10px] text-slate-500 mr-1 hidden sm:inline">Pill log:</span>
                    <button
                      onClick={() => handleAdjustQuantity(refill, -1)}
                      title="Used 1 dose"
                      className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleAdjustQuantity(refill, 1)}
                      title="Added 1 dose / correction"
                      className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-500 flex items-center justify-center text-slate-300 hover:text-white transition-colors"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Refill Request Button */}
                  {refill.status === 'requested' ? (
                    <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg bg-amber-950/40 border border-amber-800/40">
                      <Clock className="w-3.5 h-3.5 animate-spin" />
                      Doctor Reviewing
                    </span>
                  ) : refill.status === 'approved' ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-800/40">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Ready for Pickup
                    </span>
                  ) : (
                    <button
                      onClick={() => handleRequestRefill(refill)}
                      disabled={requestingId === refill.id}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl flex items-center gap-1.5 shadow-md transition-all ${
                        isLowStock
                          ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-950/30'
                          : 'bg-teal-600 hover:bg-teal-500 text-white shadow-teal-900/20'
                      }`}
                    >
                      <Send className="w-3.5 h-3.5" />
                      {requestingId === refill.id ? 'Sending Request...' : 'Request Refill Now'}
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
