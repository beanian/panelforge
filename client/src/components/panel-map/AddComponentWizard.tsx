import { useState, useMemo, useEffect } from 'react';
import { toast } from 'sonner';
import { Wand2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useComponentTypes } from '@/hooks/use-component-types';
import { usePanelSections } from '@/hooks/use-panel-sections';
import { useBoards } from '@/hooks/use-boards';
import { useMosfetBoards } from '@/hooks/use-mosfet-boards';
import { useCreateComponentInstance } from '@/hooks/use-component-instances';
import { useCreatePinAssignment, usePinAssignments } from '@/hooks/use-pin-assignments';
import { useUpdatePinAssignment } from '@/hooks/use-pin-assignments';
import { Input } from '@/components/ui/input';
import { MEGA_2560 } from '@/lib/constants';
import type { BoundingBox } from './PanelMap';

const POWER_RAIL_OPTIONS = [
  { value: 'NONE', label: 'None' },
  { value: 'FIVE_V', label: '5V' },
  { value: 'NINE_V', label: '9V' },
  { value: 'TWENTY_SEVEN_V', label: '27V' },
];

interface PinConfig {
  pinNumber: string;
  pinType: string;
  requiresPwm: boolean;
}

interface AddComponentWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  boundingBox: BoundingBox;
  defaultPanelSectionId?: string;
  onCreated: (id: string) => void;
}

