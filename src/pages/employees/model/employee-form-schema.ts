import { z } from 'zod';

export const employeeFormSchema = z.object({
  user_id: z
    .string()
    .uuid('Vui lòng chọn người dùng')
    .or(z.literal('').transform(() => null))
    .nullable(),
  hire_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
    .nullable()
    .or(z.literal('').transform(() => null)),
  license_number: z
    .string()
    .max(50)
    .nullable()
    .or(z.literal('').transform(() => null)),
  license_expiry: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Ngày không hợp lệ')
    .nullable()
    .or(z.literal('').transform(() => null)),
  is_active: z.boolean().default(true),
  role_id: z
    .string()
    .uuid()
    .nullable()
    .or(z.literal('').transform(() => null)),
});

export type EmployeeFormValues = z.infer<typeof employeeFormSchema>;

export function mapEmployeeError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  const code = (err as { code?: string })?.code ?? '';
  const details = (err as { details?: string })?.details ?? '';
  const status = (err as { status?: number })?.status;

  // Auth expiry / permission errors
  if (
    code === 'PGRST301' ||
    msg.includes('PGRST301') ||
    status === 401 ||
    msg.includes('401') ||
    status === 403 ||
    msg.includes('403')
  ) {
    return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  }

  if (
    code === '23505' &&
    (msg.includes('employees_license_number_key') ||
      details.includes('(license_number)'))
  ) {
    return 'Số bằng lái đã tồn tại trong hệ thống';
  }

  if (
    code === '23505' &&
    (msg.includes('employees_user_id_key') || details.includes('(user_id)'))
  ) {
    return 'Người dùng này đã có hồ sơ nhân viên';
  }

  if (code === '23503') {
    return 'Nhân viên đã được phân công chuyến đi, không thể xóa';
  }

  return 'Đã xảy ra lỗi, vui lòng thử lại';
}
