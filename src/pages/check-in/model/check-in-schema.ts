import { z } from 'zod';

export const checkInSchema = z.object({
  bookingCode: z.string().trim().min(1, 'Vui lòng nhập mã đặt vé'),
});

export type CheckInFormData = z.infer<typeof checkInSchema>;

/**
 * Map Supabase errors to Vietnamese messages for check-in operations.
 *
 * @param error - Error from Supabase operation
 * @param context - 'lookup' for booking search, 'check-in' for ticket check-in mutation
 * @returns Vietnamese error message
 */
export function mapCheckInError(error: unknown, context: 'lookup' | 'check-in'): string {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = error.code as string;

    // PGRST116: row not found
    if (code === 'PGRST116') {
      if (context === 'lookup') {
        return 'Không tìm thấy đặt vé với mã này';
      }
      // context === 'check-in'
      return 'Vé đã được check-in hoặc không còn hiệu lực';
    }

    // Auth expiry
    if (code === '401' || code === '403' || code === 'PGRST301') {
      return 'Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.';
    }

    // Constraint violation
    if (code === '23505') {
      return 'Vé đã được xử lý trước đó';
    }
  }

  // Generic error
  return 'Không thể check-in. Vui lòng thử lại.';
}
