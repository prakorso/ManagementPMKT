import type { ChartColors } from './useChartColors';

interface TooltipPayloadEntry {
  name?: string;
  value?: number | string;
  color?: string;
  dataKey?: string | number;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string | number;
  colors: ChartColors;
  /** Formats a value, optionally aware of which series (dataKey) it belongs to. */
  format?: (value: number, dataKey?: string) => string;
}

/**
 * Themed tooltip for recharts. Recharts injects `active`/`payload`/`label`
 * via cloneElement, so those props are optional here.
 */
export function ChartTooltip({ active, payload, label, colors, format }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div
      className="rounded-lg border px-3 py-2 text-xs shadow-lg"
      style={{ backgroundColor: colors.tooltipBg, borderColor: colors.tooltipBorder }}
    >
      {label != null && <p className="mb-1 font-semibold" style={{ color: colors.text }}>{label}</p>}
      <div className="space-y-1">
        {payload.map((entry, i) => {
          const value = typeof entry.value === 'number' ? entry.value : Number(entry.value ?? 0);
          const formatted = format ? format(value, String(entry.dataKey)) : String(entry.value);
          return (
            <div key={i} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5" style={{ color: colors.axis }}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
                {entry.name}
              </span>
              <span className="font-semibold" style={{ color: colors.text }}>
                {formatted}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
