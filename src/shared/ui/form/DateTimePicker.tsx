"use client"

import { Controller } from "react-hook-form"
import { format } from "date-fns"
import { vi, type Locale } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react"
import { cn } from "../../lib/cn"
import { Button } from "../button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../popover"
import * as React from "react"

/**
 * DateTimePicker component props for React Hook Form integration
 */
export interface DateTimePickerFormProps {
  /** Form control from React Hook Form useForm */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control: any
  /** Field name in form */
  name: string
  /** Label displayed above the input */
  label?: string
  /** Validation error message */
  error?: string
  /** Whether field is required */
  required?: boolean
  /** Whether field is disabled */
  disabled?: boolean
  /** Placeholder text when no datetime selected */
  placeholder?: string
}

/**
 * Serialize a local Date to YYYY-MM-DD without UTC conversion.
 * toISOString() shifts the date in UTC+N timezones — e.g. June 17
 * local midnight becomes "2025-06-16T17:00Z" in UTC+7.
 */
function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Parse a YYYY-MM-DD string as a local date (not UTC midnight).
 */
function fromLocalISODate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

/**
 * Split a stored "YYYY-MM-DDTHH:mm" value into its date and time parts.
 */
function parseDateTime(value: string): { date: string; time: string } {
  if (!value) return { date: "", time: "" }
  const [date = "", time = ""] = value.split("T")
  return { date, time }
}

/**
 * Combine date (YYYY-MM-DD) and time (HH:mm) into the stored format.
 * Returns whichever part is available so partial state is preserved.
 * Complete value "YYYY-MM-DDTHH:mm" is only produced when both are set.
 */
function buildDateTime(date: string, time: string): string {
  if (date && time) return `${date}T${time}`
  if (date) return date
  return ""
}

/**
 * Calendar with navigation — shared internal component.
 */
