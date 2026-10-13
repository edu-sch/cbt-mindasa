import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Cloud, 
  Settings, 
  Database, 
  Plus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  UploadCloud, 
  DownloadCloud, 
  RotateCcw, 
  Copy, 
  Check, 
  ExternalLink,
  FileText,
  Eye,
  EyeOff,
  Key,
  Calendar,
  Play,
  XCircle,
  Shuffle,
  Clock
} from 'lucide-react';
import { gdriveService } from '../services/gdriveService';
import { storageService } from '../services/storageService';

export function AdminDashboard({ 
  currentUser, 
  users = [], 
  onSaveUsers, 
  questions = [], 
  onSaveQuestions,
  exams = [], 
  onSaveExams,
  results = [], 
  settings = {}, 
  onSaveSettings,
  subjects = [],
  onSaveSubjects
}) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'users' | 'exams' | 'subjects' | 'gdrive' | 'settings'

  // State Pengaturan Google Drive
  const [gdriveUrl, setGdriveUrl] = useState(settings?.gdriveScriptUrl || '');
  const [testResult, setTestResult] = useState(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  // State Manajemen Pengguna
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userRole, setUserRole] = useState('siswa');
  const [userUsername, setUserUsername] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userNisn, setUserNisn] = useState('');
  const [userClass, setUserClass] = useState('');
  const [userSubject, setUserSubject] = useState('');
  const [showPasswordMap, setShowPasswordMap] = useState({});

  // State Mata Pelajaran (Mapel)
  const [newSubjectInput, setNewSubjectInput] = useState('');

  // State Modal Buat Ujian Baru (Admin)
  const [isExamModalOpen, setIsExamModalOpen] = useState(false);
  const [examTitleInput, setExamTitleInput] = useState('');
  const [examSubjectInput, setExamSubjectInput] = useState('');
  const [examDurationInput, setExamDurationInput] = useState(60);

  // Toggle Ujian Aktif / Tidak Aktif oleh Admin
  const handleToggleExamActive = (examId) => {
    if (!onSaveExams) return;
    const updated = exams.map(e => {
      if (e.id === examId) {
        return { ...e, isActive: e.isActive === false ? true : false };
      }
      return e;
    });
    onSaveExams(updated);
  };

  // Hapus Ujian (Admin)
  const handleDeleteExam = (examId) => {
    if (window.confirm('Yakin ingin menghapus jadwal ujian ini? Data tidak bisa dikembalikan.')) {
      const updated = exams.filter(e => e.id !== examId);
      if (onSaveExams) onSaveExams(updated);
    }
  };

  // Buka Modal Buat Ujian
  const handleOpenAddExam = () => {
    setExamTitleInput('');
    setExamSubjectInput(subjects[0] || 'Matematika');
    setExamDurationInput(60);
    setIsExamModalOpen(true);
  };

  // Simpan Ujian Baru (Admin)
  const handleSaveExamSubmit = (e) => {
    e.preventDefault();
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let randToken = '';
    for (let i = 0; i < 6; i++) {
      randToken += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newExam = {
      id: `exam-${Date.now()}`,
      title: examTitleInput.trim(),
      subject: examSubjectInput.trim(),
      token: randToken,
      durationMinutes: Number(examDurationInput) || 60,
      maxViolations: 3,
      categories: [examSubjectInput.trim()],
      shuffleQuestionsByCategory: true,
      shuffleOptions: true,
      isActive: true,
      instructions: [
        'Gunakan koneksi internet stabil.',
        'Sistem akan otomatis masuk ke Mode Layar Penuh (Fullscreen).',
        'DILARANG membuka tab lain atau meminimalisir layar.',
        'Setiap pelanggaran akan dicatat otomatis.'
      ]
    };
    const updated = [...exams, newExam];
    if (onSaveExams) onSaveExams(updated);
    setIsExamModalOpen(false);
  };

  // Tambah Mapel Baru
  const handleAddSubject = (e) => {
    e.preventDefault();
    const clean = newSubjectInput.trim();
    if (!clean) return;
    if (subjects.includes(clean)) {
      alert('Mata pelajaran ini sudah ada dalam daftar.');
      return;
    }
    const updated = [...subjects, clean];
    if (onSaveSubjects) onSaveSubjects(updated);
    setNewSubjectInput('');
  };

  // Hapus Mapel
  const handleDeleteSubject = (subj) => {
    if (window.confirm(`Hapus mata pelajaran "${subj}" dari daftar?`)) {
      const updated = subjects.filter(s => s !== subj);
      if (onSaveSubjects) onSaveSubjects(updated);
    }
  };

  const toggleShowPassword = (userId) => {
    setShowPasswordMap(prev => ({
      ...prev,
      [userId]: !prev[userId]
    }));
  };

  const handleEditUser = (user) => {
    setEditingUser(user);
    setUserName(user.name || '');
    setUserRole(user.role || 'siswa');
    setUserUsername(user.username || '');
    setUserPassword(user.password || '');
    setUserNisn(user.nisn || '');
    setUserClass(user.className || '');
    setUserSubject(user.subject || '');
    setIsUserModalOpen(true);
  };

  // Tes Koneksi ke Google Drive
  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await gdriveService.testConnection(gdriveUrl);
      setTestResult(res);
      if (res.success) {
        onSaveSettings({ ...settings, gdriveScriptUrl: gdriveUrl });
      }
    } catch (err) {
      setTestResult({ success: false, message: err.message });
    } finally {
      setIsTesting(false);
    }
  };

  // Push Data ke Google Drive
  const handlePushToDrive = async () => {
    if (!gdriveUrl) {
      alert('Harap isi URL Google Apps Script terlebih dahulu!');
      return;
    }
    setIsSyncing(true);
    setSyncFeedback('');
    try {
      const res = await gdriveService.pushDataToDrive(gdriveUrl);
      setSyncFeedback('✅ ' + (res.message || 'Semua data berhasil dicadangkan ke Google Drive!'));
    } catch (err) {
      setSyncFeedback('❌ Gagal sinkronisasi: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Pull Data dari Google Drive
  const handlePullFromDrive = async () => {
    if (!gdriveUrl) {
      alert('Harap isi URL Google Apps Script terlebih dahulu!');
      return;
    }
    if (!window.confirm('Mengunduh dari Google Drive akan memperbarui bank soal, siswa, dan hasil ujian lokal. Lanjutkan?')) {
      return;
    }

    setIsSyncing(true);
    setSyncFeedback('');
    try {
      const res = await gdriveService.pullDataFromDrive(gdriveUrl);
      setSyncFeedback('✅ ' + (res.message || 'Data berhasil dimuat dari Google Drive! Muat ulang halaman untuk melihat.'));
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      setSyncFeedback('❌ Gagal mengunduh: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Buka Modal Tambah User
  const handleOpenAddUser = () => {
    setEditingUser(null);
    setUserName('');
    setUserRole('siswa');
    setUserUsername('');
    setUserPassword('123456');
    setUserNisn('');
    setUserClass('XII MIPA 1');
    setUserSubject('Matematika');
    setIsUserModalOpen(true);
  };

  // Simpan Pengguna
  const handleSaveUser = (e) => {
    e.preventDefault();
    const newUser = {
      id: editingUser ? editingUser.id : `u-${Date.now()}`,
      name: userName,
      role: userRole,
      username: userUsername.trim(),
      password: userPassword,
      nisn: userRole === 'siswa' ? userNisn : undefined,
      className: userRole === 'siswa' ? userClass : undefined,
      subject: userRole === 'guru' ? userSubject : undefined
    };

    let updatedUsers;
    if (editingUser) {
      updatedUsers = users.map(u => u.id === editingUser.id ? newUser : u);
    } else {
      updatedUsers = [...users, newUser];
    }

    onSaveUsers(updatedUsers);
    setIsUserModalOpen(false);
  };

  // Hapus User
  const handleDeleteUser = (id) => {
    if (id === currentUser.id) {
      alert('Anda tidak dapat menghapus akun Anda sendiri!');
      return;
    }
    if (window.confirm('Yakin ingin menghapus pengguna ini?')) {
      const updated = users.filter(u => u.id !== id);
      onSaveUsers(updated);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Top Banner Admin */}
      <div className="bg-gradient-to-r from-purple-800 via-indigo-800 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center space-x-2 bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
            <span>Hak Akses Penuh Administrator</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Pusat Kontrol CBT Mindasa
          </h1>
          <p className="mt-1 text-purple-200 text-xs sm:text-sm max-w-xl">
            MIN 2 KOTA SURABAYA — Kelola akun Guru & Siswa, jadwal ujian, proctoring, serta sinkronisasi database Google Drive.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              if (window.confirm('Reset semua data kembali ke default (contoh bank soal & siswa)?')) {
                storageService.resetToDefaults();
                window.location.reload();
              }
            }}
            className="px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl text-xs font-bold transition-colors flex items-center space-x-1.5 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Demo Data</span>
          </button>
        </div>
      </div>

      {/* Tabs Menu Admin */}
      <div className="flex border-b border-slate-200 space-x-6 overflow-x-auto pb-1">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'overview'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Ringkasan Sistem</span>
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'users'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Kelola Pengguna ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exams')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'exams'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Jadwal & Status Ujian ({exams.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('subjects')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'subjects'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Mata Pelajaran ({subjects.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('gdrive')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'gdrive'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Cloud className="w-4 h-4" />
          <span>Database Google Drive & Sheets</span>
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-bold flex items-center space-x-2 border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'settings'
              ? 'border-purple-600 text-purple-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Pengaturan Sistem</span>
        </button>
      </div>

      {/* ================= TAB 1: OVERVIEW METRICS ================= */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 font-medium">Total Akun Siswa</div>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {users.filter(u => u.role === 'siswa').length} Orang
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Terdaftar dalam sistem</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 font-medium">Total Akun Guru</div>
              <div className="text-2xl font-black text-blue-600 mt-1">
                {users.filter(u => u.role === 'guru').length} Orang
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Pembuat soal & pengampu</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 font-medium">Bank Soal Aktif</div>
              <div className="text-2xl font-black text-purple-600 mt-1">
                {questions.length} Butir
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">4 Model Soal CBT</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <div className="text-xs text-slate-400 font-medium">Hasil Ujian Masuk</div>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {results.length} Lembar
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">Tersimpan di database</div>
            </div>

          </div>

          {/* Cloud Status Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                settings?.gdriveScriptUrl ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {settings?.gdriveScriptUrl ? 'Database Google Drive Terhubung' : 'Database Berjalan dalam Mode Lokal (Offline)'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5 max-w-lg">
                  {settings?.gdriveScriptUrl 
                    ? `Terhubung ke API Apps Script. Hasil ujian dan bank soal dapat dicadangkan langsung ke Drive Anda.` 
                    : `Anda dapat menghubungkan Google Drive Anda secara gratis melalui Google Apps Script di tab "Database Google Drive".`}
                </p>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('gdrive')}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shrink-0"
            >
              Konfigurasi Google Drive
            </button>
          </div>
        </div>
      )}

      {/* ================= TAB 2: MANAJEMEN PENGGUNA ================= */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daftar Pengguna CBT</h3>
              <p className="text-xs text-slate-500">Admin, Guru Pengampu, dan Siswa Peserta Ujian</p>
            </div>

            <button
              onClick={handleOpenAddUser}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Pengguna</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-700 uppercase font-semibold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Nama Lengkap</th>
                    <th className="py-3 px-4">Peran (Role)</th>
                    <th className="py-3 px-4">Username / NISN</th>
                    <th className="py-3 px-4">Kata Sandi</th>
                    <th className="py-3 px-4">Kelas / Mapel</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map(u => {
                    const isVisible = !!showPasswordMap[u.id];
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{u.name}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                            u.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                            u.role === 'guru' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-medium text-slate-700">{u.username}</td>
                        <td className="py-3.5 px-4">
                          <div className="inline-flex items-center space-x-1.5 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                            <span className="font-mono font-bold text-slate-800 text-xs tracking-wider select-all">
                              {isVisible ? (u.password || '123456') : '••••••••'}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleShowPassword(u.id)}
                              className="p-0.5 text-slate-400 hover:text-slate-700 rounded transition-colors cursor-pointer"
                              title={isVisible ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                            >
                              {isVisible ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-700">
                          {u.className || u.subject || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-1">
                          <button
                            onClick={() => handleEditUser(u)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Edit / Reset Password"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Hapus Akun"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB: KELOLA JADWAL & STATUS UJIAN (AKTIF / TIDAK) ================= */}
      {activeTab === 'exams' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Pengaturan Status Ujian CBT</h3>
              <p className="text-xs text-slate-500">
                Aktifkan ujian agar siswa dapat memasukkan token dan mulai mengerjakan, atau nonaktifkan jika ujian selesai/ditutup.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs font-bold px-3 py-1 bg-purple-50 text-purple-700 rounded-xl border border-purple-200">
                Total {exams.length} Jadwal
              </div>
              <button
                type="button"
                onClick={handleOpenAddExam}
                className="flex items-center space-x-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Buat Ujian Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {exams.length === 0 ? (
              <div className="bg-white p-12 text-center rounded-2xl border border-slate-200 text-slate-400">
                <Calendar className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="font-bold text-slate-500 mb-1">Belum Ada Jadwal Ujian</p>
                <p className="text-xs">Klik "Buat Ujian Baru" untuk membuat jadwal ujian pertama.</p>
              </div>
            ) : (
              exams.map((ex) => {
                const isAct = ex.isActive !== false;
                return (
                  <div key={ex.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center flex-wrap gap-2">
                          <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-md">
                            📚 {ex.subject || 'Belum Ada Mapel'}
                          </span>
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center space-x-1.5 ${
                            isAct 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-600'
                          }`}>
                            <span className={`w-2 h-2 rounded-full ${isAct ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                            <span>{isAct ? '🟢 AKTIF' : '⚪ TIDAK AKTIF'}</span>
                          </span>
                        </div>
                        <h4 className="text-base font-bold text-slate-900 mt-1">{ex.title}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Durasi: <strong>{ex.durationMinutes} Menit</strong> | Token: <strong className="font-mono text-purple-700 text-sm">{ex.token}</strong> | Toleransi: <strong>{ex.maxViolations || 3}x pelanggaran</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        {/* Tombol Hapus Ujian */}
                        <button
                          type="button"
                          onClick={() => handleDeleteExam(ex.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Hapus Ujian"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                        {/* Tombol Toggle Saklar Status Aktif / Nonaktif */}
                        <div className="flex items-center space-x-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                          <div className="text-right">
                            <div className="text-[10px] text-slate-400 font-bold uppercase">Status</div>
                            <div className={`text-xs font-black ${isAct ? 'text-emerald-700' : 'text-slate-500'}`}>
                              {isAct ? 'DIBUKA' : 'DITUTUP'}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleToggleExamActive(ex.id)}
                            className={`w-14 h-7 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                              isAct ? 'bg-emerald-600 justify-end' : 'bg-slate-300 justify-start'
                            }`}
                            title={isAct ? 'Klik untuk Menonaktifkan Ujian' : 'Klik untuk Mengaktifkan Ujian'}
                          >
                            <div className="w-5 h-5 rounded-full bg-white shadow-md"></div>
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between text-xs text-slate-600 pt-1">
                      <div className="flex items-center space-x-4">
                        <span>Acak Soal: <strong>{ex.shuffleQuestionsByCategory ? 'Ya (Per Kategori)' : 'Tidak'}</strong></span>
                        <span>Acak Pilihan: <strong>{ex.shuffleOptions ? 'Ya' : 'Tidak'}</strong></span>
                      </div>
                      <div className="text-slate-400 text-[11px]">
                        ID: <code className="font-mono">{ex.id}</code>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}


      {/* ================= TAB: SETTING MATA PELAJARAN (MAPEL) ================= */}
      {activeTab === 'subjects' && (
        <div className="space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <h3 className="font-bold text-slate-900 text-sm">Kelola Mata Pelajaran (Mapel)</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Daftar mata pelajaran yang digunakan oleh guru untuk mengelompokkan bank soal dan jadwal ujian di MIN 2 Kota Surabaya.
            </p>

            <form onSubmit={handleAddSubject} className="mt-4 flex gap-2 max-w-md">
              <input
                type="text"
                required
                value={newSubjectInput}
                onChange={(e) => setNewSubjectInput(e.target.value)}
                placeholder="Nama Mapel Baru (cth: Fiqih, IPA, dll)..."
                className="flex-1 p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Mapel</span>
              </button>
            </form>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
              Daftar Mapel Terdaftar ({subjects.length}):
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {subjects.map((sub, idx) => (
                <div 
                  key={idx}
                  className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:bg-purple-50/50 transition-colors"
                >
                  <div className="flex items-center space-x-2 font-bold text-slate-800">
                    <FileText className="w-4 h-4 text-purple-600 shrink-0" />
                    <span>{sub}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteSubject(sub)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                    title="Hapus Mapel"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: DATABASE GOOGLE DRIVE & SHEETS ================= */}
      {activeTab === 'gdrive' && (
        <div className="space-y-6">
          
          {/* Card Konfigurasi URL Apps Script */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100">
              <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center">
                <Cloud className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Pengaturan Google Drive & Apps Script API
                </h3>
                <p className="text-xs text-slate-500">
                  Gunakan Google Drive & Spreadsheet Anda sendiri sebagai database backend 100% gratis tanpa server berbayar.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase">
                URL Aplikasi Web Google Apps Script (Web App URL)
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  placeholder="https://script.google.com/macros/s/AKfycb.../exec"
                  value={gdriveUrl}
                  onChange={(e) => setGdriveUrl(e.target.value)}
                  className="flex-1 p-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <button
                  type="button"
                  disabled={isTesting || !gdriveUrl}
                  onClick={handleTestConnection}
                  className="px-5 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center justify-center space-x-1.5 shrink-0"
                >
                  <span>{isTesting ? 'Menguji...' : 'Tes Koneksi'}</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400">
                Format: <code>https://script.google.com/macros/s/.../exec</code>
              </p>
            </div>

            {/* Test result alert */}
            {testResult && (
              <div className={`p-4 rounded-xl border text-xs flex items-start space-x-2.5 ${
                testResult.success 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}>
                {testResult.success ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />}
                <div>
                  <div className="font-bold">{testResult.success ? 'Koneksi Berhasil!' : 'Koneksi Gagal'}</div>
                  <div className="mt-0.5">{testResult.message}</div>
                </div>
              </div>
            )}

            {/* Sync Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={isSyncing}
                onClick={handlePushToDrive}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" />
                <span>Cadangkan Data ke Google Drive (Upload)</span>
              </button>

              <button
                type="button"
                disabled={isSyncing}
                onClick={handlePullFromDrive}
                className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold flex items-center space-x-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <DownloadCloud className="w-4 h-4" />
                <span>Tarik Data dari Google Drive (Download)</span>
              </button>
            </div>

            {syncFeedback && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700">
                {syncFeedback}
              </div>
            )}
          </div>

          {/* Panduan 3 Langkah Memasang di Google Drive */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h4 className="font-bold text-slate-900 text-sm uppercase tracking-wider flex items-center space-x-2">
              <ExternalLink className="w-4 h-4 text-purple-600" />
              <span>Panduan Setup Google Drive (Hanya 2 Menit):</span>
            </h4>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  1
                </div>
                <div>
                  <strong className="text-slate-800">Buat Google Spreadsheet:</strong> Buka Google Drive Anda, buat spreadsheet baru (misal diberi nama "CBT_DATABASE_2026"). Klik menu <strong>Ekstensi &gt; Apps Script</strong>.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  2
                </div>
                <div>
                  <strong className="text-slate-800">Salin Kode Apps Script:</strong> Salin seluruh kode di file <code>google-apps-script/Code.gs</code> di proyek ini, lalu tempel (paste) ke jendela Apps Script tersebut.
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start space-x-3">
                <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center font-bold shrink-0 text-xs">
                  3
                </div>
                <div>
                  <strong className="text-slate-800">Terapkan (Deploy) Sebagai Web App:</strong> Klik <strong>Terapkan &gt; Penerapan Baru &gt; Jenis: Aplikasi Web</strong>. Set akses <strong>"Siapa saja" (Anyone)</strong>, lalu salin URL Web App yang dihasilkan ke kolom URL di atas!
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* ================= TAB 4: PENGATURAN SISTEM ================= */}
      {activeTab === 'settings' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-5">
          <h3 className="font-bold text-slate-900 text-base pb-3 border-b border-slate-100">
            Konfigurasi Global Sekolah & Proctoring
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Nama Lembaga / Sekolah</label>
              <input
                type="text"
                value={settings?.schoolName || ''}
                onChange={(e) => onSaveSettings({ ...settings, schoolName: e.target.value })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 uppercase mb-1">Batas Toleransi Pelanggaran (Strikes)</label>
              <input
                type="number"
                min="1"
                max="10"
                value={settings?.maxViolationsAllowed || 3}
                onChange={(e) => onSaveSettings({ ...settings, maxViolationsAllowed: Number(e.target.value) })}
                className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
              />
              <span className="text-[11px] text-slate-400 mt-1 block">
                Jumlah maksimal siswa boleh keluar fullscreen / pindah tab sebelum ujian dikunci otomatis.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT USER */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 text-xs">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-200 flex items-center space-x-2">
              <Key className="w-4 h-4 text-purple-600" />
              <span>{editingUser ? 'Edit Pengguna & Reset Sandi' : 'Tambah Pengguna Baru'}</span>
            </h3>

            <form onSubmit={handleSaveUser} className="space-y-3 mt-4">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Peran Akun (Role)</label>
                <select
                  value={userRole}
                  onChange={(e) => setUserRole(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                >
                  <option value="siswa">Siswa</option>
                  <option value="guru">Guru</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Contoh: Rian Anggara"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={userUsername}
                    onChange={(e) => setUserUsername(e.target.value)}
                    placeholder="Contoh: rian123"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Kata Sandi</label>
                  <input
                    type="text"
                    required
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              </div>

              {userRole === 'siswa' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">NISN</label>
                    <input
                      type="text"
                      value={userNisn}
                      onChange={(e) => setUserNisn(e.target.value)}
                      placeholder="008543..."
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 uppercase mb-1">Kelas</label>
                    <input
                      type="text"
                      value={userClass}
                      onChange={(e) => setUserClass(e.target.value)}
                      placeholder="XII MIPA 1"
                      className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}

              {userRole === 'guru' && (
                <div>
                  <label className="block font-bold text-slate-700 uppercase mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    value={userSubject}
                    onChange={(e) => setUserSubject(e.target.value)}
                    placeholder="Contoh: Fisika / Kimia"
                    className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                  />
                </div>
              )}

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Simpan Pengguna
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL BUAT JADWAL UJIAN BARU (ADMIN) */}
      {isExamModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 pb-3 border-b border-slate-200 flex items-center space-x-2">
              <Calendar className="w-5 h-5 text-emerald-600" />
              <span>Buat Jadwal Ujian Baru</span>
            </h3>

            <form onSubmit={handleSaveExamSubmit} className="space-y-3.5 mt-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Mata Pelajaran yang Diujikan</label>
                <select
                  value={examSubjectInput}
                  onChange={(e) => setExamSubjectInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-800"
                >
                  {subjects.map((sub, i) => (
                    <option key={i} value={sub}>{sub}</option>
                  ))}
                  <option value="Umum">Umum / Terpadu</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Nama / Judul Ujian</label>
                <input
                  type="text"
                  required
                  value={examTitleInput}
                  onChange={(e) => setExamTitleInput(e.target.value)}
                  placeholder="Contoh: Ulangan Harian Bab 1 / PAS Semester Ganjil"
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase mb-1">Durasi Pengerjaan (Menit)</label>
                <input
                  type="number"
                  required
                  min="5"
                  max="300"
                  value={examDurationInput}
                  onChange={(e) => setExamDurationInput(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold"
                />
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px]">
                ℹ️ Token ujian 6 karakter akan dibuat otomatis dan ujian langsung berstatus <strong>AKTIF</strong>.
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsExamModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold cursor-pointer"
                >
                  Simpan Jadwal Ujian
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
