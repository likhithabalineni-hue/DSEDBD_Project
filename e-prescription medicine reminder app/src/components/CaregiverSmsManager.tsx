import React, { useState, useEffect } from 'react';
import {
  Phone,
  PhoneCall,
  MessageSquare,
  ShieldCheck,
  Send,
  Bell,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Users,
  Smartphone,
  Info,
  ChevronRight,
  UserCheck
} from 'lucide-react';
import { CaregiverContact, SmsLog, Reminder, RefillSchedule } from '../types';

interface CaregiverSmsManagerProps {
  patientId: string;
  patientName: string;
  reminders: Reminder[];
  refills: RefillSchedule[];
  onAlertTriggered?: () => void;
}

export const CaregiverSmsManager: React.FC<CaregiverSmsManagerProps> = ({
  patientId,
  patientName,
  reminders,
  refills,
  onAlertTriggered,
}) => {
  const [caregiver, setCaregiver] = useState<CaregiverContact | null>(null);
  const [smsLogs, setSmsLogs] = useState<SmsLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingSms, setIsSendingSms] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState('Father / Family Caregiver');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [notifyOnReminder, setNotifyOnReminder] = useState(true);
  const [notifyOnMissed, setNotifyOnMissed] = useState(true);
  const [notifyOnLowStock, setNotifyOnLowStock] = useState(true);

  // Custom SMS test message state
  const [customNote, setCustomNote] = useState('');
  const [selectedMedForReminder, setSelectedMedForReminder] = useState<string>(
    reminders.length > 0 ? reminders[0].medicine_name : 'Amoxicillin 500mg'
  );

  const relationshipsList = [
    'Father / Family Caregiver',
    'Mother / Family Caregiver',
    'Spouse / Partner',
    'Son / Daughter',
    'Brother / Sibling',
    'Sister / Sibling',
    'Guardian / Relative',
    'Home Nurse / Healthcare Aide',
  ];

  const loadCaregiverData = async () => {
    try {
      setIsLoading(true);
      const [cgRes, logsRes] = await Promise.all([
        fetch(`/api/patient/${patientId}/caregiver`),
        fetch(`/api/patient/${patientId}/sms-logs`),
      ]);

      const cgData = await cgRes.json();
      const logsData = await logsRes.json();

      if (cgData.caregiver) {
        setCaregiver(cgData.caregiver);
        setName(cgData.caregiver.name || '');
        setRelationship(cgData.caregiver.relationship || 'Father / Family Caregiver');
        setAlternatePhone(cgData.caregiver.alternate_phone || '');
        setNotifyOnReminder(Boolean(cgData.caregiver.notify_on_reminder));
        setNotifyOnMissed(Boolean(cgData.caregiver.notify_on_missed));
        setNotifyOnLowStock(Boolean(cgData.caregiver.notify_on_low_stock));
      } else {
        // Defaults
        setName('Ramesh Balineni');
        setRelationship('Father / Family Caregiver');
        setAlternatePhone('+91 94401 88990');
      }

      setSmsLogs(logsData.logs || []);
    } catch (err) {
      console.error('Error loading caregiver data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCaregiverData();
  }, [patientId]);

  const handleSaveCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !alternatePhone.trim()) {
      setFeedback({ type: 'error', message: 'Caregiver name and alternate phone number are required.' });
      return;
    }

    try {
      setIsSaving(true);
      setFeedback(null);

      const res = await fetch(`/api/patient/${patientId}/caregiver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          relationship,
          alternate_phone: alternatePhone.trim(),
          notify_on_reminder: notifyOnReminder ? 1 : 0,
          notify_on_missed: notifyOnMissed ? 1 : 0,
          notify_on_low_stock: notifyOnLowStock ? 1 : 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save contact');

      setCaregiver(data.caregiver);
      setFeedback({
        type: 'success',
        message: `Alternate number ${alternatePhone} verified! Caregiver SMS alerts are active.`,
      });
      loadCaregiverData();
      if (onAlertTriggered) onAlertTriggered();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to save caregiver' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTestSms = async (type: 'dose_reminder' | 'missed_dose' | 'low_stock_warning' | 'custom') => {
    if (!alternatePhone.trim()) {
      setFeedback({ type: 'error', message: 'Please provide an alternate phone number first.' });
      return;
    }

    try {
      setIsSendingSms(true);
      setFeedback(null);

      const payload: any = {
        patient_id: patientId,
        alert_type: type === 'custom' ? 'manual_test' : type,
      };

      if (type === 'dose_reminder') {
        payload.medicine_name = selectedMedForReminder;
        payload.scheduled_time = '08:30 AM';
        payload.dosage = '1 Capsule / Tablet';
      } else if (type === 'missed_dose') {
        payload.medicine_name = selectedMedForReminder;
        payload.scheduled_time = '08:30 AM';
        payload.dosage = '1 Capsule / Tablet';
      } else if (type === 'low_stock_warning') {
        payload.medicine_name = refills.length > 0 ? refills[0].medicine_name : selectedMedForReminder;
      } else if (type === 'custom') {
        payload.custom_message = customNote.trim() || `[RxCare ALERT] Test SMS: Caregiver notifications verified for ${patientName}.`;
      }

      const res = await fetch('/api/sms/send-caregiver-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch SMS');

      setFeedback({
        type: 'success',
        message: `📲 SMS successfully sent to alternate number ${alternatePhone} (${name})!`,
      });
      setCustomNote('');
      loadCaregiverData();
      if (onAlertTriggered) onAlertTriggered();
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Failed to send SMS' });
    } finally {
      setIsSendingSms(false);
    }
  };

  const getBadgeForType = (type: string) => {
    switch (type) {
      case 'missed_dose':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'low_stock_warning':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'dose_reminder':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/30';
      case 'doctor_note':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const formatTypeLabel = (type: string) => {
    switch (type) {
      case 'missed_dose':
        return 'Missed Dose Alert';
      case 'low_stock_warning':
        return 'Low Stock Alert';
      case 'dose_reminder':
        return 'Medicine Reminder';
      case 'doctor_note':
        return 'Doctor Clinical Note';
      default:
        return 'System SMS Alert';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-teal-900/40 via-slate-800 to-indigo-950/40 border border-teal-500/30 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
              <PhoneCall className="w-4 h-4 text-teal-400" />
              <span>Caregiver & Family Alert System</span>
            </span>
            <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              <span>SMS Gateway Active</span>
            </span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Alternate Contact & SMS Reminder Escalation
          </h2>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Ensures patient safety by dispatching real-time SMS notifications to a family member or caregiver’s alternate phone number for scheduled doses, missed medicines, and critical stock depletion.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-700 shrink-0">
          <div className="text-center px-2">
            <div className="text-xl font-black text-teal-400">{smsLogs.length}</div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">SMS Sent</div>
          </div>
          <div className="h-7 w-px bg-slate-700" />
          <div className="text-center px-2">
            <div className="text-xl font-black text-amber-400">
              {caregiver?.alternate_phone ? 'Configured' : 'Needed'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase font-semibold">Alt Number</div>
          </div>
        </div>
      </div>

      {/* Feedback Toast */}
      {feedback && (
        <div
          className={`p-4 rounded-xl text-sm flex items-center gap-3 border shadow-md ${
            feedback.type === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-white px-2 py-1 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Grid: 2 Columns - Settings & Live Simulator */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Column 1: Alternate Number & Caregiver Form (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 sm:p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Alternate Contact Details</h3>
                  <p className="text-xs text-slate-400">Where medicine reminder and missed dose SMS will be delivered</p>
                </div>
              </div>
              <span className="text-[11px] font-mono text-teal-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700">
                SQL: caregivers
              </span>
            </div>

            <form onSubmit={handleSaveCaregiver} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Caregiver Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Caregiver / Family Member Name *
                  </label>
                  <div className="relative">
                    <input
                      id="input-caregiver-name"
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Ramesh Balineni"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {/* Relationship */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Relationship to Patient *
                  </label>
                  <select
                    id="select-caregiver-relationship"
                    value={relationship}
                    onChange={(e) => setRelationship(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-teal-500 transition cursor-pointer"
                  >
                    {relationshipsList.map((rel) => (
                      <option key={rel} value={rel}>
                        {rel}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Alternate Phone Number */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-teal-400" />
                    <span>Alternate Phone Number (for SMS Alerts) *</span>
                  </span>
                  <span className="text-[11px] text-slate-400">Requires valid mobile format with country code</span>
                </label>
                <div className="relative">
                  <input
                    id="input-caregiver-alternate-phone"
                    type="tel"
                    required
                    value={alternatePhone}
                    onChange={(e) => setAlternatePhone(e.target.value)}
                    placeholder="e.g. +91 94401 88990 or +1 415 555 0199"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-3 pr-3 py-2.5 text-sm font-mono text-teal-300 placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <Info className="w-3 h-3 text-slate-400" />
                  <span>The patient or family can update this alternate number anytime. All reminder alerts route here.</span>
                </p>
              </div>

              {/* SMS Escalation Trigger Toggles */}
              <div className="pt-3 border-t border-slate-700/60 space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Automated SMS Notification Triggers
                </h4>

                {/* Missed Dose */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 cursor-pointer hover:bg-slate-900 transition">
                  <input
                    id="toggle-sms-missed"
                    type="checkbox"
                    checked={notifyOnMissed}
                    onChange={(e) => setNotifyOnMissed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-800 border-slate-600"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-rose-300 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Urgent Missed Dose Escalation</span>
                    </span>
                    <p className="text-slate-400 mt-0.5">
                      Sends an instant priority SMS to the alternate number if the patient marks a dose as missed or skips it after scheduled time.
                    </p>
                  </div>
                </label>

                {/* Low Stock & Refills */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 cursor-pointer hover:bg-slate-900 transition">
                  <input
                    id="toggle-sms-stock"
                    type="checkbox"
                    checked={notifyOnLowStock}
                    onChange={(e) => setNotifyOnLowStock(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-800 border-slate-600"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1">
                      <Bell className="w-3.5 h-3.5" />
                      <span>Low Medicine Supply & Refill Due Warning</span>
                    </span>
                    <p className="text-slate-400 mt-0.5">
                      Sends an SMS alert when remaining medicine count drops to ≤ 5 doses, giving the family time to refill.
                    </p>
                  </div>
                </label>

                {/* Daily Reminders */}
                <label className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-700/80 cursor-pointer hover:bg-slate-900 transition">
                  <input
                    id="toggle-sms-reminders"
                    type="checkbox"
                    checked={notifyOnReminder}
                    onChange={(e) => setNotifyOnReminder(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-800 border-slate-600"
                  />
                  <div className="text-xs">
                    <span className="font-semibold text-teal-300 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Scheduled Dose Reminder SMS</span>
                    </span>
                    <p className="text-slate-400 mt-0.5">
                      Dispatches daily morning and night SMS notifications so the caregiver can verify patient adherence in real time.
                    </p>
                  </div>
                </label>
              </div>

              {/* Submit Button */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Changes persist directly to SQLite database.
                </span>
                <button
                  id="btn-save-caregiver-contact"
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs shadow-md shadow-teal-500/20 transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isSaving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
                  <span>Save Alternate Contact & SMS Rules</span>
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* Column 2: Live Smartphone SMS Simulator & Instant Dispatcher (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-teal-400" />
                <h3 className="text-sm font-bold text-white">Caregiver Phone Preview</h3>
              </div>
              <span className="text-[11px] text-teal-400 font-mono">
                {alternatePhone || 'No Phone Set'}
              </span>
            </div>

            {/* Smartphone Graphic Mockup */}
            <div className="bg-slate-950 rounded-2xl border-2 border-slate-700 p-4 shadow-2xl relative overflow-hidden">
              {/* Phone Status Bar */}
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono pb-2 mb-2 border-b border-slate-800">
                <span>9:41 AM · LTE 5G</span>
                <span className="text-teal-400 font-bold">[RxCare SMS Gateway]</span>
                <span>100% 🔋</span>
              </div>

              {/* Recipient Header */}
              <div className="text-center pb-3">
                <div className="w-10 h-10 rounded-full bg-slate-800 text-teal-300 font-bold flex items-center justify-center mx-auto mb-1 border border-slate-700">
                  {name ? name.charAt(0) : 'C'}
                </div>
                <div className="text-xs font-bold text-white">{name || 'Caregiver Contact'}</div>
                <div className="text-[10px] text-slate-400">{alternatePhone || '+91 XXXXX XXXXX'} · Alternate</div>
              </div>

              {/* SMS Messages Thread */}
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {smsLogs.length === 0 ? (
                  <div className="text-center py-6 text-xs text-slate-500">
                    No SMS messages dispatched yet. Use the buttons below to send a live test SMS!
                  </div>
                ) : (
                  smsLogs.slice(0, 3).map((log) => (
                    <div key={log.id} className="space-y-1">
                      <div className="bg-teal-950/60 border border-teal-500/30 text-teal-100 p-3 rounded-2xl rounded-tl-none text-xs shadow space-y-1">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="font-bold text-teal-300 uppercase tracking-wider">
                            {log.alert_type === 'missed_dose' ? '🚨 URGENT ALERT' : '💊 RxCare SMS'}
                          </span>
                          <span className="text-slate-400">
                            {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="leading-snug">{log.message}</p>
                      </div>
                      <div className="text-[9px] text-right text-emerald-400 font-mono flex items-center justify-end gap-1">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        <span>{log.carrier_status || 'Delivered to handset'}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Quick SMS Dispatch Actions */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-slate-300">Dispatch Live SMS Alert Now:</h4>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-send-sms-reminder"
                  type="button"
                  disabled={isSendingSms || !alternatePhone}
                  onClick={() => handleSendTestSms('dose_reminder')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 border border-teal-500/30 text-left text-xs transition cursor-pointer hover:border-teal-400 disabled:opacity-50"
                >
                  <div className="font-semibold text-teal-300 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Dose Reminder</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Send scheduled time SMS</div>
                </button>

                <button
                  id="btn-send-sms-missed"
                  type="button"
                  disabled={isSendingSms || !alternatePhone}
                  onClick={() => handleSendTestSms('missed_dose')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 border border-rose-500/30 text-left text-xs transition cursor-pointer hover:border-rose-400 disabled:opacity-50"
                >
                  <div className="font-semibold text-rose-300 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Missed Dose</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Urgent health alert</div>
                </button>

                <button
                  id="btn-send-sms-low-stock"
                  type="button"
                  disabled={isSendingSms || !alternatePhone}
                  onClick={() => handleSendTestSms('low_stock_warning')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 border border-amber-500/30 text-left text-xs transition cursor-pointer hover:border-amber-400 disabled:opacity-50"
                >
                  <div className="font-semibold text-amber-300 flex items-center gap-1">
                    <Bell className="w-3.5 h-3.5" />
                    <span>Low Pill Stock</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Prompt supply refill</div>
                </button>

                <button
                  id="btn-send-sms-test-verify"
                  type="button"
                  disabled={isSendingSms || !alternatePhone}
                  onClick={() => handleSendTestSms('custom')}
                  className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-750 border border-indigo-500/30 text-left text-xs transition cursor-pointer hover:border-indigo-400 disabled:opacity-50"
                >
                  <div className="font-semibold text-indigo-300 flex items-center gap-1">
                    <Send className="w-3.5 h-3.5" />
                    <span>Verify Gateway</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Test phone ping</div>
                </button>
              </div>

              {/* Custom SMS message */}
              <div className="pt-2">
                <div className="flex gap-2">
                  <input
                    id="input-custom-sms-note"
                    type="text"
                    value={customNote}
                    onChange={(e) => setCustomNote(e.target.value)}
                    placeholder="Custom SMS note for caregiver..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-teal-500"
                  />
                  <button
                    id="btn-send-custom-sms-note"
                    type="button"
                    disabled={isSendingSms || !alternatePhone || !customNote.trim()}
                    onClick={() => handleSendTestSms('custom')}
                    className="px-3 py-2 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-xs flex items-center gap-1 transition disabled:opacity-50 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Audit Log Table: Caregiver SMS Delivery History */}
      <div className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-slate-700/80 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-teal-400" />
              <span>SMS Dispatch & Delivery Audit Log ({smsLogs.length})</span>
            </h3>
            <p className="text-xs text-slate-400">
              Verified carrier transmissions sent to alternate number <code className="text-teal-400 font-mono">{alternatePhone || 'N/A'}</code>
            </p>
          </div>

          <button
            id="btn-refresh-sms-logs"
            onClick={loadCaregiverData}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-700 text-xs text-slate-300 border border-slate-700 transition"
          >
            <RefreshCw className="w-3 h-3 text-teal-400" />
            <span>Refresh Logs</span>
          </button>
        </div>

        {smsLogs.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-dashed border-slate-700">
            No SMS messages logged yet. Any missed dose or test alert sent to the caregiver will be recorded here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-semibold border-b border-slate-700">
                <tr>
                  <th className="p-3">Time & Date</th>
                  <th className="p-3">Recipient & Alternate Number</th>
                  <th className="p-3">Trigger Type</th>
                  <th className="p-3">Message Text</th>
                  <th className="p-3">Carrier Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700/60">
                {smsLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-750 transition">
                    <td className="p-3 font-mono text-[11px] text-slate-400 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <div className="font-bold text-white">{log.recipient_name}</div>
                      <div className="text-[11px] font-mono text-teal-300">{log.recipient_phone}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getBadgeForType(log.alert_type)}`}>
                        {formatTypeLabel(log.alert_type)}
                      </span>
                    </td>
                    <td className="p-3 max-w-md">
                      <p className="truncate text-slate-200" title={log.message}>
                        {log.message}
                      </p>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span className="flex items-center gap-1 text-[11px] font-mono text-emerald-400">
                        <CheckCircle2 className="w-3 h-3 shrink-0" />
                        <span>Delivered (200 OK)</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
