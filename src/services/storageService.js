// Storage Service - Mengelola persistensi data Lokal (localStorage)
// dan sinkronisasi dengan Google Drive via Google Apps Script API

import { INITIAL_USERS, INITIAL_QUESTIONS, INITIAL_EXAMS, INITIAL_RESULTS, INITIAL_SUBJECTS } from '../data/initialData';

const STORAGE_KEYS = {
  USERS: 'cbt_users_v1',
  QUESTIONS: 'cbt_questions_v1',
  EXAMS: 'cbt_exams_v1',
  RESULTS: 'cbt_results_v1',
  SETTINGS: 'cbt_settings_v1',
  SUBJECTS: 'cbt_subjects_v1',
  CURRENT_USER: 'cbt_current_user_v1',
  EXAM_SESSION: 'cbt_active_exam_session_v1'
};

const DEFAULT_SETTINGS = {
  schoolName: 'MIN 2 KOTA SURABAYA',
  appName: 'CBT Mindasa',
  schoolLogo: './logo-min2.png',
  gdriveScriptUrl: 'https://script.google.com/macros/s/AKfycbzfAcWRNpyi3ZAiY7uTZzqo-B88NWYLyD_THbTRAF3t83KCVcIJXNeRzwqnlxLVqreE/exec',
  maxViolationsAllowed: 3, // Maksimal toleransi pelanggaran sebelum ujian terkunci
  enableProctoring: true, // Pantau fullscreen & tab
  autoSaveIntervalSeconds: 10,
  syncStatus: 'synced' // 'offline_ready' | 'synced' | 'syncing' | 'error'
};

