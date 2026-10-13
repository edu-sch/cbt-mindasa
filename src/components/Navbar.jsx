import React from 'react';
import { 
  LogOut, 
  ShieldCheck, 
  User, 
  GraduationCap, 
  BookOpen, 
  Cloud, 
  CloudCheck, 
  RotateCcw,
  AlertCircle
} from 'lucide-react';
import { storageService } from '../services/storageService';

export function Navbar({ currentUser, onLogout, onResetData, settings, syncStatus = 'idle' }) {
  const isDriveConfigured = !!settings?.gdriveScriptUrl;

  const syncLabel = {
    idle: isDriveConfigured ? 'G.Drive Aktif' : 'DB Lokal',
    syncing: 'Menyimpan ke Drive...',
    done: '✓ Tersimpan ke Drive',
    error: '⚠ Gagal Sync Drive'
  }[syncStatus] || 'DB Lokal';

  const syncColor = {
    idle: isDriveConfigured ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200',
    syncing: 'bg-blue-50 text-blue-700 border-blue-200 animate-pulse',
    done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    error: 'bg-rose-50 text-rose-700 border-rose-200'
  }[syncStatus] || 'bg-amber-50 text-amber-700 border-amber-200';

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Left: Brand / School Logo */}
        <div className="flex items-center space-x-3">
          {/* Logo Resmi MIN 2 Kota Surabaya */}
          <img
            src={settings?.schoolLogo || './logo-min2.png'}
            alt="Logo MIN 2 Kota Surabaya"
            className="w-10 h-10 rounded-xl object-contain bg-white shadow-md border border-slate-100"
          />
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 text-lg leading-tight tracking-tight">CBT Mindasa</span>
              <span className="text-[10px] uppercase font-bold tracking-widest bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                MIN 2 SBY
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block truncate max-w-xs">
              {settings?.schoolName || 'MIN 2 KOTA SURABAYA'}
            </p>
          </div>
        </div>

        {/* Right: Cloud status, User Info, Actions */}
        <div className="flex items-center space-x-3 sm:space-x-4">
          
          {/* Cloud / Sync Status Badge */}
          <div 
            title={isDriveConfigured ? "Terhubung ke Google Drive API" : "Mode Database Lokal (Offline Ready)"}
            className={`hidden md:flex items-center space-x-1.5 text-xs font-medium px-2.5 py-1 rounded-full border transition-colors ${syncColor}`}
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>{syncLabel}</span>
          </div>

          {/* User info if logged in */}
          {currentUser && (
            <div className="flex items-center space-x-3 pl-2 sm:pl-4 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-semibold text-slate-800 leading-none">
                  {currentUser.name}
                </div>
                <div className="text-xs text-slate-500 mt-0.5 flex items-center justify-end space-x-1">
                  {currentUser.role === 'admin' && (
                    <span className="text-purple-600 font-medium">Administrator</span>
                  )}
                  {currentUser.role === 'guru' && (
                    <span className="text-blue-600 font-medium">Guru: {currentUser.subject || 'Pengampu'}</span>
                  )}
                  {currentUser.role === 'siswa' && (
                    <span className="text-emerald-600 font-medium">{currentUser.className} • NISN: {currentUser.nisn}</span>
                  )}
                </div>
              </div>

              {/* Role Badge Icon */}
              <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-white shadow-xs ${
                currentUser.role === 'admin' ? 'bg-purple-600' :
                currentUser.role === 'guru' ? 'bg-blue-600' : 'bg-emerald-600'
              }`}>
                {currentUser.role === 'admin' ? <ShieldCheck className="w-5 h-5" /> :
                 currentUser.role === 'guru' ? <GraduationCap className="w-5 h-5" /> :
                 <User className="w-5 h-5" />}
              </div>

              {/* Logout Button */}
              <button
                onClick={onLogout}
                title="Keluar dari akun"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          )}

        </div>

      </div>
    </header>
  );
}
