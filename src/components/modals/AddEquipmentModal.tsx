import React, { useState } from 'react';
import { EquipmentStatus } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Wrench } from 'lucide-react';

interface Props {
  defaultSiteId?: string;
  onClose: () => void;
}

export const AddEquipmentModal: React.FC<Props> = ({ defaultSiteId, onClose }) => {
  const { sites, currentSite, addEquipment } = useApp();
  const [currentSiteId, setCurrentSiteId] = useState(defaultSiteId || currentSite?.id || sites[0]?.id);
  const [name, setName] = useState('');
  const [type, setType] = useState('JCB');
  const [status, setStatus] = useState<EquipmentStatus>('Available');
  const [assignedOperator, setAssignedOperator] = useState('');
  const [lastMaintenance, setLastMaintenance] = useState(new Date().toISOString().split('T')[0]);
  const [nextMaintenance, setNextMaintenance] = useState(
    new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0]
  );
  const [notes, setNotes] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addEquipment({
      name,
      type,
      currentSiteId,
      status,
      assignedOperator: assignedOperator || 'Unassigned',
      lastMaintenance,
      nextMaintenance,
      notes,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <Wrench className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold tracking-tight">Add Construction Machinery / Equipment</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Stationed Site
            </label>
            <select
              value={currentSiteId}
              onChange={(e) => setCurrentSiteId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
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
              Equipment Name & Model <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. JCB 3DX Backhoe, CAT 320 Excavator, Tower Crane TC-50"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Equipment Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              >
                <option value="JCB">JCB / Backhoe</option>
                <option value="Crane">Crane (Tower / Mobile)</option>
                <option value="Concrete mixer">Concrete Mixer</option>
                <option value="Excavator">Excavator</option>
                <option value="Generator">Generator (DG Set)</option>
                <option value="Tractor">Tractor</option>
                <option value="Truck">Tipper Truck</option>
                <option value="Other">Other Machinery</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              >
                <option value="Available">🟢 Available (Ready for deployment)</option>
                <option value="In Use">🔵 In Use (Active on site)</option>
                <option value="Maintenance">🟡 Maintenance (Scheduled)</option>
                <option value="Breakdown">🔴 Breakdown (Needs repair)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Assigned Operator Name
            </label>
            <input
              type="text"
              value={assignedOperator}
              onChange={(e) => setAssignedOperator(e.target.value)}
              placeholder="Operator Full Name (Optional)"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Last Maintenance Date</label>
              <input
                type="date"
                value={lastMaintenance}
                onChange={(e) => setLastMaintenance(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Next Service Due</label>
              <input
                type="date"
                value={nextMaintenance}
                onChange={(e) => setNextMaintenance(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Notes / Operating Log</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operating conditions, machine yard location, or service notes..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
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
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition"
            >
              Register Equipment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
