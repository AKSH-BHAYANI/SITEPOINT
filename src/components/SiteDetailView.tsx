import React, { useState } from 'react';
import { useApp, SiteTab } from '../context/AppContext';
import { Task, Material, LabourCategory, Equipment, DelayReason } from '../types';
import {
  Building2,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Package,
  Users,
  Truck,
  FileText,
  FolderLock,
  Plus,
  Send,
  AlertOctagon,
  ChevronLeft,
  ExternalLink,
  Download,
  Filter,
  Camera,
  CheckCircle,
  FileUp,
  PackagePlus,
  Wrench,
  UserPlus,
  BarChart3
} from 'lucide-react';
import { GraphicalDashboard } from './GraphicalDashboard';

interface Props {
  onOpenNewTask: (siteId?: string) => void;
  onOpenResourceRequest: (siteId?: string) => void;
  onReportProblem: (siteId?: string) => void;
  onOpenDailyReport: (siteId?: string) => void;
  onOpenAddMaterial: (siteId?: string) => void;
  onOpenAddEquipment: (siteId?: string) => void;
  onOpenAddDocument: (siteId?: string) => void;
  onMarkTaskDelayed: (task: Task) => void;
  onMarkTaskCompleted: (task: Task) => void;
  onOpenCompleteSite?: (siteId: string) => void;
  onOpenChangeStatus?: (siteId: string) => void;
}

