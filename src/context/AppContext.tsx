import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  Role,
  ConstructionSite,
  Task,
  Material,
  LabourCategory,
  Equipment,
  SiteProblem,
  ResourceRequest,
  DailyReport,
  SiteDocument,
  SiteMedia,
  DelayReason,
  TaskStatus,
  EquipmentStatus,
  UserAccount,
  SiteStatus,
  SiteCompletionDetails,
} from '../types';
import { api, getStoredToken } from '../services/api';

export type SiteTab = 'Overview' | 'Tasks' | 'Materials' | 'Labour' | 'Equipment' | 'Reports' | 'Documents';

export interface InterSiteMatch {
  requestId: string;
  sourceSite: ConstructionSite;
  targetSite: ConstructionSite;
  item: string;
  neededQty: number;
  availableQty: number | string;
  type: 'Material' | 'Labour' | 'Equipment';
  details: string;
}

interface AppContextType {
  // Authentication & User Session
  currentUser: UserAccount | null;
  isBootstrapRequired: boolean;
  checkBootstrapStatus: () => Promise<boolean>;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  joinCompany: (params: {
    name: string;
    email: string;
    password: string;
    companyCode: string;
    requestedRole: 'PROJECT_MANAGER' | 'SITE_ENGINEER';
    title?: string;
    phone?: string;
  }) => Promise<{ success: boolean; message?: string; error?: string }>;
  firebaseLogin: (idToken: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  companyUsers: UserAccount[];

  role: Role;
  setRole: (role: Role) => void;
  selectedSiteId: string | null;
  setSelectedSiteId: (siteId: string | null) => void;
  activeSiteTab: SiteTab;
  setActiveSiteTab: (tab: SiteTab) => void;

  // Data
  sites: ConstructionSite[];
  tasks: Task[];
  materials: Material[];
  labour: LabourCategory[];
  equipment: Equipment[];
  problems: SiteProblem[];
  resourceRequests: ResourceRequest[];
  reports: DailyReport[];
  documents: SiteDocument[];
  media: SiteMedia[];

  // Helpers & Derived
  currentSite: ConstructionSite | null;
  accessibleSites: ConstructionSite[];
  isSiteAccessible: (siteId: string) => boolean;
  getSiteById: (id: string) => ConstructionSite | undefined;
  getInterSiteMatches: () => InterSiteMatch[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;

  // Loading & Sync state
  isLoading: boolean;
  syncStatus: 'connected' | 'connecting' | 'error';
  refreshData: () => Promise<void>;

  // Actions
  completeTask: (taskId: string, note?: string, photoUrl?: string) => Promise<void>;
  delayTask: (
    taskId: string,
    reason: DelayReason,
    explanation: string,
    newExpectedDate: string,
    photoUrl?: string,
    videoUrl?: string
  ) => Promise<void>;
  updateTaskStatus: (taskId: string, status: TaskStatus) => Promise<void>;
  createTask: (task: Omit<Task, 'id'>) => Promise<void>;

  addResourceRequest: (req: Omit<ResourceRequest, 'id' | 'createdAt' | 'status'>) => Promise<void>;
  updateResourceRequestStatus: (id: string, status: 'Approved' | 'Transferred' | 'Rejected') => Promise<void>;

  addMaterial: (material: Omit<Material, 'id' | 'lastUpdated'>) => Promise<void>;
  updateMaterialStock: (id: string, currentStock: number, usedQty?: number) => Promise<void>;

  addLabourCategory: (siteId: string, type: string, required: number, present: number) => Promise<void>;
  updateLabourAttendance: (id: string, present: number, required?: number) => Promise<void>;

  addEquipment: (equip: Omit<Equipment, 'id'>) => Promise<void>;
  updateEquipmentStatus: (id: string, status: EquipmentStatus, notes?: string, currentSiteId?: string, breakdownReason?: string) => Promise<void>;

  reportProblem: (problem: Omit<SiteProblem, 'id' | 'reportedDate' | 'status'>) => Promise<void>;
  resolveProblem: (id: string, notes?: string) => Promise<void>;

  addDailyReport: (report: Omit<DailyReport, 'id'>) => Promise<void>;
  addDocument: (doc: Omit<SiteDocument, 'id' | 'uploadedDate'>) => Promise<void>;

  // Site lifecycle actions
  createSite: (siteData: Omit<ConstructionSite, 'id' | 'progressPercent'> & { initialTasks?: Array<Omit<Task, 'id' | 'siteId'>> }) => Promise<void>;
  updateSiteStatus: (siteId: string, status: SiteStatus, holdReason?: string) => Promise<void>;
  completeSite: (siteId: string, details: SiteCompletionDetails) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<UserAccount | null>(null);
  const [role, setRole] = useState<Role>('BOSS');
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [activeSiteTab, setActiveSiteTab] = useState<SiteTab>('Overview');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<'connected' | 'connecting' | 'error'>('connecting');

  // Primary Collections populated from Database
  const [sites, setSites] = useState<ConstructionSite[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [labour, setLabour] = useState<LabourCategory[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [problems, setProblems] = useState<SiteProblem[]>([]);
  const [resourceRequests, setResourceRequests] = useState<ResourceRequest[]>([]);
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [documents, setDocuments] = useState<SiteDocument[]>([]);
  const [media, setMedia] = useState<SiteMedia[]>([]);
  const [companyUsers, setCompanyUsers] = useState<UserAccount[]>([]);

  const [isBootstrapRequired, setIsBootstrapRequired] = useState<boolean>(false);

  // Check if system requires initial Boss bootstrap
  const checkBootstrapStatus = useCallback(async () => {
    try {
      const res = await api.checkBootstrapStatus();
      setIsBootstrapRequired(res.bootstrapRequired);
      return res.bootstrapRequired;
    } catch (err) {
      console.error('Failed to verify bootstrap status:', err);
      return false;
    }
  }, []);

  // Function to load all business data from Backend API
  const refreshData = useCallback(async () => {
    try {
      const [
        sitesData,
        tasksData,
        materialsData,
        labourData,
        equipmentData,
        problemsData,
        requestsData,
        reportsData,
        documentsData,
        mediaData,
        usersData,
      ] = await Promise.all([
        api.getSites(),
        api.getTasks(),
        api.getMaterials(),
        api.getLabour(),
        api.getEquipment(),
        api.getProblems(),
        api.getResourceRequests(),
        api.getReports(),
        api.getDocuments(),
        api.getMedia(),
        api.getUsers().catch(() => []),
      ]);

      setSites(sitesData);
      setTasks(tasksData);
      setMaterials(materialsData);
      setLabour(labourData);
      setEquipment(equipmentData);
      setProblems(problemsData);
      setResourceRequests(requestsData);
      setReports(reportsData);
      setDocuments(documentsData);
      setMedia(mediaData);
      setCompanyUsers(usersData);
      setSyncStatus('connected');
    } catch (err) {
      console.error('Failed to load shared business data from API:', err);
      setSyncStatus('error');
    }
  }, []);

  // Bootstrap session from stored JWT
  useEffect(() => {
    const initAuth = async () => {
      const token = getStoredToken();
      if (!token) {
        await checkBootstrapStatus();
        setIsLoading(false);
        return;
      }

      try {
        const user = await api.getMe();
        setCurrentUser(user);
        setRole(user.role);
        if (user.role === 'SITE_ENGINEER') {
          setSelectedSiteId(user.assignedSiteIds[0] || null);
        }
        await refreshData();
      } catch (err) {
        console.warn('Stored token expired or invalid:', err);
        api.logout();
        setCurrentUser(null);
        await checkBootstrapStatus();
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, [refreshData, checkBootstrapStatus]);

  // Real-time synchronization via Server-Sent Events (SSE)
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribe = api.subscribeToEvents((event) => {
      console.log('⚡ Real-time update received from server:', event);
      // Automatically refresh data when changes occur on the server
      refreshData();
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser, refreshData]);

  // Authentication methods
  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      // Step 1: Login & Store JWT (api.login stores token via setStoredToken)
      const res = await api.login(email, password);

      // Step 2: Set currentUser
      // Step 3: Set authenticated role
      setCurrentUser(res.user);
      setRole(res.user.role);

      if (res.user.role === 'BOSS') {
        setSelectedSiteId(null);
      } else if (res.user.role === 'PROJECT_MANAGER') {
        setSelectedSiteId(null);
      } else if (res.user.role === 'SITE_ENGINEER') {
        setSelectedSiteId(res.user.assignedSiteIds[0] || null);
      }

      // Step 4: Verify /api/auth/me with Bearer JWT
      try {
        const verifiedUser = await api.getMe();
        if (verifiedUser) {
          setCurrentUser(verifiedUser);
          setRole(verifiedUser.role);
        }
      } catch (meErr) {
        console.warn('Post-login session verification via /api/auth/me:', meErr);
      }

      setActiveSiteTab('Overview');

      // Step 5: Load dashboard data (Separate AUTHENTICATION SUCCESS from DASHBOARD DATA LOAD FAILURE)
      try {
        await refreshData();
      } catch (dataErr) {
        console.error('Initial dashboard data load error:', dataErr);
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Invalid credentials' };
    } finally {
      setIsLoading(false);
    }
  };

  const joinCompany = async (params: {
    name: string;
    email: string;
    password: string;
    companyCode: string;
    requestedRole: 'PROJECT_MANAGER' | 'SITE_ENGINEER';
    title?: string;
    phone?: string;
  }): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await api.joinCompany(params);
      return { success: true, message: res.message };
    } catch (err: any) {
      return { success: false, error: err.message || 'Join request failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const firebaseLogin = async (idToken: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setIsLoading(true);
      const res = await api.firebaseLogin(idToken);
      setCurrentUser(res.user);
      setRole(res.user.role);
      if (res.user.role === 'SITE_ENGINEER') {
        setSelectedSiteId(res.user.assignedSiteIds[0] || null);
      } else {
        setSelectedSiteId(null);
      }
      setActiveSiteTab('Overview');
      await refreshData();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Firebase authentication failed' };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    api.logout();
    setCurrentUser(null);
    setSelectedSiteId(null);
    setSites([]);
    setTasks([]);
    setMaterials([]);
    setLabour([]);
    setEquipment([]);
    setProblems([]);
    setResourceRequests([]);
    setReports([]);
    setDocuments([]);
    setMedia([]);
    setCompanyUsers([]);
    checkBootstrapStatus();
  };

  const handleRoleChange = (newRole: Role) => {
    setRole(newRole);
    if (newRole === 'SITE_ENGINEER') {
      setSelectedSiteId(currentUser?.assignedSiteIds[0] || 'site-1');
      setActiveSiteTab('Overview');
    } else {
      setSelectedSiteId(null);
    }
  };

  // Accessible sites derived based on user role & assigned sites
  const accessibleSites = useMemo(() => {
    if (!currentUser) return sites;
    if (currentUser.role === 'BOSS') return sites;
    return sites.filter((s) => currentUser.assignedSiteIds.includes(s.id));
  }, [currentUser, sites]);

  const isSiteAccessible = (siteId: string): boolean => {
    if (!currentUser) return true;
    if (currentUser.role === 'BOSS') return true;
    return currentUser.assignedSiteIds.includes(siteId);
  };

  const getSiteById = (id: string) => sites.find((s) => s.id === id);
  const currentSite = selectedSiteId ? getSiteById(selectedSiteId) || null : null;

  // Inter-site Resource Suggestions engine
  const getInterSiteMatches = (): InterSiteMatch[] => {
    const matches: InterSiteMatch[] = [];

    resourceRequests.filter((r) => r.status === 'Pending').forEach((req) => {
      const requesterSite = getSiteById(req.siteId);
      if (!requesterSite) return;

      if (req.type === 'Material') {
        const candidateMaterials = materials.filter(
          (m) =>
            m.siteId !== req.siteId &&
            m.name.toLowerCase().includes(req.item.toLowerCase().split(' ')[0]) &&
            m.currentStock > (m.minThreshold || 100)
        );

        candidateMaterials.forEach((cand) => {
          const candSite = getSiteById(cand.siteId);
          if (candSite && candSite.status === 'Active') {
            matches.push({
              requestId: req.id,
              sourceSite: candSite,
              targetSite: requesterSite,
              item: req.item,
              neededQty: req.quantity,
              availableQty: `${cand.currentStock} ${cand.unit}`,
              type: 'Material',
              details: `${candSite.name} currently has ${cand.currentStock} ${cand.unit} in stock.`,
            });
          }
        });
      } else if (req.type === 'Equipment') {
        const availEquip = equipment.filter(
          (eq) =>
            eq.currentSiteId !== req.siteId &&
            eq.status === 'Available' &&
            (eq.type.toLowerCase().includes(req.item.toLowerCase()) ||
              eq.name.toLowerCase().includes(req.item.toLowerCase()))
        );

        availEquip.forEach((eq) => {
          const candSite = getSiteById(eq.currentSiteId);
          if (candSite && candSite.status === 'Active') {
            matches.push({
              requestId: req.id,
              sourceSite: candSite,
              targetSite: requesterSite,
              item: req.item,
              neededQty: req.quantity,
              availableQty: `1 Unit (${eq.name})`,
              type: 'Equipment',
              details: `${candSite.name} has ${eq.name} standing by as Available.`,
            });
          }
        });
      }
    });

    return matches;
  };

  // Actions wired to Backend API
  const completeTask = async (taskId: string, note?: string, photoUrl?: string) => {
    await api.completeTask(taskId, note, photoUrl);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Completed',
              completedDate: new Date().toISOString().split('T')[0],
              completionNote: note,
              completionPhoto: photoUrl,
            }
          : t
      )
    );
  };

  const delayTask = async (
    taskId: string,
    reason: DelayReason,
    explanation: string,
    newExpectedDate: string,
    photoUrl?: string,
    videoUrl?: string
  ) => {
    await api.delayTask(taskId, reason, explanation, newExpectedDate, photoUrl, videoUrl);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: 'Delayed',
              delayReason: reason,
              delayExplanation: explanation,
              newExpectedDate,
              expectedDate: newExpectedDate,
              delayPhoto: photoUrl,
              delayVideo: videoUrl,
            }
          : t
      )
    );
  };

