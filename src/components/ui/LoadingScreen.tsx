import { Loader2 } from 'lucide-react';

export function LoadingScreen({ label = 'Loading dashboard…' }: { label?: string }) {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-3 text-muted">
      <Loader2 className="h-7 w-7 animate-spin text-brand-500" />
      <p className="text-sm">{label}</p>
    </div>
  );
}
