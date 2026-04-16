import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  FormFieldWrapper,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import { useRoutes } from '@entities/route';
import { useVehicles } from '@entities/vehicle';
import { useCreateTrip, useUpdateTrip, TRIP_STATUSES, type TripWithDetails } from '@entities/trip';
import {
  tripFormSchema,
  type TripFormValues,
  mapTripError,
  serializeToInsert,
  toDatetimeLocal,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/trip-form-schema';

interface TripFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  trip: TripWithDetails | null;
}

export function TripFormDialog({
  open,
  onOpenChange,
  mode,
  trip,
}: TripFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateTrip();
  const updateMutation = useUpdateTrip();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // FK dropdown data
  const { data: routesData } = useRoutes({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE });
  const { data: vehiclesData } = useVehicles({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE });

  const routes = routesData?.data ?? [];
  const routesCount = routesData?.count ?? 0;
  const vehicles = vehiclesData?.data ?? [];
  const vehiclesCount = vehiclesData?.count ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TripFormValues>({
    resolver: zodResolver(tripFormSchema),
    defaultValues: {
      route_id: '',
      vehicle_id: '',
      departure_time: '',
      estimated_arrival_time: '',
      status: 'scheduled',
      price_override: null,
      notes: null,
    },
  });

  const watchedRouteId = watch('route_id');
  const watchedVehicleId = watch('vehicle_id');

  // hasInitializedRef prevents background refetch from overwriting form state
  const hasInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (open && !hasInitializedRef.current) {
      if (trip) {
        // Edit mode: pre-fill form
        reset({
          route_id: trip.route_id,
          vehicle_id: trip.vehicle_id,
          departure_time: toDatetimeLocal(trip.departure_time),
          estimated_arrival_time: toDatetimeLocal(trip.estimated_arrival_time),
          status: trip.status,
          price_override: trip.price_override,
          notes: trip.notes,
        });
      } else {
        // Create mode: reset to defaults
        reset({
          route_id: '',
          vehicle_id: '',
          departure_time: '',
          estimated_arrival_time: '',
          status: 'scheduled',
          price_override: null,
          notes: null,
        });
      }
      hasInitializedRef.current = true;
    }
    if (!open) hasInitializedRef.current = false;
  }, [open, trip, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: TripFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        toast({
          title: 'Thành công',
          description: 'Tạo chuyến đi thành công',
          variant: 'success',
        });
      } else if (trip) {
        await updateMutation.mutateAsync({ id: trip.id, input: payload });
        toast({
          title: 'Thành công',
          description: 'Cập nhật chuyến đi thành công',
          variant: 'success',
        });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapTripError(
          error as {
            code?: string;
            message?: string;
            details?: string;
            status?: number;
          },
          'mutate'
        ),
        variant: 'destructive',
      });
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa chuyến đi' : 'Thêm chuyến đi mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
            {/* Route FK dropdown */}
            <FormFieldWrapper
              label="Tuyến đường"
              error={errors.route_id?.message}
              required
            >
              {routesData === undefined ? (
                <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải tuyến đường...
                </div>
              ) : (
                <>
                  <Select
                    value={watchedRouteId}
                    onValueChange={(val) =>
                      setValue('route_id', val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn tuyến đường" />
                    </SelectTrigger>
                    <SelectContent>
                      {routes.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Chưa có tuyến đường nào — tạo tuyến đường trước ở /routes
                        </div>
                      ) : (
                        routes.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            {r.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {routesCount > routes.length && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Hiển thị {routes.length} / {routesCount} tuyến đường.
                    </p>
                  )}
                </>
              )}
            </FormFieldWrapper>

            {/* Vehicle FK dropdown */}
            <FormFieldWrapper
              label="Xe"
              error={errors.vehicle_id?.message}
              required
            >
              {vehiclesData === undefined ? (
                <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Đang tải xe...
                </div>
              ) : (
                <>
                  <Select
                    value={watchedVehicleId}
                    onValueChange={(val) =>
                      setValue('vehicle_id', val, { shouldValidate: true })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn xe" />
                    </SelectTrigger>
                    <SelectContent>
                      {vehicles.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-muted-foreground">
                          Chưa có xe nào — tạo xe trước ở /vehicles
                        </div>
                      ) : (
                        vehicles.map((v) => (
                          <SelectItem key={v.id} value={v.id}>
                            {v.license_plate}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>

                  {vehiclesCount > vehicles.length && (
                    <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                      <AlertTriangle className="h-3 w-3" />
                      Hiển thị {vehicles.length} / {vehiclesCount} xe.
                    </p>
                  )}
                </>
              )}
            </FormFieldWrapper>

            {/* Departure Time | Estimated Arrival Time */}
            <div className="grid grid-cols-2 gap-4">
              <FormFieldWrapper
                label="Giờ đi"
                error={errors.departure_time?.message}
                required
              >
                <Input
                  {...register('departure_time')}
                  type="datetime-local"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Giờ đến dự kiến"
                error={errors.estimated_arrival_time?.message}
                required
              >
                <Input
                  {...register('estimated_arrival_time')}
                  type="datetime-local"
                />
              </FormFieldWrapper>
            </div>

            {/* Status (edit mode only) */}
            {isEdit && (
              <FormFieldWrapper
                label="Trạng thái"
                error={errors.status?.message}
              >
                <Controller
                  name="status"
                  control={control}
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        {TRIP_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status === 'scheduled' && 'Đã lên lịch'}
                            {status === 'in_progress' && 'Đang chạy'}
                            {status === 'completed' && 'Hoàn thành'}
                            {status === 'cancelled' && 'Đã hủy'}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormFieldWrapper>
            )}

            {/* Price Override (optional) */}
            <FormFieldWrapper
              label="Giá vé tùy chỉnh (đ)"
              error={errors.price_override?.message}
            >
              <Input
                {...register('price_override', { valueAsNumber: true })}
                type="number"
                step="1000"
                placeholder="Để trống nếu dùng giá mặc định"
              />
            </FormFieldWrapper>

            {/* Notes (optional) */}
            <FormFieldWrapper
              label="Ghi chú"
              error={errors.notes?.message}
            >
              <Input
                {...register('notes')}
                maxLength={500}
                placeholder="Ghi chú về chuyến đi (tối đa 500 ký tự)"
              />
            </FormFieldWrapper>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isEdit ? 'Lưu' : 'Thêm'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
