export type Role = 'BOSS' | 'PROJECT_MANAGER' | 'SITE_ENGINEER';

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Delayed';

export type DelayReason = 
  | 'Heavy rain'
  | 'Labour shortage'
  | 'Material shortage'
  | 'Equipment problem'
  | 'Safety issue'
  | 'Client/management issue'
  | 'Design/drawing issue'
  | 'Other';

export interface Task {
  id: string;
  siteId: string;
  name: string;
  description: string;
  assignedTeam: string;
  labourType: string;
  location: string;
  startDate: string;
  expectedDate: string;
  status: TaskStatus;
  isToday?: boolean;
  
  // Completed details
  completedDate?: string;
  actualEndDate?: string;
  actualEnd?: string;
  completionNote?: string;
  completionNotes?: string;
  completionPhoto?: string;
  completionPhotoUrl?: string;
  completionVideo?: string;

  // Delayed details
  delayReason?: DelayReason;
  delayedReason?: DelayReason;
  delayExplanation?: string;
  delayedExplanation?: string;
  delayPhoto?: string;
  delayVideo?: string;
  newExpectedDate?: string;
}

export interface Material {
  id: string;
  siteId: string;
  name: string;
  category: string;
  requiredQty: number;
  currentStock: number;
  usedQty: number;
  purchasedQty: number;
  unit: string;
  minThreshold: number; // Low stock warning if currentStock <= minThreshold
  supplier: string;
  pricePerUnit: number;
  lastUpdated: string;
}

export interface LabourCategory {
  id: string;
  siteId: string;
  type: string;
  required: number;
  present: number;
  notes?: string;
}

export type EquipmentStatus = 'Available' | 'In Use' | 'Maintenance' | 'Breakdown';

export interface Equipment {
  id: string;
  name: string;
  type: string;
  currentSiteId?: string;
  status: EquipmentStatus;
  assignedOperator: string;
  operatorName?: string;
  lastMaintenance: string;
  nextMaintenance: string;
  nextServiceDate?: string;
  lastUpdated?: string;
  hoursOperated?: number;
  breakdownReason?: string;
  notes?: string;
}

export interface SiteProblem {
  id: string;
  siteId: string;
  title: string;
  description: string;
  severity: 'High' | 'Medium' | 'Low';
  reportedBy: string;
  reportedDate: string;
  status: 'Open' | 'Resolved';
  photo?: string;
  photoUrl?: string;
  photo_url?: string;
  impactArea?: string;
  resolutionNotes?: string;
  resolvedAt?: string;
}

export type ResourceType = 'Material' | 'Labour' | 'Equipment';

export interface ResourceRequest {
  id: string;
  siteId: string;
  requestedBy: string;
  requested_by?: string;
  createdBy?: string;
  type: ResourceType;
  item: string;
  itemName?: string;
  item_name?: string;
  quantity: number;
  unit: string;
  reason: string;
  requiredDate: string;
  required_date?: string;
  requiredByDate?: string;
  priority: 'High' | 'Medium' | 'Low';
  urgency?: 'High' | 'Medium' | 'Low';
  status: 'Pending' | 'Approved' | 'Transferred' | 'Rejected';
  fulfilledBySiteId?: string;
  createdAt: string;
}

export interface DailyReport {
  id: string;
  siteId: string;
  date: string;
  engineerName: string;
  completedTasks: string[];
  pendingTasks: string[];
  delayedTasks: string[];
  materialsUsed: { materialName: string; quantity: number; unit: string }[];
  labourPresentCount: number;
  equipmentUsed: string[];
  problemsSummary: string[];
  remarks: string;
  photos: string[];
}

export type DocumentCategory = 'Drawings' | 'Bills' | 'Material documents' | 'Contracts' | 'Reports' | 'Safety documents' | 'Other';

export interface SiteDocument {
  id: string;
  siteId: string;
  title: string;
  category: DocumentCategory;
  fileSize: string;
  fileType: string;
  uploadedBy: string;
  uploadedDate: string;
  downloadUrl?: string;
  fileUrl?: string;
  url?: string;
  path?: string;
}

export interface SiteMedia {
  id: string;
  siteId: string;
  title: string;
  category: string;
  mediaType: 'image' | 'video';
  url: string;
  uploadedBy: string;
  date: string;
}

export type SiteStatus = 'Active' | 'On Hold' | 'Completed';

export interface SiteCompletionDetails {
  completionDate: string;
  completedDate?: string;
  remarks?: string;
  finalRemarks?: string;
  completedBy?: string;
  completionPhotos?: string[];
  finalPhotosVideos?: string[];
  reportDocumentName?: string;
  finalReportSummary?: string;
}

export interface ConstructionSite {
  id: string;
  name: string;
  code: string;
  projectType?: string;
  location: string;
  client: string;
  projectManager: string;
  siteEngineer: string;
  progressPercent: number;
  startDate: string;
  targetEndDate: string;
  status: SiteStatus;
  holdReason?: string;
  budget?: string;
  description?: string;
  completionDetails?: SiteCompletionDetails;
}

export interface UserAccount {
  id: string;
  name: string;
  email: string;
  role: Role;
  assignedSiteIds: string[];
  title: string;
  phone?: string;
}
