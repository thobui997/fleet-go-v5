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
import { useDeleteTrip, type TripWithDetails } from '@entities/trip';
import { formatDateTime } from '@shared/lib/format-date';
import { mapTripError } from '../model/trip-form-schema';

interface TripDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trip: TripWithDetails | null;
}

export function TripDeleteDialog({
  open,
  onOpenChange,
  trip,
}: TripDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteTrip();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!trip) return;

    try {
      await deleteMutation.mutateAsync(trip.id);
      onOpenChange(false);
      toast({
        title: 'Thành công',
        description: 'Xóa chuyến đi thành công',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Lỗi',
        description: mapTripError(
          error as { code?: string; message?: string; status?: number },
          'delete'
        ),
        variant: 'destructive',
      });
    }
  };

  const routeName = trip?.route?.name || 'N/A';
  const departureTime = trip?.departure_time
    ? formatDateTime(trip.departure_time)
    : 'N/A';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Bạn có chắc chắn muốn xóa chuyến đi{' '}
          <span className="font-semibold text-foreground">
            {routeName} ({departureTime})
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
