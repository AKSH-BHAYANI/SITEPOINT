import { pgTable, text, timestamp, integer, doublePrecision, boolean, uuid, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// 1. Companies
export const companies = pgTable('companies', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  code: text('code').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// 2. Users
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  firebaseUid: text('firebase_uid').unique(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash'),
  name: text('name').notNull(),
  role: text('role').notNull(), // 'BOSS', 'PROJECT_MANAGER', 'SITE_ENGINEER'
  title: text('title').notNull(),
  phone: text('phone'),
  membershipStatus: text('membership_status').default('ACTIVE').notNull(), // 'PENDING', 'ACTIVE', 'REJECTED', 'DEACTIVATED'
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_users_company').on(table.companyId),
  index('idx_users_email').on(table.email),
  index('idx_users_firebase_uid').on(table.firebaseUid),
  index('idx_users_membership_status').on(table.membershipStatus),
]);

// 3. User Roles (Secondary audit / historical role grants)
export const userRoles = pgTable('user_roles', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id).notNull(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  role: text('role').notNull(),
  grantedAt: timestamp('granted_at').defaultNow().notNull(),
  grantedBy: text('granted_by'),
});

// 4. Sites
export const sites = pgTable('sites', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  code: text('code').notNull(),
  projectType: text('project_type'),
  location: text('location').notNull(),
  client: text('client').notNull(),
  projectManagerName: text('project_manager_name'),
  siteEngineerName: text('site_engineer_name'),
  progressPercent: integer('progress_percent').default(0).notNull(),
  startDate: text('start_date').notNull(),
  targetEndDate: text('target_end_date').notNull(),
  completionDate: text('completion_date'),
  status: text('status').default('Active').notNull(), // 'Active', 'On Hold', 'Completed'
  holdReason: text('hold_reason'),
  initialBudget: doublePrecision('initial_budget'),
  description: text('description'),
  completionRemarks: text('completion_remarks'),
  completionBy: text('completion_by'),
  reportDocumentName: text('report_document_name'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_sites_company').on(table.companyId),
  index('idx_sites_status').on(table.status),
]);

// 5. Site Members (Explicit site assignment table)
export const siteMembers = pgTable('site_members', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  role: text('role').notNull(),
  assignedAt: timestamp('assigned_at').defaultNow().notNull(),
}, (table) => [
  index('idx_site_members_site_user').on(table.siteId, table.userId),
  index('idx_site_members_user').on(table.userId),
]);

// 6. Tasks
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  description: text('description'),
  assignedTeam: text('assigned_team').notNull(),
  labourType: text('labour_type').notNull(),
  location: text('location').notNull(),
  startDate: text('start_date').notNull(),
  expectedDate: text('expected_date').notNull(),
  status: text('status').default('Pending').notNull(), // 'Pending', 'In Progress', 'Completed', 'Delayed'
  isToday: boolean('is_today').default(false).notNull(),
  completedDate: text('completed_date'),
  completionNote: text('completion_note'),
  completionPhotoUrl: text('completion_photo_url'),
  delayedReason: text('delayed_reason'),
  delayedExplanation: text('delayed_explanation'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_tasks_site_status').on(table.siteId, table.status),
  index('idx_tasks_company').on(table.companyId),
]);

// 7. Task Updates
export const taskUpdates = pgTable('task_updates', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  updateType: text('update_type').notNull(), // 'PROGRESS', 'COMPLETION', 'DELAY', 'REASSIGN'
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  notes: text('notes'),
  photoUrl: text('photo_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_task_updates_task').on(table.taskId),
]);

// 8. Materials
export const materials = pgTable('materials', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  category: text('category').notNull(),
  requiredQty: doublePrecision('required_qty').default(0).notNull(),
  openingStock: doublePrecision('opening_stock').default(0).notNull(),
  currentStock: doublePrecision('current_stock').default(0).notNull(),
  usedQty: doublePrecision('used_qty').default(0).notNull(),
  purchasedQty: doublePrecision('purchased_qty').default(0).notNull(),
  unit: text('unit').notNull(),
  minThreshold: doublePrecision('min_threshold').default(0).notNull(),
  supplier: text('supplier'),
  pricePerUnit: doublePrecision('price_per_unit').default(0).notNull(),
  lastUpdated: text('last_updated').default('Today').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_materials_site').on(table.siteId),
  index('idx_materials_company').on(table.companyId),
]);

