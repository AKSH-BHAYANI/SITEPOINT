import React, { useState } from 'react';
import { Sidebar, NavPage } from './Sidebar';
import { TopBar } from './TopBar';
import { MobileNav } from './MobileNav';

interface AppShellProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  onOpenSearch: () => void;
  onOpenNewTask: () => void;
  onOpenResourceRequest: () => void;
  onOpenReportProblem: () => void;
  onOpenNewSite?: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentPage,
  onNavigate,
  onOpenSearch,
  onOpenNewTask,
  onOpenResourceRequest,
  onOpenReportProblem,
  onOpenNewSite,
  children,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 antialiased font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Desktop Left Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      {/* Main Column */}
      <div className="flex-1 flex flex-col min-w-0 pb-16 md:pb-0">
        {/* Top Bar */}
        <TopBar
          currentPage={currentPage}
          onNavigate={onNavigate}
          onOpenSearch={onOpenSearch}
          onOpenNewTask={onOpenNewTask}
          onOpenResourceRequest={onOpenResourceRequest}
          onOpenReportProblem={onOpenReportProblem}
          onOpenNewSite={onOpenNewSite}
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />

        {/* Viewport Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>

        {/* Clean, quiet footer */}
        <footer className="hidden md:block border-t border-slate-200 bg-white py-3 px-6 text-xs text-slate-400">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-700">SITEPOINT</span>
              <span>·</span>
              <span>Multi-Site Construction Management</span>
            </div>
            <div className="text-[11px] text-slate-400">
              Reliable field execution & resource coordination
            </div>
          </div>
        </footer>
      </div>

      {/* Mobile Navigation and Drawer */}
      <MobileNav
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />
    </div>
  );
};
