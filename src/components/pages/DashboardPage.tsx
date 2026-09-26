import React from 'react';
import { useApp } from '../../context/AppContext';
import { NavPage } from '../layout/Sidebar';
import {
  Building2,
  TrendingUp,
  AlertTriangle,
  ArrowRightLeft,
  Users,
  CheckCircle2,
  Clock,
  Package,
  Truck,
  ChevronRight,
  Plus,
  Send,
  AlertOctagon,
  Calendar,
  MapPin,
  ExternalLink,
  Shield,
  Briefcase,
  HardHat
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate: (page: NavPage) => void;
  onOpenNewTask: (siteId?: string) => void;
  onOpenResourceRequest: (siteId?: string) => void;
  onOpenReportProblem: (siteId?: string) => void;
  onOpenNewSite?: () => void;
  onOpenDailyReport?: (siteId?: string) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenNewTask,
  onOpenResourceRequest,
  onOpenReportProblem,
  onOpenNewSite,
  onOpenDailyReport,
}) => {
  const {
    currentUser,
    role,
    sites,
    accessibleSites,
    setSelectedSiteId,
    tasks,
    materials,
    labour,
    equipment,
    problems,
    resourceRequests,
    reports,
    getInterSiteMatches,
  } = useApp();

  // Get current hour for greeting
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const userName = currentUser?.name || currentUser?.email?.split('@')[0] || 'User';

  // Role-scoped sites
  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const activeSites = relevantSites.filter((s) => s.status === 'Active');
  const completedSites = relevantSites.filter((s) => s.status === 'Completed');

  // Overall progress
  const overallProgress =
    relevantSites.length > 0
      ? Math.round(
          relevantSites.reduce((acc, curr) => acc + curr.progressPercent, 0) /
            relevantSites.length
        )
      : 0;

  // Active workforce across relevant sites
  const relevantSiteIds = relevantSites.map((s) => s.id);
  const relevantLabour = labour.filter((l) => relevantSiteIds.includes(l.siteId));
  const totalLabourPresent = relevantLabour.reduce((acc, curr) => acc + curr.present, 0);
  const totalLabourRequired = relevantLabour.reduce((acc, curr) => acc + curr.required, 0);

  // Relevant tasks
  const relevantTasks = tasks.filter((t) => relevantSiteIds.includes(t.siteId));
  const activeTasks = relevantTasks.filter(
    (t) => t.status === 'In Progress' || t.status === 'Pending'
  );
  const delayedTasks = relevantTasks.filter((t) => t.status === 'Delayed');
  const completedTasks = relevantTasks.filter((t) => t.status === 'Completed');

  // Critical alerts
  const openProblems = problems.filter(
    (p) => relevantSiteIds.includes(p.siteId) && p.status === 'Open'
  );
  const lowMaterials = materials.filter(
    (m) => relevantSiteIds.includes(m.siteId) && m.currentStock <= m.minThreshold
  );
  const breakdownEquipment = equipment.filter(
    (e) => e.status === 'Breakdown' && (e.currentSiteId ? relevantSiteIds.includes(e.currentSiteId) : true)
  );
  const pendingRequests = resourceRequests.filter(
    (r) => relevantSiteIds.includes(r.siteId) && r.status === 'Pending'
  );

  // Inter-site transfer matches (Boss and PM)
  const interSiteMatches = getInterSiteMatches();

  return (
    <div className="space-y-6">
      {/* Top Greeting & Operational Summary */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            {greeting}, {userName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            {role === 'BOSS' && (
              <>Overview across all {sites.length} sites. {activeSites.length} active projects in progress.</>
            )}
            {role === 'PROJECT_MANAGER' && (
              <>Oversight across {accessibleSites.length} assigned sites. {delayedTasks.length > 0 ? `${delayedTasks.length} tasks require schedule review.` : 'All projects are tracking on schedule.'}</>
            )}
            {role === 'SITE_ENGINEER' && (
              <>Assigned to {accessibleSites[0]?.name || 'field station'}. Log daily progress and track field operations.</>
            )}
          </p>
        </div>

        {/* Primary Action Button */}
        <div className="flex items-center space-x-2">
          {role === 'BOSS' && onOpenNewSite && (
            <button
              onClick={onOpenNewSite}
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Add Site</span>
            </button>
          )}
          <button
            onClick={() => onOpenNewTask()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 text-blue-600 stroke-[2.5]" />
            <span>Add Task</span>
          </button>
          <button
            onClick={() => onOpenResourceRequest()}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <ArrowRightLeft className="h-3.5 w-3.5 text-amber-600" />
            <span>Request Resource</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Sites */}
        <div
          onClick={() => onNavigate('sites')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Sites</span>
            <Building2 className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {activeSites.length}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              / {relevantSites.length} total
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {completedSites.length} completed
          </div>
        </div>

        {/* Overall Progress */}
        <div className="bg-white p-3.5 rounded-lg border border-slate-200">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Progress</span>
            <TrendingUp className="h-4 w-4 text-amber-600" />
          </div>
          <div className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">
            {overallProgress}%
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-amber-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Workforce */}
        <div
          onClick={() => onNavigate('labour')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Workforce</span>
            <Users className="h-4 w-4 text-blue-600" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {totalLabourPresent}
            </span>
            <span className="text-xs text-slate-400 font-normal">
              / {totalLabourRequired} req
            </span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {totalLabourRequired > 0
              ? `${Math.round((totalLabourPresent / totalLabourRequired) * 100)}% attendance`
              : 'Attendance tracking'}
          </div>
        </div>

        {/* Active Tasks */}
        <div
          onClick={() => onNavigate('tasks')}
          className="bg-white p-3.5 rounded-lg border border-slate-200 hover:border-slate-300 transition cursor-pointer"
        >
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
            <span>Tasks</span>
            <Clock className="h-4 w-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {activeTasks.length}
            </span>
            {delayedTasks.length > 0 && (
              <span className="text-xs text-rose-600 font-semibold tabular-nums">
                ({delayedTasks.length} delayed)
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {completedTasks.length} completed
          </div>
        </div>

        {/* Open Problems */}
        <div
          onClick={() => onNavigate('problems')}
          className={`p-3.5 rounded-lg border transition cursor-pointer ${
            openProblems.length > 0
              ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-medium">
            <span className={openProblems.length > 0 ? 'text-rose-700' : 'text-slate-500'}>
              Open Issues
            </span>
            <AlertTriangle
              className={`h-4 w-4 ${
                openProblems.length > 0 ? 'text-rose-600' : 'text-slate-400'
              }`}
            />
          </div>
          <div
            className={`mt-2 text-2xl font-bold tabular-nums ${
              openProblems.length > 0 ? 'text-rose-700' : 'text-slate-900'
            }`}
          >
            {openProblems.length}
          </div>
          <div className="text-[11px] mt-1 text-slate-500">
            {openProblems.length > 0 ? 'Requires attention' : 'No open blockers'}
          </div>
        </div>
      </div>

      {/* Attention Queue (Immediate field alerts) */}
      {(openProblems.length > 0 || lowMaterials.length > 0 || breakdownEquipment.length > 0) && (
        <div className="bg-amber-50/40 border border-amber-200 rounded-lg p-3.5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <span className="h-2 w-2 rounded-full bg-amber-600"></span>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Items Requiring Action
              </span>
            </div>
            <span className="text-[11px] text-slate-500">
              {openProblems.length + lowMaterials.length + breakdownEquipment.length} item(s) flagged
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
            {openProblems.slice(0, 2).map((p) => {
              const site = sites.find((s) => s.id === p.siteId);
              return (
                <div
                  key={p.id}
                  onClick={() => onNavigate('problems')}
                  className="bg-white p-2.5 rounded-md border border-rose-200 hover:border-rose-300 flex items-start space-x-2 cursor-pointer transition"
                >
                  <AlertOctagon className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      {p.title || p.description}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {site?.name} · Severity: {p.severity}
                    </div>
                  </div>
                </div>
              );
            })}

            {lowMaterials.slice(0, 2).map((m) => {
              const site = sites.find((s) => s.id === m.siteId);
              return (
                <div
                  key={m.id}
                  onClick={() => onNavigate('materials')}
                  className="bg-white p-2.5 rounded-md border border-amber-200 hover:border-amber-300 flex items-start space-x-2 cursor-pointer transition"
                >
                  <Package className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      Low Stock: {m.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {site?.name} · {m.currentStock} {m.unit} (Min: {m.minThreshold})
                    </div>
                  </div>
                </div>
              );
            })}

            {breakdownEquipment.slice(0, 1).map((e) => {
              const site = sites.find((s) => s.id === e.currentSiteId);
              return (
                <div
                  key={e.id}
                  onClick={() => onNavigate('equipment')}
                  className="bg-white p-2.5 rounded-md border border-slate-300 hover:border-slate-400 flex items-start space-x-2 cursor-pointer transition"
                >
                  <Truck className="h-4 w-4 text-slate-600 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-900 truncate">
                      Breakdown: {e.name}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {site?.name || 'Yard'} · Needs repair
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Content Split: Active Projects List & Inter-Site Coordination */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Active Construction Sites Table / Cards */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">
              Active Construction Sites ({activeSites.length})
            </h2>
            <button
              onClick={() => onNavigate('sites')}
              className="text-xs font-semibold text-amber-600 hover:text-amber-700 flex items-center space-x-0.5 cursor-pointer"
            >
              <span>View All</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {activeSites.map((site) => {
              const siteTasks = tasks.filter((t) => t.siteId === site.id);
              const delayed = siteTasks.filter((t) => t.status === 'Delayed').length;
              const openIssues = problems.filter(
                (p) => p.siteId === site.id && p.status === 'Open'
              ).length;

              return (
                <div
                  key={site.id}
                  onClick={() => {
                    setSelectedSiteId(site.id);
                    onNavigate('sites');
                  }}
                  className="p-3.5 hover:bg-slate-50 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-slate-500 font-mono">
                        {site.code}
                      </span>
                      <span className="font-bold text-slate-900 text-sm truncate">
                        {site.name}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                        {site.status}
                      </span>
                    </div>

                    <div className="flex items-center space-x-3 text-xs text-slate-500">
                      <span className="flex items-center space-x-1">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <span className="truncate">{site.location}</span>
                      </span>
                      <span>·</span>
                      <span>Client: {site.client}</span>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 shrink-0">
                    {/* Progress */}
                    <div className="w-24 text-right">
                      <div className="text-xs font-bold text-slate-900 tabular-nums">
                        {site.progressPercent}%
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div
                          className="bg-amber-500 h-full rounded-full"
                          style={{ width: `${site.progressPercent}%` }}
                        />
                      </div>
                    </div>

                    {/* Flags */}
                    <div className="flex items-center space-x-1.5 text-xs">
                      {delayed > 0 ? (
                        <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                          {delayed} delayed
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-medium">On track</span>
                      )}
                      {openIssues > 0 && (
                        <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          {openIssues} issue(s)
                        </span>
                      )}
                    </div>

                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </div>
              );
            })}

            {activeSites.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-xs">
                No active sites found. Click &quot;Add Site&quot; to begin your first project.
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Inter-Site Resource Sharing & Quick Updates */}
        <div className="space-y-4">
          {/* Inter-site Transfer Suggestions */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Inter-Site Transfers
                </h3>
              </div>
              <button
                onClick={() => onNavigate('requests')}
                className="text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
              >
                Requests ({pendingRequests.length})
              </button>
            </div>

            {interSiteMatches.length > 0 ? (
              <div className="space-y-2">
                {interSiteMatches.slice(0, 3).map((match, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md bg-slate-50 border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{match.item}</span>
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                        {match.neededQty} needed
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500">
                      From: <strong>{match.sourceSite.name}</strong> → To: <strong>{match.targetSite.name}</strong>
                    </div>
                    <p className="text-[10px] text-slate-600 italic">{match.details}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-slate-400 text-xs">
                No active surplus or cross-site transfer opportunities currently detected.
              </div>
            )}
          </div>

          {/* Recent Daily Reports */}
          <div className="bg-white border border-slate-200 rounded-lg p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Recent Daily Reports
              </h3>
              <button
                onClick={() => onNavigate('reports')}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                View Log
              </button>
            </div>

            <div className="space-y-2">
              {reports.slice(0, 3).map((report) => {
                const site = sites.find((s) => s.id === report.siteId);
                return (
                  <div
                    key={report.id}
                    onClick={() => onNavigate('reports')}
                    className="p-2 rounded-md hover:bg-slate-50 transition cursor-pointer text-xs border border-slate-100"
                  >
                    <div className="flex items-center justify-between text-slate-900 font-semibold">
                      <span>{site?.name || 'Site'}</span>
                      <span className="text-[10px] text-slate-400 tabular-nums">
                        {report.date}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 truncate mt-0.5">
                      {report.workCompleted}
                    </p>
                  </div>
                );
              })}

              {reports.length === 0 && (
                <div className="text-center py-3 text-slate-400 text-xs">
                  No daily reports logged yet today.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
