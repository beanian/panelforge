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
  const [pinTypesRequired, setPinTypesRequired] = useState<string[]>([]);
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
        setPinTypesRequired(componentType.pinTypesRequired);
        setDefaultPowerRail(componentType.defaultPowerRail);
        setDefaultPinMode(componentType.defaultPinMode);
        setPwmRequired(componentType.pwmRequired);
        setRequiresMosfet(componentType.requiresMosfet);
        setNotes(componentType.notes ?? '');
      } else {
        setName('');
        setDescription('');
        setDefaultPinCount(1);
        setPinTypesRequired([]);
        setDefaultPowerRail('FIVE_V');
        setDefaultPinMode('INPUT');
        setPwmRequired(false);
        setRequiresMosfet(false);
        setNotes('');
      }
    }
  }, [open, componentType]);

  function togglePinType(type: string) {
    setPinTypesRequired((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const data = {
      name: name.trim(),
      description: description.trim() || null,
      defaultPinCount,
      pinTypesRequired,
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
              onChange={(e) => setDefaultPinCount(Number(e.target.value))}
              required
            />
          </div>

          {/* Pin Types Required */}
          <div className="grid gap-2">
            <Label>Pin Types Required</Label>
            <div className="flex gap-4">
              {['DIGITAL', 'ANALOG'].map((type) => (
                <label key={type} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={pinTypesRequired.includes(type)}
                    onChange={() => togglePinType(type)}
                    className="size-4 rounded border-input accent-primary"
                  />
                  {type.charAt(0) + type.slice(1).toLowerCase()}
                </label>
              ))}
            </div>
          </div>

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
