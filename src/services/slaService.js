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
 *
 * LOGIKA:
 * - Kasus sudah selesai (ada tanggalSPMKP/SKPKPP/ProdukHukum):
 *     → bandingkan tanggal penyelesaian vs jatuh tempo
 *     → COMPLETED_ONTIME jika selesai tepat/sebelum jatuh tempo
 *     → COMPLETED_LATE   jika selesai sesudah jatuh tempo
 * - Kasus belum selesai:
 *     → bandingkan hari ini vs jatuh tempo
 *     → OVERDUE / WARNING / SAFE (perilaku lama)
 *
 * @param {Date|string|object} jatuhTempo  — Date, string ISO, atau Firestore Timestamp
 * @param {string} jenisLayananId
 * @param {object|null} caseData          — objek kasus lengkap, opsional
 * @returns {{ code: string, sisaHari: number, label: string, completedDate?: Date }}
 */
export function calcSLAStatus(jatuhTempo, jenisLayananId, caseData = null) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  if (!config) return { code: 'SAFE', sisaHari: 999, label: '-' };

  // Handle Firestore Timestamp object untuk jatuhTempo
  let jt;
  if (jatuhTempo && typeof jatuhTempo.toDate === 'function') {
    jt = jatuhTempo.toDate();
  } else {
    jt = new Date(jatuhTempo);
  }
  jt.setHours(0, 0, 0, 0);

  // ── Tentukan tanggal referensi & cek apakah sudah selesai ──
  let referenceDate = new Date();
  referenceDate.setHours(0, 0, 0, 0);
  let isCompleted = false;
  let completedDate = null;

  if (caseData) {
    // Urutan prioritas: SPMKP (paling akhir) → SKPKPP → Produk Hukum
    const rawDate =
      caseData.tanggalSPMKP ||
      caseData.tanggalSKPKPP ||
      caseData.tanggalProdukHukum ||
      null;

    if (rawDate) {
      // Handle Firestore Timestamp atau string/Date
      completedDate = typeof rawDate.toDate === 'function'
        ? rawDate.toDate()
        : new Date(rawDate);
      completedDate.setHours(0, 0, 0, 0);
      referenceDate = completedDate;
      isCompleted = true;
    }
  }

  const sisaHari = differenceInCalendarDays(jt, referenceDate);

  // ── Kasus sudah selesai ──
  if (isCompleted) {
    if (sisaHari >= 0) {
      return {
        code: 'COMPLETED_ONTIME',
        sisaHari,
        label: sisaHari === 0 ? 'Tepat Waktu' : `Selesai H-${sisaHari}`,
        completedDate,
      };
    } else {
      return {
        code: 'COMPLETED_LATE',
        sisaHari,
        label: `Terlambat ${Math.abs(sisaHari)} hari`,
        completedDate,
      };
    }
  }

  // ── Kasus belum selesai — bandingkan dengan hari ini ──
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
