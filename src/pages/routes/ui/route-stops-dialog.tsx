import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, X, Plus, Loader2, AlertCircle, MapPin, Flag } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import { useRouteStops, useSaveRouteStops } from '@entities/route-stop';
import type { RouteStopInsert } from '@entities/route-stop';
import { useStations } from '@entities/station';
import type { Route } from '@entities/route';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  addStopFormSchema,
  mapRouteStopError,
  parseIntervalToMinutes,
  minutesToInterval,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/route-stop-schema';
import type { AddStopFormValues } from '../model/route-stop-schema';

type LocalStop = {
  dndId: string;       // composite key "route_id:station_id" for DB stops, randomUUID() for new
  station_id: string;
  arrival_time_minutes: number | null;
};

// CRITICAL: SortableStopRow must be defined at MODULE LEVEL (not inside RouteStopsDialog).
// Local function components are re-created as new React element types every parent render,
// causing React to unmount+remount all stop rows on each state change — DnD drag state breaks.
interface SortableStopRowProps {
  stop: LocalStop;
  stationName: string;
  onRemove: (dndId: string) => void;
}

function SortableStopRow({ stop, stationName, onRemove }: SortableStopRowProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.dndId });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-2 rounded-md border bg-background p-2"
    >
      <button
        type="button"
        className="cursor-grab touch-none text-muted-foreground hover:text-foreground"
        {...attributes}
        {...listeners}
        aria-label="Kéo để sắp xếp"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span className="flex-1 text-sm">{stationName}</span>
      {stop.arrival_time_minutes != null && (
        <span className="text-xs text-muted-foreground">
          {stop.arrival_time_minutes} phút
        </span>
      )}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
        onClick={() => onRemove(stop.dndId)}
        aria-label="Xóa điểm dừng"
      >
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
}

interface RouteStopsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
}

