import { useState } from 'react';
import { X, Star, Search } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';

import {
  useLvarSearch,
  useLvarSuggestions,
  useUpsertMapping,
  useDeleteMapping,
  type LvarEntry,
} from '@/hooks/use-lvar-reference';

interface LvarPickerProps {
  pinAssignmentId: string;
  currentMapping: {
    id: string;
    variableName: string;
    variableType: string;
    eventType: string | null;
  } | null;
  componentName?: string;
  sectionSlug?: string;
}

export function LvarPicker({
  pinAssignmentId,
  currentMapping,
  componentName,
}: LvarPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: searchResults = [] } = useLvarSearch(search);
  const { data: suggestions = [] } = useLvarSuggestions(
    open ? pinAssignmentId : null,
  );
  const upsertMapping = useUpsertMapping();
  const deleteMapping = useDeleteMapping();

  const handleSelect = (entry: LvarEntry) => {
    upsertMapping.mutate(
      {
        pinAssignmentId,
        variableName: entry.name,
      },
      {
        onSuccess: () => {
          toast.success(`Mapped to ${entry.name}`);
          setOpen(false);
          setSearch('');
        },
        onError: (err) => {
          toast.error(`Failed to save mapping: ${err.message}`);
        },
      },
    );
  };

  const handleFreeText = () => {
    if (!search.trim()) return;
    upsertMapping.mutate(
      {
        pinAssignmentId,
        variableName: search.trim(),
      },
      {
        onSuccess: () => {
          toast.success(`Mapped to ${search.trim()}`);
          setOpen(false);
          setSearch('');
        },
        onError: (err) => {
          toast.error(`Failed to save mapping: ${err.message}`);
        },
      },
    );
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteMapping.mutate(pinAssignmentId, {
      onSuccess: () => {
        toast.success('Mapping removed');
      },
      onError: (err) => {
        toast.error(`Failed to remove mapping: ${err.message}`);
      },
    });
  };

  // Filter suggestions to exclude ones already shown in search results
  const filteredSuggestions =
    search.length >= 2
      ? suggestions.filter(
          (s) => !searchResults.some((r) => r.name === s.name),
        )
      : suggestions;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center gap-1 max-w-[220px] rounded px-1.5 py-0.5 text-left hover:bg-accent transition-colors cursor-pointer group"
          title={
            currentMapping
              ? `${currentMapping.variableName} (${currentMapping.variableType})`
              : componentName
                ? `Click to assign LVAR for "${componentName}"`
                : 'Click to assign LVAR'
          }
        >
          {currentMapping ? (
            <>
              <span className="font-mono text-xs truncate">
                {currentMapping.variableName}
              </span>
              <button
                onClick={handleClear}
                className="shrink-0 size-4 rounded-sm inline-flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-all"
                title="Remove mapping"
              >
                <X className="size-3" />
              </button>
            </>
          ) : (
            <span className="text-muted-foreground text-xs italic">
              click to assign
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search LVARs..."
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>
              {search.length < 2 ? (
                <span className="text-muted-foreground">
                  Type at least 2 characters to search
                </span>
              ) : (
                <div className="space-y-2">
                  <p>No LVARs found</p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleFreeText}
                    disabled={upsertMapping.isPending}
                  >
                    Use "{search}" as custom variable
                  </Button>
                </div>
              )}
            </CommandEmpty>

            {/* Suggestions — shown when picker opens or when search has few results */}
            {filteredSuggestions.length > 0 && (
              <CommandGroup heading="Suggestions">
                {filteredSuggestions.map((entry) => (
                  <CommandItem
                    key={`suggest-${entry.name}`}
                    value={entry.name}
                    onSelect={() => handleSelect(entry)}
                    className="cursor-pointer"
                  >
                    <Star className="size-3 text-amber-500 shrink-0" />
                    <span className="font-mono text-xs truncate">
                      {entry.name}
                    </span>
                    <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                      {entry.sectionLabel.replace('Overhead - ', '')}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {/* Search results */}
            {searchResults.length > 0 && (
              <>
                {filteredSuggestions.length > 0 && <CommandSeparator />}
                <CommandGroup heading="Search Results">
                  {searchResults.map((entry) => (
                    <CommandItem
                      key={`search-${entry.name}`}
                      value={entry.name}
                      onSelect={() => handleSelect(entry)}
                      className="cursor-pointer"
                    >
                      <Search className="size-3 shrink-0 opacity-40" />
                      <span className="font-mono text-xs truncate">
                        {entry.name}
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground shrink-0">
                        {entry.sectionLabel.replace('Overhead - ', '')}
                      </span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}

            {/* Free text option when search has results but user might want custom */}
            {search.length >= 2 && searchResults.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    value={`custom:${search}`}
                    onSelect={handleFreeText}
                    className="cursor-pointer"
                  >
                    <span className="text-xs text-muted-foreground">
                      Use "{search}" as custom variable
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
