import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { ResourceRequest } from '../../types';
import {
  ArrowRightLeft,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Package,
  Users,
  Truck,
  Building2,
  Sparkles
} from 'lucide-react';

interface RequestsPageProps {
  onOpenResourceRequest: (siteId?: string) => void;
}

export const RequestsPage: React.FC<RequestsPageProps> = ({
  onOpenResourceRequest,
}) => {
  const {
    role,
    sites,
    accessibleSites,
    resourceRequests,
    updateResourceRequestStatus,
    getInterSiteMatches,
    setSelectedSiteId,
  } = useApp();

  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Transferred' | 'Rejected'>('Pending');
  const [siteFilter, setSiteFilter] = useState('all');
  const [search, setSearch] = useState('');

  const relevantSites = role === 'BOSS' ? sites : accessibleSites;
  const relevantSiteIds = relevantSites.map((s) => s.id);

  const filteredRequests = resourceRequests.filter((r) => {
    if (!relevantSiteIds.includes(r.siteId)) return false;
    if (siteFilter !== 'all' && r.siteId !== siteFilter) return false;
    if (statusFilter !== 'All' && r.status !== statusFilter) return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const site = sites.find((s) => s.id === r.siteId);
      const matchesItem = r.itemName.toLowerCase().includes(q);
      const matchesType = r.type.toLowerCase().includes(q);
      const matchesSite = site ? site.name.toLowerCase().includes(q) : false;
      if (!matchesItem && !matchesType && !matchesSite) return false;
    }

    return true;
  });

  const interSiteMatches = getInterSiteMatches();

  const getStatusBadge = (status: ResourceRequest['status']) => {
    switch (status) {
      case 'Approved':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Transferred':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'Rejected':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-amber-50 text-amber-800 border-amber-200';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Resource Requests &amp; Inter-Site Sharing
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Optimize procurement by transferring surplus materials, trade crews, and machinery between sites.
          </p>
        </div>

        <button
          onClick={() => onOpenResourceRequest()}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-2xs transition cursor-pointer"
        >
          <Plus className="h-4 w-4 stroke-[2.5]" />
          <span>Request Resource</span>
        </button>
      </div>

      {/* Inter-site smart transfer matches banner */}
      {interSiteMatches.length > 0 && (
        <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-4 space-y-3">
          <div className="flex items-center space-x-2">
            <ArrowRightLeft className="h-4 w-4 text-amber-600" />
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Cross-Site Surplus Transfer Opportunities
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {interSiteMatches.map((match, idx) => (
              <div
                key={idx}
                className="bg-white p-3 rounded-md border border-slate-200 text-xs space-y-2 shadow-2xs"
              >
                <div className="flex items-center justify-between font-bold text-slate-900">
                  <span>{match.item}</span>
                  <span className="text-[10px] font-semibold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded border border-amber-200">
                    {match.neededQty} needed
                  </span>
                </div>
                <div className="text-[11px] text-slate-600 space-y-0.5">
                  <div>Source: <strong>{match.sourceSite.name}</strong> (Surplus: {match.availableQty})</div>
                  <div>Destination: <strong>{match.targetSite.name}</strong></div>
                </div>
                <p className="text-[11px] text-slate-500 italic border-t border-slate-100 pt-1.5">
                  {match.details}
                </p>
                {(role === 'BOSS' || role === 'PROJECT_MANAGER') && (
                  <button
                    onClick={() => updateResourceRequestStatus(match.requestId, 'Transferred')}
                    className="w-full mt-1 py-1 px-2 bg-amber-600 hover:bg-amber-700 text-white font-semibold text-[11px] rounded transition shadow-2xs"
                  >
                    Execute Transfer
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-white p-3 rounded-lg border border-slate-200">
        <div className="flex flex-wrap items-center gap-1.5">
          {/* Site Filter */}
          {role !== 'SITE_ENGINEER' && (
            <select
              aria-label="Filter requests by site"
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
          {(['All', 'Pending', 'Approved', 'Transferred', 'Rejected'] as const).map(
            (status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer whitespace-nowrap ${
                  statusFilter === status
                    ? 'bg-slate-900 text-white font-semibold shadow-2xs'
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
            placeholder="Search requested item or site..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-hidden focus:border-amber-500 focus:bg-white transition"
          />
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-2.5 px-3">Item &amp; Type</th>
                <th className="py-2.5 px-3">Requesting Site</th>
                <th className="py-2.5 px-3">Quantity</th>
                <th className="py-2.5 px-3">Urgency</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRequests.map((req) => {
                const site = sites.find((s) => s.id === req.siteId);

                return (
                  <tr key={req.id} className="hover:bg-slate-50 transition">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{req.itemName}</div>
                      <div className="text-[11px] text-slate-400">{req.type}</div>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-slate-600">
                      <button
                        onClick={() => setSelectedSiteId(req.siteId)}
                        className="hover:text-amber-600 font-medium transition cursor-pointer"
                      >
                        {site?.name || 'Site'}
                      </button>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap tabular-nums font-semibold text-slate-900">
                      {req.quantity} {req.unit || ''}
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                          req.urgency === 'Critical'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : req.urgency === 'High'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {req.urgency || 'Normal'}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap">
                      <span
                        className={`inline-block font-semibold px-2 py-0.5 rounded text-[11px] border ${getStatusBadge(
                          req.status
                        )}`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="py-3 px-3 whitespace-nowrap text-right space-x-1">
                      {req.status === 'Pending' && (role === 'BOSS' || role === 'PROJECT_MANAGER') && (
                        <>
                          <button
                            onClick={() => updateResourceRequestStatus(req.id, 'Approved')}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold text-[11px] rounded transition cursor-pointer"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => updateResourceRequestStatus(req.id, 'Transferred')}
                            className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-300 font-semibold text-[11px] rounded transition cursor-pointer"
                          >
                            Transfer
                          </button>
                          <button
                            onClick={() => updateResourceRequestStatus(req.id, 'Rejected')}
                            className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-semibold text-[11px] rounded transition cursor-pointer"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {req.status !== 'Pending' && (
                        <span className="text-[11px] text-slate-400 italic">
                          Status updated
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredRequests.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <ArrowRightLeft className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-bold text-slate-800">No resource requests found</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Click &quot;Request Resource&quot; to request equipment, materials, or workforce.
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
