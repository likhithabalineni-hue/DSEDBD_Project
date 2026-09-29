import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  Stethoscope, 
  User, 
  Lock, 
  Mail, 
  Phone, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Pill, 
  ShieldCheck, 
  Sparkles,
  UserCheck
} from 'lucide-react';
import { User as UserType, UserRole } from '../types';

interface LoginPageProps {
  onLoginSuccess: (user: UserType) => void;
  onOpenSqlExplorer: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onOpenSqlExplorer }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>('patient');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const demoAccounts = [
    {
      role: 'patient' as UserRole,
      name: 'Likhitha B',
      email: 'likhitha@gmail.com',
      password: 'patient123',
      label: 'Patient (Student Lead)',
      badge: 'Active Prescriptions',
    },
    {
      role: 'doctor' as UserRole,
      name: 'Dr. Rajesh Sharma, MD',
      email: 'dr.rajesh@health.org',
      password: 'doctor123',
      label: 'Doctor (Physician)',
      badge: 'General & Diabetes',
    },
    {
      role: 'patient' as UserRole,
      name: 'Keerthana G',
      email: 'keerthana@gmail.com',
      password: 'patient123',
      label: 'Patient (Team Member)',
      badge: 'Daily Reminder Due',
    },
    {
      role: 'doctor' as UserRole,
      name: 'Dr. Priya Patel, MD',
      email: 'dr.priya@cardio.org',
      password: 'doctor123',
      label: 'Doctor (Cardiologist)',
      badge: 'Cardiology Specialist',
    },
  ];

  const handleSelectDemo = (demo: typeof demoAccounts[0]) => {
    setIsRegister(false);
    setSelectedRole(demo.role);
    setEmail(demo.email);
    setPassword(demo.password);
    setError(null);
    setSuccessMsg(`Selected demo credentials for ${demo.name}. Click "Sign In" below!`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setLoading(true);

    try {
      if (isRegister) {
        // Register API call
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name,
            email,
            password,
            role: selectedRole,
            specialization: selectedRole === 'doctor' ? specialization : null,
            phone,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        setSuccessMsg('Registration successful! Logging you in...');
        setTimeout(() => {
          onLoginSuccess(data.user);
        }, 600);
      } else {
        // Login API call
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Invalid credentials');
        }

        onLoginSuccess(data.user);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 flex flex-col justify-between selection:bg-teal-500 selection:text-white">
      {/* Top Bar with Project Info */}
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400">
            <Pill className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-base tracking-tight">E-Prescription & Medicine Reminder</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-mono border border-teal-500/30">
                SQL + JSON
              </span>
            </div>
            <p className="text-xs text-slate-400">
              KLH University · 25CS1302E Database Systems Engineering
            </p>
          </div>
        </div>

        <button
          id="btn-open-sql-top"
          onClick={onOpenSqlExplorer}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono border border-slate-700 transition"
          title="Open SQL Query Inspector"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Live SQL & JSON Inspector</span>
        </button>
      </header>

      {/* Main Login Card Area */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Form Container */}
          <motion.div 
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-7 bg-slate-800/90 border border-slate-700/80 rounded-2xl p-6 sm:p-8 shadow-2xl flex flex-col justify-between"
          >
            <div>
              {/* Card Header & Tabs */}
              <div className="flex items-center justify-between border-b border-slate-700 pb-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold text-white tracking-tight">
                    {isRegister ? 'Create New Account' : 'Portal Sign In'}
                  </h1>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isRegister ? 'Register as doctor or patient in SQL' : 'Enter credentials to access prescriptions and schedules'}
                  </p>
                </div>
                <div className="flex p-1 bg-slate-900 rounded-xl border border-slate-700/60 text-xs font-medium">
                  <button
                    id="tab-sign-in"
                    type="button"
                    onClick={() => { setIsRegister(false); setError(null); }}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      !isRegister ? 'bg-teal-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Sign In
                  </button>
                  <button
                    id="tab-register"
                    type="button"
                    onClick={() => { setIsRegister(true); setError(null); }}
                    className={`px-3 py-1.5 rounded-lg transition ${
                      isRegister ? 'bg-teal-600 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Register
                  </button>
                </div>
              </div>

              {/* Role Selection */}
              <div className="mb-5">
                <label className="block text-xs font-medium text-slate-300 mb-2">Select Your Portal Role</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    id="role-btn-patient"
                    type="button"
                    onClick={() => setSelectedRole('patient')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      selectedRole === 'patient'
                        ? 'border-teal-500 bg-teal-500/10 text-white'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedRole === 'patient' ? 'bg-teal-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Patient</div>
                      <div className="text-[11px] text-slate-400">View Rx & Timers</div>
                    </div>
                  </button>

                  <button
                    id="role-btn-doctor"
                    type="button"
                    onClick={() => setSelectedRole('doctor')}
                    className={`flex items-center gap-3 p-3 rounded-xl border text-left transition ${
                      selectedRole === 'doctor'
                        ? 'border-teal-500 bg-teal-500/10 text-white'
                        : 'border-slate-700 bg-slate-900/50 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    <div className={`p-2 rounded-lg ${selectedRole === 'doctor' ? 'bg-teal-500 text-slate-900' : 'bg-slate-800 text-slate-400'}`}>
                      <Stethoscope className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">Doctor / Provider</div>
                      <div className="text-[11px] text-slate-400">Issue E-Prescriptions</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* Notifications / Alerts */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-teal-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Form Fields */}
              <form onSubmit={handleSubmit} className="space-y-3.5">
                {isRegister && (
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <UserCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        id="input-name"
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={selectedRole === 'doctor' ? 'Dr. Sarah Connor, MD' : 'John Doe'}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder={selectedRole === 'doctor' ? 'dr.rajesh@health.org' : 'likhitha@gmail.com'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      id="input-password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                    />
                  </div>
                </div>

                {isRegister && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">Phone Number</label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                        <input
                          id="input-phone"
                          type="text"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98450 12345"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                    </div>

                    {selectedRole === 'doctor' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Medical Specialization</label>
                        <input
                          id="input-spec"
                          type="text"
                          value={specialization}
                          onChange={(e) => setSpecialization(e.target.value)}
                          placeholder="e.g. Cardiologist, General Physician, Pediatrician"
                          className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-teal-500 transition"
                        />
                      </div>
                    )}
                  </>
                )}

                <button
                  id="btn-submit-auth"
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 py-3 px-4 rounded-xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold text-sm shadow-lg shadow-teal-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>{isRegister ? 'Register & Accept Credentials' : 'Sign In with Credentials'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-700/60 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-400" />
              <span>SQL database verifies passwords and enforces role-based access.</span>
            </div>
          </motion.div>

          {/* Right Column: Instant Demo Credentials Quick-Fill (Ensures acceptable credentials!) */}
          <div className="lg:col-span-5 flex flex-col justify-between gap-4">
            <div className="bg-slate-800/60 border border-slate-700/60 rounded-2xl p-5 backdrop-blur-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Ready-To-Use Demo Logins</span>
                </span>
                <span className="text-[10px] text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-700 font-mono">
                  1-Click Fill
                </span>
              </div>
              <p className="text-xs text-slate-300 mb-3.5 leading-relaxed">
                Click any profile to instantly fill valid credentials verified by the SQL database:
              </p>

              <div className="space-y-2.5">
                {demoAccounts.map((demo, idx) => (
                  <button
                    id={`btn-demo-credential-${idx}`}
                    key={demo.email}
                    type="button"
                    onClick={() => handleSelectDemo(demo)}
                    className="w-full text-left p-3 rounded-xl bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 hover:border-teal-500/50 transition group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-white group-hover:text-teal-300 transition">
                          {demo.name}
                        </span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                          demo.role === 'doctor' ? 'bg-indigo-500/20 text-indigo-300' : 'bg-emerald-500/20 text-emerald-300'
                        }`}>
                          {demo.role}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {demo.password}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                      <span>{demo.email}</span>
                      <span className="text-[10px] text-teal-400/80">{demo.badge}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Academic Reference Box */}
            <div className="bg-slate-800/40 border border-slate-700/40 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <div className="flex items-center gap-2 text-slate-200 font-medium">
                <CheckCircle2 className="w-4 h-4 text-teal-400" />
                <span>Abstract Submission Details</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Project Title: <strong className="text-slate-300">E-Prescription and Medicine Reminder App</strong>
              </p>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-400 pt-1 border-t border-slate-700/40">
                <div>Sec No: 8 · Team No: 11</div>
                <div>Year: 2026-2027 Trimester 4</div>
                <div className="col-span-2 text-slate-300 font-mono text-[10px]">
                  Team: Likhitha .B · Keerthana.G · Chinmayi Seshna.V
                </div>
              </div>
            </div>

          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-3 text-center text-xs text-slate-500">
        KLH Deemed to be University · Database Systems Engineering & Distributed Backend Development (25CS1302E)
      </footer>
    </div>
  );
};
