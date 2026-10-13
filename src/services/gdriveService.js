// Service untuk Komunikasi dengan Google Drive / Google Sheets
// Melalui endpoint Google Apps Script Web App

import { storageService } from './storageService';

export const gdriveService = {
  /**
   * Tes koneksi ke URL Google Apps Script Web App
   */
  async testConnection(scriptUrl) {
    if (!scriptUrl || !scriptUrl.startsWith('https://script.google.com/macros/s/')) {
      return {
        success: false,
        message: 'Format URL tidak valid. Harus diawali dengan https://script.google.com/macros/s/.../exec'
      };
    }

    try {
      const response = await fetch(`${scriptUrl}?action=ping`, {
        method: 'GET',
        redirect: 'follow'
        // Tidak pakai custom headers agar tidak trigger CORS preflight
      });

      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
      }

      const data = await response.json();
      return {
        success: true,
        message: data.message || 'Koneksi ke Google Drive berhasil!',
        data
      };
    } catch (err) {
      console.warn('Test connection error:', err);
      return {
        success: false,
        message: `Gagal terhubung. Pastikan Apps Script di-deploy ulang dengan akses "Anyone" (Siapa Saja, termasuk tanpa akun). Error: ${err.message}`
      };
    }
  },

  /**
   * Mengunduh seluruh data dari Google Drive, lalu simpan ke localStorage
   * Hanya timpa data jika Drive mengembalikan data valid (tidak kosong)
   */
  async pullDataFromDrive(scriptUrl) {
    if (!scriptUrl) throw new Error('URL Google Apps Script belum diisi');

    try {
      const response = await fetch(`${scriptUrl}?action=getData`, {
        method: 'GET'
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result && result.status === 'success') {
        const payload = result.data;
        // Hanya timpa jika Drive punya data (bukan array kosong dari Drive yang kosong)
        if (payload.users && payload.users.length > 0) storageService.saveUsers(payload.users);
        if (payload.questions) storageService.saveQuestions(payload.questions); // Soal boleh kosong
        if (payload.exams && payload.exams.length > 0) {
          const sanitizedExams = payload.exams.map(ex => {
            if (ex.title && ex.title.includes('Asesmen Sumatif Akhir Jenjang')) {
              const subj = ex.subject && !ex.subject.includes('Literasi, Numerasi') ? ex.subject : 'Matematika';
              return {
                ...ex,
                title: `Ujian ${subj}`,
                subject: subj,
                categories: [subj]
              };
            }
            return ex;
          });
          storageService.saveExams(sanitizedExams);
        }
        if (payload.results) storageService.saveResults(payload.results);
        if (payload.subjects && payload.subjects.length > 0) storageService.saveSubjects(payload.subjects);
        return { success: true, message: 'Data berhasil ditarik dari Google Drive!' };
      } else {
        throw new Error(result.message || 'Format data dari Google Drive tidak valid');
      }
    } catch (err) {
      console.error('Pull data error:', err);
      throw err;
    }
  },

  /**
   * Mengirim / Mencadangkan seluruh data lokal ke Google Drive
   */
  async pushDataToDrive(scriptUrl) {
    if (!scriptUrl) throw new Error('URL Google Apps Script belum diisi');

    const payload = {
      action: 'saveData',
      users: storageService.getUsers(),
      questions: storageService.getQuestions(),
      exams: storageService.getExams(),
      results: storageService.getResults(),
      subjects: storageService.getSubjects(),
      timestamp: new Date().toISOString()
    };

    try {
      // GAS Web App POST request
      const response = await fetch(scriptUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8' // Hindari preflight CORS ketat pada GAS
        },
        body: JSON.stringify(payload)
      });

      const resJson = await response.json();
      return {
        success: true,
        message: resJson.message || 'Data berhasil disimpan ke Google Drive / Google Sheets!'
      };
    } catch (err) {
      console.error('Push data error:', err);
      throw err;
    }
  },

  /**
   * Kirim satu hasil ujian siswa langsung ke Google Drive
   */
  async submitExamResultToDrive(scriptUrl, examResult) {
    if (!scriptUrl) return false;

    try {
      await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'submitResult',
          result: examResult
        })
      });
      return true;
    } catch (err) {
      console.warn('Gagal sinkronisasi hasil ke Drive saat submit:', err);
      return false;
    }
  }
};
