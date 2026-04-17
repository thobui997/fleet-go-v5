import * as React from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, Loader2, AlertTriangle, AlertCircle } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  FormFieldWrapper,
  FormSection,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
  Textarea,
  useToast,
} from '@shared/ui';
import {
  useCreateMaintenanceLog,
  useMaintenanceLog,
  useUpdateMaintenanceLog,
  MAINTENANCE_TYPES,
} from '@entities/maintenance-log';
import { useVehicles } from '@entities/vehicle';
import { ROUTES } from '@shared/config/routes';
import {
  maintenanceFormSchema,
  type MaintenanceFormValues,
  mapSupabaseError,
  serializeToInsert,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/maintenance-form-schema';

const MAINTENANCE_TYPE_LABELS: Record<string, string> = {
  routine: 'Bảo trì định kỳ',
  repair: 'Sửa chữa',
  inspection: 'Kiểm định',
  emergency: 'Khẩn cấp',
};

function mapFetchError(error: unknown): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === 'PGRST116' || e?.status === 406)
    return 'Không tìm thấy bản ghi bảo trì.';
  if (e?.status === 401 || e?.status === 403 || e?.code === 'PGRST301')
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể tải bản ghi. Vui lòng thử lại.';
}

export function MaintenanceFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const mode = id ? 'edit' : 'create';
  const { toast } = useToast();

  const createMutation = useCreateMaintenanceLog();
  const updateMutation = useUpdateMaintenanceLog();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    data: log,
    isLoading,
    isError,
    error: fetchError,
  } = useMaintenanceLog(id ?? '');

  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  const vehicles = vehiclesData?.data ?? [];
  const vehiclesCount = vehiclesData?.count ?? 0;

  const today = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceFormSchema),
    defaultValues: {
      vehicle_id: '',
      type: 'routine',
      description: '',
      cost: '',
      performed_by: '',
      performed_at: today,
      next_due_date: '',
      odometer_reading: '',
      notes: '',
    },
  });

  const watchedVehicleId = watch('vehicle_id');
  const watchedType = watch('type');

  const hasInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (mode === 'edit' && log && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
      reset({
        vehicle_id: log.vehicle_id,
        type: log.type,
        description: log.description,
        cost: log.cost != null ? log.cost : '',
        performed_by: log.performed_by ?? '',
        performed_at: log.performed_at,
        next_due_date: log.next_due_date ?? '',
        odometer_reading: log.odometer_reading != null ? log.odometer_reading : '',
        notes: log.notes ?? '',
      });
    }
  }, [mode, log, reset]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isPending && currentLocation.pathname !== nextLocation.pathname
  );

  const onSubmit = async (values: MaintenanceFormValues) => {
    const payload = serializeToInsert(values);
    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Đã tạo lịch bảo trì' });
      } else if (id) {
        await updateMutation.mutateAsync({ id, input: payload });
        toast({ title: 'Đã cập nhật lịch bảo trì' });
      }
      // reset() before navigate() to clear isDirty — prevents useBlocker from
      // intercepting the post-submit redirect
      reset(values);
      navigate(ROUTES.MAINTENANCE);
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapSupabaseError(
          error as { code?: string; message?: string; status?: number }
        ),
        variant: 'destructive',
      });
    }
  };

  const pageTitle = mode === 'create' ? 'Thêm bảo trì mới' : 'Chỉnh sửa bảo trì';
  const showForm = mode === 'create' || (mode === 'edit' && !isLoading && !isError);
  const submitDisabled = isPending || (mode === 'edit' && (isLoading || isError));

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-none pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate(ROUTES.MAINTENANCE)}
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
            {mode === 'edit' && isLoading && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                <div className="space-y-3">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-44" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Error state — edit mode only */}
            {mode === 'edit' && isError && (
              <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive" />
                <p className="text-sm font-medium text-destructive">
                  {mapFetchError(fetchError)}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(ROUTES.MAINTENANCE)}
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
                                  Chưa có xe — tạo xe trước ở mục Xe
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

                    <FormFieldWrapper
                      label="Loại bảo trì"
                      error={errors.type?.message}
                      required
                    >
                      <Select
                        value={watchedType}
                        onValueChange={(val) =>
                          setValue('type', val as MaintenanceFormValues['type'], {
                            shouldValidate: true,
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại" />
                        </SelectTrigger>
                        <SelectContent>
                          {MAINTENANCE_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {MAINTENANCE_TYPE_LABELS[t]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormFieldWrapper>

                    <FormFieldWrapper
                      label="Mô tả"
                      error={errors.description?.message}
                      required
                    >
                      <Textarea
                        {...register('description')}
                        placeholder="Mô tả công việc bảo trì…"
                        rows={4}
                      />
                    </FormFieldWrapper>
                  </FormSection>

                  {/* Right column — Chi phí & Thực hiện + Lịch bảo trì */}
                  <div className="space-y-8">
                    <FormSection title="Chi phí & Thực hiện">
                      <FormFieldWrapper label="Chi phí (VND)" error={errors.cost?.message}>
                        <Input
                          {...register('cost')}
                          type="number"
                          placeholder="VD: 500000"
                          min={0}
                          step={1}
                        />
                      </FormFieldWrapper>

                      <FormFieldWrapper
                        label="Người thực hiện"
                        error={errors.performed_by?.message}
                      >
                        <Input
                          {...register('performed_by')}
                          placeholder="Tên garage hoặc kỹ thuật viên"
                        />
                      </FormFieldWrapper>
                    </FormSection>

                    <FormSection title="Lịch bảo trì">
                      <FormFieldWrapper
                        label="Ngày thực hiện"
                        error={errors.performed_at?.message}
                        required
                      >
                        <Input {...register('performed_at')} type="date" />
                      </FormFieldWrapper>

                      <FormFieldWrapper
                        label="Ngày bảo trì kế tiếp"
                        error={errors.next_due_date?.message}
                      >
                        <Input {...register('next_due_date')} type="date" />
                      </FormFieldWrapper>

                      <FormFieldWrapper
                        label="Số km (đồng hồ)"
                        error={errors.odometer_reading?.message}
                      >
                        <Input
                          {...register('odometer_reading')}
                          type="number"
                          placeholder="VD: 15000"
                          min={0}
                        />
                      </FormFieldWrapper>
                    </FormSection>
                  </div>
                </div>

                {/* Ghi chú — full width below the 2-column row */}
                <FormSection title="Ghi chú">
                  <FormFieldWrapper label="Ghi chú" error={errors.notes?.message}>
                    <Textarea
                      {...register('notes')}
                      placeholder="Ghi chú thêm…"
                      rows={3}
                    />
                  </FormFieldWrapper>
                </FormSection>

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
              onClick={() => navigate(ROUTES.MAINTENANCE)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitDisabled}>
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
