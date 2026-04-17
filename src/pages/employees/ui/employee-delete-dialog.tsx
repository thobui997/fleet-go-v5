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
import { useDeleteEmployee } from '@entities/employee';
import type { Employee } from '@entities/employee';
import { mapEmployeeError } from '../model/employee-form-schema';

interface EmployeeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employee: Employee | null;
}

export function EmployeeDeleteDialog({
  open,
  onOpenChange,
  employee,
}: EmployeeDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteEmployee();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!employee) return;

    try {
      await deleteMutation.mutateAsync(employee.id);
      onOpenChange(false);
      toast({ title: 'Thành công', description: 'Xóa nhân viên thành công', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Lỗi',
        variant: 'destructive',
        description: mapEmployeeError(error),
      });
    }
  };

  const fullName =
    employee?.profiles?.full_name ?? employee?.profiles?.email ?? 'nhân viên này';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Bạn có chắc muốn xóa nhân viên{' '}
          <span className="font-semibold text-foreground">
            «{fullName}»
          </span>
          ? Hành động này không thể hoàn tác.
        </p>

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
