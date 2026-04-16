import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
} from '@shared/ui';
import type { PaymentWithDetails } from '@entities/payment';
import { formatCurrency, formatDateTime } from '@shared/lib';
import { PaymentStatusDialog } from './payment-status-dialog';

interface PaymentDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  payment: PaymentWithDetails | null;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  e_wallet: 'Ví điện tử',
  bank_transfer: 'Chuyển khoản',
};

export function PaymentDetailDialog({
  open,
  onOpenChange,
  payment,
}: PaymentDetailDialogProps) {
  const [statusOpen, setStatusOpen] = React.useState(false);
  const [targetStatus, setTargetStatus] = React.useState<'completed' | 'failed' | 'refunded' | null>(null);

  if (!payment) return null;

  const canMarkCompleted = payment.status === 'pending';
  const canMarkFailed = payment.status === 'pending';
  const canRefund = payment.status === 'completed';

  const handleStatusAction = (status: 'completed' | 'failed' | 'refunded') => {
    setTargetStatus(status);
    setStatusOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Chi tiết thanh toán</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Booking Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Thông tin đặt vé</h3>
              <div className="text-sm">
                <div><span className="text-muted-foreground">Mã đặt vé:</span> {payment.booking?.booking_code}</div>
                <div><span className="text-muted-foreground">Khách hàng:</span> {payment.booking?.customer?.full_name}</div>
                <div><span className="text-muted-foreground">Điện thoại:</span> {payment.booking?.customer?.phone_number}</div>
              </div>
            </div>

            {/* Payment Info */}
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Thông tin thanh toán</h3>
              <div className="rounded-md border p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền:</span>
                  <span className="font-bold text-lg">{formatCurrency(payment.amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phương thức:</span>
                  <span>{METHOD_LABELS[payment.method] ?? payment.method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[payment.status]}`}>
                    {STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                </div>
                {payment.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày thanh toán:</span>
                    <span>{formatDateTime(payment.paid_at)}</span>
                  </div>
                )}
                {payment.refunded_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày hoàn tiền:</span>
                    <span>{formatDateTime(payment.refunded_at)}</span>
                  </div>
                )}
                {payment.transaction_reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã giao dịch:</span>
                    <span className="font-mono text-xs">{payment.transaction_reference}</span>
                  </div>
                )}
                {payment.processed_by_profile && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Người xử lý:</span>
                    <span>{payment.processed_by_profile.full_name}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            {payment.notes && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-muted-foreground">Ghi chú</h3>
                <p className="text-sm">{payment.notes}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            {(canMarkCompleted || canMarkFailed || canRefund) && (
              <div className="flex gap-2">
                {canMarkCompleted && (
                  <Button
                    onClick={() => handleStatusAction('completed')}
                    className="flex-1"
                  >
                    Xác nhận thanh toán
                  </Button>
                )}
                {canMarkFailed && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusAction('failed')}
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  >
                    Đánh dấu thất bại
                  </Button>
                )}
                {canRefund && (
                  <Button
                    variant="outline"
                    onClick={() => handleStatusAction('refunded')}
                    className="flex-1 border-destructive text-destructive hover:bg-destructive hover:text-white"
                  >
                    Hoàn tiền
                  </Button>
                )}
              </div>
            )}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PaymentStatusDialog
        open={statusOpen}
        onOpenChange={setStatusOpen}
        payment={payment}
        targetStatus={targetStatus}
      />
    </>
  );
}
