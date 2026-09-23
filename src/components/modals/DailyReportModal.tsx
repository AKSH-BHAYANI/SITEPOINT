import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { X, FileText, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  defaultSiteId?: string;
  onClose: () => void;
}

export const DailyReportModal: React.FC<Props> = ({ defaultSiteId, onClose }) => {
  const { sites, currentSite, tasks, labour, equipment, addDailyReport } = useApp();
  const siteId = defaultSiteId || currentSite?.id || sites[0]?.id;
  const site = sites.find((s) => s.id === siteId);

  const siteTasks = tasks.filter((t) => t.siteId === siteId);
  const completedTaskNames = siteTasks.filter((t) => t.status === 'Completed').map((t) => t.name);
  const pendingTaskNames = siteTasks.filter((t) => t.status === 'Pending' || t.status === 'In Progress').map((t) => t.name);
  const delayedTaskNames = siteTasks.filter((t) => t.status === 'Delayed').map((t) => `${t.name} (${t.delayReason || 'Delayed'})`);

  const siteLabour = labour.filter((l) => l.siteId === siteId);
  const totalLabourPresent = siteLabour.reduce((acc, curr) => acc + curr.present, 0);

  const siteEquip = equipment.filter((eq) => eq.currentSiteId === siteId && eq.status === 'In Use').map((eq) => eq.name);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [remarks, setRemarks] = useState('All active work progressing according to structural tolerances. Concrete pouring reschedule prepared.');
  const [materialsUsedText, setMaterialsUsedText] = useState('Cement OPC: 60 bags, Fly ash bricks: 1200 pcs, Diesel: 80L');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!site) return;

    // Parse simple materials
    const materialsUsed = materialsUsedText.split(',').map((item) => {
      const parts = item.trim().split(':');
      return {
        materialName: parts[0]?.trim() || 'General Material',
        quantity: 1,
        unit: parts[1]?.trim() || 'Units',
      };
    });

    addDailyReport({
      siteId,
      date,
      engineerName: site.siteEngineer,
      completedTasks: completedTaskNames.length > 0 ? completedTaskNames : ['Site layout and leveling'],
      pendingTasks: pendingTaskNames.length > 0 ? pendingTaskNames : ['None'],
      delayedTasks: delayedTaskNames,
      materialsUsed,
      labourPresentCount: totalLabourPresent || 45,
      equipmentUsed: siteEquip.length > 0 ? siteEquip : ['Tower Crane TC-50'],
      problemsSummary: delayedTaskNames.length > 0 ? delayedTaskNames : ['No major bottlenecks today'],
      remarks,
      photos: [
        'https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?auto=format&fit=crop&w=800&q=80',
        'https://images.unsplash.com/photo-1590381105924-c72589b9ef3f?auto=format&fit=crop&w=800&q=80',
      ],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <FileText className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold tracking-tight">Generate Daily Site Report</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
            <div className="text-xs font-semibold uppercase text-slate-500">Site & Engineer</div>
            <div className="text-base font-bold text-slate-900">{site?.name}</div>
            <div className="text-xs text-slate-600">Filed by: {site?.siteEngineer} (Site Engineer)</div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Report Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              required
            />
          </div>

          {/* Auto-compiled tasks summary */}
          <div className="space-y-2 text-xs">
            <div className="font-semibold uppercase text-slate-600">Tasks Auto-Summary:</div>
            
            <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2.5">
              <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                Completed ({completedTaskNames.length}):
              </div>
              <p className="text-emerald-800">
                {completedTaskNames.length > 0 ? completedTaskNames.join(', ') : 'None marked completed yet'}
              </p>
            </div>

            {delayedTaskNames.length > 0 && (
              <div className="rounded-lg bg-rose-50 border border-rose-200 p-2.5">
                <div className="font-bold text-rose-900 flex items-center gap-1.5 mb-1">
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  Delayed / Bottlenecks ({delayedTaskNames.length}):
                </div>
                <p className="text-rose-800">{delayedTaskNames.join('; ')}</p>
              </div>
            )}

            <div className="rounded-lg bg-slate-50 border border-slate-200 p-2.5">
              <div className="font-bold text-slate-900 flex items-center gap-1.5 mb-1">
                <Clock className="h-4 w-4 text-slate-600" />
                Pending / In Progress ({pendingTaskNames.length}):
              </div>
              <p className="text-slate-700">
                {pendingTaskNames.length > 0 ? pendingTaskNames.join(', ') : 'None pending'}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Materials Consumed Today
            </label>
            <input
              type="text"
              value={materialsUsedText}
              onChange={(e) => setMaterialsUsedText(e.target.value)}
              placeholder="e.g. Cement: 60 bags, Steel: 1.5 tonnes"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-600 block">Total Labour Present</span>
              <span className="text-base font-bold text-slate-900">{totalLabourPresent} workers</span>
            </div>
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="font-semibold text-slate-600 block">Equipment Active</span>
              <span className="text-base font-bold text-slate-900">{siteEquip.length || 2} units</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Engineer Remarks & Next Day Plan <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              required
            />
          </div>

          <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-xl bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-amber-700 transition"
            >
              Submit Daily Report
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
