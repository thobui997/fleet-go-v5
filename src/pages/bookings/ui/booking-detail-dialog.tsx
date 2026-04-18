import * as React from 'react';
import { Loader2, QrCode } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Button,
  useToast,
} from '@shared/ui';
import { useBooking, useCancelBooking } from '@entities/booking';
import { useTripBookedSeats } from '@entities/ticket';
import { SeatMap } from '@entities/vehicle-type';
import { usePaymentByBooking } from '@entities/payment';
import { formatCurrency, formatDateTime } from '@shared/lib';
import type { BookingWithDetails } from '@entities/booking';
import { BookingDeleteDialog } from './booking-delete-dialog';
import { TicketQrDialog } from './ticket-qr-dialog';

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

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Chờ thanh toán',
  completed: 'Đã thanh toán',
  failed: 'Thất bại',
  refunded: 'Đã hoàn tiền',
};

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  completed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  failed: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  refunded: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: 'Tiền mặt',
  e_wallet: 'Ví điện tử',
  bank_transfer: 'Chuyển khoản',
};

export function BookingDetailDialog({
  open,
  onOpenChange,
  booking,
}: BookingDetailDialogProps) {
  const { toast } = useToast();
  const cancelMutation = useCancelBooking();
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [qrTicket, setQrTicket] = React.useState<any>(null);

  const { data: fullBooking, isLoading } = useBooking(booking.id);
  const { data: bookedSeats = [] } = useTripBookedSeats(booking.trip_id);
  const { data: payment } = usePaymentByBooking(booking.id);

  const canCancel = booking.status === 'pending' || booking.status === 'confirmed';
  const canDelete = booking.status === 'pending';

  const handleCancel = async () => {
    if (!confirm('Bạn có chắc muốn hủy đặt vé này?')) return;

    try {
      await cancelMutation.mutateAsync(booking.id);
      toast({ title: 'Thành công', description: 'Đã hủy đặt vé', variant: 'success' });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Lỗi',
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

          {/* Seat Map */}
          {(bookingWithDetails.trip?.vehicle?.vehicle_type?.seat_layout &&
            Object.keys(bookingWithDetails.trip.vehicle.vehicle_type.seat_layout).length > 0) && (
            <div className="space-y-2">
              <h3 className="font-semibold">Sơ đồ ghế</h3>
              <SeatMap
                layout={bookingWithDetails.trip.vehicle.vehicle_type.seat_layout as Record<string, { rows: number; seats_per_row: number }>}
                bookedSeats={bookedSeats}
                mode="view"
              />
            </div>
          )}

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
                    <th className="px-3 py-2 text-center font-medium">QR</th>
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
                      <td className="px-3 py-2 text-center">
                        {ticket.qr_code && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => setQrTicket(ticket)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        )}
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
            {payment ? (
              <div className="rounded-md border p-3 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Phương thức:</span>
                  <span>{PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Trạng thái:</span>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${PAYMENT_STATUS_COLORS[payment.status]}`}>
                    {PAYMENT_STATUS_LABELS[payment.status] ?? payment.status}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Số tiền:</span>
                  <span className="font-semibold">{formatCurrency(payment.amount)}</span>
                </div>
                {payment.paid_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày thanh toán:</span>
                    <span>{formatDateTime(payment.paid_at)}</span>
                  </div>
                )}
                {payment.transaction_reference && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Mã giao dịch:</span>
                    <span className="font-mono text-xs">{payment.transaction_reference}</span>
                  </div>
                )}
                {payment.refunded_at && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ngày hoàn tiền:</span>
                    <span>{formatDateTime(payment.refunded_at)}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">
                Chưa có thanh toán
              </div>
            )}
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

        <TicketQrDialog
          open={!!qrTicket}
          onOpenChange={(open) => !open && setQrTicket(null)}
          ticket={qrTicket}
          tripInfo={bookingWithDetails.trip ? {
            route_name: bookingWithDetails.trip.route?.name ?? null,
            departure_time: bookingWithDetails.trip.departure_time,
            origin_station: bookingWithDetails.trip.route?.origin_station?.name ?? null,
            destination_station: bookingWithDetails.trip.route?.destination_station?.name ?? null,
          } : undefined}
        />
      </DialogContent>
    </Dialog>
  );
}
