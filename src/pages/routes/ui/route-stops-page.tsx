import * as React from 'react';
import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { GripVertical, X, Plus, Loader2, AlertCircle, MapPin, Flag, ArrowLeft } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  Skeleton,
} from '@shared/ui';
import { useRouteStops, useSaveRouteStops } from '@entities/route-stop';
import type { RouteStopInsert } from '@entities/route-stop';
import { useStations } from '@entities/station';
import { useRoute } from '@entities/route';
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
import { ROUTES } from '@shared/config/routes';

type LocalStop = {
  dndId: string;
  station_id: string;
  arrival_time_minutes: number | null;
};

// CRITICAL: SortableStopRow must be defined at MODULE LEVEL (not inline).
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

function mapFetchError(error: unknown): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === 'PGRST116' || e?.status === 406)
    return 'Không tìm thấy tuyến đường.';
  if (e?.status === 401 || e?.status === 403 || e?.code === 'PGRST301')
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể tải tuyến đường. Vui lòng thử lại.';
}

export function RouteStopsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [localStops, setLocalStops] = useState<LocalStop[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { data: routeData, isLoading: isRouteLoading, isError: isRouteError, error: routeError } = useRoute(id ?? '');
  const stopsQuery = useRouteStops(id ?? '');
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

  // hasInitializedRef guards against background refetch race condition.
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    if (!id) {
      navigate(ROUTES.ROUTES);
      return;
    }

    if (stopsData !== undefined && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      setLocalStops(
        stopsData.map((s) => ({
          dndId: `${s.route_id}:${s.station_id}`,
          station_id: s.station_id,
          arrival_time_minutes: parseIntervalToMinutes(s.estimated_arrival),
        }))
      );
    }
  }, [id, stopsData, navigate]);

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
    routeData?.origin_station_id,
    routeData?.destination_station_id,
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
    if (!id) return;

    setSaveError(null);
    const insertPayload: RouteStopInsert[] = localStops.map((s, i) => ({
      route_id: id,
      station_id: s.station_id,
      stop_order: i + 1,
      estimated_arrival:
        s.arrival_time_minutes != null
          ? minutesToInterval(s.arrival_time_minutes)
          : null,
    }));

    saveStops.mutate(
      { routeId: id, stops: insertPayload },
      {
        onSuccess: () => {
          toast({ title: 'Đã lưu điểm dừng' });
          navigate(ROUTES.ROUTES);
        },
        onError: (err) => {
          const error = err as { code?: string; message?: string; details?: string; status?: number };
          if (error.status === 401 || error.status === 403 || error.code === 'PGRST301') {
            setSaveError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
          } else {
            setSaveError(
              mapRouteStopError(error, 'save')
            );
          }
        },
      }
    );
  }

  const originStation = stationsResult?.data?.find(
    (s) => s.id === routeData?.origin_station_id
  );
  const destinationStation = stationsResult?.data?.find(
    (s) => s.id === routeData?.destination_station_id
  );

  const isLoading = isRouteLoading || stopsQuery.isLoading;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-none pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate(ROUTES.ROUTES)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Điểm dừng — {routeData?.name || '...'}</h1>
          </div>
        </div>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-6 px-1 space-y-6">

          {/* Loading skeleton */}
          {isLoading && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-muted/30 p-4">
                <Skeleton className="h-10 w-full" />
              </div>
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
              <div className="rounded-lg border bg-muted/30 p-4">
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          )}

          {/* Error state */}
          {isRouteError && (
            <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
              <AlertCircle className="h-8 w-8 text-destructive" />
              <p className="text-sm font-medium text-destructive">
                {mapFetchError(routeError)}
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTES.ROUTES)}
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Quay lại danh sách
              </Button>
            </div>
          )}

          {/* Content */}
          {!isLoading && routeData && (
            <div className="space-y-4">

              {/* Origin (locked) */}
              <div className="flex items-center gap-2 rounded-md border border-muted bg-muted/30 p-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="flex-1 text-sm font-medium">
                  {originStation?.name ?? routeData.origin_station_id ?? '—'}
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
                    routeData.destination_station_id ??
                    '—'}
                </span>
                <span className="text-xs text-muted-foreground">Trạm đến</span>
              </div>

              {/* Add stop button */}
              {!showAddForm && (
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
          )}
        </div>
      </div>

      {/* Sticky footer */}
      <div className="flex-none border-t bg-background py-4 px-1">
        <div className="flex justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(ROUTES.ROUTES)}
            disabled={saveStops.isPending}
          >
            Hủy
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saveStops.isPending || localStops.length === 0}
          >
            {saveStops.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Lưu điểm dừng
          </Button>
        </div>
      </div>
    </div>
  );
}
