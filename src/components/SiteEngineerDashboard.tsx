import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Task } from '../types';
import {
  HardHat,
  CheckCircle,
  AlertTriangle,
  PlusCircle,
  FileText,
  Send,
  AlertOctagon,
  Clock,
  Camera,
  MapPin,
  Package,
  Users,
  Truck,
  ChevronRight
} from 'lucide-react';

interface Props {
  onOpenNewTask: (siteId?: string) => void;
  onOpenResourceRequest: (siteId?: string) => void;
  onReportProblem: (siteId?: string) => void;
  onOpenDailyReport: (siteId?: string) => void;
  onMarkTaskDelayed: (task: Task) => void;
  onMarkTaskCompleted: (task: Task) => void;
}

export const SiteEngineerDashboard: React.FC<Props> = ({
  onOpenNewTask,
  onOpenResourceRequest,
  onReportProblem,
  onOpenDailyReport,
  onMarkTaskDelayed,
  onMarkTaskCompleted,
}) => {
  const {
    sites,
    accessibleSites,
    selectedSiteId,
    setSelectedSiteId,
    setActiveSiteTab,
    tasks,
    materials,
    labour,
    equipment,
    problems,
  } = useApp();

  // Assigned site (strictly isolated to accessibleSites[0])
  const site = accessibleSites[0];

  if (!site) {
    return (
      <div className="space-y-6 pb-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-200">
            <HardHat className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">No site assigned yet</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            Please contact your company administrator to have a construction site assigned to your account.
          </p>
        </div>
      </div>
    );
  }

  const siteTasks = tasks.filter((t) => t.siteId === site.id);
  const todaysTasks = siteTasks.filter((t) => t.isToday || t.status === 'In Progress' || t.status === 'Delayed');
  const completedToday = todaysTasks.filter((t) => t.status === 'Completed');
  const delayedToday = todaysTasks.filter((t) => t.status === 'Delayed');
  const pendingToday = todaysTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress');

  const siteMaterials = materials.filter((m) => m.siteId === site.id);
  const lowMaterials = siteMaterials.filter((m) => m.currentStock <= m.minThreshold);

  const siteLabour = labour.filter((l) => l.siteId === site.id);
  const totalLabour = siteLabour.reduce((acc, curr) => acc + curr.present, 0);

  const siteProblems = problems.filter((p) => p.siteId === site.id && p.status === 'Open');

  return (
    <div className="space-y-6 pb-12">
      {/* Site Header Banner */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Active Site Duty
              </span>
              <span className="text-xs text-slate-500 font-semibold">{site.code}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {site.name}
            </h1>
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-medium">
              <MapPin className="h-3.5 w-3.5 text-slate-400" />
              <span>{site.location}</span>
              <span>•</span>
              <span>Client: {site.client}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4 bg-slate-50 p-3.5 rounded-2xl border border-slate-200 sm:min-w-[200px] justify-between">
            <div>
              <div className="text-[10px] uppercase font-bold text-slate-400">Site Progress</div>
              <div className="text-2xl font-black text-emerald-600">{site.progressPercent}%</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Engineer</div>
              <div className="text-xs font-bold text-slate-800">{site.siteEngineer}</div>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-100 rounded-full h-2.5 mt-4 overflow-hidden">
          <div
            className="bg-emerald-500 h-full rounded-full transition-all"
            style={{ width: `${site.progressPercent}%` }}
          ></div>
        </div>

        {/* Assigned Station Badge (Strict isolation to assigned post) */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="font-medium flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Assigned Field Station: <strong className="text-slate-800">{site.name}</strong>
          </span>
          <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-semibold">
            Single Site Station
          </span>
        </div>
      </div>

      {/* Quick Action Dock (Large, touch-friendly buttons for Site Engineers) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <button
          onClick={() => onOpenNewTask(site.id)}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-amber-500 hover:shadow-md transition text-left group cursor-pointer"
        >
          <div className="h-9 w-9 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 group-hover:scale-105 transition mb-2">
            <PlusCircle className="h-5 w-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Add Task</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Plan new work</div>
        </button>

        <button
          onClick={() => onReportProblem(site.id)}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-rose-500 hover:shadow-md transition text-left group cursor-pointer"
        >
          <div className="h-9 w-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 group-hover:scale-105 transition mb-2">
            <AlertOctagon className="h-5 w-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Report Problem</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Rain, breakdown, etc.</div>
        </button>

        <button
          onClick={() => onOpenResourceRequest(site.id)}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-sky-500 hover:shadow-md transition text-left group cursor-pointer"
        >
          <div className="h-9 w-9 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 group-hover:scale-105 transition mb-2">
            <Send className="h-5 w-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Request Resources</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Cement, labour, JCB</div>
        </button>

        <button
          onClick={() => onOpenDailyReport(site.id)}
          className="p-3.5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500 hover:shadow-md transition text-left group cursor-pointer"
        >
          <div className="h-9 w-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 group-hover:scale-105 transition mb-2">
            <FileText className="h-5 w-5" />
          </div>
          <div className="font-bold text-slate-900 text-sm">Daily Report</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Compile daily log</div>
        </button>
      </div>

      {/* TODAY'S WORK - Core Engineer Workflow */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-base font-black text-slate-900 tracking-tight">Today's Work Execution</span>
              <span className="text-xs font-bold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-full">
                {todaysTasks.length} Tasks
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Update task status in real time so Project Manager and Boss are immediately notified.
            </p>
          </div>

          <div className="flex items-center space-x-3 text-xs font-semibold">
            <span className="text-emerald-600">✅ {completedToday.length} Done</span>
            <span className="text-rose-600">❌ {delayedToday.length} Delayed</span>
            <span className="text-slate-600">⚪ {pendingToday.length} Pending</span>
          </div>
        </div>

        {todaysTasks.length === 0 ? (
          <div className="text-center py-10 text-slate-400 text-sm">
            No active tasks scheduled for today. Click "Add Task" to create one.
          </div>
        ) : (
          <div className="space-y-3">
            {todaysTasks.map((task) => (
              <div
                key={task.id}
                className={`p-4 rounded-2xl border transition ${
                  task.status === 'Completed'
                    ? 'bg-emerald-50/50 border-emerald-200'
                    : task.status === 'Delayed'
                    ? 'bg-rose-50/60 border-rose-300'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <h3 className="font-bold text-slate-900 text-base">{task.name}</h3>
                      
                      {/* Status Tag */}
                      <span
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                          task.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : task.status === 'Delayed'
                            ? 'bg-rose-100 text-rose-800'
                            : task.status === 'In Progress'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {task.status === 'Completed' && '✅ Completed'}
                        {task.status === 'Delayed' && '❌ Delayed'}
                        {task.status === 'In Progress' && '🟡 In Progress'}
                        {task.status === 'Pending' && '⚪ Pending'}
                      </span>

                      {task.delayReason && (
                        <span className="text-xs font-bold bg-rose-200 text-rose-900 px-2 py-0.5 rounded-md">
                          Reason: {task.delayReason}
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-600 font-medium">{task.description}</p>

                    <div className="flex items-center space-x-4 text-xs text-slate-500 pt-1">
                      <span>📍 <strong>{task.location}</strong></span>
                      <span>👷 Team: {task.assignedTeam}</span>
                      <span>Category: {task.labourType}</span>
                    </div>

                    {/* Delayed explanation & evidence preview */}
                    {task.status === 'Delayed' && (
                      <div className="mt-2.5 p-3 rounded-xl bg-white border border-rose-200 text-xs space-y-1.5">
                        <div className="text-slate-800 font-semibold">
                          “{task.delayExplanation}”
                        </div>
                        {task.newExpectedDate && (
                          <div className="text-slate-600">
                            Rescheduled completion: <strong className="text-slate-900">{task.newExpectedDate}</strong>
                          </div>
                        )}
                        {task.delayPhoto && (
                          <div className="flex items-center space-x-2 pt-1">
                            <img
                              src={task.delayPhoto}
                              alt="Delay proof"
                              className="h-14 w-20 object-cover rounded-lg border border-slate-200"
                            />
                            <span className="text-[11px] text-slate-500 font-medium">Attached photo evidence</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Completed note & photo preview */}
                    {task.status === 'Completed' && (
                      <div className="mt-2 p-2.5 rounded-xl bg-white border border-emerald-200 text-xs text-emerald-900">
                        <div>{task.completionNote}</div>
                        {task.completionPhoto && (
                          <div className="flex items-center space-x-2 mt-2">
                            <img
                              src={task.completionPhoto}
                              alt="Completed proof"
                              className="h-12 w-16 object-cover rounded-lg border border-emerald-300"
                            />
                            <span className="text-[11px] text-emerald-700">Verified with photo</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions on Task (Direct, Large, Clickable buttons) */}
                  <div className="flex items-center space-x-2 shrink-0 pt-2 sm:pt-0">
                    {task.status !== 'Completed' && (
                      <button
                        onClick={() => onMarkTaskCompleted(task)}
                        className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1"
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Mark Completed</span>
                      </button>
                    )}

                    {task.status !== 'Delayed' && (
                      <button
                        onClick={() => onMarkTaskDelayed(task)}
                        className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition shadow-xs cursor-pointer flex items-center space-x-1"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        <span>Report Delay</span>
                      </button>
                    )}

                    {task.status === 'Delayed' && (
                      <button
                        onClick={() => onMarkTaskDelayed(task)}
                        className="px-3 py-2 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 text-xs font-bold transition"
                      >
                        Edit Reason
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bottom Row: Site Inventory & Active Problems */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Site Problems */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <AlertOctagon className="h-4 w-4 text-rose-600" />
              <h3 className="font-bold text-slate-900 text-sm">Active Site Problems</h3>
            </div>
            <button
              onClick={() => onReportProblem(site.id)}
              className="text-xs font-bold text-rose-600 hover:underline"
            >
              + Report New
            </button>
          </div>

          {siteProblems.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-xs">No unresolved problems logged.</div>
          ) : (
            <div className="space-y-2.5">
              {siteProblems.map((prob) => (
                <div key={prob.id} className="p-3 rounded-xl bg-rose-50/50 border border-rose-200 text-xs">
                  <div className="flex items-center justify-between font-bold text-rose-950">
                    <span>{prob.title}</span>
                    <span className="text-[10px] bg-rose-200 text-rose-900 px-2 py-0.5 rounded-full uppercase">
                      {prob.severity}
                    </span>
                  </div>
                  <p className="text-slate-700 mt-1">{prob.description}</p>
                  <div className="text-[11px] text-slate-500 mt-1">Reported: {prob.reportedDate}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Site Inventory & Machinery Quick Peek */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-amber-600" />
              <h3 className="font-bold text-slate-900 text-sm">Site Resources & Inventory</h3>
            </div>
            <button
              onClick={() => {
                setSelectedSiteId(site.id);
                setActiveSiteTab('Materials');
              }}
              className="text-xs font-bold text-amber-600 hover:underline flex items-center space-x-1"
            >
              <span>Full Materials Table</span>
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="space-y-2 text-xs">
            {siteMaterials.slice(0, 4).map((m) => {
              const isLow = m.currentStock <= m.minThreshold;
              return (
                <div
                  key={m.id}
                  className={`flex items-center justify-between p-2.5 rounded-xl border ${
                    isLow ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="font-medium text-slate-900 flex items-center gap-1.5">
                    {isLow && <span className="text-rose-600">🔴</span>}
                    <span>{m.name}</span>
                  </div>
                  <div className="text-right">
                    <span className={`font-bold ${isLow ? 'text-rose-700' : 'text-slate-900'}`}>
                      {m.currentStock} {m.unit}
                    </span>
                    <span className="text-slate-400 text-[10px] ml-1">in stock</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
};
