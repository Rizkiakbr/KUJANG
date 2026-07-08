import slaConfig from '../config/slaConfig.json';
import { calcSLAStatus } from './slaService';
import { getCases } from './caseService';
import { writeAuditLog } from './auditService';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

/**
 * Ambil data rekap bulanan
 * @param {number} month  - 1-12
 * @param {number} year
 * @param {string|null} penyuluhId  - null = semua penyuluh
 */
export async function getMonthlyReport(month, year, penyuluhId = null) {
  const filters = penyuluhId ? { penyuluhId } : {};
  const cases = await getCases(filters);

  // Filter berdasarkan bulan & tahun tanggalLPAD
  const filtered = cases.filter(c => {
    const tgl = c.tanggalLPAD?.toDate?.() ?? new Date(c.tanggalLPAD);
    return tgl.getMonth() + 1 === month && tgl.getFullYear() === year;
  });

  const summary = {
    total: filtered.length,
    tepatWaktu: 0,
    terlambat: 0,
    warning: 0,
    selesai: 0,
    perPenyuluh: {},
  };

  for (const c of filtered) {
    const status = calcSLAStatus(c.jatuhTempo, c.jenisLayananId);
    if (status.code === 'OVERDUE') summary.terlambat++;
    else if (status.code === 'WARNING') summary.warning++;
    else summary.tepatWaktu++;
    if (c.tahapSaatIni === 'SPMKP') summary.selesai++;

    // Per penyuluh
    const pid = c.penyuluhId;
    if (!summary.perPenyuluh[pid]) {
      const py = slaConfig.penyuluh.find(p => p.id === pid);
      summary.perPenyuluh[pid] = { nama: py?.nama || pid, total: 0, tepatWaktu: 0, terlambat: 0 };
    }
    summary.perPenyuluh[pid].total++;
    if (status.code === 'OVERDUE') summary.perPenyuluh[pid].terlambat++;
    else summary.perPenyuluh[pid].tepatWaktu++;
  }

  summary.complianceRate = summary.total > 0
    ? Math.round((summary.tepatWaktu / summary.total) * 100)
    : 100;

  return { month, year, cases: filtered, summary };
}

/**
 * Export data ke CSV (native JS, tanpa library)
 * @param {object[]} data
 * @param {string[]} columns  - array nama kolom
 * @param {Function} rowMapper  - (item) => array of values
 * @param {string} filename
 * @param {{ uid, nama, role }} currentUser
 */
export function exportToCSV(data, columns, rowMapper, filename, currentUser) {
  const header = columns.join(',');
  const rows = data.map(item => rowMapper(item).map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...rows].join('\r\n');

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  // Audit log
  if (currentUser) {
    writeAuditLog({
      userUid:  currentUser.uid,
      userName: currentUser.nama,
      userRole: currentUser.role,
      action:   'EXPORT_REPORT',
      targetId: null,
      detail:   `Export CSV: ${filename}`,
    });
  }
}
