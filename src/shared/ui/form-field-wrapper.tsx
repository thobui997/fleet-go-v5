import * as React from 'react';

import { Label } from './label';
import { cn } from '@shared/lib/cn';

export interface FormFieldWrapperProps {
  label: string;
  error?: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * A wrapper component for form fields that provides consistent layout.
 * Renders a Label above the child input component, and an error message below.
 *
 * @example
 * <FormFieldWrapper label="Email" error={errors.email?.message} required>
 *   <Input {...register('email')} />
 * </FormFieldWrapper>
 */
export function FormFieldWrapper({
  label,
  error,
  required = false,
  className,
  children,
}: FormFieldWrapperProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
