import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
import { calcJatuhTempo } from './slaService';
import { writeAuditLog } from './auditService';
import slaConfig from '../config/slaConfig.json';

const COLLECTION = 'cases';

/**
 * Hitung tahapSaatIni secara dinamis berdasarkan alurTahap jenis layanan
 * - SKB: hanya sampai Produk Hukum
 * - Non-SKB: sampai SPMKP
 */
function calcTahap(data) {
  const jenisConfig = slaConfig.jenisLayanan.find(j => j.id === data.jenisLayananId);
  const alur = jenisConfig?.alurTahap ?? [];

  // SKB — hanya sampai Produk Hukum
  if (!alur.includes('SKPKPP')) {
    return data.nomorProdukHukum ? 'Produk Hukum' : 'Awal';
  }

  // Non-SKB — sampai SPMKP
  if (data.nomorSPMKP)       return 'SPMKP';
  if (data.nomorSKPKPP)      return 'SKPKPP';
  if (data.nomorProdukHukum) return 'Produk Hukum';
  return 'Awal';
}

/**
 * Konversi string tanggal ke Firestore Timestamp
 */
function toTimestamp(val) {
  if (!val) return null;
  if (val instanceof Timestamp) return val;
  if (val instanceof Date) return Timestamp.fromDate(val);
  return Timestamp.fromDate(new Date(val));
}

/**
 * Ambil semua kasus dengan filter opsional
 * @param {{ penyuluhId?: string, statusSLA?: string }} filters
 */
export async function getCases(filters = {}) {
  const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  let list = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filters.penyuluhId) {
    list = list.filter(c => c.penyuluhId === filters.penyuluhId);
  }
  return list;
}

/**
 * Ambil satu kasus by ID
 */
