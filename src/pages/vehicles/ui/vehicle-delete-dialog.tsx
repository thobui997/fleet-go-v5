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
import { useDeleteVehicle } from '@entities/vehicle';
import type { Vehicle } from '@entities/vehicle';
import { mapSupabaseError } from '../model/vehicle-form-schema';

interface VehicleDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
}

export function VehicleDeleteDialog({
  open,
  onOpenChange,
  vehicle,
}: VehicleDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteVehicle();
  const isPending = deleteMutation.isPending;

  // Guard: prevent closing while mutation is in flight
  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!vehicle) return;

    try {
      await deleteMutation.mutateAsync(vehicle.id);
      onOpenChange(false);
      toast({
        title: 'Xóa thành công',
        description: `Xe "${vehicle.license_plate}" đã được xóa.`,
      });
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
          Bạn có chắc chắn muốn xóa xe{' '}
          <span className="font-semibold text-foreground">
            {vehicle?.license_plate}
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
