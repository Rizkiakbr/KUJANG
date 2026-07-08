/**
 * Export array data ke CSV — native JS tanpa library
 * @param {object[]} data
 * @param {string[]} headers
 * @param {Function} rowMapper  - (item) => string[]
 * @param {string} filename
 */
export function downloadCSV(data, headers, rowMapper, filename) {
  const csvRows = [
    headers.join(','),
    ...data.map(item =>
      rowMapper(item)
        .map(v => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    ),
  ];
  const csv  = csvRows.join('\r\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
