import { ServerCrash } from 'lucide-react';

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
      <ServerCrash className="h-8 w-8 text-rose-500" />
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Couldn’t load the dashboard</p>
      <p className="max-w-md text-xs text-muted">{message}</p>
    </div>
  );
}
