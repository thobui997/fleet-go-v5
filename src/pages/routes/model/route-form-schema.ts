import { z } from 'zod';
import type { RouteInsert } from '@entities/route';

export const FK_DROPDOWN_PAGE_SIZE = 1000;

export const routeFormSchema = z
  .object({
    name: z.string().trim().min(1, 'Tên tuyến đường không được để trống'),
    origin_station_id: z.string().min(1, 'Vui lòng chọn trạm đi'),
    destination_station_id: z.string().min(1, 'Vui lòng chọn trạm đến'),
    distance_km: z.coerce.number().positive('Khoảng cách phải lớn hơn 0'),
    estimated_duration_minutes: z.coerce
      .number()
      .int()
      .positive('Thời gian dự kiến phải lớn hơn 0'),
    base_price: z.coerce.number().min(0, 'Giá vé không được âm'),
    is_active: z.boolean().default(true),
  })
  .superRefine((data, ctx) => {
    if (
      data.origin_station_id &&
      data.destination_station_id &&
      data.origin_station_id === data.destination_station_id
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Trạm đi và trạm đến không được trùng nhau',
        path: ['destination_station_id'],
      });
    }
  });

export type RouteFormValues = z.infer<typeof routeFormSchema>;

export function mapSupabaseError(
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
    return 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại.';
  }

  switch (error.code) {
    case '23505':
      if (
        error.message?.includes('routes_name_key') ||
        error.details?.includes('(name)')
      ) {
        return 'Tên tuyến đường đã tồn tại';
      }
      return 'Giá trị đã tồn tại';
    case '23503':
      if (context === 'mutate') {
        return 'Trạm không tồn tại hoặc đã bị xóa';
      }
      return 'Không thể xóa tuyến đường đang được sử dụng bởi chuyến đi';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

export function parseDurationMinutes(interval: string): number {
  try {
    // Format: "X days HH:MM:SS"
    if (interval.includes(' days ')) {
      const parts = interval.split(' days ');
      const days = parseInt(parts[0], 10);
      const timeParts = parts[1].split(':');
      const hours = parseInt(timeParts[0], 10);
      const minutes = parseInt(timeParts[1], 10);
      const total = days * 1440 + hours * 60 + minutes;
      return total > 0 ? total : 1;
    }

    // Format: "HH:MM:SS" or "H:MM:SS"
    const parts = interval.split(':');
    if (parts.length >= 2) {
      const hours = parseInt(parts[0], 10);
      const minutes = parseInt(parts[1], 10);
      const total = hours * 60 + minutes;
      return total > 0 ? total : 1;
    }

    return 1;
  } catch {
    return 1;
  }
}

export function serializeToInsert(values: RouteFormValues): RouteInsert {
  const safeMinutes = Math.max(1, values.estimated_duration_minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const estimated_duration = `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:00`;

  return {
    name: values.name,
    origin_station_id: values.origin_station_id,
    destination_station_id: values.destination_station_id,
    distance_km: values.distance_km,
    estimated_duration,
    base_price: values.base_price,
    is_active: values.is_active ?? true,
  };
}
