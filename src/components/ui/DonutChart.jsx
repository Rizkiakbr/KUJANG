/**
 * DonutChart — SVG native tanpa library
 * @param {{ data: {label, value, color}[], size?: number, strokeWidth?: number }} props
 */
export default function DonutChart({ data = [], size = 120, strokeWidth = 18 }) {
  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;

  const total = data.reduce((s, d) => s + (d.value || 0), 0);
  if (total === 0) return (
    <div className="flex items-center justify-center" style={{ width: size, height: size }}>
      <span className="text-gray-300 text-xs">Tidak ada data</span>
    </div>
  );

  let offset = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* Background circle */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#F1F5F9" strokeWidth={strokeWidth} />

      {data.map((segment, i) => {
        const pct = segment.value / total;
        const dash = pct * circumference;
        const gap  = circumference - dash;
        const rotate = (offset / total) * 360 - 90;

        offset += segment.value;

        return (
          <circle
            key={i}
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={segment.color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={0}
            strokeLinecap="butt"
            style={{ transform: `rotate(${rotate}deg)`, transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.4s ease' }}
          />
        );
      })}

      {/* Center text */}
      <text x={cx} y={cy - 5} textAnchor="middle" className="font-bold" fill="#0D2E5C" fontSize={size * 0.18} fontWeight="700">
        {total}
      </text>
      <text x={cx} y={cy + size * 0.12} textAnchor="middle" fill="#94A3B8" fontSize={size * 0.1}>
        total
      </text>
    </svg>
  );
}
