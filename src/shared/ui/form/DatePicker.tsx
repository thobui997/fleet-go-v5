"use client"

import { Controller, ControllerProps } from "react-hook-form"
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
 * DatePicker component props for React Hook Form integration
 */
export interface DatePickerFormProps {
  /** Form control from React Hook Form useForm */
  control: ControllerProps["control"]
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
 * DatePicker wrapper component for React Hook Form integration
 *
 * Features:
 * - Returns ISO string (YYYY-MM-DD) for form value consistency — date-only, timezone-agnostic
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
      render={({ field }) => (
        <div className="space-y-2">
          {label && (
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              {label}
              {required && <span className="text-destructive ml-1">*</span>}
            </label>
          )}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !field.value && "text-muted-foreground",
                  error && "border-destructive"
                )}
                disabled={disabled}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {field.value ? (
                  format(new Date(field.value), "dd/MM/yyyy", { locale: vi })
                ) : (
                  <span>{placeholder}</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={field.value ? new Date(field.value) : undefined}
                onSelect={(date) => {
                  // Return ISO string (YYYY-MM-DD) - date-only, timezone-agnostic
                  // Return empty string for null/undefined to prevent undefined crashes
                  field.onChange(date ? date.toISOString().split('T')[0] : '')
                }}
                initialFocus
                locale={vi}
              />
            </PopoverContent>
          </Popover>
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
        </div>
      )}
    />
  )
}
