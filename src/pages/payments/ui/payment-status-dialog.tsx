import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  Button,
  Textarea,
  useToast,
  Label,
} from '@shared/ui';
import { useUpdatePaymentStatus } from '@entities/payment';
import { mapPaymentError } from '../model/payment-form-schema';
import { useAuth } from '@shared/auth';

interface PaymentStatusDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: {
    id: string;
    status: string;
    amount: number;
  } | null;
  targetStatus: 'completed' | 'failed' | 'refunded' | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

export function PaymentStatusDialog({
  open,
  onOpenChange,
  payment,
  targetStatus,
}: PaymentStatusDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const updateMutation = useUpdatePaymentStatus();
  const [notes, setNotes] = React.useState('');

  const isRefund = targetStatus === 'refunded';

  React.useEffect(() => {
    if (open) {
      setNotes('');
    }
  }, [open]);

  const handleConfirm = async () => {
    if (!payment || !targetStatus) return;

    try {
      await updateMutation.mutateAsync({
        id: payment.id,
        input: {
          status: targetStatus,
          notes: isRefund ? notes : undefined,
          processed_by: user?.id,
        },
      });
      toast({ description: 'Đã cập nhật trạng thái thanh toán', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        description: mapPaymentError(
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

  if (!payment || !targetStatus) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Xác nhận thay đổi trạng thái</DialogTitle>
          <DialogDescription>
            Bạn có chắc muốn thay đổi trạng thái thanh toán từ{' '}
            <span className="font-semibold">{STATUS_LABELS[payment.status]}</span>{' '}
            sang{' '}
            <span className="font-semibold">{STATUS_LABELS[targetStatus]}</span>?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Số tiền:</span>
              <span className="text-lg font-bold">{payment.amount.toLocaleString()}đ</span>
            </div>
          </div>

          {isRefund && (
            <div className="space-y-2">
              <Label htmlFor="refund-notes">Lý do hoàn tiền</Label>
              <Textarea
                id="refund-notes"
                placeholder="Nhập lý do hoàn tiền..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={updateMutation.isPending}
          >
            Hủy
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={updateMutation.isPending || (isRefund && !notes.trim())}
          >
            {updateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Xác nhận
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
