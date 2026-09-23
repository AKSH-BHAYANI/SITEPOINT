import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, AlertOctagon, Camera } from 'lucide-react';

interface Props {
  defaultSiteId?: string;
  onClose: () => void;
}

const PRESET_PROBLEM_PHOTOS = [
  {
    label: 'Flooding & rain waterlogging',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Heavy machinery breakdown',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Safety scaffold hazard',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
];

export const ReportProblemModal: React.FC<Props> = ({ defaultSiteId, onClose }) => {
  const { sites, currentSite, reportProblem } = useApp();

  const [siteId, setSiteId] = useState(defaultSiteId || currentSite?.id || sites[0]?.id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<'High' | 'Medium' | 'Low'>('High');
  const [photo, setPhoto] = useState(PRESET_PROBLEM_PHOTOS[0].url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const siteObj = sites.find((s) => s.id === siteId);
    reportProblem({
      siteId,
      title,
      description,
      severity,
      reportedBy: siteObj ? `${siteObj.siteEngineer} (Site Engineer)` : 'Site Engineer',
      photo,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-rose-600 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <AlertOctagon className="h-5 w-5 text-rose-100" />
            <h3 className="text-lg font-bold tracking-tight">Report Site Problem / Issue</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-rose-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Affected Site
            </label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900"
              required
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Problem Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Heavy rain flooding basement, Cement shortage, Mixer breakdown"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Severity Level
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(['High', 'Medium', 'Low'] as const).map((sev) => (
                <button
                  key={sev}
                  type="button"
                  onClick={() => setSeverity(sev)}
                  className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                    severity === sev
                      ? sev === 'High'
                        ? 'bg-rose-100 border-rose-600 text-rose-800 ring-2 ring-rose-500/20'
                        : sev === 'Medium'
                        ? 'bg-amber-100 border-amber-600 text-amber-800 ring-2 ring-amber-500/20'
                        : 'bg-slate-100 border-slate-600 text-slate-800'
                      : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {sev === 'High' ? '🔴 High (Critical)' : sev === 'Medium' ? '🟡 Medium' : '🟢 Low'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Description & Immediate Impact <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detail what happened, which operations stopped, and what immediate action was taken..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Photo Evidence
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={photo}
                onChange={(e) => setPhoto(e.target.value)}
                placeholder="Photo URL..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
              />
              <div className="grid grid-cols-3 gap-2">
                {PRESET_PROBLEM_PHOTOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhoto(p.url)}
                    className={`rounded-lg overflow-hidden border p-1 text-left text-[11px] ${
                      photo === p.url ? 'border-rose-500 ring-2 ring-rose-500/20' : 'border-slate-200'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="h-10 w-full object-cover rounded" />
                    <span className="truncate block mt-0.5 text-slate-700">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-rose-700 transition"
            >
              Submit Problem Alert
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
