import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { writeAuditLog } from './auditService';

/**
 * Login dengan NIP (NIP dijadikan email: nip@kujang.djp)
 * @param {string} nip
 * @param {string} password
 * @returns {{ user: object, userData: object }}
 */
export async function loginWithNIP(nip, password) {
  const email = `${nip}@kujang.djp`;
  const credential = await signInWithEmailAndPassword(auth, email, password);
  const userData = await getUserData(credential.user.uid);

  if (!userData) throw new Error('Data pengguna tidak ditemukan di sistem.');
  if (!userData.isActive) throw new Error('Akun Anda tidak aktif. Hubungi administrator.');

  // Update lastLogin
  await updateDoc(doc(db, 'users', credential.user.uid), {
    lastLogin: serverTimestamp(),
  });

  // Audit log
  await writeAuditLog({
    userUid: credential.user.uid,
    userName: userData.nama,
    userRole: userData.role,
    action: 'LOGIN',
    targetId: null,
    detail: `Login berhasil dari NIP ${nip}`,
  });

  return { user: credential.user, userData };
}

/**
 * Logout
 */
export async function logout(userData) {
  if (userData) {
    await writeAuditLog({
      userUid: userData.uid,
      userName: userData.nama,
      userRole: userData.role,
      action: 'LOGOUT',
      targetId: null,
      detail: 'Logout',
    });
  }
  await signOut(auth);
}

/**
 * Ambil data user dari Firestore berdasarkan UID
 * @param {string} uid
 * @returns {object|null}
 */
export async function getUserData(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() };
}

/**
 * Subscribe ke perubahan auth state
 * @param {function} callback  - dipanggil dengan (user|null, userData|null)
 * @returns {function} unsubscribe
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, async (firebaseUser) => {
    if (firebaseUser) {
      const userData = await getUserData(firebaseUser.uid);
      callback(firebaseUser, userData);
    } else {
      callback(null, null);
    }
  });
}

/**
 * Cek apakah role user ada di daftar yang diizinkan
 * @param {string} userRole
 * @param {string[]} allowedRoles
 * @returns {boolean}
 */
export function checkRole(userRole, allowedRoles) {
  return allowedRoles.includes(userRole);
}
