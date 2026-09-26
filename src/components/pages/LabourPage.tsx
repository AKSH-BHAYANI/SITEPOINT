import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { LabourCategory } from '../../types';
import {
  Users,
  Plus,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Edit2
} from 'lucide-react';

export const LabourPage: React.FC = () => {
  const {
    role,
    sites,
    accessibleSites,
    labour,
    updateLabourAttendance,
    addLabourCategory,
    setSelectedSiteId,
  } = useApp();

  const [siteFilter, setSiteFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Editing attendance state
  const [editingLabour, setEditingLabour] = useState<LabourCategory | null>(null);
  const [newPresentVal, setNewPresentVal] = useState<number>(0);
  const [newRequiredVal, setNewRequiredVal] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  // Add Trade Modal State
  const [showAddTrade, setShowAddTrade] = useState(false);
  const [targetSiteId, setTargetSiteId] = useState(accessibleSites[0]?.id || sites[0]?.id || '');
  const [tradeType, setTradeType] = useState('Carpenters');
  const [reqHeadcount, setReqHeadcount] = useState(10);
  const [presHeadcount, setPresHeadcount] = useState(10);
  const [isAdding, setIsAdding] = useState(false);

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  const filteredLabour = labour.filter((l) => {
    if (!relevantSiteIds.includes(l.siteId)) return false;
    if (siteFilter !== 'all' && l.siteId !== siteFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === l.siteId);
      const matchesType = l.type.toLowerCase().includes(q);
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesType && !matchesSite) return false;
    }

    return true;
  });

  const totalPresent = filteredLabour.reduce((acc, curr) => acc + curr.present, 0);
  const totalRequired = filteredLabour.reduce((acc, curr) => acc + curr.required, 0);
  const overallAttendanceRate =
    totalRequired > 0 ? Math.round((totalPresent / totalRequired) * 100) : 0;

  const handleSaveAttendance = async () => {
    if (!editingLabour) return;
    try {
      setIsSaving(true);
      await updateLabourAttendance(editingLabour.id, Number(newPresentVal), Number(newRequiredVal));
      setEditingLabour(null);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddTradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSiteId) return;
    try {
      setIsAdding(true);
      await addLabourCategory(targetSiteId, tradeType, Number(reqHeadcount), Number(presHeadcount));
      setShowAddTrade(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Workforce &amp; Trades
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log daily on-site attendance, monitor trade staffing levels, and prevent delays.
          </p>
        </div>

        <button
          onClick={() => setShowAddTrade(true)}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Trade</span>
        </button>
      </div>

      {/* High-level stats summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Total Present Today</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalPresent} <span className="text-xs text-slate-400 font-normal">workers</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Total Required Headcount</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {totalRequired} <span className="text-xs text-slate-400 font-normal">workers</span>
          </div>
        </div>

        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="text-xs text-slate-500 font-medium">Daily Attendance Rate</div>
          <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
            {overallAttendanceRate}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overallAttendanceRate < 75 ? 'bg-rose-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(100, overallAttendanceRate)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-2">
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter labour by site"
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
        </div>

        <div className="relative min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search trade or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Labour Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Trade / Skill Category</th>
                <th className="py-2.5 px-3">Site</th>
                <th className="py-2.5 px-3">Present</th>
                <th className="py-2.5 px-3">Required</th>
                <th className="py-2.5 px-3">Attendance %</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLabour.map((item) => {
                const site = sites.find((s) => s.id === item.siteId);
                const rate = item.required > 0 ? Math.round((item.present / item.required) * 100) : 100;
                const isShortage = item.present < item.required;

                return (
                  <tr key={item.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {item.type}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      <button
                        onClick={() => setSelectedSiteId(item.siteId)}
                        className="hover:text-amber-600 font-medium transition cursor-pointer"
                      >
                        {site?.name || 'Site'}
                      </button>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap tabular-nums">
                      <span className="font-bold text-slate-900">{item.present}</span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap tabular-nums text-slate-500">
                      {item.required}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span
                          className={`font-semibold tabular-nums text-[11px] ${
                            isShortage ? 'text-rose-600' : 'text-emerald-700'
                          }`}
                        >
                          {rate}%
                        </span>
                        <div className="w-16 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              isShortage ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, rate)}%` }}
                          />
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-right">
                      <button
                        onClick={() => {
                          setEditingLabour(item);
                          setNewPresentVal(item.present);
                          setNewRequiredVal(item.required);
                        }}
                        className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[11px] transition cursor-pointer"
                      >
                        <Edit2 className="h-3 w-3 text-slate-500" />
                        <span>Update</span>
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredLabour.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No workforce categories logged</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click &quot;Add Trade&quot; to begin tracking attendance.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Attendance Modal */}
      {editingLabour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">
              Update Attendance: {editingLabour.type}
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Record present workers and target requirement.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Present Headcount Today
                </label>
                <input
                  type="number"
                  min="0"
                  value={newPresentVal}
                  onChange={(e) => setNewPresentVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500 tabular-nums"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Required Headcount Target
                </label>
                <input
                  type="number"
                  min="1"
                  value={newRequiredVal}
                  onChange={(e) => setNewRequiredVal(Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500 tabular-nums"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setEditingLabour(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveAttendance}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition shadow-2xs"
              >
                {isSaving ? 'Saving...' : 'Save Attendance'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Trade Modal */}
      {showAddTrade && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <form
            onSubmit={handleAddTradeSubmit}
            className="bg-white rounded-lg border border-slate-200 p-5 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-sm font-bold text-slate-900">Add Trade Category</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Add a specialized labor group to jobsite tracking.
            </p>

            <div className="mt-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Site</label>
                <select
                  value={targetSiteId}
                  onChange={(e) => setTargetSiteId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500"
                >
                  {relevantSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Trade Skill</label>
                <select
                  value={tradeType}
                  onChange={(e) => setTradeType(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500"
                >
                  <option value="Carpenters">Carpenters</option>
                  <option value="Masons">Masons</option>
                  <option value="Electricians">Electricians</option>
                  <option value="Plumbers">Plumbers</option>
                  <option value="Steel Fixers">Steel Fixers</option>
                  <option value="Painters">Painters</option>
                  <option value="General Helpers">General Helpers</option>
                  <option value="Heavy Equipment Operators">Heavy Equipment Operators</option>
                  <option value="Welders">Welders</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Required</label>
                  <input
                    type="number"
                    min="1"
                    value={reqHeadcount}
                    onChange={(e) => setReqHeadcount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Present</label>
                  <input
                    type="number"
                    min="0"
                    value={presHeadcount}
                    onChange={(e) => setPresHeadcount(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md tabular-nums"
                  />
                </div>
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowAddTrade(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isAdding}
                className="px-3.5 py-1.5 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-md transition shadow-2xs"
              >
                {isAdding ? 'Adding...' : 'Add Trade'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
