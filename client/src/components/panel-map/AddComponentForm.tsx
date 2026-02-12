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
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useComponentTypes } from '@/hooks/use-component-types';
import { useCreateComponentInstance } from '@/hooks/use-component-instances';

interface AddComponentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  panelSectionId: string;
  sectionName: string;
}

export function AddComponentForm({
  open,
  onOpenChange,
  panelSectionId,
  sectionName,
}: AddComponentFormProps) {
  const { data: componentTypes } = useComponentTypes();
  const createMutation = useCreateComponentInstance();

  const [name, setName] = useState('');
  const [componentTypeId, setComponentTypeId] = useState('');
  const [powerRail, setPowerRail] = useState('');

  // When a component type is selected, default the power rail from the type
  const selectedType = componentTypes?.find((ct) => ct.id === componentTypeId);

  useEffect(() => {
    if (open) {
      setName('');
      setComponentTypeId('');
      setPowerRail('');
    }
  }, [open]);

  useEffect(() => {
    if (selectedType) {
      setPowerRail(selectedType.pinPowerRails?.[0] ?? 'NONE');
    }
  }, [selectedType]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        componentTypeId,
        panelSectionId,
        ...(powerRail && powerRail !== (selectedType?.pinPowerRails?.[0] ?? 'NONE')
          ? { powerRail }
          : {}),
      });
      toast.success(`Added "${name.trim()}" to ${sectionName}`);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add Component</DialogTitle>
          <DialogDescription>
            Add a component instance to {sectionName}.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="ci-type">Component Type</Label>
            <Select value={componentTypeId} onValueChange={setComponentTypeId}>
              <SelectTrigger id="ci-type" className="w-full">
                <SelectValue placeholder="Select a type..." />
              </SelectTrigger>
              <SelectContent>
                {componentTypes?.map((ct) => (
                  <SelectItem key={ct.id} value={ct.id}>
                    {ct.name} ({ct.defaultPinCount}{' '}
                    {ct.defaultPinCount === 1 ? 'pin' : 'pins'})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="ci-name">Name</Label>
            <Input
              id="ci-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. ENG 1 Fire Switch"
              required
            />
          </div>

          {selectedType && (
            <div className="grid gap-2">
              <Label htmlFor="ci-power">Power Rail</Label>
              <Select value={powerRail} onValueChange={setPowerRail}>
                <SelectTrigger id="ci-power" className="w-full">
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
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || !name.trim() || !componentTypeId
              }
            >
              {createMutation.isPending ? 'Adding...' : 'Add Component'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
