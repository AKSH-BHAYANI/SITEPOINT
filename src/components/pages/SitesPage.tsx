import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  Building2,
  Plus,
  Search,
  Filter,
  MapPin,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  Briefcase,
  HardHat,
  Users
} from 'lucide-react';

interface SitesPageProps {
  onOpenNewSite?: () => void;
  onOpenCompleteSite?: (siteId: string) => void;
  onOpenChangeStatus?: (siteId: string) => void;
}

export const SitesPage: React.FC<SitesPageProps> = ({
  onOpenNewSite,
  onOpenCompleteSite,
  onOpenChangeStatus,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    setSelectedSiteId,
    tasks,
    problems,
    labour,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Active' | 'On Hold' | 'Completed'>('All');
  const [search, setSearch] = useState('');

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;

  const filteredSites = relevantSites.filter((site) => {
    const matchesStatus = statusFilter === 'All' ? true : site.status === statusFilter;
    const matchesSearch =
      site.name.toLowerCase().includes(search.toLowerCase()) ||
      site.code.toLowerCase().includes(search.toLowerCase()) ||
      site.location.toLowerCase().includes(search.toLowerCase()) ||
      site.client.toLowerCase().includes(search.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Construction Sites
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Manage projects, monitor progress milestones, and track site operations.
          </p>
        </div>

        {role === 'BOSS' && onOpenNewSite && (
          <button
            onClick={onOpenNewSite}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Add Site</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        {/* Status segmented controls */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {(['All', 'Active', 'On Hold', 'Completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status}
              <span className="ml-1.5 opacity-70 tabular-nums">
                ({status === 'All'
                  ? relevantSites.length
                  : relevantSites.filter((s) => s.status === status).length})
              </span>
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative min-w-[240px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search by name, code, or client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Sites Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredSites.map((site) => {
          const siteTasks = tasks.filter((t) => t.siteId === site.id);
          const delayed = siteTasks.filter((t) => t.status === 'Delayed').length;
          const openProblems = problems.filter(
            (p) => p.siteId === site.id && p.status === 'Open'
          ).length;
          const siteLabour = labour.filter((l) => l.siteId === site.id);
          const totalPresent = siteLabour.reduce((acc, curr) => acc + curr.present, 0);

          return (
            <div
              key={site.id}
              className="bg-white border border-slate-200 rounded-lg p-4 flex flex-col justify-between hover:border-slate-300 hover:shadow-xs transition"
            >
              <div>
                {/* Header row: Code, Status, Client */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                    {site.code}
                  </span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      site.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : site.status === 'On Hold'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}
                  >
                    {site.status}
                  </span>
                </div>

                {/* Site Title */}
                <h3
                  onClick={() => setSelectedSiteId(site.id)}
                  className="font-bold text-slate-900 text-base mt-2 hover:text-amber-600 transition cursor-pointer truncate"
                >
                  {site.name}
                </h3>

                {/* Location & Client */}
                <div className="flex items-center space-x-1.5 text-xs text-slate-500 mt-1">
                  <MapPin className="h-3 w-3 text-slate-400 shrink-0" />
                  <span className="truncate">{site.location}</span>
                </div>

                <div className="text-xs text-slate-500 mt-0.5 truncate">
                  Client: <strong className="text-slate-700 font-medium">{site.client}</strong>
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Milestone Progress</span>
                    <span className="font-bold text-slate-900 tabular-nums">
                      {site.progressPercent}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all"
                      style={{ width: `${site.progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* Operational metrics */}
                <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-slate-100 text-center text-xs">
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Tasks</div>
                    <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                      {siteTasks.length}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Workforce</div>
                    <div className="font-bold text-slate-900 mt-0.5 tabular-nums">
                      {totalPresent}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-400 text-[10px] uppercase">Issues</div>
                    <div
                      className={`font-bold mt-0.5 tabular-nums ${
                        openProblems > 0 ? 'text-rose-600' : 'text-slate-900'
                      }`}
                    >
                      {openProblems}
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => setSelectedSiteId(site.id)}
                  className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-600 hover:text-amber-700 cursor-pointer"
                >
                  <span>Open Site Details</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>

                {(role === 'BOSS' || role === 'PROJECT_MANAGER') && onOpenChangeStatus && (
                  <button
                    onClick={() => onOpenChangeStatus(site.id)}
                    className="text-[11px] text-slate-500 hover:text-slate-800 font-medium cursor-pointer"
                  >
                    Change Status
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {filteredSites.length === 0 && (
          <div className="col-span-full bg-white border border-slate-200 rounded-lg p-12 text-center">
            <Building2 className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <h3 className="text-sm font-bold text-slate-900">No sites found</h3>
            <p className="text-xs text-slate-500 mt-1">
              Try adjusting your search criteria or status filter.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
