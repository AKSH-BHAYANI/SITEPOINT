import React, { useState } from 'react';
import { ResourceType } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Sparkles, Send, Box, Users, Truck } from 'lucide-react';

interface Props {
  defaultSiteId?: string;
  onClose: () => void;
}

export const ResourceRequestModal: React.FC<Props> = ({ defaultSiteId, onClose }) => {
  const { sites, materials, equipment, labour, addResourceRequest, currentSite } = useApp();

  const siteIdToUse = defaultSiteId || currentSite?.id || sites[0]?.id;
  const [siteId, setSiteId] = useState(siteIdToUse);
  const [type, setType] = useState<ResourceType>('Material');
  const [item, setItem] = useState('Cement (OPC 53 Grade)');
  const [quantity, setQuantity] = useState(500);
  const [unit, setUnit] = useState('Bags');
  const [reason, setReason] = useState('Urgent requirement for upcoming structural concrete casting.');
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low'>('High');

  // Handle quick item presets based on type
  const handleTypeChange = (newType: ResourceType) => {
    setType(newType);
    if (newType === 'Material') {
      setItem('Cement (OPC 53 Grade)');
      setQuantity(500);
      setUnit('Bags');
    } else if (newType === 'Labour') {
      setItem('Electrician');
      setQuantity(8);
      setUnit('Workers');
    } else {
      setItem('JCB');
      setQuantity(1);
      setUnit('Machine');
    }
  };

  // Check live if another company site has surplus
  const getTransferSuggestions = () => {
    if (!siteId) return [];
    if (type === 'Material') {
      return materials
        .filter(
          (m) =>
            m.siteId !== siteId &&
            m.name.toLowerCase().includes(item.toLowerCase().split(' ')[0]) &&
            m.currentStock > (m.minThreshold || 100)
        )
        .map((m) => {
          const s = sites.find((st) => st.id === m.siteId);
          return {
            siteName: s?.name || 'Another Site',
            info: `${m.currentStock} ${m.unit} currently in stock (Min reserve: ${m.minThreshold} ${m.unit})`,
          };
        });
    } else if (type === 'Equipment') {
      return equipment
        .filter(
          (eq) =>
            eq.currentSiteId !== siteId &&
            eq.status === 'Available' &&
            (eq.type.toLowerCase().includes(item.toLowerCase()) || eq.name.toLowerCase().includes(item.toLowerCase()))
        )
        .map((eq) => {
          const s = sites.find((st) => st.id === eq.currentSiteId);
          return {
            siteName: s?.name || 'Another Site',
            info: `${eq.name} is standing by as Available`,
          };
        });
    } else if (type === 'Labour') {
      return labour
        .filter(
          (l) =>
            l.siteId !== siteId &&
            l.type.toLowerCase() === item.toLowerCase() &&
            l.present >= l.required &&
            l.present > 5
        )
        .map((l) => {
          const s = sites.find((st) => st.id === l.siteId);
          return {
            siteName: s?.name || 'Another Site',
            info: `${l.present} ${l.type}s on-site with zero shortage`,
          };
        });
    }
    return [];
  };

  const suggestions = getTransferSuggestions();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const siteObj = sites.find((s) => s.id === siteId);
    addResourceRequest({
      siteId,
      requestedBy: siteObj ? `${siteObj.siteEngineer} (Site Engineer)` : 'Site Engineer',
      type,
      item,
      quantity: Number(quantity),
      unit,
      reason,
      requiredDate,
      priority,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-amber-600 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <Send className="h-5 w-5 text-amber-100" />
            <h3 className="text-lg font-bold tracking-tight">Request Site Resources</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-amber-700 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {/* Site Select */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Requesting Site
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

          {/* Resource Type Buttons */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1.5">
              Resource Category
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('Material')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition ${
                  type === 'Material'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Box className="h-4 w-4 text-amber-600" /> Material
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Labour')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition ${
                  type === 'Labour'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Users className="h-4 w-4 text-amber-600" /> Labour
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('Equipment')}
                className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border font-semibold text-xs transition ${
                  type === 'Equipment'
                    ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                    : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                }`}
              >
                <Truck className="h-4 w-4 text-amber-600" /> Equipment
              </button>
            </div>
          </div>

          {/* Item Name */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Resource Item / Role / Machine Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={item}
              onChange={(e) => setItem(e.target.value)}
              placeholder="e.g. Cement, Electrician, JCB, Crane..."
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 font-medium"
              required
            />
          </div>

          {/* Quantity and Unit */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Quantity <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Bags, Workers, Machine, Tonnes"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
                required
              />
            </div>
          </div>

          {/* Transfer Suggestion Banner (Live Inter-Site check!) */}
          {suggestions.length > 0 && (
            <div className="rounded-xl border border-sky-300 bg-sky-50 p-3.5 text-xs text-sky-950">
              <div className="flex items-center gap-1.5 font-bold text-sky-900 mb-1">
                <Sparkles className="h-4 w-4 text-sky-600" />
                Inter-Site Availability Found:
              </div>
              <ul className="space-y-1 pl-4 list-disc text-slate-700">
                {suggestions.map((sug, i) => (
                  <li key={i}>
                    <strong>{sug.siteName}</strong>: {sug.info}
                  </li>
                ))}
              </ul>
              <div className="text-[11px] text-sky-700 mt-1">
                The Boss will automatically receive a possible inter-site transfer alert when you submit.
              </div>
            </div>
          )}

          {/* Date & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
                Required By Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as 'High' | 'Medium' | 'Low')}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              >
                <option value="High">🔴 High Priority (Urgent)</option>
                <option value="Medium">🟡 Medium Priority</option>
                <option value="Low">🟢 Low Priority</option>
              </select>
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Reason / Work Details <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={2}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Why is this resource needed?"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              required
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
              Send Request to Boss
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
