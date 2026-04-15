import { z } from 'zod';

export const FK_DROPDOWN_PAGE_SIZE = 1000; // reuse constant (do NOT import from route-form-schema)

export const addStopFormSchema = z.object({
  station_id: z.string().min(1, 'Vui lòng chọn trạm dừng'),
  // audit-added: z.preprocess converts '' → null before coercion.
  // z.coerce.number() alone parses '' as 0, silently saving a 0-minute interval.
  arrival_time_minutes: z
    .preprocess(
      (v) => (v === '' || v == null ? null : v),
      z.coerce.number().int().positive('Thời gian phải lớn hơn 0').nullable()
    )
    .optional(),
});

export type AddStopFormValues = z.infer<typeof addStopFormSchema>;

// audit-added: context parameter matches established mapSupabaseError(error, context?) pattern.
// Save is non-atomic (DELETE then INSERT); if INSERT fails, stops are already wiped.
// The 'save' context produces an explicit retry-urgency message.
export function mapRouteStopError(
  error: {
    code?: string;
    message?: string;
    details?: string;
    status?: number;
  },
  context?: 'save'
): string {
  if (
    error.status === 401 ||
    error.status === 403 ||
    error.code === 'PGRST301'
  ) {
    return 'Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại.';
  }
  switch (error.code) {
    case '23505':
      return 'Trạm đã được sử dụng trong tuyến đường này';
    case '23503':
      return 'Trạm không tồn tại hoặc đã bị xóa';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    default:
      if (context === 'save') {
        return 'Lưu thất bại — vui lòng thử lại để tránh mất dữ liệu điểm dừng.';
      }
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

// Helper: parse PostgreSQL interval ("HH:MM:SS" or "X days HH:MM:SS") → minutes
export function parseIntervalToMinutes(interval: string | null): number | null {
  if (!interval) return null;
  try {
    if (interval.includes(' days ')) {
      const [dayPart, timePart] = interval.split(' days ');
      const [h, m] = timePart.split(':');
      return parseInt(dayPart, 10) * 1440 + parseInt(h, 10) * 60 + parseInt(m, 10);
    }
    const [h, m] = interval.split(':');
    const total = parseInt(h, 10) * 60 + parseInt(m, 10);
    return total > 0 ? total : null;
  } catch {
    return null;
  }
}

// Helper: minutes → "HH:MM:00" interval string
export function minutesToInterval(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
}
