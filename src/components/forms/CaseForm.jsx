import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { Save, Info } from 'lucide-react';
import slaConfig from '../../config/slaConfig.json';
import { calcJatuhTempo } from '../../services/slaService';
import { SLABadge } from '../ui/Badge';

/* ── Zod Schema ── */
const caseSchema = z.object({
  jenisLayananId:     z.string().min(1, 'Wajib dipilih'),
  penyuluhId:         z.string().min(1, 'Wajib dipilih'),
  hasilPenelitian:    z.string().optional(),
  namaWP:             z.string().min(3, 'Minimal 3 karakter'),
  nomorKasusCoretax:  z.string().min(1, 'Wajib diisi'),
  nomorLPAD:          z.string().optional(),
  nomorProdukHukum:   z.string().optional(),
  nomorSKPKPP:        z.string().optional(),
  nomorSPMKP:         z.string().optional(),
  npwp: z.string()
    .length(16, 'NPWP harus tepat 16 digit')
    .regex(/^\d{16}$/, 'NPWP hanya boleh angka'),
  tanggalLPAD:         z.string().min(1, 'Wajib diisi'),
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
 * CaseForm — form tambah/edit kasus
 * @param {{ initialData?, onSubmit, onCancel, isSubmitting, currentSLAStatus? }} props
 */
export default function CaseForm({ initialData, onSubmit, onCancel, isSubmitting, currentSLAStatus }) {
  const isEdit = !!initialData;

  const defaultValues = {
    jenisLayananId:     initialData?.jenisLayananId    || '',
    penyuluhId:         initialData?.penyuluhId        || '',
    hasilPenelitian:    initialData?.hasilPenelitian   || '',
    namaWP:             initialData?.namaWP            || '',
    nomorKasusCoretax:  initialData?.nomorKasusCoretax || '',
    nomorLPAD:          initialData?.nomorLPAD         || '',
    nomorProdukHukum:   initialData?.nomorProdukHukum  || '',
    nomorSKPKPP:        initialData?.nomorSKPKPP       || '',
    nomorSPMKP:         initialData?.nomorSPMKP        || '',
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
    formState: { errors },
  } = useForm({ resolver: zodResolver(caseSchema), defaultValues });

  // Auto-calculate jatuh tempo
  const watchedJenis = watch('jenisLayananId');
  const watchedLPAD  = watch('tanggalLPAD');

  let autoJatuhTempo = null;
  if (watchedJenis && watchedLPAD) {
    try {
      autoJatuhTempo = calcJatuhTempo(new Date(watchedLPAD), watchedJenis);
    } catch (_) {}
  }

  const handleFormSubmit = (data) => {
    // Konversi string date ke Date objects
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

      {/* ── Seksi 1: Informasi Dasar ── */}
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

          <FormField label="Penyuluh Penanggung Jawab *" error={errors.penyuluhId?.message}>
            <select {...register('penyuluhId')} className={`form-input ${errors.penyuluhId ? 'form-input-error' : ''}`}>
              <option value="">— Pilih Penyuluh —</option>
              {slaConfig.penyuluh.map(p => (
                <option key={p.id} value={p.id}>{p.nama}</option>
              ))}
            </select>
          </FormField>

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

      {/* ── Seksi 2: Dokumen Permohonan ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
          <span className="w-4 h-px bg-gray-300 inline-block" />
          Dokumen Permohonan
        </h3>
        <div className="space-y-3">
          <FormField label="No. LPAD / SKPLB / PLB" error={errors.nomorLPAD?.message}>
            <input {...register('nomorLPAD')} type="text" placeholder="BPE-00000/CT/KPP.0911/2026" className="form-input" />
          </FormField>

          <FormField label="Tanggal LPAD *" error={errors.tanggalLPAD?.message}>
            <input {...register('tanggalLPAD')} type="date" className={`form-input ${errors.tanggalLPAD ? 'form-input-error' : ''}`} />
          </FormField>

          {/* Jatuh Tempo — READ ONLY auto-calculated */}
          <div>
            <label className="form-label flex items-center gap-1">
              Jatuh Tempo
              <Info size={11} className="text-gray-400" />
            </label>
            <div className={`form-input cursor-not-allowed font-semibold
              ${autoJatuhTempo ? 'bg-green-50 border-green-300 text-teal-dark' : 'bg-gray-50 text-gray-400'}`}
            >
              {autoJatuhTempo
                ? format(autoJatuhTempo, 'd MMMM yyyy', { locale: idLocale })
                : 'Pilih Jenis Layanan + Tanggal LPAD'}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">
              Dihitung otomatis dari Jenis Layanan + Tanggal LPAD
            </p>
          </div>
        </div>
      </div>

      {/* ── Seksi 3: Hasil & Tindak Lanjut ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
          <span className="w-4 h-px bg-gray-300 inline-block" />
          Hasil & Tindak Lanjut
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
        </div>
      </div>

      {/* ── Seksi 4: SKPKPP & SPMKP ── */}
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-3 flex items-center gap-1">
          <span className="w-4 h-px bg-gray-300 inline-block" />
          SKPKPP & SPMKP
        </h3>
        <div className="space-y-3">
          <FormField label="Nomor SKPKPP">
            <input {...register('nomorSKPKPP')} type="text" placeholder="KEP-00000/..." className="form-input" />
          </FormField>

          <FormField label="Tanggal SKPKPP">
            <input {...register('tanggalSKPKPP')} type="date" className="form-input" />
          </FormField>

          <FormField label="Nomor SPMKP">
            <input {...register('nomorSPMKP')} type="text" placeholder="SPMKP-0000/2026" className="form-input" />
          </FormField>

          <FormField label="Tanggal SPMKP">
            <input {...register('tanggalSPMKP')} type="date" className="form-input" />
          </FormField>
        </div>
      </div>

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
