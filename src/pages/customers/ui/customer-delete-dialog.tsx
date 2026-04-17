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
import { useDeleteCustomer } from '@entities/customer';
import type { Customer } from '@entities/customer';
import { mapSupabaseError } from '../model/customer-form-schema';

interface CustomerDeleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerDeleteDialog({
  open,
  onOpenChange,
  customer,
}: CustomerDeleteDialogProps) {
  const { toast } = useToast();
  const deleteMutation = useDeleteCustomer();
  const isPending = deleteMutation.isPending;

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && isPending) return;
    onOpenChange(nextOpen);
  };

  const handleConfirm = async () => {
    if (!customer) return;

    try {
      await deleteMutation.mutateAsync(customer.id);
      onOpenChange(false);
      toast({ title: 'Thành công', description: 'Đã xóa khách hàng', variant: 'success' });
    } catch (error) {
      toast({
        title: 'Lỗi',
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
          Bạn có chắc chắn muốn xóa khách hàng{' '}
          <span className="font-semibold text-foreground">
            {customer?.full_name}
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
