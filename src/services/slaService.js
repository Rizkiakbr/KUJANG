import slaConfig from '../config/slaConfig.json';
import {
  addMonths,
  addDays,
  subDays,
  differenceInCalendarDays,
} from 'date-fns';
import { isNonWorkday } from './holidayService';

/**
 * Tambah N hari kerja (skip Sabtu, Minggu & libur nasional) dari tanggal mulai
 * @param {Date|string} startDate
 * @param {number} n
 * @param {Array} holidays - array dari holidayService.getHolidays() (opsional)
 * @returns {Date}
 */
export function addWorkdays(startDate, n, holidays = []) {
  let date = new Date(startDate);
  let count = 0;
  while (count < n) {
    date = addDays(date, 1);
    if (!isNonWorkday(date, holidays)) count++;
  }
  return date;
}

/**
 * Hitung jatuh tempo bulan kalender
 * Logika: (tanggal BPE - 1 hari) + N bulan
 * Jika hasil jatuh di weekend atau libur nasional → mundur ke hari kerja terakhir
 *
 * Contoh:
 *   BPE 20 Jul 2026 + 1 bln → base 19 Jul → +1 bln = 19 Agu (Rabu) ✅
 *   BPE 31 Jul 2026 + 1 bln → base 30 Jul → +1 bln = 30 Agu (Min) → 28 Agu (Jum) ✅
 *   BPE  1 Jul 2026 + 1 bln → base 30 Jun → +1 bln = 30 Jul (Kam) ✅
 *
 * @param {Date|string} startDate - Tanggal BPE/LPAD
 * @param {number} months         - Jumlah bulan (1 atau 3)
 * @param {Array}  holidays       - array dari holidayService.getHolidays() (opsional)
 * @returns {Date} Tanggal jatuh tempo
 */
export function addCalendarMonths(startDate, months, holidays = []) {
  // Kurangi 1 hari dari tanggal BPE, lalu tambah N bulan
  const base = subDays(new Date(startDate), 1);
  let result = addMonths(base, months);

  // Mundur selama jatuh di weekend atau libur nasional
  while (isNonWorkday(result, holidays)) {
    result = subDays(result, 1);
  }

  return result;
}

/**
 * Hitung tanggal jatuh tempo berdasarkan jenisLayananId & tanggalLPAD
 * @param {Date|string} tanggalLPAD
 * @param {string} jenisLayananId
 * @param {Array} holidays - opsional, default [] (fallback ke skip weekend saja)
 * @returns {Date} jatuhTempo
 */
export function calcJatuhTempo(tanggalLPAD, jenisLayananId, holidays = []) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  if (!config) throw new Error(`Jenis layanan tidak ditemukan: ${jenisLayananId}`);
  if (config.slaType === 'workdays') {
    return addWorkdays(tanggalLPAD, config.slaDays, holidays);
  }
  if (config.slaType === 'calendar_month') {
    return addCalendarMonths(tanggalLPAD, config.slaMonths, holidays);
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
 * Hitung semua jatuh tempo untuk kasus multi-JT (No.1-4)
 * SKB (No.5) tidak menggunakan fungsi ini
 *
 * @param {Object} caseData        - Data kasus lengkap (tanggal bisa Firestore Timestamp atau string)
 * @param {string} jenisLayananId
 * @param {Array}  holidays        - Daftar libur nasional
 * @returns {Array|null}           - Array JT atau null jika bukan multi-JT
 */
export function calcMultiJatuhTempo(caseData, jenisLayananId, holidays = []) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  if (!config?.multiJatuhTempo) return null;

  return config.jatuhTempoConfig.map(jtConfig => {
    const rawStart = caseData[jtConfig.mulaiDari];

    // Normalise Firestore Timestamp / string / null
    const startDate = rawStart
      ? (typeof rawStart.toDate === 'function' ? rawStart.toDate() : new Date(rawStart))
      : null;

    // Jika tanggal mulai belum diisi → JT belum bisa dihitung
    if (!startDate) {
      return {
        tahap:      jtConfig.tahap,
        label:      jtConfig.label,
        labelMulai: jtConfig.labelMulai,
        mulaiDari:  jtConfig.mulaiDari,
        jatuhTempo: null,
        status:     null,
      };
    }

    const jatuhTempo = addCalendarMonths(startDate, jtConfig.slaMonths, holidays);

    // Buat snapshot caseData yang hanya menyertakan tanggal penyelesaian
    // yang relevan untuk tahap ini — agar calcSLAStatus tahu apakah tahap ini sudah selesai
    const snapshotData = { ...caseData };
    if (jtConfig.tahap !== 'Produk Hukum') snapshotData.tanggalProdukHukum = null;
    if (jtConfig.tahap !== 'SKPKPP')       snapshotData.tanggalSKPKPP = null;
    if (jtConfig.tahap !== 'SPMKP')        snapshotData.tanggalSPMKP = null;

    const status = calcSLAStatus(jatuhTempo, jenisLayananId, snapshotData);

    return {
      tahap:      jtConfig.tahap,
      label:      jtConfig.label,
      labelMulai: jtConfig.labelMulai,
      mulaiDari:  jtConfig.mulaiDari,
      jatuhTempo,
      status,
    };
  });
}

/**
 * Ambil status paling kritis dari array multi JT
 * Urutan prioritas: OVERDUE > WARNING > COMPLETED_LATE > SAFE > COMPLETED_ONTIME
 *
 * @param {Array} multiJT
 * @returns {object|null}
 */
export function getStatusTerkritis(multiJT) {
  if (!multiJT) return null;
  const aktif = multiJT.filter(jt => jt.status !== null);
  if (aktif.length === 0) return null;

  const prioritas = {
    OVERDUE: 1, WARNING: 2, COMPLETED_LATE: 3,
    SAFE: 4, COMPLETED_ONTIME: 5,
  };

  return aktif.sort(
    (a, b) => (prioritas[a.status?.code] ?? 99) - (prioritas[b.status?.code] ?? 99)
  )[0];
}

/**
 * Validasi urutan tanggal dokumen berdasarkan slaConfig.validasiUrutan
 *
 * @param {object} formData        - Data form (tanggal sebagai string 'yyyy-MM-dd')
 * @param {string} jenisLayananId
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateUrutan(formData, jenisLayananId) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  if (!config?.validasiUrutan) return { valid: true, errors: [] };

  const errors = [];
  const urutan = config.validasiUrutan;

  for (let i = 0; i < urutan.length - 1; i++) {
    const curr = urutan[i];
    const next = urutan[i + 1];

    // Normalise Firestore Timestamp / string / Date
    const rawCurr = formData[curr.field];
    const rawNext = formData[next.field];

    const currVal = rawCurr
      ? (typeof rawCurr.toDate === 'function' ? rawCurr.toDate() : new Date(rawCurr))
      : null;
    const nextVal = rawNext
      ? (typeof rawNext.toDate === 'function' ? rawNext.toDate() : new Date(rawNext))
      : null;

    // Skip jika salah satu kosong
    if (!currVal || !nextVal) continue;

    if (currVal > nextVal) {
      errors.push(`${curr.label} tidak boleh lebih baru dari ${next.label}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Lookup config jenis layanan by id
 * @param {string} id
 * @returns {object|undefined}
 */
export function getJenisLayananConfig(id) {
  return slaConfig.jenisLayanan.find(j => j.id === id);
}
