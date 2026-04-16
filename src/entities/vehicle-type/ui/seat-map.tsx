import { cn } from '@shared/lib';

export interface SeatMapProps {
  layout: Record<string, { rows: number; seats_per_row: number }>;
  bookedSeats?: string[];
  selectedSeats?: string[];
  onSeatClick?: (seatNumber: string) => void;
  mode?: 'view' | 'select';
  className?: string;
}

export function SeatMap({
  layout,
  bookedSeats = [],
  selectedSeats = [],
  onSeatClick,
  mode = 'view',
  className,
}: SeatMapProps) {
  // Generate seat number: {ROW_LETTER}{SEAT_NUM_PADDED_2} e.g., A01, B04, C02
  const generateSeatNumber = (floorIndex: number, rowIndex: number, seatIndex: number): string => {
    // Calculate continuous row letter across floors
    // Each floor contributes its rows to the letter sequence
    let totalRowsBefore = 0;
    for (let i = 0; i < floorIndex; i++) {
      const floorKey = `floor_${i + 1}`;
      const floorData = layout[floorKey];
      if (floorData && typeof floorData.rows === 'number' && floorData.rows > 0) {
        totalRowsBefore += floorData.rows;
      }
    }

    const rowLetter = String.fromCharCode(65 + (totalRowsBefore + rowIndex)); // 65 = 'A'
    const seatNum = String(seatIndex + 1).padStart(2, '0');
    return `${rowLetter}${seatNum}`;
  };

  // Check if seat is booked
  const isBooked = (seatNumber: string) => bookedSeats.includes(seatNumber);

  // Check if seat is selected
  const isSelected = (seatNumber: string) => selectedSeats.includes(seatNumber);

  // Get seat color classes based on state
  const getSeatClasses = (seatNumber: string) => {
    const booked = isBooked(seatNumber);
    const selected = isSelected(seatNumber);

    if (booked) {
      return 'bg-red-100 text-red-800 border-red-300 hover:bg-red-200 dark:bg-red-900 dark:text-red-200 dark:border-red-700';
    }
    if (selected) {
      return 'bg-blue-100 text-blue-800 border-blue-300 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700';
    }
    return 'bg-green-100 text-green-800 border-green-300 hover:bg-green-200 dark:bg-green-900 dark:text-green-200 dark:border-green-700';
  };

  // Runtime validation for layout data
  const validateLayout = () => {
    if (!layout || Object.keys(layout).length === 0) {
      return { valid: false, message: 'Chưa có sơ đồ ghế' };
    }

    for (const [_floorKey, floorData] of Object.entries(layout)) {
      if (!floorData || typeof floorData !== 'object') {
        return { valid: false, message: 'Sơ đồ ghế không hợp lệ' };
      }

      const rows = (floorData as any).rows;
      const seatsPerRow = (floorData as any).seats_per_row;

      // Check for valid positive integers
      if (
        typeof rows !== 'number' ||
        typeof seatsPerRow !== 'number' ||
        !Number.isFinite(rows) ||
        !Number.isFinite(seatsPerRow) ||
        rows <= 0 ||
        seatsPerRow <= 0 ||
        isNaN(rows) ||
        isNaN(seatsPerRow)
      ) {
        return { valid: false, message: 'Sơ đồ ghế không hợp lệ' };
      }
    }

    return { valid: true };
  };

  const validation = validateLayout();

  if (!validation.valid) {
    return (
      <div className={cn('flex items-center justify-center p-6 text-muted-foreground', className)}>
        <p>{validation.message}</p>
      </div>
    );
  }

  // Sort floor keys numerically: floor_1, floor_2, floor_3, etc.
  const sortedFloorKeys = Object.keys(layout).sort((a, b) => {
    const aNum = parseInt(a.replace('floor_', ''), 10);
    const bNum = parseInt(b.replace('floor_', ''), 10);
    return aNum - bNum;
  });

  const isInteractive = mode === 'select';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Floor sections */}
      {sortedFloorKeys.map((floorKey) => {
        const floorData = layout[floorKey];
        const rows = (floorData as any).rows;
        const seatsPerRow = (floorData as any).seats_per_row;
        const floorIndex = sortedFloorKeys.indexOf(floorKey);
        const floorNumber = floorKey.replace('floor_', '');

        return (
          <div key={floorKey} className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">
              Tầng {floorNumber}
            </h4>
            <div
              className="grid gap-1"
              style={{
                gridTemplateColumns: `repeat(${seatsPerRow}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: rows }).flatMap((_, rowIndex) =>
                Array.from({ length: seatsPerRow }).map((_, seatIndex) => {
                  const seatNumber = generateSeatNumber(floorIndex, rowIndex, seatIndex);
                  const booked = isBooked(seatNumber);
                  const seatClasses = getSeatClasses(seatNumber);

                  return (
                    <button
                      key={seatNumber}
                      type="button"
                      disabled={!isInteractive || booked}
                      onClick={() => isInteractive && onSeatClick?.(seatNumber)}
                      className={cn(
                        'aspect-square rounded border-2 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary',
                        seatClasses,
                        !isInteractive && 'cursor-default',
                        isInteractive && !booked && 'cursor-pointer hover:scale-105',
                        booked && 'cursor-not-allowed opacity-60',
                      )}
                      title={mode === 'select' ? (booked ? `Ghế ${seatNumber} đã đặt` : `Ghế ${seatNumber}`) : `Ghế ${seatNumber}`}
                    >
                      {seatNumber}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-green-100 border-2 border-green-300 dark:bg-green-900 dark:border-green-700" />
          <span>Còn trống</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="h-4 w-4 rounded bg-red-100 border-2 border-red-300 dark:bg-red-900 dark:border-red-700" />
          <span>Đã đặt</span>
        </div>
        {mode === 'select' && (
          <div className="flex items-center gap-1.5">
            <div className="h-4 w-4 rounded bg-blue-100 border-2 border-blue-300 dark:bg-blue-900 dark:border-blue-700" />
            <span>Đang chọn</span>
          </div>
        )}
      </div>
    </div>
  );
}
