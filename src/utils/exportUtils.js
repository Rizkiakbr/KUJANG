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

/**
 * Generate dan download file Excel template untuk upload oleh penyuluh.
 * Kolom "Penyuluh" tidak disertakan — diisi otomatis dari akun login.
 * Menggunakan SheetJS (xlsx).
 */
export async function downloadTemplatePenyuluh() {
  const XLSX = await import('xlsx');
  const XLSXmod = XLSX.default || XLSX;

  const headers = [
    'Jenis Layanan',
    'NPWP',
    'Nama WP',
    'Nomor Kasus Coretax',
    'No LPAD/SKPLB/PLB',
    'Tanggal LPAD',
    'Hasil Penelitian',
  ];

  // Baris contoh agar user tahu format yang diharapkan
  const exampleRow = [
    'SKB',
    '1234567890123456',
    'PT Contoh Sejahtera',
    'CRT-2024-001234',
    'LPAD-2024-001234',
    '2024-01-15',
    'Diterima',
  ];

  const ws = XLSXmod.utils.aoa_to_sheet([headers, exampleRow]);

  // Set lebar kolom agar rapi
  ws['!cols'] = headers.map(() => ({ wch: 24 }));

  const wb = XLSXmod.utils.book_new();
  XLSXmod.utils.book_append_sheet(wb, ws, 'Template Kasus');
  XLSXmod.writeFile(wb, 'Template_Upload_Kasus_KUJANG.xlsx');
}
