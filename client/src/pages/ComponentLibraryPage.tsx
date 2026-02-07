import { useState } from 'react';
import { toast } from 'sonner';
import { PlusIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
} from '@/components/ui/tooltip';
import { POWER_RAIL_LABELS, POWER_RAIL_COLORS } from '@/lib/constants';
import {
  useComponentTypes,
  useDeleteComponentType,
  type ComponentType,
} from '@/hooks/use-component-types';
import { ComponentTypeForm } from '@/components/component-library/ComponentTypeForm';

const PIN_MODE_LABELS: Record<string, string> = {
  INPUT: 'Input',
  OUTPUT: 'Output',
  PWM: 'PWM',
};

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-48 mt-1" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex gap-2">
          <Skeleton className="h-5 w-14 rounded-full" />
          <Skeleton className="h-5 w-10 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
        <Skeleton className="h-4 w-28" />
      </CardContent>
      <CardFooter className="gap-2">
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </CardFooter>
    </Card>
  );
}

function ComponentTypeCard({
  componentType,
  onEdit,
  onDelete,
}: {
  componentType: ComponentType;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const usageCount = componentType._count?.componentInstances ?? 0;
  const canDelete = usageCount === 0;
  const powerRailKey = componentType.defaultPowerRail;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">{componentType.name}</CardTitle>
        {componentType.description && (
          <CardDescription>{componentType.description}</CardDescription>
        )}
      </CardHeader>

      <CardContent className="flex flex-col gap-3">
        {/* Stats row */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary">
            {componentType.defaultPinCount}{' '}
            {componentType.defaultPinCount === 1 ? 'pin' : 'pins'}
          </Badge>

          <Badge
            className={`${POWER_RAIL_COLORS[powerRailKey] ?? 'bg-gray-400'} text-white border-transparent`}
          >
            {POWER_RAIL_LABELS[powerRailKey] ?? powerRailKey}
          </Badge>

          <Badge variant="outline">
            {PIN_MODE_LABELS[componentType.defaultPinMode] ??
              componentType.defaultPinMode}
          </Badge>

          {componentType.pwmRequired && (
            <Badge variant="outline" className="border-amber-400 text-amber-600">
              PWM
            </Badge>
          )}
        </div>

        {/* Usage count */}
        <p className="text-sm text-muted-foreground">
          Used in {usageCount} {usageCount === 1 ? 'instance' : 'instances'}
        </p>
      </CardContent>

      <CardFooter className="gap-2">
        <Button variant="outline" size="sm" onClick={onEdit}>
          <PencilIcon />
          Edit
        </Button>

        {canDelete ? (
          <Button variant="outline" size="sm" onClick={onDelete}>
            <Trash2Icon />
            Delete
          </Button>
        ) : (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0}>
                  <Button variant="outline" size="sm" disabled>
                    <Trash2Icon />
                    Delete
                  </Button>
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Cannot delete: used in {usageCount}{' '}
                {usageCount === 1 ? 'instance' : 'instances'}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </CardFooter>
    </Card>
  );
}

export default function ComponentLibraryPage() {
  const { data: componentTypes, isLoading, error } = useComponentTypes();
  const deleteMutation = useDeleteComponentType();

  const [formOpen, setFormOpen] = useState(false);
  const [editingType, setEditingType] = useState<ComponentType | undefined>();

  function handleNew() {
    setEditingType(undefined);
    setFormOpen(true);
  }

  function handleEdit(ct: ComponentType) {
    setEditingType(ct);
    setFormOpen(true);
  }

  async function handleDelete(ct: ComponentType) {
    try {
      await deleteMutation.mutateAsync(ct.id);
      toast.success(`Deleted "${ct.name}"`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'An unexpected error occurred';
      toast.error(message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Component Library
          </h1>
          <p className="text-sm text-muted-foreground">
            Define the types of switches, annunciators, and other components on
            your overhead panel.
          </p>
        </div>
        <Button onClick={handleNew}>
          <PlusIcon />
          New Component Type
        </Button>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load component types: {error.message}
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && componentTypes?.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <p className="text-lg font-medium text-muted-foreground">
            No component types yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Create your first component type to get started.
          </p>
          <Button className="mt-4" onClick={handleNew}>
            <PlusIcon />
            New Component Type
          </Button>
        </div>
      )}

      {/* Card grid */}
      {!isLoading && componentTypes && componentTypes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {componentTypes.map((ct) => (
            <ComponentTypeCard
              key={ct.id}
              componentType={ct}
              onEdit={() => handleEdit(ct)}
              onDelete={() => handleDelete(ct)}
            />
          ))}
        </div>
      )}

      {/* Form dialog */}
      <ComponentTypeForm
        open={formOpen}
        onOpenChange={setFormOpen}
        componentType={editingType}
      />
    </div>
  );
}
