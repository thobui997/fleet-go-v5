"use client"

import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "../../lib/cn"
import { Button } from "../button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../popover"
import * as React from "react"

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
  /** Placeholder for 'from' date */
  fromPlaceholder?: string
  /** Placeholder for 'to' date */
  toPlaceholder?: string
  /** Whether the picker is disabled */
  disabled?: boolean
  /** CSS class name applied to the root element */
  className?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isSameDay(d1: Date, d2: Date) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth()    === d2.getMonth()    &&
    d1.getDate()     === d2.getDate()
  )
}

function isBetween(date: Date, a: Date, b: Date) {
  const lo = a < b ? a : b
  const hi = a < b ? b : a
  return date > lo && date < hi
}

function getDaysInMonth(date: Date) {
  const year  = date.getFullYear()
  const month = date.getMonth()
  const firstDay    = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const startDOW    = firstDay.getDay() // 0 = Sunday

  const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

  const prevLast = new Date(year, month, 0).getDate()
  for (let i = startDOW - 1; i >= 0; i--)
    days.push({ date: new Date(year, month - 1, prevLast - i), isCurrentMonth: false })

  for (let i = 1; i <= daysInMonth; i++)
    days.push({ date: new Date(year, month, i), isCurrentMonth: true })

  for (let i = 1; i <= 42 - days.length; i++)
    days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })

  return days
}

// ─── Internal range calendar ─────────────────────────────────────────────────

