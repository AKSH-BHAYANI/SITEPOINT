import React from 'react';
import { useApp } from '../../context/AppContext';
import { CompanyMembersView } from '../CompanyMembersView';
import {
  Settings,
  Building2,
  Users,
  Shield,
  KeyRound,
  Mail,
  User,
  Phone,
  Briefcase
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentUser, role } = useApp();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
          Settings &amp; Team Management
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          Manage company invite codes, authorize team memberships, and review role access permissions.
        </p>
      </div>

      {/* Account Info Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-2xs">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base shrink-0">
            {(currentUser?.name || currentUser?.email || 'U')[0].toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center space-x-2">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                {currentUser?.name || currentUser?.email}
              </h2>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                {role === 'BOSS' ? 'Company Owner' : role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Site Engineer'}
              </span>
            </div>
            <div className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="flex items-center space-x-1">
                <Mail className="h-3 w-3 text-slate-400" />
                <span>{currentUser?.email}</span>
              </span>
              {currentUser?.phone && (
                <span className="flex items-center space-x-1">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{currentUser.phone}</span>
                </span>
              )}
              {currentUser?.title && (
                <span className="flex items-center space-x-1">
                  <Briefcase className="h-3 w-3 text-slate-400" />
                  <span>{currentUser.title}</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Team and Membership Section */}
      <div className="space-y-4">
        <CompanyMembersView />
      </div>
    </div>
  );
};
