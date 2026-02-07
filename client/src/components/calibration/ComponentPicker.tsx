import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';

interface ComponentInstance {
  id: string;
  name: string;
  mapX: number | null;
  componentType: { id: string; name: string };
  panelSection: { id: string; name: string };
}

interface ComponentPickerProps {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function ComponentPicker({ selectedId, onSelect }: ComponentPickerProps) {
  const [search, setSearch] = useState('');
  const [unmappedOnly, setUnmappedOnly] = useState(false);

  const { data: components } = useQuery<ComponentInstance[]>({
    queryKey: ['component-instances'],
    queryFn: () => api.get('/component-instances'),
  });

  const { grouped, mappedCount, totalCount } = useMemo(() => {
    if (!components) return { grouped: new Map<string, ComponentInstance[]>(), mappedCount: 0, totalCount: 0 };

    let mapped = 0;
    const filtered = components.filter((c) => {
      const isMapped = c.mapX != null;
      if (isMapped) mapped++;
      if (unmappedOnly && isMapped) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.componentType.name.toLowerCase().includes(q) ||
          c.panelSection.name.toLowerCase().includes(q)
        );
      }
      return true;
    });

    const groups = new Map<string, ComponentInstance[]>();
    for (const c of filtered) {
      const section = c.panelSection.name;
      const existing = groups.get(section);
      if (existing) {
        existing.push(c);
      } else {
        groups.set(section, [c]);
      }
    }

    return { grouped: groups, mappedCount: mapped, totalCount: components.length };
  }, [components, search, unmappedOnly]);

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-3 py-2 border-b border-slate-700">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Mapping Progress</span>
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

      {/* Filters */}
      <div className="px-3 py-2 border-b border-slate-700 flex flex-col gap-2">
        <Input
          placeholder="Search components..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-8 text-xs"
        />
        <label className="flex items-center gap-2 text-xs text-slate-400 cursor-pointer">
          <input
            type="checkbox"
            checked={unmappedOnly}
            onChange={(e) => setUnmappedOnly(e.target.checked)}
            className="rounded border-slate-600"
          />
          Unmapped only
        </label>
      </div>

      {/* Component list */}
      <div className="flex-1 overflow-y-auto">
        {[...grouped.entries()].map(([section, items]) => (
          <div key={section}>
            <div className="px-3 py-1.5 text-[10px] text-slate-500 uppercase tracking-wider bg-slate-800/50 sticky top-0">
              {section}
            </div>
            {items.map((c) => {
              const isMapped = c.mapX != null;
              const isSelected = c.id === selectedId;
              return (
                <button
                  key={c.id}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 flex items-center gap-2 text-xs transition-colors duration-100 ${
                    isSelected
                      ? 'bg-blue-500/20 text-blue-200'
                      : 'hover:bg-slate-700/50 text-slate-300'
                  }`}
                  onClick={() => onSelect(c.id)}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isMapped ? 'bg-green-500' : 'bg-slate-600'
                    }`}
                  />
                  <span className="truncate">{c.name}</span>
                  <span className="text-[10px] text-slate-500 ml-auto shrink-0">
                    {c.componentType.name}
                  </span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
