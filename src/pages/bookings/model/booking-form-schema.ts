import { z } from 'zod';

export const FK_DROPDOWN_PAGE_SIZE = 1000;

export const bookingFormSchema = z.object({
  customer_id: z.string().min(1, 'Vui lòng chọn khách hàng'),
  trip_id: z.string().min(1, 'Vui lòng chọn chuyến'),
  tickets: z.array(z.object({
    passenger_name: z.string().trim().min(1, 'Tên hành khách không được để trống'),
    seat_number: z.string().trim().min(1, 'Số ghế không được để trống'),
    passenger_phone: z.string().trim().optional().or(z.literal('')),
    passenger_id_card: z.string().trim().optional().or(z.literal('')),
    price: z.number().min(0, 'Giá vé phải lớn hơn hoặc bằng 0'),
  })).min(1, 'Phải có ít nhất một hành khách'),
  notes: z.string().optional().or(z.literal('')),
});

export type BookingFormValues = z.infer<typeof bookingFormSchema>;

export function mapBookingError(error: {
  code?: string;
  message?: string;
  details?: string;
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
      if (error.message?.includes('idx_tickets_no_double_booking')) {
        return 'Ghế này trên chuyến đã được đặt';
      }
      if (error.message?.includes('bookings_booking_code_key')) {
        return 'Mã đặt vé đã tồn tại';
      }
      return 'Giá trị đã tồn tại';
    case '23503':
      return 'Không thể xóa đặt vé đã có thanh toán';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}
