import dayjs from 'dayjs';
import { TripStatusBadge } from '@pages/trips';
import type { TripWithDetails } from '@entities/trip';

interface CalendarGridProps {
  year: number;
  month: number; // 0-indexed (0 = January)
  trips: TripWithDetails[];
}

// Vietnamese day headers
const DAY_HEADERS = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

/**
 * Monthly calendar grid displaying trips on day cells.
 * Uses dayjs for date calculations and CSS grid for layout.
 */
export function CalendarGrid({ year, month, trips }: CalendarGridProps) {
  // Calculate grid dimensions
  const firstDayOfMonth = dayjs(new Date(year, month, 1));
  const daysInMonth = firstDayOfMonth.daysInMonth();
  const startDayOfWeek = firstDayOfMonth.day(); // 0 = Sunday

  // Today's date string for highlighting
  const todayString = dayjs().format('YYYY-MM-DD');

  // Generate empty cells for offset
  const offsetCells = Array.from({ length: startDayOfWeek }, (_, i) => (
    <div key={`offset-${i}`} className="min-h-[120px] bg-muted/20" />
  ));

  // Generate day cells
  const dayCells = Array.from({ length: daysInMonth }, (_, dayNum) => {
    const cellDate = dayjs(new Date(year, month, dayNum + 1));
    const cellDateString = cellDate.format('YYYY-MM-DD');
    const isToday = cellDateString === todayString;

    // Filter trips for this day using full date string comparison
    const dayTrips = trips.filter((trip) =>
      dayjs(trip.departure_time).format('YYYY-MM-DD') === cellDateString
    );

    const displayTrips = dayTrips.slice(0, 3);
    const moreCount = dayTrips.length - 3;

    return (
      <div
        key={dayNum}
        className={`min-h-[120px] p-2 border-t border-l border-border transition-colors ${
          isToday ? 'bg-primary/10 ring-1 ring-primary' : 'hover:bg-muted/30'
        }`}
      >
        {/* Date number */}
        <div className={`text-sm font-medium mb-1 ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
          {dayNum + 1}
        </div>

        {/* Trip cards */}
        <div className="space-y-1">
          {displayTrips.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}

          {/* More indicator */}
          {moreCount > 0 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{moreCount} nữa
            </div>
          )}
        </div>
      </div>
    );
  });

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 bg-muted/50">
        {DAY_HEADERS.map((day) => (
          <div
            key={day}
            className="py-3 text-center text-sm font-semibold text-foreground border-r border-border last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {offsetCells}
        {dayCells}
      </div>
    </div>
  );
}

interface TripCardProps {
  trip: TripWithDetails;
}

/**
 * Compact trip card for calendar cells.
 * Shows route name/origin→destination, time, status, and vehicle.
 */
function TripCard({ trip }: TripCardProps) {
  const time = dayjs(trip.departure_time).format('HH:mm');
  const routeDisplay =
    trip.route?.name ||
    (trip.route?.origin_station?.name && trip.route?.destination_station?.name
      ? `${trip.route.origin_station.name} → ${trip.route.destination_station.name}`
      : 'Chưa có tuyến');

  const statusColors: Record<string, string> = {
    scheduled: 'border-l-blue-500',
    in_progress: 'border-l-amber-500',
    completed: 'border-l-green-500',
    cancelled: 'border-l-red-500',
  };

  return (
    <div
      className={`p-1.5 rounded bg-background border-l-2 ${statusColors[trip.status] || 'border-l-gray-500'} shadow-sm hover:shadow-md transition-shadow`}
    >
      {/* Route and time */}
      <div className="text-xs font-medium text-foreground truncate">{routeDisplay}</div>
      <div className="flex items-center justify-between mt-0.5">
        {/* Time */}
        <span className="text-xs text-muted-foreground">{time}</span>
        {/* Vehicle plate */}
        {trip.vehicle && (
          <span className="text-xs text-muted-foreground">
            {trip.vehicle.license_plate}
          </span>
        )}
      </div>
      {/* Status badge (small) */}
      <div className="mt-1">
        <TripStatusBadge status={trip.status} />
      </div>
    </div>
  );
}
