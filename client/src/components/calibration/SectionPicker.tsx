import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { type PanelSectionSummary } from '@/hooks/use-panel-section-summary';
import { api } from '@/lib/api';

interface SectionPickerProps {
  sections: PanelSectionSummary[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function SectionPicker({ sections, selectedId, onSelect }: SectionPickerProps) {
  const mappedCount = sections?.filter((s) => s.svgX != null).length ?? 0;
  const totalCount = sections?.length ?? 0;

  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSourceMsn, setNewSourceMsn] = useState('');
  const [newOwned, setNewOwned] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: (data: { name: string; slug: string; sourceMsn?: string; owned: boolean }) =>
      api.post('/panel-sections', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
      queryClient.invalidateQueries({ queryKey: ['panel-sections', 'summary'] });
      toast.success('Section created');
      resetForm();
    },
    onError: (err: Error) => {
      toast.error(`Failed to create section: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/panel-sections/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['panel-sections'] });
      queryClient.invalidateQueries({ queryKey: ['panel-sections', 'summary'] });
      toast.success('Section deleted');
      setDeleteConfirmId(null);
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete section: ${err.message}`);
      setDeleteConfirmId(null);
    },
  });

  function resetForm() {
    setShowAddForm(false);
    setNewName('');
    setNewSourceMsn('');
    setNewOwned(false);
  }

  function handleCreate() {
    const slug = slugify(newName);
    if (!newName.trim() || !slug) return;
    createMutation.mutate({
      name: newName.trim(),
      slug,
      ...(newSourceMsn.trim() ? { sourceMsn: newSourceMsn.trim() } : {}),
      owned: newOwned,
    });
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Calibration Progress</span>
          <span className="font-medium text-slate-200">
            {mappedCount} / {totalCount}
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-700 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-300"
            style={{ width: totalCount > 0 ? `${(mappedCount / totalCount) * 100}%` : '0%' }}
          />
        </div>
      </div>

      {/* Section list */}
      <div className="flex-1 overflow-y-auto">
        {sections?.map((s) => {
          const isMapped = s.svgX != null;
          const isSelected = s.id === selectedId;
          const canDelete = s.componentCount === 0;
          return (
            <div key={s.id} className="group relative">
              <button
                type="button"
                className={`w-full text-left px-3 py-2 flex items-center gap-2 text-xs transition-colors duration-100 ${
                  isSelected
                    ? 'bg-blue-500/20 text-blue-200'
                    : 'hover:bg-slate-700/50 text-slate-300'
                }`}
                onClick={() => onSelect(s.id)}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                    isMapped ? 'bg-green-500' : 'bg-slate-600'
                  }`}
                />
                <span className="truncate">{s.name}</span>
                {s.owned && (
                  <span className="text-[9px] px-1 py-0.5 rounded bg-emerald-500/20 text-emerald-400 shrink-0">
                    owned
                  </span>
                )}
                <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                  {s.componentCount} components
                </span>
              </button>
              {/* Delete button — only for empty sections */}
              {canDelete && (
                <>
                  {deleteConfirmId === s.id ? (
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center gap-1">
                      <button
                        type="button"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        onClick={() => deleteMutation.mutate(s.id)}
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        className="text-[10px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-400 hover:bg-slate-600"
                        onClick={() => setDeleteConfirmId(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-opacity"
                      title="Delete section"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirmId(s.id);
                      }}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 16 16"
                        fill="currentColor"
                        className="w-3.5 h-3.5"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5A.75.75 0 0 1 9.95 6Z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </button>
                  )}
                </>
              )}
            </div>
          );
        })}
      </div>

      {/* Add section */}
      <div className="border-t border-slate-700">
        {showAddForm ? (
          <div className="p-3 space-y-2">
            <input
              type="text"
              placeholder="Section name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreate();
                if (e.key === 'Escape') resetForm();
              }}
            />
            {newName.trim() && (
              <div className="text-[10px] text-slate-500">
                Slug: {slugify(newName)}
              </div>
            )}
            <input
              type="text"
              placeholder="Source MSN (optional)"
              value={newSourceMsn}
              onChange={(e) => setNewSourceMsn(e.target.value)}
              className="w-full text-xs bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
            />
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={newOwned}
                onChange={(e) => setNewOwned(e.target.checked)}
                className="rounded border-slate-600"
              />
              Owned
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 text-xs px-2 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-500 disabled:opacity-50"
                disabled={!newName.trim() || !slugify(newName) || createMutation.isPending}
                onClick={handleCreate}
              >
                {createMutation.isPending ? 'Creating...' : 'Add Section'}
              </button>
              <button
                type="button"
                className="text-xs px-2 py-1.5 rounded bg-slate-700 text-slate-300 hover:bg-slate-600"
                onClick={resetForm}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className="w-full px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 transition-colors"
            onClick={() => setShowAddForm(true)}
          >
            + Add Section
          </button>
        )}
      </div>
    </div>
  );
}
