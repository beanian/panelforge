import { useState } from 'react';
import { ClipboardList, AlertTriangle, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { usePanelSections } from '@/hooks/use-panel-sections';
import {
  useBomCalculate,
  useBomApply,
  type BomCalculateResult,
  type BomApplyResult,
} from '@/hooks/use-bom';
import { POWER_RAIL_LABELS } from '@/lib/constants';

// State machine
type WizardState = 'idle' | 'calculating' | 'review' | 'applying' | 'done';

// Step indicator component
function StepIndicator({ step, currentStep }: { step: number; currentStep: number }) {
  const isActive = step === currentStep;
  const isComplete = step < currentStep;

  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex items-center justify-center size-7 rounded-full text-xs font-semibold transition-colors ${
          isComplete
            ? 'bg-green-500 text-white'
            : isActive
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground'
        }`}
      >
        {isComplete ? <Check className="size-3.5" /> : step}
      </div>
    </div>
  );
}

const POWER_RAIL_BADGE_COLORS: Record<string, string> = {
  FIVE_V: 'bg-green-500 text-white',
  NINE_V: 'bg-blue-500 text-white',
  TWENTY_SEVEN_V: 'bg-amber-500 text-white',
  NONE: 'bg-gray-400 text-white',
};

export default function BomGeneratorPage() {
  const { data: sections = [], isLoading: sectionsLoading } = usePanelSections();
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [wizardState, setWizardState] = useState<WizardState>('idle');
  const [calcResult, setCalcResult] = useState<BomCalculateResult | null>(null);
  const [applyResult, setApplyResult] = useState<BomApplyResult | null>(null);

  const bomCalculate = useBomCalculate();
  const bomApply = useBomApply();

  const handleCalculate = () => {
    if (!selectedSectionId) return;
    setWizardState('calculating');
    setCalcResult(null);
    setApplyResult(null);

    bomCalculate.mutate(
      { sectionId: selectedSectionId },
      {
        onSuccess: (data) => {
          setCalcResult(data);
          setWizardState('review');
        },
        onError: (err) => {
          toast.error(`Calculation failed: ${err.message}`);
          setWizardState('idle');
        },
      }
    );
  };

  const handleApply = () => {
    if (!calcResult) return;
    setWizardState('applying');

    bomApply.mutate(calcResult, {
      onSuccess: (data) => {
        setApplyResult(data);
        setWizardState('done');
        toast.success(
          `Created ${data.totalPinsCreated} pin assignment${data.totalPinsCreated !== 1 ? 's' : ''} for ${data.sectionName}`
        );
      },
      onError: (err) => {
        toast.error(`Apply failed: ${err.message}`);
        setWizardState('review');
      },
    });
  };

  const handleReset = () => {
    setWizardState('idle');
    setCalcResult(null);
    setApplyResult(null);
    setSelectedSectionId(null);
  };

  // Map wizard state to step number
  const currentStep =
    wizardState === 'idle' || wizardState === 'calculating'
      ? 1
      : wizardState === 'review' || wizardState === 'applying'
        ? 2
        : 3;

  // Derived stats from calcResult
  const totalPinsNeeded = calcResult?.components.reduce((sum, c) => sum + c.pinsNeeded, 0) ?? 0;
  const componentsWithAllocations = calcResult?.components.filter((c) => c.pinsNeeded > 0) ?? [];
  const componentsAlreadyAllocated = calcResult?.components.filter((c) => c.pinsNeeded === 0) ?? [];

  // Power rail breakdown from components
  const powerRailBreakdown: Record<string, number> = {};
  calcResult?.components.forEach((c) => {
    if (c.pinsNeeded > 0) {
      powerRailBreakdown[c.powerRail] = (powerRailBreakdown[c.powerRail] || 0) + c.pinsNeeded;
    }
  });

  // Count distinct boards used
  const boardsUsed = new Set<string>();
  calcResult?.components.forEach((c) => {
    c.allocations.forEach((a) => boardsUsed.add(a.boardId));
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">BOM Generator</h1>
          <p className="text-sm text-muted-foreground">
            Calculate and apply pin allocations for panel section components
          </p>
        </div>
        {wizardState !== 'idle' && (
          <Button variant="outline" onClick={handleReset}>
            Start Over
          </Button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="flex items-center gap-2">
        <StepIndicator step={1} currentStep={currentStep} />
        <span className={`text-sm ${currentStep === 1 ? 'font-medium' : 'text-muted-foreground'}`}>
          Select Section
        </span>
        <div className="w-8 h-px bg-border" />
        <StepIndicator step={2} currentStep={currentStep} />
        <span className={`text-sm ${currentStep === 2 ? 'font-medium' : 'text-muted-foreground'}`}>
          Review Allocation
        </span>
        <div className="w-8 h-px bg-border" />
        <StepIndicator step={3} currentStep={currentStep} />
        <span className={`text-sm ${currentStep === 3 ? 'font-medium' : 'text-muted-foreground'}`}>
          Apply
        </span>
      </div>

      {/* Step 1: Select Section */}
      {currentStep === 1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Panel Section</CardTitle>
            <CardDescription>
              Choose a panel section to calculate its bill of materials and pin allocation plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3">
              {sectionsLoading ? (
                <Skeleton className="h-9 w-[280px]" />
              ) : sections.length === 0 ? (
                <div className="rounded-lg border border-dashed p-8 text-center w-full">
                  <ClipboardList className="mx-auto size-10 text-muted-foreground/50 mb-3" />
                  <h3 className="font-semibold mb-1">No panel sections</h3>
                  <p className="text-sm text-muted-foreground">
                    Create panel sections first in the Panel Map.
                  </p>
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium">Panel Section</label>
                    <Select
                      value={selectedSectionId ?? ''}
                      onValueChange={(val) => setSelectedSectionId(val || null)}
                    >
                      <SelectTrigger className="w-[280px]">
                        <SelectValue placeholder="Select a section..." />
                      </SelectTrigger>
                      <SelectContent>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                            <span className="text-muted-foreground ml-1">
                              ({section.componentCount} components)
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    onClick={handleCalculate}
                    disabled={!selectedSectionId || wizardState === 'calculating'}
                  >
                    {wizardState === 'calculating' ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        Calculating...
                      </>
                    ) : (
                      'Calculate BOM'
                    )}
                  </Button>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Review Allocation */}
      {currentStep === 2 && calcResult && (
        <div className="space-y-4">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Pins Needed</CardDescription>
                <CardTitle className="text-2xl tabular-nums">{totalPinsNeeded}</CardTitle>
              </CardHeader>
            </Card>

            <Card className={calcResult.newBoardsNeeded > 0 ? 'border-amber-500' : ''}>
              <CardHeader className="pb-2">
                <CardDescription>New Boards Needed</CardDescription>
                <CardTitle className="text-2xl tabular-nums flex items-center gap-2">
                  {calcResult.newBoardsNeeded}
                  {calcResult.newBoardsNeeded > 0 && (
                    <AlertTriangle className="size-5 text-amber-500" />
                  )}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardDescription>MOSFET Channels Needed</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {calcResult.mosfetChannelsNeeded}
                </CardTitle>
              </CardHeader>
            </Card>

            <Card
              className={
                calcResult.mosfetChannelsNeeded > calcResult.mosfetChannelsAvailable
                  ? 'border-amber-500'
                  : ''
              }
            >
              <CardHeader className="pb-2">
                <CardDescription>MOSFET Channels Available</CardDescription>
                <CardTitle className="text-2xl tabular-nums flex items-center gap-2">
                  {calcResult.mosfetChannelsAvailable}
                  {calcResult.mosfetChannelsNeeded > calcResult.mosfetChannelsAvailable && (
                    <AlertTriangle className="size-5 text-amber-500" />
                  )}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Power Rail Breakdown */}
          {Object.keys(powerRailBreakdown).length > 0 && (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-4 py-3">
              <span className="text-sm font-medium">Power Rails:</span>
              {Object.entries(powerRailBreakdown).map(([rail, count]) => (
                <Badge
                  key={rail}
                  className={POWER_RAIL_BADGE_COLORS[rail] ?? 'bg-gray-400 text-white'}
                >
                  {POWER_RAIL_LABELS[rail] ?? rail}: {count} pin{count !== 1 ? 's' : ''}
                </Badge>
              ))}
            </div>
          )}

          {/* Component Allocation Table */}
          {componentsWithAllocations.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold">
                Components Requiring Allocation ({componentsWithAllocations.length})
              </h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Pins Needed</TableHead>
                      <TableHead>Power Rail</TableHead>
                      <TableHead>Allocated Board(s)</TableHead>
                      <TableHead>Pin Numbers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {componentsWithAllocations.map((component) => {
                      const totalAllocatedPins = component.allocations.reduce(
                        (sum, a) => sum + a.pins.length,
                        0
                      );
                      const hasWarning = totalAllocatedPins < component.pinsNeeded;

                      return (
                        <TableRow
                          key={component.componentInstanceId}
                          className={hasWarning ? 'bg-amber-50 dark:bg-amber-950/20' : ''}
                        >
                          <TableCell className="text-sm font-medium">
                            {component.name}
                            {hasWarning && (
                              <AlertTriangle className="inline size-3.5 text-amber-500 ml-1.5" />
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {component.typeName}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="tabular-nums">
                              {component.pinsNeeded}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={
                                POWER_RAIL_BADGE_COLORS[component.powerRail] ??
                                'bg-gray-400 text-white'
                              }
                            >
                              {POWER_RAIL_LABELS[component.powerRail] ?? component.powerRail}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {component.allocations.length > 0
                              ? component.allocations.map((a) => a.boardName).join(', ')
                              : '--'}
                          </TableCell>
                          <TableCell>
                            {component.allocations.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {component.allocations.flatMap((a) =>
                                  a.pins.map((pin) => (
                                    <Badge
                                      key={`${a.boardId}-${pin}`}
                                      variant="outline"
                                      className="font-mono text-xs"
                                    >
                                      {pin}
                                    </Badge>
                                  ))
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground text-sm">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Already Allocated */}
          {componentsAlreadyAllocated.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                Already Allocated ({componentsAlreadyAllocated.length})
              </h3>
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {componentsAlreadyAllocated.map((component) => (
                      <TableRow key={component.componentInstanceId} className="text-muted-foreground">
                        <TableCell className="text-sm">{component.name}</TableCell>
                        <TableCell className="text-sm">{component.typeName}</TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="text-xs">
                            <Check className="size-3 mr-0.5" />
                            Allocated
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {/* Apply Button */}
          <Card className="border-primary/30 bg-primary/5">
            <CardContent className="flex items-center justify-between pt-6">
              <div>
                <p className="text-sm font-medium">Ready to apply allocations</p>
                <p className="text-sm text-muted-foreground">
                  This will create {totalPinsNeeded} pin assignment{totalPinsNeeded !== 1 ? 's' : ''} across{' '}
                  {boardsUsed.size} board{boardsUsed.size !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                size="lg"
                onClick={handleApply}
                disabled={wizardState === 'applying' || totalPinsNeeded === 0}
              >
                {wizardState === 'applying' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Applying...
                  </>
                ) : (
                  'Apply Allocations'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Done */}
      {currentStep === 3 && applyResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Check className="size-5 text-green-500" />
              Allocations Applied Successfully
            </CardTitle>
            <CardDescription>
              Created {applyResult.totalPinsCreated} pin assignment
              {applyResult.totalPinsCreated !== 1 ? 's' : ''} for {applyResult.sectionName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {applyResult.assignments.length > 0 && (
              <div className="rounded-lg border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Component</TableHead>
                      <TableHead>Board</TableHead>
                      <TableHead>Pin</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {applyResult.assignments.map((assignment, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-sm font-medium">
                          {assignment.componentName}
                        </TableCell>
                        <TableCell className="text-sm">
                          {assignment.boardName}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-mono text-xs">
                            {assignment.pinNumber}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <div className="mt-4">
              <Button variant="outline" onClick={handleReset}>
                Generate Another BOM
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
