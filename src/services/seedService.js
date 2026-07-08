import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  collection,
  addDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../config/firebaseConfig';
import { calcJatuhTempo } from './slaService';

const DEMO_PASSWORD = 'kujang2026';

const DEMO_USERS = [
  { nip: '198001012005011001', nama: 'EKA MARDIANA',         role: 'penyuluh', penyuluhId: 'eka'   },
  { nip: '198002022005012002', nama: 'DANI HARDIMAN',         role: 'penyuluh', penyuluhId: 'dani'  },
  { nip: '198003032005011003', nama: 'WIDHI KANGKO POERNOMO', role: 'penyuluh', penyuluhId: 'widhi' },
  { nip: '198004042005012004', nama: 'PRAESTRYANA ARGENTI',   role: 'penyuluh', penyuluhId: 'praes' },
  { nip: '198005052005012005', nama: 'SUCI SURYATI',          role: 'penyuluh', penyuluhId: 'suci'  },
  { nip: 'admin001',           nama: 'Administrator',          role: 'admin',    penyuluhId: null    },
  { nip: 'faisol001',          nama: 'Moch. Faisol',           role: 'ketuakpp', penyuluhId: null    },
];

const SEED_CASES = [
  {
    jenisLayananId: 'skb_ppn_bkp', npwp: '0015049505441000',
    namaWP: 'GANI ARTA DWITUNGGAL', nomorKasusCoretax: 'C0014787204',
    nomorLPAD: '-', tanggalLPAD: '2026-01-01', penyuluhId: 'eka',
    hasilPenelitian: 'Diterima',
    nomorProdukHukum: 'KET-00001/RKBPPN-CT/KPP.0911/2026', tanggalProdukHukum: '2026-01-08',
    nomorSKPKPP: '', nomorSPMKP: '',
  },
  {
    jenisLayananId: 'skb_pph', npwp: '0015248032441000',
    namaWP: 'POLYFIN CANGGIH', nomorKasusCoretax: 'C0014900119',
    nomorLPAD: 'BPS-00189/CT/KPP.0911/2026', tanggalLPAD: '2026-01-02', penyuluhId: 'dani',
    hasilPenelitian: 'Diterima',
    nomorProdukHukum: 'KET-0001/IMPOR-CT/KPP.0911/2026', tanggalProdukHukum: '2026-01-08',
    nomorSKPKPP: '', nomorSPMKP: '',
  },
  {
    jenisLayananId: 'skb_phtb', npwp: '3273197101540002',
    namaWP: 'ROSIANAWATI ADIKARA', nomorKasusCoretax: 'P0019024302',
    nomorLPAD: 'BPE-00001/CT/KPP.0911/2026', tanggalLPAD: '2026-04-28', penyuluhId: 'eka',
    hasilPenelitian: 'Ditolak',
    nomorProdukHukum: 'S-0001/TANAHBANGUNAN-CT/KPP.0911/2026', tanggalProdukHukum: '2026-05-01',
    nomorSKPKPP: '', nomorSPMKP: '',
  },
  {
    jenisLayananId: 'skpkpp_ppystt', npwp: '0027906833406000',
    namaWP: 'PRASETYA ANUGRAH CEMPAKA INDAH', nomorKasusCoretax: 'C0015250044',
    nomorLPAD: '00001/411/25/441/2026', tanggalLPAD: '2026-01-15', penyuluhId: 'widhi',
    hasilPenelitian: 'Diterima',
    nomorProdukHukum: 'KET-0001/KP-CT/KPP.0911/2026', tanggalProdukHukum: '2026-02-28',
    nomorSKPKPP: 'KET-0001/KP-CT/KPP.0911/2026', tanggalSKPKPP: '2026-02-28',
    nomorSPMKP: '',
  },
  {
    jenisLayananId: 'pendahuluan_ppn_coretax', npwp: '0804577385423000',
    namaWP: 'KALTAQA CARBON ASIA', nomorKasusCoretax: 'C0018590961',
    nomorLPAD: 'BPE-21205/CT/KPP.0911/2026', tanggalLPAD: '2026-05-20', penyuluhId: 'suci',
    hasilPenelitian: 'Ditolak',
    nomorProdukHukum: 'S-00001/SKPPKP-CT/KPP.0911/2026', tanggalProdukHukum: '2026-06-19',
    nomorSKPKPP: '', nomorSPMKP: '',
  },
  {
    jenisLayananId: 'lb_ppystt_coretax', npwp: '0016452344444000',
    namaWP: 'KAMPUNG HARAPAN PLASTIC', nomorKasusCoretax: 'C0017067073',
    nomorLPAD: 'BPE-16697/CT/KPP.0911/2026', tanggalLPAD: '2026-03-25', penyuluhId: 'widhi',
    hasilPenelitian: 'Diterima',
    nomorProdukHukum: '00002/447/16/441/CT/2026', tanggalProdukHukum: '2026-06-17',
    nomorSKPKPP: '00002/447/16/441/CT/2026', tanggalSKPKPP: '2026-06-17',
    nomorSPMKP: '',
  },
  {
    jenisLayananId: 'ppystt_selisih_skppkp', npwp: '0210079638441000',
    namaWP: 'GLOSTAR INDONESIA', nomorKasusCoretax: 'C0015746133',
    nomorLPAD: 'BPE-25108/CT/KPP.0911/2026', tanggalLPAD: '2026-02-24', penyuluhId: 'widhi',
    hasilPenelitian: 'Diterima',
    nomorProdukHukum: 'KEP-00227/KP-CT/KPP.0911/2026', tanggalProdukHukum: '2026-03-26',
    nomorSKPKPP: 'KEP-00227/KP-CT/KPP.0911/2026', tanggalSKPKPP: '2026-03-26',
    nomorSPMKP: 'SPMKP-0022/2026', tanggalSPMKP: '2026-03-28',
  },
  {
    jenisLayananId: 'pendahuluan_ppn_legacy', npwp: '0016117145423000',
    namaWP: 'QUHAJA PASMA SOWARGA', nomorKasusCoretax: 'C001860015',
    nomorLPAD: 'S-99339063/PPN1111/KPP.091103/2026', tanggalLPAD: '2026-06-07', penyuluhId: 'eka',
    hasilPenelitian: 'Ditolak',
    nomorProdukHukum: 'S-00010/SKPPKP-CT/KPP.0911/2026', tanggalProdukHukum: '2026-07-04',
    nomorSKPKPP: '', nomorSPMKP: '',
  },
];

