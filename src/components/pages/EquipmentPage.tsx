import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Equipment, EquipmentStatus } from '../../types';
import {
  Truck,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Wrench,
  Clock,
  Edit2
} from 'lucide-react';

interface EquipmentPageProps {
  onOpenAddEquipment: (siteId?: string) => void;
}

export const EquipmentPage: React.FC<EquipmentPageProps> = ({
  onOpenAddEquipment,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    equipment,
    updateEquipmentStatus,
    setSelectedSiteId,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | EquipmentStatus>('All');
  const [siteFilter, setSiteFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Status update modal state
  const [editingEquip, setEditingEquip] = useState<Equipment | null>(null);
  const [newStatus, setNewStatus] = useState<EquipmentStatus>('Available');
  const [notes, setNotes] = useState('');
  const [targetSiteId, setTargetSiteId] = useState('');
  const [breakdownReason, setBreakdownReason] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  const filteredEquipment = equipment.filter((eq) => {
    if (eq.currentSiteId && !relevantSiteIds.includes(eq.currentSiteId)) return false;
    if (siteFilter !== 'all') {
      if (siteFilter === 'central' && eq.currentSiteId) return false;
      if (siteFilter !== 'central' && eq.currentSiteId !== siteFilter) return false;
    }

    if (statusFilter !== 'All' && eq.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === eq.currentSiteId);
      const matchesName = eq.name.toLowerCase().includes(q);
      const matchesCategory = eq.category ? eq.category.toLowerCase().includes(q) : false;
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesName && !matchesCategory && !matchesSite) return false;
    }

    return true;
  });

  const getStatusBadge = (status: EquipmentStatus) => {
    switch (status) {
      case 'Available':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'In Use':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Maintenance':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Breakdown':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleSaveStatus = async () => {
    if (!editingEquip) return;
    try {
      setIsUpdating(true);
      await updateEquipmentStatus(
        editingEquip.id,
        newStatus,
        notes,
        targetSiteId || undefined,
        newStatus === 'Breakdown' ? breakdownReason : undefined
      );
      setEditingEquip(null);
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
            Heavy Machinery &amp; Equipment
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track machinery deployment across job sites, scheduled maintenance, and breakdown logs.
          </p>
        </div>

        <button
          onClick={() => onOpenAddEquipment()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Equipment</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Site Filter */}
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter equipment by site"
              value={siteFilter}
              onChange={(e) => setSiteFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 font-medium text-slate-700 focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="all">All Locations</option>
              <option value="central">Central Yard / Unassigned</option>
              {relevantSites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}

          {/* Status Tabs */}
          {(['All', 'Available', 'In Use', 'Maintenance', 'Breakdown'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {status}
              </button>
            )
          )}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search equipment, model, or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Equipment Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Equipment &amp; Category</th>
                <th className="py-2.5 px-3">Location / Site</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Notes &amp; Details</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEquipment.map((eq) => {
                const site = sites.find((s) => s.id === eq.currentSiteId);

                return (
                  <tr key={eq.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{eq.name}</div>
                      <div className="text-[11px] text-slate-400">{eq.category || 'Machinery'}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      {site ? (
                        <button
                          onClick={() => setSelectedSiteId(site.id)}
                          className="hover:text-amber-600 font-medium transition cursor-pointer"
                        >
                          {site.name}
                        </button>
                      ) : (
                        <span className="text-slate-400 italic">Central Fleet Yard</span>
                      )}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] border ${getStatusBadge(
                          eq.status
                        )}`}
                      >
                        {eq.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-slate-600">
                      {eq.breakdownReason && (
                        <div className="text-rose-600 font-medium text-[11px]">
                          Issue: {eq.breakdownReason}
                        </div>
                      )}
                      {eq.notes && <div className="text-[11px] text-slate-500">{eq.notes}</div>}
                      {!eq.breakdownReason && !eq.notes && <span className="text-slate-400">—</span>}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setEditingEquip(eq);
                          setNewStatus(eq.status);
                          setNotes(eq.notes || '');
                          setTargetSiteId(eq.currentSiteId || '');
                          setBreakdownReason(eq.breakdownReason || '');
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[11px] transition cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" />
                        <span>Update Status</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredEquipment.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <Truck className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No equipment found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click &quot;Add Equipment&quot; to register plant machinery or tools.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Status Modal */}
      {editingEquip && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Update Status: {editingEquip.name}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Modify operational status and deployment site.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as EquipmentStatus)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Breakdown">Breakdown</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Assigned Location / Site
                </label>
                <select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">Central Fleet Yard</option>
                  {relevantSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {newStatus === 'Breakdown' && (
                <div>
                  <label className="block text-xs font-medium text-rose-700 mb-1">
                    Breakdown Cause / Mechanical Fault
                  </label>
                  <textarea
                    rows={2}
                    value={breakdownReason}
                    onChange={(e) => setBreakdownReason(e.target.value)}
                    placeholder="Describe failure or part required..."
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-rose-300 rounded-md focus:outline-hidden"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional operational remarks..."
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingEquip(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isUpdating}
                onClick={handleSaveStatus}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition shadow-2xs"
              >
                {isUpdating ? 'Saving...' : 'Update Equipment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
