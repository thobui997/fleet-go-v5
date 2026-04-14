import * as React from 'react';
import { useForm } from 'react-hook-form';
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
  Textarea,
  FormFieldWrapper,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import {
  useCreateMaintenanceLog,
  useUpdateMaintenanceLog,
  MAINTENANCE_TYPES,
} from '@entities/maintenance-log';
import type { MaintenanceLog } from '@entities/maintenance-log';
import { useVehicles } from '@entities/vehicle';
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

interface MaintenanceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  log: MaintenanceLog | null;
}

export function MaintenanceFormDialog({
  open,
  onOpenChange,
  mode,
  log,
}: MaintenanceFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateMaintenanceLog();
  const updateMutation = useUpdateMaintenanceLog();
  const isPending = createMutation.isPending || updateMutation.isPending;

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
    formState: { errors },
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

  React.useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && log) {
      reset({
        vehicle_id: log.vehicle_id,
        type: log.type,
        description: log.description,
        cost: log.cost != null ? log.cost : '',
        performed_by: log.performed_by ?? '',
        performed_at: log.performed_at,
        next_due_date: log.next_due_date ?? '',
        odometer_reading:
          log.odometer_reading != null ? log.odometer_reading : '',
        notes: log.notes ?? '',
      });
    } else {
      reset({
        vehicle_id: '',
        type: 'routine',
        description: '',
        cost: '',
        performed_by: '',
        performed_at: today,
        next_due_date: '',
        odometer_reading: '',
        notes: '',
      });
    }
  }, [open, mode, log, reset, today]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: MaintenanceFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Đã tạo lịch bảo trì' });
      } else if (log) {
        await updateMutation.mutateAsync({ id: log.id, input: payload });
        toast({ title: 'Đã cập nhật lịch bảo trì' });
      }
      onOpenChange(false);
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Thêm bảo trì mới' : 'Chỉnh sửa bảo trì'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
            {/* Vehicle FK dropdown */}
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

            {/* Maintenance Type */}
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

            {/* Description */}
            <FormFieldWrapper
              label="Mô tả"
              error={errors.description?.message}
              required
            >
              <Textarea
                {...register('description')}
                placeholder="Mô tả công việc bảo trì…"
                rows={2}
              />
            </FormFieldWrapper>

            {/* Cost */}
            <FormFieldWrapper label="Chi phí (VND)" error={errors.cost?.message}>
              <Input
                {...register('cost')}
                type="number"
                placeholder="VD: 500000"
                min={0}
                step={1}
              />
            </FormFieldWrapper>

            {/* Performed By */}
            <FormFieldWrapper
              label="Người thực hiện"
              error={errors.performed_by?.message}
            >
              <Input
                {...register('performed_by')}
                placeholder="Tên garage hoặc kỹ thuật viên"
              />
            </FormFieldWrapper>

            {/* Performed At */}
            <FormFieldWrapper
              label="Ngày thực hiện"
              error={errors.performed_at?.message}
              required
            >
              <Input {...register('performed_at')} type="date" />
            </FormFieldWrapper>

            {/* Next Due Date */}
            <FormFieldWrapper
              label="Ngày bảo trì kế tiếp"
              error={errors.next_due_date?.message}
            >
              <Input {...register('next_due_date')} type="date" />
            </FormFieldWrapper>

            {/* Odometer Reading */}
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

            {/* Notes */}
            <FormFieldWrapper label="Ghi chú" error={errors.notes?.message}>
              <Textarea
                {...register('notes')}
                placeholder="Ghi chú thêm…"
                rows={2}
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
              {mode === 'create' ? 'Thêm' : 'Lưu'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
