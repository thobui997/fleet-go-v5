import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  FormFieldWrapper,
  FormSection,
  Switch,
  Label,
  useToast,
} from '@shared/ui';
import { useCreateStation, useUpdateStation } from '@entities/station';
import type { Station } from '@entities/station';
import {
  stationFormSchema,
  type StationFormValues,
  mapSupabaseError,
  serializeToInsert,
} from '../model/station-form-schema';

interface StationFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
}

export function StationFormDialog({
  open,
  onOpenChange,
  station,
}: StationFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateStation();
  const updateMutation = useUpdateStation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<StationFormValues>({
    resolver: zodResolver(stationFormSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      province: '',
      latitude: '',
      longitude: '',
      is_active: true,
    },
  });

  // Reset form when station or open state changes
  React.useEffect(() => {
    if (station === null) {
      reset({
        name: '',
        code: '',
        address: '',
        city: '',
        province: '',
        latitude: '',
        longitude: '',
        is_active: true,
      });
    } else {
      reset({
        name: station.name,
        code: station.code ?? '',
        address: station.address ?? '',
        city: station.city,
        province: station.province ?? '',
        latitude: station.latitude !== null ? station.latitude : '',
        longitude: station.longitude !== null ? station.longitude : '',
        is_active: station.is_active,
      });
    }
  }, [station, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: StationFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (station === null) {
        await createMutation.mutateAsync(payload);
        toast({ title: 'Thành công', description: 'Đã tạo trạm', variant: 'success' });
      } else {
        await updateMutation.mutateAsync({ id: station.id, input: payload });
        toast({ title: 'Thành công', description: 'Đã cập nhật trạm', variant: 'success' });
      }
      onOpenChange(false);
      reset();
    } catch (error) {
      toast({
        title: 'Lỗi',
        variant: 'destructive',
        description: mapSupabaseError(
          error as {
            code?: string;
            message?: string;
            details?: string;
            status?: number;
          }
        ),
      });
    }
  };

  const isEdit = station !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Chỉnh sửa trạm' : 'Thêm trạm mới'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] overflow-y-auto p-[3px] -m-[3px] pr-1">
            <div className="space-y-6">
              <FormSection title="Thông tin trạm">
                {/* Tên trạm — full width */}
                <FormFieldWrapper
                  label="Tên trạm"
                  error={errors.name?.message}
                  required
                >
                  <Input
                    {...register('name')}
                    placeholder="VD: Bến xe Miền Đông"
                  />
                </FormFieldWrapper>

                {/* Thành phố | Tỉnh/Thành */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Thành phố"
                    error={errors.city?.message}
                    required
                  >
                    <Input {...register('city')} placeholder="VD: Hồ Chí Minh" />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    label="Tỉnh/Thành"
                    error={errors.province?.message}
                  >
                    <Input
                      {...register('province')}
                      placeholder="Tùy chọn"
                    />
                  </FormFieldWrapper>
                </div>

                {/* Mã trạm | Địa chỉ */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Mã trạm"
                    error={errors.code?.message}
                  >
                    <Input
                      {...register('code')}
                      placeholder="VD: SGN-ME (tùy chọn)"
                      className="font-mono uppercase"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    label="Địa chỉ"
                    error={errors.address?.message}
                  >
                    <Input
                      {...register('address')}
                      placeholder="Số nhà, đường... (tùy chọn)"
                    />
                  </FormFieldWrapper>
                </div>
              </FormSection>

              <FormSection title="Tọa độ & Trạng thái">
                {/* Vĩ độ | Kinh độ */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Vĩ độ"
                    error={errors.latitude?.message}
                  >
                    <Input
                      {...register('latitude')}
                      type="text"
                      placeholder="VD: 10.7769"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper
                    label="Kinh độ"
                    error={errors.longitude?.message}
                  >
                    <Input
                      {...register('longitude')}
                      type="text"
                      placeholder="VD: 106.7009"
                    />
                  </FormFieldWrapper>
                </div>

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
              </FormSection>
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
