import { CheckCircle2, Circle, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';

const TAHAP_ORDER = ['Awal', 'Produk Hukum', 'SKPKPP', 'SPMKP'];

function fmtDate(ts) {
  if (!ts) return null;
  const d = ts?.toDate ? ts.toDate() : new Date(ts);
  return format(d, 'd MMM yyyy', { locale: idLocale });
}

/**
 * Timeline vertikal 4 tahap proses kasus
 * @param {{ kasus: object }} props
 */
export default function Timeline({ kasus }) {
  const { tahapSaatIni, nomorProdukHukum, tanggalProdukHukum,
          nomorSKPKPP, tanggalSKPKPP, nomorSPMKP, tanggalSPMKP } = kasus;

  const docByTahap = {
    'Awal':         { nomor: kasus.nomorLPAD || '-', tanggal: kasus.tanggalLPAD },
    'Produk Hukum': { nomor: nomorProdukHukum,        tanggal: tanggalProdukHukum },
    'SKPKPP':       { nomor: nomorSKPKPP,             tanggal: tanggalSKPKPP },
    'SPMKP':        { nomor: nomorSPMKP,              tanggal: tanggalSPMKP },
  };

  const currentIndex = TAHAP_ORDER.indexOf(tahapSaatIni);

  return (
    <div className="flex flex-col gap-0">
      {TAHAP_ORDER.map((tahap, idx) => {
        const isDone    = idx < currentIndex || (idx === currentIndex && docByTahap[tahap]?.nomor);
        const isCurrent = idx === currentIndex && !isDone;
        const isPending = idx > currentIndex;
        const doc       = docByTahap[tahap];
        const hasDoc    = doc?.nomor && doc.nomor !== '-' && doc.nomor !== '';

        return (
          <div key={tahap} className="flex gap-4">
            {/* Node column */}
            <div className="flex flex-col items-center">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 transition-all
                ${hasDoc
                  ? 'bg-teal border-teal text-white'
                  : isCurrent
                    ? 'bg-gold/20 border-gold text-gold animate-pulse-slow'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {hasDoc ? (
                  <CheckCircle2 size={14} />
                ) : isCurrent ? (
                  <ArrowRight size={14} />
                ) : (
                  <Circle size={12} />
                )}
              </div>
              {/* Connector line */}
              {idx < TAHAP_ORDER.length - 1 && (
                <div className={`w-0.5 flex-1 min-h-[28px] my-1 ${hasDoc ? 'bg-teal' : 'bg-gray-200'}`} />
              )}
            </div>

            {/* Content */}
            <div className={`pb-5 flex-1 ${idx === TAHAP_ORDER.length - 1 ? 'pb-0' : ''}`}>
              <div className={`text-xs font-bold mb-0.5 ${hasDoc ? 'text-teal-dark' : isCurrent ? 'text-gold' : 'text-gray-400'}`}>
                {tahap}
              </div>
              {hasDoc ? (
                <>
                  <div className="text-xs font-mono text-gray-700 break-all">{doc.nomor}</div>
                  {doc.tanggal && (
                    <div className="text-[10px] text-gray-400 mt-0.5">{fmtDate(doc.tanggal)}</div>
                  )}
                </>
              ) : isCurrent ? (
                <div className="text-[11px] text-gold/80 italic">Sedang berjalan...</div>
              ) : (
                <div className="text-[11px] text-gray-300 italic">Belum dimulai</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