export async function getCaseById(id) {
  const snap = await getDoc(doc(db, COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() };
}

/**
 * Buat kasus baru
 * @param {object} data  - raw form data
 * @param {{ uid, nama, role }} currentUser
 */
export async function createCase(data, currentUser) {
  // Penyuluh hanya bisa buat kasus untuk dirinya sendiri
  if (currentUser.role === 'penyuluh') {
    data = { ...data, penyuluhId: currentUser.penyuluhId };
  }

  const jatuhTempo = calcJatuhTempo(data.tanggalLPAD, data.jenisLayananId);
  const tahapSaatIni = calcTahap(data);

  const payload = {
    jenisLayananId:     data.jenisLayananId,
    npwp:               data.npwp,
    namaWP:             data.namaWP,
    nomorKasusCoretax:  data.nomorKasusCoretax,
    nomorLPAD:          data.nomorLPAD          || '',
    tanggalLPAD:        toTimestamp(data.tanggalLPAD),
    penyuluhId:         data.penyuluhId,
    jatuhTempo:         Timestamp.fromDate(jatuhTempo),
    hasilPenelitian:    data.hasilPenelitian     || null,
    nomorProdukHukum:   data.nomorProdukHukum    || '',
    tanggalProdukHukum: toTimestamp(data.tanggalProdukHukum),
    nomorSKPKPP:        data.nomorSKPKPP         || '',
    tanggalSKPKPP:      toTimestamp(data.tanggalSKPKPP),
    nomorSPMKP:         data.nomorSPMKP          || '',
    tanggalSPMKP:       toTimestamp(data.tanggalSPMKP),
    nominalRestitusi:   data.nominalRestitusi     ?? null,
    tahapSaatIni,
    createdBy:          currentUser.uid,
    createdAt:          serverTimestamp(),
    updatedBy:          currentUser.uid,
    updatedAt:          serverTimestamp(),
  };

  const ref = await addDoc(collection(db, COLLECTION), payload);

  await writeAuditLog({
    userUid:  currentUser.uid,
    userName: currentUser.nama,
    userRole: currentUser.role,
    action:   'CREATE_CASE',
    targetId: ref.id,
    detail:   `Membuat kasus baru: ${data.namaWP} (${data.jenisLayananId})`,
  });

  return ref.id;
}

/**
 * Update kasus
 * @param {string} id
 * @param {object} data
 * @param {{ uid, nama, role }} currentUser
 */
export async function updateCase(id, data, currentUser) {
  // Penyuluh hanya bisa edit kasus miliknya
  if (currentUser.role === 'penyuluh') {
    const snap = await getDoc(doc(db, COLLECTION, id));
    if (!snap.exists()) throw new Error('Kasus tidak ditemukan');
    if (snap.data().penyuluhId !== currentUser.penyuluhId) {
      throw new Error('Anda tidak memiliki akses untuk mengedit kasus ini');
    }
    // Paksa penyuluhId tidak bisa dimanipulasi
    data = { ...data, penyuluhId: currentUser.penyuluhId };
  }

  const jatuhTempo = calcJatuhTempo(data.tanggalLPAD, data.jenisLayananId);
  const tahapSaatIni = calcTahap(data);

  const payload = {
    jenisLayananId:     data.jenisLayananId,
    npwp:               data.npwp,
    namaWP:             data.namaWP,
    nomorKasusCoretax:  data.nomorKasusCoretax,
    nomorLPAD:          data.nomorLPAD          || '',
    tanggalLPAD:        toTimestamp(data.tanggalLPAD),
    penyuluhId:         data.penyuluhId,
    jatuhTempo:         Timestamp.fromDate(jatuhTempo),
    hasilPenelitian:    data.hasilPenelitian     || null,
    nomorProdukHukum:   data.nomorProdukHukum    || '',
    tanggalProdukHukum: toTimestamp(data.tanggalProdukHukum),
    nomorSKPKPP:        data.nomorSKPKPP         || '',
    tanggalSKPKPP:      toTimestamp(data.tanggalSKPKPP),
    nomorSPMKP:         data.nomorSPMKP          || '',
    tanggalSPMKP:       toTimestamp(data.tanggalSPMKP),
    nominalRestitusi:   data.nominalRestitusi     ?? null,
    tahapSaatIni,
    updatedBy:          currentUser.uid,
    updatedAt:          serverTimestamp(),
  };

  await updateDoc(doc(db, COLLECTION, id), payload);

  await writeAuditLog({
    userUid:  currentUser.uid,
    userName: currentUser.nama,
    userRole: currentUser.role,
    action:   'UPDATE_CASE',
    targetId: id,
    detail:   `Update kasus: ${data.namaWP} → tahap ${tahapSaatIni}`,
  });
}

/**
 * Hapus kasus — hanya Pelaksana yang diizinkan
 * @param {string} id
 * @param {object} caseData
 * @param {{ uid, nama, role }} currentUser
 */
export async function deleteCase(id, caseData, currentUser) {
  // Ambil data terbaru untuk audit log jika caseData tidak tersedia
  let kasusData = caseData;
  if (!kasusData) {
    const snap = await getDoc(doc(db, COLLECTION, id));
    kasusData = snap.exists() ? snap.data() : null;
  }

  await deleteDoc(doc(db, COLLECTION, id));

  await writeAuditLog({
    userUid:  currentUser.uid,
    userName: currentUser.nama,
    userRole: currentUser.role,
    action:   'DELETE_CASE',
    targetId: id,
    detail:   `Hapus kasus: ${kasusData?.namaWP || id} (${kasusData?.jenisLayananId || '-'}) dihapus oleh ${currentUser.nama}`,
  });
}

/**
 * Bulk create kasus dari data upload xlsx
 * @param {object[]} rows
 * @param {{ uid, nama, role }} currentUser
 */
export async function bulkCreateCases(rows, currentUser) {
  const results = { success: 0, errors: [] };
  for (const row of rows) {
    try {
      await createCase(row, currentUser);
      results.success++;
    } catch (err) {
      results.errors.push({ row, error: err.message });
    }
  }
  return results;
}

/**
 * Bulk create kasus untuk penyuluh — penyuluhId SELALU di-force dari currentUser.
 * Mencegah penyuluh upload kasus untuk penyuluh lain.
 *
 * @param {object[]} rows
 * @param {{ uid, nama, role, penyuluhId }} currentUser
 */
export async function bulkCreateCasesForPenyuluh(rows, currentUser) {
  // Override penyuluhId untuk setiap row — tidak bisa dimanipulasi
  const safeRows = rows.map(row => ({
    ...row,
    penyuluhId: currentUser.penyuluhId,
  }));
  return bulkCreateCases(safeRows, currentUser);
}
