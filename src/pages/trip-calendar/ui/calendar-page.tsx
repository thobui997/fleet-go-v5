import { useState } from 'react';
import dayjs from 'dayjs';
import { useTripsByDateRange } from '@entities/trip';
import { Card, CardContent } from '@shared/ui';
import { Button } from '@shared/ui';
import { Skeleton } from '@shared/ui';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';
import { CalendarGrid } from './calendar-grid';

/**
 * Trip Calendar page.
 * Monthly view of trips with navigation controls.
 * Handles loading, error, and auth-expiry states.
 */
export function CalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(dayjs());

  // Compute date range for the current month
  const startDate = currentMonth.startOf('month').format('YYYY-MM-DD');
  const endDate = currentMonth.endOf('month').format('YYYY-MM-DD');

  // Fetch trips for the month
  const { data: trips = [], isLoading, error, refetch } = useTripsByDateRange({ startDate, endDate });

  // Navigation handlers
  const goToPrevMonth = () => setCurrentMonth(currentMonth.subtract(1, 'month'));
  const goToNextMonth = () => setCurrentMonth(currentMonth.add(1, 'month'));
  const goToToday = () => setCurrentMonth(dayjs());

  // Format for display
  const monthName = currentMonth.format('MMMM YYYY');

  // Error message handling
  const errorMessage = error
    ? ((error as any).status === 401 ||
        (error as any).status === 403 ||
        (error as any).code === 'PGRST301'
        ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.'
        : 'Không thể tải lịch chuyến đi. Vui lòng thử lại.')
    : null;

  return (
    <div className="space-y-6">
      {/* Header with title and navigation */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Lịch chuyến đi</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Xem lịch trình chuyến đi theo tháng
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            <CalendarIcon className="h-4 w-4 mr-2" />
            Hôm nay
          </Button>
          <div className="flex items-center border border-border rounded-md">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPrevMonth}
              className="rounded-r-none"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="px-4 py-2 text-sm font-medium min-w-[120px] text-center">
              {monthName}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextMonth}
              className="rounded-l-none"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <Card>
        <CardContent className="p-6">
          {isLoading ? (
            // Loading skeleton
            <CalendarSkeleton />
          ) : errorMessage ? (
            // Error state
            <div className="text-center py-12">
              <p className="text-destructive mb-4">{errorMessage}</p>
              <Button onClick={() => refetch()} variant="outline">
                Thử lại
              </Button>
            </div>
          ) : (
            // Calendar grid
            <CalendarGrid
              year={currentMonth.year()}
              month={currentMonth.month()}
              trips={trips}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Loading skeleton for calendar grid.
 * Shows 6 rows × 7 columns placeholder cells.
 */
function CalendarSkeleton() {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day headers skeleton */}
      <div className="grid grid-cols-7 bg-muted/50">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={`header-${i}`}
            className="py-3 text-center"
          >
            <Skeleton className="h-4 w-8 mx-auto" />
          </div>
        ))}
      </div>

      {/* Calendar grid skeleton */}
      <div className="grid grid-cols-7">
        {Array.from({ length: 42 }).map((_, i) => (
          <div
            key={`cell-${i}`}
            className="min-h-[120px] p-2 border-t border-l border-border"
          >
            <Skeleton className="h-4 w-6 mb-2" />
            <Skeleton className="h-16 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
