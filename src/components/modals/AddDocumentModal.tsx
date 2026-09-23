import React, { useState } from 'react';
import { DocumentCategory } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, FileUp } from 'lucide-react';

interface Props {
  defaultSiteId?: string;
  onClose: () => void;
}

export const AddDocumentModal: React.FC<Props> = ({ defaultSiteId, onClose }) => {
  const { sites, currentSite, addDocument } = useApp();
  const [siteId, setSiteId] = useState(defaultSiteId || currentSite?.id || sites[0]?.id);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DocumentCategory>('Drawings');
  const [fileType, setFileType] = useState('PDF');
  const [fileSize, setFileSize] = useState('4.8 MB');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const siteObj = sites.find((s) => s.id === siteId);
    addDocument({
      siteId,
      title,
      category,
      fileSize,
      fileType,
      uploadedBy: siteObj ? `${siteObj.siteEngineer} (SE)` : 'Site Engineer',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in duration-150">
        <div className="flex items-center justify-between bg-slate-900 px-6 py-4 text-white">
          <div className="flex items-center space-x-2">
            <FileUp className="h-5 w-5 text-amber-400" />
            <h3 className="text-lg font-bold tracking-tight">Upload Site Document</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-white/80 hover:bg-slate-800 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Target Site</label>
            <select
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
              required
            >
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">
              Document Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Structural Slab Rebar Schedule, Delivery Challan #8821"
              className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as DocumentCategory)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
              >
                <option value="Drawings">Drawings</option>
                <option value="Bills">Bills & Invoices</option>
                <option value="Material documents">Material test / Challans</option>
                <option value="Contracts">Contracts & Bonds</option>
                <option value="Reports">Reports & Audits</option>
                <option value="Safety documents">Safety documents</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase text-slate-700 mb-1">Format</label>
              <select
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900"
              >
                <option value="PDF">PDF Document</option>
                <option value="DWG">DWG / CAD Drawing</option>
                <option value="XLSX">Excel Spreadsheet</option>
                <option value="DOCX">Word Document</option>
                <option value="IMG">Image / Scan</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
            <FileUp className="h-8 w-8 text-slate-400 mx-auto mb-2" />
            <div className="text-sm font-semibold text-slate-700">Drag & Drop file or click to browse</div>
            <div className="text-xs text-slate-500 mt-1">Simulated document will be saved to site repository</div>
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
              Save Document
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
