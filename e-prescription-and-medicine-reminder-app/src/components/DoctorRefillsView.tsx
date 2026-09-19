import React, { useState } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Pill, 
  User as UserIcon, 
  Building2, 
  Calendar, 
  FileText, 
  AlertCircle,
  Phone,
  RefreshCw,
  Search
} from 'lucide-react';
import { RefillSchedule } from '../types';

interface DoctorRefillsViewProps {
  refills: RefillSchedule[];
  doctorId: string;
  onRefresh: () => void;
}

export const DoctorRefillsView: React.FC<DoctorRefillsViewProps> = ({
  refills,
  doctorId,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'pending' | 'approved' | 'all'>('pending');
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const handleReview = async (
    refillId: string,
    status: 'approved' | 'dispensed' | 'rejected',
    notes?: string
  ) => {
    try {
      setProcessingId(refillId);
      const res = await fetch(`/api/refills/${refillId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: doctorId,
          status,
          notes: notes || (status === 'approved' ? 'Refill verified and clinically authorized.' : 'Patient advised to schedule in-person consultation.'),
          pharmacy_name: 'Apollo Health Pharmacy - Hospital Branch',
          additional_quantity: 30,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to review refill');

      setFeedbackMsg(`Refill request marked as ${status}. Patient notified immediately!`);
      setTimeout(() => setFeedbackMsg(null), 4000);
      onRefresh();
    } catch (err: any) {
      console.error('Error reviewing refill:', err);
    } finally {
      setProcessingId(null);
    }
  };

  const pendingRequests = refills.filter((r) => r.status === 'requested');
  const approvedRequests = refills.filter((r) => r.status === 'approved' || r.status === 'dispensed');

  const filtered = refills.filter((r) => {
    if (filter === 'pending') return r.status === 'requested';
    if (filter === 'approved') return r.status === 'approved' || r.status === 'dispensed';
    return true;
  }).filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      r.medicine_name.toLowerCase().includes(q) ||
      (r.patient_name || '').toLowerCase().includes(q) ||
      (r.prescription_number || '').toLowerCase().includes(q)
    );
  });

  return (
    <div id="doctor-refills-view" className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-teal-500/20 text-teal-400">
              <RefreshCw className="w-5 h-5" />
            </span>
            Refill Requests & Prescription Renewals
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Review patient medication refill applications, verify dosage compliance, and authorize pharmacy dispensing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
            <span>{pendingRequests.length} Pending Actions</span>
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="p-3.5 rounded-xl bg-teal-950/80 border border-teal-800 text-teal-200 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-teal-400 flex-shrink-0" />
          <span>{feedbackMsg}</span>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex gap-2 text-xs w-full sm:w-auto">
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              filter === 'pending'
                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setFilter('approved')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              filter === 'approved'
                ? 'bg-teal-950 text-teal-300 border border-teal-800'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Approved ({approvedRequests.length})
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              filter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All Refills ({refills.length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search patient, medicine, Rx..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800/80 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* Refills Grid */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="p-12 rounded-2xl bg-slate-800/40 border border-slate-800 text-center text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-teal-500/40 mx-auto mb-2" />
            <p className="text-sm font-semibold text-slate-300">No refill requests found</p>
            <p className="text-xs text-slate-500 mt-1">All patient refill queues have been cleared.</p>
          </div>
        ) : (
          filtered.map((refill) => {
            const isPending = refill.status === 'requested';
            const isApproved = refill.status === 'approved' || refill.status === 'dispensed';

            return (
              <div
                key={refill.id}
                id={`doc-refill-${refill.id}`}
                className={`p-5 rounded-2xl border transition-all ${
                  isPending
                    ? 'bg-slate-800/90 border-amber-700/80 shadow-lg shadow-amber-950/20'
                    : 'bg-slate-800/50 border-slate-800'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Patient & Medicine Info */}
                  <div className="flex items-start gap-4">
                    <div className={`p-3 rounded-2xl flex-shrink-0 ${
                      isPending ? 'bg-amber-500/20 text-amber-400' : 'bg-teal-500/20 text-teal-400'
                    }`}>
                      <Pill className="w-6 h-6" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-100 text-base">
                          {refill.medicine_name}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">({refill.dosage})</span>
                        {isPending ? (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Action Needed
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            Authorized
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-slate-400 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-slate-200 font-medium">
                          <UserIcon className="w-3.5 h-3.5 text-teal-400" />
                          {refill.patient_name || 'Patient'}
                        </span>
                        {refill.patient_phone && (
                          <span className="flex items-center gap-1 font-mono text-slate-400">
                            <Phone className="w-3 h-3" />
                            {refill.patient_phone}
                          </span>
                        )}
                        {refill.prescription_number && (
                          <span className="flex items-center gap-1 font-mono text-teal-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700/60">
                            <FileText className="w-3 h-3" />
                            {refill.prescription_number}
                          </span>
                        )}
                      </div>

                      {/* Stock & Schedule details */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3 text-xs bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                        <div>
                          <span className="text-slate-500 text-[10px] block">Current Remaining:</span>
                          <span className={`font-mono font-bold ${refill.remaining_quantity <= 5 ? 'text-rose-400' : 'text-slate-200'}`}>
                            {refill.remaining_quantity} doses left
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Scheduled Refill Date:</span>
                          <span className="font-mono text-slate-300 flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-teal-400" />
                            {refill.scheduled_refill_date}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] block">Refills Completed:</span>
                          <span className="font-mono text-slate-300">
                            {refill.refills_completed} / {refill.refills_allowed} authorized
                          </span>
                        </div>
                      </div>

                      {refill.notes && (
                        <p className="text-xs text-slate-400 italic mt-2">
                          Note: &quot;{refill.notes}&quot;
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Doctor Review Actions */}
                  <div className="flex sm:flex-col lg:flex-row items-center gap-2 justify-end flex-shrink-0 pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-800">
                    {isPending ? (
                      <>
                        <button
                          onClick={() => handleReview(refill.id, 'rejected', 'Clinical check required before refill.')}
                          disabled={processingId === refill.id}
                          className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-300 text-xs font-semibold border border-slate-700 hover:border-rose-800 flex items-center gap-1.5 transition-colors"
                        >
                          <XCircle className="w-4 h-4" />
                          Decline
                        </button>
                        <button
                          onClick={() => handleReview(refill.id, 'approved')}
                          disabled={processingId === refill.id}
                          id={`approve-refill-${refill.id}`}
                          className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-semibold flex items-center gap-2 shadow-lg shadow-teal-900/30 transition-all"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          {processingId === refill.id ? 'Authorizing...' : 'Approve & Authorize'}
                        </button>
                      </>
                    ) : (
                      <div className="text-xs text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 px-3 py-1.5 rounded-xl border border-emerald-800/40">
                        <CheckCircle2 className="w-4 h-4" />
                        Approved by Doctor
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
