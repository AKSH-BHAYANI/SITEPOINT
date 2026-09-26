import React from 'react';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  Package,
  Users,
  Truck,
  FileText,
  AlertTriangle,
  ArrowRightLeft,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  HardHat,
  Shield,
  Briefcase
} from 'lucide-react';

export type NavPage =
  | 'dashboard'
  | 'sites'
  | 'tasks'
  | 'materials'
  | 'labour'
  | 'equipment'
  | 'reports'
  | 'problems'
  | 'requests'
  | 'settings';

interface SidebarProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPage,
  onNavigate,
  collapsed,
  onToggleCollapse,
}) => {
  const {
    currentUser,
    role,
    logout,
    problems,
    resourceRequests,
    tasks,
    materials,
    equipment,
    accessibleSites,
  } = useApp();

  // Calculate live badge counts
  const openProblemsCount = problems.filter((p) => p.status === 'Open').length;
  const pendingRequestsCount = resourceRequests.filter((r) => r.status === 'Pending').length;
  const lowMaterialsCount = materials.filter((m) => m.currentStock <= m.minThreshold).length;
  const breakdownCount = equipment.filter((e) => e.status === 'Breakdown').length;

  const navItems: Array<{
    id: NavPage;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
    badgeVariant?: 'danger' | 'warning' | 'neutral';
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'sites', label: 'Sites', icon: Building2 },
    { id: 'tasks', label: 'Tasks', icon: CheckSquare },
    { id: 'materials', label: 'Materials', icon: Package, badge: lowMaterialsCount > 0 ? lowMaterialsCount : undefined, badgeVariant: 'warning' },
    { id: 'labour', label: 'Labour', icon: Users },
    { id: 'equipment', label: 'Equipment', icon: Truck, badge: breakdownCount > 0 ? breakdownCount : undefined, badgeVariant: 'danger' },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'problems', label: 'Problems', icon: AlertTriangle, badge: openProblemsCount > 0 ? openProblemsCount : undefined, badgeVariant: 'danger' },
    { id: 'requests', label: 'Requests', icon: ArrowRightLeft, badge: pendingRequestsCount > 0 ? pendingRequestsCount : undefined, badgeVariant: 'neutral' },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const roleLabel =
    role === 'BOSS'
      ? 'Owner / MD'
      : role === 'PROJECT_MANAGER'
      ? 'Project Manager'
      : 'Site Engineer';

  const roleColor =
    role === 'BOSS'
      ? 'text-amber-700 bg-amber-50 border-amber-200'
      : role === 'PROJECT_MANAGER'
      ? 'text-sky-700 bg-sky-50 border-sky-200'
      : 'text-emerald-700 bg-emerald-50 border-emerald-200';

  const RoleIcon =
    role === 'BOSS' ? Shield : role === 'PROJECT_MANAGER' ? Briefcase : HardHat;

  return (
    <aside
      className={`hidden md:flex flex-col bg-white border-r border-slate-200 transition-all duration-200 select-none z-30 ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Brand Header */}
      <div className="h-14 flex items-center justify-between px-3.5 border-b border-slate-200">
        <div
          onClick={() => onNavigate('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer overflow-hidden"
        >
          <div className="h-8 w-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm shrink-0 shadow-xs">
            SP
          </div>
          {!collapsed && (
            <div className="flex flex-col min-w-0">
              <span className="text-sm font-extrabold tracking-wider text-slate-900 leading-tight">
                SITEPOINT
              </span>
              <span className="text-[10px] text-slate-500 font-medium truncate">
                Construction OS
              </span>
            </div>
          )}
        </div>

        <button
          onClick={onToggleCollapse}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={collapsed ? item.label : undefined}
              className={`w-full flex items-center rounded-lg px-2.5 py-2 text-xs font-medium transition cursor-pointer ${
                isActive
                  ? 'bg-amber-50 text-amber-950 font-semibold border-l-2 border-amber-600 rounded-l-none pl-2'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-colors ${
                  isActive ? 'text-amber-600' : 'text-slate-500'
                }`}
              />
              {!collapsed && (
                <span className="ml-3 flex-1 text-left truncate">{item.label}</span>
              )}
              {!collapsed && item.badge !== undefined && (
                <span
                  className={`ml-auto text-[10px] font-bold px-1.5 py-0.2 rounded tabular-nums ${
                    item.badgeVariant === 'danger'
                      ? 'bg-rose-100 text-rose-700'
                      : item.badgeVariant === 'warning'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User & Role Footer */}
      <div className="p-2 border-t border-slate-200 bg-slate-50/50">
        {!collapsed ? (
          <div className="space-y-2">
            <div className="flex items-center space-x-2.5 p-1.5 rounded-lg bg-white border border-slate-200">
              <div className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0">
                {(currentUser?.name || currentUser?.email || 'U')[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {currentUser?.name || currentUser?.email || 'User'}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded border ${roleColor}`}>
                    <RoleIcon className="h-2.5 w-2.5 mr-1" />
                    {roleLabel}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={logout}
              className="w-full flex items-center justify-center space-x-1.5 py-1.5 px-2 text-xs font-semibold text-slate-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition border border-transparent hover:border-rose-200 cursor-pointer"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div
              title={`${currentUser?.name || currentUser?.email} (${roleLabel})`}
              className="h-8 w-8 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs shrink-0 cursor-default"
            >
              {(currentUser?.name || currentUser?.email || 'U')[0].toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition cursor-pointer"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