  const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
    await api.updateTaskStatus(taskId, status);
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
  };

  const createTask = async (task: Omit<Task, 'id'>) => {
    const created = await api.createTask(task);
    setTasks((prev) => [created, ...prev]);
  };

  const addResourceRequest = async (req: Omit<ResourceRequest, 'id' | 'createdAt' | 'status'>) => {
    const created = await api.createResourceRequest(req);
    setResourceRequests((prev) => [created, ...prev]);
  };

  const updateResourceRequestStatus = async (id: string, status: 'Approved' | 'Transferred' | 'Rejected') => {
    await api.updateResourceRequestStatus(id, status);
    setResourceRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  const addMaterial = async (material: Omit<Material, 'id' | 'lastUpdated'>) => {
    const created = await api.createMaterial(material);
    setMaterials((prev) => [created, ...prev]);
  };

  const updateMaterialStock = async (id: string, currentStock: number, usedQty?: number) => {
    await api.updateMaterialStock(id, currentStock, usedQty);
    setMaterials((prev) =>
      prev.map((m) =>
        m.id === id
          ? {
              ...m,
              currentStock,
              usedQty: usedQty !== undefined ? usedQty : m.usedQty,
              lastUpdated: 'Just now',
            }
          : m
      )
    );
  };

  const addLabourCategory = async (siteId: string, type: string, required: number, present: number) => {
    const created = await api.createLabour(siteId, type, required, present);
    setLabour((prev) => [created, ...prev]);
  };

  const updateLabourAttendance = async (id: string, present: number, required?: number) => {
    await api.updateLabourAttendance(id, present, required);
    setLabour((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              present,
              required: required !== undefined ? required : l.required,
            }
          : l
      )
    );
  };

  const addEquipment = async (equip: Omit<Equipment, 'id'>) => {
    const created = await api.createEquipment(equip);
    setEquipment((prev) => [created, ...prev]);
  };

  const updateEquipmentStatus = async (
    id: string,
    status: EquipmentStatus,
    notes?: string,
    currentSiteId?: string,
    breakdownReason?: string
  ) => {
    await api.updateEquipmentStatus(id, status, notes, currentSiteId, breakdownReason);
    setEquipment((prev) =>
      prev.map((e) =>
        e.id === id
          ? {
              ...e,
              status,
              notes: notes || e.notes,
              currentSiteId: currentSiteId || e.currentSiteId,
            }
          : e
      )
    );
  };

  const reportProblem = async (problem: Omit<SiteProblem, 'id' | 'reportedDate' | 'status'>) => {
    const created = await api.reportProblem(problem);
    setProblems((prev) => [created, ...prev]);
  };

  const resolveProblem = async (id: string, notes?: string) => {
    await api.resolveProblem(id, notes);
    setProblems((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'Resolved' } : p)));
  };

  const addDailyReport = async (report: Omit<DailyReport, 'id'>) => {
    await api.createReport(report);
    await refreshData();
  };

  const addDocument = async (doc: Omit<SiteDocument, 'id' | 'uploadedDate'>) => {
    await api.createDocument(doc);
    await refreshData();
  };

  const createSite = async (
    siteData: Omit<ConstructionSite, 'id' | 'progressPercent'> & { initialTasks?: Array<Omit<Task, 'id' | 'siteId'>> }
  ) => {
    await api.createSite(siteData);
    await refreshData();
  };

  const updateSiteStatus = async (siteId: string, status: SiteStatus, holdReason?: string) => {
    await api.updateSiteStatus(siteId, status, holdReason);
    setSites((prev) =>
      prev.map((s) => (s.id === siteId ? { ...s, status, holdReason: status === 'On Hold' ? holdReason : undefined } : s))
    );
  };

  const completeSite = async (siteId: string, details: SiteCompletionDetails) => {
    await api.completeSite(siteId, details);
    await refreshData();
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isBootstrapRequired,
        checkBootstrapStatus,
        login,
        joinCompany,
        firebaseLogin,
        logout,
        companyUsers,
        role,
        setRole: handleRoleChange,
        selectedSiteId,
        setSelectedSiteId,
        activeSiteTab,
        setActiveSiteTab,
        sites,
        accessibleSites,
        isSiteAccessible,
        tasks,
        materials,
        labour,
        equipment,
        problems,
        resourceRequests,
        reports,
        documents,
        media,
        currentSite,
        getSiteById,
        getInterSiteMatches,
        searchQuery,
        setSearchQuery,
        isLoading,
        syncStatus,
        refreshData,
        completeTask,
        delayTask,
        updateTaskStatus,
        createTask,
        addResourceRequest,
        updateResourceRequestStatus,
        addMaterial,
        updateMaterialStock,
        addLabourCategory,
        updateLabourAttendance,
        addEquipment,
        updateEquipmentStatus,
        reportProblem,
        resolveProblem,
        addDailyReport,
        addDocument,
        createSite,
        updateSiteStatus,
        completeSite,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
