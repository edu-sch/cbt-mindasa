import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { gdriveService } from './services/gdriveService';
import { prepareExamQuestions } from './utils/shuffle';
import { Navbar } from './components/Navbar';
import { LoginView } from './views/LoginView';
import { StudentDashboard } from './views/StudentDashboard';
import { ExamRoom } from './views/ExamRoom';
import { ExamSummary } from './views/ExamSummary';
import { TeacherDashboard } from './views/TeacherDashboard';
import { AdminDashboard } from './views/AdminDashboard';

export function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [exams, setExams] = useState([]);
  const [results, setResults] = useState([]);
  const [settings, setSettings] = useState({});
  const [subjects, setSubjects] = useState([]);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'syncing' | 'done' | 'error'

  // State Ujian Berjalan
  const [activeExam, setActiveExam] = useState(null);
  const [activePreparedQuestions, setActivePreparedQuestions] = useState([]);
  const [viewSummaryResult, setViewSummaryResult] = useState(null);

  // Helper: reload semua data dari localStorage ke state
  const reloadDataFromStorage = () => {
    setUsers(storageService.getUsers());
    setQuestions(storageService.getQuestions());
    setExams(storageService.getExams());
    setResults(storageService.getResults());
    setSettings(storageService.getSettings());
    setSubjects(storageService.getSubjects());
  };

  // Inisialisasi: load localStorage, lalu auto-sync dari Google Drive
  useEffect(() => {
    storageService.init();
    reloadDataFromStorage();

    const savedUser = storageService.getCurrentUser();
    if (savedUser) setCurrentUser(savedUser);

    // Auto-sync dari Google Drive saat pertama buka (ambil soal & data terbaru)
    const cfg = storageService.getSettings();
    if (cfg.gdriveScriptUrl) {
      setSyncStatus('syncing');
      gdriveService.pullDataFromDrive(cfg.gdriveScriptUrl)
        .then(() => {
          reloadDataFromStorage();
          setSyncStatus('done');
          // Reset status setelah 3 detik
          setTimeout(() => setSyncStatus('idle'), 3000);
        })
        .catch(() => {
          setSyncStatus('error');
          setTimeout(() => setSyncStatus('idle'), 4000);
        });
    }
  }, []);

  // Login handler
  const handleLogin = (user) => {
    setCurrentUser(user);
    storageService.setCurrentUser(user);
    setViewSummaryResult(null);
    setActiveExam(null);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentUser(null);
    storageService.setCurrentUser(null);
    setActiveExam(null);
    setViewSummaryResult(null);
  };

  // Mulai Ujian untuk Siswa (Melakukan Pengacakan Soal per Kategori & Opsi)
  const handleStartExam = (exam) => {
    // Siapkan soal dengan pengacakan sesuai kategori dan opsi
    const prepared = prepareExamQuestions(questions, {
      shuffleQuestionsByCategory: exam.shuffleQuestionsByCategory,
      shuffleOptions: exam.shuffleOptions,
      allowedCategories: exam.categories
    });

    setActivePreparedQuestions(prepared);
    setActiveExam(exam);
    setViewSummaryResult(null);
  };

  // Selesai Ujian
  const handleFinishExam = (finalResult) => {
    setActiveExam(null);
    setActivePreparedQuestions([]);
    // Update hasil di state aplikasi
    setResults(storageService.getResults());
    setViewSummaryResult(finalResult);
  };

  // Helper: push semua data ke Google Drive (tanpa block UI)
  const autoPushToDrive = (overrideQuestions, overrideExams, overrideUsers) => {
    const cfg = storageService.getSettings();
    if (!cfg?.gdriveScriptUrl) return; // Drive belum dikonfigurasi, skip
    setSyncStatus('syncing');
    const payload = {
      action: 'saveData',
      users: overrideUsers || storageService.getUsers(),
      questions: overrideQuestions || storageService.getQuestions(),
      exams: overrideExams || storageService.getExams(),
      results: storageService.getResults(),
      subjects: storageService.getSubjects(),
      timestamp: new Date().toISOString()
    };
    fetch(cfg.gdriveScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(() => {
        setSyncStatus('done');
        setTimeout(() => setSyncStatus('idle'), 2500);
      })
      .catch(() => {
        setSyncStatus('error');
        setTimeout(() => setSyncStatus('idle'), 4000);
      });
  };

  // Save Users update + auto-push ke Drive
  const handleSaveUsers = (newUsers) => {
    setUsers(newUsers);
    storageService.saveUsers(newUsers);
    autoPushToDrive(null, null, newUsers);
  };

  // Save Questions update + auto-push ke Drive
  const handleSaveQuestions = (newQuestions) => {
    setQuestions(newQuestions);
    storageService.saveQuestions(newQuestions);
    autoPushToDrive(newQuestions, null, null);
  };

  // Save Exams update + auto-push ke Drive
  const handleSaveExams = (newExams) => {
    setExams(newExams);
    storageService.saveExams(newExams);
    autoPushToDrive(null, newExams, null);
  };

  // Save Settings update
  const handleSaveSettings = (newSettings) => {
    setSettings(newSettings);
    storageService.saveSettings(newSettings);
  };

  // Save Subjects update + auto-push ke Drive
  const handleSaveSubjects = (newSubjects) => {
    setSubjects(newSubjects);
    storageService.saveSubjects(newSubjects);
    autoPushToDrive(null, null, null);
  };

  // Reset Data to defaults
  const handleResetData = () => {
    if (window.confirm('Reset semua data kembali ke default bawaan?')) {
      storageService.resetToDefaults();
      setUsers(storageService.getUsers());
      setQuestions(storageService.getQuestions());
      setExams(storageService.getExams());
      setResults(storageService.getResults());
      setSettings(storageService.getSettings());
      setSubjects(storageService.getSubjects());
      setActiveExam(null);
      setViewSummaryResult(null);
    }
  };

  // ================= RENDER LOGIC =================

  // 1. Jika Siswa sedang di Ruang Ujian (Fullscreen CBT Room)
  if (currentUser?.role === 'siswa' && activeExam && activePreparedQuestions.length > 0) {
    return (
      <ExamRoom
        currentUser={currentUser}
        exam={activeExam}
        questions={activePreparedQuestions}
        onFinishExam={handleFinishExam}
        settings={settings}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      
      {/* Navbar Global */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        onResetData={handleResetData}
        settings={settings}
        syncStatus={syncStatus}
      />

      <main className="flex-1">
        
        {/* Belum Login */}
        {!currentUser && (
          <LoginView
            onLogin={handleLogin}
            users={users}
            settings={settings}
          />
        )}

        {/* Login sebagai SISWA */}
        {currentUser?.role === 'siswa' && (
          <>
            {viewSummaryResult ? (
              <ExamSummary
                result={viewSummaryResult}
                questions={questions}
                onBackToDashboard={() => setViewSummaryResult(null)}
              />
            ) : (
              <StudentDashboard
                currentUser={currentUser}
                exams={exams}
                results={results}
                questions={questions}
                onStartExam={handleStartExam}
                onViewSummary={(res) => setViewSummaryResult(res)}
              />
            )}
          </>
        )}

        {/* Login sebagai GURU */}
        {currentUser?.role === 'guru' && (
          <TeacherDashboard
            currentUser={currentUser}
            questions={questions}
            onSaveQuestions={handleSaveQuestions}
            exams={exams}
            onSaveExams={handleSaveExams}
            results={results}
            settings={settings}
            subjects={subjects}
            onSaveSubjects={handleSaveSubjects}
          />
        )}

        {/* Login sebagai ADMIN */}
        {currentUser?.role === 'admin' && (
          <AdminDashboard
            currentUser={currentUser}
            users={users}
            onSaveUsers={handleSaveUsers}
            questions={questions}
            onSaveQuestions={handleSaveQuestions}
            exams={exams}
            onSaveExams={handleSaveExams}
            results={results}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            subjects={subjects}
            onSaveSubjects={handleSaveSubjects}
          />
        )}

      </main>

      {/* Global Simple Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>&copy; 2026 CBT Mindasa • MIN 2 KOTA SURABAYA</span>
          <span className="text-slate-400">Database: Google Drive & Google Sheets API</span>
        </div>
      </footer>

    </div>
  );
}

export default App;
