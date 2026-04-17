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
  Textarea,
  FormFieldWrapper,
  FormSection,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import { DatePicker } from '@shared/ui/form';
import { useCreateCustomer, useUpdateCustomer } from '@entities/customer';
import type { Customer } from '@entities/customer';
import {
  customerFormSchema,
  type CustomerFormValues,
  mapSupabaseError,
  serializeToInsert,
} from '../model/customer-form-schema';

interface CustomerFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

const GENDER_OPTIONS = [
  { value: 'male', label: 'Nam' },
  { value: 'female', label: 'Nữ' },
  { value: 'other', label: 'Khác' },
] as const;

export function CustomerFormDialog({
  open,
  onOpenChange,
  customer,
}: CustomerFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateCustomer();
  const updateMutation = useUpdateCustomer();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const hasInitializedRef = React.useRef(false);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      full_name: '',
      phone_number: '',
      email: '',
      date_of_birth: '',
      gender: '',
      id_card_number: '',
      address: '',
      notes: '',
    },
  });

  // Reset form when customer or open state changes
  React.useEffect(() => {
    if (customer === null) {
      // Create mode: reset to defaults
      hasInitializedRef.current = false;
      reset({
        full_name: '',
        phone_number: '',
        email: '',
        date_of_birth: '',
        gender: '',
        id_card_number: '',
        address: '',
        notes: '',
      });
    } else if (!hasInitializedRef.current) {
      // Edit mode: pre-fill only once
      hasInitializedRef.current = true;
      reset({
        full_name: customer.full_name,
        phone_number: customer.phone_number,
        email: customer.email ?? '',
        date_of_birth: customer.date_of_birth ?? '',
        gender: customer.gender ?? '',
        id_card_number: customer.id_card_number ?? '',
        address: customer.address ?? '',
        notes: customer.notes ?? '',
      });
    }
  }, [customer, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const onSubmit = async (values: CustomerFormValues) => {
    const payload = serializeToInsert(values);

    try {
      if (customer === null) {
        await createMutation.mutateAsync(payload);
        toast({ description: 'Đã tạo khách hàng', variant: 'success' });
      } else {
        await updateMutation.mutateAsync({ id: customer.id, input: payload });
        toast({ description: 'Đã cập nhật khách hàng', variant: 'success' });
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
          }
        ),
      });
    }
  };

  const isEdit = customer !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[640px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa khách hàng' : 'Thêm khách hàng mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[58vh] overflow-y-auto p-[3px] -m-[3px] pr-1">
            <div className="space-y-6">
              <FormSection title="Thông tin cá nhân">
                {/* Họ tên — full width */}
                <FormFieldWrapper
                  label="Họ tên"
                  error={errors.full_name?.message}
                  required
                >
                  <Input {...register('full_name')} placeholder="Nhập họ tên" />
                </FormFieldWrapper>

                {/* Số điện thoại | Email */}
                <div className="grid grid-cols-2 gap-4">
                  <FormFieldWrapper
                    label="Số điện thoại"
                    error={errors.phone_number?.message}
                    required
                  >
                    <Input
                      {...register('phone_number')}
                      type="tel"
                      placeholder="VD: 0901234567"
                    />
                  </FormFieldWrapper>

                  <FormFieldWrapper label="Email" error={errors.email?.message}>
                    <Input
                      {...register('email')}
                      type="email"
                      placeholder="VD: email@example.com (tùy chọn)"
                    />
                  </FormFieldWrapper>
                </div>

                {/* Ngày sinh | Giới tính */}
                <div className="grid grid-cols-2 gap-4">
                  <DatePicker
                    control={control}
                    name="date_of_birth"
                    label="Ngày sinh"
                    error={errors.date_of_birth?.message}
                  />

                  <Controller
                    name="gender"
                    control={control}
                    render={({ field }) => (
                      <div className="space-y-2">
                        <Label>Giới tính</Label>
                        <Select
                          value={field.value || '__none__'}
                          onValueChange={(val) =>
                            field.onChange(val === '__none__' ? '' : val)
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Chọn giới tính" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">— Chọn giới tính —</SelectItem>
                            {GENDER_OPTIONS.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.gender?.message && (
                          <p className="text-sm text-destructive">
                            {errors.gender.message}
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>
              </FormSection>

              <FormSection title="Giấy tờ & Địa chỉ">
                {/* CMND/CCCD — full width */}
                <FormFieldWrapper
                  label="CMND/CCCD"
                  error={errors.id_card_number?.message}
                >
                  <Input
                    {...register('id_card_number')}
                    placeholder="Nhập số CMND/CCCD (tùy chọn)"
                  />
                </FormFieldWrapper>

                {/* Địa chỉ — full width */}
                <FormFieldWrapper label="Địa chỉ" error={errors.address?.message}>
                  <Textarea
                    {...register('address')}
                    placeholder="Nhập địa chỉ (tùy chọn)"
                    rows={2}
                  />
                </FormFieldWrapper>

                {/* Ghi chú — full width */}
                <FormFieldWrapper label="Ghi chú" error={errors.notes?.message}>
                  <Textarea
                    {...register('notes')}
                    placeholder="Ghi chú thêm (tùy chọn)"
                    rows={2}
                  />
                </FormFieldWrapper>
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
