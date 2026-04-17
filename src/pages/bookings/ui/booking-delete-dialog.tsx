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
import { useDeleteBooking } from '@entities/booking';
import type { BookingWithDetails } from '@entities/booking';
import { mapBookingError } from '../model/booking-form-schema';

interface BookingDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithDetails;
}

export function BookingDeleteDialog({
  open,
  onOpenChange,
  booking,
}: BookingDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteBooking();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    try {
      await deleteMutation.mutateAsync(booking.id);
      onOpenChange(false);
      toast({ title: 'Thành công', description: 'Đã xóa đặt vé', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Lỗi',
        variant: 'destructive',
        description: mapBookingError(
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
          Bạn có chắc chắn muốn xóa đặt vé{' '}
          <span className="font-semibold text-foreground">
            {booking.booking_code}
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
