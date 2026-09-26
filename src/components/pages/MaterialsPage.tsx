import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Material } from '../../types';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Building2,
  Edit2
} from 'lucide-react';

interface MaterialsPageProps {
  onOpenAddMaterial: (siteId?: string) => void;
}

export const MaterialsPage: React.FC<MaterialsPageProps> = ({
  onOpenAddMaterial,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    materials,
    updateMaterialStock,
    setSelectedSiteId,
  } = useApp();

  const [siteFilter, setSiteFilter] = useState('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'low' | 'normal'>('all');
  const [search, setSearch] = useState('');

  // Inline stock edit modal state
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [newStockVal, setNewStockVal] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState(false);

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  const filteredMaterials = materials.filter((m) => {
    if (!relevantSiteIds.includes(m.siteId)) return false;
    if (siteFilter !== 'all' && m.siteId !== siteFilter) return false;

    const isLow = m.currentStock <= m.minThreshold;
    if (stockStatusFilter === 'low' && !isLow) return false;
    if (stockStatusFilter === 'normal' && isLow) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === m.siteId);
      const matchesName = m.name.toLowerCase().includes(q);
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesName && !matchesSite) return false;
    }

    return true;
  });

  const lowStockCount = materials.filter(
    (m) => relevantSiteIds.includes(m.siteId) && m.currentStock <= m.minThreshold
  ).length;

  const handleSaveStock = async () => {
    if (!editingMaterial) return;
    try {
      setIsUpdating(true);
      await updateMaterialStock(editingMaterial.id, Number(newStockVal));
      setEditingMaterial(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Materials Inventory
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Monitor bulk material levels, set replenishment thresholds, and avoid jobsite shortages.
          </p>
        </div>

        <button
          onClick={() => onOpenAddMaterial()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Material</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Site Filter */}
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter materials by site"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Sites</option>
              {relevantSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Tabs */}
          <button
            onClick={() => setStockStatusFilter('all')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              stockStatusFilter === 'all'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            All Materials
          </button>
          <button
            onClick={() => setStockStatusFilter('low')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer flex items-center space-x-1 ${
              stockStatusFilter === 'low'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span>Low Stock</span>
            {lowStockCount > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 font-bold tabular-nums">
                {lowStockCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStockStatusFilter('normal')}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
              stockStatusFilter === 'normal'
                ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Sufficient Stock
          </button>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search material or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Material Name</th>
                <th className="py-2.5 px-3">Site</th>
                <th className="py-2.5 px-3">Current Stock</th>
                <th className="py-2.5 px-3">Min Threshold</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMaterials.map((mat) => {
                const site = sites.find((s) => s.id === mat.siteId);
                const isLow = mat.currentStock <= mat.minThreshold;

                return (
                  <tr key={mat.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {mat.name}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      <button
                        onClick={() => setSelectedSiteId(mat.siteId)}
                        className="hover:text-amber-600 font-medium transition cursor-pointer"
                      >
                        {site?.name || 'Site'}
                      </button>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                      <span className="font-bold text-slate-900">{mat.currentStock}</span>{' '}
                      <span className="text-slate-500 text-[11px]">{mat.unit}</span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-500">
                      {mat.minThreshold} {mat.unit}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      {isLow ? (
                        <span className="inline-flex items-center space-x-1 font-semibold px-2 py-0.5 rounded text-[11px] bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="h-3 w-3 shrink-0" />
                          <span>Low Stock</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 font-medium px-2 py-0.5 rounded text-[11px] bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="h-3 w-3 shrink-0" />
                          <span>Normal</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setEditingMaterial(mat);
                          setNewStockVal(mat.currentStock);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[11px] transition cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" />
                        <span>Update Stock</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredMaterials.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No materials found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click &quot;Add Material&quot; to register building supplies at a site.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Inline Quick Stock Update Modal */}
      {editingMaterial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Update Stock: {editingMaterial.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Enter current physical count on site ({editingMaterial.unit}).
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                New Current Stock ({editingMaterial.unit})
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={newStockVal}
                onChange={(e) => setNewStockVal(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500 tabular-nums"
              />
              <div className="text-[11px] text-slate-400 mt-1">
                Minimum warning threshold: {editingMaterial.minThreshold} {editingMaterial.unit}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingMaterial(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveStock}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition shadow-2xs"
              >
                {isUpdating ? 'Saving...' : 'Update Stock'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
