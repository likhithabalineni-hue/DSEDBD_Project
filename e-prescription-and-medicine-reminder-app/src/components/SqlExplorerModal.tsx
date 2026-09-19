import React, { useState, useEffect } from 'react';
import { Database, Play, Terminal, Code2, Copy, Check, Table, Sparkles, RefreshCw } from 'lucide-react';
import { SqlQueryResult } from '../types';

interface SqlExplorerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SqlExplorerModal: React.FC<SqlExplorerModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState<string>(
    `SELECT 
  p.prescription_number,
  doc.name AS doctor_name,
  pat.name AS patient_name,
  p.diagnosis,
  p.status,
  p.created_at
FROM prescriptions p
JOIN users doc ON p.doctor_id = doc.id
JOIN users pat ON p.patient_id = pat.id;`
  );

  const [executing, setExecuting] = useState(false);
  const [result, setResult] = useState<SqlQueryResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [schemas, setSchemas] = useState<Array<{ name: string; sql: string }>>([]);

  const presetQueries = [
    {
      title: 'Joined Prescriptions & Doctors (JOIN)',
      sql: `SELECT 
  p.prescription_number,
  doc.name AS doctor_name,
  pat.name AS patient_name,
  p.diagnosis,
  p.status,
  p.created_at
FROM prescriptions p
JOIN users doc ON p.doctor_id = doc.id
JOIN users pat ON p.patient_id = pat.id;`,
    },
    {
      title: 'All Users & Credential Accounts',
      sql: `SELECT id, name, email, role, phone, created_at FROM users ORDER BY role, name;`,
    },
    {
      title: 'Active Medicine Reminders (SQL)',
      sql: `SELECT 
  r.id,
  u.name AS patient_name,
  r.medicine_name,
  r.dosage,
  r.slot,
  r.reminder_time,
  r.instructions
FROM reminders r
JOIN users u ON r.patient_id = u.id
WHERE r.is_active = 1
ORDER BY r.reminder_time;`,
    },
    {
      title: 'Prescription Line Items with Dosages',
      sql: `SELECT 
  prescription_id,
  medicine_name,
  dosage,
  frequency,
  duration,
  timing
FROM prescription_items;`,
    },
    {
      title: 'Medicines Master Catalog',
      sql: `SELECT id, name, category, default_dosage, precautions FROM medicines;`,
    },
    {
      title: 'Dose Compliance Logs',
      sql: `SELECT 
  id,
  patient_id,
  medicine_name,
  scheduled_time,
  taken_at,
  status,
  date
FROM medicine_logs
ORDER BY date DESC, scheduled_time DESC;`,
    },
    {
      title: 'Refill Schedules & Pill Inventory (SQL)',
      sql: `SELECT 
  rs.id,
  u.name AS patient_name,
  rs.medicine_name,
  rs.dosage,
  rs.remaining_quantity,
  rs.current_quantity,
  rs.scheduled_refill_date,
  rs.status,
  rs.pharmacy_name
FROM refill_schedules rs
JOIN users u ON rs.patient_id = u.id
ORDER BY rs.scheduled_refill_date ASC;`,
    },
    {
      title: 'Alert Messages & Notifications (SQL)',
      sql: `SELECT 
  a.id,
  u.name AS user_name,
  a.type,
  a.severity,
  a.title,
  a.message,
  a.is_read,
  a.created_at
FROM alerts a
JOIN users u ON a.user_id = u.id
ORDER BY a.created_at DESC;`,
    },
    {
      title: 'Caregiver Contacts & Alternate Phone Numbers (SQL)',
      sql: `SELECT 
  cg.id,
  u.name AS patient_name,
  cg.name AS caregiver_name,
  cg.relationship,
  cg.alternate_phone,
  cg.notify_on_reminder,
  cg.notify_on_missed,
  cg.notify_on_low_stock,
  cg.updated_at
FROM caregivers cg
JOIN users u ON cg.patient_id = u.id
ORDER BY u.name;`,
    },
    {
      title: 'Caregiver SMS Dispatch & Delivery Logs (SQL)',
      sql: `SELECT 
  s.id,
  u.name AS patient_name,
  s.recipient_name AS caregiver_recipient,
  s.recipient_phone AS alternate_phone,
  s.alert_type,
  s.message,
  s.carrier_status,
  s.created_at
FROM sms_logs s
JOIN users u ON s.patient_id = u.id
ORDER BY s.created_at DESC;`,
    },
  ];

  const fetchSchema = async () => {
    try {
      const res = await fetch('/api/sql/schema');
      const data = await res.json();
      setSchemas(data.tables || []);
    } catch (err) {
      console.error('Failed to load SQL schema:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchSchema();
      handleRunQuery(query);
    }
  }, [isOpen]);

  const handleRunQuery = async (queryToRun?: string) => {
    const q = queryToRun || query;
    if (!q.trim()) return;

    setExecuting(true);
    try {
      const res = await fetch('/api/sql/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      });
      const data: SqlQueryResult = await res.json();
      setResult(data);
    } catch (err: any) {
      setResult({
        success: false,
        error: err.message || 'Failed to execute query',
      });
    } finally {
      setExecuting(false);
    }
  };

  const handleCopyJson = () => {
    if (!result) return;
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-6">
      <div className="bg-slate-900 border border-slate-700 text-slate-100 rounded-2xl max-w-5xl w-full h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-tight">SQL Query & JSON Inspector</h2>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30">
                  Live SQLite Engine
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Execute relational SQL statements and inspect raw JSON payloads in real time
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyJson}
              disabled={!result}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono border border-slate-700 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-teal-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied JSON!' : 'Copy JSON'}</span>
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Content Body: Split View */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          
          {/* Left: Query Editor & Presets */}
          <div className="lg:col-span-6 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col p-4 sm:p-5 space-y-4 overflow-y-auto">
            {/* Quick Presets */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Preset Relational SQL Queries</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {presetQueries.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setQuery(preset.sql);
                      handleRunQuery(preset.sql);
                    }}
                    className="text-left p-2.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/80 hover:border-amber-500/40 text-xs text-slate-300 transition"
                  >
                    <div className="font-semibold text-white">{preset.title}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate mt-0.5">
                      {preset.sql.replace(/\s+/g, ' ').substring(0, 45)}...
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* SQL Textarea */}
            <div className="flex-1 flex flex-col space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 font-mono">
                  <Terminal className="w-3.5 h-3.5 text-teal-400" />
                  <span>SQL Command</span>
                </label>
                <span className="text-[10px] text-slate-500">Supports SELECT, INSERT, UPDATE, JOIN</span>
              </div>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={7}
                className="w-full flex-1 bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-teal-300 font-mono focus:outline-none focus:border-teal-500 resize-none"
                placeholder="Write standard SQL query here..."
              />
              <div className="flex items-center justify-between pt-1">
                <div className="text-[11px] text-slate-500">
                  Database: <span className="text-slate-300 font-mono">SQLite 3 (Wasm via npm)</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRunQuery()}
                  disabled={executing}
                  className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-2 transition cursor-pointer shadow-md shadow-amber-500/20"
                >
                  {executing ? (
                    <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Execute SQL</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Relational Table Schemas */}
            <div className="pt-2 border-t border-slate-800">
              <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                <Table className="w-3.5 h-3.5 text-teal-400" />
                <span>Database Tables in Schema ({schemas.length})</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {schemas.map((s) => (
                  <button
                    key={s.name}
                    onClick={() => {
                      const q = `SELECT * FROM ${s.name} LIMIT 10;`;
                      setQuery(q);
                      handleRunQuery(q);
                    }}
                    className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-slate-950 text-teal-300 border border-slate-800 hover:border-teal-500 transition"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Real JSON Output & Data Grid */}
          <div className="lg:col-span-6 flex flex-col bg-slate-950/80 p-4 sm:p-5 overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">JSON API Response</span>
              </div>
              {result && (
                <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                  {result.rowCount !== undefined && (
                    <span className="text-teal-400 font-semibold">{result.rowCount} rows</span>
                  )}
                  {result.executionTimeMs !== undefined && (
                    <span>· {result.executionTimeMs}ms</span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 overflow-auto mt-3 rounded-xl bg-slate-950 p-3.5 border border-slate-800 text-xs font-mono text-slate-300">
              {executing ? (
                <div className="flex items-center justify-center h-full text-slate-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-2 border-teal-500 border-t-transparent" />
                </div>
              ) : result ? (
                <pre className="text-emerald-400 leading-relaxed whitespace-pre-wrap">
                  {JSON.stringify(result, null, 2)}
                </pre>
              ) : (
                <div className="text-slate-500 italic text-center mt-20">
                  Click "Execute SQL" to view the live JSON response payload.
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-between text-[11px] text-slate-500">
          <div>REST Endpoint: <code className="text-slate-400 font-mono">POST /api/sql/execute</code></div>
          <div className="text-slate-400">All data transactions are preserved in SQL storage</div>
        </div>

      </div>
    </div>
  );
};
