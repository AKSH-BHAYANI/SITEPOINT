import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { CreateSiteInput } from '../../types';
import { X, Building2, Calendar, User, MapPin, DollarSign, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
  onSuccess?: (newSiteId: string) => void;
}

export const NewSiteModal: React.FC<Props> = ({ onClose, onSuccess }) => {
  const { createSite, companyUsers } = useApp();

  const activeManagers = companyUsers.filter((u) => u.role === 'PROJECT_MANAGER' && u.membershipStatus === 'ACTIVE');
  const activeEngineers = companyUsers.filter((u) => u.role === 'SITE_ENGINEER' && u.membershipStatus === 'ACTIVE');

  const [name, setName] = useState('');
  const [projectType, setProjectType] = useState<'Residential' | 'Commercial' | 'Infrastructure' | 'Industrial' | 'Institutional'>('Residential');
  const [location, setLocation] = useState('');
  const [client, setClient] = useState('');
  const [projectManagerId, setProjectManagerId] = useState(activeManagers[0]?.id || '');
  const [projectManager, setProjectManager] = useState(activeManagers[0]?.name || 'Unassigned Project Manager');
  const [siteEngineerId, setSiteEngineerId] = useState(activeEngineers[0]?.id || '');
  const [siteEngineer, setSiteEngineer] = useState(activeEngineers[0]?.name || 'Unassigned Site Engineer');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [targetEndDate, setTargetEndDate] = useState(
    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [budget, setBudget] = useState('');
  const [description, setDescription] = useState('');
  const [initialTaskName, setInitialTaskName] = useState('Site mobilization and perimeter setup');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !location.trim() || !client.trim()) return;

    setError(null);
    setIsSubmitting(true);

    // Generate code from initials of name
    const initials = name
      .trim()
      .split(' ')
      .map(w => w[0]?.toUpperCase())
      .join('')
      .slice(0, 4) || 'SITE';
    const code = `${initials}-${Math.floor(10 + Math.random() * 90)}`;

    const sitePayload: CreateSiteInput = {
      name: name.trim(),
      code,
      location: location.trim(),
      client: client.trim(),
      projectManager,
      siteEngineer,
      projectManagerId: projectManagerId || undefined,
      siteEngineerId: siteEngineerId || undefined,
      projectType,
      startDate,
      targetEndDate,
      status: 'Active',
      initialBudget: budget.trim() ? budget.trim() : undefined,
      description: description.trim() ? description.trim() : undefined,
      initialTasks: initialTaskName.trim()
        ? [
            {
              name: initialTaskName.trim(),
              description: 'Initial site mobilization, boundary survey, and safety fencing setup.',
              assignedTeam: 'Civil Mobilization Crew',
              labourType: 'Helper',
              location: 'Site Perimeter',
              startDate,
              expectedDate: startDate,
              status: 'In Progress',
              isToday: true,
            },
          ]
        : undefined,
    };

    try {
      const createdSite = await createSite(sitePayload);
      const newId = createdSite?.id || sitePayload.code || name;
      onSuccess?.(newId);
      onClose();
    } catch (err: any) {
      // Keep modal open
      // Show a clear user-facing error message without exposing SQL/secrets
      let safeMsg = 'Please verify your inputs and try again.';
      if (err?.message) {
        const msg = String(err.message);
        if (
          !msg.includes('SELECT') &&
          !msg.includes('INSERT') &&
          !msg.includes('UPDATE') &&
          !msg.includes('DELETE') &&
          !msg.includes('syntax error') &&
          !msg.includes('violates') &&
          !msg.includes('password') &&
          !msg.includes('secret') &&
          !msg.includes('at ')
        ) {
          safeMsg = msg;
        }
      }
      setError(`Failed to create site: ${safeMsg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold tracking-tight">Create New Construction Site</h3>
              <p className="text-xs text-slate-400">Initialize site tracking, baseline resources, and assignment</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-white/80 hover:bg-slate-800 hover:text-white transition cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {/* Site Name & Project Type */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Site / Project Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Skyline Pinnacle Tower"
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Project Type <span className="text-rose-500">*</span>
              </label>
              <select
                value={projectType}
                onChange={(e) => setProjectType(e.target.value as any)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
              >
                <option value="Residential">Residential</option>
                <option value="Commercial">Commercial</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Industrial">Industrial</option>
                <option value="Institutional">Institutional</option>
              </select>
            </div>
          </div>

          {/* Location & Client */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Location / Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <MapPin className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Plot 14, Sector 62, Metro Corridor"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Client / Developer <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <User className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. Prestige Urban Real Estate"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>
          </div>

          {/* Assigned Project Manager & Site Engineer */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Assigned Project Manager <span className="text-rose-500">*</span>
              </label>
              {activeManagers.length > 0 ? (
                <select
                  value={projectManagerId}
                  onChange={(e) => {
                    const selected = activeManagers.find((m) => m.id === e.target.value);
                    if (selected) {
                      setProjectManagerId(selected.id);
                      setProjectManager(selected.name);
                    } else {
                      setProjectManagerId('');
                      setProjectManager('Unassigned Project Manager');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  {activeManagers.map((mgr) => (
                    <option key={mgr.id} value={mgr.id}>
                      {mgr.name} ({mgr.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500">
                  Unassigned Project Manager
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Assigned Site Engineer <span className="text-rose-500">*</span>
              </label>
              {activeEngineers.length > 0 ? (
                <select
                  value={siteEngineerId}
                  onChange={(e) => {
                    const selected = activeEngineers.find((eng) => eng.id === e.target.value);
                    if (selected) {
                      setSiteEngineerId(selected.id);
                      setSiteEngineer(selected.name);
                    } else {
                      setSiteEngineerId('');
                      setSiteEngineer('Unassigned Site Engineer');
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                >
                  {activeEngineers.map((eng) => (
                    <option key={eng.id} value={eng.id}>
                      {eng.name} ({eng.email})
                    </option>
                  ))}
                </select>
              ) : (
                <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500">
                  Unassigned Site Engineer
                </div>
              )}
            </div>
          </div>

          {/* Start Date, Target End Date & Estimated Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Start Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Target End Date <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Calendar className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="date"
                  value={targetEndDate}
                  onChange={(e) => setTargetEndDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
                Project Budget
              </label>
              <div className="relative">
                <DollarSign className="h-4 w-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder="e.g. $4.5M or ₹35 Cr"
                  className="w-full rounded-xl border border-slate-300 bg-white pl-9 pr-3.5 py-2 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Initial Kickoff Task */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Initial Kickoff Task
            </label>
            <input
              type="text"
              value={initialTaskName}
              onChange={(e) => setInitialTaskName(e.target.value)}
              placeholder="e.g. Mobilization and boundary fencing"
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Initial materials (cement, steel, aggregate) and labour rosters will automatically be provisioned.
            </p>
          </div>

          {/* Description / Scope */}
          <div>
            <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
              Site Scope &amp; Description
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the construction scope (e.g. G+14 residential tower with underground parking and amenities block)."
              className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-medium text-slate-900 focus:border-amber-500 focus:outline-hidden"
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-800 flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-500 hover:bg-amber-600 px-5 py-2.5 text-xs font-bold text-slate-950 transition shadow-xs flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{isSubmitting ? 'Creating Site...' : 'Create Construction Site'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
