"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "../../lib/cn"
import { Button } from "../button"
import { Calendar } from "../calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../popover"

/**
 * Date range object for from/to dates
 */
export interface DateRange {
  from?: Date
  to?: Date
}

/**
 * DateRangePicker component props for list page filters
 */
export interface DateRangePickerProps {
  /** Current date range value */
  value?: DateRange
  /** Callback when date range changes */
  onChange?: (range: DateRange) => void
  /** Placeholder for 'from' date input */
  fromPlaceholder?: string
  /** Placeholder for 'to' date input */
  toPlaceholder?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** Error message when range is invalid (from > to) */
  invalidRangeMessage?: string
  /** CSS class name */
  className?: string
}

/**
 * DateRangePicker wrapper component for list page filters
 *
 * Features:
 * - Does NOT use React Hook Form Controller — meant for uncontrolled filter inputs
 * - Renders two DatePicker instances (From/To) in a flex row
 * - Accepts and returns DateRange object with from/to dates
 * - Vietnamese locale support via date-fns
 * - Validates that from ≤ to, displays error message when invalid
 *
 * @example
 * ```tsx
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={setDateRange}
 *   placeholder="Chọn khoảng thời gian"
 *   invalidRangeMessage="Ngày bắt đầu phải nhỏ hơn ngày kết thúc"
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  fromPlaceholder = "Từ",
  toPlaceholder = "Đến",
  disabled = false,
  invalidRangeMessage = "Ngày bắt đầu phải nhỏ hơn hoặc bằng ngày kết thúc",
  className,
}: DateRangePickerProps) {
  // Validate that from ≤ to
  const isInvalidRange = value?.from && value?.to && value.from > value.to

  const handleFromChange = (date: Date | undefined) => {
    onChange?.({ from: date, to: value?.to })
  }

  const handleToChange = (date: Date | undefined) => {
    onChange?.({ from: value?.from, to: date })
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex gap-2">
        {/* From date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !value?.from && "text-muted-foreground",
                isInvalidRange && "border-destructive"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.from ? (
                format(value.from, "dd/MM/yyyy", { locale: vi })
              ) : (
                <span>{fromPlaceholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.from}
              onSelect={handleFromChange}
              initialFocus
              locale={vi}
            />
          </PopoverContent>
        </Popover>

        {/* To date picker */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "flex-1 justify-start text-left font-normal",
                !value?.to && "text-muted-foreground",
                isInvalidRange && "border-destructive"
              )}
              disabled={disabled}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {value?.to ? (
                format(value.to, "dd/MM/yyyy", { locale: vi })
              ) : (
                <span>{toPlaceholder}</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value?.to}
              onSelect={handleToChange}
              initialFocus
              locale={vi}
              disabled={(date) =>
                value?.from ? date < value.from : false
              }
            />
          </PopoverContent>
        </Popover>
      </div>

      {/* Show error message when range is invalid */}
      {isInvalidRange && (
        <p className="text-sm text-destructive">{invalidRangeMessage}</p>
      )}
    </div>
  )
}