function toTs(val) {
  if (!val) return null;
  return Timestamp.fromDate(new Date(val));
}

function calcTahap(data) {
  if (data.nomorSPMKP)       return 'SPMKP';
  if (data.nomorSKPKPP)      return 'SKPKPP';
  if (data.nomorProdukHukum) return 'Produk Hukum';
  return 'Awal';
}

/**
 * Seed semua demo users dan kasus ke Firestore.
 * Jalankan sekali dari halaman admin atau console browser.
 * @returns {{ usersCreated: number, casesCreated: number, errors: string[] }}
 */
export async function seedDemoData() {
  const result = { usersCreated: 0, casesCreated: 0, errors: [] };

  // 1. Buat users di Firebase Auth + Firestore
  for (const u of DEMO_USERS) {
    try {
      const email = `${u.nip}@kujang.djp`;
      let uid;
      try {
        const cred = await createUserWithEmailAndPassword(auth, email, DEMO_PASSWORD);
        uid = cred.user.uid;
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          // User sudah ada — sign in untuk dapat UID
          const cred = await signInWithEmailAndPassword(auth, email, DEMO_PASSWORD);
          uid = cred.user.uid;
        } else {
          throw authErr;
        }
      }
      await setDoc(doc(db, 'users', uid), {
        uid,
        nip:        u.nip,
        nama:       u.nama,
        role:       u.role,
        penyuluhId: u.penyuluhId,
        isActive:   true,
        lastLogin:  null,
      });
      result.usersCreated++;
    } catch (err) {
      result.errors.push(`User ${u.nip}: ${err.message}`);
    }
  }

  // 2. Buat seed cases
  for (const c of SEED_CASES) {
    try {
      const jatuhTempo = calcJatuhTempo(c.tanggalLPAD, c.jenisLayananId);
      await addDoc(collection(db, 'cases'), {
        jenisLayananId:     c.jenisLayananId,
        npwp:               c.npwp,
        namaWP:             c.namaWP,
        nomorKasusCoretax:  c.nomorKasusCoretax,
        nomorLPAD:          c.nomorLPAD          || '',
        tanggalLPAD:        toTs(c.tanggalLPAD),
        penyuluhId:         c.penyuluhId,
        jatuhTempo:         Timestamp.fromDate(jatuhTempo),
        hasilPenelitian:    c.hasilPenelitian     || null,
        nomorProdukHukum:   c.nomorProdukHukum    || '',
        tanggalProdukHukum: toTs(c.tanggalProdukHukum),
        nomorSKPKPP:        c.nomorSKPKPP         || '',
        tanggalSKPKPP:      toTs(c.tanggalSKPKPP  || null),
        nomorSPMKP:         c.nomorSPMKP          || '',
        tanggalSPMKP:       toTs(c.tanggalSPMKP   || null),
        tahapSaatIni:       calcTahap(c),
        createdBy:          'seed',
        createdAt:          serverTimestamp(),
        updatedBy:          'seed',
        updatedAt:          serverTimestamp(),
      });
      result.casesCreated++;
    } catch (err) {
      result.errors.push(`Case ${c.namaWP}: ${err.message}`);
    }
  }

  return result;
}
