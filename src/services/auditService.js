import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

const COLLECTION = 'auditLogs';

/**
 * Tulis audit log ke Firestore
 * @param {{ userUid, userName, userRole, action, targetId, detail }} params
 */
export async function writeAuditLog({ userUid, userName, userRole, action, targetId, detail }) {
  try {
    await addDoc(collection(db, COLLECTION), {
      timestamp: serverTimestamp(),
      userUid:   userUid   || '',
      userName:  userName  || '',
      userRole:  userRole  || '',
      action:    action    || '',
      targetId:  targetId  || null,
      detail:    detail    || '',
    });
  } catch (err) {
    // Audit log failure tidak boleh crash aplikasi
    console.error('[AuditLog] Gagal menulis log:', err);
  }
}

/**
 * Ambil audit logs dengan filter opsional
 * @param {{ userUid?: string, action?: string, startDate?: Date, endDate?: Date }} filters
 */
export async function getAuditLogs(filters = {}) {
  const q = query(collection(db, COLLECTION), orderBy('timestamp', 'desc'));
  const snap = await getDocs(q);

  let logs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  if (filters.userUid) {
    logs = logs.filter(l => l.userUid === filters.userUid);
  }
  if (filters.action) {
    logs = logs.filter(l => l.action === filters.action);
  }

  // Filter tanggal secara client-side
  if (filters.startDate) {
    logs = logs.filter(l => {
      const ts = l.timestamp?.toDate?.() ?? new Date(l.timestamp);
      return ts >= filters.startDate;
    });
  }
  if (filters.endDate) {
    logs = logs.filter(l => {
      const ts = l.timestamp?.toDate?.() ?? new Date(l.timestamp);
      return ts <= filters.endDate;
    });
  }

  return logs;
}
