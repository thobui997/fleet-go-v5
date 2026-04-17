import * as React from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  Input,
  FormFieldWrapper,
  Badge,
  useToast,
} from '@shared/ui';
import { useCreateRole, useUpdateRole } from '@entities/role';
import type { Role } from '@entities/role';
import {
  roleFormSchema,
  type RoleFormValues,
  mapRoleError,
} from '../model/role-form-schema';

interface RoleFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

export function RoleFormDialog({
  open,
  onOpenChange,
  role,
}: RoleFormDialogProps) {
  const { toast } = useToast();
  const createMutation = useCreateRole();
  const updateMutation = useUpdateRole();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [permInput, setPermInput] = React.useState('');
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    control,
    formState: { errors },
  } = useForm<RoleFormValues>({
    resolver: zodResolver(roleFormSchema),
    defaultValues: {
      name: '',
      description: '',
      permissions: [],
    },
  });

  const permissions = useWatch({ control, name: 'permissions' });

  // Reset form when dialog opens/closes or role changes
  React.useEffect(() => {
    if (open) {
      setPermInput('');
      setSubmitError(null);
      if (role === null) {
        reset({ name: '', description: '', permissions: [] });
      } else {
        reset({
          name: role.name,
          description: role.description ?? '',
          permissions: role.permissions,
        });
      }
    }
  }, [open, role, reset]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleAddPerm = () => {
    const trimmed = permInput.trim();
    if (!trimmed) return;
    if (permissions.includes(trimmed)) return;
    setValue('permissions', [...permissions, trimmed]);
    setPermInput('');
  };

  const handleRemovePerm = (perm: string) => {
    setValue(
      'permissions',
      permissions.filter((p) => p !== perm)
    );
  };

  const handlePermKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddPerm();
    }
  };

  const onSubmit = async (values: RoleFormValues) => {
    setSubmitError(null);
    const payload = {
      name: values.name,
      description:
        !values.description || values.description.trim() === ''
          ? null
          : values.description.trim(),
      permissions: values.permissions,
    };

    try {
      if (role === null) {
        await createMutation.mutateAsync(payload);
        toast({ description: 'Tạo vai trò thành công', variant: 'success' });
      } else {
        await updateMutation.mutateAsync({ id: role.id, input: payload });
        toast({ description: 'Cập nhật vai trò thành công', variant: 'success' });
      }
      onOpenChange(false);
    } catch (error) {
      setSubmitError(mapRoleError(error));
    }
  };

  const isEdit = role !== null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? 'Chỉnh sửa vai trò' : 'Thêm vai trò mới'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="max-h-[60vh] space-y-4 overflow-y-auto p-[3px] -m-[3px] pr-1">
            <FormFieldWrapper
              label="Tên vai trò"
              error={errors.name?.message}
              required
            >
              <Input
                {...register('name')}
                placeholder="VD: dispatcher"
              />
            </FormFieldWrapper>

            <FormFieldWrapper
              label="Mô tả"
              error={errors.description?.message}
            >
              <Input
                {...register('description')}
                placeholder="Mô tả vai trò (tùy chọn)"
              />
            </FormFieldWrapper>

            {/* Permissions chip editor */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none">
                Quyền
              </label>
              <div className="flex gap-2">
                <Input
                  value={permInput}
                  onChange={(e) => setPermInput(e.target.value)}
                  onKeyDown={handlePermKeyDown}
                  placeholder="Ví dụ: vehicles:read"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleAddPerm}
                >
                  Thêm
                </Button>
              </div>
              {errors.permissions?.message && (
                <p className="text-sm text-destructive">
                  {errors.permissions.message}
                </p>
              )}
              {permissions.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {permissions.map((perm) => (
                    <Badge
                      key={perm}
                      variant="secondary"
                      className="flex items-center gap-1 pr-1"
                    >
                      {perm}
                      <button
                        type="button"
                        onClick={() => handleRemovePerm(perm)}
                        className="ml-1 rounded-full hover:bg-muted-foreground/20 p-0.5"
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Xóa {perm}</span>
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
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
