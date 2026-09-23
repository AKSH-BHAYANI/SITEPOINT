import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { TrendingUp, Package, Users, Truck, CheckCircle2, Filter, Layers } from 'lucide-react';

interface Props {
  initialSiteId?: string;
  allowComparison?: boolean;
}

export const GraphicalDashboard: React.FC<Props> = ({ initialSiteId, allowComparison = true }) => {
  const { sites, tasks, materials, labour, equipment } = useApp();

  // Active comparison filter: 'all' or specific site ID
  const [selectedSiteFilter, setSelectedSiteFilter] = useState<string>(initialSiteId || 'all');

  // Filtered sites based on selection
  const activeSites = sites.filter((s) => s.status !== 'Completed');
  const targetSites = selectedSiteFilter === 'all'
    ? (sites.length > 0 ? sites : [])
    : sites.filter((s) => s.id === selectedSiteFilter);

  const targetSiteIds = targetSites.map((s) => s.id);

  // Filtered tasks, materials, labour, equipment strictly isolated by site ID
  const relevantTasks = tasks.filter((t) => targetSiteIds.includes(t.siteId));
  const relevantMaterials = materials.filter((m) => targetSiteIds.includes(m.siteId));
  const relevantLabour = labour.filter((l) => targetSiteIds.includes(l.siteId));
  const relevantEquipment = selectedSiteFilter === 'all'
    ? equipment
    : equipment.filter((e) => e.currentSiteId === selectedSiteFilter);

  // 1. Overall Site Progress Comparison
  const siteProgressData = targetSites.map((s) => {
    // Shorten name cleanly for mobile without ellipsis truncation defects
    const shortName = s.name.length > 14 ? s.name.slice(0, 13) + '…' : s.name;
    return {
      name: shortName,
      fullName: s.name,
      code: s.code,
      progress: s.progressPercent,
      status: s.status,
      fill: s.status === 'Completed' ? '#10b981' : s.status === 'On Hold' ? '#f59e0b' : '#3b82f6',
    };
  });

  // 2. Material Stock vs Usage (Aggregated across target sites)
  const materialAggregates: { [key: string]: { name: string; currentStock: number; usedQty: number; unit: string } } = {};
  relevantMaterials.forEach((m) => {
    const key = m.category || m.name.split(' ')[0];
    if (!materialAggregates[key]) {
      materialAggregates[key] = { name: key, currentStock: 0, usedQty: 0, unit: m.unit };
    }
    materialAggregates[key].currentStock += m.currentStock;
    materialAggregates[key].usedQty += m.usedQty;
  });
  const materialChartData = Object.values(materialAggregates).slice(0, 6);

  // 3. Labour Distribution (By Site or By Trade Category)
  const labourData = selectedSiteFilter === 'all'
    ? targetSites.map((s) => {
        const sLabour = relevantLabour.filter((l) => l.siteId === s.id);
        const present = sLabour.reduce((acc, curr) => acc + curr.present, 0);
        const required = sLabour.reduce((acc, curr) => acc + curr.required, 0);
        const short = s.name.split(' ')[0];
        return {
          label: short,
          fullName: s.name,
          present,
          shortage: Math.max(0, required - present),
        };
      })
    : relevantLabour.map((l) => ({
        label: l.type,
        fullName: `${l.type} (${l.contractor || 'General'})`,
        present: l.present,
        shortage: Math.max(0, l.required - l.present),
      }));

  // 4. Equipment Status Distribution
  const equipStatusCounts = {
    Available: relevantEquipment.filter((e) => e.status === 'Available').length,
    'In Use': relevantEquipment.filter((e) => e.status === 'In Use').length,
    Maintenance: relevantEquipment.filter((e) => e.status === 'Maintenance').length,
    Breakdown: relevantEquipment.filter((e) => e.status === 'Breakdown').length,
  };
  const equipData = [
    { name: 'Available', value: equipStatusCounts.Available, color: '#10b981' },
    { name: 'In Use', value: equipStatusCounts['In Use'], color: '#0284c7' },
    { name: 'Maintenance', value: equipStatusCounts.Maintenance, color: '#f59e0b' },
    { name: 'Breakdown', value: equipStatusCounts.Breakdown, color: '#ef4444' },
  ].filter((item) => item.value > 0);

  // 5. Task Status Distribution
  const taskStatusCounts = {
    Completed: relevantTasks.filter((t) => t.status === 'Completed').length,
    'In Progress': relevantTasks.filter((t) => t.status === 'In Progress').length,
    Pending: relevantTasks.filter((t) => t.status === 'Pending').length,
    Delayed: relevantTasks.filter((t) => t.status === 'Delayed').length,
  };
  const taskData = [
    { name: 'Completed', count: taskStatusCounts.Completed, fill: '#10b981' },
    { name: 'In Progress', count: taskStatusCounts['In Progress'], fill: '#0284c7' },
    { name: 'Pending', count: taskStatusCounts.Pending, fill: '#64748b' },
    { name: 'Delayed', count: taskStatusCounts.Delayed, fill: '#ef4444' },
  ];

  return (
    <div className="space-y-6">
      {/* Header & Site Scope Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-amber-500" />
            <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
              Operational Graphical Analytics
            </h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Real-time visual benchmarks for site progress, materials, labour, machinery, and tasks.
          </p>
        </div>

        {/* Site comparison switcher (Boss & PM dashboard) */}
        {allowComparison && (
          <div className="flex items-center space-x-2 shrink-0">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              aria-label="Filter visual metrics by site"
              value={selectedSiteFilter}
              onChange={(e) => setSelectedSiteFilter(e.target.value)}
              className="bg-slate-50 border border-slate-300 hover:border-amber-500 text-slate-800 text-xs font-bold rounded-xl px-3 py-2 pr-7 focus:outline-hidden focus:border-amber-500 cursor-pointer"
            >
              <option value="all">📊 All Sites Comparison ({sites.length})</option>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  📍 {s.name} ({s.status})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Grid of 5 Clear, Focused Visual Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Graph 1: Overall Site Progress Benchmark */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Site Progress (%)</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {targetSites.length} {targetSites.length === 1 ? 'Site Selected' : 'Sites Compared'}
            </span>
          </div>
          <div className="h-64 w-full">
            {siteProgressData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No site progress data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={siteProgressData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748b' }} unit="%" />
                  <Tooltip
                    formatter={(value: any, name: any, item: any) => [
                      `${value}% Complete (${item.payload.status || 'Active'})`,
                      item.payload.fullName || 'Progress',
                    ]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="progress" fill="#f59e0b" radius={[6, 6, 0, 0]}>
                    {siteProgressData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 2: Material Stock vs Usage */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 text-sm">Material Stock vs. Used</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {relevantMaterials.length} Tracked Items
            </span>
          </div>
          <div className="h-64 w-full">
            {materialChartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No materials data logged for this selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={materialChartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value}`, name]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="currentStock" name="Current In-Stock" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="usedQty" name="Qty Consumed" fill="#64748b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 3: Labour Deployment & Shortages */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Users className="h-4 w-4 text-sky-500" />
              <h3 className="font-bold text-slate-900 text-sm">
                Labour Distribution {selectedSiteFilter === 'all' ? '(By Site)' : '(By Trade)'}
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {relevantLabour.reduce((acc, curr) => acc + curr.present, 0)} Present On-Site
            </span>
          </div>
          <div className="h-64 w-full">
            {labourData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No labour headcount data logged.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={labourData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <XAxis
                    dataKey="label"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} Workers`, name]}
                    labelFormatter={(label, items) => items?.[0]?.payload?.fullName || label}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="present" name="Present On-Site" fill="#0284c7" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="shortage" name="Shortage" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 4: Equipment Status Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <Truck className="h-4 w-4 text-amber-500" />
              <h3 className="font-bold text-slate-900 text-sm">Machinery &amp; Equipment Status</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {relevantEquipment.length} Total Units
            </span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {equipData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No machinery allocated to this site selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={equipData}
                    cx="50%"
                    cy="48%"
                    innerRadius={45}
                    outerRadius={75}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {equipData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any, name: any) => [`${value} Units`, name]}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Graph 5: Task Status Breakdown */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200 shadow-xs lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <h3 className="font-bold text-slate-900 text-sm">Task Execution Status Breakdown</h3>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold">
              {relevantTasks.length} Total Assigned Tasks
            </span>
          </div>
          <div className="h-56 w-full">
            {relevantTasks.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                No tasks logged for this selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={taskData} layout="vertical" margin={{ top: 10, right: 25, left: 20, bottom: 10 }}>
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} allowDecimals={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11, fill: '#475569' }} />
                  <Tooltip
                    formatter={(value: any) => [`${value} Tasks`, 'Count']}
                    contentStyle={{ borderRadius: '12px', fontSize: '12px', border: '1px solid #e2e8f0' }}
                  />
                  <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                    {taskData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
