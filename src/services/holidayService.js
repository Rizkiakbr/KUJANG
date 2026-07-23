import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

/**
 * Libur nasional Indonesia 2026 (seed data default)
 */
const DEFAULT_HOLIDAYS_2026 = [
  { date: '2026-01-01', name: 'Tahun Baru Masehi' },
  { date: '2026-01-27', name: 'Isra Mi\'raj' },
  { date: '2026-01-29', name: 'Tahun Baru Imlek' },
  { date: '2026-03-19', name: 'Hari Raya Nyepi' },
  { date: '2026-03-20', name: 'Wafat Isa Almasih' },
  { date: '2026-03-30', name: 'Hari Raya Idul Fitri' },
  { date: '2026-03-31', name: 'Hari Raya Idul Fitri' },
  { date: '2026-04-01', name: 'Cuti Bersama Idul Fitri' },
  { date: '2026-04-02', name: 'Cuti Bersama Idul Fitri' },
  { date: '2026-04-03', name: 'Cuti Bersama Idul Fitri' },
  { date: '2026-05-01', name: 'Hari Buruh Internasional' },
  { date: '2026-05-14', name: 'Kenaikan Isa Almasih' },
  { date: '2026-05-24', name: 'Hari Raya Waisak' },
  { date: '2026-06-01', name: 'Hari Lahir Pancasila' },
  { date: '2026-06-06', name: 'Idul Adha' },
  { date: '2026-06-26', name: 'Tahun Baru Islam' },
  { date: '2026-08-17', name: 'Hari Kemerdekaan RI' },
  { date: '2026-09-04', name: 'Maulid Nabi Muhammad SAW' },
  { date: '2026-12-25', name: 'Hari Raya Natal' },
];

/**
 * Ambil daftar libur nasional untuk tahun tertentu dari Firestore.
 * Jika dokumen belum ada untuk tahun 2026, seed data default secara otomatis.
 *
 * @param {number} year
 * @returns {Promise<Array<{date: string, name: string}>>}
 */
export async function getHolidays(year) {
  const docRef = doc(db, 'holidayCalendar', String(year));
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    // Auto-seed data 2026 jika belum ada
    if (year === 2026) {
      const seedData = {
        year: 2026,
        holidays: DEFAULT_HOLIDAYS_2026,
        createdAt: new Date(),
        updatedBy: 'system-seed',
      };
      await setDoc(docRef, seedData);
      return DEFAULT_HOLIDAYS_2026;
    }
    return [];
  }

  return snap.data().holidays ?? [];
}

/**
 * Tambah satu hari libur ke koleksi tahun tertentu
 *
 * @param {number} year
 * @param {{ date: string, name: string }} holiday - { date: 'YYYY-MM-DD', name: '...' }
 * @param {string} updatedBy - UID atau nama user yang mengubah
 * @returns {Promise<void>}
 */
export async function addHoliday(year, holiday, updatedBy = 'unknown') {
  const docRef = doc(db, 'holidayCalendar', String(year));
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    // Buat dokumen baru jika belum ada
    await setDoc(docRef, {
      year,
      holidays: [holiday],
      createdAt: new Date(),
      updatedBy,
    });
  } else {
    const existing = snap.data().holidays ?? [];
    // Cegah duplikasi tanggal yang sama
    if (existing.some(h => h.date === holiday.date)) return;
    const sorted = [...existing, holiday].sort((a, b) => a.date.localeCompare(b.date));
    await updateDoc(docRef, { holidays: sorted, updatedBy, updatedAt: new Date() });
  }
}

/**
 * Hapus satu hari libur dari koleksi tahun tertentu
 *
 * @param {number} year
 * @param {string} date - format 'YYYY-MM-DD'
 * @param {string} updatedBy
 * @returns {Promise<void>}
 */
export async function removeHoliday(year, date, updatedBy = 'unknown') {
  const docRef = doc(db, 'holidayCalendar', String(year));
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const existing = snap.data().holidays ?? [];
  const filtered = existing.filter(h => h.date !== date);
  await updateDoc(docRef, { holidays: filtered, updatedBy, updatedAt: new Date() });
}

/**
 * Cek apakah tanggal adalah hari libur nasional
 *
 * @param {Date} date
 * @param {Array<{date: string, name: string}>} holidays
 * @returns {boolean}
 */
export function isHoliday(date, holidays) {
  // Format lokal ke YYYY-MM-DD tanpa konversi timezone
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;
  return holidays.some(h => h.date === dateStr);
}

/**
 * Cek apakah tanggal adalah hari tidak kerja
 * (Sabtu, Minggu, atau libur nasional)
 *
 * @param {Date} date
 * @param {Array<{date: string, name: string}>} holidays - opsional, default []
 * @returns {boolean}
 */
export function isNonWorkday(date, holidays = []) {
  const day = date.getDay();
  if (day === 0 || day === 6) return true; // Minggu (0) atau Sabtu (6)
  return isHoliday(date, holidays);
}
