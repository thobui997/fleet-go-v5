import { z } from 'zod';
import type { CustomerInsert } from '@entities/customer';

export const customerFormSchema = z.object({
  full_name: z.string().trim().min(1, 'Họ tên không được để trống'),
  phone_number: z
    .string()
    .trim()
    .min(1, 'Số điện thoại không được để trống')
    .regex(
      /^(0\d{9,10})$/,
      'Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)',
    ),
  email: z.string().email('Email không hợp lệ').optional().or(z.literal('')),
  date_of_birth: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (val) =>
        !val || val <= new Date().toISOString().slice(0, 10),
      'Ngày sinh không được là ngày trong tương lai',
    ),
  gender: z.string().optional().or(z.literal('')),
  id_card_number: z.string().trim().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  notes: z.string().optional().or(z.literal('')),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

export function mapSupabaseError(error: {
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
      if (error.message?.includes('customers_phone_number_key')) {
        return 'Số điện thoại đã tồn tại';
      }
      if (error.message?.includes('customers_email_key')) {
        return 'Email đã tồn tại';
      }
      if (error.message?.includes('customers_id_card_number_key')) {
        return 'Số CMND/CCCD đã tồn tại';
      }
      return 'Giá trị đã tồn tại';
    case '23503':
      return 'Không thể xóa khách hàng đã có đặt vé';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

export function serializeToInsert(
  values: CustomerFormValues,
): CustomerInsert {
  return {
    full_name: values.full_name,
    phone_number: values.phone_number.trim(), // CRITICAL: trim to prevent UNIQUE bypass
    email:
      !values.email || values.email.trim() === ''
        ? null
        : values.email, // CRITICAL: empty → null for UNIQUE nullable column
    date_of_birth:
      !values.date_of_birth || values.date_of_birth === ''
        ? null
        : values.date_of_birth,
    gender:
      !values.gender || values.gender === ''
        ? null
        : values.gender, // DB values directly: 'male' | 'female' | 'other'
    id_card_number:
      !values.id_card_number || values.id_card_number.trim() === ''
        ? null
        : values.id_card_number.trim(), // CRITICAL: empty → null for UNIQUE nullable column
    address:
      !values.address || values.address.trim() === ''
        ? null
        : values.address,
    notes:
      !values.notes || values.notes.trim() === ''
        ? null
        : values.notes,
    loyalty_points: 0, // Server default, excluded from form
  };
}
