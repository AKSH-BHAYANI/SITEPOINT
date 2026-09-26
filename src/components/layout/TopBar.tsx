import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { NavPage } from './Sidebar';
import {
  Search,
  Bell,
  ChevronRight,
  Plus,
  Building2,
  AlertTriangle,
  Package,
  Truck,
  CheckCircle2,
  X,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

interface TopBarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenSearch: () => void;
  onOpenNewTask: () => void;
  onOpenResourceRequest: () => void;
  onOpenReportProblem: () => void;
  onOpenNewSite?: () => void;
  onToggleMobileMenu: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  currentPage,
  onNavigate,
  onOpenSearch,
  onOpenNewTask,
  onOpenResourceRequest,
  onOpenReportProblem,
  onOpenNewSite,
  onToggleMobileMenu,
}) => {
  const {
    currentUser,
    role,
    currentSite,
    selectedSiteId,
    setSelectedSiteId,
    activeSiteTab,
    sites,
    problems,
    materials,
    equipment,
    resourceRequests,
  } = useApp();

  const [showAlertsDropdown, setShowAlertsDropdown] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(event.target as Node)) {
        setShowAlertsDropdown(false);
      }
      if (actionsRef.current && !actionsRef.current.contains(event.target as Node)) {
        setShowQuickActions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute urgent attention items
  const openProblems = problems.filter((p) => p.status === 'Open');
  const criticalMaterials = materials.filter((m) => m.currentStock <= m.minThreshold);
  const breakdownEquipment = equipment.filter((e) => e.status === 'Breakdown');
  const pendingRequests = resourceRequests.filter((r) => r.status === 'Pending');

  const totalAlertsCount =
    openProblems.length + criticalMaterials.length + breakdownEquipment.length;

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'sites':
        return selectedSiteId && currentSite ? currentSite.name : 'Sites';
      case 'tasks':
        return 'Tasks';
      case 'materials':
        return 'Materials';
      case 'labour':
        return 'Labour';
      case 'equipment':
        return 'Equipment';
      case 'reports':
        return 'Daily Reports';
      case 'problems':
        return 'Site Problems';
      case 'requests':
        return 'Resource Requests';
      case 'settings':
        return 'Settings & Team';
      default:
        return 'Dashboard';
    }
  };

  return (
    <header className="h-14 bg-white border-b border-slate-200 px-4 flex items-center justify-between z-20 shrink-0 sticky top-0">
      {/* Left: Breadcrumbs / Title */}
      <div className="flex items-center space-x-2 min-w-0">
        <button
          onClick={onToggleMobileMenu}
          className="md:hidden p-1.5 -ml-1 text-slate-600 hover:text-slate-900 rounded-md hover:bg-slate-100"
          aria-label="Toggle navigation menu"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center text-xs font-medium text-slate-500 truncate">
          <button
            onClick={() => {
              setSelectedSiteId(null);
              onNavigate('dashboard');
            }}
            className="hover:text-slate-900 transition cursor-pointer"
          >
            SITEPOINT
          </button>

          <ChevronRight className="h-3.5 w-3.5 mx-1 text-slate-300 shrink-0" />

          {selectedSiteId && currentSite ? (
            <>
              <button
                onClick={() => {
                  setSelectedSiteId(null);
                  onNavigate('sites');
                }}
                className="hover:text-slate-900 transition cursor-pointer truncate"
              >
                Sites
              </button>
              <ChevronRight className="h-3.5 w-3.5 mx-1 text-slate-300 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">
                {currentSite.name}
              </span>
              <span className="hidden sm:inline-block ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                {activeSiteTab}
              </span>
            </>
          ) : (
            <span className="font-semibold text-slate-900 capitalize truncate">
              {getPageTitle()}
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions, Search, Alerts, User Profile */}
      <div className="flex items-center space-x-2">
        {/* Search trigger */}
        <button
          onClick={onOpenSearch}
          className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs text-slate-500 bg-slate-50 hover:bg-slate-100 border border-slate-200 transition cursor-pointer"
          title="Search sites, tasks, materials, or documents (Press /)"
        >
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-block text-[10px] bg-white border border-slate-200 px-1 rounded text-slate-400">
            /
          </kbd>
        </button>

        {/* Quick Actions Dropdown */}
        <div className="relative" ref={actionsRef}>
          <button
            onClick={() => setShowQuickActions(!showQuickActions)}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white transition shadow-2xs cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
            <span className="hidden sm:inline">Action</span>
            <ChevronDown className="h-3 w-3" />
          </button>

          {showQuickActions && (
            <div className="absolute right-0 mt-1.5 w-48 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-50 text-xs">
              {role === 'BOSS' && onOpenNewSite && (
                <button
                  onClick={() => {
                    setShowQuickActions(false);
                    onOpenNewSite();
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
                >
                  <Building2 className="h-3.5 w-3.5 text-amber-600" />
                  <span>Add Site</span>
                </button>
              )}
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  onOpenNewTask();
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5 text-blue-600" />
                <span>Add Task</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  onOpenResourceRequest();
                }}
                className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center space-x-2 cursor-pointer"
              >
                <Package className="h-3.5 w-3.5 text-emerald-600" />
                <span>Request Resource</span>
              </button>
              <button
                onClick={() => {
                  setShowQuickActions(false);
                  onOpenReportProblem();
                }}
                className="w-full text-left px-3 py-2 text-rose-700 hover:bg-rose-50 flex items-center space-x-2 cursor-pointer"
              >
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600" />
                <span>Report Problem</span>
              </button>
            </div>
          )}
        </div>

        {/* Notifications / Alerts Popover */}
        <div className="relative" ref={alertsRef}>
          <button
            onClick={() => setShowAlertsDropdown(!showAlertsDropdown)}
            title="System Alerts & Broadcasts"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative cursor-pointer"
          >
            <Bell className="h-4 w-4" />
            {totalAlertsCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            )}
          </button>

          {showAlertsDropdown && (
            <div className="absolute right-0 mt-1.5 w-80 sm:w-96 bg-white border border-slate-200 rounded-lg shadow-xl p-3 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-900">Site Alerts ({totalAlertsCount})</span>
                <span className="text-[10px] text-slate-400">Live Status</span>
              </div>

              <div className="mt-2 space-y-2 max-h-72 overflow-y-auto">
                {totalAlertsCount === 0 ? (
                  <div className="py-4 text-center text-slate-400 text-xs">
                    All sites are operating nominally. No critical issues reported.
                  </div>
                ) : (
                  <>
                    {openProblems.slice(0, 3).map((p) => {
                      const site = sites.find((s) => s.id === p.siteId);
                      return (
                        <div
                          key={p.id}
                          onClick={() => {
                            setShowAlertsDropdown(false);
                            onNavigate('problems');
                          }}
                          className="p-2 rounded-md bg-rose-50 border border-rose-100 hover:border-rose-200 cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-rose-800">{site?.name || 'Site'}</span>
                            <span className="text-[10px] text-rose-600 font-semibold">{p.severity}</span>
                          </div>
                          <p className="text-slate-700 text-[11px] mt-0.5 truncate">{p.title || p.description}</p>
                        </div>
                      );
                    })}

                    {criticalMaterials.slice(0, 3).map((m) => {
                      const site = sites.find((s) => s.id === m.siteId);
                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setShowAlertsDropdown(false);
                            onNavigate('materials');
                          }}
                          className="p-2 rounded-md bg-amber-50 border border-amber-100 hover:border-amber-200 cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-amber-900">{m.name}</span>
                            <span className="text-[10px] text-amber-700 font-semibold">Low Stock</span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            {site?.name}: {m.currentStock} {m.unit} (Min: {m.minThreshold})
                          </p>
                        </div>
                      );
                    })}

                    {breakdownEquipment.slice(0, 2).map((e) => {
                      const site = sites.find((s) => s.id === e.currentSiteId);
                      return (
                        <div
                          key={e.id}
                          onClick={() => {
                            setShowAlertsDropdown(false);
                            onNavigate('equipment');
                          }}
                          className="p-2 rounded-md bg-slate-50 border border-slate-200 hover:border-slate-300 cursor-pointer transition"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900">{e.name}</span>
                            <span className="text-[10px] text-rose-600 font-bold">Breakdown</span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">
                            Location: {site?.name || 'Central Yard'}
                          </p>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* User initials bubble (desktop) */}
        <div className="hidden sm:flex items-center space-x-2 pl-2 border-l border-slate-200">
          <div className="h-7 w-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs">
            {(currentUser?.name || currentUser?.email || 'U')[0].toUpperCase()}
          </div>
          <span className="text-xs font-semibold text-slate-700 max-w-[120px] truncate">
            {currentUser?.name || currentUser?.email}
          </span>
        </div>
      </div>
    </header>
  );
};
