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
import { useDeleteRoute } from '@entities/route';
import type { Route } from '@entities/route';
import { mapSupabaseError } from '../model/route-form-schema';

interface RouteDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route | null;
}

export function RouteDeleteDialog({
  open,
  onOpenChange,
  route,
}: RouteDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteRoute();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!route) return;

    try {
      await deleteMutation.mutateAsync(route.id);
      onOpenChange(false);
      toast({ description: 'Đã xóa tuyến đường' });
    } catch (error) {
      toast({
        variant: 'destructive',
        description: mapSupabaseError(
          error as {
            code?: string;
            message?: string;
            details?: string;
            status?: number;
          },
          'delete'
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
          Bạn có chắc chắn muốn xóa tuyến đường{' '}
          <span className="font-semibold text-foreground">{route?.name}</span>?
          Thao tác này không thể hoàn tác.
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
