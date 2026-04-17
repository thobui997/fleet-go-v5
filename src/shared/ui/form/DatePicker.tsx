"use client"

import { Controller } from "react-hook-form"
import { format } from "date-fns"
import { vi, type Locale } from "date-fns/locale"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { cn } from "../../lib/cn"
import { toLocalISODate, fromLocalISODate } from "../../lib/date-utils"
import { Button } from "../button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "../popover"
import * as React from "react"

/**
 * DatePicker component props for React Hook Form integration
 */
export interface DatePickerFormProps {
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
  /** Placeholder text when no date selected */
  placeholder?: string
}

/**
 * Custom Calendar component with high-contrast modern design
 */
function ModernCalendar({
  selected,
  onSelect,
  locale,
}: {
  selected?: Date
  onSelect?: (date: Date | undefined) => void
  locale?: Locale
}) {
  const [currentMonth, setCurrentMonth] = React.useState(selected || new Date())

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))
  }

  const goToToday = () => {
    const today = new Date()
    setCurrentMonth(today)
    onSelect?.(today)
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
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
                // Default state
                isCurrentMonth
                  ? "text-foreground hover:bg-muted"
                  : "text-muted-foreground/30 cursor-default pointer-events-none",
                // Today — subtle ring, slightly bolder
                isToday && !isSelected && "ring-1 ring-primary/60 text-primary font-semibold",
                // Selected — solid brand fill
                isSelected && [
                  "bg-primary text-primary-foreground font-semibold",
                  "hover:bg-primary/90",
                  "ring-0 shadow-sm",
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
 * DatePicker wrapper component for React Hook Form integration
 *
 * Features:
 * - Returns ISO string (YYYY-MM-DD) using local date — timezone-safe, no UTC shift
 * - Handles null/undefined by returning empty string
 * - Vietnamese locale support via date-fns
 * - Validation error display
 *
 * @example
 * ```tsx
 * <DatePicker
 *   control={control}
 *   name="dateOfBirth"
 *   label="Ngày sinh"
 *   required
 *   error={errors.dateOfBirth?.message}
 * />
 * ```
 */
export function DatePicker({
  control,
  name,
  label,
  error,
  required = false,
  disabled = false,
  placeholder = "Chọn ngày",
}: DatePickerFormProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => {
        const hasValue = !!field.value
        // Parse stored YYYY-MM-DD as local date to avoid UTC-midnight display shift
        const selectedDate = hasValue ? fromLocalISODate(field.value) : undefined
        const displayValue = selectedDate
          ? format(selectedDate, "dd/MM/yyyy", { locale: vi })
          : placeholder

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
                  <span className="truncate">{displayValue}</span>
                  <CalendarIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-auto p-0 rounded-xl shadow-lg border border-border"
                align="start"
              >
                <ModernCalendar
                  selected={selectedDate}
                  onSelect={(date) => {
                    // Use local date serialization — avoids UTC offset shifting the date
                    field.onChange(date ? toLocalISODate(date) : '')
                  }}
                  locale={vi}
                />
              </PopoverContent>
            </Popover>
            {error && (
              <p className="text-sm text-destructive mt-1 flex items-center gap-1.5">
                <span className="w-0.5 h-3.5 bg-destructive rounded-full shrink-0" />
                {error}
              </p>
            )}
          </div>
        )
      }}
    />
  )
}
