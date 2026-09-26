import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { SiteProblem } from '../../types';
import {
  AlertTriangle,
  Plus,
  Search,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Building2,
  XCircle,
  ExternalLink
} from 'lucide-react';

interface ProblemsPageProps {
  onOpenReportProblem: (siteId?: string) => void;
}

export const ProblemsPage: React.FC<ProblemsPageProps> = ({
  onOpenReportProblem,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    problems,
    resolveProblem,
    setSelectedSiteId,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Open' | 'Resolved'>('Open');
  const [severityFilter, setSeverityFilter] = useState<'All' | 'High' | 'Medium' | 'Low'>('All');
  const [siteFilter, setSiteFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Resolve modal state
  const [resolvingProblem, setResolvingProblem] = useState<SiteProblem | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isResolving, setIsResolving] = useState(false);

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  const filteredProblems = problems.filter((p) => {
    if (!relevantSiteIds.includes(p.siteId)) return false;
    if (siteFilter !== 'all' && p.siteId !== siteFilter) return false;
    if (statusFilter !== 'All' && p.status !== statusFilter) return false;
    if (severityFilter !== 'All' && p.severity !== severityFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === p.siteId);
      const matchesTitle = p.title ? p.title.toLowerCase().includes(q) : false;
      const matchesDesc = p.description.toLowerCase().includes(q);
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesTitle && !matchesDesc && !matchesSite) return false;
    }

    return true;
  });

  const openCount = problems.filter(
    (p) => relevantSiteIds.includes(p.siteId) && p.status === 'Open'
  ).length;

  const handleResolveSubmit = async () => {
    if (!resolvingProblem) return;
    try {
      setIsResolving(true);
      await resolveProblem(resolvingProblem.id, resolutionNotes);
      setResolvingProblem(null);
      setResolutionNotes('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Site Issues &amp; Hazards
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Log safety hazards, weather delays, and structural blockers requiring immediate mitigation.
          </p>
        </div>

        <button
          onClick={() => onOpenReportProblem()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Report Problem</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Site Filter */}
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter problems by site"
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

          {/* Status Tabs */}
          {(['All', 'Open', 'Resolved'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                statusFilter === status
                  ? 'bg-slate-900 text-white font-semibold shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {status}
              {status === 'Open' && openCount > 0 && (
                <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded bg-rose-500 text-white font-bold tabular-nums">
                  {openCount}
                </span>
              )}
            </button>
          ))}

          {/* Severity filter */}
          <select
            aria-label="Filter problems by severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as any)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2 py-1 font-medium text-slate-700 focus:outline-hidden cursor-pointer ml-1"
          >
            <option value="All">All Severities</option>
            <option value="High">High Severity</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search problem description or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Problems List */}
      <div className="space-y-3">
        {filteredProblems.map((prob) => {
          const site = sites.find((s) => s.id === prob.siteId);
          const isOpen = prob.status === 'Open';

          return (
            <div
              key={prob.id}
              className={`bg-white border rounded-lg p-4 transition shadow-2xs space-y-3 ${
                isOpen ? 'border-rose-200 hover:border-rose-300' : 'border-slate-200'
              }`}
            >
              {/* Header row: Severity, Site, Status, Date */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`font-semibold text-[11px] px-2 py-0.5 rounded border ${
                      prob.severity === 'High'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : prob.severity === 'Medium'
                        ? 'bg-amber-50 text-amber-800 border-amber-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {prob.severity} Severity
                  </span>

                  <button
                    onClick={() => setSelectedSiteId(prob.siteId)}
                    className="font-semibold text-slate-900 hover:text-amber-600 transition cursor-pointer text-xs"
                  >
                    {site?.name || 'Site'}
                  </button>

                  <span className="text-slate-300">·</span>

                  <span className="text-slate-400 text-xs tabular-nums">
                    {prob.reportedDate}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  {isOpen ? (
                    <span className="text-[11px] font-bold text-rose-600 flex items-center space-x-1">
                      <AlertOctagon className="h-3.5 w-3.5" />
                      <span>Action Required</span>
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold text-emerald-700 flex items-center space-x-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Resolved</span>
                    </span>
                  )}

                  {isOpen && (
                    <button
                      onClick={() => setResolvingProblem(prob)}
                      className="px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-md transition cursor-pointer"
                    >
                      Resolve Issue
                    </button>
                  )}
                </div>
              </div>

              {/* Title & Description */}
              <div>
                {prob.title && (
                  <h3 className="font-bold text-slate-900 text-sm">{prob.title}</h3>
                )}
                <p className="text-xs text-slate-700 font-medium mt-1 leading-relaxed">
                  {prob.description}
                </p>
              </div>

              {/* Attached photo if present */}
              {prob.photoUrl && (
                <div className="mt-2">
                  <a
                    href={prob.photoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1 text-xs text-amber-700 hover:underline"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>View Attached Inspection Photo</span>
                  </a>
                </div>
              )}

              {/* Resolution details if resolved */}
              {prob.resolutionNotes && (
                <div className="bg-emerald-50/70 border border-emerald-100 rounded-md p-2.5 text-xs text-emerald-900 mt-2">
                  <span className="font-bold">Resolution Notes:</span> {prob.resolutionNotes}
                </div>
              )}
            </div>
          );
        })}

        {filteredProblems.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
            <CheckCircle2 className="h-8 w-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-slate-800">No problems found</p>
            <p className="text-xs text-slate-500 mt-0.5">
              All sites are currently operating without reported active hazards.
            </p>
          </div>
        )}
      </div>

      {/* Resolve Issue Modal */}
      {resolvingProblem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 p-5 max-w-md w-full shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Resolve Problem</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Document actions taken to clear this safety or operational hazard.
            </p>

            <div className="mt-4">
              <label className="block text-xs font-medium text-slate-700 mb-1">
                Corrective Action &amp; Notes
              </label>
              <textarea
                rows={3}
                required
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Explain resolution (e.g. Scaffolding re-anchored, electrical line insulated)..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-md focus:outline-hidden focus:border-amber-500"
              />
            </div>

            <div className="mt-5 flex items-center justify-end space-x-2">
              <button
                type="button"
                onClick={() => setResolvingProblem(null)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 rounded-md border border-slate-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isResolving}
                onClick={handleResolveSubmit}
                className="px-3.5 py-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition shadow-2xs"
              >
                {isResolving ? 'Resolving...' : 'Confirm Resolved'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