export function AddComponentWizard({ open, onOpenChange, boundingBox, defaultPanelSectionId, onCreated }: AddComponentWizardProps) {
  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — Basics
  const [name, setName] = useState('');
  const [componentTypeId, setComponentTypeId] = useState('');
  const [panelSectionId, setPanelSectionId] = useState('');
  const [powerRail, setPowerRail] = useState('');

  // Step 2 — Pin Wiring
  const [boardId, setBoardId] = useState('');
  const [pins, setPins] = useState<PinConfig[]>([]);

  // Step 3 — MOSFET
  const [mosfetBoardId, setMosfetBoardId] = useState('');
  const [mosfetChannelId, setMosfetChannelId] = useState('');

  // Data hooks
  const { data: componentTypes } = useComponentTypes();
  const { data: panelSections } = usePanelSections();
  const { data: boards } = useBoards();
  const { data: mosfetBoards } = useMosfetBoards();
  const { data: usedPins } = usePinAssignments(boardId ? { boardId } : {});
  const createInstance = useCreateComponentInstance();
  const createPin = useCreatePinAssignment();
  const updatePin = useUpdatePinAssignment();

  // Pre-fill panel section when a default is provided
  useEffect(() => {
    if (open && defaultPanelSectionId) {
      setPanelSectionId(defaultPanelSectionId);
    }
  }, [open, defaultPanelSectionId]);

  const selectedType = componentTypes?.find((ct) => ct.id === componentTypeId);
  const selectedBoard = boards?.find((b) => b.id === boardId);
  const showMosfetStep = selectedType?.pwmRequired || selectedType?.defaultPinMode === 'PWM';
  const totalSteps = showMosfetStep ? 3 : 2;

  // Compute available pins for the selected board
  const usedPinNumbers = useMemo(() => {
    if (!usedPins) return new Set<string>();
    return new Set(usedPins.map((p) => p.pinNumber));
  }, [usedPins]);

  // Also exclude pins already selected in other rows of this wizard
  const selectedInWizard = useMemo(() => {
    return new Set(pins.map((p) => p.pinNumber).filter(Boolean));
  }, [pins]);

  const availableDigitalPins = useMemo(() => {
    return MEGA_2560.digitalPins.filter(
      (p) => !MEGA_2560.reservedPins.includes(p) && !usedPinNumbers.has(p),
    );
  }, [usedPinNumbers]);

  const availableAnalogPins = useMemo(() => {
    return MEGA_2560.analogPins.filter((p) => !usedPinNumbers.has(p));
  }, [usedPinNumbers]);

  const pwmPinSet = useMemo(() => new Set(MEGA_2560.pwmPins), []);

  // Get available pins for a specific row (excluding other rows' selections)
  function getAvailablePinsForRow(index: number, pinType: string) {
    const othersSelected = new Set(
      pins.filter((_, i) => i !== index).map((p) => p.pinNumber).filter(Boolean),
    );
    const pool = pinType === 'ANALOG' ? availableAnalogPins : availableDigitalPins;
    return pool.filter((p) => !othersSelected.has(p));
  }

  // Auto-default power rail when type changes
  function handleTypeChange(typeId: string) {
    setComponentTypeId(typeId);
    const ct = componentTypes?.find((t) => t.id === typeId);
    if (ct) {
      setPowerRail(ct.defaultPowerRail);
      const newPins: PinConfig[] = Array.from({ length: ct.defaultPinCount }, (_, i) => ({
        pinNumber: '',
        pinType: ct.pinTypesRequired[Math.min(i, ct.pinTypesRequired.length - 1)],
        requiresPwm: ct.defaultPinMode === 'PWM' || ct.pwmRequired,
      }));
      setPins(newPins);
    }
  }

  function handlePinNumberChange(index: number, value: string) {
    setPins((prev) => prev.map((p, i) => (i === index ? { ...p, pinNumber: value } : p)));
  }

  function handlePwmToggle(index: number) {
    setPins((prev) =>
      prev.map((p, i) => {
        if (i !== index) return p;
        const newRequiresPwm = !p.requiresPwm;
        // If turning on PWM and current pin isn't a PWM pin, clear the selection
        if (newRequiresPwm && p.pinNumber && !pwmPinSet.has(p.pinNumber)) {
          return { ...p, requiresPwm: newRequiresPwm, pinNumber: '' };
        }
        return { ...p, requiresPwm: newRequiresPwm };
      }),
    );
  }

  function handleAutoAllocate() {
    if (!boardId) return;

    setPins((prev) => {
      const claimed = new Set<string>();
      return prev.map((pin) => {
        const pool = pin.pinType === 'ANALOG' ? availableAnalogPins : availableDigitalPins;
        const candidates = pool.filter((p) => !claimed.has(p));

        let chosen: string | undefined;
        if (pin.requiresPwm) {
          // Pick the first available PWM pin
          chosen = candidates.find((p) => pwmPinSet.has(p));
        }
        if (!chosen) {
          // Pick the first available pin of the right type
          chosen = candidates[0];
        }

        if (chosen) claimed.add(chosen);
        return { ...pin, pinNumber: chosen ?? '' };
      });
    });
  }

  function resetForm() {
    setStep(0);
    setName('');
    setComponentTypeId('');
    setPanelSectionId('');
    setPowerRail('');
    setBoardId('');
    setPins([]);
    setMosfetBoardId('');
    setMosfetChannelId('');
    setSubmitting(false);
  }

  function handleOpenChange(open: boolean) {
    if (!open) resetForm();
    onOpenChange(open);
  }

  const canProceedStep0 = name.trim() && componentTypeId && panelSectionId;
  const hasPinConfig = boardId && pins.some((p) => p.pinNumber);

  async function handleCreate() {
    if (!canProceedStep0) return;
    setSubmitting(true);

    try {
      const instance = await createInstance.mutateAsync({
        name: name.trim(),
        componentTypeId,
        panelSectionId,
        powerRail: powerRail || undefined,
        mapX: boundingBox.mapX,
        mapY: boundingBox.mapY,
        mapWidth: boundingBox.mapWidth,
        mapHeight: boundingBox.mapHeight,
      }) as any;

      const instanceId = instance.id;

      const createdPinIds: string[] = [];
      if (hasPinConfig) {
        for (const pin of pins) {
          if (!pin.pinNumber) continue;
          const pinMode = pin.requiresPwm ? 'PWM' : (selectedType?.defaultPinMode ?? 'INPUT');
          const result = await createPin.mutateAsync({
            boardId,
            pinNumber: pin.pinNumber,
            pinType: pin.pinType,
            pinMode,
            componentInstanceId: instanceId,
            powerRail: powerRail || 'NONE',
          }) as any;
          createdPinIds.push(result.id);
        }
      }

      if (mosfetChannelId && createdPinIds.length > 0) {
        const pwmPinId = createdPinIds[0];
        await updatePin.mutateAsync({ id: pwmPinId, mosfetChannelId });
      }

      toast.success(`Created "${name.trim()}"`);
      handleOpenChange(false);
      onCreated(instanceId);
    } catch (err: any) {
      toast.error(`Failed to create component: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  }

  const selectedMosfetBoard = mosfetBoards?.find((b) => b.id === mosfetBoardId);
  const freeChannels = selectedMosfetBoard?.channels.filter((ch) => !ch.pinAssignment) ?? [];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Add New Component</DialogTitle>
          <DialogDescription>
            Step {step + 1} of {totalSteps} — {step === 0 ? 'Basics' : step === 1 ? 'Pin Wiring' : 'MOSFET Connection'}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-blue-500' : i < step ? 'w-3 bg-blue-500/50' : 'w-3 bg-slate-600'
              }`}
            />
          ))}
        </div>

        {/* Step 1: Basics */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <div>
              <Label htmlFor="comp-name">Name</Label>
              <Input
                id="comp-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. ENG1 Fire Switch"
                autoFocus
              />
            </div>

            <div>
              <Label>Component Type</Label>
              <Select value={componentTypeId} onValueChange={handleTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type..." />
                </SelectTrigger>
                <SelectContent>
                  {componentTypes?.map((ct) => (
                    <SelectItem key={ct.id} value={ct.id}>
                      {ct.name} ({ct.defaultPinCount} {ct.defaultPinCount === 1 ? 'pin' : 'pins'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Panel Section</Label>
              <Select value={panelSectionId} onValueChange={setPanelSectionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select section..." />
                </SelectTrigger>
                <SelectContent>
                  {panelSections?.map((ps) => (
                    <SelectItem key={ps.id} value={ps.id}>
                      {ps.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Power Rail</Label>
              <Select value={powerRail || 'NONE'} onValueChange={setPowerRail}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {POWER_RAIL_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {/* Step 2: Pin Wiring */}
        {step === 1 && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>Board</Label>
              <Select value={boardId} onValueChange={setBoardId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select board..." />
                </SelectTrigger>
                <SelectContent>
                  {boards?.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.name} ({b.pinAvailability.digitalFree}D / {b.pinAvailability.analogFree}A free)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {boardId && pins.length > 0 && (
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Label>Pins ({pins.length})</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleAutoAllocate}
                  >
                    <Wand2 className="size-3.5 mr-1.5" />
                    Auto-allocate
                  </Button>
                </div>
                {pins.map((pin, i) => {
                  const available = getAvailablePinsForRow(i, pin.pinType);
                  // If PWM required, filter to only PWM-capable pins
                  const filteredPins = pin.requiresPwm
                    ? available.filter((p) => pwmPinSet.has(p))
                    : available;
                  // Include the currently selected pin so it stays visible
                  const options = pin.pinNumber && !filteredPins.includes(pin.pinNumber)
                    ? [pin.pinNumber, ...filteredPins]
                    : filteredPins;

                  return (
                    <div key={i} className="flex items-center gap-2">
                      <div className="flex-1">
                        <Select
                          value={pin.pinNumber || undefined}
                          onValueChange={(v) => handlePinNumberChange(i, v)}
                        >
                          <SelectTrigger className="font-mono">
                            <SelectValue placeholder="Select pin..." />
                          </SelectTrigger>
                          <SelectContent>
                            {options.map((p) => (
                              <SelectItem key={p} value={p} className="font-mono">
                                {p}
                                {pwmPinSet.has(p) && (
                                  <span className="text-amber-400 ml-1 text-[10px]">PWM</span>
                                )}
                              </SelectItem>
                            ))}
                            {options.length === 0 && (
                              <div className="px-2 py-1.5 text-xs text-muted-foreground">
                                No pins available
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0">
                        {pin.pinType}
                      </Badge>
                      <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={pin.requiresPwm}
                          onChange={() => handlePwmToggle(i)}
                          className="rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500/30 h-3.5 w-3.5"
                        />
                        PWM
                      </label>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              Pin wiring is optional — you can configure this later.
            </p>
          </div>
        )}

        {/* Step 3: MOSFET Connection */}
        {step === 2 && showMosfetStep && (
          <div className="flex flex-col gap-4">
            <div>
              <Label>MOSFET Board</Label>
              <Select value={mosfetBoardId} onValueChange={(v) => { setMosfetBoardId(v); setMosfetChannelId(''); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select MOSFET board..." />
                </SelectTrigger>
                <SelectContent>
                  {mosfetBoards?.map((mb) => (
                    <SelectItem key={mb.id} value={mb.id}>
                      {mb.name} ({mb.freeChannels} free)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mosfetBoardId && (
              <div>
                <Label>Channel</Label>
                <Select value={mosfetChannelId} onValueChange={setMosfetChannelId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select channel..." />
                  </SelectTrigger>
                  <SelectContent>
                    {freeChannels.map((ch) => (
                      <SelectItem key={ch.id} value={ch.id}>
                        Channel {ch.channelNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              MOSFET connection is optional — you can configure this later.
            </p>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <div>
            {step > 0 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} disabled={submitting}>
                Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            {step < totalSteps - 1 ? (
              <>
                {step > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(totalSteps - 1)}
                    disabled={submitting}
                  >
                    Skip
                  </Button>
                )}
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={step === 0 && !canProceedStep0}
                >
                  Next
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={submitting}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={!canProceedStep0 || submitting}>
                  {submitting ? 'Creating...' : 'Create Component'}
                </Button>
              </>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
