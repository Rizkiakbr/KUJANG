import { useMemo } from 'react';
import { calcSLAStatus } from '../services/slaService';

const EMPTY_ARRAY = [];

/**
 * Hitung status SLA untuk array of cases
 * Menggunakan useMemo — TIDAK boleh pakai useEffect untuk kalkulasi ini
 *
 * @param {object[]} cases  - array of case objects dari Firestore
 * @returns {object[]} enhanced cases dengan field `slaStatus`
 */
export function useSLAStatus(cases = EMPTY_ARRAY) {
  return useMemo(() => {
    if (!cases || cases.length === 0) return EMPTY_ARRAY;

    return cases.map(c => ({
      ...c,
      // Pass seluruh objek kasus agar calcSLAStatus bisa cek tanggal penyelesaian
      slaStatus: calcSLAStatus(c.jatuhTempo, c.jenisLayananId, c),
    })).sort((a, b) => {
      // Sort priority:
      // OVERDUE → WARNING → SAFE → COMPLETED_LATE → COMPLETED_ONTIME
      const priority = {
        OVERDUE:          0,
        WARNING:          1,
        SAFE:             2,
        COMPLETED_LATE:   3,
        COMPLETED_ONTIME: 4,
      };
      const pa = priority[a.slaStatus.code] ?? 5;
      const pb = priority[b.slaStatus.code] ?? 5;
      if (pa !== pb) return pa - pb;
      return a.slaStatus.sisaHari - b.slaStatus.sisaHari;
    });
  }, [cases]);
}
