import {
  ConstructionSite,
  CreateSiteInput,
  Task,
  Material,
  LabourCategory,
  Equipment,
  SiteProblem,
  ResourceRequest,
  DailyReport,
  SiteDocument,
  SiteMedia,
  UserAccount,
  SiteStatus,
  SiteCompletionDetails,
  DelayReason,
  TaskStatus,
  EquipmentStatus,
} from '../types';

const TOKEN_KEY = 'SITEPOINT_AUTH_TOKEN';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null) {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch (err) {
    console.error('Failed to update stored token:', err);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const res = await fetch(endpoint, {
    ...options,
    headers,
  });

  if (!res.ok) {
    let errorMsg = `Server error (${res.status})`;
    try {
      const data = await res.json();
      if (data.error) errorMsg = data.error;
    } catch {
      // Ignore json parse error
    }
    throw new Error(errorMsg);
  }

  return res.json() as Promise<T>;
}

export const api = {
  // Auth & Bootstrap
  async checkBootstrapStatus(): Promise<{ bootstrapRequired: boolean }> {
    return request<{ bootstrapRequired: boolean }>('/api/auth/bootstrap-status');
  },

  async bootstrapBoss(params: {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    bootstrapSecret: string;
  }): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/bootstrap', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async login(email: string, password: string): Promise<{ token: string; user: UserAccount }> {
    const data = await request<{ token: string; user: UserAccount }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setStoredToken(data.token);
    return data;
  },

  async joinCompany(params: {
    name: string;
    email: string;
    password: string;
    companyCode: string;
    requestedRole: 'PROJECT_MANAGER' | 'SITE_ENGINEER';
    title?: string;
    phone?: string;
  }): Promise<{ success: boolean; message: string }> {
    return request('/api/auth/join', {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  async firebaseLogin(idToken: string): Promise<{ token: string; user: UserAccount }> {
    const data = await request<{ token: string; user: UserAccount }>('/api/auth/firebase-login', {
      method: 'POST',
      body: JSON.stringify({ idToken }),
    });
    setStoredToken(data.token);
    return data;
  },

  async getMe(): Promise<UserAccount> {
    return request<UserAccount>('/api/auth/me');
  },

  async getUsers(): Promise<UserAccount[]> {
    return request<UserAccount[]>('/api/auth/users');
  },

  // Company & Membership Management (Boss only)
  async getCompany(): Promise<{
    id: string;
    name: string;
    code: string;
    createdAt: string;
    updatedAt: string;
    stats?: { status: string; count: string }[];
  }> {
    return request('/api/company');
  },

  async regenerateCompanyCode(): Promise<{ success: boolean; code: string }> {
    return request('/api/company/regenerate-code', {
      method: 'POST',
    });
  },

  async getMembers(): Promise<Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    title: string;
    phone: string;
    isActive: boolean;
    membershipStatus: 'PENDING' | 'ACTIVE' | 'REJECTED' | 'DEACTIVATED';
    createdAt: string;
    assignedSites: Array<{ id: string; name: string; code: string }>;
  }>> {
    return request('/api/members');
  },

  async approveMember(id: string, siteIds?: string[]): Promise<{ success: boolean; message: string }> {
    return request(`/api/members/${encodeURIComponent(id)}/approve`, {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    });
  },

  async rejectMember(id: string): Promise<{ success: boolean; message: string }> {
    return request(`/api/members/${encodeURIComponent(id)}/reject`, {
      method: 'POST',
    });
  },

  async updateMemberStatus(id: string, membershipStatus: string, isActive?: boolean): Promise<{ success: boolean; message: string }> {
    return request(`/api/members/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ membershipStatus, isActive }),
    });
  },

  async updateMemberSites(id: string, siteIds: string[]): Promise<{ success: boolean; message: string }> {
    return request(`/api/members/${encodeURIComponent(id)}/sites`, {
      method: 'POST',
      body: JSON.stringify({ siteIds }),
    });
  },

  async getAuditLogs(): Promise<any[]> {
    return request<any[]>('/api/audit-logs');
  },

  logout() {
    setStoredToken(null);
  },

  // Upload
  async uploadFile(file: File): Promise<{ url: string; filename: string; size: number; mimetype: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return request('/api/upload', {
      method: 'POST',
      body: formData,
    });
  },

  // Sites
  async getSites(): Promise<ConstructionSite[]> {
    return request<ConstructionSite[]>('/api/sites');
  },

  async createSite(siteData: CreateSiteInput): Promise<ConstructionSite> {
    return request<ConstructionSite>('/api/sites', {
      method: 'POST',
      body: JSON.stringify(siteData),
    });
  },

  async updateSiteStatus(siteId: string, status: SiteStatus, holdReason?: string): Promise<any> {
    return request(`/api/sites/${siteId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, holdReason }),
    });
  },

  async completeSite(siteId: string, details: SiteCompletionDetails): Promise<any> {
    return request(`/api/sites/${siteId}/complete`, {
      method: 'POST',
      body: JSON.stringify(details),
    });
  },

  // Tasks
  async getTasks(siteId?: string): Promise<Task[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<Task[]>(`/api/tasks${q}`);
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    return request<Task>('/api/tasks', {
      method: 'POST',
      body: JSON.stringify(task),
    });
  },

  async updateTaskStatus(taskId: string, status: TaskStatus): Promise<any> {
    return request(`/api/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async delayTask(
    taskId: string,
    reason: DelayReason,
    explanation: string,
    newExpectedDate: string,
    photoUrl?: string,
    videoUrl?: string
  ): Promise<any> {
    return request(`/api/tasks/${taskId}/delay`, {
      method: 'PATCH',
      body: JSON.stringify({
        reason,
        explanation,
        newExpectedDate,
        photoUrl,
        videoUrl,
      }),
    });
  },

  async completeTask(taskId: string, note?: string, photoUrl?: string, videoUrl?: string): Promise<any> {
    return request(`/api/tasks/${taskId}/complete`, {
      method: 'PATCH',
      body: JSON.stringify({ note, photoUrl, videoUrl }),
    });
  },

  // Materials
  async getMaterials(siteId?: string): Promise<Material[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<Material[]>(`/api/materials${q}`);
  },

  async createMaterial(material: Omit<Material, 'id' | 'lastUpdated'>): Promise<Material> {
    return request<Material>('/api/materials', {
      method: 'POST',
      body: JSON.stringify(material),
    });
  },

  async updateMaterialStock(id: string, currentStock: number, usedQty?: number): Promise<any> {
    return request(`/api/materials/${id}/stock`, {
      method: 'PATCH',
      body: JSON.stringify({ currentStock, usedQty }),
    });
  },

  // Labour
  async getLabour(siteId?: string): Promise<LabourCategory[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<LabourCategory[]>(`/api/labour${q}`);
  },

  async createLabour(siteId: string, type: string, required: number, present: number, notes?: string): Promise<LabourCategory> {
    return request<LabourCategory>('/api/labour', {
      method: 'POST',
      body: JSON.stringify({ siteId, type, required, present, notes }),
    });
  },

  async updateLabourAttendance(id: string, present: number, required?: number): Promise<any> {
    return request(`/api/labour/${id}/attendance`, {
      method: 'PATCH',
      body: JSON.stringify({ present, required }),
    });
  },

  // Equipment
  async getEquipment(siteId?: string): Promise<Equipment[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<Equipment[]>(`/api/equipment${q}`);
  },

  async createEquipment(equip: Omit<Equipment, 'id'>): Promise<Equipment> {
    return request<Equipment>('/api/equipment', {
      method: 'POST',
      body: JSON.stringify(equip),
    });
  },

  async updateEquipmentStatus(
    id: string,
    status: EquipmentStatus,
    notes?: string,
    currentSiteId?: string,
    breakdownReason?: string
  ): Promise<any> {
    return request(`/api/equipment/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes, currentSiteId, breakdownReason }),
    });
  },

  // Problems
  async getProblems(siteId?: string): Promise<SiteProblem[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<SiteProblem[]>(`/api/problems${q}`);
  },

  async reportProblem(problem: Omit<SiteProblem, 'id' | 'reportedDate' | 'status'>): Promise<SiteProblem> {
    return request<SiteProblem>('/api/problems', {
      method: 'POST',
      body: JSON.stringify(problem),
    });
  },

  async resolveProblem(id: string, notes?: string): Promise<any> {
    return request(`/api/problems/${id}/resolve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
    });
  },

  // Resource Requests
  async getResourceRequests(siteId?: string): Promise<ResourceRequest[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<ResourceRequest[]>(`/api/resource-requests${q}`);
  },

  async createResourceRequest(req: Omit<ResourceRequest, 'id' | 'createdAt' | 'status'>): Promise<ResourceRequest> {
    return request<ResourceRequest>('/api/resource-requests', {
      method: 'POST',
      body: JSON.stringify(req),
    });
  },

  async updateResourceRequestStatus(id: string, status: 'Approved' | 'Transferred' | 'Rejected'): Promise<any> {
    return request(`/api/resource-requests/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getResourceMatches(): Promise<any[]> {
    return request<any[]>('/api/resource-requests/matches');
  },

  // Reports
  async getReports(siteId?: string): Promise<DailyReport[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<DailyReport[]>(`/api/reports${q}`);
  },

  async createReport(report: Omit<DailyReport, 'id'>): Promise<any> {
    return request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(report),
    });
  },

  // Documents
  async getDocuments(siteId?: string): Promise<SiteDocument[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<SiteDocument[]>(`/api/documents${q}`);
  },

  async createDocument(doc: Omit<SiteDocument, 'id' | 'uploadedDate'>): Promise<any> {
    return request('/api/documents', {
      method: 'POST',
      body: JSON.stringify(doc),
    });
  },

  // Media
  async getMedia(siteId?: string): Promise<SiteMedia[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<SiteMedia[]>(`/api/media${q}`);
  },

  async createMedia(media: Omit<SiteMedia, 'id' | 'date'>): Promise<any> {
    return request('/api/media', {
      method: 'POST',
      body: JSON.stringify(media),
    });
  },

  // Expenses
  async getExpenses(siteId?: string): Promise<any[]> {
    const q = siteId ? `?siteId=${encodeURIComponent(siteId)}` : '';
    return request<any[]>(`/api/expenses${q}`);
  },

  async createExpense(expense: any): Promise<any> {
    return request('/api/expenses', {
      method: 'POST',
      body: JSON.stringify(expense),
    });
  },

  // Alerts
  async getAlerts(): Promise<any[]> {
    return request<any[]>('/api/alerts');
  },

  // Universal Search
  async search(query: string): Promise<{ sites: any[]; tasks: any[]; materials: any[]; equipment: any[] }> {
    return request<{ sites: any[]; tasks: any[]; materials: any[]; equipment: any[] }>(`/api/search?q=${encodeURIComponent(query)}`);
  },

  // Real-time Event Subscription (SSE)
  subscribeToEvents(onEvent: (event: any) => void): () => void {
    const token = getStoredToken();
    if (!token) return () => {};

    // Standard EventSource doesn't support headers, so we can pass token via query or use fetch with ReadableStream
    // Or in our SSE route we can accept token in Authorization header or query param. Let's make sure query param is supported in server routes too!
    const eventSource = new EventSource(`/api/events?token=${encodeURIComponent(token)}`);

    eventSource.addEventListener('change', (e: MessageEvent) => {
      try {
        const parsed = JSON.parse(e.data);
        onEvent(parsed);
      } catch (err) {
        console.error('Failed to parse SSE event:', err);
      }
    });

    return () => {
      eventSource.close();
    };
  },
};
