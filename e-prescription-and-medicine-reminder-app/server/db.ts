import initSqlJs, { Database } from "sql.js";
import fs from "fs";
import path from "path";

let dbInstance: Database | null = null;
const DB_FILE = path.join(process.cwd(), "data", "app.sqlite");

export async function getDb(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const SQL = await initSqlJs();
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (e) {
      console.warn("Could not load existing db file, creating fresh:", e);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  initializeTables(dbInstance);
  saveDb(dbInstance);
  return dbInstance;
}

export function saveDb(db: Database) {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error("Error saving database to file:", err);
  }
}

function initializeTables(db: Database) {
  // Create tables using real SQL DDL
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('doctor', 'patient')),
      specialization TEXT,
      phone TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medicines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      generic_name TEXT,
      category TEXT,
      dosage_form TEXT,
      default_dosage TEXT,
      side_effects TEXT,
      precautions TEXT
    );

    CREATE TABLE IF NOT EXISTS prescriptions (
      id TEXT PRIMARY KEY,
      prescription_number TEXT UNIQUE NOT NULL,
      doctor_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      diagnosis TEXT NOT NULL,
      notes TEXT,
      valid_until TEXT,
      status TEXT DEFAULT 'active',
      created_at TEXT NOT NULL,
      FOREIGN KEY(doctor_id) REFERENCES users(id),
      FOREIGN KEY(patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS prescription_items (
      id TEXT PRIMARY KEY,
      prescription_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      frequency TEXT NOT NULL,
      duration TEXT NOT NULL,
      timing TEXT NOT NULL,
      instructions TEXT,
      FOREIGN KEY(prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      prescription_item_id TEXT,
      medicine_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      reminder_time TEXT NOT NULL,
      slot TEXT NOT NULL,
      instructions TEXT,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS medicine_logs (
      id TEXT PRIMARY KEY,
      reminder_id TEXT,
      patient_id TEXT NOT NULL,
      medicine_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      scheduled_time TEXT NOT NULL,
      taken_at TEXT,
      status TEXT NOT NULL, -- 'taken', 'missed', 'snoozed'
      notes TEXT,
      date TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS refill_schedules (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      prescription_id TEXT,
      medicine_name TEXT NOT NULL,
      dosage TEXT NOT NULL,
      current_quantity INTEGER NOT NULL DEFAULT 30,
      remaining_quantity INTEGER NOT NULL DEFAULT 10,
      refills_allowed INTEGER NOT NULL DEFAULT 2,
      refills_completed INTEGER NOT NULL DEFAULT 0,
      scheduled_refill_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'requested', 'approved', 'dispensed', 'rejected'
      pharmacy_name TEXT DEFAULT 'Apollo Health Pharmacy',
      doctor_id TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES users(id),
      FOREIGN KEY(prescription_id) REFERENCES prescriptions(id)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL, -- 'refill_due', 'low_stock', 'missed_dose', 'upcoming_dose', 'rx_expiry', 'refill_approved', 'refill_requested'
      severity TEXT NOT NULL, -- 'urgent', 'warning', 'info'
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      related_entity_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS caregivers (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      name TEXT NOT NULL,
      relationship TEXT NOT NULL,
      alternate_phone TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      notify_on_reminder INTEGER NOT NULL DEFAULT 1,
      notify_on_missed INTEGER NOT NULL DEFAULT 1,
      notify_on_low_stock INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS sms_logs (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      caregiver_id TEXT,
      recipient_name TEXT NOT NULL,
      recipient_phone TEXT NOT NULL,
      message TEXT NOT NULL,
      alert_type TEXT NOT NULL, -- 'dose_reminder', 'missed_dose', 'low_stock_warning', 'refill_alert', 'manual_test', 'doctor_note'
      status TEXT NOT NULL DEFAULT 'delivered', -- 'delivered', 'sent', 'failed'
      carrier_status TEXT DEFAULT 'Carrier ACK: SMS Delivered (HTTP 200 OK)',
      created_at TEXT NOT NULL,
      FOREIGN KEY(patient_id) REFERENCES users(id)
    );
  `);

  // Seed default data if empty
  const userCheck = db.exec("SELECT COUNT(*) as count FROM users;");
  const count = userCheck[0]?.values[0]?.[0] as number;

  if (!count || count === 0) {
    seedDatabase(db);
    seedRefillsAndAlerts(db);
    seedCaregiversAndSms(db);
  } else {
    // Check if refill_schedules is empty and seed if needed
    const refillCheck = db.exec("SELECT COUNT(*) as count FROM refill_schedules;");
    const refillCount = refillCheck[0]?.values[0]?.[0] as number;
    if (!refillCount || refillCount === 0) {
      seedRefillsAndAlerts(db);
    }

    // Check if caregivers is empty and seed if needed
    const caregiverCheck = db.exec("SELECT COUNT(*) as count FROM caregivers;");
    const caregiverCount = caregiverCheck[0]?.values[0]?.[0] as number;
    if (!caregiverCount || caregiverCount === 0) {
      seedCaregiversAndSms(db);
    }
  }
}

function seedCaregiversAndSms(db: Database) {
  const now = new Date().toISOString();
  const earlierToday = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Caregiver contacts with alternate phone numbers
  db.run(`
    INSERT INTO caregivers (id, patient_id, name, relationship, alternate_phone, is_active, notify_on_reminder, notify_on_missed, notify_on_low_stock, created_at, updated_at)
    VALUES
    ('cg-1', 'pat-1', 'Ramesh Balineni', 'Father / Family Caregiver', '+91 94401 88990', 1, 1, 1, 1, '${now}', '${now}'),
    ('cg-2', 'pat-2', 'Venkatesh G', 'Brother / Sibling', '+91 99887 66554', 1, 1, 1, 1, '${now}', '${now}'),
    ('cg-3', 'pat-3', 'Sharada V', 'Mother / Guardian', '+91 98223 11223', 1, 1, 1, 0, '${now}', '${now}');
  `);

  // Seed sample SMS logs to show caregiver notification audit trail
  db.run(`
    INSERT INTO sms_logs (id, patient_id, caregiver_id, recipient_name, recipient_phone, message, alert_type, status, carrier_status, created_at)
    VALUES
    ('sms-1', 'pat-1', 'cg-1', 'Ramesh Balineni', '+91 94401 88990', '[RxCare ALERT] Dose Reminder: Likhitha B has scheduled dose of Amoxicillin 500mg at 08:30 today (After breakfast). Please ensure timely adherence.', 'dose_reminder', 'delivered', 'Carrier ACK: Airtel-SMS Gateway Delivered (HTTP 200 OK)', '${yesterday}'),
    ('sms-2', 'pat-1', 'cg-1', 'Ramesh Balineni', '+91 94401 88990', '[RxCare NOTICE] Supply Alert: Likhitha B has only 4 capsules of Amoxicillin 500mg remaining. Refill request sent to Dr. Rajesh.', 'low_stock_warning', 'delivered', 'Carrier ACK: Jio-Telecom Delivered (HTTP 200 OK)', '${earlierToday}');
  `);
}

function seedRefillsAndAlerts(db: Database) {
  const now = new Date().toISOString();
  const today = new Date();
  const in3Days = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  const in7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Seed refill schedules
  db.run(`
    INSERT INTO refill_schedules (id, patient_id, prescription_id, medicine_name, dosage, current_quantity, remaining_quantity, refills_allowed, refills_completed, scheduled_refill_date, status, pharmacy_name, doctor_id, notes, created_at, updated_at)
    VALUES
    ('ref-1', 'pat-1', 'rx-1001', 'Amoxicillin 500mg', '1 Capsule (500mg)', 20, 4, 2, 0, '${in3Days}', 'requested', 'Apollo Pharmacy - Main Branch', 'doc-1', 'Patient requested early refill due to 5-day antibiotic course completion schedule', '${now}', '${now}'),
    ('ref-2', 'pat-1', 'rx-1001', 'Pantoprazole 40mg', '1 Tablet (40mg)', 30, 8, 3, 1, '${in7Days}', 'scheduled', 'Apollo Pharmacy - Main Branch', 'doc-1', 'Scheduled auto-refill for gastric acid management', '${now}', '${now}'),
    ('ref-3', 'pat-2', NULL, 'Metformin 500mg', '1 Tablet (500mg)', 60, 15, 4, 1, '${in7Days}', 'approved', 'MedPlus Healthcare Pharmacy', 'doc-1', 'Routine diabetic maintenance refill authorized by Dr. Rajesh', '${now}', '${now}');
  `);

  // Seed initial alerts
  db.run(`
    INSERT INTO alerts (id, user_id, type, severity, title, message, related_entity_id, is_read, created_at)
    VALUES
    ('alt-1', 'pat-1', 'low_stock', 'urgent', 'Critical Low Stock Alert', 'Only 4 capsules of Amoxicillin 500mg remaining. Refill has been requested with Dr. Rajesh.', 'ref-1', 0, '${now}'),
    ('alt-2', 'pat-1', 'refill_due', 'warning', 'Scheduled Refill Approaching', 'Pantoprazole 40mg refill is scheduled for ${in7Days}. Confirm pickup pharmacy.', 'ref-2', 0, '${now}'),
    ('alt-3', 'pat-1', 'upcoming_dose', 'info', 'Next Dose Alert', 'Amoxicillin 500mg dose scheduled at 20:30. Take after dinner with water.', 'rem-3', 0, '${now}'),
    ('alt-4', 'doc-1', 'refill_requested', 'warning', 'New Refill Request Pending', 'Patient Likhitha B requested a refill authorization for Amoxicillin 500mg (4 doses remaining).', 'ref-1', 0, '${now}');
  `);
}

function seedDatabase(db: Database) {
  // Seed Users: Doctors & Patients (including authors from abstract: Likhitha .B, Keerthana.G, Chinmayi Seshna.V)
  const now = new Date().toISOString();

  // Doctors
  db.run(`
    INSERT INTO users (id, name, email, password, role, specialization, phone, created_at)
    VALUES 
    ('doc-1', 'Dr. Rajesh Sharma, MD', 'dr.rajesh@health.org', 'doctor123', 'doctor', 'General Physician & Diabetologist', '+91 98450 12345', '${now}'),
    ('doc-2', 'Dr. Priya Patel, MBBS, MD', 'dr.priya@cardio.org', 'doctor123', 'doctor', 'Cardiologist & Internal Medicine', '+91 98450 67890', '${now}');
  `);

  // Patients
  db.run(`
    INSERT INTO users (id, name, email, password, role, specialization, phone, created_at)
    VALUES 
    ('pat-1', 'Likhitha B', 'likhitha@gmail.com', 'patient123', 'patient', NULL, '+91 78159 26816', '${now}'),
    ('pat-2', 'Keerthana G', 'keerthana@gmail.com', 'patient123', 'patient', NULL, '+91 94401 22334', '${now}'),
    ('pat-3', 'Chinmayi Seshna V', 'chinmayi@gmail.com', 'patient123', 'patient', NULL, '+91 91234 55678', '${now}');
  `);

  // Seed Medicines Catalog
  db.run(`
    INSERT INTO medicines (id, name, generic_name, category, dosage_form, default_dosage, side_effects, precautions)
    VALUES
    ('med-1', 'Amoxicillin 500mg', 'Amoxicillin Trihydrate', 'Antibiotic', 'Capsule', '500mg', 'Mild nausea, rash', 'Complete full course even if feeling better. Take with or after food.'),
    ('med-2', 'Metformin 500mg', 'Metformin Hydrochloride', 'Antidiabetic', 'Tablet', '500mg', 'Stomach upset, metallic taste', 'Take with meals to reduce gastrointestinal irritation.'),
    ('med-3', 'Paracetamol 650mg', 'Acetaminophen', 'Analgesic & Antipyretic', 'Tablet', '650mg', 'Rare if taken as directed', 'Do not exceed 3000mg per day. Avoid with alcohol.'),
    ('med-4', 'Pantoprazole 40mg', 'Pantoprazole Sodium', 'Proton Pump Inhibitor (Antacid)', 'Tablet', '40mg', 'Headache, flatulence', 'Take 30 minutes before breakfast in the morning on empty stomach.'),
    ('med-5', 'Cetirizine 10mg', 'Cetirizine Dihydrochloride', 'Antihistamine', 'Tablet', '10mg', 'Mild drowsiness', 'Take at bedtime. Avoid driving if feeling sleepy.'),
    ('med-6', 'Atorvastatin 20mg', 'Atorvastatin Calcium', 'Lipid-lowering / Statin', 'Tablet', '20mg', 'Muscle aches, fatigue', 'Take at night after dinner for maximum cholesterol synthesis inhibition.'),
    ('med-7', 'Azithromycin 500mg', 'Azithromycin Dihydrate', 'Macrolide Antibiotic', 'Tablet', '500mg', 'Abdominal cramp, diarrhea', 'Take 1 hour before or 2 hours after meals with full glass of water.');
  `);

  // Seed Sample Electronic Prescription for Likhitha B by Dr. Rajesh Sharma
  const rxId = "rx-1001";
  const rxNum = "RX-2026-0891";
  const validUntil = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  db.run(`
    INSERT INTO prescriptions (id, prescription_number, doctor_id, patient_id, diagnosis, notes, valid_until, status, created_at)
    VALUES ('${rxId}', '${rxNum}', 'doc-1', 'pat-1', 'Acute Pharyngitis with Mild Gastritis', 'Stay hydrated, warm salt water gargle 3 times daily, avoid spicy oily food.', '${validUntil}', 'active', '${now}');
  `);

  // Seed Prescription Items
  db.run(`
    INSERT INTO prescription_items (id, prescription_id, medicine_name, dosage, frequency, duration, timing, instructions)
    VALUES
    ('item-1', '${rxId}', 'Amoxicillin 500mg', '1 Capsule (500mg)', 'Twice Daily (1-0-1)', '5 Days', 'After Meals', 'Take morning at 8:00 AM and night at 8:00 PM with water.'),
    ('item-2', '${rxId}', 'Pantoprazole 40mg', '1 Tablet (40mg)', 'Once Daily (1-0-0)', '7 Days', 'Before Breakfast', 'Take early morning on empty stomach with warm water.'),
    ('item-3', '${rxId}', 'Paracetamol 650mg', '1 Tablet (650mg)', 'As Needed (SOS) max 3 times', '3 Days', 'After Food', 'Take only if fever > 100°F or severe throat pain.');
  `);

  // Seed Today's Active Reminders for Patient 1 (Likhitha B)
  db.run(`
    INSERT INTO reminders (id, patient_id, prescription_item_id, medicine_name, dosage, reminder_time, slot, instructions, is_active, created_at)
    VALUES
    ('rem-1', 'pat-1', 'item-2', 'Pantoprazole 40mg', '1 Tablet', '07:30', 'Morning', 'Take 30 mins before breakfast on empty stomach', 1, '${now}'),
    ('rem-2', 'pat-1', 'item-1', 'Amoxicillin 500mg', '1 Capsule', '08:30', 'Morning', 'Take after breakfast with water', 1, '${now}'),
    ('rem-3', 'pat-1', 'item-1', 'Amoxicillin 500mg', '1 Capsule', '20:30', 'Night', 'Take after dinner with water', 1, '${now}'),
    ('rem-4', 'pat-1', 'item-3', 'Paracetamol 650mg', '1 Tablet', '14:00', 'Afternoon', 'Take after lunch if fever persists', 1, '${now}');
  `);

  // Seed some logs for history
  const todayStr = new Date().toISOString().split("T")[0];
  db.run(`
    INSERT INTO medicine_logs (id, reminder_id, patient_id, medicine_name, dosage, scheduled_time, taken_at, status, notes, date)
    VALUES
    ('log-1', 'rem-1', 'pat-1', 'Pantoprazole 40mg', '1 Tablet', '07:30', '${todayStr}T07:32:00.000Z', 'taken', 'Taken on time before tea', '${todayStr}'),
    ('log-2', 'rem-2', 'pat-1', 'Amoxicillin 500mg', '1 Capsule', '08:30', '${todayStr}T08:35:00.000Z', 'taken', 'Taken after breakfast', '${todayStr}');
  `);
}

// Helper to query and return JSON objects
export function querySql(db: Database, sql: string, params: any[] = []): Record<string, any>[] {
  const stmt = db.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }
  const results: Record<string, any>[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}