export const storageService = {
  // Inisialisasi awal jika storage kosong
  init() {
    if (!localStorage.getItem(STORAGE_KEYS.USERS)) {
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    }
    // Jika belum ada questions atau berisi data demo lama 'q-101', kosongkan!
    const existingQ = localStorage.getItem(STORAGE_KEYS.QUESTIONS);
    if (!existingQ || existingQ.includes('q-101') || existingQ.includes('Hutan mangrove')) {
      localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify([]));
    }
    // Bersihkan ujian demo lama jika masih tersimpan di browser
    const existingExamsStr = localStorage.getItem(STORAGE_KEYS.EXAMS);
    if (!existingExamsStr) {
      localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
    } else {
      try {
        const parsedExams = JSON.parse(existingExamsStr);
        let changed = false;
        const cleanedExams = parsedExams.map(ex => {
          if (ex.title && ex.title.includes('Asesmen Sumatif Akhir Jenjang')) {
            changed = true;
            return {
              ...ex,
              title: `Ujian ${ex.subject || 'Matematika'}`,
              subject: ex.subject && !ex.subject.includes('Literasi, Numerasi') ? ex.subject : 'Matematika',
              categories: [ex.subject && !ex.subject.includes('Literasi, Numerasi') ? ex.subject : 'Matematika']
            };
          }
          return ex;
        });
        if (changed) {
          localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(cleanedExams));
        }
      } catch (e) {
        localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
      }
    }
    if (!localStorage.getItem(STORAGE_KEYS.RESULTS)) {
      localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_RESULTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SETTINGS)) {
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.SUBJECTS)) {
      localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
    }
  },

  // Reset ke data awal (untuk demo atau restore)
  resetToDefaults() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(INITIAL_USERS));
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify([]));
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(INITIAL_EXAMS));
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(INITIAL_RESULTS));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(DEFAULT_SETTINGS));
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(INITIAL_SUBJECTS));
    localStorage.removeItem(STORAGE_KEYS.EXAM_SESSION);
  },

  // ================= SUBJECTS (MATA PELAJARAN) =================
  getSubjects() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.SUBJECTS)) || INITIAL_SUBJECTS;
    } catch {
      return INITIAL_SUBJECTS;
    }
  },
  saveSubjects(subjects) {
    localStorage.setItem(STORAGE_KEYS.SUBJECTS, JSON.stringify(subjects));
  },
  addSubject(subject) {
    const subjects = this.getSubjects();
    if (!subjects.includes(subject)) {
      subjects.push(subject);
      this.saveSubjects(subjects);
    }
    return subjects;
  },
  deleteSubject(subject) {
    const subjects = this.getSubjects().filter(s => s !== subject);
    this.saveSubjects(subjects);
    return subjects;
  },

  // ================= USERS =================
  getUsers() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.USERS)) || INITIAL_USERS;
    } catch {
      return INITIAL_USERS;
    }
  },
  saveUsers(users) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
  },
  addUser(user) {
    const users = this.getUsers();
    users.push(user);
    this.saveUsers(users);
    return user;
  },
  updateUser(id, updatedFields) {
    const users = this.getUsers().map(u => u.id === id ? { ...u, ...updatedFields } : u);
    this.saveUsers(users);
  },
  deleteUser(id) {
    const users = this.getUsers().filter(u => u.id !== id);
    this.saveUsers(users);
  },

  // ================= QUESTIONS (BANK SOAL) =================
  getQuestions() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.QUESTIONS)) || INITIAL_QUESTIONS;
    } catch {
      return INITIAL_QUESTIONS;
    }
  },
  saveQuestions(questions) {
    localStorage.setItem(STORAGE_KEYS.QUESTIONS, JSON.stringify(questions));
  },
  addQuestion(question) {
    const questions = this.getQuestions();
    questions.push(question);
    this.saveQuestions(questions);
    return question;
  },
  updateQuestion(id, updatedFields) {
    const questions = this.getQuestions().map(q => q.id === id ? { ...q, ...updatedFields } : q);
    this.saveQuestions(questions);
  },
  deleteQuestion(id) {
    const questions = this.getQuestions().filter(q => q.id !== id);
    this.saveQuestions(questions);
  },

  // ================= EXAMS (UJIAN & TOKEN) =================
  getExams() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAMS)) || INITIAL_EXAMS;
    } catch {
      return INITIAL_EXAMS;
    }
  },
  saveExams(exams) {
    localStorage.setItem(STORAGE_KEYS.EXAMS, JSON.stringify(exams));
  },
  addExam(exam) {
    const exams = this.getExams();
    exams.push(exam);
    this.saveExams(exams);
    return exam;
  },
  updateExam(id, updatedFields) {
    const exams = this.getExams().map(e => e.id === id ? { ...e, ...updatedFields } : e);
    this.saveExams(exams);
  },
  deleteExam(id) {
    const exams = this.getExams().filter(e => e.id !== id);
    this.saveExams(exams);
  },

  // ================= RESULTS (NILAI & PELANGGARAN) =================
  getResults() {
    this.init();
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.RESULTS)) || INITIAL_RESULTS;
    } catch {
      return INITIAL_RESULTS;
    }
  },
  saveResults(results) {
    localStorage.setItem(STORAGE_KEYS.RESULTS, JSON.stringify(results));
  },
  addResult(result) {
    const results = this.getResults();
    // Jika siswa sudah submit sebelumnya, ganti atau tambah
    const existingIndex = results.findIndex(r => r.studentId === result.studentId && r.examId === result.examId);
    if (existingIndex >= 0) {
      results[existingIndex] = result;
    } else {
      results.unshift(result);
    }
    this.saveResults(results);
    return result;
  },

  // ================= SETTINGS =================
  getSettings() {
    this.init();
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEYS.SETTINGS) || '{}');
      if (!saved.schoolName || saved.schoolName.includes('BINA PRESTASI')) {
        saved.schoolName = 'MIN 2 KOTA SURABAYA';
      }
      if (!saved.appName) {
        saved.appName = 'CBT Mindasa';
      }
      // Paksa logo lokal (override URL lama dari Unsplash/Blogger)
      if (!saved.schoolLogo || saved.schoolLogo.includes('unsplash') || saved.schoolLogo.includes('blogger')) {
        saved.schoolLogo = './logo-min2.png';
      }
      // Paksa URL Google Drive jika belum diisi atau masih kosong
      if (!saved.gdriveScriptUrl || saved.gdriveScriptUrl.includes('AKfycbwmZqF5')) {
        saved.gdriveScriptUrl = 'https://script.google.com/macros/s/AKfycbzfAcWRNpyi3ZAiY7uTZzqo-B88NWYLyD_THbTRAF3t83KCVcIJXNeRzwqnlxLVqreE/exec';
      }
      return { ...DEFAULT_SETTINGS, ...saved };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },
  saveSettings(settings) {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
  },

  // ================= AUTH CURRENT USER =================
  getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CURRENT_USER));
    } catch {
      return null;
    }
  },
  setCurrentUser(user) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  },

  // ================= ACTIVE EXAM SESSION (UNTUK SISWA) =================
  getActiveExamSession() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.EXAM_SESSION));
    } catch {
      return null;
    }
  },
  saveActiveExamSession(session) {
    if (session) {
      localStorage.setItem(STORAGE_KEYS.EXAM_SESSION, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEYS.EXAM_SESSION);
    }
  },
  clearActiveExamSession() {
    localStorage.removeItem(STORAGE_KEYS.EXAM_SESSION);
  }
};
