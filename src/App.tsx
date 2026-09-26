import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Task } from './types';
import { AppShell } from './components/layout/AppShell';
import { NavPage } from './components/layout/Sidebar';
import { DashboardPage } from './components/pages/DashboardPage';
import { SitesPage } from './components/pages/SitesPage';
import { TasksPage } from './components/pages/TasksPage';
import { MaterialsPage } from './components/pages/MaterialsPage';
import { LabourPage } from './components/pages/LabourPage';
import { EquipmentPage } from './components/pages/EquipmentPage';
import { ReportsPage } from './components/pages/ReportsPage';
import { ProblemsPage } from './components/pages/ProblemsPage';
import { RequestsPage } from './components/pages/RequestsPage';
import { SettingsPage } from './components/pages/SettingsPage';
import { SiteDetailView } from './components/SiteDetailView';
import { LoginPage } from './components/LoginPage';
import { InitialSetupPage } from './components/InitialSetupPage';

// Modals
import { NewTaskModal } from './components/modals/NewTaskModal';
import { DelayedTaskModal } from './components/modals/DelayedTaskModal';
import { CompleteTaskModal } from './components/modals/CompleteTaskModal';
import { ResourceRequestModal } from './components/modals/ResourceRequestModal';
import { ReportProblemModal } from './components/modals/ReportProblemModal';
import { DailyReportModal } from './components/modals/DailyReportModal';
import { AddMaterialModal } from './components/modals/AddMaterialModal';
import { AddEquipmentModal } from './components/modals/AddEquipmentModal';
import { AddDocumentModal } from './components/modals/AddDocumentModal';
import { UniversalSearchModal } from './components/modals/UniversalSearchModal';
import { NewSiteModal } from './components/modals/NewSiteModal';
import { CompleteSiteModal } from './components/modals/CompleteSiteModal';
import { ChangeSiteStatusModal } from './components/modals/ChangeSiteStatusModal';

import { Building2, AlertCircle, RefreshCw } from 'lucide-react';

