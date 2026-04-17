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
import { useDeleteMaintenanceLog } from '@entities/maintenance-log';
import type { MaintenanceLog } from '@entities/maintenance-log';
import { mapSupabaseError } from '../model/maintenance-form-schema';

interface MaintenanceDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  log: MaintenanceLog | null;
}

export function MaintenanceDeleteDialog({
  open,
  onOpenChange,
  log,
}: MaintenanceDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteMaintenanceLog();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!log) return;

    try {
      await deleteMutation.mutateAsync(log.id);
      onOpenChange(false);
      toast({ title: 'Thành công', description: 'Đã xóa lịch bảo trì', variant: 'success' });
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
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Bạn có chắc chắn muốn xóa bản ghi bảo trì{' '}
          <span className="font-semibold text-foreground">
            "{log?.description?.slice(0, 50)}"
          </span>
          ? Thao tác này không thể hoàn tác.
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
