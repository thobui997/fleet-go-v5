import { z } from 'zod';
import { TRIP_STATUSES } from '@entities/trip';
import type { TripInsert } from '@entities/trip';

export const FK_DROPDOWN_PAGE_SIZE = 1000;

export const tripFormSchema = z
  .object({
    route_id: z.string().min(1, 'Vui lòng chọn tuyến đường'),
    vehicle_id: z.string().min(1, 'Vui lòng chọn xe'),
    departure_time: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Thời gian không hợp lệ'),
    estimated_arrival_time: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/, 'Thời gian không hợp lệ'),
    status: z.enum([...TRIP_STATUSES]).default('scheduled'),
    price_override: z
      .preprocess(
        (v) => (v === '' || v === null || v === undefined ? null : v),
        z.coerce.number().min(0, 'Giá không được âm').nullable()
      ),
    notes: z
      .string()
      .max(500, 'Ghi chú không được quá 500 ký tự')
      .nullable()
      .or(z.literal('').transform(() => null)),
  })
  .superRefine((data, ctx) => {
    const departure = new Date(data.departure_time);
    const arrival = new Date(data.estimated_arrival_time);
    if (departure >= arrival) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Thời gian đến phải sau thời gian đi',
        path: ['estimated_arrival_time'],
      });
    }
  });

export type TripFormValues = z.infer<typeof tripFormSchema>;

export function mapTripError(
  error: {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  },
  context?: 'mutate' | 'delete'
): string {
  // Auth expiry / permission errors
  if (
    error.status === 401 ||
    error.status === 403 ||
    error.code === 'PGRST301'
  ) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  switch (error.code) {
    case '23503':
      if (context === 'delete') {
        return 'Chuyến đi đã được phân công nhân viên hoặc có vé đặt, không thể xóa';
      }
      return 'Tuyến đường hoặc xe không tồn tại hoặc đã bị xóa';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    case '22007':
      return 'Định dạng ngày giờ không hợp lệ';
    default:
      return 'Đã xảy ra lỗi, vui lòng thử lại';
  }
}

export function serializeToInsert(values: TripFormValues): TripInsert {
  return {
    route_id: values.route_id,
    vehicle_id: values.vehicle_id,
    departure_time: new Date(values.departure_time).toISOString(),
    estimated_arrival_time: new Date(
      values.estimated_arrival_time
    ).toISOString(),
    actual_arrival_time: null,
    status: values.status as 'scheduled' | 'in_progress' | 'completed' | 'cancelled',
    price_override: values.price_override,
    notes: values.notes?.trim() || null,
  };
}

export function toDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
