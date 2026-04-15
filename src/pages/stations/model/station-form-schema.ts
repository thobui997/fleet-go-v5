import { z } from 'zod';
import type { StationInsert } from '@entities/station';

export const stationFormSchema = z.object({
  name: z.string().trim().min(1, 'Tên trạm không được để trống'),
  code: z
    .string()
    .trim()
    .max(20, 'Mã trạm quá dài (tối đa 20 ký tự)')
    .optional()
    .or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  city: z.string().trim().min(1, 'Thành phố không được để trống'),
  province: z.string().optional().or(z.literal('')),
  latitude: z
    .union([
      z.coerce
        .number()
        .min(-90, 'Vĩ độ phải trong khoảng -90 đến 90')
        .max(90, 'Vĩ độ phải trong khoảng -90 đến 90'),
      z.literal(''),
    ])
    .optional(),
  longitude: z
    .union([
      z.coerce
        .number()
        .min(-180, 'Kinh độ phải trong khoảng -180 đến 180')
        .max(180, 'Kinh độ phải trong khoảng -180 đến 180'),
      z.literal(''),
    ])
    .optional(),
  is_active: z.boolean().default(true),
});

export type StationFormValues = z.infer<typeof stationFormSchema>;

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
      if (
        error.message?.includes('stations_name_key') ||
        error.details?.includes('(name)')
      ) {
        return 'Tên trạm đã tồn tại';
      }
      if (
        error.message?.includes('stations_code_key') ||
        error.details?.includes('(code)')
      ) {
        return 'Mã trạm đã tồn tại';
      }
      return 'Giá trị đã tồn tại';
    case '23503':
      return 'Không thể xóa trạm đang được sử dụng bởi tuyến đường';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}

export function serializeToInsert(values: StationFormValues): StationInsert {
  return {
    name: values.name,
    code:
      !values.code || values.code.trim() === '' ? null : values.code.trim(),
    address:
      !values.address || values.address.trim() === ''
        ? null
        : values.address,
    city: values.city,
    province:
      !values.province || values.province.trim() === ''
        ? null
        : values.province,
    latitude:
      values.latitude === '' || values.latitude === undefined
        ? null
        : Number(values.latitude),
    longitude:
      values.longitude === '' || values.longitude === undefined
        ? null
        : Number(values.longitude),
    is_active: values.is_active ?? true,
  };
}
