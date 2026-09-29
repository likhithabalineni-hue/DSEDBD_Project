import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  Plus, 
  Trash2, 
  FileText, 
  Clock, 
  Pill, 
  Search, 
  Printer, 
  CheckCircle2, 
  User as UserIcon, 
  LogOut, 
  Database,
  Calendar,
  Sparkles,
  AlertCircle,
  Bell,
  RefreshCw
} from 'lucide-react';
import { User, Prescription, Medicine, RefillSchedule, AlertMessage } from '../types';
import { DoctorRefillsView } from './DoctorRefillsView.tsx';
import { AlertBanner } from './AlertBanner.tsx';
import { AlertsDrawer } from './AlertsDrawer.tsx';

interface DoctorDashboardProps {
  user: User;
  onLogout: () => void;
  onOpenSqlExplorer: () => void;
}

export const DoctorDashboard: React.FC<DoctorDashboardProps> = ({ user, onLogout, onOpenSqlExplorer }) => {
  const [activeTab, setActiveTab] = useState<'create-rx' | 'history' | 'medicines' | 'patients' | 'refills'>('create-rx');
  const [patients, setPatients] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [refills, setRefills] = useState<RefillSchedule[]>([]);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState<boolean>(false);

  const [loading, setLoading] = useState(false);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Active Rx preview modal
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);

  // New Prescription Form State
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');
  const [validUntil, setValidUntil] = useState(
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  
  const [rxItems, setRxItems] = useState<Array<{
    medicine_name: string;
    dosage: string;
    frequency: string;
    duration: string;
    timing: string;
    instructions: string;
  }>>([
    {
      medicine_name: 'Amoxicillin 500mg',
      dosage: '1 Capsule (500mg)',
      frequency: 'Twice Daily (1-0-1)',
      duration: '5 Days',
      timing: 'After Meals',
      instructions: 'Take with full glass of water morning and night.',
    },
  ]);

  // Load Patients, Medicines, Refills & Alerts
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const [patRes, medRes, rxRes, refRes, altRes] = await Promise.all([
        fetch('/api/patients'),
        fetch('/api/medicines'),
        fetch(`/api/prescriptions?doctor_id=${user.id}`),
        fetch('/api/refills'),
        fetch(`/api/alerts?user_id=${user.id}`),
      ]);

      const patData = await patRes.json();
      const medData = await medRes.json();
      const rxData = await rxRes.json();
      const refData = await refRes.json();
      const altData = await altRes.json();

      setPatients(patData.patients || []);
      setMedicines(medData.medicines || []);
      setPrescriptions(rxData.prescriptions || []);
      setRefills(refData.refills || []);
      setAlerts(altData.alerts || []);
      setUnreadAlertsCount(altData.unread_count || 0);

      if (patData.patients && patData.patients.length > 0 && !selectedPatientId) {
        setSelectedPatientId(patData.patients[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching doctor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [user.id]);

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: 'POST' });
      loadInitialData();
    } catch (err) {
      console.error('Error marking alert read:', err);
    }
  };

  const handleMarkAllAlertsRead = async () => {
    try {
      await fetch('/api/alerts/mark-all-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      loadInitialData();
    } catch (err) {
      console.error('Error marking all alerts read:', err);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
      loadInitialData();
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const handleAddItem = () => {
    setRxItems([
      ...rxItems,
      {
        medicine_name: medicines[0]?.name || 'Paracetamol 650mg',
        dosage: '1 Tablet',
        frequency: 'Twice Daily (1-0-1)',
        duration: '5 Days',
        timing: 'After Meals',
        instructions: 'Take as directed.',
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (rxItems.length === 1) return;
    setRxItems(rxItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const updated = [...rxItems];
    updated[index] = { ...updated[index], [field]: value };
    setRxItems(updated);
  };

  const handleCreatePrescription = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);
    setSuccessBanner(null);

    if (!selectedPatientId) {
      setErrorBanner('Please select a patient.');
      return;
    }
    if (!diagnosis.trim()) {
      setErrorBanner('Please specify a clinical diagnosis.');
      return;
    }

    try {
      const res = await fetch('/api/prescriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: user.id,
          patient_id: selectedPatientId,
          diagnosis,
          notes,
          valid_until: validUntil,
          items: rxItems,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create prescription');

      setSuccessBanner(
        `E-Prescription ${data.prescription_number} issued and saved to SQL! Timed reminders have been automatically scheduled for the patient.`
      );

      // Reset form and reload prescriptions
      setDiagnosis('');
      setNotes('');
      loadInitialData();
      setActiveTab('history');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to issue prescription');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Doctor Navigation Bar */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base">{user.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                Physician Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">{user.specialization || 'Healthcare Provider'} · {user.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-doc-alerts-bell"
            onClick={() => setShowAlertsDrawer(true)}
            className="relative p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Alerts and Notifications"
          >
            <Bell className="w-4 h-4 text-teal-400" />
            {unreadAlertsCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center animate-pulse">
                {unreadAlertsCount}
              </span>
            )}
          </button>

          <button
            id="btn-doc-sql-explorer"
            onClick={onOpenSqlExplorer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-300 border border-slate-700 transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SQL & JSON Inspector</span>
          </button>

          <button
            id="btn-doctor-logout"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-xs text-slate-300 border border-slate-700 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Alert Banner */}
      <AlertBanner
        alerts={alerts}
        onOpenAlertsCenter={() => setShowAlertsDrawer(true)}
        onDismiss={handleDismissAlert}
        onRequestRefillTab={() => setActiveTab('refills')}
      />

      {/* Main Container */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto">
          <button
            id="tab-btn-create-rx"
            onClick={() => setActiveTab('create-rx')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'create-rx'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Issue E-Prescription</span>
          </button>

          <button
            id="tab-btn-refills"
            onClick={() => setActiveTab('refills')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'refills'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refill Requests</span>
            {refills.filter((r) => r.status === 'requested').length > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-400 text-slate-950 ml-0.5 animate-pulse">
                {refills.filter((r) => r.status === 'requested').length}
              </span>
            )}
          </button>

          <button
            id="tab-btn-history"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Prescription Records ({prescriptions.length})</span>
          </button>

          <button
            id="tab-btn-medicines"
            onClick={() => setActiveTab('medicines')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'medicines'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <Pill className="w-4 h-4" />
            <span>Drug Catalog ({medicines.length})</span>
          </button>

          <button
            id="tab-btn-patients"
            onClick={() => setActiveTab('patients')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'patients'
                ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Patients Roster ({patients.length})</span>
          </button>
        </div>

        {/* Feedback Banners */}
        {successBanner && (
          <div className="p-4 rounded-xl bg-teal-500/15 border border-teal-500/30 text-teal-300 text-sm flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-teal-400 mt-0.5" />
            <div className="flex-1">{successBanner}</div>
          </div>
        )}

        {errorBanner && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">{errorBanner}</div>
          </div>
        )}

        {/* TAB: REFILL REQUESTS */}
        {activeTab === 'refills' && (
          <DoctorRefillsView
            refills={refills}
            doctorId={user.id}
            onRefresh={loadInitialData}
          />
        )}

        {/* TAB 1: CREATE E-PRESCRIPTION */}
        {activeTab === 'create-rx' && (
          <form onSubmit={handleCreatePrescription} className="space-y-6">
            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-6 shadow-xl space-y-6">
              <div className="border-b border-slate-700 pb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-teal-400" />
                  <span>Generate Electronic Medical Prescription</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Essential details entered here will be persisted to SQL relational tables and automatically translated into medicine reminder alerts for the patient.
                </p>
              </div>

              {/* Patient Selection & Demographics */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Patient</label>
                  <select
                    id="select-rx-patient"
                    value={selectedPatientId}
                    onChange={(e) => setSelectedPatientId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    {patients.map((pat) => (
                      <option key={pat.id} value={pat.id}>
                        {pat.name} ({pat.phone || pat.email})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Clinical Diagnosis</label>
                  <input
                    id="input-rx-diagnosis"
                    type="text"
                    required
                    value={diagnosis}
                    onChange={(e) => setDiagnosis(e.target.value)}
                    placeholder="e.g. Acute Bronchitis, Type-2 Diabetes Follow-up"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prescription Valid Until</label>
                  <input
                    id="input-rx-valid-until"
                    type="date"
                    value={validUntil}
                    onChange={(e) => setValidUntil(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Prescribed Medicines (Dynamic Rows) */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Pill className="w-4 h-4 text-teal-400" />
                    <span>Prescribed Medications ({rxItems.length})</span>
                  </h3>
                  <button
                    id="btn-add-med-row"
                    type="button"
                    onClick={handleAddItem}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 text-xs font-medium border border-teal-500/30 transition"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Another Medicine</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {rxItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-slate-900/90 border border-slate-700/80 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono text-teal-400 font-semibold">
                          Medicine #{idx + 1}
                        </span>
                        {rxItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Medicine Name</label>
                          <input
                            type="text"
                            required
                            value={item.medicine_name}
                            onChange={(e) => handleItemChange(idx, 'medicine_name', e.target.value)}
                            placeholder="e.g. Amoxicillin 500mg"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Dosage Form & Strength</label>
                          <input
                            type="text"
                            required
                            value={item.dosage}
                            onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                            placeholder="e.g. 1 Tablet (650mg)"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Frequency</label>
                          <select
                            value={item.frequency}
                            onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="Twice Daily (1-0-1)">Twice Daily (1-0-1)</option>
                            <option value="Three Times Daily (1-1-1)">Three Times Daily (1-1-1)</option>
                            <option value="Once Daily Morning (1-0-0)">Once Daily Morning (1-0-0)</option>
                            <option value="Once Daily Night (0-0-1)">Once Daily Night (0-0-1)</option>
                            <option value="As Needed (SOS)">As Needed (SOS)</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Duration</label>
                          <input
                            type="text"
                            value={item.duration}
                            onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                            placeholder="e.g. 5 Days, 10 Days, 1 Month"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Meal Timing</label>
                          <select
                            value={item.timing}
                            onChange={(e) => handleItemChange(idx, 'timing', e.target.value)}
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          >
                            <option value="After Meals">After Meals</option>
                            <option value="Before Meals (Empty Stomach)">Before Meals (Empty Stomach)</option>
                            <option value="With Meals">With Meals</option>
                            <option value="At Bedtime">At Bedtime</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Special Instructions for Patient</label>
                          <input
                            type="text"
                            value={item.instructions}
                            onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                            placeholder="e.g. Drink lots of fluids, avoid milk within 1 hour"
                            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Clinical Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  General Advice & Lifestyle Guidelines
                </label>
                <textarea
                  id="textarea-rx-notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Rest well for 3 days, drink warm fluids, review if fever persists after 48 hours..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex items-center justify-between pt-2">
                <span className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-400" />
                  <span>Schedules automated reminders for the patient immediately in SQL.</span>
                </span>
                <button
                  id="btn-issue-rx-submit"
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 transition cursor-pointer flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  <span>Issue & Save E-Prescription</span>
                </button>
              </div>
            </div>
          </form>
        )}

        {/* TAB 2: PRESCRIPTION RECORDS */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">Issued Prescriptions ({prescriptions.length})</h2>
              <span className="text-xs text-slate-400">Stored in SQL table <code className="text-teal-400 font-mono">prescriptions</code></span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-800/50 border border-slate-700 text-center text-slate-400">
                No prescriptions issued yet. Click "Issue E-Prescription" to create one.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prescriptions.map((rx) => (
                  <div
                    key={rx.id}
                    className="p-5 rounded-2xl bg-slate-800/90 border border-slate-700 hover:border-slate-600 transition space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-xs font-mono font-bold text-teal-400 bg-teal-500/10 px-2.5 py-0.5 rounded border border-teal-500/20">
                          {rx.prescription_number}
                        </span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{rx.patient_name}</h3>
                        <p className="text-xs text-slate-400">Tel: {rx.patient_phone || 'N/A'}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(rx.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div><strong className="text-slate-300">Diagnosis:</strong> <span className="text-teal-300">{rx.diagnosis}</span></div>
                      {rx.notes && <div><strong className="text-slate-400">Advice:</strong> <span className="text-slate-300">{rx.notes}</span></div>}
                      <div className="text-[11px] text-slate-400 pt-1">
                        Valid until: {rx.valid_until || 'N/A'}
                      </div>
                    </div>

                    <div className="border-t border-slate-700/60 pt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">
                        {rx.items?.length || 0} Medications prescribed
                      </span>
                      <button
                        id={`btn-view-rx-${rx.id}`}
                        onClick={() => setSelectedRx(rx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 text-xs font-medium border border-teal-500/30 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View Rx Slip</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEDICINES CATALOG */}
        {activeTab === 'medicines' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Medication Database ({medicines.length})</h2>
                <p className="text-xs text-slate-400">Basic drug information, indications, and precautions</p>
              </div>
              <span className="text-xs font-mono text-teal-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                SQL: SELECT * FROM medicines
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {medicines.map((med) => (
                <div key={med.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-white">{med.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-700 font-medium">
                      {med.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 italic">Generic: {med.generic_name}</p>
                  <div className="text-xs space-y-1 pt-1 border-t border-slate-700/60">
                    <div className="text-slate-300"><strong>Dosage Form:</strong> {med.dosage_form} ({med.default_dosage})</div>
                    <div className="text-slate-300"><strong>Precautions:</strong> {med.precautions}</div>
                    <div className="text-slate-400"><strong>Side Effects:</strong> {med.side_effects}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PATIENTS ROSTER */}
        {activeTab === 'patients' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">Registered Patients ({patients.length})</h2>
                <p className="text-xs text-slate-400">Patient demographics, primary contact, and family caregiver alternate numbers for SMS escalation</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">SQL: SELECT * FROM users u LEFT JOIN caregivers cg</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {patients.map((pat) => (
                <div key={pat.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-3 shadow-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center font-bold">
                      {pat.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">{pat.name}</h3>
                      <p className="text-xs text-slate-400">{pat.email}</p>
                    </div>
                  </div>

                  <div className="text-xs space-y-2 pt-2 border-t border-slate-700/60">
                    <div className="flex justify-between text-slate-300">
                      <span>Primary Phone:</span>
                      <span className="font-mono text-slate-200">{pat.phone || 'N/A'}</span>
                    </div>

                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-indigo-500/30 space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-indigo-300 font-semibold flex items-center gap-1">
                          <span>Caregiver / Alt Contact:</span>
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                          SMS Active
                        </span>
                      </div>
                      <div className="text-xs font-medium text-white">
                        {pat.caregiver_name ? `${pat.caregiver_name} (${pat.caregiver_relationship || 'Family'})` : 'Family Caregiver (Default)'}
                      </div>
                      <div className="text-xs font-mono text-teal-300">
                        Alt Phone: {pat.caregiver_alternate_phone || '+91 94401 88990'}
                      </div>
                    </div>

                    <div className="flex justify-between pt-1">
                      <span className="text-slate-400">Prescriptions:</span>
                      <span className="text-teal-400 font-medium">{pat.prescription_count || 0} Prescriptions</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* OFFICIAL RX SLIP MODAL */}
      {selectedRx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative space-y-6">
            
            {/* Header / Clinic seal */}
            <div className="border-b-2 border-teal-600 pb-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-black text-teal-900 tracking-tight">KLH MEDICAL CENTER</h2>
                <p className="text-xs text-slate-600 font-medium">Department of Clinical Medicine & E-Health Services</p>
                <p className="text-xs text-slate-500">Bachupally, Gandimaisamma Road, Hyderabad - 500043</p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-serif font-bold text-teal-700">℞</span>
                <div className="text-xs font-mono font-bold text-slate-800">{selectedRx.prescription_number}</div>
                <div className="text-[11px] text-slate-500">{new Date(selectedRx.created_at).toLocaleDateString()}</div>
              </div>
            </div>

            {/* Doctor & Patient Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-[11px] uppercase font-bold text-teal-800">Prescribing Physician</div>
                <div className="text-sm font-bold text-slate-900">{selectedRx.doctor_name}</div>
                <div className="text-slate-600">{selectedRx.doctor_specialization}</div>
                <div className="text-slate-500">Contact: {selectedRx.doctor_phone || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold text-teal-800">Patient Details</div>
                <div className="text-sm font-bold text-slate-900">{selectedRx.patient_name}</div>
                <div className="text-slate-600">Email: {selectedRx.patient_email}</div>
                <div className="text-slate-500">Phone: {selectedRx.patient_phone || 'N/A'}</div>
              </div>
            </div>

            {/* Diagnosis */}
            <div>
              <div className="text-xs uppercase font-bold text-slate-500">Primary Diagnosis</div>
              <div className="text-base font-bold text-teal-950 mt-0.5">{selectedRx.diagnosis}</div>
            </div>

            {/* Medicines Table */}
            <div>
              <div className="text-xs uppercase font-bold text-slate-500 mb-2">Rx Prescribed Medications</div>
              <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-teal-50 text-teal-900 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2.5">Medicine</th>
                    <th className="p-2.5">Dosage</th>
                    <th className="p-2.5">Frequency</th>
                    <th className="p-2.5">Duration</th>
                    <th className="p-2.5">Instructions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {selectedRx.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="p-2.5 font-semibold text-slate-900">{it.medicine_name}</td>
                      <td className="p-2.5">{it.dosage}</td>
                      <td className="p-2.5 font-medium text-teal-700">{it.frequency}</td>
                      <td className="p-2.5">{it.duration}</td>
                      <td className="p-2.5 text-slate-600">{it.timing} - {it.instructions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Clinical Advice */}
            {selectedRx.notes && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <strong>Doctor's Notes & Advice:</strong> {selectedRx.notes}
              </div>
            )}

            {/* Footer / Digital Seal */}
            <div className="pt-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <div>
                <div className="font-mono text-[10px]">Digitally Certified Electronic Prescription</div>
                <div className="text-[10px]">Valid Until: {selectedRx.valid_until || '14 days from issue'}</div>
              </div>
              <div className="text-right">
                <div className="font-serif italic font-bold text-slate-800 text-sm">{selectedRx.doctor_name}</div>
                <div className="text-[10px] text-teal-700 font-semibold">[DIGITALLY VERIFIED SIGNATURE]</div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold flex items-center gap-1.5 transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Prescription</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRx(null)}
                className="px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Doctor Alerts & Notification Drawer */}
      <AlertsDrawer
        isOpen={showAlertsDrawer}
        onClose={() => setShowAlertsDrawer(false)}
        alerts={alerts}
        unreadCount={unreadAlertsCount}
        userId={user.id}
        onMarkAsRead={handleMarkAlertRead}
        onMarkAllAsRead={handleMarkAllAlertsRead}
        onDeleteAlert={handleDismissAlert}
        onSelectRefill={() => setActiveTab('refills')}
        onRefreshAlerts={loadInitialData}
      />

    </div>
  );
};
