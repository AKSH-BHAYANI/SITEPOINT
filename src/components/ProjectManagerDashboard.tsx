import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Briefcase,
  TrendingUp,
  AlertTriangle,
  Send,
  PlusCircle,
  Clock,
  CheckCircle2,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  BarChart3,
  Building2
} from 'lucide-react';
import { GraphicalDashboard } from './GraphicalDashboard';

interface Props {
  onOpenNewTask: (siteId?: string) => void;
  onOpenResourceRequest: (siteId?: string) => void;
  onReportProblem: (siteId?: string) => void;
}

export const ProjectManagerDashboard: React.FC<Props> = ({
  onOpenNewTask,
  onOpenResourceRequest,
  onReportProblem,
}) => {
  const {
    sites,
    accessibleSites,
    tasks,
    problems,
    resourceRequests,
    setSelectedSiteId,
    setActiveSiteTab,
  } = useApp();

  const [activeView, setActiveView] = useState<'sites' | 'graphs'>('sites');

  // Assigned sites strictly isolated to accessibleSites
  const assignedSites = accessibleSites;
  const [activeSiteFilter, setActiveSiteFilter] = useState<string>('all');

  const filteredSites = activeSiteFilter === 'all'
    ? assignedSites
    : assignedSites.filter((s) => s.id === activeSiteFilter);

  const assignedSiteIds = filteredSites.map((s) => s.id);
  const relevantTasks = tasks.filter((t) => assignedSiteIds.includes(t.siteId));
  const delayedTasks = relevantTasks.filter((t) => t.status === 'Delayed');
  const relevantProblems = problems.filter((p) => assignedSiteIds.includes(p.siteId) && p.status === 'Open');
  const relevantRequests = resourceRequests.filter((r) => assignedSiteIds.includes(r.siteId));

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <Briefcase className="h-4 w-4 text-sky-500" />
            <span className="text-xs uppercase font-bold text-slate-500 tracking-wider">
              Project Manager Operations
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-0.5">
            Assigned Sites Console
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">
            Overseeing field engineering execution, schedule recovery, and procurement coordination.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
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
              <span>Sites</span>
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
              <span>Graphs</span>
            </button>
          </div>

          <button
            onClick={() => onOpenNewTask(assignedSites[0]?.id)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <PlusCircle className="h-4 w-4 text-amber-400" />
            <span>Assign Task</span>
          </button>
          <button
            onClick={() => onOpenResourceRequest(assignedSites[0]?.id)}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
          >
            <Send className="h-4 w-4 text-white" />
            <span>Request Resources</span>
          </button>
        </div>
      </div>

      {assignedSites.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 mb-4 border border-sky-200">
            <Building2 className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No site assigned yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Please contact your company administrator to have construction sites assigned to your account.
          </p>
        </div>
      ) : activeView === 'graphs' ? (
        <GraphicalDashboard />
      ) : (
        <>
          {/* Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-slate-200 pb-3">
        <span className="text-xs font-bold text-slate-500 mr-2">Filter Sites:</span>
        <button
          onClick={() => setActiveSiteFilter('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeSiteFilter === 'all'
              ? 'bg-sky-600 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          All Assigned Sites ({assignedSites.length})
        </button>
        {assignedSites.map((s) => (
          <button
            key={s.id}
            onClick={() => setActiveSiteFilter(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
              activeSiteFilter === s.id
                ? 'bg-sky-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {s.name} ({s.progressPercent}%)
          </button>
        ))}
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500">Active Tasks</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{relevantTasks.length}</div>
          <div className="text-xs text-slate-500 mt-1">
            {relevantTasks.filter((t) => t.status === 'Completed').length} marked completed today
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-rose-600">Delayed Milestones</div>
          <div className="text-2xl font-black text-rose-600 mt-1">{delayedTasks.length}</div>
          <div className="text-xs text-rose-500 mt-1">Requires schedule adjustment</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="text-xs font-bold uppercase text-slate-500">Open Site Issues</div>
          <div className="text-2xl font-black text-amber-600 mt-1">{relevantProblems.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active site bottlenecks</div>
        </div>
      </div>

      {/* Delayed Tasks Highlight Box (Critical for PM!) */}
      {delayedTasks.length > 0 && (
        <div className="rounded-2xl border-2 border-rose-300 bg-rose-50/70 p-5 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-rose-600" />
              <h2 className="text-base font-black text-rose-950">
                Tasks Marked Delayed by Site Engineers
              </h2>
            </div>
            <span className="text-xs font-bold bg-rose-200 text-rose-900 px-2.5 py-0.5 rounded-full">
              Action Required
            </span>
          </div>

          <div className="space-y-3">
            {delayedTasks.map((t) => {
              const siteObj = sites.find((s) => s.id === t.siteId);
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl p-4 border border-rose-200 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-bold text-slate-900 text-sm">{t.name}</span>
                      <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded-md">
                        Reason: {t.delayReason}
                      </span>
                    </div>
                    <div className="text-xs text-slate-500">
                      Site: <strong>{siteObj?.name}</strong> • Location: {t.location} • Team: {t.assignedTeam}
                    </div>
                    {t.delayExplanation && (
                      <p className="text-xs text-slate-700 font-medium">“{t.delayExplanation}”</p>
                    )}
                    {t.newExpectedDate && (
                      <div className="text-xs text-slate-600">
                        New Rescheduled Date: <strong className="text-slate-900">{t.newExpectedDate}</strong>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    {t.delayPhoto && (
                      <a
                        href={t.delayPhoto}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-3 py-1.5 rounded-lg flex items-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View Photo</span>
                      </a>
                    )}
                    <button
                      onClick={() => {
                        setSelectedSiteId(t.siteId);
                        setActiveSiteTab('Tasks');
                      }}
                      className="text-xs font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg"
                    >
                      Open in Site
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Assigned Sites Grid */}
      <div className="space-y-4">
        <h2 className="text-lg font-black text-slate-900 tracking-tight">Assigned Sites Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSites.map((site) => (
            <div
              key={site.id}
              onClick={() => {
                setSelectedSiteId(site.id);
                setActiveSiteTab('Overview');
              }}
              className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-400 hover:shadow-md transition cursor-pointer"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-200">
                    {site.code}
                  </span>
                  <h3 className="text-lg font-bold text-slate-900 mt-1">{site.name}</h3>
                  <p className="text-xs text-slate-500">{site.location}</p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-sky-600">{site.progressPercent}%</span>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Progress</span>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-2 my-3 overflow-hidden">
                <div
                  className="bg-sky-500 h-full rounded-full"
                  style={{ width: `${site.progressPercent}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                <span>Site Engineer: <strong>{site.siteEngineer}</strong></span>
                <span className="text-sky-600 font-bold flex items-center space-x-1">
                  <span>Open Site</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
        </>
      )}
    </div>
  );
};
