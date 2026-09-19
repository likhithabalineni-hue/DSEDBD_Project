export type UserRole = 'doctor' | 'patient';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  specialization?: string | null;
  phone?: string | null;
  created_at: string;
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  timing: string;
  instructions?: string;
}

export interface Prescription {
  id: string;
  prescription_number: string;
  doctor_id: string;
  patient_id: string;
  doctor_name: string;
  doctor_specialization?: string | null;
  doctor_phone?: string | null;
  patient_name: string;
  patient_phone?: string | null;
  patient_email?: string;
  diagnosis: string;
  notes?: string;
  valid_until?: string;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  items?: PrescriptionItem[];
}

export interface Reminder {
  id: string;
  patient_id: string;
  prescription_item_id?: string | null;
  medicine_name: string;
  dosage: string;
  reminder_time: string;
  slot: string; // 'Morning' | 'Afternoon' | 'Evening' | 'Night'
  instructions?: string;
  is_active: number;
  today_status?: 'taken' | 'snoozed' | 'missed' | null;
  taken_at?: string | null;
  log_id?: string | null;
}

export interface Medicine {
  id: string;
  name: string;
  generic_name: string;
  category: string;
  dosage_form: string;
  default_dosage: string;
  side_effects: string;
  precautions: string;
}

export interface AdherenceStats {
  total_scheduled_today: number;
  taken_today: number;
  adherence_percentage: number;
  history: Array<{
    date: string;
    total_logged: number;
    taken_count: number;
  }>;
}

export interface SqlQueryResult {
  success: boolean;
  type?: string;
  query?: string;
  rowCount?: number;
  executionTimeMs?: number;
  data?: Record<string, any>[];
  message?: string;
  error?: string;
}

export type AlertType = 'refill_due' | 'low_stock' | 'missed_dose' | 'upcoming_dose' | 'rx_expiry' | 'refill_approved' | 'refill_requested';
export type AlertSeverity = 'urgent' | 'warning' | 'info';

export interface AlertMessage {
  id: string;
  user_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_entity_id?: string | null;
  is_read: number;
  created_at: string;
}

export type RefillStatus = 'scheduled' | 'requested' | 'approved' | 'dispensed' | 'rejected';

export interface CaregiverContact {
  id: string;
  patient_id: string;
  name: string;
  relationship: string;
  alternate_phone: string;
  is_active: number;
  notify_on_reminder: number;
  notify_on_missed: number;
  notify_on_low_stock: number;
  created_at: string;
  updated_at: string;
}

export type SmsAlertType = 'dose_reminder' | 'missed_dose' | 'low_stock_warning' | 'refill_alert' | 'manual_test' | 'doctor_note';

export interface SmsLog {
  id: string;
  patient_id: string;
  caregiver_id?: string | null;
  recipient_name: string;
  recipient_phone: string;
  message: string;
  alert_type: SmsAlertType;
  status: 'delivered' | 'sent' | 'failed';
  carrier_status?: string;
  created_at: string;
}

export interface RefillSchedule {
  id: string;
  patient_id: string;
  patient_name?: string;
  patient_phone?: string;
  prescription_id?: string | null;
  prescription_number?: string | null;
  medicine_name: string;
  dosage: string;
  current_quantity: number;
  remaining_quantity: number;
  refills_allowed: number;
  refills_completed: number;
  scheduled_refill_date: string;
  status: RefillStatus;
  pharmacy_name?: string;
  doctor_id?: string;
  doctor_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

