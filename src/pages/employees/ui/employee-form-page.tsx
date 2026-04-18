import * as React from 'react';
import { useNavigate, useParams, useBlocker } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2, AlertCircle, AlertTriangle } from 'lucide-react';
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
  Switch,
  Label,
  useToast,
} from '@shared/ui';
import { DatePicker } from '@shared/ui/form';
import {
  useProfiles,
  useEmployeeRole,
  useCreateEmployee,
  useUpdateEmployee,
  useEmployee,
  assignEmployeeRole,
} from '@entities/employee';
import { useRoles } from '@entities/role';
import { ROUTES } from '@shared/config/routes';
import {
  employeeFormSchema,
  type EmployeeFormValues,
  mapEmployeeError,
} from '../model/employee-form-schema';

// FK dropdown page size constant — must match pattern across form pages
const FK_DROPDOWN_PAGE_SIZE = 1000;

function mapFetchError(error: unknown): string {
  const e = error as { code?: string; status?: number } | null;
  if (e?.code === 'PGRST116' || e?.status === 406)
    return 'Không tìm thấy hồ sơ nhân viên.';
  if (e?.status === 401 || e?.status === 403 || e?.code === 'PGRST301')
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  return 'Không thể tải bản ghi. Vui lòng thử lại.';
}

export function EmployeeFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const mode = id ? 'edit' : 'create';
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    data: employee,
    isLoading,
    isError,
    error: fetchError,
  } = useEmployee(id ?? '');

  const { data: rolesData, isLoading: isLoadingRoles } = useRoles({
    page: 1,
    pageSize: FK_DROPDOWN_PAGE_SIZE,
  });
  const roles = rolesData?.data ?? [];
  const rolesCount = rolesData?.count ?? 0;

  const { data: profiles = [], isLoading: isLoadingProfiles } = useProfiles();

  // Only fetch the current role when editing an employee with a linked user
  const { data: currentRole } = useEmployeeRole(
    employee?.user_id ?? null
  );

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
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

  const hasInitializedRef = React.useRef(false);

  // Reset for create mode
  React.useEffect(() => {
    if (mode === 'create' && !hasInitializedRef.current) {
      hasInitializedRef.current = true;
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
  }, [mode, reset]);

  // Reset for edit mode — CRITICAL: wait until currentRole is not undefined
  // (undefined = still loading, null = no role, string = has role)
  React.useEffect(() => {
    if (
      mode === 'edit' &&
      employee &&
      currentRole !== undefined &&
      !hasInitializedRef.current
    ) {
      hasInitializedRef.current = true;
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
  }, [mode, employee, currentRole, reset]);

  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      isDirty && !isPending && currentLocation.pathname !== nextLocation.pathname
  );

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
      if (mode === 'edit' && id) {
        const updated = await updateMutation.mutateAsync({
          id,
          input: payload,
        });
        savedUserId = updated.user_id;
      } else {
        const created = await createMutation.mutateAsync(payload);
        savedUserId = created.user_id;
      }
    } catch (err) {
      setSubmitError(mapEmployeeError(err));
      return; // keep form open — nothing was saved
    }

    // Step 2: assign role (employee already persisted at this point)
    if (savedUserId) {
      try {
        await assignEmployeeRole(savedUserId, values.role_id ?? null);
      } catch (_err) {
        // Employee was saved — redirect and refresh list, but warn about role failure
        queryClient.invalidateQueries({ queryKey: ['employees'] });
        reset(values); // clear isDirty before redirect
        navigate(ROUTES.EMPLOYEES);
        toast({
          title: 'Cảnh báo',
          description: 'Nhân viên đã được lưu, nhưng không thể cập nhật vai trò. Vui lòng thử lại.',
          variant: 'destructive',
        });
        return;
      }
    }

    // Full success
    queryClient.invalidateQueries({ queryKey: ['employees'] });
    reset(values); // clear isDirty before redirect
    navigate(ROUTES.EMPLOYEES);
    toast({
      title: 'Thành công',
      description: mode === 'edit' ? 'Cập nhật nhân viên thành công' : 'Tạo nhân viên thành công',
      variant: 'success',
    });
  };

  const pageTitle = mode === 'create' ? 'Thêm nhân viên mới' : 'Chỉnh sửa nhân viên';
  const showForm = mode === 'create' || (mode === 'edit' && !isLoading && !isError);
  const submitDisabled = isPending || (mode === 'edit' && (isLoading || isError));

  // Empty state checks for FK dropdowns
  const disableSubmit =
    (!isLoadingProfiles && profiles.length === 0) ||
    (!isLoadingRoles && roles.length === 0);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex-none pb-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => navigate(ROUTES.EMPLOYEES)}
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
                <div className="space-y-8">
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="space-y-3">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-5 w-32" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
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
                  onClick={() => navigate(ROUTES.EMPLOYEES)}
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

                  {/* Left column — Thông tin chung + Phân quyền */}
                  <div className="space-y-8">
                    <FormSection title="Thông tin chung">
                      {/* User dropdown */}
                      <FormFieldWrapper
                        label="Người dùng"
                        error={errors.user_id?.message}
                      >
                        {isLoadingProfiles ? (
                          <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải danh sách người dùng…
                          </div>
                        ) : (
                          <>
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
                                    {profiles.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-muted-foreground">
                                        Chưa có người dùng — tạo người dùng trước
                                      </div>
                                    ) : (
                                      <>
                                        <SelectItem value="__none__">Không liên kết</SelectItem>
                                        {profiles.map((profile) => (
                                          <SelectItem key={profile.id} value={profile.id}>
                                            {profile.full_name
                                              ? `${profile.full_name} (${profile.email})`
                                              : profile.email}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {profiles.length >= FK_DROPDOWN_PAGE_SIZE && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                Hiển thị {profiles.length} / 1000 người dùng. Liên hệ quản trị
                                viên nếu không thấy người dùng cần chọn.
                              </p>
                            )}
                          </>
                        )}
                      </FormFieldWrapper>

                      {/* Hire date */}
                      <DatePicker
                        control={control}
                        name="hire_date"
                        label="Ngày vào làm"
                        error={errors.hire_date?.message}
                      />

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
                        <Label htmlFor="is_active">Trạng thái hoạt động</Label>
                      </div>
                    </FormSection>

                    <FormSection title="Phân quyền">
                      {/* Role dropdown */}
                      <FormFieldWrapper
                        label="Vai trò"
                        error={errors.role_id?.message}
                      >
                        {isLoadingRoles ? (
                          <div className="flex h-10 items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Đang tải danh sách vai trò…
                          </div>
                        ) : (
                          <>
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
                                    {roles.length === 0 ? (
                                      <div className="px-3 py-2 text-sm text-muted-foreground">
                                        Chưa có vai trò — tạo vai trò trước
                                      </div>
                                    ) : (
                                      <>
                                        <SelectItem value="__none__">Không có vai trò</SelectItem>
                                        {roles.map((role) => (
                                          <SelectItem key={role.id} value={role.id}>
                                            {role.name}
                                          </SelectItem>
                                        ))}
                                      </>
                                    )}
                                  </SelectContent>
                                </Select>
                              )}
                            />
                            {rolesCount > roles.length && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                                <AlertTriangle className="h-3 w-3" />
                                Hiển thị {roles.length} / {rolesCount} vai trò. Liên hệ quản trị
                                viên nếu không thấy vai trò cần chọn.
                              </p>
                            )}
                          </>
                        )}
                      </FormFieldWrapper>
                    </FormSection>
                  </div>

                  {/* Right column — Bằng lái xe */}
                  <FormSection title="Bằng lái xe">
                    {/* License number */}
                    <FormFieldWrapper
                      label="Số bằng lái"
                      error={errors.license_number?.message}
                    >
                      <Input
                        {...register('license_number')}
                        type="text"
                        placeholder="VD: B2-123456"
                        maxLength={50}
                      />
                    </FormFieldWrapper>

                    {/* License expiry */}
                    <DatePicker
                      control={control}
                      name="license_expiry"
                      label="Ngày hết hạn"
                      error={errors.license_expiry?.message}
                    />
                  </FormSection>

                </div>

              </div>
            )}

            {/* Submit error display */}
            {submitError && (
              <p className="text-sm text-destructive">{submitError}</p>
            )}
          </div>
        </div>

        {/* Sticky action bar */}
        <div className="flex-none border-t bg-background py-4 px-1">
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(ROUTES.EMPLOYEES)}
              disabled={isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={submitDisabled || disableSubmit}>
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