// 9. Material Transactions
export const materialTransactions = pgTable('material_transactions', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  materialId: text('material_id').references(() => materials.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  transactionType: text('transaction_type').notNull(), // 'PURCHASE', 'CONSUMPTION', 'TRANSFER_IN', 'TRANSFER_OUT', 'ADJUSTMENT'
  quantity: doublePrecision('quantity').notNull(),
  unit: text('unit').notNull(),
  unitPrice: doublePrecision('unit_price'),
  totalCost: doublePrecision('total_cost'),
  referenceNo: text('reference_no'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_mat_trans_material').on(table.materialId),
  index('idx_mat_trans_site').on(table.siteId),
]);

// 10. Labour Categories
export const labourCategories = pgTable('labour_categories', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  name: text('name').notNull(),
  defaultDailyRate: doublePrecision('default_daily_rate').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 11. Labour Records
export const labourRecords = pgTable('labour_records', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(),
  requiredCount: integer('required_count').default(0).notNull(),
  presentCount: integer('present_count').default(0).notNull(),
  recordDate: text('record_date').notNull(),
  notes: text('notes'),
  updatedBy: text('updated_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_labour_site_date').on(table.siteId, table.recordDate),
]);

// 12. Equipment
export const equipment = pgTable('equipment', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  currentSiteId: text('current_site_id').references(() => sites.id, { onDelete: 'set null' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  status: text('status').default('Available').notNull(), // 'Available', 'In Use', 'Breakdown', 'Maintenance'
  operatorName: text('operator_name'),
  hoursOperated: integer('hours_operated').default(0).notNull(),
  lastMaintenanceDate: text('last_maintenance_date'),
  nextServiceDate: text('next_service_date'),
  breakdownReason: text('breakdown_reason'),
  notes: text('notes'),
  lastUpdated: text('last_updated').default('Today').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_equipment_site').on(table.currentSiteId),
  index('idx_equipment_status').on(table.status),
  index('idx_equipment_company').on(table.companyId),
]);

// 13. Equipment Records
export const equipmentRecords = pgTable('equipment_records', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id).notNull(),
  equipmentId: text('equipment_id').references(() => equipment.id, { onDelete: 'cascade' }).notNull(),
  userId: text('user_id').references(() => users.id).notNull(),
  status: text('status').notNull(),
  hoursLogged: integer('hours_logged').default(0).notNull(),
  maintenanceNotes: text('maintenance_notes'),
  breakdownReason: text('breakdown_reason'),
  recordDate: text('record_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 14. Daily Reports
export const dailyReports = pgTable('daily_reports', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  reportDate: text('report_date').notNull(),
  engineerName: text('engineer_name').notNull(),
  completedTasksCount: integer('completed_tasks_count').default(0).notNull(),
  activeWorkersCount: integer('active_workers_count').default(0).notNull(),
  materialsConsumed: text('materials_consumed'),
  issuesEncountered: text('issues_encountered'),
  remarks: text('remarks'),
  photosCount: integer('photos_count').default(0).notNull(),
  weather: text('weather').default('Clear'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_daily_reports_site_date').on(table.siteId, table.reportDate),
]);

// 15. Problems
export const problems = pgTable('problems', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  description: text('description').notNull(),
  severity: text('severity').notNull(), // 'Low', 'Medium', 'High', 'Critical'
  status: text('status').default('Open').notNull(), // 'Open', 'In Review', 'Resolved'
  reportedBy: text('reported_by').notNull(),
  reportedDate: text('reported_date').notNull(),
  impactArea: text('impact_area'),
  photoUrl: text('photo_url'),
  resolutionNotes: text('resolution_notes'),
  resolvedAt: text('resolved_at'),
  resolvedBy: text('resolved_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_problems_site_status').on(table.siteId, table.status),
  index('idx_problems_severity').on(table.severity),
]);

// 16. Resource Requests
export const resourceRequests = pgTable('resource_requests', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  type: text('type').notNull(), // 'Material', 'Labour', 'Equipment'
  item: text('item').notNull(),
  quantity: doublePrecision('quantity').notNull(),
  unit: text('unit').default('Units').notNull(),
  urgency: text('urgency').notNull(), // 'Low', 'Medium', 'High', 'Critical'
  reason: text('reason').notNull(),
  requiredByDate: text('required_by_date').notNull(),
  status: text('status').default('Pending').notNull(), // 'Pending', 'Approved', 'Rejected', 'Fulfilled'
  fulfilledBySiteId: text('fulfilled_by_site_id').references(() => sites.id),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('idx_res_requests_site_status').on(table.siteId, table.status),
]);

// 17. Documents
export const documents = pgTable('documents', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'Drawings', 'Approvals', 'Contracts', 'Reports', 'Safety'
  fileType: text('file_type').notNull(),
  fileSize: text('file_size').notNull(),
  fileUrl: text('file_url').notNull(),
  storageKey: text('storage_key'),
  uploadedBy: text('uploaded_by').notNull(),
  uploadedDate: text('uploaded_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_documents_site').on(table.siteId),
]);

