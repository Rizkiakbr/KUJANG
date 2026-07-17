import * as XLSX from 'xlsx';
import slaConfig from '../config/slaConfig.json';

const COLUMN_MAP = {
  'Jenis Layanan'       : 'jenisLayananId',
  'NPWP'                : 'npwp',
  'Nama WP'             : 'namaWP',
  'Nomor Kasus Coretax' : 'nomorKasusCoretax',
  'No LPAD/SKPLB/PLB'   : 'nomorLPAD',
  'Tanggal LPAD'        : 'tanggalLPAD',
  'Penyuluh'            : 'penyuluhId',
  'Hasil Penelitian'    : 'hasilPenelitian',
};

const REQUIRED_COLUMNS = ['Jenis Layanan', 'NPWP', 'Nama WP', 'Nomor Kasus Coretax', 'Tanggal LPAD', 'Penyuluh'];

/**
 * Parse file xlsx/csv ke array of row objects
 * @param {File} file
 * @returns {Promise<{ headers: string[], rows: object[], parseError: string|null }>}
 */
export async function parseXlsx(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { raw: false, dateNF: 'yyyy-mm-dd' });

        if (rawRows.length === 0) {
          return resolve({ headers: [], rows: [], parseError: 'File kosong atau tidak ada data.' });
        }

        const headers = Object.keys(rawRows[0]);
        resolve({ headers, rows: rawRows, parseError: null });
      } catch (err) {
        reject(new Error(`Gagal membaca file: ${err.message}`));
      }
    };

    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validasi dan transformasi rows ke format kasus
 * @param {object[]} rows  - raw rows dari xlsx
 * @returns {{ valid: object[], errors: { rowIndex: number, row: object, messages: string[] }[] }}
 */
export function validateRows(rows) {
  const valid = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = [];
    const mapped = {};

    // Cek kolom wajib
    for (const col of REQUIRED_COLUMNS) {
      if (!row[col] || String(row[col]).trim() === '') {
        rowErrors.push(`Kolom "${col}" wajib diisi`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ rowIndex: i + 2, row, messages: rowErrors });
      continue;
    }

    // Map kolom
    for (const [excelCol, fieldName] of Object.entries(COLUMN_MAP)) {
      mapped[fieldName] = row[excelCol] ?? '';
    }

    // Resolve jenisLayananId dari nama
    const jl = slaConfig.jenisLayanan.find(
      j => j.nama.toLowerCase() === String(mapped.jenisLayananId).toLowerCase()
    );
    if (!jl) {
      rowErrors.push(`Jenis Layanan "${mapped.jenisLayananId}" tidak dikenal`);
    } else {
      mapped.jenisLayananId = jl.id;
    }

    // Resolve penyuluhId dari nama
    const py = slaConfig.penyuluh.find(
      p => p.nama.toLowerCase() === String(mapped.penyuluhId).toLowerCase()
    );
    if (!py) {
      rowErrors.push(`Penyuluh "${mapped.penyuluhId}" tidak dikenal`);
    } else {
      mapped.penyuluhId = py.id;
    }

    // Validasi NPWP
    const npwp = String(mapped.npwp).replace(/\D/g, '');
    if (npwp.length !== 16) {
      rowErrors.push(`NPWP harus tepat 16 digit (saat ini ${npwp.length} digit)`);
    } else {
      mapped.npwp = npwp;
    }

    // Validasi tanggal LPAD
    if (mapped.tanggalLPAD) {
      const tgl = new Date(mapped.tanggalLPAD);
      if (isNaN(tgl.getTime())) {
        rowErrors.push(`Tanggal LPAD tidak valid: "${mapped.tanggalLPAD}"`);
      } else {
        mapped.tanggalLPAD = tgl;
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ rowIndex: i + 2, row, messages: rowErrors });
    } else {
      valid.push(mapped);
    }
  }

  return { valid, errors };
}

// Kolom wajib untuk upload oleh penyuluh — tanpa kolom 'Penyuluh'
const REQUIRED_COLUMNS_PENYULUH = [
  'Jenis Layanan', 'NPWP', 'Nama WP', 'Nomor Kasus Coretax', 'Tanggal LPAD',
];

/**
 * Validasi dan transformasi rows untuk upload oleh penyuluh.
 * Berbeda dengan validateRows:
 *   - Kolom 'Penyuluh' TIDAK wajib ada di Excel
 *   - penyuluhId SELALU di-override dengan penyuluhId user yang login
 *
 * @param {object[]} rows        - raw rows dari xlsx
 * @param {string}   penyuluhId  - penyuluhId dari userData.penyuluhId
 * @returns {{ valid: object[], errors: { rowIndex: number, row: object, messages: string[] }[] }}
 */
export function validateRowsForPenyuluh(rows, penyuluhId) {
  const valid = [];
  const errors = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowErrors = [];
    const mapped = {};

    // Cek kolom wajib (tanpa Penyuluh)
    for (const col of REQUIRED_COLUMNS_PENYULUH) {
      if (!row[col] || String(row[col]).trim() === '') {
        rowErrors.push(`Kolom "${col}" wajib diisi`);
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ rowIndex: i + 2, row, messages: rowErrors });
      continue;
    }

    // Map kolom yang ada (sama seperti COLUMN_MAP, tapi skip Penyuluh)
    for (const [excelCol, fieldName] of Object.entries(COLUMN_MAP)) {
      if (excelCol === 'Penyuluh') continue; // skip — akan diisi otomatis
      mapped[fieldName] = row[excelCol] ?? '';
    }

    // Paksa penyuluhId dari user yang login — tidak bisa dimanipulasi
    mapped.penyuluhId = penyuluhId;

    // Resolve jenisLayananId dari nama
    const jl = slaConfig.jenisLayanan.find(
      j => j.nama.toLowerCase() === String(mapped.jenisLayananId).toLowerCase()
    );
    if (!jl) {
      rowErrors.push(`Jenis Layanan "${mapped.jenisLayananId}" tidak dikenal`);
    } else {
      mapped.jenisLayananId = jl.id;
    }

    // Validasi NPWP
    const npwp = String(mapped.npwp).replace(/\D/g, '');
    if (npwp.length !== 16) {
      rowErrors.push(`NPWP harus tepat 16 digit (saat ini ${npwp.length} digit)`);
    } else {
      mapped.npwp = npwp;
    }

    // Validasi tanggal LPAD
    if (mapped.tanggalLPAD) {
      const tgl = new Date(mapped.tanggalLPAD);
      if (isNaN(tgl.getTime())) {
        rowErrors.push(`Tanggal LPAD tidak valid: "${mapped.tanggalLPAD}"`);
      } else {
        mapped.tanggalLPAD = tgl;
      }
    }

    if (rowErrors.length > 0) {
      errors.push({ rowIndex: i + 2, row, messages: rowErrors });
    } else {
      valid.push(mapped);
    }
  }

  return { valid, errors };
}
