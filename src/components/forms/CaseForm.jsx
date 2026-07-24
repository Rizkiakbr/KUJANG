import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Save, Info, AlertTriangle } from 'lucide-react';
import slaConfig from '../../config/slaConfig.json';
import { calcJatuhTempo, validateUrutan } from '../../services/slaService';
import { useAuthStore } from '../../store/authStore';
import { SLABadge } from '../ui/Badge';
import CurrencyField from './CurrencyField';
import { useHolidays } from '../../hooks/useCases';

/* ── Zod Schema ── */
const caseSchema = z.object({
  jenisLayananId:     z.string().min(1, 'Wajib dipilih'),
  penyuluhId:         z.string().min(1, 'Wajib dipilih'),
  hasilPenelitian:    z.string().optional(),
  namaWP:             z.string().min(3, 'Minimal 3 karakter'),
  nomorKasusCoretax:  z.string().min(1, 'Wajib diisi'),

  // FIX 2: nomorLPAD sekarang WAJIB diisi
  nomorLPAD: z.string()
               .min(1, 'Nomor BPE/LPAD wajib diisi sebelum menyimpan kasus')
               .refine(val => val.trim().length > 0, {
                 message: 'Nomor BPE/LPAD tidak boleh kosong atau hanya spasi',
               }),

  nomorProdukHukum:   z.string().optional(),
  nomorSKPKPP:        z.string().optional(),
  nomorSPMKP:         z.string().optional(),
  nominalRestitusi:   z.number().min(0, 'Nominal tidak boleh negatif').optional().nullable(),
  npwp: z.string()
    .length(16, 'NPWP harus tepat 16 digit')
    .regex(/^\d{16}$/, 'NPWP hanya boleh angka'),

  // FIX 2: tanggalLPAD tetap wajib (sudah ada sebelumnya, label diperbarui)
  tanggalLPAD:         z.string().min(1, 'Tanggal BPE/LPAD wajib diisi'),
  tanggalProdukHukum:  z.string().optional(),
  tanggalSKPKPP:       z.string().optional(),
  tanggalSPMKP:        z.string().optional(),
});

function FormField({ label, error, children, hint }) {
  return (
    <div>
      <label className="form-label">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-gray-400 mt-1">{hint}</p>}
      {error && <p className="form-error">{error}</p>}
    </div>
  );
}

/**
 * Dapatkan label No. LPAD berdasarkan jenis layanan
 */
function getLabelLPAD(jenisLayananId) {
  const config = slaConfig.jenisLayanan.find(j => j.id === jenisLayananId);
  switch (config?.category) {
    case 'SKB':      return 'No. BPE *';
    case 'SKPKPP':
      if (jenisLayananId === 'skpkpp_plb')    return 'No. Dokumen LB *';
      if (jenisLayananId === 'skpkpp_riksis') return 'No. SKPLB *';
      return 'No. BPE *';
    case 'Pendahuluan': return 'No. BPE *';
    case 'LB':          return 'No. BPE *';
    default:            return 'No. BPE / LPAD / SKPLB / PLB *';
  }
}

/**
 * CaseForm — form tambah/edit kasus dengan form dinamis berdasarkan alurTahap
 * @param {{ initialData?, onSubmit, onCancel, isSubmitting, currentSLAStatus? }} props
 */
