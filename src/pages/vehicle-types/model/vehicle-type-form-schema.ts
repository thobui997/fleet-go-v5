import { z } from 'zod';

const floorSchema = z.object({
  rows: z.coerce.number().int().min(1, 'Số hàng phải >= 1'),
  seats_per_row: z.coerce.number().int().min(1, 'Số ghế mỗi hàng phải >= 1'),
});

export type FloorConfig = z.infer<typeof floorSchema>;

export const vehicleTypeFormSchema = z.object({
  name: z.string().min(1, 'Tên loại xe không được để trống'),
  description: z.string().optional(),
  floors: z
    .array(floorSchema)
    .min(1, 'Phải có ít nhất một tầng')
    .max(3, 'Tối đa 3 tầng'),
  amenities: z.string().optional(),
});

export type VehicleTypeFormValues = z.infer<typeof vehicleTypeFormSchema>;

export function mapSupabaseError(error: { code?: string }): string {
  switch (error.code) {
    case '23505':
      return 'Tên loại xe đã tồn tại';
    case '23503':
      return 'Không thể xóa: loại xe đang được sử dụng';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}
