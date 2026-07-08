/**
 * StatCard — kartu statistik untuk dashboard
 * @param {{ title, value, subtitle, colorCode: 'navy'|'danger'|'gold'|'safe', icon: React.ReactNode, onClick? }} props
 */
export default function StatCard({ title, value, subtitle, colorCode = 'navy', icon, onClick }) {
  const colorMap = {
    navy:   {
      bar:    'linear-gradient(90deg, #0D2E5C, #185FA5)',
      iconBg: 'bg-navy/10',
      iconFg: 'text-navy',
      val:    'text-navy',
    },
    danger: {
      bar:    'linear-gradient(90deg, #E24B4A, #991B1B)',
      iconBg: 'bg-red-100',
      iconFg: 'text-danger',
      val:    'text-danger',
    },
    gold: {
      bar:    'linear-gradient(90deg, #EF9F27, #92400E)',
      iconBg: 'bg-yellow-100',
      iconFg: 'text-gold',
      val:    'text-gold',
    },
    safe: {
      bar:    'linear-gradient(90deg, #1D9E75, #065F46)',
      iconBg: 'bg-green-100',
      iconFg: 'text-teal',
      val:    'text-teal',
    },
  };

  const { bar, iconBg, iconFg, val } = colorMap[colorCode] || colorMap.navy;

  return (
    <div
      onClick={onClick}
      className={`card relative overflow-hidden transition-all duration-200 
                  hover:shadow-card-hover hover:-translate-y-0.5
                  ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Top gradient bar */}
      <div className="h-1 w-full" style={{ background: bar }} />

      <div className="p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{title}</p>
            <p className={`text-3xl font-extrabold ${val} leading-none`}>{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1.5">{subtitle}</p>
            )}
          </div>
          {icon && (
            <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0`}>
              <span className={`text-lg ${iconFg}`}>{icon}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
