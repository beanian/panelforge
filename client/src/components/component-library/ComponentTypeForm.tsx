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
  const [defaultPowerRail, setDefaultPowerRail] = useState('FIVE_V');
  const [defaultPinMode, setDefaultPinMode] = useState('INPUT');
  const [pwmRequired, setPwmRequired] = useState(false);
  const [requiresMosfet, setRequiresMosfet] = useState(false);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      if (componentType) {
        setName(componentType.name);
        setDescription(componentType.description ?? '');
        setDefaultPinCount(componentType.defaultPinCount);
        setPinLabels(componentType.pinLabels ?? []);
        setPinTypes(componentType.pinTypes ?? []);
        setDefaultPowerRail(componentType.defaultPowerRail);
        setDefaultPinMode(componentType.defaultPinMode);
        setPwmRequired(componentType.pwmRequired);
        setRequiresMosfet(componentType.requiresMosfet);
        setNotes(componentType.notes ?? '');
      } else {
        setName('');
        setDescription('');
        setDefaultPinCount(1);
        setPinLabels([]);
        setPinTypes([]);
        setDefaultPowerRail('FIVE_V');
        setDefaultPinMode('INPUT');
        setPwmRequired(false);
        setRequiresMosfet(false);
        setNotes('');
      }
    }
  }, [open, componentType]);

  function handlePinCountChange(count: number) {
    setDefaultPinCount(count);
    setPinLabels((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? ''));
    setPinTypes((prev) => Array.from({ length: count }, (_, i) => prev[i] ?? 'ANY'));
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
      defaultPowerRail,
      defaultPinMode,
      pwmRequired,
      requiresMosfet,
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
      <DialogContent className="sm:max-w-lg">
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
                Label each pin and set its type (Digital, Analog, or Either).
              </p>
              <div className="grid gap-1.5">
                {Array.from({ length: defaultPinCount }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-12 shrink-0 tabular-nums">
                      Pin {i + 1}
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
                      <SelectTrigger className="h-8 w-[110px] text-sm shrink-0">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DIGITAL">Digital</SelectItem>
                        <SelectItem value="ANALOG">Analog</SelectItem>
                        <SelectItem value="ANY">Either</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Default Power Rail */}
          <div className="grid gap-2">
            <Label htmlFor="ct-power-rail">Default Power Rail</Label>
            <Select value={defaultPowerRail} onValueChange={setDefaultPowerRail}>
              <SelectTrigger id="ct-power-rail" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="FIVE_V">5V</SelectItem>
                <SelectItem value="NINE_V">9V</SelectItem>
                <SelectItem value="TWENTY_SEVEN_V">27V</SelectItem>
                <SelectItem value="NONE">None</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

          {/* Requires MOSFET */}
          <div className="flex items-center gap-2">
            <input
              id="ct-mosfet"
              type="checkbox"
              checked={requiresMosfet}
              onChange={(e) => setRequiresMosfet(e.target.checked)}
              className="size-4 rounded border-input accent-primary"
            />
            <Label htmlFor="ct-mosfet">Requires MOSFET</Label>
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
