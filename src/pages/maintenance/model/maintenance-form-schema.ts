import { z } from 'zod';
import type { MaintenanceLogInsert, MaintenanceType } from '@entities/maintenance-log';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const FK_DROPDOWN_PAGE_SIZE = 1000;

export const maintenanceFormSchema = z
  .object({
    vehicle_id: z
      .string()
      .uuid({ message: 'Vui lòng chọn xe' })
      .min(1, 'Vui lòng chọn xe'),
    type: z.enum(['routine', 'repair', 'inspection', 'emergency'] as const, {
      errorMap: () => ({ message: 'Loại bảo trì không hợp lệ' }),
    }),
    description: z.string().min(1, 'Mô tả không được để trống'),
    cost: z
      .union([
        z.coerce
          .number()
          .min(0, 'Chi phí không được âm')
          .max(999_999_999.99, 'Chi phí vượt quá giới hạn'),
        z.literal(''),
      ])
      .optional(),
    performed_by: z.string().optional().or(z.literal('')),
    performed_at: z
      .string()
      .regex(DATE_REGEX, 'Ngày không hợp lệ (YYYY-MM-DD)'),
    next_due_date: z
      .string()
      .regex(DATE_REGEX, 'Ngày không hợp lệ (YYYY-MM-DD)')
      .or(z.literal(''))
      .optional(),
    odometer_reading: z
      .union([
        z.coerce
          .number()
          .int()
          .min(0, 'Số km không được âm')
          .max(10_000_000, 'Số km vượt quá giới hạn'),
        z.literal(''),
      ])
      .optional(),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    const performed = data.performed_at;
    const nextDue = data.next_due_date;
    if (
      performed &&
      nextDue &&
      nextDue.length > 0 &&
      nextDue < performed
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['next_due_date'],
        message: 'Ngày bảo trì kế tiếp phải sau ngày thực hiện',
      });
    }
  });

export type MaintenanceFormValues = z.infer<typeof maintenanceFormSchema>;

export function mapSupabaseError(error: {
  code?: string;
  message?: string;
  status?: number;
}): string {
  // Auth expiry / permission errors
  if (
    error.status === 401 ||
    error.status === 403 ||
    error.code === 'PGRST301'
  ) {
    return 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại.';
  }

  switch (error.code) {
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc CHECK)';
    case '23503':
      return 'Xe không tồn tại hoặc đã bị xóa';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

export function serializeToInsert(
  values: MaintenanceFormValues
): MaintenanceLogInsert {
  return {
    vehicle_id: values.vehicle_id,
    type: values.type as MaintenanceType,
    description: values.description,
    cost:
      values.cost === undefined || values.cost === '' ? 0 : Number(values.cost),
    performed_by:
      !values.performed_by || values.performed_by.trim() === ''
        ? null
        : values.performed_by,
    performed_at: values.performed_at,
    next_due_date:
      !values.next_due_date || values.next_due_date === ''
        ? null
        : values.next_due_date,
    odometer_reading:
      values.odometer_reading === '' || values.odometer_reading === undefined
        ? null
        : Number(values.odometer_reading),
    notes:
      !values.notes || values.notes.trim() === '' ? null : values.notes,
  };
}
