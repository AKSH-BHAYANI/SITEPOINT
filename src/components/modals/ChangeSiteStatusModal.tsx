import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConstructionSite, SiteStatus } from '../../types';
import { X, PauseCircle, PlayCircle, CheckCircle, AlertCircle } from 'lucide-react';

interface Props {
  site: ConstructionSite;
  onClose: () => void;
  onRequestComplete?: () => void;
}

export const ChangeSiteStatusModal: React.FC<Props> = ({ site, onClose, onRequestComplete }) => {
  const { updateSiteStatus } = useApp();

  const [status, setStatus] = useState<SiteStatus>(site.status || 'Active');
  const [holdReason, setHoldReason] = useState(site.holdReason || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (status === 'Completed' && onRequestComplete) {
      onClose();
      onRequestComplete();
      return;
    }

    updateSiteStatus(site.id, status, status === 'On Hold' ? holdReason : undefined);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div>
            <h3 className="text-base font-bold tracking-tight">Update Site Status</h3>
            <p className="text-xs text-slate-400">{site.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="space-y-2">
            <label className="block text-xs font-bold uppercase text-slate-700">
              Select Current Status
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setStatus('Active')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  status === 'Active'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <PlayCircle className="h-5 w-5 mb-1 text-emerald-600" />
                <span>Active</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('On Hold')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  status === 'On Hold'
                    ? 'border-amber-500 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <PauseCircle className="h-5 w-5 mb-1 text-amber-600" />
                <span>On Hold</span>
              </button>

              <button
                type="button"
                onClick={() => setStatus('Completed')}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-xs font-bold transition cursor-pointer ${
                  status === 'Completed'
                    ? 'border-blue-500 bg-blue-50 text-blue-900 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <CheckCircle className="h-5 w-5 mb-1 text-blue-600" />
                <span>Completed</span>
              </button>
            </div>
          </div>

          {status === 'On Hold' && (
            <div className="animate-in fade-in space-y-1.5">
              <label className="block text-xs font-bold uppercase text-slate-700">
                Reason for Holding Work <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={holdReason}
                onChange={(e) => setHoldReason(e.target.value)}
                placeholder="e.g. Awaiting municipal environmental clearance / design revision for podium structure."
                className="w-full rounded-xl border border-amber-300 bg-amber-50/40 p-3 text-xs font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                required
              />
              <p className="text-[11px] text-slate-500">
                This reason will be visible to all site engineers, project managers, and executive dashboards.
              </p>
            </div>
          )}

          {status === 'Completed' && (
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                Selecting &quot;Completed&quot; will open the formal site completion and handover workflow (capture handover date, sign-off remarks, and inspection report).
              </span>
            </div>
          )}

          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-slate-900 hover:bg-slate-800 px-5 py-2.5 text-xs font-bold text-white transition shadow-xs cursor-pointer"
            >
              {status === 'Completed' ? 'Proceed to Completion Form' : 'Save Status'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
