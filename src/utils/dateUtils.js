import { format, parseISO } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

/**
 * Format Firestore Timestamp atau Date ke string Indonesia
 * @param {*} ts  - Timestamp | Date | string
 * @param {string} fmt  - format pattern date-fns
 */
export function fmtDate(ts, fmt = 'd MMMM yyyy') {
  if (!ts) return '-';
  let d;
  if (ts?.toDate) d = ts.toDate();
  else if (ts instanceof Date) d = ts;
  else d = parseISO(String(ts));
  return format(d, fmt, { locale: idLocale });
}

/**
 * Format tanggal pendek: 5 Jul 2026
 */
export function fmtDateShort(ts) {
  return fmtDate(ts, 'd MMM yyyy');
}

/**
 * Format tanggal + jam: 5 Jul 2026 08.14
 */
export function fmtDateTime(ts) {
  return fmtDate(ts, 'd MMM yyyy HH.mm');
}

/**
 * Konversi string 'yyyy-MM-dd' ke Date
 */
export function parseDate(str) {
  if (!str) return null;
  return parseISO(str);
}

/**
 * Konversi Date ke string 'yyyy-MM-dd' (untuk input[type=date])
 */
export function toInputDate(date) {
  if (!date) return '';
  const d = date?.toDate ? date.toDate() : new Date(date);
  return format(d, 'yyyy-MM-dd');
}
