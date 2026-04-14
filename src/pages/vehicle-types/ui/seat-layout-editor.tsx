import * as React from 'react';
import { FormFieldWrapper, Input } from '@shared/ui';

// ─── Seat Grid Preview ────────────────────────────────────────────────────────

interface SeatGridProps {
  rows: number;
  seatsPerRow: number;
}

function SeatGrid({ rows, seatsPerRow }: SeatGridProps) {
  if (rows <= 0 || seatsPerRow <= 0) return null;

  const displayRows = Math.min(rows, 15);
  const displaySeats = Math.min(seatsPerRow, 10);
  const isCapped = rows > 15 || seatsPerRow > 10;
  // Insert an aisle gap when there are more than 2 seats across
  const aisleAfter = seatsPerRow > 2 ? Math.floor(seatsPerRow / 2) : null;

  return (
    <div className="rounded-lg border bg-muted/10 p-3 space-y-2">
      {/* Front of bus indicator */}
      <div className="flex justify-center">
        <span className="inline-block rounded-full border bg-muted px-3 py-0.5 text-[11px] text-muted-foreground">
          Đầu xe
        </span>
      </div>

      {/* Seat grid */}
      <div className="overflow-auto" style={{ maxHeight: '168px' }}>
        <div className="mx-auto flex w-fit flex-col gap-[3px]">
          {Array.from({ length: displayRows }, (_, rowIdx) => (
            <div key={rowIdx} className="flex items-center gap-1">
              {/* Row number */}
              <span className="w-4 shrink-0 text-right text-[10px] leading-none text-muted-foreground">
                {rowIdx + 1}
              </span>
              {/* Seat squares */}
              <div className="flex gap-[3px]">
                {Array.from({ length: displaySeats }, (_, seatIdx) => (
                  <React.Fragment key={seatIdx}>
                    {aisleAfter !== null && seatIdx === aisleAfter && (
                      <div className="w-2.5 shrink-0" aria-hidden="true" />
                    )}
                    <div className="h-[18px] w-6 rounded-sm rounded-t-[4px] border border-primary/35 bg-primary/20" />
                  </React.Fragment>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {isCapped && (
        <p className="text-center text-[10px] text-muted-foreground">
          Hiển thị {displayRows}×{displaySeats} (bị giới hạn xem trước)
        </p>
      )}

      {/* Floor total */}
      <div className="flex items-center justify-between border-t pt-2 text-xs">
        <span className="text-muted-foreground">Tổng ghế tầng này</span>
        <span className="font-semibold tabular-nums">{rows * seatsPerRow} ghế</span>
      </div>
    </div>
  );
}

// ─── Floor Editor ─────────────────────────────────────────────────────────────

export interface SeatLayoutEditorProps {
  floorIndex: number;
  rows: number;
  seatsPerRow: number;
  rowsError?: string;
  seatsPerRowError?: string;
  onRowsChange: (value: number) => void;
  onSeatsPerRowChange: (value: number) => void;
}

export function SeatLayoutEditor({
  floorIndex,
  rows,
  seatsPerRow,
  rowsError,
  seatsPerRowError,
  onRowsChange,
  onSeatsPerRowChange,
}: SeatLayoutEditorProps) {
  return (
    <div className="space-y-3 rounded-lg border bg-card p-4">
      <p className="text-sm font-medium">Tầng {floorIndex + 1}</p>

      <div className="grid grid-cols-2 gap-3">
        <FormFieldWrapper label="Số hàng" error={rowsError} required>
          <Input
            type="number"
            min={1}
            max={99}
            value={rows > 0 ? rows : ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) onRowsChange(val);
            }}
          />
        </FormFieldWrapper>

        <FormFieldWrapper label="Ghế mỗi hàng" error={seatsPerRowError} required>
          <Input
            type="number"
            min={1}
            max={20}
            value={seatsPerRow > 0 ? seatsPerRow : ''}
            onChange={(e) => {
              const val = parseInt(e.target.value, 10);
              if (!isNaN(val) && val >= 1) onSeatsPerRowChange(val);
            }}
          />
        </FormFieldWrapper>
      </div>

      <SeatGrid rows={rows} seatsPerRow={seatsPerRow} />
    </div>
  );
}
