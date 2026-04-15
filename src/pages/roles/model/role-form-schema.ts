import { z } from 'zod';

export const roleFormSchema = z.object({
  name: z.string().min(1, 'Tên vai trò là bắt buộc').max(100),
  description: z.string().max(500).optional().or(z.literal('')),
  permissions: z.array(
    z
      .string()
      .min(1, 'Quyền không được để trống')
      .regex(/^\S+$/, 'Quyền không được chứa khoảng trắng')
  ),
});

export type RoleFormValues = z.infer<typeof roleFormSchema>;

export function mapRoleError(err: unknown): string {
  const e = err as Record<string, unknown>;
  const msg = (e?.message as string) ?? String(err);
  const details = e?.details as string | undefined;
  const code = e?.code as string | undefined;

  if (code === 'PGRST301' || code === '401' || code === '403')
    return 'Phiên đăng nhập hết hạn, vui lòng đăng nhập lại';

  if (msg.includes('roles_name_key') || details?.includes('(name)'))
    return 'Tên vai trò đã tồn tại, vui lòng chọn tên khác';

  if (code === '23514' || msg.includes('23514'))
    return 'Dữ liệu quyền không hợp lệ, vui lòng thử lại';

  return 'Đã xảy ra lỗi, vui lòng thử lại';
}
