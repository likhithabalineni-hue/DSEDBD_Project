import React, { useState } from 'react';
import { X, Calendar, Pill, Plus, Building2, FileText, CheckCircle2 } from 'lucide-react';
import { Prescription, Medicine } from '../types';

interface RefillScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  patientId: string;
  prescriptions: Prescription[];
  medicines: Medicine[];
  onSuccess: () => void;
}

export const RefillScheduleModal: React.FC<RefillScheduleModalProps> = ({
  isOpen,
  onClose,
  patientId,
  prescriptions,
  medicines,
  onSuccess,
}) => {
  const [selectedRxId, setSelectedRxId] = useState<string>('');
  const [medName, setMedName] = useState<string>('');
  const [dosage, setDosage] = useState<string>('1 Tablet');
  const [currentQty, setCurrentQty] = useState<number>(30);
  const [remainingQty, setRemainingQty] = useState<number>(15);
  const [refillsAllowed, setRefillsAllowed] = useState<number>(2);
  const [pharmacyName, setPharmacyName] = useState<string>('Apollo Health Pharmacy');
  const [notes, setNotes] = useState<string>('');

  // Default refill date +14 days
  const [scheduledDate, setScheduledDate] = useState<string>(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  // Set date preset (+7, +14, +30 days)
  const setPresetDays = (days: number) => {
    const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setScheduledDate(d.toISOString().split('T')[0]);
  };

  const handleRxChange = (rxId: string) => {
    setSelectedRxId(rxId);
    if (rxId) {
      const rx = prescriptions.find((p) => p.id === rxId);
      if (rx && rx.items && rx.items.length > 0) {
        const item = rx.items[0];
        setMedName(item.medicine_name);
        setDosage(item.dosage);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medName || !scheduledDate) {
      setError('Please provide the medicine name and scheduled refill date');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);

      const res = await fetch('/api/refills/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: patientId,
          prescription_id: selectedRxId || null,
          medicine_name: medName,
          dosage,
          current_quantity: currentQty,
          remaining_quantity: remainingQty,
          refills_allowed: refillsAllowed,
          scheduled_refill_date: scheduledDate,
          pharmacy_name: pharmacyName,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to schedule refill');

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Error scheduling refill');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div 
        id="schedule-refill-modal"
        className="w-full max-w-lg bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-100 text-base">Schedule Medicine Refill</h2>
              <p className="text-xs text-slate-400">Set automatic refill reminders and track supply</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-sm overflow-y-auto max-h-[80vh]">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
              {error}
            </div>
          )}

          {/* Link to Existing Prescription (optional) */}
          {prescriptions.length > 0 && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-teal-400" />
                Link to Electronic Prescription (Optional)
              </label>
              <select
                value={selectedRxId}
                onChange={(e) => handleRxChange(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              >
                <option value="">-- Custom / Non-prescription supplement --</option>
                {prescriptions.map((rx) => (
                  <option key={rx.id} value={rx.id}>
                    {rx.prescription_number} ({rx.diagnosis}) - Dr. {rx.doctor_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Medicine Name & Dosage */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-amber-400" />
                Medicine Name *
              </label>
              <input
                type="text"
                list="med-suggestions"
                value={medName}
                onChange={(e) => setMedName(e.target.value)}
                placeholder="e.g. Amoxicillin 500mg"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
                required
              />
              <datalist id="med-suggestions">
                {medicines.map((m) => (
                  <option key={m.id} value={m.name} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Dosage Form
              </label>
              <input
                type="text"
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g. 1 Tablet or 500mg"
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
            </div>
          </div>

          {/* Supply & Inventory Numbers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Full Bottle Pack
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={currentQty}
                onChange={(e) => setCurrentQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500">Total units/pack</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 text-amber-300">
                Pills Remaining
              </label>
              <input
                type="number"
                min="0"
                max="500"
                value={remainingQty}
                onChange={(e) => setRemainingQty(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
              <span className="text-[10px] text-slate-500">Current stock</span>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">
                Refills Allowed
              </label>
              <input
                type="number"
                min="0"
                max="10"
                value={refillsAllowed}
                onChange={(e) => setRefillsAllowed(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              />
              <span className="text-[10px] text-slate-500">Times authorized</span>
            </div>
          </div>

          {/* Scheduled Refill Date with Presets */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-teal-400" />
                Scheduled Refill Date *
              </label>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setPresetDays(7)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDays(14)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  +14d
                </button>
                <button
                  type="button"
                  onClick={() => setPresetDays(30)}
                  className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 border border-slate-700"
                >
                  +30d
                </button>
              </div>
            </div>
            <input
              type="date"
              value={scheduledDate}
              onChange={(e) => setScheduledDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
              required
            />
            <p className="text-[10px] text-slate-400 mt-1">
              System alert messages will trigger automatically 3 days prior to this scheduled date.
            </p>
          </div>

          {/* Preferred Pharmacy */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-teal-400" />
              Pickup Pharmacy
            </label>
            <input
              type="text"
              value={pharmacyName}
              onChange={(e) => setPharmacyName(e.target.value)}
              placeholder="e.g. Apollo Health Pharmacy - Main Branch"
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Refill Instructions / Clinical Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular monthly maintenance, request auto-dispense at front counter."
              className="w-full px-3 py-2 rounded-xl bg-slate-800/80 border border-slate-700 text-slate-200 text-xs focus:outline-none focus:border-teal-500"
            />
          </div>

          {/* Buttons */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              id="confirm-schedule-refill-btn"
              className="px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-500 text-white text-xs font-medium flex items-center gap-2 shadow-lg shadow-teal-900/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>Scheduling...</>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Save Refill Schedule
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
