import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  FormFieldWrapper,
  Switch,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@shared/ui';
import { useRoles } from '@entities/role';
import {
  useProfiles,
  useEmployeeRole,
  useCreateEmployee,
  useUpdateEmployee,
  assignEmployeeRole,
} from '@entities/employee';
import type { Employee } from '@entities/employee';
import {
  employeeFormSchema,
  type EmployeeFormValues,
  mapEmployeeError,
} from '../model/employee-form-schema';

interface EmployeeFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeFormDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeFormDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const { data: rolesData } = useRoles({ page: 1, pageSize: 1000 });
  const roles = rolesData?.data ?? [];

  const { data: profiles = [] } = useProfiles();

  // Only fetch the current role when editing an employee with a linked user
  const { data: currentRole } = useEmployeeRole(
    employee?.user_id ?? null
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<EmployeeFormValues>({
    resolver: zodResolver(employeeFormSchema),
    defaultValues: {
      user_id: null,
      hire_date: null,
      license_number: null,
      license_expiry: null,
      is_active: true,
      role_id: null,
    },
  });

  // Reset for create mode
  React.useEffect(() => {
    if (open && employee === null) {
      setSubmitError(null);
      reset({
        user_id: null,
        hire_date: null,
        license_number: null,
        license_expiry: null,
        is_active: true,
        role_id: null,
      });
    }
  }, [open, employee, reset]);

  // Reset for edit mode — CRITICAL: wait until currentRole is not undefined
  // (undefined = still loading, null = no role, string = has role)
  React.useEffect(() => {
    if (open && employee !== null && currentRole !== undefined) {
      setSubmitError(null);
      reset({
        user_id: employee.user_id ?? null,
        hire_date: employee.hire_date ?? null,
        license_number: employee.license_number ?? null,
        license_expiry: employee.license_expiry ?? null,
        is_active: employee.is_active,
        role_id: currentRole ?? null,
      });
    }
  }, [open, employee, currentRole, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const isEdit = employee !== null;

  const onSubmit = async (values: EmployeeFormValues) => {
    setSubmitError(null);

    const payload = {
      user_id: values.user_id ?? null,
      hire_date: values.hire_date ?? null,
      license_number: values.license_number ?? null,
      license_expiry: values.license_expiry ?? null,
      is_active: values.is_active,
    };

    // Step 1: save employee record
    let savedUserId: string | null = null;
    try {
      if (isEdit) {
        const updated = await updateMutation.mutateAsync({
          id: employee.id,
          input: payload,
        });
        savedUserId = updated.user_id;
      } else {
        const created = await createMutation.mutateAsync(payload);
        savedUserId = created.user_id;
      }
    } catch (err) {
      setSubmitError(mapEmployeeError(err));
      return; // keep dialog open — nothing was saved
    }

    // Step 2: assign role (employee already persisted at this point)
    if (savedUserId) {
      try {
        await assignEmployeeRole(savedUserId, values.role_id ?? null);
      } catch (_err) {
        // Employee was saved — close dialog and refresh list, but warn about role failure
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        onOpenChange(false);
        toast({
          title:
            'Nhân viên đã được lưu, nhưng không thể cập nhật vai trò. Vui lòng thử lại.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Full success
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    onOpenChange(false);
    toast({
      description: isEdit
        ? 'Cập nhật nhân viên thành công'
        : 'Tạo nhân viên thành công',
      variant: 'success',
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa nhân viên' : 'Thêm nhân viên mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto pr-1">
            {/* User dropdown */}
            <FormFieldWrapper
              label="Người dùng"
              error={errors.user_id?.message}
            >
              <Controller
                name="user_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(val) =>
                      field.onChange(val === '__none__' ? null : val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn người dùng" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Không liên kết</SelectItem>
                      {profiles.map((profile) => (
                        <SelectItem key={profile.id} value={profile.id}>
                          {profile.full_name
                            ? `${profile.full_name} (${profile.email})`
                            : profile.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {profiles.length >= 1000 && (
                <p className="text-xs text-yellow-600 mt-1">
                  Danh sách người dùng bị giới hạn 1000 kết quả.
                </p>
              )}
            </FormFieldWrapper>

            {/* Hire date | License number */}
            <div className="grid grid-cols-2 gap-4">
              <FormFieldWrapper
                label="Ngày vào làm"
                error={errors.hire_date?.message}
              >
                <Input
                  {...register('hire_date')}
                  type="date"
                />
              </FormFieldWrapper>

              <FormFieldWrapper
                label="Số bằng lái"
                error={errors.license_number?.message}
              >
                <Input
                  {...register('license_number')}
                  type="text"
                  placeholder="VD: B2-123456"
                />
              </FormFieldWrapper>
            </div>

            {/* License expiry */}
            <FormFieldWrapper
              label="Ngày hết hạn bằng lái"
              error={errors.license_expiry?.message}
            >
              <Input
                {...register('license_expiry')}
                type="date"
              />
            </FormFieldWrapper>

            {/* Role dropdown */}
            <FormFieldWrapper
              label="Vai trò"
              error={errors.role_id?.message}
            >
              <Controller
                name="role_id"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value ?? '__none__'}
                    onValueChange={(val) =>
                      field.onChange(val === '__none__' ? null : val)
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn vai trò" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Không có vai trò</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormFieldWrapper>

            {/* is_active */}
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

          {submitError && (
            <p className="text-sm text-destructive">{submitError}</p>
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
              Lưu
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