// 18. Media Files
export const mediaFiles = pgTable('media_files', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  title: text('title').notNull(),
  category: text('category').notNull(), // 'Progress', 'Inspection', 'Safety', 'Aerial'
  mediaType: text('media_type').notNull(), // 'image', 'video'
  url: text('url').notNull(),
  storageKey: text('storage_key'),
  uploadedBy: text('uploaded_by').notNull(),
  mediaDate: text('media_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_media_site').on(table.siteId),
]);

// 19. Expenses
export const expenses = pgTable('expenses', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id, { onDelete: 'cascade' }).notNull(),
  category: text('category').notNull(), // 'Materials', 'Labour', 'Equipment', 'Permits', 'Safety'
  description: text('description').notNull(),
  amount: doublePrecision('amount').notNull(),
  payee: text('payee').notNull(),
  paymentStatus: text('payment_status').default('Pending').notNull(), // 'Pending', 'Approved', 'Paid'
  expenseDate: text('expense_date').notNull(),
  approvedBy: text('approved_by'),
  createdBy: text('created_by'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_expenses_site').on(table.siteId),
]);

// 20. Notifications
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id').references(() => sites.id),
  userId: text('user_id').references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  message: text('message').notNull(),
  type: text('type').default('INFO').notNull(), // 'INFO', 'WARNING', 'URGENT', 'SUCCESS'
  isRead: boolean('is_read').default(false).notNull(),
  link: text('link'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_notifications_user_read').on(table.userId, table.isRead),
]);

// 21. Audit Logs
export const auditLogs = pgTable('audit_logs', {
  id: text('id').primaryKey(),
  companyId: text('company_id').references(() => companies.id).notNull(),
  siteId: text('site_id'),
  userId: text('user_id'),
  action: text('action').notNull(),
  entity: text('entity').notNull(),
  entityId: text('entity_id'),
  details: text('details'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('idx_audit_company').on(table.companyId),
  index('idx_audit_site').on(table.siteId),
  index('idx_audit_created').on(table.createdAt),
]);

// Relations
export const companiesRelations = relations(companies, ({ many }) => ({
  users: many(users),
  sites: many(sites),
}));

export const sitesRelations = relations(sites, ({ one, many }) => ({
  company: one(companies, { fields: [sites.companyId], references: [companies.id] }),
  members: many(siteMembers),
  tasks: many(tasks),
  materials: many(materials),
  labourRecords: many(labourRecords),
  equipment: many(equipment),
  problems: many(problems),
  reports: many(dailyReports),
  documents: many(documents),
  media: many(mediaFiles),
  expenses: many(expenses),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  company: one(companies, { fields: [users.companyId], references: [companies.id] }),
  siteMemberships: many(siteMembers),
}));
