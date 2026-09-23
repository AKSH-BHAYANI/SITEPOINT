import React, { useState } from 'react';
import { Task } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, CheckCircle, Camera, Upload } from 'lucide-react';

interface Props {
  task: Task;
  onClose: () => void;
}

const PRESET_COMPLETION_PHOTOS = [
  {
    label: 'Finished masonry & plastering',
    url: 'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Electrical conduit & DB board installed',
    url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=800&q=80',
  },
  {
    label: 'Reinforced slab ready / poured',
    url: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=800&q=80',
  },
];

export const CompleteTaskModal: React.FC<Props> = ({ task, onClose }) => {
  const { completeTask } = useApp();
  const [note, setNote] = useState(
    'Work completed as per drawings and structural specifications. Quality inspected by site team.'
  );
  const [photoUrl, setPhotoUrl] = useState(task.completionPhoto || PRESET_COMPLETION_PHOTOS[0].url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    completeTask(task.id, note, photoUrl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-emerald-600 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-emerald-100" />
            <h3 className="text-lg font-bold tracking-tight">Mark Task Completed</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-emerald-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-500 tracking-wider">Completed Task</div>
            <div className="text-base font-bold text-slate-900">{task.name}</div>
            <div className="text-xs text-slate-600 mt-0.5">Location: {task.location} • Team: {task.assignedTeam}</div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Engineer Completion Note
            </label>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add inspection notes or measurements..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-emerald-500 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Completion Photo Proof
            </label>
            <div className="space-y-2">
              <input
                type="text"
                value={photoUrl}
                onChange={(e) => setPhotoUrl(e.target.value)}
                placeholder="Photo URL..."
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-900"
              />

              <div className="text-xs text-slate-500">Pick completion photo:</div>
              <div className="grid grid-cols-3 gap-2">
                {PRESET_COMPLETION_PHOTOS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setPhotoUrl(p.url)}
                    className={`relative rounded-lg overflow-hidden border-2 text-left text-[11px] p-1 transition ${
                      photoUrl === p.url ? 'border-emerald-500 ring-2 ring-emerald-500/20' : 'border-slate-200 hover:border-slate-300'
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
                    <Camera className="h-3.5 w-3.5 text-slate-500" /> Attached Photo Preview
                  </div>
                  <img src={photoUrl} alt="Completion Proof" className="h-36 w-full object-cover rounded-lg" />
                </div>
              )}
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
              className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-emerald-700 transition"
            >
              Confirm Task Completed
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
