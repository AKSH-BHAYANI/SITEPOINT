import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ConstructionSite } from '../../types';
import { X, CheckCircle, Calendar, FileText, Camera, ShieldCheck, AlertTriangle } from 'lucide-react';

interface Props {
  site: ConstructionSite;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CompleteSiteModal: React.FC<Props> = ({ site, onClose, onSuccess }) => {
  const { completeSite, currentUser } = useApp();

  const [completionDate, setCompletionDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('');
  const [reportDocumentName, setReportDocumentName] = useState(`${site.name} - Final Handover & Inspection Certificate.pdf`);
  const [samplePhoto, setSamplePhoto] = useState(
    'https://images.unsplash.com/photo-1541888946425-d0fbb18615f3?auto=format&fit=crop&w=1000&q=80'
  );
  const [confirmed, setConfirmed] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmed) return;

    completeSite(site.id, {
      completionDate,
      remarks: remarks.trim() || 'All structural, MEP, and architectural snagging works verified and handed over.',
      completedBy: currentUser?.name || 'Authorized Member',
      completionPhotos: samplePhoto ? [samplePhoto] : undefined,
      reportDocumentName: reportDocumentName.trim() || undefined,
    });

    if (onSuccess) onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">Mark Site as Completed</h3>
              <p className="text-xs text-slate-400">{site.name} ({site.code})</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Warning Banner */}
        <div className="bg-emerald-50 border-b border-emerald-100 p-4 flex items-start space-x-3">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="text-xs text-emerald-900">
            <span className="font-bold">Project Handover &amp; Archival:</span> Marking this site as completed will lock its progress to 100%, close open issues, move it to the <strong>Completed Sites</strong> archive, and remove it from active site shortage alerts while keeping all records accessible for audit.
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Official Completion / Handover Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="date"
                value={completionDate}
                onChange={(e) => setCompletionDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Final Handover Remarks / Sign-off Notes
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="e.g. All occupancy certifications cleared, client inspection passed with zero outstanding snags."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Final Handover Report / Document Title
            </label>
            <div className="relative">
              <FileText className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={reportDocumentName}
                onChange={(e) => setReportDocumentName(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Handover Completion Photo (URL)
            </label>
            <div className="relative">
              <Camera className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <input
                type="text"
                value={samplePhoto}
                onChange={(e) => setSamplePhoto(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 focus:border-emerald-500 focus:outline-hidden"
              />
            </div>
            {samplePhoto && (
              <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 h-28 bg-slate-100">
                <img
                  src={samplePhoto}
                  alt="Site handover preview"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
            )}
          </div>

          <div className="pt-2">
            <label className="flex items-start space-x-2.5 p-3 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer hover:bg-slate-100 transition">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-slate-700">
                I confirm that all works for <strong>{site.name}</strong> are officially completed, snag lists are closed, and client handover is finalized.
              </span>
            </label>
          </div>

          {/* Actions */}
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
              disabled={!confirmed}
              className={`rounded-xl px-5 py-2.5 text-xs font-bold text-white transition shadow-xs flex items-center space-x-1.5 cursor-pointer ${
                confirmed
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : 'bg-slate-300 cursor-not-allowed text-slate-500'
              }`}
            >
              <CheckCircle className="h-4 w-4" />
              <span>Finalize &amp; Complete Site</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
