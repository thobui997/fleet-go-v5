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
  Switch,
  Label,
  useToast,
} from '@shared/ui';
import { useCreateRoute, useUpdateRoute } from '@entities/route';
import type { Route } from '@entities/route';
import { useStations } from '@entities/station';
import {
  routeFormSchema,
  type RouteFormValues,
  mapSupabaseError,
  serializeToInsert,
  parseDurationMinutes,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/route-form-schema';

interface RouteFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  route: Route | null;
}

export function RouteFormDialog({
  open,
  onOpenChange,
  mode,
  route,
}: RouteFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateRoute();
  const updateMutation = useUpdateRoute();
  const isPending = createMutation.isPending || updateMutation.isPending;

  // Two useStations calls — same cache key (deduplication), one network request
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
    formState: { errors },
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

  // Reset form on open/route/mode change
  React.useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && route) {
      reset({
        name: route.name,
        origin_station_id: route.origin_station_id,
        destination_station_id: route.destination_station_id,
        distance_km: route.distance_km,
        estimated_duration_minutes: parseDurationMinutes(
          route.estimated_duration
        ),
        base_price: route.base_price,
        is_active: route.is_active,
      });
    } else {
      reset({
        name: '',
        origin_station_id: '',
        destination_station_id: '',
        distance_km: '' as unknown as number,
        estimated_duration_minutes: '' as unknown as number,
        base_price: 0,
        is_active: true,
      });
    }
  }, [open, mode, route, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: RouteFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        toast({ description: 'Đã tạo tuyến đường', variant: 'success' });
      } else if (route) {
        await updateMutation.mutateAsync({ id: route.id, input: payload });
        toast({ description: 'Đã cập nhật tuyến đường', variant: 'success' });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        variant: 'destructive',
        description: mapSupabaseError(
          error as {
            code?: string;
            message?: string;
            details?: string;
            status?: number;
          },
          'mutate'
        ),
      });
    }
  };

  const isEdit = mode === 'edit';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa tuyến đường' : 'Thêm tuyến đường mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
            {/* Route Name */}
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

            {/* Origin Station FK dropdown */}
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

            {/* Destination Station FK dropdown */}
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

            {/* Distance | Duration */}
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

            {/* Base Price */}
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

            {/* is_active — Controller for boolean Switch */}
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
          </div>

          {errors.root && (
            <p className="text-sm text-destructive">{errors.root.message}</p>
          )}

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
