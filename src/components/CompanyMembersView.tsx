import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../services/api';
import {
  Users,
  ShieldCheck,
  UserCheck,
  UserX,
  Copy,
  Check,
  RefreshCw,
  KeyRound,
  Building,
  Mail,
  Phone,
  Briefcase,
  AlertCircle,
  Clock,
  MapPin,
  CheckCircle2,
  ShieldAlert,
  Edit2,
  X
} from 'lucide-react';

interface MemberItem {
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
}

interface CompanyInfo {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  updatedAt: string;
  stats?: { status: string; count: string }[];
}

export const CompanyMembersView: React.FC = () => {
  const { sites, currentUser } = useApp();

  const [company, setCompany] = useState<CompanyInfo | null>(null);
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Copy code feedback
  const [copied, setCopied] = useState(false);
  const [isRegeneratingCode, setIsRegeneratingCode] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);

  // Approval modal / state
  const [approvingMember, setApprovingMember] = useState<MemberItem | null>(null);
  const [selectedSiteIdsForApproval, setSelectedSiteIdsForApproval] = useState<string[]>([]);
  const [isProcessingAction, setIsProcessingAction] = useState(false);

  // Edit site assignments modal
  const [editingMemberSites, setEditingMemberSites] = useState<MemberItem | null>(null);
  const [selectedSiteIdsForEdit, setSelectedSiteIdsForEdit] = useState<string[]>([]);

  // Filter tabs
  const [memberTab, setMemberTab] = useState<'PENDING' | 'ACTIVE' | 'ALL'>('PENDING');

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [compRes, membersRes] = await Promise.all([
        api.getCompany(),
        api.getMembers(),
      ]);
      setCompany(compRes);
      setMembers(membersRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load company membership data');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCopyCode = () => {
    if (!company?.code) return;
    navigator.clipboard.writeText(company.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleRegenerateCode = async () => {
    try {
      setIsRegeneratingCode(true);
      const res = await api.regenerateCompanyCode();
      setCompany((prev) => prev ? { ...prev, code: res.code } : null);
      setShowRegenConfirm(false);
      setActionSuccess(`New company join code generated: ${res.code}`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to regenerate code');
    } finally {
      setIsRegeneratingCode(false);
    }
  };

  const openApproveModal = (member: MemberItem) => {
    setApprovingMember(member);
    // Pre-select first site by default if site engineer, or all sites if project manager
    if (member.role === 'PROJECT_MANAGER') {
      setSelectedSiteIdsForApproval(sites.map((s) => s.id));
    } else {
      setSelectedSiteIdsForApproval(sites.length > 0 ? [sites[0].id] : []);
    }
  };

  const handleConfirmApproval = async () => {
    if (!approvingMember) return;
    try {
      setIsProcessingAction(true);
      await api.approveMember(approvingMember.id, selectedSiteIdsForApproval);
      setActionSuccess(`Approved ${approvingMember.name} and assigned ${selectedSiteIdsForApproval.length} sites.`);
      setApprovingMember(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Approval failed');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleRejectMember = async (member: MemberItem) => {
    if (!window.confirm(`Are you sure you want to reject the membership request from ${member.name} (${member.email})?`)) {
      return;
    }
    try {
      setIsProcessingAction(true);
      await api.rejectMember(member.id);
      setActionSuccess(`Rejected membership request for ${member.name}.`);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to reject request');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const handleToggleActiveStatus = async (member: MemberItem) => {
    const newStatus = member.isActive ? 'DEACTIVATED' : 'ACTIVE';
    const newActive = !member.isActive;
    try {
      setIsProcessingAction(true);
      await api.updateMemberStatus(member.id, newStatus, newActive);
      setActionSuccess(`Updated ${member.name}'s status to ${newStatus}.`);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update member status');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const openEditSitesModal = (member: MemberItem) => {
    setEditingMemberSites(member);
    setSelectedSiteIdsForEdit(member.assignedSites.map((s) => s.id));
  };

  const handleSaveSiteAssignments = async () => {
    if (!editingMemberSites) return;
    try {
      setIsProcessingAction(true);
      await api.updateMemberSites(editingMemberSites.id, selectedSiteIdsForEdit);
      setActionSuccess(`Updated site assignments for ${editingMemberSites.name}.`);
      setEditingMemberSites(null);
      await loadData();
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err: any) {
      setError(err.message || 'Failed to update site assignments');
    } finally {
      setIsProcessingAction(false);
    }
  };

  const pendingMembers = members.filter((m) => m.membershipStatus === 'PENDING');
  const activeMembers = members.filter((m) => m.membershipStatus === 'ACTIVE');
  const otherMembers = members.filter((m) => m.membershipStatus !== 'PENDING' && m.membershipStatus !== 'ACTIVE');

  const displayedMembers =
    memberTab === 'PENDING'
      ? pendingMembers
      : memberTab === 'ACTIVE'
      ? activeMembers
      : members;

  return (
    <div className="space-y-6">
      {/* Top Banner: Company Code & Join System */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center space-x-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px] font-black tracking-wider uppercase">
                Company Onboarding Code
              </span>
              <span className="text-slate-400 text-xs">• Zero Public Registration</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-1">
              {company?.name || 'SITEPOINT Constructions'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1">
              Provide this official Company Code to your Project Managers and Site Engineers. When they submit a join request with this code, it will appear below for your explicit authorization and site assignment.
            </p>
          </div>

          {/* Join Code Display Card */}
          <div className="bg-slate-950/80 border border-amber-500/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center gap-3 shrink-0 shadow-inner">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 text-center sm:text-left">
                Active Company Join Code
              </div>
              <div className="text-2xl sm:text-3xl font-mono font-black text-amber-400 tracking-widest text-center sm:text-left">
                {company?.code || '••••••••'}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition shadow-xs cursor-pointer"
                title="Copy Code to Clipboard"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowRegenConfirm(true)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
                title="Regenerate Join Code"
              >
                <RefreshCw className={`h-4 w-4 ${isRegeneratingCode ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Regenerate Confirmation Warning */}
        {showRegenConfirm && (
          <div className="mt-4 p-4 rounded-2xl bg-amber-950/70 border border-amber-500/40 text-xs text-amber-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 animate-in fade-in">
            <div className="flex items-start space-x-2">
              <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <span>
                Regenerating the company code will immediately invalidate the previous code. Pending applicants who haven't submitted yet will need the new code.
              </span>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => setShowRegenConfirm(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRegenerateCode}
                disabled={isRegeneratingCode}
                className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer"
              >
                {isRegeneratingCode ? 'Generating...' : 'Confirm New Code'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Action / Error Feedbacks */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center space-x-2">
          <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center space-x-2 animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Quick Summary KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Pending Authorization</span>
            <Clock className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-3xl font-black text-amber-600">{pendingMembers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Requires your approval</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Active Team Members</span>
            <UserCheck className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-black text-emerald-600">{activeMembers.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Authorized with active access</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider mb-1">
            <span>Active Construction Sites</span>
            <Building className="h-4 w-4 text-sky-500" />
          </div>
          <div className="text-3xl font-black text-sky-600">{sites.length}</div>
          <div className="text-[11px] text-slate-500 mt-1">Available for member assignment</div>
        </div>
      </div>

      {/* Main Members Section */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Tab Controls & Refresh */}
        <div className="p-4 sm:p-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setMemberTab('PENDING')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                memberTab === 'PENDING'
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Pending Requests</span>
              {pendingMembers.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-slate-950 text-white text-[10px] font-black">
                  {pendingMembers.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setMemberTab('ACTIVE')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                memberTab === 'ACTIVE'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Active Members ({activeMembers.length})</span>
            </button>

            <button
              onClick={() => setMemberTab('ALL')}
              className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                memberTab === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>All ({members.length})</span>
            </button>
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Member List Table / Cards */}
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 text-xs font-medium">
            Loading company members and pending join requests...
          </div>
        ) : displayedMembers.length === 0 ? (
          <div className="p-12 text-center">
            <div className="inline-flex p-3 rounded-2xl bg-slate-100 text-slate-400 mb-3">
              <Users className="h-6 w-6" />
            </div>
            <div className="text-sm font-bold text-slate-800">
              {memberTab === 'PENDING'
                ? 'No Pending Requests'
                : memberTab === 'ACTIVE'
                ? 'No Active Members Found'
                : 'No Members in List'}
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              {memberTab === 'PENDING'
                ? 'When a project manager or site engineer submits a registration with your Company Code, their request will appear here for your approval.'
                : 'Share your company code to onboard new personnel.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayedMembers.map((member) => (
              <div
                key={member.id}
                className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50/70 transition"
              >
                {/* Member Identity & Details */}
                <div className="flex items-start space-x-3.5">
                  <div
                    className={`h-11 w-11 rounded-2xl flex items-center justify-center font-black text-sm shrink-0 shadow-xs ${
                      member.role === 'BOSS'
                        ? 'bg-amber-100 text-amber-900 border border-amber-200'
                        : member.role === 'PROJECT_MANAGER'
                        ? 'bg-sky-100 text-sky-900 border border-sky-200'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                    }`}
                  >
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>

                  <div>
                    <div className="flex items-center space-x-2 flex-wrap gap-1">
                      <span className="font-bold text-slate-900 text-sm">{member.name}</span>
                      
                      {/* Role Badge */}
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          member.role === 'BOSS'
                            ? 'bg-amber-100 text-amber-900'
                            : member.role === 'PROJECT_MANAGER'
                            ? 'bg-sky-100 text-sky-900'
                            : 'bg-emerald-100 text-emerald-900'
                        }`}
                      >
                        {member.role === 'BOSS' ? '👑 Owner' : member.role === 'PROJECT_MANAGER' ? '💼 Project Manager' : '👷 Site Engineer'}
                      </span>

                      {/* Status Badge */}
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          member.membershipStatus === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : member.membershipStatus === 'PENDING'
                            ? 'bg-amber-100 text-amber-800'
                            : member.membershipStatus === 'REJECTED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {member.membershipStatus}
                      </span>
                    </div>

                    <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="flex items-center space-x-1">
                        <Mail className="h-3.5 w-3.5 text-slate-400" />
                        <span>{member.email}</span>
                      </span>

                      {member.phone && (
                        <span className="flex items-center space-x-1">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          <span>{member.phone}</span>
                        </span>
                      )}

                      {member.title && (
                        <span className="flex items-center space-x-1">
                          <Briefcase className="h-3.5 w-3.5 text-slate-400" />
                          <span>{member.title}</span>
                        </span>
                      )}
                    </div>

                    {/* Assigned Sites display */}
                    <div className="mt-2 flex items-center space-x-1.5 flex-wrap gap-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
                        <MapPin className="h-3 w-3 mr-0.5" /> Sites:
                      </span>
                      {member.role === 'BOSS' ? (
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          All Sites (Company Authority)
                        </span>
                      ) : member.assignedSites.length === 0 ? (
                        <span className="text-xs text-slate-400 italic">No sites assigned yet</span>
                      ) : (
                        member.assignedSites.map((s) => (
                          <span
                            key={s.id}
                            className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200"
                          >
                            📍 {s.name}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2 shrink-0 self-end md:self-center">
                  {member.membershipStatus === 'PENDING' ? (
                    <>
                      <button
                        onClick={() => openApproveModal(member)}
                        className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs cursor-pointer"
                      >
                        <UserCheck className="h-3.5 w-3.5" />
                        <span>Approve & Assign</span>
                      </button>

                      <button
                        onClick={() => handleRejectMember(member)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 text-xs font-bold transition border border-slate-200 cursor-pointer"
                      >
                        <UserX className="h-3.5 w-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  ) : member.role !== 'BOSS' ? (
                    <>
                      <button
                        onClick={() => openEditSitesModal(member)}
                        className="flex items-center space-x-1 px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                        title="Edit assigned sites"
                      >
                        <Edit2 className="h-3 w-3" />
                        <span>Sites ({member.assignedSites.length})</span>
                      </button>

                      <button
                        onClick={() => handleToggleActiveStatus(member)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                          member.isActive
                            ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {member.isActive ? 'Deactivate' : 'Activate'}
                      </button>
                    </>
                  ) : (
                    <span className="text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200">
                      Primary Admin
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* APPROVAL & SITE ASSIGNMENT MODAL */}
      {approvingMember && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <UserCheck className="h-5 w-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Approve Membership Request
                </h3>
              </div>
              <button
                onClick={() => setApprovingMember(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs">
                <div className="font-bold text-slate-900 text-sm">{approvingMember.name}</div>
                <div className="text-slate-500 mt-0.5">{approvingMember.email}</div>
                <div className="mt-2 flex items-center space-x-2">
                  <span className="font-bold text-slate-700">Requested Role:</span>
                  <span className="font-mono px-2 py-0.5 bg-slate-200 rounded font-bold">
                    {approvingMember.role}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Assign Construction Sites:
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  {approvingMember.role === 'PROJECT_MANAGER'
                    ? 'Project Managers can oversee multiple sites. Select all projects they will manage.'
                    : 'Site Engineers operate on the field. Select their active assigned site(s).'}
                </p>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {sites.map((site) => {
                    const isChecked = selectedSiteIdsForApproval.includes(site.id);
                    return (
                      <label
                        key={site.id}
                        className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                          isChecked
                            ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-bold'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <div className="flex items-center space-x-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSiteIdsForApproval([...selectedSiteIdsForApproval, site.id]);
                              } else {
                                setSelectedSiteIdsForApproval(
                                  selectedSiteIdsForApproval.filter((id) => id !== site.id)
                                );
                              }
                            }}
                            className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                          />
                          <div>
                            <div className="text-xs">{site.name}</div>
                            <div className="text-[10px] text-slate-400 font-normal">{site.location} • {site.status}</div>
                          </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">{site.code}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setApprovingMember(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmApproval}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-xs cursor-pointer flex items-center space-x-1.5"
              >
                <UserCheck className="h-4 w-4" />
                <span>{isProcessingAction ? 'Approving...' : 'Confirm & Activate Account'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT SITE ASSIGNMENTS MODAL */}
      {editingMemberSites && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <MapPin className="h-5 w-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-base">
                  Update Site Assignments for {editingMemberSites.name}
                </h3>
              </div>
              <button
                onClick={() => setEditingMemberSites(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-3">
              <p className="text-xs text-slate-500">
                Configure which construction sites this user is authorized to view and manage in SITEPOINT.
              </p>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {sites.map((site) => {
                  const isChecked = selectedSiteIdsForEdit.includes(site.id);
                  return (
                    <label
                      key={site.id}
                      className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition ${
                        isChecked
                          ? 'bg-amber-50/80 border-amber-400 text-amber-950 font-bold'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedSiteIdsForEdit([...selectedSiteIdsForEdit, site.id]);
                            } else {
                              setSelectedSiteIdsForEdit(
                                selectedSiteIdsForEdit.filter((id) => id !== site.id)
                              );
                            }
                          }}
                          className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                        />
                        <div>
                          <div className="text-xs">{site.name}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{site.location} • {site.status}</div>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400">{site.code}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditingMemberSites(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveSiteAssignments}
                disabled={isProcessingAction}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition shadow-xs cursor-pointer"
              >
                {isProcessingAction ? 'Saving...' : 'Save Site Assignments'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
