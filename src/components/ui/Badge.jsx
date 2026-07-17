/**
 * Badge SLA status
 * @param {{ code: 'OVERDUE'|'WARNING'|'SAFE'|'COMPLETED_ONTIME'|'COMPLETED_LATE', label: string, size?: 'sm'|'md' }} props
 */
export function SLABadge({ code, label, size = 'md' }) {
  const classMap = {
    OVERDUE:          'badge-overdue',
    WARNING:          'badge-warning',
    SAFE:             'badge-safe',
    COMPLETED_ONTIME: 'badge-completed-ontime',
    COMPLETED_LATE:   'badge-completed-late',
  };
  const iconMap = {
    OVERDUE:          '🚨',
    WARNING:          '⚠️',
    SAFE:             '✅',
    COMPLETED_ONTIME: '✓',
    COMPLETED_LATE:   '⚠',
  };
  const cls = classMap[code] || 'badge-safe';
  const px  = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`${cls} ${px} inline-flex items-center gap-1 whitespace-nowrap`}>
      {iconMap[code] || ''}
      {label}
    </span>
  );
}


/**
 * Badge role user
 */
export function RoleBadge({ role }) {
  const map = {
    penyuluh:       { label: 'Penyuluh',      cls: 'bg-blue-50   border-blue-200  text-blue-800'  },
    pelaksana:      { label: 'Pelaksana',      cls: 'bg-purple-50 border-purple-200 text-purple-800'},
    'kepala-seksi': { label: 'Kepala Seksi',   cls: 'bg-orange-50 border-orange-200 text-orange-800'},
    ketuakpp:       { label: 'Ketua KPP',      cls: 'bg-gold/10   border-gold/30   text-gold-dark' },
  };
  const { label, cls } = map[role] || { label: role, cls: 'bg-gray-100 border-gray-200 text-gray-700' };
  return (
    <span className={`border font-semibold text-[10px] px-2 py-0.5 rounded-full ${cls}`}>
      {label}
    </span>
  );
}

/**
 * Badge tahap proses
 */
export function TahapBadge({ tahap }) {
  const map = {
    'Awal':         'bg-gray-100  text-gray-700',
    'Produk Hukum': 'bg-blue-50   text-blue-800',
    'SKPKPP':       'bg-teal/10   text-teal-dark',
    'SPMKP':        'bg-green-100 text-green-800',
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${map[tahap] || 'bg-gray-100 text-gray-600'}`}>
      {tahap}
    </span>
  );
}