function ModernRangeCalendar({
  value,
  onChange,
}: {
  value?: DateRange
  onChange?: (range: DateRange) => void
}) {
  const [currentMonth, setCurrentMonth] = React.useState(value?.from ?? new Date())
  const [hoverDate, setHoverDate]       = React.useState<Date | undefined>()

  const prevMonth = () =>
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() - 1))
  const nextMonth = () =>
    setCurrentMonth(d => new Date(d.getFullYear(), d.getMonth() + 1))

  const handleDayClick = (date: Date) => {
    const { from, to } = value ?? {}

    if (!from || (from && to)) {
      onChange?.({ from: date, to: undefined })
    } else if (isSameDay(date, from)) {
      onChange?.({})                              // deselect
    } else if (date < from) {
      onChange?.({ from: date, to: from })        // swap: hover was before anchor
    } else {
      onChange?.({ from, to: date })              // normal: complete the range
    }
  }

  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const today    = new Date()
  const days     = getDaysInMonth(currentMonth)
  const { from, to } = value ?? {}

  // The "live" end point while the user has only selected `from` and is hovering
  const liveEnd: Date | undefined = from && !to ? hoverDate : undefined

  // Derive the visual range start/end — confirmed range wins; else use live preview
  const vizStart = from && to ? (from < to ? from : to)
    : from && liveEnd ? (from < liveEnd ? from : liveEnd)
    : undefined
  const vizEnd   = from && to ? (from < to ? to   : from)
    : from && liveEnd ? (from < liveEnd ? liveEnd : from)
    : undefined
  const isPreviewOnly = !!liveEnd // range is not yet confirmed

  return (
    <div className="p-4 select-none">

      {/* ── Month nav header ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={prevMonth}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors duration-150"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <span className="text-sm font-semibold text-foreground capitalize">
          {format(currentMonth, 'MMMM yyyy', { locale: vi })}
        </span>

        <button
          type="button"
          onClick={nextMonth}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors duration-150"
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* ── Weekday headers ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map(d => (
          <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase py-2 tracking-wide">
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-7">
        {days.map(({ date: day, isCurrentMonth }, index) => {
          const isFrom    = !!from && isSameDay(day, from)
          const isTo      = !!to   && isSameDay(day, to)
          const isToday   = isSameDay(day, today)

          // Is this day the rendered start or end of the visual range?
          const isVizStart = !!vizStart && isSameDay(day, vizStart)
          const isVizEnd   = !!vizEnd   && isSameDay(day, vizEnd)
          const inVizMid   = !!vizStart && !!vizEnd && isCurrentMonth
            && isBetween(day, vizStart, vizEnd)

          // Any solid endpoint (confirmed from/to)
          const isConfirmedEndpoint = isFrom || isTo
          // The preview-only live end circle (not yet confirmed)
          const isLiveEnd = !isTo && !!liveEnd && isCurrentMonth && isSameDay(day, liveEnd)

          // ── Band half-segments ──────────────────────────────────────────
          // Left half  → needed when the range extends to the LEFT of this cell
          //              i.e. this cell is NOT the leftmost highlighted cell
          const needLeftBand  = (inVizMid || isVizEnd)  && isCurrentMonth
          // Right half → needed when range extends to the RIGHT of this cell
          const needRightBand = (inVizMid || isVizStart) && isCurrentMonth

          const bandBg = isPreviewOnly ? "bg-primary/10" : "bg-primary/15"

          return (
            <div
              key={index}
              className="relative flex items-center justify-center h-9"
            >
              {/* Left-half band segment */}
              {needLeftBand && (
                <span className={cn("absolute inset-y-[5px] left-0 right-1/2 pointer-events-none", bandBg)} />
              )}
              {/* Right-half band segment */}
              {needRightBand && (
                <span className={cn("absolute inset-y-[5px] left-1/2 right-0 pointer-events-none", bandBg)} />
              )}

              {/* Day button (sits above band via z-10) */}
              <button
                type="button"
                onClick={() => isCurrentMonth && handleDayClick(day)}
                onMouseEnter={() => isCurrentMonth && setHoverDate(day)}
                onMouseLeave={() => setHoverDate(undefined)}
                disabled={!isCurrentMonth}
                className={cn(
                  "relative z-10 h-9 w-9 flex items-center justify-center rounded-xl",
                  "text-sm font-medium transition-colors duration-150",
                  // Out-of-month
                  !isCurrentMonth && "text-muted-foreground/30 cursor-default pointer-events-none",
                  // Normal hover
                  isCurrentMonth && !isConfirmedEndpoint && !isLiveEnd && "text-foreground hover:bg-muted",
                  // Today ring (only when not any kind of endpoint)
                  isToday && !isConfirmedEndpoint && !isLiveEnd
                    && "ring-1 ring-primary/60 text-primary font-semibold",
                  // Confirmed endpoint — solid primary
                  isConfirmedEndpoint
                    && "bg-primary text-primary-foreground font-semibold shadow-sm hover:bg-primary/90",
                  // Live hover endpoint — preview primary (slightly translucent)
                  !isConfirmedEndpoint && isLiveEnd
                    && "bg-primary/75 text-primary-foreground font-semibold",
                )}
              >
                {day.getDate()}

                {/* Today dot — only when not highlighted */}
                {isToday && !isConfirmedEndpoint && !isLiveEnd && !inVizMid && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </button>
            </div>
          )
        })}
      </div>

      {/* ── Contextual hint (fixed height to avoid layout shift) ───────────── */}
      <div className="h-6 flex items-center justify-center mt-1">
        {from && !to && (
          <p className="text-xs text-muted-foreground">
            Chọn ngày kết thúc
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Public component ─────────────────────────────────────────────────────────

/**
 * DateRangePicker — unified single-trigger date range selector for list page filters.
 *
 * Renders a single button showing "DD/MM/YYYY → DD/MM/YYYY" (or placeholders).
 * Opens a popover with a range-capable calendar. Visually consistent with DatePicker.
 *
 * Range selection flow:
 * - Click once  → sets `from` (start); hover preview activates
 * - Hover       → live band highlight from `from` to hovered date
 * - Click again → completes range, popover closes
 * - Click `from` again → deselects (clears range)
 * - Hovering/clicking before `from` → swaps anchor automatically
 * - Both dates set + click → resets and starts fresh
 *
 * @example
 * ```tsx
 * <DateRangePicker
 *   value={dateRange}
 *   onChange={(r) => { setDateRange(r); setPage(1); }}
 * />
 * ```
 */
export function DateRangePicker({
  value,
  onChange,
  fromPlaceholder = "Từ ngày",
  toPlaceholder   = "Đến ngày",
  disabled        = false,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)
  const hasFrom = !!value?.from
  const hasTo   = !!value?.to

  const handleChange = (range: DateRange) => {
    onChange?.(range)
    if (range.from && range.to) setOpen(false)
  }

  return (
    <div className={cn(className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "h-10 px-3 justify-between text-left font-normal",
              "border-input bg-background",
              "hover:bg-muted hover:text-foreground",
              "transition-colors duration-150",
              "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:cursor-not-allowed disabled:opacity-50",
            )}
            disabled={disabled}
          >
            <span className="flex items-center gap-1 min-w-0">
              <span className={cn("truncate text-sm", !hasFrom && "text-muted-foreground")}>
                {hasFrom
                  ? format(value!.from!, "dd/MM/yyyy", { locale: vi })
                  : fromPlaceholder}
              </span>
              <span className="shrink-0 text-muted-foreground text-sm">→</span>
              <span className={cn("truncate text-sm", !hasTo && "text-muted-foreground")}>
                {hasTo
                  ? format(value!.to!, "dd/MM/yyyy", { locale: vi })
                  : toPlaceholder}
              </span>
            </span>
            <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground ml-2" />
          </Button>
        </PopoverTrigger>

        <PopoverContent
          className="w-auto p-0 rounded-xl shadow-lg border border-border"
          align="start"
        >
          <ModernRangeCalendar value={value} onChange={handleChange} />
        </PopoverContent>
      </Popover>
    </div>
  )
}
