import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { 
  Pill, 
  CheckCircle2, 
  Clock, 
  Bell, 
  AlertCircle, 
  Calendar, 
  FileText, 
  Search, 
  Plus, 
  Flame, 
  Sparkles, 
  Printer, 
  LogOut, 
  Database,
  Sun,
  Sunset,
  Moon,
  Coffee,
  RefreshCw,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { User, Reminder, Prescription, Medicine, AdherenceStats, RefillSchedule, AlertMessage } from '../types';
import { playChime } from '../utils/audio.ts';
import { AlertBanner } from './AlertBanner.tsx';
import { AlertsDrawer } from './AlertsDrawer.tsx';
import { RefillManagerView } from './RefillManagerView.tsx';
import { RefillScheduleModal } from './RefillScheduleModal.tsx';
import { CaregiverSmsManager } from './CaregiverSmsManager.tsx';

interface PatientDashboardProps {
  user: User;
  onLogout: () => void;
  onOpenSqlExplorer: () => void;
}

export const PatientDashboard: React.FC<PatientDashboardProps> = ({ user, onLogout, onOpenSqlExplorer }) => {
  const [activeTab, setActiveTab] = useState<'reminders' | 'refills' | 'caregiver' | 'prescriptions' | 'guide' | 'logs'>('reminders');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [refills, setRefills] = useState<RefillSchedule[]>([]);
  const [alerts, setAlerts] = useState<AlertMessage[]>([]);
  const [unreadAlertsCount, setUnreadAlertsCount] = useState<number>(0);
  const [showAlertsDrawer, setShowAlertsDrawer] = useState<boolean>(false);
  const [showRefillModal, setShowRefillModal] = useState<boolean>(false);

  const [adherence, setAdherence] = useState<AdherenceStats>({
    total_scheduled_today: 0,
    taken_today: 0,
    adherence_percentage: 100,
    history: [],
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [showAddCustomModal, setShowAddCustomModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Custom reminder form
  const [customMedName, setCustomMedName] = useState('');
  const [customDosage, setCustomDosage] = useState('1 Tablet');
  const [customTime, setCustomTime] = useState('09:00');
  const [customSlot, setCustomSlot] = useState('Morning');
  const [customInstructions, setCustomInstructions] = useState('After breakfast');

  const loadPatientData = async () => {
    try {
      // Trigger dynamic alert checks (scans for upcoming refills due, low supplies, missed doses)
      try {
        await fetch('/api/alerts/check-active', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user.id }),
        });
      } catch (checkErr) {
        console.warn('Alert check background ping:', checkErr);
      }

      const [remRes, rxRes, adhRes, medRes, refRes, altRes] = await Promise.all([
        fetch(`/api/patient/${user.id}/reminders`),
        fetch(`/api/prescriptions?patient_id=${user.id}`),
        fetch(`/api/patient/${user.id}/adherence`),
        fetch('/api/medicines'),
        fetch(`/api/refills?patient_id=${user.id}`),
        fetch(`/api/alerts?user_id=${user.id}`),
      ]);

      const remData = await remRes.json();
      const rxData = await rxRes.json();
      const adhData = await adhRes.json();
      const medData = await medRes.json();
      const refData = await refRes.json();
      const altData = await altRes.json();

      setReminders(remData.reminders || []);
      setPrescriptions(rxData.prescriptions || []);
      setAdherence(adhData);
      setMedicines(medData.medicines || []);
      setRefills(refData.refills || []);
      setAlerts(altData.alerts || []);
      setUnreadAlertsCount(altData.unread_count || 0);
    } catch (err) {
      console.error('Failed to load patient data:', err);
    }
  };

  useEffect(() => {
    loadPatientData();
  }, [user.id]);

  const handleMarkAlertRead = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}/read`, { method: 'POST' });
      loadPatientData();
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
      loadPatientData();
    } catch (err) {
      console.error('Error marking all alerts read:', err);
    }
  };

  const handleDismissAlert = async (alertId: string) => {
    try {
      await fetch(`/api/alerts/${alertId}`, { method: 'DELETE' });
      loadPatientData();
    } catch (err) {
      console.error('Error dismissing alert:', err);
    }
  };

  const handleAction = async (reminderId: string, status: 'taken' | 'snoozed' | 'missed') => {
    try {
      const res = await fetch(`/api/patient/reminders/${reminderId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.id,
          status,
          notes: status === 'taken' ? 'Logged on time by patient' : 'Patient requested reminder action',
        }),
      });

      if (!res.ok) throw new Error('Action failed');

      if (status === 'taken') {
        playChime('success');
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
          colors: ['#14b8a6', '#06b6d4', '#10b981', '#3b82f6'],
        });
        setToastMessage('🎉 Dose marked as taken! Stored into SQL database logs.');
      } else if (status === 'snoozed') {
        playChime('snooze');
        setToastMessage('⏰ Reminder snoozed for 15 minutes.');
      } else {
        playChime('urgent');
        setToastMessage('🚨 Dose marked as missed! Priority SMS alert dispatched to caregiver alternate phone number.');
      }

      setTimeout(() => setToastMessage(null), 4000);
      loadPatientData();
    } catch (err) {
      console.error('Error logging reminder action:', err);
    }
  };

  const handleCreateCustomReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/patient/custom-reminder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: user.id,
          medicine_name: customMedName,
          dosage: customDosage,
          reminder_time: customTime,
          slot: customSlot,
          instructions: customInstructions,
        }),
      });

      if (res.ok) {
        setShowAddCustomModal(false);
        setCustomMedName('');
        setToastMessage('Custom reminder saved to SQL!');
        loadPatientData();
        setTimeout(() => setToastMessage(null), 3000);
      }
    } catch (err) {
      console.error('Failed to create custom reminder:', err);
    }
  };

  // Group reminders by slot
  const slots = [
    { name: 'Morning', icon: Coffee, desc: '6:00 AM - 11:59 AM' },
    { name: 'Afternoon', icon: Sun, desc: '12:00 PM - 4:59 PM' },
    { name: 'Evening', icon: Sunset, desc: '5:00 PM - 8:59 PM' },
    { name: 'Night', icon: Moon, desc: '9:00 PM onwards' },
  ];

  const filteredMedicines = medicines.filter(
    (m) =>
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.generic_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col selection:bg-teal-500 selection:text-white">
      {/* Patient Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-30 px-4 sm:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-teal-500/20 border border-teal-500/40 flex items-center justify-center text-teal-400 font-bold">
            {user.name.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm sm:text-base">{user.name}</span>
              <span className="text-[11px] px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20 font-medium">
                Patient Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">{user.email} · Tel: {user.phone || 'N/A'}</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-pat-alerts-bell"
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
            id="btn-pat-sql-explorer"
            onClick={onOpenSqlExplorer}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-amber-300 border border-slate-700 transition"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">SQL & JSON Inspector</span>
          </button>

          <button
            id="btn-patient-logout"
            onClick={onLogout}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/40 hover:text-rose-300 text-xs text-slate-300 border border-slate-700 transition"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </header>

      {/* Real-time Alert Messages Banner */}
      <AlertBanner
        alerts={alerts}
        onOpenAlertsCenter={() => setShowAlertsDrawer(true)}
        onDismiss={handleDismissAlert}
        onRequestRefillTab={() => setActiveTab('refills')}
      />

      {/* Main Content Area */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        
        {/* Today's Overview & Adherence Score Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2 bg-gradient-to-r from-teal-900/40 to-slate-800/80 border border-teal-500/30 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1">
                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Daily Medication Adherence</span>
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                  🔥 5-Day Streak
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                {adherence.taken_today} of {adherence.total_scheduled_today} Doses Taken Today
              </h2>
              <p className="text-xs text-slate-300">
                {adherence.adherence_percentage >= 80
                  ? 'Excellent consistency! Following your schedule reduces health risks and speeds recovery.'
                  : 'Make sure to take your remaining scheduled medications on time today.'}
              </p>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-700/80 shrink-0">
              <div className="text-center">
                <div className="text-2xl font-black text-teal-400">{adherence.adherence_percentage}%</div>
                <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Compliance</div>
              </div>
            </div>
          </div>

          <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-300">Active Prescriptions</span>
              <span className="text-xs font-mono text-teal-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                {prescriptions.length} Active
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Prescribed by verified healthcare providers. All medication dosages and frequencies are synced.
            </p>
            <button
              id="btn-quick-view-rx"
              onClick={() => setActiveTab('prescriptions')}
              className="mt-3 text-xs text-teal-400 hover:text-teal-300 font-medium flex items-center gap-1 transition"
            >
              <span>View digital prescription slips</span>
              <span>→</span>
            </button>
          </div>
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="p-3.5 rounded-xl bg-teal-500/20 border border-teal-500/40 text-teal-200 text-sm flex items-center gap-2.5 shadow-lg shadow-teal-500/10">
            <CheckCircle2 className="w-4 h-4 text-teal-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              id="tab-btn-patient-reminders"
              onClick={() => setActiveTab('reminders')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'reminders'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>Today's Medicine Schedule ({reminders.length})</span>
            </button>

            <button
              id="tab-btn-patient-refills"
              onClick={() => setActiveTab('refills')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'refills'
                  ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refills & Supplies ({refills.length})</span>
            </button>

            <button
              id="tab-btn-patient-caregiver"
              onClick={() => setActiveTab('caregiver')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'caregiver'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Smartphone className="w-4 h-4 text-indigo-300" />
              <span>Caregiver SMS & Alt Phone</span>
            </button>

            <button
              id="tab-btn-patient-rx"
              onClick={() => setActiveTab('prescriptions')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'prescriptions'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>My E-Prescriptions ({prescriptions.length})</span>
            </button>

            <button
              id="tab-btn-patient-guide"
              onClick={() => setActiveTab('guide')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeTab === 'guide'
                  ? 'bg-teal-500 text-slate-950 shadow-md shadow-teal-500/20'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Drug Info & Search</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="btn-quick-schedule-refill"
              onClick={() => setShowRefillModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-medium border border-amber-500/30 transition whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Schedule Refill</span>
            </button>

            <button
              id="btn-add-custom-reminder"
              onClick={() => setShowAddCustomModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/20 text-teal-300 hover:bg-teal-500/30 text-xs font-medium border border-teal-500/30 transition whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Reminder</span>
            </button>
          </div>
        </div>

        {/* TAB: REFILL SCHEDULING & INVENTORY */}
        {activeTab === 'refills' && (
          <RefillManagerView
            refills={refills}
            prescriptions={prescriptions}
            patientId={user.id}
            onRefresh={loadPatientData}
            onOpenScheduleModal={() => setShowRefillModal(true)}
            onOpenAlertsCenter={() => setShowAlertsDrawer(true)}
          />
        )}

        {/* TAB: CAREGIVER SMS & ALTERNATE PHONE */}
        {activeTab === 'caregiver' && (
          <CaregiverSmsManager
            patientId={user.id}
            patientName={user.name}
            reminders={reminders}
            refills={refills}
            onAlertTriggered={loadPatientData}
          />
        )}

        {/* TAB 1: MEDICINE REMINDERS SCHEDULE */}
        {activeTab === 'reminders' && (
          <div className="space-y-6">
            {/* Quick Caregiver SMS Info Callout */}
            <div className="p-4 rounded-2xl bg-indigo-950/40 border border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div>
                  <div className="font-bold text-white flex items-center gap-1.5">
                    <span>Caregiver SMS & Alternate Phone Protection Active</span>
                    <span className="text-[10px] px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 rounded font-mono">
                      Online
                    </span>
                  </div>
                  <p className="text-slate-300 text-[11px] mt-0.5">
                    Medicine reminders and urgent missed dose alerts are automatically forwarded via SMS to your designated caregiver's alternate number.
                  </p>
                </div>
              </div>
              <button
                id="btn-goto-caregiver-sms-from-reminders"
                onClick={() => setActiveTab('caregiver')}
                className="px-3.5 py-1.5 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-semibold whitespace-nowrap transition cursor-pointer flex items-center gap-1 shrink-0"
              >
                <span>Manage Alternate Number & SMS</span>
                <span>→</span>
              </button>
            </div>
            {slots.map((slot) => {
              const slotReminders = reminders.filter(
                (r) => r.slot.toLowerCase() === slot.name.toLowerCase()
              );

              return (
                <div key={slot.name} className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <slot.icon className="w-4 h-4 text-teal-400" />
                      <h3 className="text-sm font-bold text-white">{slot.name} Medications</h3>
                      <span className="text-xs text-slate-400 font-mono">({slot.desc})</span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
                      {slotReminders.length} scheduled
                    </span>
                  </div>

                  {slotReminders.length === 0 ? (
                    <div className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 text-xs text-slate-500 italic">
                      No medicines scheduled for {slot.name.toLowerCase()}.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {slotReminders.map((rem) => {
                        const isTaken = rem.today_status === 'taken';
                        const isSnoozed = rem.today_status === 'snoozed';

                        return (
                          <div
                            key={rem.id}
                            className={`p-4 rounded-xl border transition space-y-3 ${
                              isTaken
                                ? 'bg-teal-950/20 border-teal-500/30'
                                : 'bg-slate-800/80 border-slate-700'
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-2">
                                  <h4 className="text-sm font-bold text-white">{rem.medicine_name}</h4>
                                  {isTaken && (
                                    <span className="text-[10px] bg-teal-500/20 text-teal-300 px-2 py-0.5 rounded font-medium border border-teal-500/30">
                                      Taken ✅
                                    </span>
                                  )}
                                  {isSnoozed && (
                                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-medium border border-amber-500/30">
                                      Snoozed ⏰
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-teal-400 font-medium">{rem.dosage}</p>
                              </div>

                              <div className="flex items-center gap-1.5 text-xs text-slate-300 font-mono bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-700">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>{rem.reminder_time}</span>
                              </div>
                            </div>

                            {rem.instructions && (
                              <p className="text-xs text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                                <strong>Instructions:</strong> {rem.instructions}
                              </p>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[11px] text-slate-400">
                                {isTaken
                                  ? `Recorded at ${new Date(rem.taken_at || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                                  : 'Due for intake'}
                              </span>

                              <div className="flex items-center gap-2">
                                {!isTaken ? (
                                  <>
                                    <button
                                      id={`btn-snooze-${rem.id}`}
                                      type="button"
                                      onClick={() => handleAction(rem.id, 'snoozed')}
                                      className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-medium transition cursor-pointer"
                                    >
                                      Snooze
                                    </button>
                                    <button
                                      id={`btn-missed-${rem.id}`}
                                      type="button"
                                      onClick={() => handleAction(rem.id, 'missed')}
                                      className="px-2.5 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-medium border border-rose-500/30 transition cursor-pointer"
                                      title="Mark as missed - triggers urgent caregiver SMS escalation"
                                    >
                                      Missed
                                    </button>
                                    <button
                                      id={`btn-take-dose-${rem.id}`}
                                      type="button"
                                      onClick={() => handleAction(rem.id, 'taken')}
                                      className="px-3.5 py-1.5 rounded-lg bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold transition shadow-md shadow-teal-500/20 cursor-pointer flex items-center gap-1"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Mark as Taken</span>
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => handleAction(rem.id, 'snoozed')}
                                    className="text-[11px] text-slate-400 hover:text-slate-200 underline"
                                  >
                                    Change status
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: MY E-PRESCRIPTIONS */}
        {activeTab === 'prescriptions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white">My Certified Electronic Prescriptions</h2>
                <p className="text-xs text-slate-400">Issued by your authorized doctors with digital verification</p>
              </div>
              <span className="text-xs font-mono text-teal-400 bg-slate-800 px-3 py-1 rounded-lg border border-slate-700">
                SQL: SELECT * FROM prescriptions WHERE patient_id = ?
              </span>
            </div>

            {prescriptions.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-800/40 border border-slate-700 text-center text-slate-400">
                No prescriptions found for your account.
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
                        <h3 className="text-sm font-bold text-white mt-1.5">{rx.doctor_name}</h3>
                        <p className="text-xs text-slate-400">{rx.doctor_specialization}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        {new Date(rx.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 text-xs space-y-1">
                      <div><strong className="text-slate-300">Diagnosis:</strong> <span className="text-teal-300">{rx.diagnosis}</span></div>
                      {rx.notes && <div><strong className="text-slate-400">Doctor's Advice:</strong> <span className="text-slate-300">{rx.notes}</span></div>}
                      <div className="text-[11px] text-slate-400 pt-1">Valid Until: {rx.valid_until || 'N/A'}</div>
                    </div>

                    <div className="border-t border-slate-700/60 pt-3 flex items-center justify-between">
                      <span className="text-xs text-slate-400">{rx.items?.length || 0} Medications</span>
                      <button
                        id={`btn-patient-view-rx-${rx.id}`}
                        onClick={() => setSelectedRx(rx)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-teal-500/15 text-teal-300 hover:bg-teal-500/25 text-xs font-medium border border-teal-500/30 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>View & Print Slip</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: MEDICINE GUIDE & SEARCH */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-bold text-white">Medicine Knowledge & Search Directory</h2>
                <p className="text-xs text-slate-400">Look up drug information, precautions, food interactions, and side effects</p>
              </div>

              <div className="w-full sm:w-72 relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search medicine or generic..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMedicines.map((med) => (
                <div key={med.id} className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 space-y-2">
                  <div className="flex items-start justify-between">
                    <h3 className="text-sm font-bold text-white">{med.name}</h3>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-900 text-teal-400 border border-slate-700 font-medium">
                      {med.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 italic">Generic: {med.generic_name}</p>
                  <div className="text-xs space-y-1.5 pt-2 border-t border-slate-700/60">
                    <div className="text-slate-300">
                      <strong className="text-teal-400">Standard Dose:</strong> {med.dosage_form} ({med.default_dosage})
                    </div>
                    <div className="text-slate-300">
                      <strong className="text-amber-400">Precautions:</strong> {med.precautions}
                    </div>
                    <div className="text-slate-400">
                      <strong>Side Effects:</strong> {med.side_effects}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* CUSTOM REMINDER MODAL */}
      {showAddCustomModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 text-slate-100 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Pill className="w-4 h-4 text-teal-400" />
                <span>Add Custom Medicine Reminder</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowAddCustomModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCustomReminder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Medicine Name / Supplement</label>
                <input
                  type="text"
                  required
                  value={customMedName}
                  onChange={(e) => setCustomMedName(e.target.value)}
                  placeholder="e.g. Vitamin D3, Omega 3, Eye Drops"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Dosage</label>
                  <input
                    type="text"
                    required
                    value={customDosage}
                    onChange={(e) => setCustomDosage(e.target.value)}
                    placeholder="e.g. 1 Capsule, 2 Drops"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Time</label>
                  <input
                    type="time"
                    required
                    value={customTime}
                    onChange={(e) => setCustomTime(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Schedule Slot</label>
                <select
                  value={customSlot}
                  onChange={(e) => setCustomSlot(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                >
                  <option value="Morning">Morning</option>
                  <option value="Afternoon">Afternoon</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Instructions</label>
                <input
                  type="text"
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  placeholder="e.g. Take with milk, after dinner"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomModal(false)}
                  className="px-3 py-2 rounded-xl bg-slate-700 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 text-xs font-bold"
                >
                  Save Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RX SLIP PREVIEW MODAL */}
      {selectedRx && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 shadow-2xl relative space-y-6">
            
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

            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
              <div>
                <div className="text-[11px] uppercase font-bold text-teal-800">Prescribing Doctor</div>
                <div className="text-sm font-bold text-slate-900">{selectedRx.doctor_name}</div>
                <div className="text-slate-600">{selectedRx.doctor_specialization}</div>
              </div>
              <div>
                <div className="text-[11px] uppercase font-bold text-teal-800">Patient</div>
                <div className="text-sm font-bold text-slate-900">{selectedRx.patient_name}</div>
                <div className="text-slate-600">Email: {selectedRx.patient_email}</div>
              </div>
            </div>

            <div>
              <div className="text-xs uppercase font-bold text-slate-500">Clinical Diagnosis</div>
              <div className="text-base font-bold text-teal-950 mt-0.5">{selectedRx.diagnosis}</div>
            </div>

            <div>
              <div className="text-xs uppercase font-bold text-slate-500 mb-2">Prescribed Medicines</div>
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

            {selectedRx.notes && (
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <strong>Doctor's Notes:</strong> {selectedRx.notes}
              </div>
            )}

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

      {/* Alerts & Notification Messages Center Drawer */}
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
        onRefreshAlerts={loadPatientData}
      />

      {/* Schedule Medication Refill Modal */}
      <RefillScheduleModal
        isOpen={showRefillModal}
        onClose={() => setShowRefillModal(false)}
        patientId={user.id}
        prescriptions={prescriptions}
        medicines={medicines}
        onSuccess={loadPatientData}
      />

    </div>
  );
};
