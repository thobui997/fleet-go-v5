import { useMemo } from 'react';
import dayjs from 'dayjs';
import { useAuth } from '@shared/auth';
import { useMySchedule, type ScheduleItem } from '@entities/trip-staff';
import { Card, CardContent } from '@shared/ui';
import { Button } from '@shared/ui';
import { Skeleton } from '@shared/ui';
import { Badge } from '@shared/ui';
import { TripStatusBadge } from '@pages/trips';
import { formatDateTime } from '@shared/lib/format-date';

/**
 * My Schedule page.
 * Shows the logged-in employee's assigned trips, split into upcoming and past.
 * Handles loading, error, and auth-expiry states.
 */
export function MySchedulePage() {
  const { user } = useAuth();
  const { data: schedule = [], isLoading, error, refetch } = useMySchedule(user?.id ?? '');

  // Split into upcoming and past
  const { upcoming, past } = useMemo(() => {
    const now = dayjs();
    const upcoming: ScheduleItem[] = [];
    const past: ScheduleItem[] = [];

    for (const item of schedule) {
      const departureTime = dayjs(item.trip.departure_time);
      if (departureTime.isSame(now, 'day') || departureTime.isAfter(now)) {
        upcoming.push(item);
      } else {
        past.push(item);
      }
    }

    // Sort upcoming: ascending (soonest first)
    upcoming.sort(
      (a, b) =>
        new Date(a.trip.departure_time).getTime() -
        new Date(b.trip.departure_time).getTime()
    );

    // Sort past: descending (most recent first)
    past.sort(
      (a, b) =>
        new Date(b.trip.departure_time).getTime() -
        new Date(a.trip.departure_time).getTime()
    );

    return { upcoming, past };
  }, [schedule]);

  // Error message handling
  const errorMessage = error
    ? ((error as any).status === 401 ||
        (error as any).status === 403 ||
        (error as any).code === 'PGRST301'
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : (error as any).code === 'PGRST116'
          ? null // Handled by empty state
          : 'Không thể tải lịch trình. Vui lòng thử lại.')
    : null;

  // No employee record state (data is empty array)
  const hasNoEmployeeRecord = schedule.length === 0 && !isLoading && !error;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Lịch trình của tôi</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Xem các chuyến đi đã được phân công
        </p>
      </div>

      {/* Loading state */}
      {isLoading && <ScheduleSkeleton />}

      {/* Error state */}
      {errorMessage && !isLoading && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-destructive mb-4">{errorMessage}</p>
            <Button onClick={() => refetch()} variant="outline">
              Thử lại
            </Button>
          </CardContent>
        </Card>
      )}

      {/* No employee record state */}
      {hasNoEmployeeRecord && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên
            </p>
          </CardContent>
        </Card>
      )}

      {/* Empty state (employee exists but no trips) */}
      {!isLoading && !errorMessage && !hasNoEmployeeRecord && upcoming.length === 0 && past.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              Bạn chưa được phân công chuyến đi nào
            </p>
          </CardContent>
        </Card>
      )}

      {/* Upcoming trips */}
      {!isLoading && !errorMessage && upcoming.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Sắp tới</h2>
          <div className="space-y-4">
            {upcoming.map((item) => (
              <TripCard key={item.trip.id} item={item} />
            ))}
          </div>
        </div>
      )}

      {/* Past trips */}
      {!isLoading && !errorMessage && past.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-4">Đã hoàn thành</h2>
          <div className="space-y-4">
            {past.map((item) => (
              <TripCard key={item.trip.id} item={item} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TripCardProps {
  item: ScheduleItem;
}

/**
 * Trip card for schedule list.
 * Shows route, times, vehicle, status, and role badge.
 */
function TripCard({ item }: TripCardProps) {
  const routeDisplay =
    item.trip.route?.origin_station?.name && item.trip.route?.destination_station?.name
      ? `${item.trip.route.origin_station.name} → ${item.trip.route.destination_station.name}`
      : item.trip.route?.name || 'Chưa có tuyến';

  const roleLabels: Record<string, string> = {
    driver: 'Tài xế',
    assistant: 'Phụ xe',
  };

  const roleBadgeVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
    driver: 'default',
    assistant: 'secondary',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          {/* Left: Route and times */}
          <div className="flex-1">
            {/* Route */}
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {routeDisplay}
            </h3>

            {/* Times */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
              <div>
                <span className="font-medium">Đi: </span>
                {formatDateTime(item.trip.departure_time)}
              </div>
              <div>
                <span className="font-medium">Đến: </span>
                {formatDateTime(item.trip.estimated_arrival_time)}
              </div>
            </div>

            {/* Vehicle */}
            {item.trip.vehicle && (
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Xe: </span>
                {item.trip.vehicle.license_plate}
              </div>
            )}
          </div>

          {/* Right: Status and role badges */}
          <div className="flex flex-col items-end gap-2">
            <TripStatusBadge status={item.trip.status as any} />
            <Badge variant={roleBadgeVariants[item.role] || 'secondary'}>
              {roleLabels[item.role] || item.role}
            </Badge>
          </div>
        </div>

        {/* Notes */}
        {item.notes && (
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Ghi chú: </span>
              {item.notes}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for schedule list.
 * Shows 4 placeholder cards.
 */
function ScheduleSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardContent className="p-6">
            <Skeleton className="h-6 w-64 mb-3" />
            <div className="flex gap-4 mb-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-40" />
            </div>
            <Skeleton className="h-4 w-32 mb-4" />
            <Skeleton className="h-8 w-24" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
