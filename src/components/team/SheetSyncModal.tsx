import { useState } from 'react';
import { CheckCircle2, ExternalLink } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useData } from '@/context/DataContext';

interface SheetSyncModalProps {
  open: boolean;
  onClose: () => void;
}

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-brand-400 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100';

export function SheetSyncModal({ open, onClose }: SheetSyncModalProps) {
  const { writeUrl, writeEnabled, configureWriteUrl, refresh } = useData();
  const [url, setUrl] = useState(writeUrl);

  const save = () => {
    configureWriteUrl(url);
    refresh();
    onClose();
  };

  const disconnect = () => {
    configureWriteUrl('');
    setUrl('');
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Sheet sync (write-back)"
      description="Let the dashboard save new members straight into your Google Sheet."
      footer={
        <>
          {writeEnabled && (
            <Button variant="danger" onClick={disconnect}>
              Disconnect
            </Button>
          )}
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        {writeEnabled && (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
            <CheckCircle2 size={14} /> Write-back is connected. New members are saved to your sheet.
          </p>
        )}

        <ol className="list-decimal space-y-1.5 pl-4 text-sm text-slate-600 dark:text-slate-300">
          <li>In your sheet: <strong>Extensions → Apps Script</strong>.</li>
          <li>Paste the script from <code className="rounded bg-slate-100 px-1 dark:bg-slate-700/60">apps-script/Code.gs</code> and save.</li>
          <li><strong>Deploy → New deployment → Web app</strong> (Execute as: Me · Access: Anyone).</li>
          <li>Copy the Web app URL and paste it below.</li>
        </ol>

        <a
          href="https://github.com/prakorso/ManagementPMKT/blob/main/apps-script/README.md"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-600 hover:underline dark:text-brand-300"
        >
          Full setup guide <ExternalLink size={12} />
        </a>

        <label className="block">
          <span className="mb-1 block text-xs font-medium text-slate-600 dark:text-slate-300">Apps Script Web App URL</span>
          <input
            className={inputClass}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://script.google.com/macros/s/AKfy…/exec"
          />
        </label>

        <p className="text-[11px] text-muted">
          Stored in this browser. To make it the default for everyone on the deployed site, set
          <code className="mx-1 rounded bg-slate-100 px-1 dark:bg-slate-700/60">VITE_SHEETS_WRITE_URL</code>
          in Netlify instead.
        </p>
      </div>
    </Modal>
  );
}
