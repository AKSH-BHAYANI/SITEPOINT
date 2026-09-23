import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Role } from '../types';
import {
  Building2,
  HardHat,
  Crown,
  Briefcase,
  Search,
  RotateCcw,
  MapPin,
  ChevronDown,
  LogOut,
  User,
  ShieldCheck
} from 'lucide-react';

interface Props {
  onOpenSearch: () => void;
  onRequestResource: () => void;
}

export const Header: React.FC<Props> = ({ onOpenSearch, onRequestResource }) => {
  const {
    currentUser,
    logout,
    role,
    setRole,
    sites,
    accessibleSites,
    selectedSiteId,
    setSelectedSiteId,
  } = useApp();

  return (
    <header className="sticky top-0 z-40 bg-slate-900 text-white shadow-lg border-b border-slate-800">
      {/* Top Bar: Brand, Role Badge, Site Selector, User Profile, Quick Actions */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between py-3 gap-3">
          
          {/* Logo & Tagline */}
          <div className="flex items-center justify-between w-full md:w-auto">
            <div
              onClick={() => {
                if (role === 'SITE_ENGINEER') {
                  setSelectedSiteId('site-1');
                } else {
                  setSelectedSiteId(null);
                }
              }}
              className="flex items-center space-x-3 cursor-pointer group"
            >
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md shadow-amber-500/20 group-hover:scale-105 transition">
                <Building2 className="h-6 w-6 text-slate-950 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-black tracking-wider text-white">SITEPOINT</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">
                    Enterprise
                  </span>
                </div>
                <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                  “One place to manage every construction site.”
                </div>
              </div>
            </div>

            {/* Mobile-only search and logout */}
            <div className="flex items-center space-x-2 md:hidden">
              <button
                onClick={onOpenSearch}
                aria-label="Open search"
                className="p-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white"
              >
                <Search className="h-4 w-4" />
              </button>
              <button
                onClick={logout}
                title="Log Out"
                className="p-2 rounded-xl bg-slate-800 text-rose-400 hover:text-rose-300"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Center/Right: Role-specific site switcher & Quick controls */}
          <div className="flex items-center flex-wrap justify-center gap-2.5 w-full md:w-auto">
            
            {/* SITE SELECTOR - STRICTLY ROLE-BASED */}
            {role === 'BOSS' && (
              <div className="relative">
                <select
                  aria-label="Select construction site"
                  value={selectedSiteId || ''}
                  onChange={(e) => setSelectedSiteId(e.target.value || null)}
                  className="bg-slate-800 border border-slate-700 hover:border-amber-500/60 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-hidden focus:border-amber-500 cursor-pointer appearance-none transition"
                >
                  <option value="">🏢 All Sites (Company)</option>
                  {sites.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            )}

            {role === 'PROJECT_MANAGER' && (
              <div className="relative">
                <select
                  aria-label="Select assigned construction site"
                  value={selectedSiteId || ''}
                  onChange={(e) => setSelectedSiteId(e.target.value || null)}
                  className="bg-slate-800 border border-sky-700/60 hover:border-sky-400 text-sky-100 text-xs font-semibold rounded-xl px-3 py-2 pr-8 focus:outline-hidden focus:border-sky-500 cursor-pointer appearance-none transition"
                >
                  <option value="">🏢 Assigned Sites Overview</option>
                  {accessibleSites.map((s) => (
                    <option key={s.id} value={s.id}>
                      📍 {s.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-sky-400 absolute right-2.5 top-3 pointer-events-none" />
              </div>
            )}

            {role === 'SITE_ENGINEER' && (
              /* Site Engineer has only one assigned site: DO NOT show site selector dropdown! */
              <div className="flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-slate-800/90 border border-emerald-500/30 text-emerald-300 text-xs font-semibold shadow-xs">
                <MapPin className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                <span>Assigned Site: <strong>{accessibleSites[0]?.name || 'Riverside Tower'}</strong></span>
              </div>
            )}

            {/* Search Button */}
            <button
              onClick={onOpenSearch}
              className="hidden md:flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3 py-2 rounded-xl text-xs text-slate-300 transition cursor-pointer"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span>Search...</span>
              <kbd className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-slate-400 border border-slate-700">
                /
              </kbd>
            </button>

            {/* User Account Profile & Secure Sign Out */}
            <div className="flex items-center bg-slate-800 rounded-xl border border-slate-700 p-1">
              <div className="flex items-center space-x-2 px-2.5 py-1">
                <div
                  className={`w-2.5 h-2.5 rounded-full ${
                    role === 'BOSS'
                      ? 'bg-amber-400'
                      : role === 'PROJECT_MANAGER'
                      ? 'bg-sky-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <div className="text-left leading-none">
                  <div className="text-xs font-bold text-white flex items-center gap-1">
                    <span>{currentUser?.name || currentUser?.email || 'User'}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    {currentUser?.title || (role === 'BOSS' ? 'Boss / Owner' : role === 'PROJECT_MANAGER' ? 'Project Manager' : 'Site Engineer')}
                  </div>
                </div>
              </div>

              {/* Logout Button */}
              <button
                type="button"
                onClick={logout}
                title="Sign Out"
                className="ml-1 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition flex items-center space-x-1 cursor-pointer"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Role Banner / Context Bar */}
      <div className="bg-slate-950/70 border-t border-slate-800/80 px-4 sm:px-6 lg:px-8 py-1.5 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>
              {role === 'BOSS' && (
                <>
                  Logged in as <strong className="text-amber-300 font-bold">{currentUser?.name || currentUser?.email}</strong> (Company Owner / MD) — Full oversight across all {sites.length} sites.
                </>
              )}
              {role === 'PROJECT_MANAGER' && (
                <>
                  Logged in as <strong className="text-sky-300 font-bold">{currentUser?.name || currentUser?.email}</strong> (Project Manager) — Oversight across {accessibleSites.length} assigned sites.
                </>
              )}
              {role === 'SITE_ENGINEER' && (
                <>
                  Logged in as <strong className="text-emerald-300 font-bold">{currentUser?.name || currentUser?.email}</strong> (Site Engineer) — Assigned to {accessibleSites[0]?.name || 'site'}.
                </>
              )}
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            {selectedSiteId && (
              <button
                onClick={() => {
                  if (role === 'SITE_ENGINEER') {
                    setSelectedSiteId('site-1');
                  } else {
                    setSelectedSiteId(null);
                  }
                }}
                className="text-amber-400 hover:underline font-semibold"
              >
                {role === 'BOSS'
                  ? '← Back to Company Dashboard'
                  : role === 'PROJECT_MANAGER'
                  ? '← Back to Assigned Sites Console'
                  : 'Site Duty: Riverside Tower'}
              </button>
            )}
            <span className="text-slate-500">|</span>
            <span className="text-slate-400">
              SITEPOINT Central • {role === 'BOSS' ? `${sites.length} Active Sites` : role === 'PROJECT_MANAGER' ? `${accessibleSites.length} Assigned Sites` : '1 Assigned Site'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};

