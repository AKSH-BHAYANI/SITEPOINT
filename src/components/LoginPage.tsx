import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  HardHat,
  Lock,
  Mail,
  Shield,
  Briefcase,
  Building2,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  User,
  Phone,
  HelpCircle,
  Hash,
  Clock,
  ShieldCheck
} from 'lucide-react';
import { validatePassword, PASSWORD_REQUIREMENT_MESSAGE } from '../utils/passwordPolicy';

export const LoginPage: React.FC = () => {
  const { login, joinCompany } = useApp();
  const [activeTab, setActiveTab] = useState<'LOGIN' | 'JOIN'>('LOGIN');

  // Login form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Join Company form state
  const [joinName, setJoinName] = useState('');
  const [joinEmail, setJoinEmail] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joinRole, setJoinRole] = useState<'PROJECT_MANAGER' | 'SITE_ENGINEER'>('SITE_ENGINEER');
  const [joinCompanyCode, setJoinCompanyCode] = useState('');
  const [joinTitle, setJoinTitle] = useState('');
  const [joinPhone, setJoinPhone] = useState('');
  const [joinSuccessMessage, setJoinSuccessMessage] = useState<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(email.trim(), password);
      if (!result.success) {
        setError(result.error || 'Invalid credentials or account pending authorization.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setJoinSuccessMessage(null);

    const passwordValidation = validatePassword(joinPassword);
    if (!passwordValidation.valid) {
      setError(passwordValidation.error || PASSWORD_REQUIREMENT_MESSAGE);
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await joinCompany({
        name: joinName.trim(),
        email: joinEmail.trim().toLowerCase(),
        password: joinPassword,
        companyCode: joinCompanyCode.trim().toUpperCase(),
        requestedRole: joinRole,
        title: joinTitle.trim() || undefined,
        phone: joinPhone.trim() || undefined,
      });

      if (!result.success) {
        setError(result.error || 'Failed to submit join request.');
      } else {
        setJoinSuccessMessage(
          result.message || 'Your join request has been submitted to the Company Owner. You will be able to log in once approved.'
        );
        // Clear sensitive inputs
        setJoinPassword('');
      }
    } catch (err: any) {
      setError(err.message || 'Join request failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center py-10 sm:px-6 lg:px-8 text-slate-100 selection:bg-amber-500 selection:text-white">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center px-4">
        <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 mb-3">
          <HardHat className="h-8 w-8 stroke-[2.5]" />
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white uppercase">
          SITEPOINT
        </h1>
        <p className="mt-1.5 text-sm font-semibold text-amber-400">
          “One place to manage every construction site.”
        </p>
        <p className="mt-1 text-xs text-slate-400">
          Enterprise Construction Management Portal
        </p>
      </div>

      {/* Main Auth Card */}
      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-7 px-6 shadow-2xl rounded-3xl sm:px-9 border border-slate-200 text-slate-900">
          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 mb-6 pb-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('LOGIN');
                setError(null);
                setJoinSuccessMessage(null);
              }}
              className={`flex-1 text-xs font-bold pb-2 text-center transition cursor-pointer border-b-2 -mb-2 ${
                activeTab === 'LOGIN'
                  ? 'border-amber-500 text-amber-950 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('JOIN');
                setError(null);
                setJoinSuccessMessage(null);
              }}
              className={`flex-1 text-xs font-bold pb-2 text-center transition cursor-pointer border-b-2 -mb-2 ${
                activeTab === 'JOIN'
                  ? 'border-amber-500 text-amber-950 font-black'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Join Company
            </button>
          </div>

          {/* Feedback Messages */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {joinSuccessMessage && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium flex items-start space-x-2">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-amber-950">Request Submitted</div>
                <div className="mt-0.5 text-amber-800 leading-relaxed">{joinSuccessMessage}</div>
              </div>
            </div>
          )}

          {/* TAB 1: SIGN IN */}
          {activeTab === 'LOGIN' && (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Work Email
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                    Password
                  </label>
                </div>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter account password"
                    className="block w-full pl-10 pr-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition cursor-pointer"
                >
                  <span>{isSubmitting ? 'Authenticating...' : 'Sign In'}</span>
                  <ArrowRight className="ml-2 h-4 w-4 stroke-[2.5]" />
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center">
                <p className="text-xs text-slate-500">
                  New project manager or site engineer?{' '}
                  <button
                    type="button"
                    onClick={() => setActiveTab('JOIN')}
                    className="text-amber-600 font-bold hover:underline cursor-pointer"
                  >
                    Request to Join with Company Code
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* TAB 2: JOIN COMPANY */}
          {activeTab === 'JOIN' && (
            <form onSubmit={handleJoinSubmit} className="space-y-3.5">
              <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3 text-xs text-amber-900 flex items-start space-x-2">
                <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  Enter your company's join code. Your request will be queued for the Company Owner to review and assign construction sites.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Company Join Code *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Hash className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={joinCompanyCode}
                    onChange={(e) => setJoinCompanyCode(e.target.value.toUpperCase())}
                    placeholder="e.g. BC-XXXXXX"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-wider text-slate-900 uppercase focus:outline-hidden focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Full Name *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="text"
                    required
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    placeholder="Full Name"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Work Email *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="email"
                    required
                    value={joinEmail}
                    onChange={(e) => setJoinEmail(e.target.value)}
                    placeholder="e.g. yourname@company.com"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative rounded-xl shadow-2xs">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="h-4 w-4 text-slate-400" />
                  </div>
                  <input
                    type="password"
                    required
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Choose a password"
                    className="block w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:bg-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  Password must be at least 8 characters and contain at least one letter and one number.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Requested Role *
                  </label>
                  <select
                    value={joinRole}
                    onChange={(e) => setJoinRole(e.target.value as any)}
                    className="block w-full py-2 px-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-hidden focus:border-amber-500"
                  >
                    <option value="SITE_ENGINEER">Site Engineer</option>
                    <option value="PROJECT_MANAGER">Project Manager</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={joinPhone}
                    onChange={(e) => setJoinPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="block w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Job Title / Designation
                </label>
                <input
                  type="text"
                  value={joinTitle}
                  onChange={(e) => setJoinTitle(e.target.value)}
                  placeholder="e.g. Senior Project Manager / Quality Engineer"
                  className="block w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-hidden focus:border-amber-500"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-400 transition cursor-pointer"
                >
                  <UserPlus className="mr-2 h-4 w-4 stroke-[2.5]" />
                  <span>{isSubmitting ? 'Submitting Request...' : 'Submit Join Request'}</span>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Footer Note */}
        <p className="text-center text-xs text-slate-500 mt-6">
          SITEPOINT Enterprise Construction Management • Authorized Personnel Only
        </p>
      </div>
    </div>
  );
};