export function RouteStopsDialog({
  open,
  onOpenChange,
  route,
}: RouteStopsDialogProps) {
  const { toast } = useToast();

  const [localStops, setLocalStops] = useState<LocalStop[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const stopsQuery = useRouteStops(route?.id ?? '');
  const stopsData = stopsQuery.data;

  const { data: stationsResult } = useStations({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  const saveStops = useSaveRouteStops();

  const {
    control,
    handleSubmit,
    reset: resetAddForm,
    formState: { errors: addFormErrors },
  } = useForm<AddStopFormValues>({
    resolver: zodResolver(addStopFormSchema),
    defaultValues: {
      station_id: '',
      arrival_time_minutes: null,
    },
  });

  // audit-added: hasInitializedRef guards against background refetch race condition.
  // Without this guard, TanStack Query background refetches change stopsData, fire the effect,
  // and reset localStops to DB state — silently discarding all unsaved user edits.
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!open) {
      // Reset everything when dialog closes
      hasInitializedRef.current = false;
      setLocalStops([]);
      setShowAddForm(false);
      setSaveError(null);
      resetAddForm();
      return;
    }
    // Only initialize once per open session — guard against background refetch overwriting edits
    if (open && !hasInitializedRef.current && stopsData !== undefined) {
      hasInitializedRef.current = true;
      setLocalStops(
        stopsData.map((s) => ({
          // route_stops has composite PK (route_id, station_id) — no separate id column.
          // Use composite string as stable, unique dndId for DB-loaded stops.
          dndId: `${s.route_id}:${s.station_id}`,
          station_id: s.station_id,
          arrival_time_minutes: parseIntervalToMinutes(s.estimated_arrival),
        }))
      );
    }
  }, [open, stopsData, resetAddForm]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      setLocalStops((stops) => {
        const oldIndex = stops.findIndex((s) => s.dndId === active.id);
        const newIndex = stops.findIndex((s) => s.dndId === over.id);
        return arrayMove(stops, oldIndex, newIndex);
      });
    }
  }

  const usedStationIds = new Set([
    route?.origin_station_id,
    route?.destination_station_id,
    ...localStops.map((s) => s.station_id),
  ]);

  const availableStations = (stationsResult?.data ?? []).filter(
    (s) => !usedStationIds.has(s.id)
  );

  function onAddStopSubmit(values: AddStopFormValues) {
    setLocalStops((prev) => [
      ...prev,
      {
        dndId: crypto.randomUUID(),
        station_id: values.station_id,
        arrival_time_minutes: values.arrival_time_minutes ?? null,
      },
    ]);
    resetAddForm();
    setShowAddForm(false);
  }

  function handleSave() {
    setSaveError(null);
    const insertPayload: RouteStopInsert[] = localStops.map((s, i) => ({
      route_id: route!.id,
      station_id: s.station_id,
      stop_order: i + 1,
      estimated_arrival:
        s.arrival_time_minutes != null
          ? minutesToInterval(s.arrival_time_minutes)
          : null,
    }));
    saveStops.mutate(
      { routeId: route!.id, stops: insertPayload },
      {
        onSuccess: () => {
          toast({ title: 'Đã lưu điểm dừng' });
          onOpenChange(false);
        },
        onError: (err) =>
          setSaveError(
            mapRouteStopError(
              err as { code?: string; message?: string; details?: string; status?: number },
              'save' // audit-added: 'save' context for non-atomic save risk
            )
          ),
      }
    );
  }

  const originStation = stationsResult?.data?.find(
    (s) => s.id === route?.origin_station_id
  );
  const destinationStation = stationsResult?.data?.find(
    (s) => s.id === route?.destination_station_id
  );

  // Dialog close guard — prevent close while save is pending
  function handleOpenChange(v: boolean) {
    if (!v && saveStops.isPending) return;
    onOpenChange(v);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Điểm dừng — {route?.name}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto space-y-2 py-4">
          {stopsQuery.isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Origin (locked) */}
              <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">
                  {originStation?.name ?? route?.origin_station_id ?? '—'}
                </span>
                <span className="text-xs text-muted-foreground">Trạm đi</span>
              </div>

              {/* Draggable intermediate stops */}
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={localStops.map((s) => s.dndId)}
                  strategy={verticalListSortingStrategy}
                >
                  {localStops.map((stop) => (
                    <SortableStopRow
                      key={stop.dndId}
                      stop={stop}
                      stationName={
                        stationsResult?.data?.find(
                          (s) => s.id === stop.station_id
                        )?.name ?? stop.station_id
                      }
                      onRemove={(dndId) =>
                        setLocalStops((prev) =>
                          prev.filter((s) => s.dndId !== dndId)
                        )
                      }
                    />
                  ))}
                </SortableContext>
              </DndContext>

              {/* Destination (locked) */}
              <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-2">
                <Flag className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">
                  {destinationStation?.name ??
                    route?.destination_station_id ??
                    '—'}
                </span>
                <span className="text-xs text-muted-foreground">Trạm đến</span>
              </div>
            </>
          )}

          {/* Add stop button */}
          {!showAddForm && !stopsQuery.isLoading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => setShowAddForm(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Thêm điểm dừng
            </Button>
          )}

          {/* Inline add-stop form */}
          {showAddForm && (
            <form
              onSubmit={handleSubmit(onAddStopSubmit)}
              className="rounded-md border p-3 space-y-3"
            >
              <div className="space-y-1">
                <Label>Trạm dừng</Label>
                <Controller
                  control={control}
                  name="station_id"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạm dừng..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStations.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                {addFormErrors.station_id && (
                  <p className="text-xs text-destructive">
                    {addFormErrors.station_id.message}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label>Thời gian đến (phút từ đầu tuyến)</Label>
                <Controller
                  control={control}
                  name="arrival_time_minutes"
                  render={({ field }) => (
                    <Input
                      type="text"
                      placeholder="Tùy chọn"
                      value={field.value ?? ''}
                      onChange={field.onChange}
                    />
                  )}
                />
                {addFormErrors.arrival_time_minutes && (
                  <p className="text-xs text-destructive">
                    {addFormErrors.arrival_time_minutes.message}
                  </p>
                )}
              </div>

              <div className="flex gap-2">
                <Button type="submit" size="sm">
                  Thêm
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    // audit-added: reset() clears stale partial values on next open
                    resetAddForm();
                    setShowAddForm(false);
                  }}
                >
                  Hủy
                </Button>
              </div>
            </form>
          )}

          {/* Save error */}
          {saveError && (
            <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-2 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saveStops.isPending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveStops.isPending}
          >
            {saveStops.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Lưu điểm dừng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