const MainApp: React.FC = () => {
  const {
    currentUser,
    role,
    selectedSiteId,
    setSelectedSiteId,
    sites,
    isLoading,
    isBootstrapRequired,
    bootstrapError,
    checkBootstrapStatus,
  } = useApp();

  const [currentPage, setCurrentPage] = useState<NavPage>('dashboard');

  // Modal orchestration
  const [activeModal, setActiveModal] = useState<
    | null
    | 'newTask'
    | 'resourceRequest'
    | 'reportProblem'
    | 'dailyReport'
    | 'addMaterial'
    | 'addEquipment'
    | 'addDocument'
    | 'delayedTask'
    | 'completeTask'
    | 'search'
    | 'newSite'
    | 'completeSite'
    | 'changeStatus'
  >(null);

  const [modalSiteId, setModalSiteId] = useState<string | undefined>(undefined);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // If initial auth or sync is booting, display sleek loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="h-10 w-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-3 animate-pulse">
          <Building2 className="h-5 w-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="text-xs font-bold tracking-widest text-slate-200 uppercase">SITEPOINT</div>
        <div className="text-[11px] text-slate-400 mt-1">Synchronizing construction workspace...</div>
      </div>
    );
  }

  // If database is temporarily unavailable, show clear error and allow retry
  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-8 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-base font-bold text-white mb-2">Database Connection Error</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {bootstrapError}
          </p>
          <button
            onClick={() => checkBootstrapStatus()}
            className="w-full flex items-center justify-center py-2.5 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition cursor-pointer shadow-md"
          >
            <RefreshCw className="h-4 w-4 mr-2 stroke-[2.5]" />
            <span>Retry Connection</span>
          </button>
        </div>
      </div>
    );
  }

  // If initial Boss setup is required on fresh deployment
  if (isBootstrapRequired) {
    return <InitialSetupPage onSetupComplete={async () => { await checkBootstrapStatus(); }} />;
  }

  // If no authenticated user, display login page
  if (!currentUser) {
    return <LoginPage />;
  }

  // Navigation handler
  const handleNavigate = (page: NavPage) => {
    // If switching to another page while a site detail was open, reset selected site unless going to 'sites'
    if (page !== 'sites') {
      setSelectedSiteId(null);
    }
    setCurrentPage(page);
  };

  // Modal Handlers
  const handleOpenNewSite = () => {
    setActiveModal('newSite');
  };

  const handleOpenCompleteSite = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('completeSite');
  };

  const handleOpenChangeStatus = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('changeStatus');
  };

  const handleOpenNewTask = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('newTask');
  };

  const handleOpenResourceRequest = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('resourceRequest');
  };

  const handleReportProblem = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('reportProblem');
  };

  const handleOpenDailyReport = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('dailyReport');
  };

  const handleOpenAddMaterial = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('addMaterial');
  };

  const handleOpenAddEquipment = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('addEquipment');
  };

  const handleOpenAddDocument = (siteId?: string) => {
    setModalSiteId(siteId || selectedSiteId || undefined);
    setActiveModal('addDocument');
  };

  const handleMarkTaskDelayed = (task: Task) => {
    setSelectedTask(task);
    setActiveModal('delayedTask');
  };

  const handleMarkTaskCompleted = (task: Task) => {
    setSelectedTask(task);
    setActiveModal('completeTask');
  };

  // Render active page view
  const renderCurrentView = () => {
    if (selectedSiteId) {
      return (
        <SiteDetailView
          onOpenNewTask={handleOpenNewTask}
          onOpenResourceRequest={handleOpenResourceRequest}
          onReportProblem={handleReportProblem}
          onOpenDailyReport={handleOpenDailyReport}
          onOpenAddMaterial={handleOpenAddMaterial}
          onOpenAddEquipment={handleOpenAddEquipment}
          onOpenAddDocument={handleOpenAddDocument}
          onMarkTaskDelayed={handleMarkTaskDelayed}
          onMarkTaskCompleted={handleMarkTaskCompleted}
          onOpenCompleteSite={handleOpenCompleteSite}
          onOpenChangeStatus={handleOpenChangeStatus}
        />
      );
    }

    switch (currentPage) {
      case 'dashboard':
        return (
          <DashboardPage
            onNavigate={(page) => {
              setCurrentPage(page);
            }}
            onOpenNewTask={handleOpenNewTask}
            onOpenResourceRequest={handleOpenResourceRequest}
            onOpenReportProblem={handleReportProblem}
            onOpenNewSite={handleOpenNewSite}
            onOpenDailyReport={handleOpenDailyReport}
          />
        );

      case 'sites':
        return (
          <SitesPage
            onOpenNewSite={handleOpenNewSite}
            onOpenCompleteSite={handleOpenCompleteSite}
            onOpenChangeStatus={handleOpenChangeStatus}
          />
        );

      case 'tasks':
        return (
          <TasksPage
            onOpenNewTask={handleOpenNewTask}
            onMarkTaskCompleted={handleMarkTaskCompleted}
            onMarkTaskDelayed={handleMarkTaskDelayed}
          />
        );

      case 'materials':
        return (
          <MaterialsPage
            onOpenAddMaterial={handleOpenAddMaterial}
          />
        );

      case 'labour':
        return <LabourPage />;

      case 'equipment':
        return (
          <EquipmentPage
            onOpenAddEquipment={handleOpenAddEquipment}
          />
        );

      case 'reports':
        return (
          <ReportsPage
            onOpenDailyReport={handleOpenDailyReport}
          />
        );

      case 'problems':
        return (
          <ProblemsPage
            onOpenReportProblem={handleReportProblem}
          />
        );

      case 'requests':
        return (
          <RequestsPage
            onOpenResourceRequest={handleOpenResourceRequest}
          />
        );

      case 'settings':
        return <SettingsPage />;

      default:
        return (
          <DashboardPage
            onNavigate={(page) => setCurrentPage(page)}
            onOpenNewTask={handleOpenNewTask}
            onOpenResourceRequest={handleOpenResourceRequest}
            onOpenReportProblem={handleReportProblem}
            onOpenNewSite={handleOpenNewSite}
            onOpenDailyReport={handleOpenDailyReport}
          />
        );
    }
  };

  return (
    <AppShell
      currentPage={currentPage}
      onNavigate={handleNavigate}
      onOpenSearch={() => setActiveModal('search')}
      onOpenNewTask={() => handleOpenNewTask()}
      onOpenResourceRequest={() => handleOpenResourceRequest()}
      onOpenReportProblem={() => handleReportProblem()}
      onOpenNewSite={role === 'BOSS' ? handleOpenNewSite : undefined}
    >
      {renderCurrentView()}

      {/* Modals Suite */}
      {activeModal === 'newSite' && (
        <NewSiteModal
          onClose={() => setActiveModal(null)}
          onSuccess={(siteOrId: any) => {
            const newId = typeof siteOrId === 'string' ? siteOrId : siteOrId?.id || null;
            setSelectedSiteId(newId);
            setCurrentPage('sites');
          }}
        />
      )}

      {activeModal === 'completeSite' && (
        (() => {
          const targetSite = sites.find((s) => s.id === (modalSiteId || selectedSiteId));
          if (!targetSite) return null;
          return (
            <CompleteSiteModal
              site={targetSite}
              onClose={() => setActiveModal(null)}
            />
          );
        })()
      )}

      {activeModal === 'changeStatus' && (
        (() => {
          const targetSite = sites.find((s) => s.id === (modalSiteId || selectedSiteId));
          if (!targetSite) return null;
          return (
            <ChangeSiteStatusModal
              site={targetSite}
              onClose={() => setActiveModal(null)}
              onRequestComplete={() => {
                setActiveModal('completeSite');
              }}
            />
          );
        })()
      )}

      {activeModal === 'newTask' && (
        <NewTaskModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'delayedTask' && selectedTask && (
        <DelayedTaskModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'completeTask' && selectedTask && (
        <CompleteTaskModal
          task={selectedTask}
          onClose={() => {
            setSelectedTask(null);
            setActiveModal(null);
          }}
        />
      )}

      {activeModal === 'resourceRequest' && (
        <ResourceRequestModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'reportProblem' && (
        <ReportProblemModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'dailyReport' && (
        <DailyReportModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'addMaterial' && (
        <AddMaterialModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'addEquipment' && (
        <AddEquipmentModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'addDocument' && (
        <AddDocumentModal
          defaultSiteId={modalSiteId}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'search' && (
        <UniversalSearchModal
          onClose={() => setActiveModal(null)}
        />
      )}
    </AppShell>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
