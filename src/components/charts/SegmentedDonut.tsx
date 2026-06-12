export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface SegmentedDonutProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerValue?: string | number;
  centerLabel?: string;
}

/**
 * Dependency-free multi-segment donut (SVG stroke-dasharray). Used on the
 * Overview so the landing page doesn't need to pull in the charting library.
 */
export function SegmentedDonut({ segments, size = 160, strokeWidth = 18, centerValue, centerLabel }: SegmentedDonutProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const total = segments.reduce((sum, s) => sum + s.value, 0) || 1;

  let cumulative = 0;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-slate-200 dark:stroke-slate-700"
        />
        {segments.map((seg) => {
          const len = (seg.value / total) * circumference;
          const el = (
            <circle
              key={seg.label}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={strokeWidth}
              strokeDasharray={`${len} ${circumference - len}`}
              strokeDashoffset={-cumulative}
            />
          );
          cumulative += len;
          return el;
        })}
      </svg>
      {(centerValue != null || centerLabel) && (
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {centerValue != null && (
            <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{centerValue}</span>
          )}
          {centerLabel && <span className="text-xs font-medium text-muted">{centerLabel}</span>}
        </div>
      )}
    </div>
  );
}