export const SiteDetailView: React.FC<Props> = ({
  onOpenNewTask,
  onOpenResourceRequest,
  onReportProblem,
  onOpenDailyReport,
  onOpenAddMaterial,
  onOpenAddEquipment,
  onOpenAddDocument,
  onMarkTaskDelayed,
  onMarkTaskCompleted,
  onOpenCompleteSite,
  onOpenChangeStatus,
}) => {
  const {
    role,
    currentSite,
    isSiteAccessible,
    setSelectedSiteId,
    activeSiteTab,
    setActiveSiteTab,
    tasks,
    materials,
    labour,
    equipment,
    problems,
    reports,
    documents,
    updateMaterialStock,
    updateLabourAttendance,
    updateEquipmentStatus,
    addLabourCategory,
  } = useApp();

  const [taskStatusFilter, setTaskStatusFilter] = useState<string>('All');
  const [docCategoryFilter, setDocCategoryFilter] = useState<string>('All');
  const [newLabourType, setNewLabourType] = useState('Carpenter');
  const [newLabourReq, setNewLabourReq] = useState(10);
  const [showAddLabourForm, setShowAddLabourForm] = useState(false);

  if (!currentSite) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 p-8">
        <Building2 className="h-12 w-12 text-slate-400 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No Site Selected</h2>
        <p className="text-xs text-slate-500 mt-1">Please select a construction site to view details.</p>
        <button
          onClick={() => setSelectedSiteId(role === 'SITE_ENGINEER' ? 'site-1' : null)}
          className="mt-4 px-4 py-2 bg-amber-600 text-white rounded-xl text-xs font-bold"
        >
          {role === 'SITE_ENGINEER' ? 'Return to Station' : 'Return to Dashboard'}
        </button>
      </div>
    );
  }

  // Role Access Guard: Prevent accessing unassigned sites!
  if (!isSiteAccessible(currentSite.id)) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-rose-200 p-8 shadow-xs">
        <AlertOctagon className="h-12 w-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-black text-slate-900">Access Restricted</h2>
        <p className="text-xs sm:text-sm text-slate-600 mt-2 max-w-md mx-auto">
          Your current role account does not have access permissions for <strong>{currentSite.name}</strong>.
        </p>
        <button
          onClick={() => setSelectedSiteId(role === 'SITE_ENGINEER' ? 'site-1' : null)}
          className="mt-4 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition"
        >
          {role === 'SITE_ENGINEER' ? 'Return to Assigned Station' : 'Return to Assigned Sites'}
        </button>
      </div>
    );
  }

  // Filtered Site Collections (Do not mix information between sites!)
  const siteTasks = tasks.filter((t) => t.siteId === currentSite.id);
  const siteMaterials = materials.filter((m) => m.siteId === currentSite.id);
  const siteLabour = labour.filter((l) => l.siteId === currentSite.id);
  const siteEquipment = equipment.filter((eq) => eq.currentSiteId === currentSite.id);
  const siteProblems = problems.filter((p) => p.siteId === currentSite.id);
  const siteReports = reports.filter((r) => r.siteId === currentSite.id);
  const siteDocuments = documents.filter((d) => d.siteId === currentSite.id);

  // Overview calculations
  const completedTasks = siteTasks.filter((t) => t.status === 'Completed');
  const pendingTasks = siteTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress');
  const delayedTasks = siteTasks.filter((t) => t.status === 'Delayed');
  const openProblems = siteProblems.filter((p) => p.status === 'Open');

  // Filtered Tasks
  const filteredTasks = siteTasks.filter((t) => {
    if (taskStatusFilter === 'All') return true;
    if (taskStatusFilter === 'Today') return t.isToday;
    return t.status === taskStatusFilter;
  });

  // Filtered Documents
  const filteredDocs = siteDocuments.filter((d) => {
    if (docCategoryFilter === 'All') return true;
    return d.category === docCategoryFilter;
  });

  const TABS: SiteTab[] = [
    'Overview',
    'Tasks',
    'Materials',
    'Labour',
    'Equipment',
    'Reports',
    'Documents',
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Back Navigation Bar */}
      <div className="flex items-center justify-between">
        {role === 'SITE_ENGINEER' ? (
          <div className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            <span>Station Duty: {currentSite.name}</span>
          </div>
        ) : (
          <button
            onClick={() => setSelectedSiteId(null)}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
            <span>{role === 'BOSS' ? 'Back to Company Dashboard' : 'Back to Assigned Sites'}</span>
          </button>
        )}

        <div className="flex flex-wrap items-center gap-2">
          {/* Status & Lifecycle Controls (Boss and PM only) */}
          {(role === 'BOSS' || role === 'PROJECT_MANAGER') && (
            <>
              {onOpenChangeStatus && (
                <button
                  onClick={() => onOpenChangeStatus(currentSite.id)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 px-3 py-1.5 rounded-xl shadow-2xs transition cursor-pointer"
                  title="Change project operational status (Active / On Hold / Completed)"
                >
                  <span className={`h-2 w-2 rounded-full ${
                    currentSite.status === 'Completed'
                      ? 'bg-emerald-500'
                      : currentSite.status === 'On Hold'
                      ? 'bg-amber-500'
                      : 'bg-blue-500'
                  }`} />
                  <span>Status: {currentSite.status || 'Active'}</span>
                </button>
              )}

              {onOpenCompleteSite && currentSite.status !== 'Completed' && (
                <button
                  onClick={() => onOpenCompleteSite(currentSite.id)}
                  className="inline-flex items-center space-x-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-3 py-1.5 rounded-xl transition cursor-pointer shadow-2xs"
                  title="Formal site handover & archive workflow"
                >
                  <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Complete Site</span>
                </button>
              )}
            </>
          )}

          <button
            onClick={() => onOpenResourceRequest(currentSite.id)}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <Send className="h-3.5 w-3.5" />
            <span>Request Resources</span>
          </button>
          <button
            onClick={() => onReportProblem(currentSite.id)}
            className="inline-flex items-center space-x-1.5 text-xs font-bold text-rose-800 bg-rose-100 hover:bg-rose-200 border border-rose-300 px-3 py-1.5 rounded-xl transition cursor-pointer"
          >
            <AlertOctagon className="h-3.5 w-3.5" />
            <span>Report Problem</span>
          </button>
        </div>
      </div>

      {/* Site Master Header Card */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-md border border-amber-200">
                {currentSite.code}
              </span>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${
                currentSite.status === 'Completed'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : currentSite.status === 'On Hold'
                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                  : 'bg-blue-50 text-blue-800 border border-blue-200'
              }`}>
                {currentSite.status || 'Active'}
              </span>
              <span className="text-xs text-slate-500 font-semibold">Client: {currentSite.client}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentSite.name}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                {currentSite.location}
              </span>
              <span>•</span>
              <span>Project Manager: <strong>{currentSite.projectManager}</strong></span>
              <span>•</span>
              <span>Site Engineer: <strong>{currentSite.siteEngineer}</strong></span>
            </div>

            {/* If site is On Hold or Completed, show prominent info banner */}
            {currentSite.status === 'On Hold' && (
              <div className="mt-2 p-3 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-950 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Project Suspended / On Hold: </span>
                  <span>{currentSite.holdReason || 'Work temporarily paused by management.'}</span>
                </div>
              </div>
            )}

            {currentSite.status === 'Completed' && currentSite.completionDetails && (
              <div className="mt-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-300 text-xs text-emerald-950 flex items-start space-x-2">
                <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Project Formally Handed Over on {currentSite.completionDetails.completionDate}</span>
                  {currentSite.completionDetails.remarks && (
                    <div className="text-emerald-800 mt-0.5 italic">"{currentSite.completionDetails.remarks}"</div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center space-x-6 bg-slate-50 p-4 rounded-2xl border border-slate-200 shrink-0">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Overall Progress</div>
              <div className="text-3xl font-black text-amber-600">{currentSite.progressPercent}%</div>
            </div>
            <div className="w-24">
              <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${currentSite.progressPercent}%` }}
                ></div>
              </div>
              <span className="text-[10px] text-slate-400 block mt-1">Target: {currentSite.targetEndDate}</span>
            </div>
          </div>
        </div>

        {/* SITE NAVIGATION TABS (Strictly: Overview | Tasks | Materials | Labour | Equipment | Reports | Documents) */}
        <div className="mt-6 pt-4 border-t border-slate-200">
          <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-1" aria-label="Site Navigation">
            {TABS.map((tab) => {
              const isActive = activeSiteTab === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSiteTab(tab)}
                  className={`px-3.5 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  {tab === 'Overview' && '📊 Overview'}
                  {tab === 'Tasks' && `📋 Tasks (${siteTasks.length})`}
                  {tab === 'Materials' && `📦 Materials (${siteMaterials.length})`}
                  {tab === 'Labour' && `👷 Labour (${siteLabour.length})`}
                  {tab === 'Equipment' && `🚜 Equipment (${siteEquipment.length})`}
                  {tab === 'Reports' && `📝 Reports (${siteReports.length})`}
                  {tab === 'Documents' && `📁 Documents (${siteDocuments.length})`}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* =================== TAB 1: OVERVIEW =================== */}
      {activeSiteTab === 'Overview' && (
        <div className="space-y-6">
          {/* Section 4 prompt: Progress Bar, Today's Work, Site Problems */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* Progress and Today's Work */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Today's Work Card */}
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-base font-black text-slate-900">Today's Work Summary</h3>
                    <p className="text-xs text-slate-500">Live operational snapshot of today's scheduled activities.</p>
                  </div>
                  <button
                    onClick={() => setActiveSiteTab('Tasks')}
                    className="text-xs font-bold text-amber-600 hover:underline"
                  >
                    View All Tasks →
                  </button>
                </div>

                <div className="space-y-2.5">
                  {/* Completed tasks */}
                  {completedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-emerald-600 font-bold">✅</span>
                        <span className="font-bold text-slate-900">{t.name}</span>
                        <span className="text-slate-500">({t.location})</span>
                      </div>
                      <span className="text-emerald-800 font-semibold">{t.completedDate || 'Completed'}</span>
                    </div>
                  ))}

                  {/* Pending / In progress tasks */}
                  {pendingTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-amber-50/50 border border-amber-200 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-500 font-bold">🟡</span>
                        <span className="font-bold text-slate-900">{t.name}</span>
                        <span className="text-slate-500">({t.location})</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-amber-800 font-semibold">{t.status}</span>
                        <button
                          onClick={() => onMarkTaskCompleted(t)}
                          className="text-[11px] bg-emerald-600 text-white font-bold px-2 py-1 rounded-md"
                        >
                          Mark Done
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Delayed tasks */}
                  {delayedTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3 rounded-xl bg-rose-50 border border-rose-300 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="text-rose-600 font-bold">🔴</span>
                          <span className="font-bold text-slate-900">{t.name}</span>
                          <span className="text-slate-500">({t.location})</span>
                          <span className="text-[10px] font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded">
                            {t.delayReason}
                          </span>
                        </div>
                        {t.delayExplanation && (
                          <div className="text-slate-700 italic mt-1 ml-5">“{t.delayExplanation}”</div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 shrink-0">
                        {t.delayPhoto && (
                          <a
                            href={t.delayPhoto}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[11px] text-rose-700 underline font-semibold flex items-center gap-1"
                          >
                            <Camera className="h-3 w-3" /> Photo
                          </a>
                        )}
                        <button
                          onClick={() => onMarkTaskDelayed(t)}
                          className="text-[11px] bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold px-2 py-1 rounded-md"
                        >
                          Update Reason
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Site Health Vitals */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Labour Count</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">
                    {siteLabour.reduce((acc, curr) => acc + curr.present, 0)} Present
                  </span>
                  <span className="text-[10px] text-slate-500">On duty today</span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Stock Items</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{siteMaterials.length} Types</span>
                  <span className="text-[10px] text-slate-500">
                    {siteMaterials.filter((m) => m.currentStock <= m.minThreshold).length} low stock
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Machinery</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{siteEquipment.length} Units</span>
                  <span className="text-[10px] text-slate-500">
                    {siteEquipment.filter((e) => e.status === 'In Use').length} in active use
                  </span>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Daily Reports</span>
                  <span className="text-xl font-bold text-slate-900 mt-1 block">{siteReports.length} Filed</span>
                  <span className="text-[10px] text-slate-500">QA certified</span>
                </div>
              </div>
            </div>

            {/* Site Problems Column */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-2">
                    <AlertOctagon className="h-5 w-5 text-rose-600" />
                    <h3 className="text-base font-black text-slate-900">Active Site Problems</h3>
                  </div>
                  <button
                    onClick={() => onReportProblem(currentSite.id)}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    + Report
                  </button>
                </div>

                {openProblems.length === 0 ? (
                  <div className="text-center py-8 text-slate-400 text-xs">
                    No active problems or hazards reported on site.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {openProblems.map((p) => (
                      <div
                        key={p.id}
                        className="p-3.5 rounded-2xl bg-rose-50/60 border border-rose-200 space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                            <span className="text-rose-600">⚠️</span>
                            <span>{p.title}</span>
                          </div>
                          <span className="text-[10px] font-bold uppercase bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full">
                            {p.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700">{p.description}</p>
                        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-rose-100">
                          <span>Reported: {p.reportedDate}</span>
                          {(p.photo || p.photoUrl) && (
                            <a
                              href={p.photo || p.photoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-rose-700 font-semibold underline flex items-center gap-1"
                            >
                              <Camera className="h-3 w-3" /> Photo
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Resource Quick Alert */}
              <div className="bg-amber-50/80 rounded-3xl p-5 border border-amber-200 text-xs space-y-2">
                <div className="font-bold text-amber-950 flex items-center space-x-1.5">
                  <Package className="h-4 w-4 text-amber-600" />
                  <span>Site Resource Requirements</span>
                </div>
                <p className="text-slate-700">
                  Site engineers can request cement, specialized labour, or machinery like backhoes.
                </p>
                <button
                  onClick={() => onOpenResourceRequest(currentSite.id)}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                >
                  Create New Resource Request
                </button>
              </div>
            </div>

          </div>

          {/* Site-Specific Visual Graphs (Strictly isolated to this site only) */}
          <div className="pt-4 border-t border-slate-200">
            <div className="flex items-center space-x-2 mb-4">
              <BarChart3 className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-base font-bold text-slate-900 tracking-tight">
                  {currentSite.name} — Visual Metrics
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Actual progress, stock levels, labour attendance, and machinery status for this site.
                </p>
              </div>
            </div>
            <GraphicalDashboard initialSiteId={currentSite.id} allowComparison={false} />
          </div>
        </div>
      )}

      {/* =================== TAB 2: TASKS =================== */}
      {activeSiteTab === 'Tasks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                <Filter className="h-3.5 w-3.5" /> Filter:
              </span>
              {['All', 'Today', 'In Progress', 'Delayed', 'Completed', 'Pending'].map((status) => (
                <button
                  key={status}
                  onClick={() => setTaskStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    taskStatusFilter === status
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>

            <button
              onClick={() => onOpenNewTask(currentSite.id)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Create Task</span>
            </button>
          </div>

          <div className="space-y-3">
            {filteredTasks.length === 0 ? (
              <div className="bg-white rounded-2xl p-10 text-center text-slate-400 text-xs border border-slate-200">
                No tasks match the selected filter.
              </div>
            ) : (
              filteredTasks.map((t) => (
                <div
                  key={t.id}
                  className={`bg-white rounded-2xl p-4 sm:p-5 border transition shadow-2xs ${
                    t.status === 'Delayed'
                      ? 'border-rose-300 bg-rose-50/30'
                      : t.status === 'Completed'
                      ? 'border-emerald-200 bg-emerald-50/20'
                      : 'border-slate-200'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center space-x-2 flex-wrap gap-1">
                        <h3 className="font-bold text-slate-900 text-base">{t.name}</h3>
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${
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
                        {t.isToday && (
                          <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                            Today's Schedule
                          </span>
                        )}
                        {t.delayReason && (
                          <span className="text-xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-md">
                            Reason: {t.delayReason}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600">{t.description}</p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                        <span>📍 Location: <strong>{t.location}</strong></span>
                        <span>•</span>
                        <span>Team: <strong>{t.assignedTeam}</strong></span>
                        <span>•</span>
                        <span>Labour: <strong>{t.labourType}</strong></span>
                        <span>•</span>
                        <span>Expected: <strong>{t.expectedDate}</strong></span>
                      </div>

                      {/* Delayed details section (Section 6 requirement) */}
                      {t.status === 'Delayed' && (
                        <div className="mt-3 p-3.5 rounded-xl bg-white border border-rose-200 text-xs space-y-2">
                          <div className="font-semibold text-slate-900">
                            Delay Reason: <span className="text-rose-700 font-bold">{t.delayReason}</span>
                          </div>
                          <p className="text-slate-700">“{t.delayExplanation}”</p>
                          {t.newExpectedDate && (
                            <div className="text-slate-600">
                              Rescheduled date: <strong className="text-slate-900">{t.newExpectedDate}</strong>
                            </div>
                          )}
                          {t.delayPhoto && (
                            <div className="flex items-center space-x-2 pt-1">
                              <img
                                src={t.delayPhoto}
                                alt="Delay evidence"
                                className="h-16 w-24 object-cover rounded-lg border border-slate-200"
                              />
                              <span className="text-slate-500 text-[11px]">
                                Attached photo evidence for Boss &amp; PM
                              </span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Completed note & photo */}
                      {t.status === 'Completed' && (
                        <div className="mt-2.5 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 space-y-1">
                          <div className="font-semibold">Completed: {t.completedDate}</div>
                          {t.completionNote && <div>“{t.completionNote}”</div>}
                          {t.completionPhoto && (
                            <div className="flex items-center space-x-2 pt-1">
                              <img
                                src={t.completionPhoto}
                                alt="Completion proof"
                                className="h-14 w-20 object-cover rounded-lg border border-emerald-300"
                              />
                              <span className="text-[11px] text-emerald-700">Verified with photo</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Task Actions */}
                    <div className="flex items-center space-x-2 shrink-0 pt-2 md:pt-0">
                      {t.status !== 'Completed' && (
                        <button
                          onClick={() => onMarkTaskCompleted(t)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1"
                        >
                          <CheckCircle className="h-3.5 w-3.5" />
                          <span>Mark Done</span>
                        </button>
                      )}

                      {t.status !== 'Delayed' ? (
                        <button
                          onClick={() => onMarkTaskDelayed(t)}
                          className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs flex items-center space-x-1"
                        >
                          <AlertTriangle className="h-3.5 w-3.5" />
                          <span>Report Delay</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => onMarkTaskDelayed(t)}
                          className="px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition"
                        >
                          Edit Delay
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =================== TAB 3: MATERIALS =================== */}
      {activeSiteTab === 'Materials' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Site Materials Inventory & Stock Tracker</h3>
              <p className="text-xs text-slate-500">Track required quantity, current stock, usage, and low stock warnings.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenResourceRequest(currentSite.id)}
                className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition"
              >
                + Request Material
              </button>
              <button
                onClick={() => onOpenAddMaterial(currentSite.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1"
              >
                <PackagePlus className="h-3.5 w-3.5" />
                <span>Add Material</span>
              </button>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Material Name</th>
                    <th className="px-4 py-3.5">Category</th>
                    <th className="px-4 py-3.5">Required</th>
                    <th className="px-4 py-3.5">Current Stock</th>
                    <th className="px-4 py-3.5">Used</th>
                    <th className="px-4 py-3.5">Remaining</th>
                    <th className="px-4 py-3.5">Supplier</th>
                    <th className="px-4 py-3.5">Unit Price</th>
                    <th className="px-4 py-3.5 text-right">Quick Stock Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {siteMaterials.map((m) => {
                    const isLow = m.currentStock <= m.minThreshold;
                    const remainingNeeded = Math.max(0, m.requiredQty - (m.purchasedQty || m.usedQty + m.currentStock));

                    return (
                      <tr key={m.id} className={isLow ? 'bg-rose-50/40 hover:bg-rose-50/70' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-900 flex items-center space-x-2">
                            <span>{m.name}</span>
                            {isLow && (
                              <span className="text-[10px] font-bold bg-rose-100 text-rose-800 px-2 py-0.5 rounded-full border border-rose-200">
                                🔴 Stock Low
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">Updated: {m.lastUpdated}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.category}</td>
                        <td className="px-4 py-3 font-semibold text-slate-900">
                          {m.requiredQty.toLocaleString()} {m.unit}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`font-bold px-2 py-1 rounded-md text-xs ${
                              isLow ? 'bg-rose-100 text-rose-900 font-black' : 'bg-emerald-50 text-emerald-900'
                            }`}
                          >
                            {m.currentStock.toLocaleString()} {m.unit}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {m.usedQty.toLocaleString()} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {remainingNeeded.toLocaleString()} {m.unit}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{m.supplier}</td>
                        <td className="px-4 py-3 text-slate-600">₹{m.pricePerUnit}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => updateMaterialStock(m.id, m.currentStock + 50)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                              title="Add 50 units"
                            >
                              +50
                            </button>
                            <button
                              onClick={() =>
                                updateMaterialStock(
                                  m.id,
                                  Math.max(0, m.currentStock - 20),
                                  m.usedQty + 20
                                )
                              }
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                              title="Log 20 units used"
                            >
                              Use 20
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================== TAB 4: LABOUR =================== */}
      {activeSiteTab === 'Labour' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Site Labour Force & Daily Attendance</h3>
              <p className="text-xs text-slate-500">Track required vs present labour, absences, and shortages.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenResourceRequest(currentSite.id)}
                className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition"
              >
                + Request Labour
              </button>
              <button
                onClick={() => setShowAddLabourForm(!showAddLabourForm)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1"
              >
                <UserPlus className="h-3.5 w-3.5" />
                <span>Add Labour Category</span>
              </button>
            </div>
          </div>

          {showAddLabourForm && (
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 flex flex-wrap items-center gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Labour Type</label>
                <input
                  type="text"
                  value={newLabourType}
                  onChange={(e) => setNewLabourType(e.target.value)}
                  placeholder="e.g. Tile Layer, Painter"
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase text-slate-600 mb-1">Required Workers</label>
                <input
                  type="number"
                  value={newLabourReq}
                  onChange={(e) => setNewLabourReq(Number(e.target.value))}
                  className="bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 w-24"
                />
              </div>
              <div className="pt-4">
                <button
                  onClick={() => {
                    if (newLabourType.trim()) {
                      addLabourCategory(currentSite.id, newLabourType, newLabourReq, newLabourReq);
                      setShowAddLabourForm(false);
                    }
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-3 py-1.5 rounded-lg"
                >
                  Save Category
                </button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 border-b border-slate-200 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                  <tr>
                    <th className="px-4 py-3.5">Labour Type</th>
                    <th className="px-4 py-3.5">Required</th>
                    <th className="px-4 py-3.5">Present Today</th>
                    <th className="px-4 py-3.5">Absent</th>
                    <th className="px-4 py-3.5">Shortage</th>
                    <th className="px-4 py-3.5">Notes</th>
                    <th className="px-4 py-3.5 text-right">Attendance Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {siteLabour.map((l) => {
                    const shortage = Math.max(0, l.required - l.present);
                    const absent = shortage;

                    return (
                      <tr key={l.id} className={shortage > 0 ? 'bg-amber-50/40 hover:bg-amber-50/70' : 'hover:bg-slate-50'}>
                        <td className="px-4 py-3 font-bold text-slate-900">{l.type}</td>
                        <td className="px-4 py-3 text-slate-900 font-semibold">{l.required}</td>
                        <td className="px-4 py-3">
                          <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            {l.present} Present
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{absent}</td>
                        <td className="px-4 py-3">
                          {shortage > 0 ? (
                            <span className="font-bold text-rose-700 bg-rose-100 px-2 py-0.5 rounded">
                              ⚠️ Shortage: {shortage}
                            </span>
                          ) : (
                            <span className="text-emerald-700 font-medium">Full Strength</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500 italic">{l.notes || '—'}</td>
                        <td className="px-4 py-3 text-right">
                          <div className="inline-flex items-center space-x-1">
                            <button
                              onClick={() => updateLabourAttendance(l.id, l.present + 1)}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                              title="Add 1 present"
                            >
                              +1
                            </button>
                            <button
                              onClick={() => updateLabourAttendance(l.id, Math.max(0, l.present - 1))}
                              className="px-2 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px]"
                              title="Minus 1 present"
                            >
                              -1
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =================== TAB 5: EQUIPMENT =================== */}
      {activeSiteTab === 'Equipment' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Heavy Machinery & Site Equipment Tracker</h3>
              <p className="text-xs text-slate-500">Track machines on site, active operators, breakdowns, and service schedules.</p>
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => onOpenResourceRequest(currentSite.id)}
                className="px-3 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 text-amber-900 text-xs font-bold transition"
              >
                + Request Equipment
              </button>
              <button
                onClick={() => onOpenAddEquipment(currentSite.id)}
                className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1"
              >
                <Wrench className="h-3.5 w-3.5" />
                <span>Register Machine</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {siteEquipment.length === 0 ? (
              <div className="col-span-2 bg-white rounded-3xl p-10 text-center text-slate-400 text-xs border border-slate-200">
                No heavy machinery currently assigned to {currentSite.name}. Request one using the button above.
              </div>
            ) : (
              siteEquipment.map((eq) => (
                <div
                  key={eq.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                        {eq.type}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base mt-1">{eq.name}</h4>
                      <p className="text-xs text-slate-500">Operator: <strong>{eq.assignedOperator}</strong></p>
                    </div>

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
                      {eq.status === 'Available' && '🟢 Available'}
                      {eq.status === 'In Use' && '🔵 In Use'}
                      {eq.status === 'Maintenance' && '🟡 Maintenance'}
                      {eq.status === 'Breakdown' && '🔴 Breakdown'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-slate-400 text-[10px] block">Last Service</span>
                      <span className="text-slate-800 font-medium">{eq.lastMaintenance}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block">Next Due</span>
                      <span className="text-slate-800 font-medium">{eq.nextMaintenance}</span>
                    </div>
                  </div>

                  {eq.notes && (
                    <p className="text-xs text-slate-600 italic bg-slate-50/50 p-2 rounded-lg">
                      “{eq.notes}”
                    </p>
                  )}

                  {/* Status Toggle Actions */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-400 text-[11px]">Change Status:</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => updateEquipmentStatus(eq.id, 'Available')}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800"
                      >
                        Available
                      </button>
                      <button
                        onClick={() => updateEquipmentStatus(eq.id, 'In Use')}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-sky-50 hover:bg-sky-100 text-sky-800"
                      >
                        In Use
                      </button>
                      <button
                        onClick={() => updateEquipmentStatus(eq.id, 'Breakdown')}
                        className="px-2 py-1 rounded text-[10px] font-bold bg-rose-50 hover:bg-rose-100 text-rose-800"
                      >
                        Breakdown
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* =================== TAB 6: REPORTS =================== */}
      {activeSiteTab === 'Reports' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Site Daily Progress Reports (DPR)</h3>
              <p className="text-xs text-slate-500">Official daily records filed by site engineers.</p>
            </div>
            <button
              onClick={() => onOpenDailyReport(currentSite.id)}
              className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition flex items-center space-x-1 shadow-xs"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Create Daily Report</span>
            </button>
          </div>

          <div className="space-y-4">
            {siteReports.map((r) => (
              <div
                key={r.id}
                className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
                  <div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-amber-600" />
                      <span className="font-black text-slate-900 text-base">{r.date}</span>
                      <span className="text-xs text-slate-400">({currentSite.name})</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Submitted by Site Engineer: <strong>{r.engineerName}</strong>
                    </div>
                  </div>
                  <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full w-fit">
                    Verified Daily Record
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                  <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-200 space-y-1">
                    <div className="font-bold text-emerald-950 flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Tasks Completed:
                    </div>
                    <ul className="list-disc pl-4 space-y-0.5 text-emerald-900">
                      {(r.completedTasks ?? []).map((t, i) => (
                        <li key={i}>{t}</li>
                      ))}
                    </ul>
                  </div>

                    <div className="bg-rose-50/70 p-3 rounded-2xl border border-rose-200 space-y-1">
                      <div className="font-bold text-rose-950 flex items-center gap-1">
                        <AlertTriangle className="h-3.5 w-3.5 text-rose-600" /> Delayed / Bottlenecks:
                      </div>
                      {(r.delayedTasks ?? []).length > 0 ? (
                        <ul className="list-disc pl-4 space-y-0.5 text-rose-900">
                          {(r.delayedTasks ?? []).map((t, i) => (
                            <li key={i}>{t}</li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-slate-500 italic">No delayed tasks reported.</span>
                      )}
                    </div>

                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-1">
                      <div className="font-bold text-slate-900">Resources & Labour:</div>
                      <div className="text-slate-700">
                        Labour Present: <strong>{r.labourPresentCount} workers</strong>
                      </div>
                      <div className="text-slate-700">
                        Equipment: {(r.equipmentUsed ?? []).join(', ') || 'General tools'}
                      </div>
                    </div>
                  </div>

                  {/* Engineer Remarks */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 border border-amber-200 text-xs">
                    <span className="font-bold text-amber-950 block mb-1">Engineer Remarks & Next Plan:</span>
                    <p className="text-slate-800 italic">“{r.remarks}”</p>
                  </div>

                  {/* Photos */}
                  {(r.photos ?? []).length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Attached Daily Photo Logs
                      </span>
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {(r.photos ?? []).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt="Report photo"
                            className="h-20 w-28 object-cover rounded-xl border border-slate-200"
                          />
                        ))}
                      </div>
                    </div>
                  )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================== TAB 7: DOCUMENTS =================== */}
      {activeSiteTab === 'Documents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
            <div className="flex items-center space-x-2 flex-wrap gap-2">
              <span className="text-xs font-bold text-slate-500">Category:</span>
              {['All', 'Drawings', 'Bills', 'Material documents', 'Contracts', 'Safety documents'].map(
                (cat) => (
                  <button
                    key={cat}
                    onClick={() => setDocCategoryFilter(cat)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      docCategoryFilter === cat
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                )
              )}
            </div>

            <button
              onClick={() => onOpenAddDocument(currentSite.id)}
              className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition"
            >
              <FileUp className="h-4 w-4" />
              <span>Upload Document</span>
            </button>
          </div>

          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs divide-y divide-slate-100">
            {filteredDocs.length === 0 ? (
              <div className="p-10 text-center text-slate-400 text-xs">
                No documents found in this category.
              </div>
            ) : (
              filteredDocs.map((doc) => (
                <div
                  key={doc.id}
                  className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start space-x-3">
                    <div className="p-2.5 rounded-xl bg-slate-100 text-slate-700 mt-0.5">
                      <FileText className="h-5 w-5 text-amber-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{doc.title}</h4>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className="bg-slate-100 px-2 py-0.5 rounded font-semibold text-[10px]">
                          {doc.category}
                        </span>
                        <span>•</span>
                        <span>Size: {doc.fileSize}</span>
                        <span>•</span>
                        <span>Format: {doc.fileType}</span>
                        <span>•</span>
                        <span>Uploaded by: {doc.uploadedBy} on {doc.uploadedDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      onClick={() => alert(`Simulated preview for document: "${doc.title}"`)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-xl transition"
                    >
                      View
                    </button>
                    <button
                      onClick={() => alert(`Downloading "${doc.title}" (${doc.fileSize})`)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition flex items-center space-x-1"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span>Download</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

    </div>
  );
};
