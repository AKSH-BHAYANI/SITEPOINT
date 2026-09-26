import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  FileText,
  Plus,
  Search,
  Calendar,
  CloudSun,
  Users,
  Building2,
  ChevronRight
} from 'lucide-react';

interface ReportsPageProps {
  onOpenDailyReport: (siteId?: string) => void;
}

export const ReportsPage: React.FC<ReportsPageProps> = ({
  onOpenDailyReport,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    reports,
    setSelectedSiteId,
  } = useApp();

  const [siteFilter, setSiteFilter] = useState('all');
  const [search, setSearch] = useState('');

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  const filteredReports = reports.filter((r) => {
    if (!relevantSiteIds.includes(r.siteId)) return false;
    if (siteFilter !== 'all' && r.siteId !== siteFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === r.siteId);
      const matchesWork = r.workCompleted.toLowerCase().includes(q);
      const matchesNotes = r.notes ? r.notes.toLowerCase().includes(q) : false;
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesWork && !matchesNotes && !matchesSite) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Daily Engineering Reports
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Jobsite progress logs, weather records, work verified, and end-of-day field summaries.
          </p>
        </div>

        <button
          onClick={() => onOpenDailyReport()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Add Daily Report</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex items-center space-x-2">
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter reports by site"
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
            placeholder="Search report details or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="space-y-3">
        {filteredReports.map((report) => {
          const site = sites.find((s) => s.id === report.siteId);

          return (
            <div
              key={report.id}
              className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition shadow-2xs space-y-3"
            >
              {/* Header: Date, Site, Weather */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-slate-400" />
                  <span className="font-bold text-slate-900 text-sm tabular-nums">
                    {report.date}
                  </span>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => setSelectedSiteId(report.siteId)}
                    className="font-semibold text-slate-700 hover:text-amber-600 transition cursor-pointer text-xs"
                  >
                    {site?.name || 'Site'}
                  </button>
                </div>

                <div className="flex items-center space-x-3 text-xs text-slate-500">
                  {report.weather && (
                    <span className="flex items-center space-x-1">
                      <CloudSun className="h-3.5 w-3.5 text-amber-500" />
                      <span>{report.weather}</span>
                    </span>
                  )}
                  {report.labourPresent !== undefined && (
                    <span className="flex items-center space-x-1">
                      <Users className="h-3.5 w-3.5 text-blue-500" />
                      <span className="tabular-nums">{report.labourPresent} workers on site</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Work Completed */}
              <div>
                <div className="text-[11px] uppercase font-bold text-slate-400 tracking-wider">
                  Work Completed
                </div>
                <p className="text-xs text-slate-800 font-medium mt-1 leading-relaxed whitespace-pre-line">
                  {report.workCompleted}
                </p>
              </div>

              {/* Delays / Issues if any */}
              {report.delays && (
                <div className="bg-rose-50/70 border border-rose-100 rounded-md p-2.5 text-xs text-rose-800">
                  <span className="font-bold">Delays / Bottlenecks:</span> {report.delays}
                </div>
              )}

              {/* General Notes */}
              {report.notes && (
                <div className="text-xs text-slate-500 italic">
                  Notes: {report.notes}
                </div>
              )}
            </div>
          );
        })}

        {filteredReports.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <FileText className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="font-bold text-slate-800">No daily reports logged</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Click &quot;Add Daily Report&quot; to file today&apos;s site progress log.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
