import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useParams, useNavigate, useBlocker } from 'react-router-dom';
import { Loader2, AlertTriangle, ArrowLeft, AlertCircle } from 'lucide-react';
import {
  Button,
  Input,
  FormFieldWrapper,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '@shared/ui';
import { FormSection } from '@shared/ui/form-section';
import { ROUTES } from '@shared/config/routes';
import { useRoutes } from '@entities/route';
import { useVehicles } from '@entities/vehicle';
import { useTrip, useCreateTrip, useUpdateTrip, TRIP_STATUSES } from '@entities/trip';
import {
  tripFormSchema,
  type TripFormValues,
  mapTripError,
  serializeToInsert,
  toDatetimeLocal,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/trip-form-schema';

function mapFetchError(error: unknown): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === 'PGRST116' || e?.status === 406)
    return 'Không tìm thấy chuyến đi.';
  if (e?.status === 401 || e?.status === 403 || e?.code === 'PGRST301')
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể tải chuyến đi. Vui lòng thử lại.';
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Đã lên lịch',
  in_progress: 'Đang chạy',
  completed: 'Hoàn thành',
  cancelled: 'Đã hủy',
};

export function TripFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useCreateTrip();
  const updateMutation = useUpdateTrip();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    data: tripData,
    isLoading: isTripLoading,
    isError: isTripError,
    error: tripError,
  } = useTrip(id ?? '');

  const { data: routesData, isLoading: isLoadingRoutes } = useRoutes({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE });
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({ page: 1, pageSize: FK_DROPDOWN_PAGE_SIZE });

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
    formState: { errors, isDirty },
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

  const hasInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasInitializedRef.current && tripData) {
      reset({
        route_id: tripData.route_id,
        vehicle_id: tripData.vehicle_id,
        departure_time: toDatetimeLocal(tripData.departure_time),
        estimated_arrival_time: toDatetimeLocal(tripData.estimated_arrival_time),
        status: tripData.status,
        price_override: tripData.price_override,
        notes: tripData.notes,
      });
      hasInitializedRef.current = true;
    }
  }, [tripData, reset]);

  const [saveAndAssign, setSaveAndAssign] = React.useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isPending && currentLocation.pathname !== nextLocation.pathname
  );

  const onSubmit = async (values: TripFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (id) {
        await updateMutation.mutateAsync({ id, input: payload });
        toast({ title: 'Đã cập nhật chuyến đi' });
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast({ title: 'Đã tạo chuyến đi' });

        if (saveAndAssign && result?.id) {
          reset(values);
          navigate(ROUTES.TRIPS_STAFF.replace(':id', result.id));
          return;
        }
      }

      reset(values);
      navigate(ROUTES.TRIPS);
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

  const mode = id ? 'edit' : 'create';
  const pageTitle = mode === 'create' ? 'Thêm chuyến đi mới' : 'Chỉnh sửa chuyến đi';
  const showForm = mode === 'create' || (mode === 'edit' && !isTripLoading && !isTripError);
  const submitDisabled = isPending || (mode === 'edit' && (isTripLoading || isTripError));
  const canSubmit = routes.length > 0 && vehicles.length > 0 && watchedRouteId && watchedVehicleId;

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-none pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate(ROUTES.TRIPS)}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Quay lại</span>
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      {/* Form wraps scrollable content + sticky footer */}
      <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit(onSubmit)}>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-6 px-1 space-y-8">

            {/* Loading skeleton — edit mode only */}
            {mode === 'edit' && isTripLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-28" />
                    <div className="grid grid-cols-2 gap-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Error state — edit mode only */}
            {mode === 'edit' && isTripError && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  {mapFetchError(tripError)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(ROUTES.TRIPS)}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Quay lại danh sách
                </Button>
              </div>
            )}

            {/* Form sections */}
            {showForm && (
              <div className="space-y-8">

                {/* Top row: 2 columns at section level */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                  {/* Left column — Hành trình */}
                  <FormSection title="Hành trình">
                    <FormFieldWrapper
                      label="Tuyến đường"
                      error={errors.route_id?.message}
                      required
                    >
                      {isLoadingRoutes ? (
                        <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải tuyến đường…
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
                                  Chưa có tuyến đường — tạo tuyến đường trước ở /routes
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
                              Hiển thị {routes.length} / {routesCount} tuyến đường. Liên hệ quản trị
                              viên nếu không thấy tuyến đường cần chọn.
                            </p>
                          )}
                        </>
                      )}
                    </FormFieldWrapper>

                    <FormFieldWrapper
                      label="Xe"
                      error={errors.vehicle_id?.message}
                      required
                    >
                      {isLoadingVehicles ? (
                        <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải danh sách xe…
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
                                  Chưa có xe — tạo xe trước ở /vehicles
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
                              Hiển thị {vehicles.length} / {vehiclesCount} xe. Liên hệ quản trị
                              viên nếu không thấy xe cần chọn.
                            </p>
                          )}
                        </>
                      )}
                    </FormFieldWrapper>
                  </FormSection>

                  {/* Right column — Thời gian + Điều chỉnh */}
                  <div className="space-y-8">
                    <FormSection title="Thời gian">
                      <div className="grid grid-cols-2 gap-4">
                        <FormFieldWrapper
                          label="Giờ đi"
                          error={errors.departure_time?.message}
                          required
                        >
                          <Input {...register('departure_time')} type="datetime-local" />
                        </FormFieldWrapper>

                        <FormFieldWrapper
                          label="Giờ đến dự kiến"
                          error={errors.estimated_arrival_time?.message}
                          required
                        >
                          <Input {...register('estimated_arrival_time')} type="datetime-local" />
                        </FormFieldWrapper>
                      </div>
                    </FormSection>

                    <FormSection title="Điều chỉnh">
                      {mode === 'edit' && (
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
                                      {STATUS_LABELS[status]}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}
                          />
                        </FormFieldWrapper>
                      )}

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
                    </FormSection>
                  </div>
                </div>

              </div>
            )}
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="flex-none border-t bg-background py-4 px-1">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.TRIPS)}
              disabled={isPending}
            >
              Hủy
            </Button>
            {mode === 'create' && (
              <Button
                type="submit"
                variant="secondary"
                disabled={!canSubmit || submitDisabled}
                onClick={() => setSaveAndAssign(true)}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu & Phân công
              </Button>
            )}
            <Button type="submit" disabled={!canSubmit || submitDisabled}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Thêm' : 'Lưu'}
            </Button>
          </div>
        </div>
      </form>

      {/* Dirty-state blocker dialog */}
      {blocker.state === 'blocked' && (
        <Dialog open onOpenChange={() => blocker.reset()}>
          <DialogContent className="sm:max-w-[400px]">
            <DialogHeader>
              <DialogTitle>Thoát mà không lưu?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              Bạn có dữ liệu chưa lưu. Thoát không?
            </p>
            <DialogFooter>
              <Button variant="outline" onClick={() => blocker.reset()}>
                Ở lại
              </Button>
              <Button variant="destructive" onClick={() => blocker.proceed()}>
                Thoát
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
