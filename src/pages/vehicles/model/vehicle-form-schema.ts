import { z } from 'zod';
import type { VehicleInsert } from '@entities/vehicle';

export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export const FK_DROPDOWN_PAGE_SIZE = 1000;

export const vehicleFormSchema = z
  .object({
    vehicle_type_id: z
      .string()
      .uuid({ message: 'Vui lòng chọn loại xe' })
      .min(1, 'Vui lòng chọn loại xe'),
    license_plate: z
      .string()
      .trim()
      .min(1, 'Biển số xe không được để trống')
      .max(20, 'Biển số xe quá dài')
      .transform((v) => v.toUpperCase()),
    vin_number: z
      .string()
      .trim()
      .transform((v) => (v.length === 0 ? '' : v.toUpperCase()))
      .optional()
      .or(z.literal('')),
    year_manufactured: z
      .union([
        z.coerce.number().int().min(1990, 'Năm sản xuất phải từ 1990'),
        z.literal(''),
      ])
      .optional(),
    status: z.enum(['active', 'maintenance', 'retired'], {
      errorMap: () => ({ message: 'Trạng thái không hợp lệ' }),
    }),
    current_mileage: z
      .union([
        z.coerce
          .number()
          .int()
          .min(0, 'Số km không được âm')
          .max(10_000_000, 'Số km vượt quá giới hạn hợp lý'),
        z.literal(''),
      ])
      .optional(),
    last_maintenance_date: z
      .string()
      .regex(DATE_REGEX, 'Ngày không hợp lệ (YYYY-MM-DD)')
      .or(z.literal(''))
      .optional(),
    next_maintenance_date: z
      .string()
      .regex(DATE_REGEX, 'Ngày không hợp lệ (YYYY-MM-DD)')
      .or(z.literal(''))
      .optional(),
    notes: z.string().optional().or(z.literal('')),
  })
  .superRefine((data, ctx) => {
    // Year upper bound — evaluated at validation time, not module load
    if (
      typeof data.year_manufactured === 'number' &&
      data.year_manufactured > new Date().getFullYear() + 1
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['year_manufactured'],
        message: 'Năm sản xuất không hợp lệ',
      });
    }

    // Cross-field: next_maintenance_date must be >= last_maintenance_date
    const last = data.last_maintenance_date;
    const next = data.next_maintenance_date;
    if (last && next && last.length > 0 && next.length > 0 && next < last) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['next_maintenance_date'],
        message: 'Ngày bảo trì kế tiếp phải sau ngày bảo trì trước',
      });
    }
  });

export type VehicleFormValues = z.infer<typeof vehicleFormSchema>;

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
    case '23505':
      if (error.message?.includes('license_plate')) {
        return 'Biển số xe đã tồn tại';
      }
      if (error.message?.includes('vin_number')) {
        return 'Số VIN đã tồn tại';
      }
      return 'Giá trị đã tồn tại';
    case '23503':
      return 'Không thể xóa: xe đang được sử dụng ở chuyến đi hoặc lịch sử bảo trì';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc CHECK)';
    case '22007':
      return 'Định dạng ngày tháng không hợp lệ';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

export function serializeToInsert(values: VehicleFormValues): VehicleInsert {
  return {
    vehicle_type_id: values.vehicle_type_id,
    license_plate: values.license_plate, // already uppercased by schema transform
    vin_number:
      !values.vin_number || values.vin_number.trim().length === 0
        ? null
        : values.vin_number,
    year_manufactured:
      values.year_manufactured === '' || values.year_manufactured === undefined
        ? null
        : Number(values.year_manufactured),
    status: values.status,
    current_mileage:
      values.current_mileage === '' || values.current_mileage === undefined
        ? null
        : Number(values.current_mileage),
    last_maintenance_date:
      !values.last_maintenance_date || values.last_maintenance_date.length === 0
        ? null
        : values.last_maintenance_date,
    next_maintenance_date:
      !values.next_maintenance_date || values.next_maintenance_date.length === 0
        ? null
        : values.next_maintenance_date,
    notes:
      !values.notes || values.notes.trim().length === 0 ? null : values.notes,
  };
}
