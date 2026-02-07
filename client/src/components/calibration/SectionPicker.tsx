import { type PanelSectionSummary } from '@/hooks/use-panel-section-summary';

interface SectionPickerProps {
  sections: PanelSectionSummary[] | undefined;
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function SectionPicker({ sections, selectedId, onSelect }: SectionPickerProps) {
  const mappedCount = sections?.filter((s) => s.svgX != null).length ?? 0;
  const totalCount = sections?.length ?? 0;

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
          return (
            <button
              key={s.id}
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
              <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                {s.componentCount} components
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
