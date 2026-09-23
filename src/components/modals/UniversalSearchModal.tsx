import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { Search, X, Building2, CheckSquare, Package, Truck, AlertTriangle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSelectTask?: (taskId: string, siteId: string) => void;
}

export const UniversalSearchModal: React.FC<Props> = ({ onClose, onSelectTask }) => {
  const { sites, tasks, materials, equipment, problems, setSelectedSiteId, setActiveSiteTab } = useApp();
  const [query, setQuery] = useState('');

  const quickPills = ['cement', 'electrical work', 'Block B', 'JCB', 'delayed tasks', 'Riverside Tower'];

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { sites: [], tasks: [], materials: [], equipment: [], problems: [] };

    const matchingSites = sites.filter(
      (s) => s.name.toLowerCase().includes(q) || s.location.toLowerCase().includes(q) || s.code.toLowerCase().includes(q)
    );

    const matchingTasks = tasks.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q) ||
        t.assignedTeam.toLowerCase().includes(q) ||
        t.labourType.toLowerCase().includes(q) ||
        (q.includes('delay') && t.status === 'Delayed') ||
        (t.delayReason && t.delayReason.toLowerCase().includes(q))
    );

    const matchingMaterials = materials.filter(
      (m) => m.name.toLowerCase().includes(q) || m.category.toLowerCase().includes(q) || m.supplier.toLowerCase().includes(q)
    );

    const matchingEquipment = equipment.filter(
      (eq) => eq.name.toLowerCase().includes(q) || eq.type.toLowerCase().includes(q) || eq.assignedOperator.toLowerCase().includes(q)
    );

    const matchingProblems = problems.filter(
      (p) => p.title.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );

    return {
      sites: matchingSites,
      tasks: matchingTasks,
      materials: matchingMaterials,
      equipment: matchingEquipment,
      problems: matchingProblems,
    };
  }, [query, sites, tasks, materials, equipment, problems]);

  const totalResults =
    results.sites.length +
    results.tasks.length +
    results.materials.length +
    results.equipment.length +
    results.problems.length;

  const handleOpenSite = (siteId: string, tab: 'Overview' | 'Tasks' | 'Materials' | 'Equipment' | 'Reports' = 'Overview') => {
    setSelectedSiteId(siteId);
    setActiveSiteTab(tab);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-900/60 p-4 pt-16 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-slate-200 bg-slate-50">
          <Search className="h-5 w-5 text-slate-400 mr-3" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search sites, tasks, materials, JCB, delayed tasks..."
            className="w-full bg-transparent text-base text-slate-900 placeholder:text-slate-400 focus:outline-hidden font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-xs text-slate-400 hover:text-slate-600 px-2 py-1"
            >
              Clear
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 ml-2"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Quick Suggestion Pills */}
        <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-slate-500 font-medium">Try searching:</span>
          {quickPills.map((pill) => (
            <button
              key={pill}
              type="button"
              onClick={() => setQuery(pill)}
              className="bg-white border border-slate-300 text-slate-700 hover:border-amber-500 hover:text-amber-700 px-2.5 py-1 rounded-lg font-medium transition cursor-pointer"
            >
              “{pill}”
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="text-center py-10 text-slate-400 text-sm">
              Type keywords to find any task, material inventory, equipment, or active problem across all construction sites.
            </div>
          ) : totalResults === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              No matching records found for <strong className="text-slate-800 font-semibold">"{query}"</strong>.
            </div>
          ) : (
            <>
              {/* Sites */}
              {results.sites.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-amber-600" /> Construction Sites ({results.sites.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.sites.map((s) => (
                      <div
                        key={s.id}
                        onClick={() => handleOpenSite(s.id, 'Overview')}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50/60 border border-slate-200 cursor-pointer transition"
                      >
                        <div>
                          <div className="font-bold text-slate-900 text-sm">{s.name}</div>
                          <div className="text-xs text-slate-500">{s.location} • PM: {s.projectManager}</div>
                        </div>
                        <div className="text-right">
                          <span className="inline-block font-black text-amber-600 text-sm">{s.progressPercent}%</span>
                          <span className="text-[10px] text-slate-400 block">Progress</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tasks */}
              {results.tasks.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckSquare className="h-3.5 w-3.5 text-sky-600" /> Tasks ({results.tasks.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.tasks.map((t) => {
                      const siteObj = sites.find((s) => s.id === t.siteId);
                      return (
                        <div
                          key={t.id}
                          onClick={() => handleOpenSite(t.siteId, 'Tasks')}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-sky-50/60 border border-slate-200 cursor-pointer transition"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{t.name}</span>
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                                  t.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : t.status === 'Delayed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : t.status === 'In Progress'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-100 text-slate-700'
                                }`}
                              >
                                {t.status}
                              </span>
                            </div>
                            <div className="text-xs text-slate-500 mt-0.5">
                              {siteObj?.name} • Location: {t.location}
                              {t.delayReason && <span className="text-rose-600 font-semibold ml-2">Reason: {t.delayReason}</span>}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Materials */}
              {results.materials.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                    <Package className="h-3.5 w-3.5 text-emerald-600" /> Materials Inventory ({results.materials.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.materials.map((m) => {
                      const siteObj = sites.find((s) => s.id === m.siteId);
                      const isLow = m.currentStock <= m.minThreshold;
                      return (
                        <div
                          key={m.id}
                          onClick={() => handleOpenSite(m.siteId, 'Materials')}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-emerald-50/60 border border-slate-200 cursor-pointer transition"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                              <span>{m.name}</span>
                              {isLow && (
                                <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full font-bold">
                                  🔴 Low Stock
                                </span>
                              )}
                            </div>
                            <div className="text-xs text-slate-500">
                              Site: {siteObj?.name} • Supplier: {m.supplier}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 text-sm">
                              {m.currentStock} {m.unit}
                            </span>
                            <span className="text-[10px] text-slate-400 block">in stock</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Equipment */}
              {results.equipment.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-amber-600" /> Machinery & Equipment ({results.equipment.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.equipment.map((eq) => {
                      const siteObj = sites.find((s) => s.id === eq.currentSiteId);
                      return (
                        <div
                          key={eq.id}
                          onClick={() => handleOpenSite(eq.currentSiteId, 'Equipment')}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-amber-50/60 border border-slate-200 cursor-pointer transition"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{eq.name}</div>
                            <div className="text-xs text-slate-500">
                              Located at: {siteObj?.name} • Operator: {eq.assignedOperator}
                            </div>
                          </div>
                          <div>
                            <span
                              className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                                eq.status === 'Available'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : eq.status === 'In Use'
                                  ? 'bg-sky-100 text-sky-800'
                                  : eq.status === 'Maintenance'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}
                            >
                              {eq.status}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Problems */}
              {results.problems.length > 0 && (
                <div>
                  <div className="text-xs font-bold uppercase text-slate-500 tracking-wider mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Active Problems ({results.problems.length})
                  </div>
                  <div className="space-y-1.5">
                    {results.problems.map((p) => {
                      const siteObj = sites.find((s) => s.id === p.siteId);
                      return (
                        <div
                          key={p.id}
                          onClick={() => handleOpenSite(p.siteId, 'Overview')}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-rose-50/60 border border-slate-200 cursor-pointer transition"
                        >
                          <div>
                            <div className="font-bold text-slate-900 text-sm">{p.title}</div>
                            <div className="text-xs text-slate-500">
                              Site: {siteObj?.name} • Severity: {p.severity}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
