import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, PackagePlus } from 'lucide-react';

interface Props {
  defaultSiteId?: string;
  onClose: () => void;
}

export const AddMaterialModal: React.FC<Props> = ({ defaultSiteId, onClose }) => {
  const { sites, currentSite, addMaterial } = useApp();
  const [siteId, setSiteId] = useState(defaultSiteId || currentSite?.id || sites[0]?.id);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Cement');
  const [requiredQty, setRequiredQty] = useState(1000);
  const [currentStock, setCurrentStock] = useState(500);
  const [unit, setUnit] = useState('Bags');
  const [minThreshold, setMinThreshold] = useState(150);
  const [supplier, setSupplier] = useState('');
  const [pricePerUnit, setPricePerUnit] = useState(380);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addMaterial({
      siteId,
      name,
      category,
      requiredQty: Number(requiredQty),
      currentStock: Number(currentStock),
      usedQty: 0,
      purchasedQty: Number(currentStock),
      unit,
      minThreshold: Number(minThreshold),
      supplier: supplier || 'Approved Vendor',
      pricePerUnit: Number(pricePerUnit),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <PackagePlus className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold tracking-tight">Add Material to Site Inventory</h3>
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
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Target Site</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
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
              Material Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Cement, TMT Rebar 12mm, River Sand, Tiles"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
              >
                <option value="Cement">Cement</option>
                <option value="Steel">Steel</option>
                <option value="Aggregates">Aggregates / Sand</option>
                <option value="Bricks">Bricks</option>
                <option value="Tiles">Tiles</option>
                <option value="Paint">Paint</option>
                <option value="Fuel">Fuel (Diesel)</option>
                <option value="Electrical">Electrical</option>
                <option value="Plumbing">Plumbing</option>
                <option value="Custom">Custom / Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Unit</label>
              <input
                type="text"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="Bags, Tonnes, Litres, Pieces"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Total Required</label>
              <input
                type="number"
                min="0"
                value={requiredQty}
                onChange={(e) => setRequiredQty(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Current Stock</label>
              <input
                type="number"
                min="0"
                value={currentStock}
                onChange={(e) => setCurrentStock(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Low Warning At</label>
              <input
                type="number"
                min="0"
                value={minThreshold}
                onChange={(e) => setMinThreshold(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Supplier Name</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="e.g. UltraCem Supplies Ltd"
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Price / Cost per Unit</label>
              <input
                type="number"
                min="0"
                value={pricePerUnit}
                onChange={(e) => setPricePerUnit(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              />
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
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition"
            >
              Save Material
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
