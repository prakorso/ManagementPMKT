import { useTheme } from '@/context/ThemeContext';

export interface ChartColors {
  grid: string;
  axis: string;
  text: string;
  tooltipBg: string;
  tooltipBorder: string;
  brand: string;
  brandLight: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  muted: string;
}

/** Recharts needs explicit colours, so derive a palette from the active theme. */
export function useChartColors(): ChartColors {
  const { theme } = useTheme();
  const dark = theme === 'dark';
  return {
    grid: dark ? '#334155' : '#e9eef5',
    axis: dark ? '#94a3b8' : '#64748b',
    text: dark ? '#e2e8f0' : '#334155',
    tooltipBg: dark ? '#1e293b' : '#ffffff',
    tooltipBorder: dark ? '#334155' : '#e2e8f0',
    brand: '#6366f1',
    brandLight: dark ? '#818cf8' : '#a5b4fc',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#f43f5e',
    info: '#0ea5e9',
    muted: dark ? '#475569' : '#cbd5e1',
  };
}
