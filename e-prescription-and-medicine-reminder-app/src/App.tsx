import React, { useState, useEffect } from 'react';
import { LoginPage } from './components/LoginPage.tsx';
import { DoctorDashboard } from './components/DoctorDashboard.tsx';
import { PatientDashboard } from './components/PatientDashboard.tsx';
import { SqlExplorerModal } from './components/SqlExplorerModal.tsx';
import { User } from './types.ts';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showSqlExplorer, setShowSqlExplorer] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  // Restore session from localStorage if available
  useEffect(() => {
    try {
      const savedUser = localStorage.getItem('eprescription_user');
      if (savedUser) {
        setCurrentUser(JSON.parse(savedUser));
      }
    } catch (e) {
      console.error('Failed to parse saved user:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    try {
      localStorage.setItem('eprescription_user', JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user session:', e);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    try {
      localStorage.removeItem('eprescription_user');
    } catch (e) {
      console.error('Failed to clear user session:', e);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-teal-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-teal-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-400">Loading E-Prescription Portal...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans antialiased">
      {!currentUser ? (
        <LoginPage 
          onLoginSuccess={handleLoginSuccess}
          onOpenSqlExplorer={() => setShowSqlExplorer(true)}
        />
      ) : currentUser.role === 'doctor' ? (
        <DoctorDashboard 
          user={currentUser}
          onLogout={handleLogout}
          onOpenSqlExplorer={() => setShowSqlExplorer(true)}
        />
      ) : (
        <PatientDashboard 
          user={currentUser}
          onLogout={handleLogout}
          onOpenSqlExplorer={() => setShowSqlExplorer(true)}
        />
      )}

      {/* Interactive SQL & JSON Inspector */}
      <SqlExplorerModal 
        isOpen={showSqlExplorer}
        onClose={() => setShowSqlExplorer(false)}
      />
    </div>
  );
}
