import slaConfig from '../config/slaConfig.json';
import {
  endOfMonth,
  addMonths,
  addDays,
  isWeekend,
  differenceInCalendarDays,
} from 'date-fns';

/**
 * Tambah N hari kerja (skip Sabtu & Minggu) dari tanggal mulai
 * @param {Date|string} startDate
 * @param {number} n
 * @returns {Date}
 */
export function addWorkdays(startDate, n) {
  let date = new Date(startDate);
  let count = 0;
  while (count < n) {
    date = addDays(date, 1);
    if (!isWeekend(date)) count++;
  }
  return date;
}

/**
 * Hitung hari terakhir bulan ke-N setelah tanggal LPAD
 * Contoh: LPAD 15 Jan → n=1 → akhir Februari
 * @param {Date|string} startDate
 * @param {number} n
 * @returns {Date}
 */
export function addCalendarMonths(startDate, n) {
  return endOfMonth(addMonths(new Date(startDate), n));
}

/**
 * Hitung tanggal jatuh tempo berdasarkan jenisLayananId & tanggalLPAD
 * @param {Date|string} tanggalLPAD
 * @param {string} jenisLayananId
 * @returns {Date} jatuhTempo
 */
export function calcJatuhTempo(tanggalLPAD, jenisLayananId) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  if (!config) throw new Error(`Jenis layanan tidak ditemukan: ${jenisLayananId}`);
  if (config.slaType === 'workdays') {
    return addWorkdays(tanggalLPAD, config.slaDays);
  }
  if (config.slaType === 'calendar_month') {
    return addCalendarMonths(tanggalLPAD, config.slaMonths);
  }
  throw new Error(`slaType tidak dikenal: ${config.slaType}`);
}

/**
 * Hitung status SLA dari jatuh tempo
 * @param {Date|string|object} jatuhTempo  — Date, string ISO, atau Firestore Timestamp
 * @param {string} jenisLayananId
 * @returns {{ code: 'OVERDUE'|'WARNING'|'SAFE', sisaHari: number, label: string }}
 */
export function calcSLAStatus(jatuhTempo, jenisLayananId) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  if (!config) return { code: 'SAFE', sisaHari: 999, label: '-' };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Handle Firestore Timestamp object
  let jt;
  if (jatuhTempo && typeof jatuhTempo.toDate === 'function') {
    jt = jatuhTempo.toDate();
  } else {
    jt = new Date(jatuhTempo);
  }
  jt.setHours(0, 0, 0, 0);

  const sisaHari = differenceInCalendarDays(jt, today);

  if (sisaHari < 0)  return { code: 'OVERDUE', sisaHari, label: `Lewat ${Math.abs(sisaHari)} hari` };
  if (sisaHari === 0) return { code: 'OVERDUE', sisaHari, label: 'Jatuh tempo hari ini!' };
  if (sisaHari <= config.warningDays) return { code: 'WARNING', sisaHari, label: `H-${sisaHari}` };
  return { code: 'SAFE', sisaHari, label: `${sisaHari} hari` };
}

/**
 * Lookup config jenis layanan by id
 * @param {string} id
 * @returns {object|undefined}
 */
export function getJenisLayananConfig(id) {
  return slaConfig.jenisLayanan.find(j => j.id === id);
}
