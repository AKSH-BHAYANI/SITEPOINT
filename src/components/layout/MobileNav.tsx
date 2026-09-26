import React from 'react';
import { NavPage } from './Sidebar';
import { useApp } from '../../context/AppContext';
import {
  LayoutDashboard,
  Building2,
  CheckSquare,
  AlertTriangle,
  Menu,
  X,
  Package,
  Users,
  Truck,
  FileText,
  ArrowRightLeft,
  Settings,
  LogOut,
  Shield,
  Briefcase,
  HardHat
} from 'lucide-react';

interface MobileNavProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
}) => {
  const { currentUser, role, logout, problems, resourceRequests } = useApp();

  const openProblemsCount = problems.filter((p) => p.status === 'Open').length;
  const pendingRequestsCount = resourceRequests.filter((r) => r.status === 'Pending').length;

  const handleSelect = (page: NavPage) => {
    onNavigate(page);
    onClose();
  };

  const roleLabel =
    role === 'BOSS'
      ? 'Owner / MD'
      : role === 'PROJECT_MANAGER'
      ? 'Project Manager'
      : 'Site Engineer';

  const RoleIcon =
    role === 'BOSS' ? Shield : role === 'PROJECT_MANAGER' ? Briefcase : HardHat;

  return (
    <>
      {/* Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-slate-200 flex items-center justify-around z-40 px-2 shadow-lg">
        <button
          onClick={() => handleSelect('dashboard')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition ${
            currentPage === 'dashboard' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 mb-0.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => handleSelect('sites')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition ${
            currentPage === 'sites' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Building2 className="h-4 w-4 mb-0.5" />
          <span>Sites</span>
        </button>

        <button
          onClick={() => handleSelect('tasks')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition ${
            currentPage === 'tasks' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <CheckSquare className="h-4 w-4 mb-0.5" />
          <span>Tasks</span>
        </button>

        <button
          onClick={() => handleSelect('problems')}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition relative ${
            currentPage === 'problems' ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <AlertTriangle className="h-4 w-4 mb-0.5" />
          <span>Issues</span>
          {openProblemsCount > 0 && (
            <span className="absolute top-1 right-3 h-2 w-2 rounded-full bg-rose-500 ring-1 ring-white"></span>
          )}
        </button>

        <button
          onClick={() => (isOpen ? onClose() : handleSelect('settings'))}
          className={`flex flex-col items-center justify-center flex-1 py-1 text-[10px] font-medium transition ${
            isOpen ? 'text-amber-600 font-bold' : 'text-slate-500'
          }`}
        >
          <Menu className="h-4 w-4 mb-0.5" />
          <span>More</span>
        </button>
      </nav>

      {/* Slide-over Drawer for "More" options */}
      {isOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto border-t border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-xs">
                  SP
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    {currentUser?.name || currentUser?.email}
                  </div>
                  <div className="text-[10px] text-slate-500 flex items-center gap-1">
                    <RoleIcon className="h-2.5 w-2.5" />
                    <span>{roleLabel}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 py-3 text-xs">
              <button
                onClick={() => handleSelect('materials')}
                className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left"
              >
                <Package className="h-4 w-4 text-amber-600" />
                <span>Materials</span>
              </button>

              <button
                onClick={() => handleSelect('labour')}
                className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left"
              >
                <Users className="h-4 w-4 text-blue-600" />
                <span>Labour</span>
              </button>

              <button
                onClick={() => handleSelect('equipment')}
                className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left"
              >
                <Truck className="h-4 w-4 text-purple-600" />
                <span>Equipment</span>
              </button>

              <button
                onClick={() => handleSelect('reports')}
                className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left"
              >
                <FileText className="h-4 w-4 text-emerald-600" />
                <span>Reports</span>
              </button>

              <button
                onClick={() => handleSelect('requests')}
                className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left"
              >
                <ArrowRightLeft className="h-4 w-4 text-amber-600" />
                <span>Requests ({pendingRequestsCount})</span>
              </button>

              <button
                onClick={() => handleSelect('settings')}
                className="flex items-center space-x-2 p-2.5 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium text-left"
              >
                <Settings className="h-4 w-4 text-slate-600" />
                <span>Settings</span>
              </button>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  onClose();
                  logout();
                }}
                className="w-full flex items-center justify-center space-x-2 py-2.5 px-3 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
