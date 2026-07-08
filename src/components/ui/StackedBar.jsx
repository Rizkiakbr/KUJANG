/**
 * StackedBar — SVG native stacked bar chart
 * @param {{ data: {label, segments: {value, color, title}[]}[], height?: number, barHeight?: number }} props
 */
export default function StackedBar({ data = [], height = 180, barHeight = 24 }) {
  if (!data.length) return null;

  const maxVal = Math.max(...data.map(d => d.segments.reduce((s, seg) => s + seg.value, 0)));
  const width = 100; // percentage based

  return (
    <div className="space-y-3 w-full">
      {data.map((row, ri) => {
        const total = row.segments.reduce((s, seg) => s + seg.value, 0);
        return (
          <div key={ri}>
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-medium text-gray-600 truncate max-w-[60%]">{row.label}</span>
              <span className="text-xs font-bold text-navy">{total}</span>
            </div>
            <div className="flex rounded-full overflow-hidden h-[10px] bg-gray-100">
              {row.segments.map((seg, si) => {
                const pct = maxVal > 0 ? (seg.value / maxVal) * 100 : 0;
                return pct > 0 ? (
                  <div
                    key={si}
                    style={{ width: `${pct}%`, backgroundColor: seg.color }}
                    title={`${seg.title || ''}: ${seg.value}`}
                    className="transition-all duration-500"
                  />
                ) : null;
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
