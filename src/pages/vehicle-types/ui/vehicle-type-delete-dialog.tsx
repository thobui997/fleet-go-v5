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
import { useDeleteVehicleType } from '@entities/vehicle-type';
import type { VehicleType } from '@entities/vehicle-type';
import { mapSupabaseError } from '../model/vehicle-type-form-schema';

interface VehicleTypeDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicleType: VehicleType | null;
}

export function VehicleTypeDeleteDialog({
  open,
  onOpenChange,
  vehicleType,
}: VehicleTypeDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteVehicleType();

  const handleConfirm = async () => {
    if (!vehicleType) return;

    try {
      await deleteMutation.mutateAsync(vehicleType.id);
      onOpenChange(false);
      toast({
        title: 'Xóa thành công',
        description: `Loại xe "${vehicleType.name}" đã được xóa.`,
      });
    } catch (error) {
      const mappedMessage = mapSupabaseError(error as { code?: string });
      toast({
        title: 'Lỗi',
        description: mappedMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Xác nhận xóa</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">
          Bạn có chắc chắn muốn xóa loại xe{' '}
          <span className="font-semibold text-foreground">
            {vehicleType?.name}
          </span>
          ? Hành động này không thể hoàn tác.
        </p>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleteMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
