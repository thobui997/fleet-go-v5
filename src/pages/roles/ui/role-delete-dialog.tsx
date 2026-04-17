import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Button,
  useToast,
} from '@shared/ui';
import { useDeleteRole } from '@entities/role';
import type { Role } from '@entities/role';
import { mapRoleError } from '../model/role-form-schema';

interface RoleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: Role | null;
}

export function RoleDeleteDialog({
  open,
  onOpenChange,
  role,
}: RoleDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteRole();
  const isPending = deleteMutation.isPending;
  const [deleteError, setDeleteError] = React.useState<string | null>(null);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    if (!nextOpen) setDeleteError(null);
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!role) return;
    setDeleteError(null);

    try {
      await deleteMutation.mutateAsync(role.id);
      onOpenChange(false);
      toast({ title: 'Thành công', description: 'Xóa vai trò thành công', variant: 'success' });
    } catch (error) {
      setDeleteError(mapRoleError(error));
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa vai trò</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Xóa vai trò{' '}
          <span className="font-semibold text-foreground">
            «{role?.name}»
          </span>{' '}
          sẽ tự động hủy phân quyền của tất cả người dùng đang sử dụng vai trò
          này. Hành động này không thể hoàn tác.
        </p>

        {deleteError && (
          <p className="text-sm text-destructive">{deleteError}</p>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={isPending}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