export default function CaseForm({ initialData, onSubmit, onCancel, isSubmitting, currentSLAStatus }) {
  const isEdit = !!initialData;
  const { userData } = useAuthStore();
  const role = userData?.role;

  // Role penyuluh: terkunci ke akun sendiri
  const isPenyuluh      = role === 'penyuluh';
  const penyuluhIdSelf  = userData?.penyuluhId;
  const namaSelf        = userData?.nama;

  // FIX 3: Load holidays untuk tahun berjalan (backward compatible — default [] jika gagal)
  const { data: holidays = [] } = useHolidays(new Date().getFullYear());

  // State untuk error validasi urutan tanggal
  const [urutanErrors, setUrutanErrors] = useState([]);

  const defaultValues = {
    jenisLayananId:     initialData?.jenisLayananId    || '',
    penyuluhId:         initialData?.penyuluhId        || (isPenyuluh ? penyuluhIdSelf : ''),
    hasilPenelitian:    initialData?.hasilPenelitian   || '',
    namaWP:             initialData?.namaWP            || '',
    nomorKasusCoretax:  initialData?.nomorKasusCoretax || '',
    nomorLPAD:          initialData?.nomorLPAD         || '',
    nomorProdukHukum:   initialData?.nomorProdukHukum  || '',
    nomorSKPKPP:        initialData?.nomorSKPKPP       || '',
    nomorSPMKP:         initialData?.nomorSPMKP        || '',
    nominalRestitusi:   initialData?.nominalRestitusi  ?? null,
    npwp:               initialData?.npwp              || '',
    tanggalLPAD: initialData?.tanggalLPAD
      ? format(initialData.tanggalLPAD?.toDate?.() ?? new Date(initialData.tanggalLPAD), 'yyyy-MM-dd')
      : '',
    tanggalProdukHukum: initialData?.tanggalProdukHukum
      ? format(initialData.tanggalProdukHukum?.toDate?.() ?? new Date(initialData.tanggalProdukHukum), 'yyyy-MM-dd')
      : '',
    tanggalSKPKPP: initialData?.tanggalSKPKPP
      ? format(initialData.tanggalSKPKPP?.toDate?.() ?? new Date(initialData.tanggalSKPKPP), 'yyyy-MM-dd')
      : '',
    tanggalSPMKP: initialData?.tanggalSPMKP
      ? format(initialData.tanggalSPMKP?.toDate?.() ?? new Date(initialData.tanggalSPMKP), 'yyyy-MM-dd')
      : '',
  };

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({ resolver: zodResolver(caseSchema), defaultValues });

  // Auto-set penyuluhId untuk role penyuluh saat mount
  useEffect(() => {
    if (isPenyuluh && penyuluhIdSelf) {
      setValue('penyuluhId', penyuluhIdSelf);
    }
  }, [isPenyuluh, penyuluhIdSelf, setValue]);

  // Auto-calculate jatuh tempo
  const watchedJenis = watch('jenisLayananId');
  const watchedLPAD  = watch('tanggalLPAD');

  // Ambil config jenis layanan yang dipilih
  const jenisConfig = slaConfig.jenisLayanan.find(j => j.id === watchedJenis);
  const alurTahap = jenisConfig?.alurTahap ?? [];

  // Flag tampil/sembunyikan section SKPKPP & SPMKP
  const showSKPKPP = alurTahap.includes('SKPKPP');
  const showSPMKP  = alurTahap.includes('SPMKP');

  // Flag hak akses SPMKP
  // Penyuluh: lihat tapi tidak bisa input
  // Pelaksana: bisa input
  const canViewSPMKP  = ['penyuluh', 'pelaksana', 'kepala-seksi', 'ketuakpp'].includes(role);
  const spmkpReadOnly = role === 'penyuluh';

  // FIX 3: calcJatuhTempo sekarang terima holidays
  let autoJatuhTempo = null;
  if (watchedJenis && watchedLPAD) {
    try {
      autoJatuhTempo = calcJatuhTempo(new Date(watchedLPAD), watchedJenis, holidays);
    } catch (_) {}
  }

  // Label LPAD dinamis berdasarkan jenis layanan
  const labelLPAD = getLabelLPAD(watchedJenis);

  const handleFormSubmit = (data) => {
    // 1. Validasi urutan tanggal
    const { valid, errors: urutanErr } = validateUrutan(data, data.jenisLayananId);
    if (!valid) {
      setUrutanErrors(urutanErr);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }
    setUrutanErrors([]);

    // 2. Konversi string date ke Date objects
    const parsed = {
      ...data,
      tanggalLPAD:         data.tanggalLPAD         ? new Date(data.tanggalLPAD)         : null,
      tanggalProdukHukum:  data.tanggalProdukHukum  ? new Date(data.tanggalProdukHukum)  : null,
      tanggalSKPKPP:       data.tanggalSKPKPP       ? new Date(data.tanggalSKPKPP)       : null,
      tanggalSPMKP:        data.tanggalSPMKP        ? new Date(data.tanggalSPMKP)        : null,
    };
    onSubmit(parsed);
  };

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">

      {/* Error box validasi urutan tanggal */}
      {urutanErrors.length > 0 && (
        <div className="bg-red-50 border border-red-300 rounded-lg p-4">
          <p className="text-red-700 font-semibold text-sm mb-2 flex items-center gap-2">
            <AlertTriangle size={14} />
            Urutan tanggal dokumen tidak valid:
          </p>
          <ul className="list-disc list-inside space-y-1">
            {urutanErrors.map((err, i) => (
              <li key={i} className="text-red-600 text-sm">{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Info box jika edit */}
      {isEdit && currentSLAStatus && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3">
          <p className="text-xs font-semibold text-navy mb-1">{initialData.namaWP}</p>
          <p className="text-[11px] text-gray-600">{initialData.npwp}</p>
          <div className="mt-2">
            <SLABadge code={currentSLAStatus.code} label={currentSLAStatus.label} />
          </div>
        </div>
      )}

      {/* ── Seksi 1: Informasi Dasar — selalu tampil ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
          <span className="w-4 h-px bg-gray-300 inline-block" />
          Informasi Dasar
        </h3>
        <div className="space-y-3">

          <FormField label="Jenis Layanan *" error={errors.jenisLayananId?.message}>
            <select {...register('jenisLayananId')} className={`form-input ${errors.jenisLayananId ? 'form-input-error' : ''}`}>
              <option value="">— Pilih Jenis Layanan —</option>
              {slaConfig.jenisLayanan.map(j => (
                <option key={j.id} value={j.id}>{j.nama}</option>
              ))}
            </select>
          </FormField>

          {/* Dropdown Penyuluh — terkunci untuk role penyuluh */}
          <div>
            <label className="form-label">
              Penyuluh Penanggung Jawab *
              {isPenyuluh && (
                <span className="text-xs text-gray-400 ml-2">(otomatis: akun Anda)</span>
              )}
            </label>
            {isPenyuluh ? (
              <>
                <input
                  type="text"
                  value={namaSelf || ''}
                  disabled
                  className="form-input bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed"
                />
                {/* Hidden field untuk submit */}
                <input type="hidden" {...register('penyuluhId')} />
              </>
            ) : (
              <select {...register('penyuluhId')} className={`form-input ${errors.penyuluhId ? 'form-input-error' : ''}`}>
                <option value="">— Pilih Penyuluh —</option>
                {slaConfig.penyuluh.map(p => (
                  <option key={p.id} value={p.id}>{p.nama}</option>
                ))}
              </select>
            )}
            {errors.penyuluhId && <p className="form-error">{errors.penyuluhId.message}</p>}
          </div>

          <FormField label="NPWP (16 digit) *" error={errors.npwp?.message}>
            <input
              {...register('npwp')}
              type="text"
              maxLength={16}
              placeholder="0000000000000000"
              className={`form-input font-mono ${errors.npwp ? 'form-input-error' : ''}`}
            />
          </FormField>

          <FormField label="Nama Wajib Pajak *" error={errors.namaWP?.message}>
            <input
              {...register('namaWP')}
              type="text"
              placeholder="Nama lengkap WP"
              className={`form-input ${errors.namaWP ? 'form-input-error' : ''}`}
            />
          </FormField>

          <FormField label="Nomor Kasus Coretax *" error={errors.nomorKasusCoretax?.message}>
            <input
              {...register('nomorKasusCoretax')}
              type="text"
              placeholder="C0000000000"
              className={`form-input ${errors.nomorKasusCoretax ? 'form-input-error' : ''}`}
            />
          </FormField>
        </div>
      </div>

      {/* ── Seksi 2: Dokumen Permohonan — selalu tampil ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
          <span className="w-4 h-px bg-gray-300 inline-block" />
          Dokumen Permohonan
        </h3>
        <div className="space-y-3">

          <FormField
            label={
              <span>
                {labelLPAD}
              </span>
            }
            error={errors.nomorLPAD?.message}
          >
            <input
              {...register('nomorLPAD')}
              type="text"
              placeholder="Contoh: BPE-00001/CT/KPP.0911/2026"
              required
              className={`form-input ${errors.nomorLPAD ? 'form-input-error' : ''}`}
            />
          </FormField>

          <FormField
            label={
              <span>
                Tanggal BPE / LPAD{' '}
                <span className="text-red-500">*</span>
              </span>
            }
            error={errors.tanggalLPAD?.message}
          >
            <input
              {...register('tanggalLPAD')}
              type="date"
              className={`form-input ${errors.tanggalLPAD ? 'form-input-error' : ''}`}
            />
          </FormField>

          {/* Jatuh Tempo — READ ONLY auto-calculated */}
          <div>
            <label className="form-label flex items-center gap-1">
              Jatuh Tempo (Otomatis)
              <Info size={11} className="text-gray-400" />
            </label>
            <div className={`form-input cursor-not-allowed font-semibold
              ${autoJatuhTempo ? 'bg-green-50 border-green-300 text-teal-dark' : 'bg-gray-50 text-gray-400'}`}
            >
              {autoJatuhTempo
                ? format(autoJatuhTempo, 'd MMMM yyyy', { locale: idLocale })
                : 'Pilih Jenis Layanan + Tanggal BPE/LPAD'}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              {watchedLPAD && watchedJenis
                ? '✓ Dihitung otomatis dari Jenis Layanan + Tanggal BPE'
                : '⚠ Isi Jenis Layanan dan Tanggal BPE terlebih dahulu'}
            </p>
          </div>
        </div>
      </div>

      {/* ── Seksi 3: Hasil & Produk Hukum — selalu tampil ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
          <span className="w-4 h-px bg-gray-300 inline-block" />
          Hasil &amp; Produk Hukum
        </h3>
        <div className="space-y-3">
          <FormField label="Hasil Penelitian">
            <select {...register('hasilPenelitian')} className="form-input">
              <option value="">— Belum ada —</option>
              {slaConfig.hasilPenelitian.map(h => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Nomor Produk Hukum" error={errors.nomorProdukHukum?.message}>
            <input {...register('nomorProdukHukum')} type="text" placeholder="KET-00001/..." className="form-input" />
          </FormField>

          <FormField label="Tanggal Produk Hukum">
            <input {...register('tanggalProdukHukum')} type="date" className="form-input" />
          </FormField>

          {/* Nominal Restitusi — selalu tampil */}
          <CurrencyField
            name="nominalRestitusi"
            label="Nominal Restitusi (Rp)"
            placeholder="Contoh: 150000000"
            hint="Masukkan nominal dalam Rupiah tanpa titik/koma (opsional)"
            defaultValue={initialData?.nominalRestitusi}
            setValue={setValue}
          />
        </div>
      </div>

      {/* ── Seksi 4: SKPKPP — hanya tampil jika bukan SKB ── */}
      {showSKPKPP && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
            <span className="w-4 h-px bg-gray-300 inline-block" />
            SKPKPP
          </h3>
          <div className="space-y-3">
            <FormField label="Nomor SKPKPP">
              <input {...register('nomorSKPKPP')} type="text" placeholder="KEP-00000/..." className="form-input" />
            </FormField>
            <FormField label="Tanggal SKPKPP">
              <input {...register('tanggalSKPKPP')} type="date" className="form-input" />
            </FormField>
          </div>
        </div>
      )}

      {/* ── Seksi 5: SPMKP — hanya tampil jika bukan SKB ── */}
      {showSPMKP && canViewSPMKP && (
        <div>
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
            <span className="w-4 h-px bg-gray-300 inline-block" />
            SPMKP
          </h3>
          <div className="space-y-3">
            {/* Info hint untuk penyuluh */}
            {spmkpReadOnly && (
              <div className="flex items-center gap-2 text-xs text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <span>ℹ️</span>
                <span>Input SPMKP hanya dapat dilakukan oleh Pelaksana.</span>
              </div>
            )}
            <FormField label="Nomor SPMKP">
              <input
                {...register('nomorSPMKP')}
                type="text"
                placeholder="SPMKP-0001/2026"
                readOnly={spmkpReadOnly}
                className={`form-input ${spmkpReadOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
              />
            </FormField>
            <FormField label="Tanggal SPMKP">
              <input
                {...register('tanggalSPMKP')}
                type="date"
                readOnly={spmkpReadOnly}
                className={`form-input ${spmkpReadOnly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : ''}`}
              />
            </FormField>
          </div>
        </div>
      )}

      {/* ── Footer Buttons ── */}
      <div className="flex gap-3 pt-2 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="flex-1 btn-outline"
        >
          Batal
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 btn-primary flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Menyimpan...
            </>
          ) : (
            <>
              <Save size={14} />
              {isEdit ? 'Simpan Perubahan' : 'Tambah Kasus'}
            </>
          )}
        </button>
      </div>
    </form>
  );
}
