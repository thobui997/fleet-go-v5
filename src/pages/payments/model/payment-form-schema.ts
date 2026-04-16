export function mapPaymentError(error: {
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
      if (error.message?.includes('idx_payments_txn_ref_unique')) {
        return 'Mã giao dịch đã tồn tại cho phương thức này';
      }
      return 'Giá trị đã tồn tại';
    case '23514':
      return 'Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)';
    default:
      return 'Thao tác thất bại. Vui lòng thử lại.';
  }
}
