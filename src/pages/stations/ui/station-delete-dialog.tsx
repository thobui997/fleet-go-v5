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
import { useDeleteStation } from '@entities/station';
import type { Station } from '@entities/station';
import { mapSupabaseError } from '../model/station-form-schema';

interface StationDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  station: Station | null;
}

export function StationDeleteDialog({
  open,
  onOpenChange,
  station,
}: StationDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteStation();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!station) return;

    try {
      await deleteMutation.mutateAsync(station.id);
      onOpenChange(false);
      toast({ description: 'Đã xóa trạm' });
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Bạn có chắc chắn muốn xóa trạm{' '}
          <span className="font-semibold text-foreground">
            {station?.name}
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
