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
  FormSection,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import { DatePicker } from '@shared/ui/form';
import { useCreateVehicle, useUpdateVehicle } from '@entities/vehicle';
import { useVehicleTypes } from '@entities/vehicle-type';
import type { Vehicle } from '@entities/vehicle';
import {
  vehicleFormSchema,
  type VehicleFormValues,
  mapSupabaseError,
  serializeToInsert,
  FK_DROPDOWN_PAGE_SIZE,
} from '../model/vehicle-form-schema';

interface VehicleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  vehicle: Vehicle | null;
}

export function VehicleFormDialog({
  open,
  onOpenChange,
  mode,
  vehicle,
}: VehicleFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateVehicle();
  const updateMutation = useUpdateVehicle();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: vehicleTypesData, isLoading: isLoadingTypes } = useVehicleTypes({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });

  const vehicleTypes = vehicleTypesData?.data ?? [];
  const vehicleTypesCount = vehicleTypesData?.count ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm<VehicleFormValues>({
    resolver: zodResolver(vehicleFormSchema),
    defaultValues: {
      vehicle_type_id: '',
      license_plate: '',
      vin_number: '',
      year_manufactured: '',
      status: 'active',
      current_mileage: '',
      last_maintenance_date: '',
      next_maintenance_date: '',
      notes: '',
    },
  });

  const watchedStatus = watch('status');
  const watchedVehicleTypeId = watch('vehicle_type_id');

  // Reset form on open/vehicle change
  React.useEffect(() => {
    if (!open) return;

    if (mode === 'edit' && vehicle) {
      reset({
        vehicle_type_id: vehicle.vehicle_type_id,
        license_plate: vehicle.license_plate,
        vin_number: vehicle.vin_number ?? '',
        year_manufactured:
          vehicle.year_manufactured != null ? vehicle.year_manufactured : '',
        status: vehicle.status,
        current_mileage:
          vehicle.current_mileage != null ? vehicle.current_mileage : '',
        last_maintenance_date: vehicle.last_maintenance_date ?? '',
        next_maintenance_date: vehicle.next_maintenance_date ?? '',
        notes: vehicle.notes ?? '',
      });
    } else {
      reset({
        vehicle_type_id: '',
        license_plate: '',
        vin_number: '',
        year_manufactured: '',
        status: 'active',
        current_mileage: '',
        last_maintenance_date: '',
        next_maintenance_date: '',
        notes: '',
      });
    }
  }, [open, mode, vehicle, reset]);

  // Guard: prevent closing while mutation is in flight
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: VehicleFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (mode === 'create') {
        await createMutation.mutateAsync(payload);
      } else if (vehicle) {
        await updateMutation.mutateAsync({ id: vehicle.id, input: payload });
      }
      onOpenChange(false);
      toast({
        title: 'Thành công',
        description:
          mode === 'create'
            ? `Xe "${values.license_plate}" đã được thêm.`
            : `Xe "${values.license_plate}" đã được cập nhật.`,
        variant: 'success',
      });
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
      <DialogContent className="sm:max-w-[680px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Thêm xe mới' : 'Chỉnh sửa xe'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] overflow-y-auto p-[3px] -m-[3px] pr-1">
            <div className="space-y-6">
              <FormSection title="Thông tin xe">
                {/* Loại xe — full width */}
                <FormFieldWrapper
                  label="Loại xe"
                  error={errors.vehicle_type_id?.message}
                  required
                >
                  {isLoadingTypes ? (
                    <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang tải loại xe…
                    </div>
                  ) : (
                    <>
                      <Select
                        value={watchedVehicleTypeId}
                        onValueChange={(val) =>
                          setValue('vehicle_type_id', val, { shouldValidate: true })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn loại xe" />
                        </SelectTrigger>
                        <SelectContent>
                          {vehicleTypes.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-muted-foreground">
                              Chưa có loại xe — tạo loại xe trước ở /vehicle-types
                            </div>
                          ) : (
                            vehicleTypes.map((vt) => (
                              <SelectItem key={vt.id} value={vt.id}>
                                {vt.name}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>

                      {/* Truncation warning */}
                      {vehicleTypesCount > vehicleTypes.length && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="h-3 w-3" />
                          Hiển thị {vehicleTypes.length} / {vehicleTypesCount} loại xe. Liên hệ quản trị
                          viên nếu không thấy loại xe cần chọn.
                        </p>
                      )}
                    </>
                  )}
                </FormFieldWrapper>

                {/* Biển số xe | Số VIN */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Biển số xe"
                    error={errors.license_plate?.message}
                    required
                  >
                    <Input
                      {...register('license_plate')}
                      placeholder="VD: 51A-12345"
                      className="font-mono uppercase"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper label="Số VIN" error={errors.vin_number?.message}>
                    <Input
                      {...register('vin_number')}
                      placeholder="Tùy chọn"
                      className="font-mono uppercase"
                    />
                  </FormFieldWrapper>
                </div>

                {/* Năm sản xuất | Trạng thái */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Năm sản xuất"
                    error={errors.year_manufactured?.message}
                  >
                    <Input
                      {...register('year_manufactured')}
                      type="number"
                      placeholder="VD: 2022"
                      min={1990}
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    label="Trạng thái"
                    error={errors.status?.message}
                    required
                  >
                    <Select
                      value={watchedStatus}
                      onValueChange={(val) =>
                        setValue('status', val as VehicleFormValues['status'], {
                          shouldValidate: true,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn trạng thái" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Đang hoạt động</SelectItem>
                        <SelectItem value="maintenance">Đang bảo trì</SelectItem>
                        <SelectItem value="retired">Đã ngừng sử dụng</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormFieldWrapper>
                </div>
              </FormSection>

              <FormSection title="Vận hành & Bảo trì">
                {/* Số km hiện tại | spacer */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Số km hiện tại"
                    error={errors.current_mileage?.message}
                  >
                    <Input
                      {...register('current_mileage')}
                      type="number"
                      placeholder="VD: 15000"
                      min={0}
                    />
                  </FormFieldWrapper>
                  <div />
                </div>

                {/* Ngày bảo trì gần nhất | Ngày bảo trì kế tiếp */}
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    control={control}
                    name="last_maintenance_date"
                    label="Ngày bảo trì gần nhất"
                    error={errors.last_maintenance_date?.message}
                  />

                  <DatePicker
                    control={control}
                    name="next_maintenance_date"
                    label="Ngày bảo trì kế tiếp"
                    error={errors.next_maintenance_date?.message}
                  />
                </div>

                {/* Ghi chú — full width */}
                <FormFieldWrapper label="Ghi chú" error={errors.notes?.message}>
                  <Textarea
                    {...register('notes')}
                    placeholder="Ghi chú về xe..."
                    rows={2}
                  />
                </FormFieldWrapper>
              </FormSection>
            </div>
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
