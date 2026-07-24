/**
 * documentService.js
 * Upload, list, dan hapus dokumen PDF per kasus & tahap di Firebase Storage.
 *
 * Storage path: cases/{caseId}/{tahap}/{filename}
 * Tahap: 'produk-hukum' | 'skpkpp' | 'spmkp'
 */
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
  listAll,
} from 'firebase/storage';
import { storage } from '../config/firebaseConfig';
import { writeAuditLog } from './auditService';

const TAHAP_LIST = ['produk-hukum', 'skpkpp', 'spmkp'];

/**
 * Upload dokumen PDF ke Firebase Storage
 *
 * @param {File}   file         - File PDF dari input
 * @param {string} caseId       - ID kasus di Firestore
 * @param {string} tahap        - 'produk-hukum' | 'skpkpp' | 'spmkp'
 * @param {{ uid, nama }} currentUser
 * @returns {{ filename, downloadURL, tahap }}
 */
export async function uploadDokumen(file, caseId, tahap, currentUser) {
  if (file.type !== 'application/pdf') {
    throw new Error('Hanya file PDF yang diizinkan');
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error('Ukuran file maksimal 10MB');
  }

  const filename    = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`;
  const storageRef  = ref(storage, `cases/${caseId}/${tahap}/${filename}`);

  await uploadBytes(storageRef, file);
  const downloadURL = await getDownloadURL(storageRef);

  await writeAuditLog({
    userUid:  currentUser.uid,
    userName: currentUser.nama,
    userRole: currentUser.role,
    action:   'UPLOAD_DOKUMEN',
    targetId: caseId,
    detail:   `Upload PDF ${tahap}: ${file.name} oleh ${currentUser.nama}`,
  });

  return { filename, downloadURL, tahap };
}

/**
 * Ambil daftar semua dokumen untuk sebuah kasus, dikelompokkan per tahap
 *
 * @param {string} caseId
 * @returns {Record<string, Array<{ filename, downloadURL, fullPath }>>}
 */
export async function getDokumenKasus(caseId) {
  const result = {};

  for (const tahap of TAHAP_LIST) {
    try {
      const listRef    = ref(storage, `cases/${caseId}/${tahap}`);
      const listResult = await listAll(listRef);
      result[tahap]    = await Promise.all(
        listResult.items.map(async item => ({
          filename:    item.name,
          downloadURL: await getDownloadURL(item),
          fullPath:    item.fullPath,
        }))
      );
    } catch {
      // Jika folder belum ada (belum ada upload), kembalikan array kosong
      result[tahap] = [];
    }
  }

  return result;
}

/**
 * Hapus dokumen dari Firebase Storage
 *
 * @param {string} fullPath   - item.fullPath dari getDokumenKasus
 * @param {{ uid, nama, role }} currentUser
 */
export async function deleteDokumen(fullPath, currentUser) {
  await deleteObject(ref(storage, fullPath));

  await writeAuditLog({
    userUid:  currentUser.uid,
    userName: currentUser.nama,
    userRole: currentUser.role,
    action:   'DELETE_DOKUMEN',
    targetId: fullPath,
    detail:   `Hapus PDF: ${fullPath} oleh ${currentUser.nama}`,
  });
}
