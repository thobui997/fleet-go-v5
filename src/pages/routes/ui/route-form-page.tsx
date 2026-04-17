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
  Switch,
  Label,
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
import { useRoute, useCreateRoute, useUpdateRoute } from '@entities/route';
import { useStations } from '@entities/station';
import {
  routeFormSchema,
  type RouteFormValues,
  mapSupabaseError as mapRouteError,
  serializeToInsert,
  parseDurationMinutes,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/route-form-schema';

function mapFetchError(error: unknown): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === 'PGRST116' || e?.status === 406)
    return 'Không tìm thấy tuyến đường.';
  if (e?.status === 401 || e?.status === 403 || e?.code === 'PGRST301')
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể tải tuyến đường. Vui lòng thử lại.';
}

export function RouteFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    data: routeData,
    isLoading: isRouteLoading,
    isError: isRouteError,
    error: routeError,
  } = useRoute(id ?? '');

  const originStationsQuery = useStations({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });
  const destStationsQuery = useStations({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  const originStations = originStationsQuery.data?.data ?? [];
  const originCount = originStationsQuery.data?.count ?? 0;
  const destStations = destStationsQuery.data?.data ?? [];
  const destCount = destStationsQuery.data?.count ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<RouteFormValues>({
    resolver: zodResolver(routeFormSchema),
    defaultValues: {
      name: '',
      origin_station_id: '',
      destination_station_id: '',
      distance_km: '' as unknown as number,
      estimated_duration_minutes: '' as unknown as number,
      base_price: 0,
      is_active: true,
    },
  });

  const watchedOriginId = watch('origin_station_id');
  const watchedDestId = watch('destination_station_id');

  const hasInitializedRef = React.useRef(false);
  React.useEffect(() => {
    if (!hasInitializedRef.current && routeData) {
      reset({
        name: routeData.name,
        origin_station_id: routeData.origin_station_id,
        destination_station_id: routeData.destination_station_id,
        distance_km: routeData.distance_km,
        estimated_duration_minutes: parseDurationMinutes(
          routeData.estimated_duration
        ),
        base_price: routeData.base_price,
        is_active: routeData.is_active,
      });
      hasInitializedRef.current = true;
    }
  }, [routeData, reset]);

  const [saveAndStops, setSaveAndStops] = React.useState(false);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isPending && currentLocation.pathname !== nextLocation.pathname
  );

  const onSubmit = async (values: RouteFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (id) {
        await updateMutation.mutateAsync({ id, input: payload });
        toast({ title: 'Đã cập nhật tuyến đường' });
      } else {
        const result = await createMutation.mutateAsync(payload);
        toast({ title: 'Đã tạo tuyến đường' });

        if (saveAndStops && result?.id) {
          reset(values);
          navigate(ROUTES.ROUTES_STOPS.replace(':id', result.id));
          return;
        }
      }

      reset(values);
      navigate(ROUTES.ROUTES);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapRouteError(
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
  const pageTitle = mode === 'create' ? 'Thêm tuyến đường mới' : 'Chỉnh sửa tuyến đường';
  const showForm = mode === 'create' || (mode === 'edit' && !isRouteLoading && !isRouteError);
  const submitDisabled = isPending || (mode === 'edit' && (isRouteLoading || isRouteError));
  const canSubmit = originStations.length > 0 && destStations.length > 0 && watchedOriginId && watchedDestId;

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
          <h1 className="text-2xl font-bold tracking-tight">{pageTitle}</h1>
        </div>
      </div>

      {/* Form wraps scrollable content + sticky footer */}
      <form className="flex flex-col flex-1 min-h-0" onSubmit={handleSubmit(onSubmit)}>
        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          <div className="py-6 px-1 space-y-8">

            {/* Loading skeleton — edit mode only */}
            {mode === 'edit' && isRouteLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-28" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-24" />
                  <div className="grid grid-cols-2 gap-4">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </div>
            )}

            {/* Error state — edit mode only */}
            {mode === 'edit' && isRouteError && (
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

            {/* Form sections */}
            {showForm && (
              <div className="space-y-8">

                {/* Top row: 2 columns at section level */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">

                  {/* Left column — Thông tin chung */}
                  <FormSection title="Thông tin chung">
                    <FormFieldWrapper
                      label="Tên tuyến đường"
                      error={errors.name?.message}
                      required
                    >
                      <Input
                        {...register('name')}
                        placeholder="VD: Hà Nội - Hồ Chí Minh"
                      />
                    </FormFieldWrapper>

                    <FormFieldWrapper
                      label="Trạm đi"
                      error={errors.origin_station_id?.message}
                      required
                    >
                      {originStationsQuery.isLoading ? (
                        <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải trạm...
                        </div>
                      ) : (
                        <>
                          <Select
                            value={watchedOriginId}
                            onValueChange={(val) =>
                              setValue('origin_station_id', val, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn trạm đi" />
                            </SelectTrigger>
                            <SelectContent>
                              {originStations.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  Chưa có trạm nào — tạo trạm trước ở /stations
                                </div>
                              ) : (
                                originStations.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>

                          {originCount > originStations.length && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Hiển thị {originStations.length} / {originCount} trạm.
                              Liên hệ quản trị viên nếu không thấy trạm cần chọn.
                            </p>
                          )}
                        </>
                      )}
                    </FormFieldWrapper>

                    <FormFieldWrapper
                      label="Trạm đến"
                      error={errors.destination_station_id?.message}
                      required
                    >
                      {destStationsQuery.isLoading ? (
                        <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Đang tải trạm...
                        </div>
                      ) : (
                        <>
                          <Select
                            value={watchedDestId}
                            onValueChange={(val) =>
                              setValue('destination_station_id', val, {
                                shouldValidate: true,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Chọn trạm đến" />
                            </SelectTrigger>
                            <SelectContent>
                              {destStations.length === 0 ? (
                                <div className="px-3 py-2 text-sm text-muted-foreground">
                                  Chưa có trạm nào — tạo trạm trước ở /stations
                                </div>
                              ) : (
                                destStations.map((s) => (
                                  <SelectItem key={s.id} value={s.id}>
                                    {s.name}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>

                          {destCount > destStations.length && (
                            <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                              <AlertTriangle className="h-3 w-3" />
                              Hiển thị {destStations.length} / {destCount} trạm.
                              Liên hệ quản trị viên nếu không thấy trạm cần chọn.
                            </p>
                          )}
                        </>
                      )}
                    </FormFieldWrapper>
                  </FormSection>

                  {/* Right column — Chi tiết */}
                  <FormSection title="Chi tiết">
                    <div className="grid grid-cols-2 gap-4">
                      <FormFieldWrapper
                        label="Khoảng cách (km)"
                        error={errors.distance_km?.message}
                        required
                      >
                        <Input
                          {...register('distance_km')}
                          type="number"
                          step="0.01"
                          min="0.01"
                          placeholder="VD: 1700"
                        />
                      </FormFieldWrapper>

                      <FormFieldWrapper
                        label="Thời gian (phút)"
                        error={errors.estimated_duration_minutes?.message}
                        required
                      >
                        <Input
                          {...register('estimated_duration_minutes')}
                          type="number"
                          min="1"
                          placeholder="VD: 90 (phút)"
                        />
                      </FormFieldWrapper>
                    </div>

                    <FormFieldWrapper
                      label="Giá vé cơ bản (đ)"
                      error={errors.base_price?.message}
                      required
                    >
                      <Input
                        {...register('base_price')}
                        type="number"
                        min="0"
                        step="1000"
                        placeholder="VD: 150000"
                      />
                    </FormFieldWrapper>

                    <div className="flex items-center gap-3">
                      <Controller
                        name="is_active"
                        control={control}
                        render={({ field }) => (
                          <Switch
                            id="is_active"
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        )}
                      />
                      <Label htmlFor="is_active">Đang hoạt động</Label>
                    </div>
                  </FormSection>

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
              onClick={() => navigate(ROUTES.ROUTES)}
              disabled={isPending}
            >
              Hủy
            </Button>
            {mode === 'create' && (
              <Button
                type="submit"
                variant="secondary"
                disabled={!canSubmit || submitDisabled}
                onClick={() => setSaveAndStops(true)}
              >
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Lưu & Điểm dừng
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
