import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Building2,
  TrendingUp,
  AlertOctagon,
  FileCheck2,
  ChevronRight,
  ArrowRightLeft,
  Sparkles,
  BarChart3,
  LayoutGrid,
  CheckCircle2,
  Clock,
  PackageX,
  Users,
  Truck,
  ExternalLink,
  PlusCircle,
  Archive,
  CheckCircle,
  AlertTriangle,
  FileText
} from 'lucide-react';
import { GraphicalDashboard } from './GraphicalDashboard';
import { CompanyMembersView } from './CompanyMembersView';

interface Props {
  onOpenNewTask: () => void;
  onOpenResourceRequest: () => void;
  onOpenNewSite?: () => void;
}

export const BossDashboard: React.FC<Props> = ({ onOpenNewTask, onOpenResourceRequest, onOpenNewSite }) => {
  const {
    sites,
    tasks,
    materials,
    labour,
    equipment,
    problems,
    resourceRequests,
    documents,
    reports,
    setSelectedSiteId,
    setActiveSiteTab,
    getInterSiteMatches,
    updateResourceRequestStatus,
  } = useApp();

  const [activeView, setActiveView] = useState<'sites' | 'graphs' | 'members'>('sites');

  // Active vs Completed Sites separation
  const activeAndHoldSites = sites.filter((s) => s.status !== 'Completed');
  const completedSites = sites.filter((s) => s.status === 'Completed');

  // KPI Calculations
  const totalSites = sites.length;
  const activeSites = sites.filter((s) => s.status === 'Active').length;
  const overallProgress = Math.round(
    sites.reduce((acc, curr) => acc + curr.progressPercent, 0) / (totalSites || 1)
  );
  const openProblems = problems.filter((p) => p.status === 'Open');
  const pendingRequests = resourceRequests.filter((r) => r.status === 'Pending');

  // Suggested Inter-site Transfers
  const interSiteMatches = getInterSiteMatches();

  // Dynamic Live Alerts from actual application state
  const criticalStockAlerts = materials
    .filter((m) => {
      const site = sites.find((s) => s.id === m.siteId);
      return site && site.status !== 'Completed' && m.currentStock <= m.minThreshold;
    })
    .slice(0, 2);

  const labourShortageAlerts = sites
    .filter((s) => s.status !== 'Completed')
    .map((s) => {
      const siteLabour = labour.filter((l) => l.siteId === s.id);
      const req = siteLabour.reduce((acc, c) => acc + c.required, 0);
      const pres = siteLabour.reduce((acc, c) => acc + c.present, 0);
      return { site: s, shortage: Math.max(0, req - pres), present: pres };
    })
    .filter((item) => item.shortage > 0)
    .slice(0, 1);

  const breakdownEquipAlerts = equipment
    .filter((e) => e.status === 'Breakdown')
    .slice(0, 1);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse"></span>
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Company Executive Cockpit
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
            SITEPOINT Constructions
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Multi-site real-time control center across {totalSites} total projects ({completedSites.length} completed).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* New Site Button for Boss */}
          {onOpenNewSite && (
            <button
              onClick={onOpenNewSite}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
            >
              <PlusCircle className="h-4 w-4" />
              <span>+ New Site</span>
            </button>
          )}

          <div className="bg-slate-200/80 p-1 rounded-xl flex items-center border border-slate-300">
            <button
              onClick={() => setActiveView('sites')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeView === 'sites'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              <span>Sites Overview</span>
            </button>
            <button
              onClick={() => setActiveView('members')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeView === 'members'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5 text-amber-600" />
              <span>Company & Members</span>
            </button>
            <button
              onClick={() => setActiveView('graphs')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeView === 'graphs'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Graphical Dashboard</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1. Company Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Total Sites</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900">{totalSites}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">All projects</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-emerald-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Active Sites</span>
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600">{activeSites}</div>
          <div className="text-[11px] text-slate-500 mt-1 font-medium">Under construction</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-amber-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Overall Progress</span>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600">{overallProgress}%</div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: `${overallProgress}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-rose-300 transition">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Open Problems</span>
            <AlertOctagon className="h-4 w-4 text-rose-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-rose-600">{openProblems.length}</div>
          <div className="text-[11px] text-rose-500 mt-1 font-medium">Requires attention</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs hover:border-sky-300 transition col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
            <span>Pending Requests</span>
            <FileCheck2 className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-sky-600">{pendingRequests.length}</div>
          <div className="text-[11px] text-sky-600 mt-1 font-medium">Resource needs</div>
        </div>
      </div>

      {/* 2. IMPORTANT ALERTS (From prompt section 3) */}
      <div className="rounded-2xl border border-amber-300/80 bg-gradient-to-r from-amber-50 via-amber-50/70 to-orange-50 p-4 sm:p-5 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="flex h-3 w-3 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
            </span>
            <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider">
              Critical Alerts &amp; Live Site Broadcasts
            </h2>
          </div>
          <span className="text-xs font-bold text-amber-800 bg-amber-200/60 px-2.5 py-0.5 rounded-full border border-amber-300">
            Immediate Action
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          {criticalStockAlerts.length > 0 ? (
            criticalStockAlerts.map((m) => {
              const site = sites.find((s) => s.id === m.siteId);
              return (
                <div key={m.id} className="bg-white/90 rounded-xl p-3 border border-amber-200/90 shadow-2xs flex items-start space-x-2.5">
                  <span className="text-lg leading-none">⚠️</span>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{site?.name || 'Active Site'}</div>
                    <div className="text-xs text-slate-700 mt-0.5">
                      Low Stock: <strong>{m.name}</strong> (Down to {m.currentStock} {m.unit}, min: {m.minThreshold})
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white/90 rounded-xl p-3 border border-emerald-200 shadow-2xs flex items-start space-x-2.5">
              <span className="text-lg leading-none">✅</span>
              <div>
                <div className="font-bold text-slate-900 text-xs">Material Inventory</div>
                <div className="text-xs text-emerald-800 mt-0.5">All active sites are operating above safety minimum stock thresholds.</div>
              </div>
            </div>
          )}

          {labourShortageAlerts.length > 0 ? (
            labourShortageAlerts.map(({ site, shortage, present }) => (
              <div key={site.id} className="bg-white/90 rounded-xl p-3 border border-amber-200/90 shadow-2xs flex items-start space-x-2.5">
                <span className="text-lg leading-none">👷</span>
                <div>
                  <div className="font-bold text-slate-900 text-xs">{site.name}</div>
                  <div className="text-xs text-slate-700 mt-0.5">
                    Needs <strong>{shortage} more workers</strong> ({present} present on-site today)
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="bg-white/90 rounded-xl p-3 border border-emerald-200 shadow-2xs flex items-start space-x-2.5">
              <span className="text-lg leading-none">👷</span>
              <div>
                <div className="font-bold text-slate-900 text-xs">Workforce Headcount</div>
                <div className="text-xs text-emerald-800 mt-0.5">Labour deployment targets are fully met across sites.</div>
              </div>
            </div>
          )}

          {breakdownEquipAlerts.length > 0 ? (
            breakdownEquipAlerts.map((eq) => {
              const eqSite = sites.find((s) => s.id === eq.currentSiteId);
              return (
                <div key={eq.id} className="bg-white/90 rounded-xl p-3 border border-rose-200 shadow-2xs flex items-start space-x-2.5">
                  <span className="text-lg leading-none">🚜</span>
                  <div>
                    <div className="font-bold text-slate-900 text-xs">{eqSite?.name || 'Machinery Breakdown'}</div>
                    <div className="text-xs text-rose-700 mt-0.5">
                      <strong>{eq.name}</strong> broken down ({eq.breakdownReason || 'Awaiting mechanic repair'})
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white/90 rounded-xl p-3 border border-emerald-200 shadow-2xs flex items-start space-x-2.5">
              <span className="text-lg leading-none">🚜</span>
              <div>
                <div className="font-bold text-slate-900 text-xs">Machinery Fleet</div>
                <div className="text-xs text-emerald-800 mt-0.5">Zero reported machinery breakdowns. All heavy equipment functional.</div>
              </div>
            </div>
          )}

          {/* Inter-site surplus preview */}
          <div className="bg-emerald-50 rounded-xl p-3 border border-emerald-300 shadow-2xs flex items-start space-x-2.5">
            <span className="text-lg leading-none">🔄</span>
            <div>
              <div className="font-bold text-emerald-950 text-xs">Highway Expansion</div>
              <div className="text-xs text-emerald-800 mt-0.5">Has <strong>JCB available</strong> &amp; <strong>surplus cement bags</strong> for transfer</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. SMART INTER-SITE RESOURCE TRANSFER SUGGESTIONS (Key Prompt Feature!) */}
      {interSiteMatches.length > 0 && (
        <div className="rounded-2xl border-2 border-sky-400 bg-sky-50/90 p-4 sm:p-5 shadow-md">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 rounded-lg bg-sky-500 text-white">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-sky-950 uppercase tracking-wider">
                  🔔 Possible Inter-Site Transfers Detected
                </h3>
                <p className="text-xs text-sky-800">
                  Save purchasing costs by sharing resources between sites that have surplus.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold bg-sky-200 text-sky-900 px-2.5 py-0.5 rounded-full border border-sky-300">
              Smart Suggestion
            </span>
          </div>

          <div className="space-y-3">
            {interSiteMatches.map((match, idx) => (
              <div
                key={idx}
                className="bg-white rounded-xl p-4 border border-sky-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-900 text-sm">{match.targetSite.name}</span>
                    <span className="text-xs text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                      Needs {match.neededQty} {match.item}
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 flex items-center space-x-1.5">
                    <ArrowRightLeft className="h-3.5 w-3.5 text-sky-500 shrink-0" />
                    <span>
                      <strong className="text-emerald-700">{match.sourceSite.name}</strong> currently has{' '}
                      <strong className="text-slate-900">{match.availableQty}</strong>. {match.details}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
                  <button
                    onClick={() => {
                      updateResourceRequestStatus(match.requestId, 'Transferred');
                    }}
                    className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" />
                    <span>Approve Inter-Site Transfer</span>
                  </button>
                  <button
                    onClick={() => {
                      updateResourceRequestStatus(match.requestId, 'Approved');
                    }}
                    className="w-full md:w-auto bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-3 py-2 rounded-xl transition"
                  >
                    Buy New Instead
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main View: Sites Grid, Graphs, or Company Members */}
      {activeView === 'members' ? (
        <CompanyMembersView />
      ) : activeView === 'graphs' ? (
        <GraphicalDashboard />
      ) : (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Company Sites Overview
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Click any site to open its full dashboard (Tasks, Materials, Labour, Equipment, Reports).
              </p>
            </div>
            <button
              onClick={() => {
                setSelectedSiteId(sites[0]?.id || 'site-1');
                setActiveSiteTab('Overview');
              }}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 flex items-center space-x-1"
            >
              <span>Drill into Riverside Tower</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Site Cards Grid: Active & On-Hold Projects */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeAndHoldSites.map((site) => {
              const siteTasks = tasks.filter((t) => t.siteId === site.id);
              const completedTasksCount = siteTasks.filter((t) => t.status === 'Completed').length;
              const pendingTasksCount = siteTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').length;
              const delayedTasks = siteTasks.filter((t) => t.status === 'Delayed');
              const siteProblems = problems.filter((p) => p.siteId === site.id && p.status === 'Open');

              const siteMaterials = materials.filter((m) => m.siteId === site.id);
              const lowMaterials = siteMaterials.filter((m) => m.currentStock <= m.minThreshold);

              const siteLabour = labour.filter((l) => l.siteId === site.id);
              const totalRequiredLabour = siteLabour.reduce((acc, curr) => acc + curr.required, 0);
              const totalPresentLabour = siteLabour.reduce((acc, curr) => acc + curr.present, 0);
              const labourShortage = Math.max(0, totalRequiredLabour - totalPresentLabour);

              const siteEquip = equipment.filter((eq) => eq.currentSiteId === site.id);
              const breakdownEquip = siteEquip.filter((eq) => eq.status === 'Breakdown');
              const inUseEquip = siteEquip.filter((eq) => eq.status === 'In Use');
              const availEquip = siteEquip.filter((eq) => eq.status === 'Available');

              return (
                <div
                  key={site.id}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    setActiveSiteTab('Overview');
                  }}
                  className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-amber-400 hover:shadow-lg transition cursor-pointer group flex flex-col justify-between"
                >
                  <div>
                    {/* Top Row: Name, Code, Progress Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                            {site.code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                            site.status === 'On Hold'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}>
                            {site.status || 'Active'}
                          </span>
                          <span className="text-xs text-slate-400">PM: {site.projectManager}</span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition mt-1">
                          {site.name}
                        </h3>
                        <p className="text-xs text-slate-500">{site.location}</p>
                      </div>

                      <div className="text-right">
                        <div className="text-2xl font-black text-amber-600">{site.progressPercent}%</div>
                        <div className="text-[10px] uppercase font-bold text-slate-400">Progress</div>
                      </div>
                    </div>

                    {/* On Hold Warning if applicable */}
                    {site.status === 'On Hold' && site.holdReason && (
                      <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-start space-x-1.5">
                        <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <span><strong>Work On Hold:</strong> {site.holdReason}</span>
                      </div>
                    )}

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-100 rounded-full h-2 mb-4 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${site.status === 'On Hold' ? 'bg-amber-400' : 'bg-amber-500'}`}
                        style={{ width: `${site.progressPercent}%` }}
                      ></div>
                    </div>

                    {/* Site Vitals Metrics */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Today's Tasks</div>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> {completedTasksCount} Done
                          </span>
                          <span className="text-slate-400">|</span>
                          <span className="text-slate-700 font-semibold">{pendingTasksCount} Pending</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Site Problems</div>
                        <div className="mt-1">
                          {siteProblems.length > 0 ? (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <AlertOctagon className="h-3.5 w-3.5 text-rose-600" /> {siteProblems.length} Open
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">All clear</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Materials Alert</div>
                        <div className="mt-1">
                          {lowMaterials.length > 0 ? (
                            <span className="text-rose-700 font-bold flex items-center gap-1">
                              <PackageX className="h-3.5 w-3.5 text-rose-600" /> {lowMaterials[0].name.split(' ')[0]} Low
                            </span>
                          ) : (
                            <span className="text-slate-600 font-medium">{siteMaterials.length} items stocked</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100">
                        <div className="text-[10px] uppercase font-bold text-slate-400">Labour Status</div>
                        <div className="mt-1">
                          {labourShortage > 0 ? (
                            <span className="text-amber-700 font-bold flex items-center gap-1">
                              <Users className="h-3.5 w-3.5 text-amber-600" /> -{labourShortage} Shortage
                            </span>
                          ) : (
                            <span className="text-slate-700 font-medium">{totalPresentLabour} Present</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Equipment Status Tag */}
                    <div className="flex items-center justify-between text-xs py-2 px-3 rounded-xl bg-slate-100/70 border border-slate-200">
                      <div className="flex items-center space-x-1.5 text-slate-700 font-medium">
                        <Truck className="h-3.5 w-3.5 text-slate-500" />
                        <span>Equipment: {siteEquip.length} units</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        {breakdownEquip.length > 0 && (
                          <span className="text-[10px] font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                            🔴 {breakdownEquip.length} Breakdown
                          </span>
                        )}
                        {availEquip.length > 0 && (
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md">
                            🟢 {availEquip.length} Available
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer link */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-bold text-amber-600 group-hover:text-amber-700">
                    <span>Open Detailed Site View</span>
                    <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition" />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section: Completed Sites Archive */}
          {completedSites.length > 0 && (
            <div className="space-y-3 pt-4 border-t border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-800">
                  <Archive className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 tracking-tight">
                    Completed Sites Archive ({completedSites.length})
                  </h3>
                  <p className="text-xs text-slate-500">
                    Officially finished and handed-over projects with complete records preserved.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedSites.map((site) => {
                  const siteDocs = documents.filter((d) => d.siteId === site.id);
                  const siteReportsCount = reports.filter((r) => r.siteId === site.id).length;

                  return (
                    <div
                      key={site.id}
                      onClick={() => {
                        setSelectedSiteId(site.id);
                        setActiveSiteTab('Overview');
                      }}
                      className="bg-slate-50 rounded-2xl p-5 border border-emerald-200/80 hover:border-emerald-400 hover:shadow-md transition cursor-pointer flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200">
                                {site.code}
                              </span>
                              <span className="text-xs font-bold text-emerald-700 bg-white px-2 py-0.5 rounded-md border border-emerald-300 flex items-center gap-1">
                                <CheckCircle className="h-3 w-3" /> Handed Over
                              </span>
                            </div>
                            <h4 className="text-base font-bold text-slate-900 mt-1">{site.name}</h4>
                            <p className="text-xs text-slate-500">{site.location} • Client: {site.client}</p>
                          </div>
                          <span className="text-lg font-black text-emerald-600">100%</span>
                        </div>

                        {site.completionDetails && (
                          <div className="mt-2 text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 space-y-1">
                            <div>Completed: <strong>{site.completionDetails.completionDate}</strong></div>
                            <div className="line-clamp-2 text-slate-500 italic">"{site.completionDetails.remarks}"</div>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between text-xs font-bold text-emerald-700">
                        <span className="flex items-center gap-1 text-slate-500 font-normal">
                          <FileText className="h-3.5 w-3.5 text-slate-400" />
                          {siteReportsCount} Reports • {siteDocs.length} Documents
                        </span>
                        <span className="flex items-center gap-0.5">
                          <span>View Records</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Pending Resource Requests Table (Section 8) */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Resource Requests Requiring Approval
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Site engineers submit resource needs for material, labour, or machinery.
                </p>
              </div>
              <span className="text-xs font-bold bg-amber-100 text-amber-800 px-3 py-1 rounded-full">
                {pendingRequests.length} Pending
              </span>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs">
                All site resource requests have been reviewed and approved.
              </div>
            ) : (
              <div className="space-y-3">
                {pendingRequests.map((req) => {
                  const reqSite = sites.find((s) => s.id === req.siteId);
                  return (
                    <div
                      key={req.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/60 hover:bg-slate-50 transition gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{req.item}</span>
                          <span className="text-xs font-bold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {req.quantity} {req.unit}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                              req.priority === 'High'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {req.priority} Priority
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Site: <strong>{reqSite?.name}</strong> • Requested by: {req.requestedBy} • Needed by: {req.requiredDate}
                        </div>
                        <div className="text-xs text-slate-700 italic">“{req.reason}”</div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => updateResourceRequestStatus(req.id, 'Approved')}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                        >
                          Approve Purchase
                        </button>
                        <button
                          onClick={() => updateResourceRequestStatus(req.id, 'Rejected')}
                          className="px-3 py-1.5 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-semibold transition cursor-pointer"
                        >
                          Decline
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
