import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Button, Input, useToast } from '@shared/ui';
import { useTicketsByBookingCode, useCheckInTicket, useCheckInAllTickets } from '@entities/ticket';
import { formatCurrency, formatDateTime } from '@shared/lib';
import { mapCheckInError } from '../model/check-in-schema';

const STATUS_LABELS: Record<string, string> = {
  active: 'Còn hiệu lực',
  used: 'Đã check-in',
  cancelled: 'Đã hủy',
  refunded: 'Đã hoàn tiền',
};

export function CheckInPage() {
  const { toast } = useToast();
  const checkInMutation = useCheckInTicket();
  const checkInAllMutation = useCheckInAllTickets();

  const [bookingCode, setBookingCode] = React.useState('');
  const [searchSubmitted, setSearchSubmitted] = React.useState(false);

  const {
    data,
    isLoading: isSearching,
    error: searchError,
  } = useTicketsByBookingCode(searchSubmitted ? bookingCode : '');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const code = bookingCode.trim();
    if (!code) {
      toast({
        variant: 'destructive',
        description: 'Vui lòng nhập mã đặt vé',
      });
      return;
    }
    setSearchSubmitted(true);
  };

  const handleCheckIn = async (ticketId: string) => {
    try {
      await checkInMutation.mutateAsync(ticketId);
      toast({ description: 'Check-in thành công', variant: 'success' });
    } catch (error) {
      const message = mapCheckInError(error, 'check-in');
      toast({ variant: 'destructive', description: message });
    }
  };

  const handleCheckInAll = async () => {
    if (!data?.booking) return;

    if (!confirm('Bạn có chắc muốn check-in tất cả vé?')) {
      return;
    }

    try {
      await checkInAllMutation.mutateAsync(data.booking.booking_code);
      toast({ description: 'Check-in tất cả vé thành công', variant: 'success' });
    } catch (error) {
      const message = mapCheckInError(error, 'check-in');
      toast({ variant: 'destructive', description: message });
    }
  };

  const booking = data?.booking;
  const tickets = data?.tickets ?? [];
  const isCancelledBooking = booking?.status === 'cancelled' || booking?.status === 'refunded';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Check-in vé</h1>
        <p className="text-muted-foreground">Nhập mã đặt vé để thực hiện check-in</p>
      </div>

      {/* Search Form */}
      <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
        <Input
          type="text"
          placeholder="Mã đặt vé (ví dụ: BKG-ABCDE)"
          value={bookingCode}
          onChange={(e) => setBookingCode(e.target.value.toUpperCase())}
          className="uppercase"
        />
        <Button type="submit" disabled={isSearching}>
          {isSearching && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Tìm kiếm
        </Button>
      </form>

      {/* Search Error */}
      {searchError && !isSearching && (
        <div className="rounded-md border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {mapCheckInError(searchError, 'lookup')}
        </div>
      )}

      {/* Loading State */}
      {isSearching && (
        <div className="flex flex-col items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">Đang tìm kiếm...</p>
        </div>
      )}

      {/* Results */}
      {!isSearching && booking && (
        <div className="space-y-6">
          {/* Cancelled/Refunded Booking Warning */}
          {isCancelledBooking && (
            <div className={`rounded-md border p-4 ${
              booking.status === 'cancelled'
                ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-700 dark:text-yellow-300'
                : 'border-red-500/50 bg-red-500/10 text-red-700 dark:text-red-300'
            }`}>
              <p className="font-medium">
                {booking.status === 'cancelled' ? 'Đặt vé đã bị hủy' : 'Đặt vé đã hoàn tiền'}
              </p>
              <p className="text-sm opacity-80">Không thể thực hiện check-in cho đặt vé này.</p>
            </div>
          )}

          {/* Booking Info Card */}
          <div className="rounded-md border bg-card p-4 shadow-sm">
            <h2 className="text-lg font-semibold mb-3">Thông tin đặt vé</h2>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-muted-foreground">Mã đặt vé:</span>{' '}
                <span className="font-medium">{booking.booking_code}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Trạng thái:</span>{' '}
                <span className="font-medium">{STATUS_LABELS[booking.status] || booking.status}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Khách hàng:</span>{' '}
                <span className="font-medium">{booking.customer?.full_name || '—'}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Số điện thoại:</span>{' '}
                <span className="font-medium">{booking.customer?.phone_number || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Tuyến:</span>{' '}
                <span className="font-medium">{booking.trip?.route?.name || '—'}</span>
              </div>
              <div className="col-span-2">
                <span className="text-muted-foreground">Giờ khởi hành:</span>{' '}
                <span className="font-medium">{booking.trip?.departure_time ? formatDateTime(booking.trip.departure_time) : '—'}</span>
              </div>
            </div>
          </div>

          {/* Tickets Table */}
          <div className="rounded-md border bg-card shadow-sm">
            <div className="flex items-center justify-between border-b p-4">
              <h2 className="text-lg font-semibold">Danh sách vé</h2>
              {!isCancelledBooking && tickets.some(t => t.status === 'active') && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCheckInAll}
                  disabled={checkInAllMutation.isPending}
                >
                  {checkInAllMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Check-in tất cả
                </Button>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium">Số ghế</th>
                    <th className="px-4 py-3 text-left font-medium">Hành khách</th>
                    <th className="px-4 py-3 text-left font-medium">Điện thoại</th>
                    <th className="px-4 py-3 text-right font-medium">Giá</th>
                    <th className="px-4 py-3 text-left font-medium">Trạng thái</th>
                    <th className="px-4 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {tickets.map((ticket) => (
                    <tr key={ticket.id} className="border-t">
                      <td className="px-4 py-3 font-medium">{ticket.seat_number}</td>
                      <td className="px-4 py-3">{ticket.passenger_name}</td>
                      <td className="px-4 py-3">{ticket.passenger_phone || '—'}</td>
                      <td className="px-4 py-3 text-right">{formatCurrency(ticket.price)}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          ticket.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          ticket.status === 'used' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          ticket.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                        }`}>
                          {STATUS_LABELS[ticket.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {ticket.status === 'active' && !isCancelledBooking ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCheckIn(ticket.id)}
                            disabled={checkInMutation.isPending}
                          >
                            {checkInMutation.isPending && checkInMutation.variables === ticket.id && (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            )}
                            Check-in
                          </Button>
                        ) : (
                          <span className="text-muted-foreground text-xs">
                            {ticket.status === 'used' ? 'Đã check-in' : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
