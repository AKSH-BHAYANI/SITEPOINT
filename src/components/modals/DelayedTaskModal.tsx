import React, { useState } from 'react';
import { Task, DelayReason } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, AlertTriangle, Camera, Video, Calendar, Upload } from 'lucide-react';

interface Props {
  task: Task;
  onClose: () => void;
}

const DELAY_REASONS: DelayReason[] = [
  'Heavy rain',
  'Labour shortage',
  'Material shortage',
  'Equipment problem',
  'Safety issue',
  'Client/management issue',
  'Design/drawing issue',
  'Other',
];

const PRESET_EVIDENCE_PHOTOS = [
  {
    label: 'Flooded slab / Rain waterlogging',
    url: 'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Machinery breakdown / Hydraulic issue',
    url: 'https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Material stockout / Empty yard',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
];

export const DelayedTaskModal: React.FC<Props> = ({ task, onClose }) => {
  const { delayTask } = useApp();
  const [reason, setReason] = useState<DelayReason>(task.delayReason || 'Heavy rain');
  const [explanation, setExplanation] = useState(
    task.delayExplanation || 'Work stopped at 3 PM because of heavy rain and water accumulation.'
  );
  const [newExpectedDate, setNewExpectedDate] = useState(
    task.newExpectedDate || new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [photoUrl, setPhotoUrl] = useState(task.delayPhoto || PRESET_EVIDENCE_PHOTOS[0].url);
  const [videoUrl, setVideoUrl] = useState(task.delayVideo || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    delayTask(task.id, reason, explanation, newExpectedDate, photoUrl, videoUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-rose-600 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-5 w-5 text-rose-100" />
            <h3 className="text-lg font-bold tracking-tight">Report Delayed / Incomplete Task</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-rose-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Task Info Summary */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Target Task</div>
            <div className="text-base font-bold text-slate-900">{task.name}</div>
            <div className="text-xs text-slate-600 mt-0.5">Location: {task.location} • Team: {task.assignedTeam}</div>
          </div>

          {/* Status Label */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Status</label>
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-rose-100 text-rose-800 text-sm font-semibold border border-rose-200">
              <span className="w-2 h-2 rounded-full bg-rose-600 mr-2 animate-pulse"></span>
              ❌ Not Completed / Delayed
            </div>
          </div>

          {/* Reason Dropdown */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Select Reason for Delay <span className="text-rose-500">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value as DelayReason)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              required
            >
              {DELAY_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r === 'Heavy rain' ? '🌧️ Heavy rain' :
                   r === 'Labour shortage' ? '👷 Labour shortage' :
                   r === 'Material shortage' ? '📦 Material shortage' :
                   r === 'Equipment problem' ? '🚜 Equipment problem' :
                   r === 'Safety issue' ? '⚠️ Safety issue' :
                   r === 'Client/management issue' ? '🏢 Client/management issue' :
                   r === 'Design/drawing issue' ? '📐 Design/drawing issue' : '❓ Other'}
                </option>
              ))}
            </select>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Explanation & Site Circumstances <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain why the task could not be completed today..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
              required
            />
          </div>

          {/* Evidence / Photo */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Photo / Visual Evidence
            </label>
            <div className="space-y-2">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="Paste photo URL or pick preset below..."
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
                />
              </div>

              {/* Presets for quick realistic prototype demonstration */}
              <div className="text-xs text-slate-500">Quick site evidence presets:</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_EVIDENCE_PHOTOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(p.url)}
                    className={`relative rounded-lg overflow-hidden border-2 text-left text-[11px] p-1 transition ${
                      photoUrl === p.url ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <img src={p.url} alt={p.label} className="h-12 w-full object-cover rounded" />
                    <span className="block mt-1 font-medium text-slate-700 truncate">{p.label}</span>
                  </button>
                ))}
              </div>

              {photoUrl && (
                <div className="relative mt-2 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 p-1">
                  <div className="text-[11px] font-semibold text-slate-600 px-2 py-1 flex items-center gap-1.5">
                    <Camera className="h-3.5 w-3.5 text-slate-500" /> Attached Photo Evidence Preview
                  </div>
                  <img src={photoUrl} alt="Evidence" className="h-36 w-full object-cover rounded-lg" />
                </div>
              )}
            </div>
          </div>

          {/* Video Attachment (Optional) */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Video Evidence URL (Optional)
            </label>
            <div className="relative">
              <Video className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={videoUrl}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="e.g., https://buildcore.internal/videos/rain-site-1.mp4"
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-xs text-slate-900"
              />
            </div>
          </div>

          {/* New Expected Completion Date */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              New Expected Completion Date <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="date"
                value={newExpectedDate}
                onChange={(e) => setNewExpectedDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2 text-sm text-slate-900 focus:border-amber-500 focus:outline-hidden focus:ring-2 focus:ring-amber-500/20"
                required
              />
            </div>
          </div>

          {/* Footer Actions */}
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
              Save Delayed Status
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