function ModernCalendar({
  selected,
  onSelect,
  locale,
}: {
  selected?: Date
  onSelect?: (date: Date) => void
  locale?: Locale
}) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

  const goToPreviousMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))

  const goToNextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    onSelect?.(today)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const startDayOfWeek = firstDay.getDay() // 0 = Sunday

    const days: Array<{ date: Date; isCurrentMonth: boolean }> = []

    // Previous month padding
    const prevMonthLastDay = new Date(year, month, 0).getDate()
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month - 1, prevMonthLastDay - i), isCurrentMonth: false })
    }

    // Current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Next month padding — always 6 rows × 7 cols
    const remainingDays = 42 - days.length
    for (let i = 1; i <= remainingDays; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }

  const weekDays = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
  const today = new Date()
  const days = getDaysInMonth(currentMonth)

  const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()

  return (
    <div className="p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={goToPreviousMonth}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors duration-150"
          aria-label="Tháng trước"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
        </button>

        <button
          type="button"
          onClick={goToToday}
          className="text-sm font-semibold text-foreground hover:text-primary transition-colors capitalize"
        >
          {format(currentMonth, 'MMMM yyyy', { locale })}
        </button>

        <button
          type="button"
          onClick={goToNextMonth}
          className="h-8 w-8 flex items-center justify-center rounded-lg text-foreground hover:bg-muted transition-colors duration-150"
          aria-label="Tháng sau"
        >
          <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="grid grid-cols-7 mb-1">
        {weekDays.map((day) => (
          <div
            key={day}
            className="text-center text-xs font-semibold text-muted-foreground uppercase py-2 tracking-wide"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map(({ date: dayDate, isCurrentMonth }, index) => {
          const isSelected = selected ? isSameDay(dayDate, selected) : false
          const isToday = isSameDay(dayDate, today)

          return (
            <button
              key={index}
              type="button"
              onClick={() => isCurrentMonth && onSelect?.(dayDate)}
              disabled={!isCurrentMonth}
              className={cn(
                "relative h-9 w-9 mx-auto flex items-center justify-center rounded-xl",
                "text-sm font-medium transition-colors duration-150",
                isCurrentMonth
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground/30 cursor-default pointer-events-none",
                isToday && !isSelected && "ring-1 ring-primary/60 text-primary font-semibold",
                isSelected && [
                  "bg-primary text-primary-foreground font-semibold",
                  "hover:bg-primary/90 ring-0 shadow-sm",
                ],
              )}
            >
              {dayDate.getDate()}
              {isToday && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * DateTimePicker — single trigger, calendar + time in one popover.
 *
 * The trigger shows the full formatted datetime ("17/06/2025, 14:30") when a
 * value is set, or the placeholder when empty. Opening the popover reveals the
 * calendar at the top and a time input at the bottom, separated by a divider.
 *
 * Stores "YYYY-MM-DDTHH:mm" — date part serialized from local time (no UTC
 * shift), time part taken directly from the <input type="time"> value.
 *
 * @example
 * ```tsx
 * <DateTimePicker
 *   control={control}
 *   name="departure_time"
 *   label="Giờ khởi hành"
 *   required
 *   error={errors.departure_time?.message}
 * />
 * ```
 */
export function DateTimePicker({
  control,
  name,
  label,
  error,
  required = false,
  disabled = false,
  placeholder = "Chọn ngày giờ",
}: DateTimePickerFormProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const { date, time } = parseDateTime(field.value || "")
        const selectedDate = date ? fromLocalISODate(date) : undefined

        // Trigger label: full datetime when complete, date-only when partial, placeholder when empty
        const triggerLabel = (() => {
          if (date && time) return format(fromLocalISODate(date), "dd/MM/yyyy", { locale: vi }) + ",  " + time
          if (date) return format(fromLocalISODate(date), "dd/MM/yyyy", { locale: vi })
          return placeholder
        })()
        const hasValue = !!date

        const handleDateSelect = (newDate: Date) => {
          field.onChange(buildDateTime(toLocalISODate(newDate), time))
        }

        const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
          field.onChange(buildDateTime(date, e.target.value))
        }

        return (
          <div className="space-y-1.5">
            {label && (
              <label className="text-sm font-medium text-foreground leading-none">
                {label}
                {required && <span className="text-destructive ml-0.5">*</span>}
              </label>
            )}

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className={cn(
                    "w-full h-10 px-3 justify-between text-left font-normal",
                    "border-input bg-background",
                    "hover:bg-muted hover:text-foreground",
                    "transition-colors duration-150",
                    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    "disabled:cursor-not-allowed disabled:opacity-50",
                    hasValue ? "text-foreground" : "text-muted-foreground",
                    error && "border-destructive focus-visible:ring-destructive"
                  )}
                  disabled={disabled}
                >
                  <span className="truncate">{triggerLabel}</span>
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>

              <PopoverContent
                className="w-auto p-0 rounded-xl shadow-lg border border-border"
                align="start"
              >
                {/* Calendar */}
                <ModernCalendar
                  selected={selectedDate}
                  onSelect={handleDateSelect}
                  locale={vi}
                />

                {/* Divider */}
                <div className="border-t border-border mx-1" />

                {/* Time input */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <input
                    type="time"
                    value={time}
                    onChange={handleTimeChange}
                    disabled={disabled}
                    step="60"
                    aria-label="Chọn giờ"
                    className={cn(
                      "h-8 w-[110px] rounded-lg border border-input bg-background px-2 text-sm font-medium",
                      "text-foreground transition-colors duration-150",
                      "hover:border-ring focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                      "disabled:cursor-not-allowed disabled:opacity-50",
                    )}
                  />
                  <span className="text-xs text-muted-foreground">Giờ khởi hành</span>
                </div>
              </PopoverContent>
            </Popover>

            {error && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                <span className="w-0.5 h-3.5 bg-destructive rounded-full shrink-0" />
                {error}
              </p>
            )}
            {date && !time && (
              <p className="text-xs text-muted-foreground mt-1">Vui lòng chọn thời gian</p>
            )}
          </div>
        )
      }}
    />
  )
}
