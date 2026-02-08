import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import {
  useCreateComponentType,
  useUpdateComponentType,
  type ComponentType,
} from '@/hooks/use-component-types';

interface ComponentTypeFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentType?: ComponentType;
}

export function ComponentTypeForm({
  open,
  onOpenChange,
  componentType,
}: ComponentTypeFormProps) {
  const isEdit = !!componentType;
  const createMutation = useCreateComponentType();
  const updateMutation = useUpdateComponentType();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [defaultPinCount, setDefaultPinCount] = useState(1);
  const [pinLabels, setPinLabels] = useState<string[]>([]);
  const [pinTypes, setPinTypes] = useState<string[]>([]);
  const [pinPowerRails, setPinPowerRails] = useState<string[]>([]);
  const [pinMosfetRequired, setPinMosfetRequired] = useState<boolean[]>([]);
  const [defaultPinMode, setDefaultPinMode] = useState('INPUT');
  const [pwmRequired, setPwmRequired] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (componentType) {
        const count = componentType.defaultPinCount;
        setName(componentType.name);
        setDescription(componentType.description ?? '');
        setDefaultPinCount(count);
        setPinLabels(Array.from({ length: count }, (_, i) => (componentType.pinLabels ?? [])[i] ?? ''));
        setPinTypes(Array.from({ length: count }, (_, i) => (componentType.pinTypes ?? [])[i] ?? 'ANY'));
        setPinPowerRails(Array.from({ length: count }, (_, i) => (componentType.pinPowerRails ?? [])[i] ?? 'NONE'));
        setPinMosfetRequired(Array.from({ length: count }, (_, i) => (componentType.pinMosfetRequired ?? [])[i] ?? false));
        setDefaultPinMode(componentType.defaultPinMode);
        setPwmRequired(componentType.pwmRequired);
        setNotes(componentType.notes ?? '');
      } else {
        setName('');
        setDescription('');
        setDefaultPinCount(1);
        setPinLabels(['']);
        setPinTypes(['ANY']);
        setPinPowerRails(['NONE']);
        setPinMosfetRequired([false]);
        setDefaultPinMode('INPUT');
        setPwmRequired(false);
        setNotes('');
      }
    }
  }, [open, componentType]);

  function handlePinCountChange(count: number) {
    setDefaultPinCount(count);
    setPinLabels((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''));
    setPinTypes((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? 'ANY'));
    setPinPowerRails((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? 'NONE'));
    setPinMosfetRequired((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? false));
  }

  function handlePinLabelChange(index: number, value: string) {
    setPinLabels((prev) => prev.map((l, i) => (i === index ? value : l)));
  }

  function handlePinTypeChange(index: number, value: string) {
    setPinTypes((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      defaultPinCount,
      pinLabels: pinLabels.slice(0, defaultPinCount).map((l) => l.trim()),
      pinTypes: pinTypes.slice(0, defaultPinCount),
      pinPowerRails: pinPowerRails.slice(0, defaultPinCount),
      pinMosfetRequired: pinMosfetRequired.slice(0, defaultPinCount),
      defaultPinMode,
      pwmRequired,
      notes: notes.trim() || null,
    };

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: componentType.id, ...data });
        toast.success('Component type updated');
      } else {
        await createMutation.mutateAsync(data);
        toast.success('Component type created');
      }
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(message);
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Edit Component Type' : 'New Component Type'}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the component type details below.'
              : 'Define a new component type for your panel build.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          {/* Name */}
          <div className="grid gap-2">
            <Label htmlFor="ct-name">Name</Label>
            <Input
              id="ct-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Toggle Switch"
              required
            />
          </div>

          {/* Description */}
          <div className="grid gap-2">
            <Label htmlFor="ct-description">Description</Label>
            <Textarea
              id="ct-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description..."
              rows={2}
            />
          </div>

          {/* Default Pin Count */}
          <div className="grid gap-2">
            <Label htmlFor="ct-pin-count">Default Pin Count</Label>
            <Input
              id="ct-pin-count"
              type="number"
              min={1}
              max={20}
              value={defaultPinCount}
              onChange={(e) => handlePinCountChange(Number(e.target.value))}
              required
            />
          </div>

          {/* Pin Configuration */}
          {defaultPinCount > 0 && (
            <div className="grid gap-2">
              <Label>Pin Configuration</Label>
              <p className="text-xs text-muted-foreground">
                Configure each pin's label, type, power rail, and MOSFET requirement.
              </p>
              <div className="grid gap-1.5">
                {Array.from({ length: defaultPinCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-8 shrink-0 tabular-nums">
                      {i + 1}
                    </span>
                    <Input
                      value={pinLabels[i] ?? ''}
                      onChange={(e) => handlePinLabelChange(i, e.target.value)}
                      placeholder="Label"
                      className="h-8 text-sm flex-1"
                    />
                    <Select
                      value={pinTypes[i] ?? 'ANY'}
                      onValueChange={(v) => handlePinTypeChange(i, v)}
                    >
                      <SelectTrigger className="h-8 w-[72px] text-sm shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIGITAL">Dig</SelectItem>
                        <SelectItem value="ANALOG">Ana</SelectItem>
                        <SelectItem value="ANY">Any</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select
                      value={pinPowerRails[i] ?? 'NONE'}
                      onValueChange={(v) =>
                        setPinPowerRails((prev) => prev.map((r, j) => (j === i ? v : r)))
                      }
                    >
                      <SelectTrigger className="h-8 w-[80px] text-sm shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIVE_V">5V</SelectItem>
                        <SelectItem value="NINE_V">9V</SelectItem>
                        <SelectItem value="TWENTY_SEVEN_V">27V</SelectItem>
                        <SelectItem value="NONE">None</SelectItem>
                      </SelectContent>
                    </Select>
                    <label className="flex items-center gap-1 text-xs text-muted-foreground cursor-pointer shrink-0">
                      <input
                        type="checkbox"
                        checked={pinMosfetRequired[i] ?? false}
                        onChange={(e) =>
                          setPinMosfetRequired((prev) =>
                            prev.map((m, j) => (j === i ? e.target.checked : m)),
                          )
                        }
                        className="size-3.5 rounded border-input accent-primary"
                      />
                      MOSFET
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Pin Mode */}
          <div className="grid gap-2">
            <Label htmlFor="ct-pin-mode">Default Pin Mode</Label>
            <Select value={defaultPinMode} onValueChange={setDefaultPinMode}>
              <SelectTrigger id="ct-pin-mode" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INPUT">Input</SelectItem>
                <SelectItem value="OUTPUT">Output</SelectItem>
                <SelectItem value="PWM">PWM</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* PWM Required */}
          <div className="flex items-center gap-2">
            <input
              id="ct-pwm"
              type="checkbox"
              checked={pwmRequired}
              onChange={(e) => setPwmRequired(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            <Label htmlFor="ct-pwm">PWM Required</Label>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="ct-notes">Notes</Label>
            <Textarea
              id="ct-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes..."
              rows={2}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || !name.trim()}>
              {isPending
                ? isEdit
                  ? 'Updating...'
                  : 'Creating...'
                : isEdit
                  ? 'Update'
                  : 'Create'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
