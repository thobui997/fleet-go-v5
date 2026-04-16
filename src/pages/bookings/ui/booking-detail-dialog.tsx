import * as React from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  useToast,
} from '@shared/ui';
import { useBooking, useCancelBooking } from '@entities/booking';
import { formatCurrency, formatDateTime } from '@shared/lib';
import type { BookingWithDetails } from '@entities/booking';
import { BookingDeleteDialog } from './booking-delete-dialog';

interface BookingDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  booking: BookingWithDetails;
}

const STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  cancelled: 'Đã hủy',
  completed: 'Hoàn thành',
  refunded: 'Đã hoàn tiền',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  confirmed: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

export function BookingDetailDialog({
  open,
  onOpenChange,
  booking,
}: BookingDetailDialogProps) {
  const { toast } = useToast();
  const cancelMutation = useCancelBooking();
  const [deleteOpen, setDeleteOpen] = React.useState(false);

  const { data: fullBooking, isLoading } = useBooking(booking.id);

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canDelete = booking.status === 'pending';

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy đặt vé này?')) return;

    try {
      await cancelMutation.mutateAsync(booking.id);
      toast({ description: 'Đã hủy đặt vé', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      toast({
        variant: 'destructive',
        description: 'Không thể hủy đặt vé. Vui lòng thử lại.',
      });
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[700px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  const bookingWithDetails = fullBooking ?? booking;
  const tickets = (bookingWithDetails as any).tickets ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px]">
        <DialogHeader>
          <DialogTitle>Đặt vé {bookingWithDetails.booking_code}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[58vh] space-y-4 overflow-y-auto pr-1">
          {/* Booking Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">Thông tin đặt vé</h3>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-muted-foreground">Mã đặt vé:</span>{' '}
                {bookingWithDetails.booking_code}
              </div>
              <div>
                <span className="text-muted-foreground">Trạng thái:</span>{' '}
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_COLORS[bookingWithDetails.status]}`}>
                  {STATUS_LABELS[bookingWithDetails.status]}
                </span>
              </div>
              <div>
                <span className="text-muted-foreground">Ngày đặt:</span>{' '}
                {formatDateTime(bookingWithDetails.booking_date)}
              </div>
              <div>
                <span className="text-muted-foreground">Số hành khách:</span>{' '}
                {bookingWithDetails.passenger_count}
              </div>
            </div>
            {bookingWithDetails.notes && (
              <div className="text-sm">
                <span className="text-muted-foreground">Ghi chú:</span>{' '}
                {bookingWithDetails.notes}
              </div>
            )}
          </div>

          {/* Customer Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">Khách hàng</h3>
            <div className="text-sm">
              <div><span className="text-muted-foreground">Họ tên:</span> {bookingWithDetails.customer?.full_name ?? '—'}</div>
              <div><span className="text-muted-foreground">Số điện thoại:</span> {bookingWithDetails.customer?.phone_number ?? '—'}</div>
            </div>
          </div>

          {/* Trip Info */}
          <div className="space-y-2">
            <h3 className="font-semibold">Chuyến xe</h3>
            <div className="text-sm">
              <div><span className="text-muted-foreground">Tuyến:</span> {bookingWithDetails.trip?.route?.name ?? '—'}</div>
              <div>
                <span className="text-muted-foreground">Lộ trình:</span>{' '}
                {bookingWithDetails.trip?.route?.origin_station?.name ?? '—'} → {bookingWithDetails.trip?.route?.destination_station?.name ?? '—'}
              </div>
              <div><span className="text-muted-foreground">Giờ khởi hành:</span> {formatDateTime(bookingWithDetails.trip?.departure_time)}</div>
              <div><span className="text-muted-foreground">Biển số:</span> {bookingWithDetails.trip?.vehicle?.license_plate ?? '—'}</div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="space-y-2">
            <h3 className="font-semibold">Danh sách vé</h3>
            <div className="rounded-md border">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">Số ghế</th>
                    <th className="px-3 py-2 text-left font-medium">Hành khách</th>
                    <th className="px-3 py-2 text-left font-medium">Điện thoại</th>
                    <th className="px-3 py-2 text-left font-medium">CMND</th>
                    <th className="px-3 py-2 text-right font-medium">Giá</th>
                    <th className="px-3 py-2 text-left font-medium">Trạng thái</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket: any) => (
                    <tr key={ticket.id} className="border-t">
                      <td className="px-3 py-2">{ticket.seat_number}</td>
                      <td className="px-3 py-2">{ticket.passenger_name}</td>
                      <td className="px-3 py-2">{ticket.passenger_phone ?? '—'}</td>
                      <td className="px-3 py-2">{ticket.passenger_id_card ?? '—'}</td>
                      <td className="px-3 py-2 text-right">{formatCurrency(ticket.price)}</td>
                      <td className="px-3 py-2">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          ticket.status === 'active' ? 'bg-green-100 text-green-800' :
                          ticket.status === 'used' ? 'bg-blue-100 text-blue-800' :
                          ticket.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {ticket.status === 'active' ? 'Còn hiệu lực' :
                           ticket.status === 'used' ? 'Đã sử dụng' :
                           ticket.status === 'cancelled' ? 'Đã hủy' :
                           ticket.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Summary */}
          <div className="space-y-2">
            <h3 className="font-semibold">Thanh toán</h3>
            <div className="text-sm text-muted-foreground">
              {/* Payment info would be here if we fetched payment data */}
              Chưa có thanh toán
            </div>
          </div>

          {/* Total Amount */}
          <div className="rounded-md bg-muted p-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Tổng tiền:</span>
              <span className="text-lg font-bold">{formatCurrency(bookingWithDetails.total_amount)}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-between">
          <div className="flex gap-2">
            {canCancel && (
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={handleCancel}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hủy đặt vé
              </Button>
            )}
            {canDelete && (
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive hover:text-white"
                onClick={() => setDeleteOpen(true)}
              >
                Xóa
              </Button>
            )}
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </div>

        <BookingDeleteDialog
          open={deleteOpen}
          onOpenChange={setDeleteOpen}
          booking={booking}
        />
      </DialogContent>
    </Dialog>
  );
}
