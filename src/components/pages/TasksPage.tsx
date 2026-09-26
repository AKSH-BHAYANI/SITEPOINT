import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Task, TaskStatus } from '../../types';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  ChevronRight
} from 'lucide-react';

interface TasksPageProps {
  onOpenNewTask: (siteId?: string) => void;
  onMarkTaskCompleted: (task: Task) => void;
  onMarkTaskDelayed: (task: Task) => void;
}

export const TasksPage: React.FC<TasksPageProps> = ({
  onOpenNewTask,
  onMarkTaskCompleted,
  onMarkTaskDelayed,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    tasks,
    updateTaskStatus,
    setSelectedSiteId,
  } = useApp();

  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [search, setSearch] = useState('');

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  // Filter tasks
  const filteredTasks = tasks.filter((t) => {
    if (!relevantSiteIds.includes(t.siteId)) return false;
    if (selectedSiteFilter !== 'all' && t.siteId !== selectedSiteFilter) return false;

    if (statusFilter === 'Today') {
      if (!t.isToday) return false;
    } else if (statusFilter !== 'All') {
      if (t.status !== statusFilter) return false;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === t.siteId);
      const matchesTitle = t.title.toLowerCase().includes(q);
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesTitle && !matchesSite) return false;
    }

    return true;
  });

  const getStatusBadge = (status: TaskStatus) => {
    switch (status) {
      case 'Completed':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Delayed':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'In Progress':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Field Tasks
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track daily work execution, milestone progress, and schedule delays.
          </p>
        </div>

        <button
          onClick={() => onOpenNewTask()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Task</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Site Filter */}
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter tasks by site"
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
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
          {(['All', 'Today', 'In Progress', 'Pending', 'Delayed', 'Completed'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white shadow-2xs font-semibold'
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
            placeholder="Search task title or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* High-density Tasks Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Task &amp; Description</th>
                <th className="py-2.5 px-3">Site</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Expected Date</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.map((task) => {
                const site = sites.find((s) => s.id === task.siteId);

                return (
                  <tr key={task.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-start space-x-2">
                        {task.isToday && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-bold px-1.5 py-0.2 rounded shrink-0 mt-0.5">
                            Today
                          </span>
                        )}
                        <div>
                          <div className="font-semibold text-slate-900">{task.title}</div>
                          {task.description && (
                            <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                              {task.description}
                            </div>
                          )}
                          {task.status === 'Delayed' && task.delayReason && (
                            <div className="text-[11px] text-rose-600 font-medium mt-0.5 flex items-center space-x-1">
                              <AlertTriangle className="h-3 w-3 shrink-0" />
                              <span>Delay: {task.delayReason}</span>
                              {task.delayExplanation && (
                                <span className="text-slate-500">· {task.delayExplanation}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedSiteId(task.siteId);
                        }}
                        className="font-medium text-slate-700 hover:text-amber-600 transition cursor-pointer"
                      >
                        {site?.name || 'Site'}
                      </button>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] border ${getStatusBadge(
                          task.status
                        )}`}
                      >
                        {task.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-500 tabular-nums">
                      {task.expectedDate || '—'}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-right space-x-1.5">
                      {task.status !== 'Completed' && (
                        <>
                          <button
                            onClick={() => onMarkTaskCompleted(task)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] transition cursor-pointer"
                          >
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>Complete</span>
                          </button>

                          <button
                            onClick={() => onMarkTaskDelayed(task)}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 font-medium text-[11px] transition cursor-pointer"
                          >
                            <Clock className="h-3 w-3 text-slate-500" />
                            <span>Delay</span>
                          </button>
                        </>
                      )}

                      {task.status === 'Completed' && (
                        <span className="text-[11px] text-emerald-700 font-medium">
                          ✓ Completed
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredTasks.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    <CheckSquare className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No tasks match your criteria</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Try selecting another status tab or clear your search query.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
