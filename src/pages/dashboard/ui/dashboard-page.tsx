import { Truck, Calendar, Ticket, CreditCard, AlertCircle, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@shared/ui/card';
import { Skeleton } from '@shared/ui/skeleton';
import { formatCurrency } from '@shared/lib/format-currency';
import { formatDateTime } from '@shared/lib/format-date';
import {
  useDashboardStats,
  useRecentBookings,
  useUpcomingTrips,
  useRevenueTrend,
  useTripStatusBreakdown,
  useBookingStatusBreakdown,
} from '../api/dashboard.queries';
import { StatCard } from './stat-card';
import { RevenueChart } from './revenue-chart';
import { TripStatusChart } from './trip-status-chart';
import { BookingStatusChart } from './booking-status-chart';

/**
 * Helper to get Tailwind classes for booking status badges.
 */
function getBookingStatusClasses(status: string): string {
  const map: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-blue-100 text-blue-800',
    cancelled: 'bg-red-100 text-red-800',
    completed: 'bg-green-100 text-green-800',
    refunded: 'bg-gray-100 text-gray-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

/**
 * Helper to get Tailwind classes for trip status badges.
 */
function getTripStatusClasses(status: string): string {
  const map: Record<string, string> = {
    scheduled: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return map[status] ?? 'bg-gray-100 text-gray-800';
}

export function DashboardPage() {
  // Fetch dashboard data
  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useDashboardStats();

  const {
    data: recentBookings,
    isLoading: bookingsLoading,
    error: bookingsError,
    refetch: refetchBookings,
  } = useRecentBookings();

  const {
    data: upcomingTrips,
    isLoading: tripsLoading,
    error: tripsError,
    refetch: refetchTrips,
  } = useUpcomingTrips();

  // Fetch chart data
  const {
    data: revenueData,
    isLoading: revenueLoading,
    error: revenueError,
    refetch: refetchRevenue,
  } = useRevenueTrend();

  const {
    data: tripStatusData,
    isLoading: tripStatusLoading,
    error: tripStatusError,
    refetch: refetchTripStatus,
  } = useTripStatusBreakdown();

  const {
    data: bookingStatusData,
    isLoading: bookingStatusLoading,
    error: bookingStatusError,
    refetch: refetchBookingStatus,
  } = useBookingStatusBreakdown();

  // Helper to render stat card with error handling
  const renderStatCard = (
    title: string,
    value: string | number,
    subtitle: string | undefined,
    icon: typeof Truck,
    loading: boolean,
    error: unknown,
    onRetry: () => void
  ) => (
    <StatCard
      title={title}
      value={value}
      subtitle={subtitle}
      icon={icon}
      loading={loading}
      error={!!error}
      onRetry={onRetry}
    />
  );

  return (
    <div className="h-full overflow-y-auto space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Tổng quan</h1>
        <p className="text-muted-foreground">
          Xem nhanh tình hình hoạt động hôm nay
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderStatCard(
          'Tổng xe',
          stats?.vehicleTotal ?? 0,
          `(${stats?.vehicleActive ?? 0} hoạt động)`,
          Truck,
          statsLoading,
          statsError,
          () => refetchStats()
        )}
        {renderStatCard(
          'Chuyến hôm nay',
          stats?.tripsToday ?? 0,
          `(${stats?.tripsScheduled ?? 0} chờ / ${stats?.tripsInProgress ?? 0} chạy)`,
          Calendar,
          statsLoading,
          statsError,
          () => refetchStats()
        )}
        {renderStatCard(
          'Đặt vé hôm nay',
          stats?.bookingsToday ?? 0,
          undefined,
          Ticket,
          statsLoading,
          statsError,
          () => refetchStats()
        )}
        {renderStatCard(
          'Doanh thu hôm nay',
          formatCurrency(stats?.revenueToday ?? 0),
          undefined,
          CreditCard,
          statsLoading,
          statsError,
          () => refetchStats()
        )}
      </div>

      {/* Revenue Trend Chart — full width */}
      <RevenueChart
        data={revenueData}
        loading={revenueLoading}
        error={revenueError}
        onRetry={() => refetchRevenue()}
      />

      {/* Status Charts — side by side */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <TripStatusChart
          data={tripStatusData}
          loading={tripStatusLoading}
          error={tripStatusError}
          onRetry={() => refetchTripStatus()}
        />
        <BookingStatusChart
          data={bookingStatusData}
          loading={bookingStatusLoading}
          error={bookingStatusError}
          onRetry={() => refetchBookingStatus()}
        />
      </div>

      {/* Quick Views */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Đặt vé gần đây</CardTitle>
          </CardHeader>
          <CardContent>
            {bookingsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : bookingsError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Không thể tải dữ liệu
                </p>
                <button
                  type="button"
                  onClick={() => refetchBookings()}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Thử lại
                </button>
              </div>
            ) : !recentBookings || recentBookings.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Chưa có đặt vé nào</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">Mã đặt vé</th>
                      <th className="pb-2 text-left font-medium">Khách hàng</th>
                      <th className="pb-2 text-left font-medium">Tuyến</th>
                      <th className="pb-2 text-left font-medium">Khởi hành</th>
                      <th className="pb-2 text-left font-medium">Tổng tiền</th>
                      <th className="pb-2 text-left font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentBookings.map((booking) => (
                      <tr key={booking.id} className="border-b last:border-0">
                        <td className="py-2">{booking.booking_code}</td>
                        <td className="py-2">{booking.customer?.full_name ?? 'N/A'}</td>
                        <td className="py-2">
                          {booking.trip?.route?.origin_station?.name ?? 'N/A'} →{' '}
                          {booking.trip?.route?.destination_station?.name ?? 'N/A'}
                        </td>
                        <td className="py-2">{formatDateTime(booking.trip?.departure_time)}</td>
                        <td className="py-2">{formatCurrency(booking.total_amount)}</td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getBookingStatusClasses(
                              booking.status
                            )}`}
                          >
                            {booking.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Trips */}
        <Card>
          <CardHeader>
            <CardTitle>Chuyến sắp khởi hành</CardTitle>
          </CardHeader>
          <CardContent>
            {tripsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : tripsError ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <AlertCircle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground mb-3">
                  Không thể tải dữ liệu
                </p>
                <button
                  type="button"
                  onClick={() => refetchTrips()}
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <RefreshCw className="h-4 w-4" />
                  Thử lại
                </button>
              </div>
            ) : !upcomingTrips || upcomingTrips.length === 0 ? (
              <div className="flex items-center justify-center py-8">
                <p className="text-sm text-muted-foreground">Không có chuyến sắp khởi hành</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-2 text-left font-medium">Tuyến</th>
                      <th className="pb-2 text-left font-medium">Khởi hành</th>
                      <th className="pb-2 text-left font-medium">Xe</th>
                      <th className="pb-2 text-left font-medium">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody>
                    {upcomingTrips.map((trip) => (
                      <tr key={trip.id} className="border-b last:border-0">
                        <td className="py-2">
                          {trip.route?.origin_station?.name ?? 'N/A'} →{' '}
                          {trip.route?.destination_station?.name ?? 'N/A'}
                        </td>
                        <td className="py-2">{formatDateTime(trip.departure_time)}</td>
                        <td className="py-2">{trip.vehicle?.license_plate ?? 'N/A'}</td>
                        <td className="py-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${getTripStatusClasses(
                              trip.status
                            )}`}
                          >
                            {trip.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
