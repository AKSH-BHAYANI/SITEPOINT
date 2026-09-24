import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Task } from './types';
import { Header } from './components/Header';
import { BossDashboard } from './components/BossDashboard';
import { ProjectManagerDashboard } from './components/ProjectManagerDashboard';
import { SiteEngineerDashboard } from './components/SiteEngineerDashboard';
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

  // If initial auth or sync is booting, display sleek loader
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="h-12 w-12 rounded-2xl bg-amber-500 flex items-center justify-center shadow-lg shadow-amber-500/20 mb-4 animate-bounce">
          <Building2 className="h-6 w-6 text-slate-950 stroke-[2.5]" />
        </div>
        <div className="text-sm font-bold tracking-wider text-slate-200 uppercase">SITEPOINT</div>
        <div className="text-xs text-slate-400 mt-1">Connecting to multi-site database...</div>
      </div>
    );
  }

  // If database is temporarily unavailable, show clear error and allow retry
  if (bootstrapError) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-3xl p-8 text-center shadow-2xl">
          <div className="h-12 w-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-bold text-white mb-2">Database Unavailable</h2>
          <p className="text-xs text-slate-400 mb-6 leading-relaxed">
            {bootstrapError}
          </p>
          <button
            onClick={() => checkBootstrapStatus()}
            className="w-full flex items-center justify-center py-3 px-4 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer shadow-md"
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

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Universal Top Navigation */}
      <Header
        onOpenSearch={() => setActiveModal('search')}
        onRequestResource={() => handleOpenResourceRequest()}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {selectedSiteId ? (
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
        ) : role === 'BOSS' ? (
          <BossDashboard
            onOpenNewTask={handleOpenNewTask}
            onOpenResourceRequest={handleOpenResourceRequest}
            onOpenNewSite={handleOpenNewSite}
          />
        ) : role === 'PROJECT_MANAGER' ? (
          <ProjectManagerDashboard
            onOpenNewTask={handleOpenNewTask}
            onOpenResourceRequest={handleOpenResourceRequest}
            onReportProblem={handleReportProblem}
          />
        ) : (
          <SiteEngineerDashboard
            onOpenNewTask={handleOpenNewTask}
            onOpenResourceRequest={handleOpenResourceRequest}
            onReportProblem={handleReportProblem}
            onOpenDailyReport={handleOpenDailyReport}
            onMarkTaskDelayed={handleMarkTaskDelayed}
            onMarkTaskCompleted={handleMarkTaskCompleted}
          />
        )}
      </main>

      {/* Modals Container */}
      {activeModal === 'newSite' && (
        <NewSiteModal
          onClose={() => setActiveModal(null)}
          onSuccess={(siteOrId: any) => setSelectedSiteId(typeof siteOrId === 'string' ? siteOrId : (siteOrId?.id || null))}
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

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-6 px-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-slate-900">SITEPOINT</span>
            <span>—</span>
            <span>“One place to manage every construction site.”</span>
          </div>
          <div className="flex items-center space-x-4 text-slate-600">
            <span>Multi-Site Construction Management</span>
            <span>•</span>
            <button
              onClick={() => setSelectedSiteId(null)}
              className="hover:text-amber-600 font-semibold cursor-pointer"
            >
              All Sites
            </button>
          </div>
        </div>
      </footer>

      {/* Modals Suite */}
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
    </div>
  );
};

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
