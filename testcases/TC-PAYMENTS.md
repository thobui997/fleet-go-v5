# Test Cases: Feature Quản lý Thanh toán (Payments Management)

## 1. Feature List Detected

- Danh sách thanh toán với phân trang, lọc (status, method, date range), tìm kiếm (booking_code)
- Xem chi tiết thanh toán (booking info, payment info, notes, processed_by)
- Cập nhật trạng thái thanh toán (State Machine):
  - pending → completed (Xác nhận thanh toán)
  - pending → failed (Đánh dấu thất bại)
  - completed → refunded (Hoàn tiền, yêu cầu notes)
- Không có tạo/xóa payment (payment được tạo qua booking flow)

---

## 2. Feature Analysis

### Business Flow
1. User truy cập /payments → Danh sách thanh toán (sắp xếp created_at DESC)
2. Lọc: status (pending/completed/failed/refunded), method (cash/e_wallet/bank_transfer), date range, search (booking_code)
3. Click "Xem" → Detail dialog hiển thị booking info + payment info
4. Cập nhật trạng thái:
   a. Pending → Click "Xác nhận thanh toán" → Confirm dialog → paid_at = now()
   b. Pending → Click "Đánh dấu thất bại" → Confirm dialog
   c. Completed → Click "Hoàn tiền" → Nhập lý do (required) → refunded_at = now()
5. processed_by = current user.id được tự động capture

### Actor / Role
- Ticket Agent, Accountant, Manager (theo SRS)
- Thực tế: Tất cả authenticated users

### State Machine (từ `payment.api.ts`)
```
Allowed transitions:
  pending   → completed | failed
  completed → refunded
  failed    → (terminal - no transitions)
  refunded  → (terminal - no transitions)
```

### Validation Rules
| Rule | Source | Error |
|------|--------|-------|
| State transition phải hợp lệ | `allowedTransitions` map in API | "Không thể chuyển trạng thái từ X sang Y" |
| Refund requires notes (non-empty trim) | UI: `disabled={isRefund && !notes.trim()}` | Button disabled (no error message) |
| processed_by = user.id | Auto-captured from auth context | - |

### Error Messages (từ `mapPaymentError`)
- `23505` + `idx_payments_txn_ref_unique` → "Mã giao dịch đã tồn tại cho phương thức này"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Timestamp Logic
- `pending → completed`: sets `paid_at = now()`
- `pending → failed`: does NOT set paid_at
- `completed → refunded`: sets `refunded_at = now()`, saves notes

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có thanh toán nào"
- **List Error:** Error card + "Thử lại"
- **Detail Dialog:** Booking info + Payment info + Action buttons
- **Status Dialog:** Confirmation + Amount display + Notes (for refund)
- **Pending payment:** Shows "Xác nhận thanh toán" + "Đánh dấu thất bại"
- **Completed payment:** Shows "Hoàn tiền"
- **Failed/Refunded:** No action buttons (terminal states)

### Dependencies
- Bookings table (FK: booking_id)
- Customers table (nested via booking)
- Profiles table (processed_by_profile)
- Authentication (bearer token, user.id for processed_by)

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Payment được tạo tự động khi tạo booking (không có UI tạo payment riêng) | Confirm với Dev: trigger hay manual? |
| A2 | Mỗi booking chỉ có 1 payment record (fetchPaymentByBooking dùng maybeSingle) | Confirm với BA |
| A3 | Không có partial refund (refund toàn bộ amount) | Confirm: có cần partial refund? |
| A4 | Notes chỉ required cho refund, không required cho completed/failed | Confirm với BA |
| A5 | Không có undo/rollback sau khi đã transition | Confirm: failed có thể retry thành completed? |
| A6 | transaction_reference không có UI để nhập (chỉ hiển thị) | Confirm: ai/khi nào set transaction_reference? |
| A7 | Không có notification khi payment status thay đổi | Confirm với BA |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `payment.api.ts:72-78` | Fetch current status trước khi validate | Race condition: 2 users cùng transition 1 payment. Cả 2 fetch pending, cả 2 gửi completed. | TC-PAY-EDGE-03 |
| `payment.api.ts:91` | `allowedTransitions[currentStatus]?.includes(targetStatus)` | Nếu currentStatus không nằm trong map (data corruption), throw generic error | TC-PAY-ERR-04 |
| `payment.api.ts:96-109` | Build updateData conditionally | Nếu targetStatus = 'refunded' nhưng notes undefined, notes không được set (chỉ UI enforce) | TC-PAY-NEG-04 |
| `payment-status-dialog.tsx:134` | `disabled={isRefund && !notes.trim()}` | Chỉ UI enforce notes required cho refund. API không validate notes. | TC-PAY-SEC-04 |
| `payment-detail-dialog.tsx:49-51` | canMarkCompleted/canMarkFailed/canRefund | Dựa trên payment.status từ list data (có thể stale nếu user khác đã transition) | TC-PAY-EDGE-04 |
| `payment.api.ts:42-44` | Search dùng `ilike('booking.booking_code', ...)` | Nested field ilike có thể không work đúng với PostgREST (cần !inner join) | TC-PAY-FUNC-06 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Lọc

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-FUNC-01 | Payments | Business | Hiển thị danh sách thanh toán | Có payments trong DB | 1. Truy cập /payments | - | DataTable hiển thị columns: Mã đặt vé, Khách hàng, Số tiền, Phương thức, Trạng thái, Ngày thanh toán, Actions. Sắp xếp created_at DESC. | Critical | Functional |
| TC-PAY-FUNC-02 | Payments | Business | Lọc theo trạng thái | Có payments nhiều status | 1. Chọn filter "Đã thanh toán" | status: completed | Chỉ hiển thị payments có status = completed | High | Functional |
| TC-PAY-FUNC-03 | Payments | Business | Lọc theo phương thức | Có payments nhiều methods | 1. Chọn filter "Tiền mặt" | method: cash | Chỉ hiển thị payments có method = cash | High | Functional |
| TC-PAY-FUNC-04 | Payments | Business | Lọc theo date range | Có payments nhiều ngày | 1. Chọn date range 01/05 - 15/05 | dateFrom, dateTo | Chỉ hiển thị payments có created_at trong khoảng | High | Functional |
| TC-PAY-FUNC-05 | Payments | Business | Kết hợp filter status + method | Có nhiều payments | 1. Chọn status "Chờ thanh toán"<br>2. Chọn method "Chuyển khoản" | status: pending, method: bank_transfer | Chỉ hiển thị payments pending + bank_transfer | Medium | Functional |
| TC-PAY-FUNC-06 | Payments | Business | Tìm kiếm theo mã đặt vé | Có payment cho booking "BK-20260520-001" | 1. Nhập "BK-2026" vào search<br>2. Đợi 300ms debounce | search: "BK-2026" | Hiển thị payments có booking_code chứa "BK-2026" | High | Functional |
| TC-PAY-FUNC-07 | Payments | Business | Tìm kiếm không có kết quả | Không có match | 1. Nhập "NOTEXIST" vào search | search: "NOTEXIST" | Hiển thị "Chưa có thanh toán nào" | Medium | Functional |
| TC-PAY-FUNC-08 | Payments | Business | Danh sách trống | Không có payments | 1. Truy cập /payments | - | Hiển thị "Chưa có thanh toán nào" | Medium | Functional |
| TC-PAY-FUNC-09 | Payments | Business | Status/Method labels hiển thị đúng | Có payments mỗi loại | 1. Quan sát cột Trạng thái và Phương thức | - | Status: pending→"Chờ thanh toán", completed→"Đã thanh toán", failed→"Thất bại", refunded→"Đã hoàn tiền". Method: cash→"Tiền mặt", e_wallet→"Ví điện tử", bank_transfer→"Chuyển khoản" | Low | UI |
| TC-PAY-FUNC-10 | Payments | Business | Ngày thanh toán hiển thị đúng | Payment completed có paid_at | 1. Quan sát cột "Ngày thanh toán" | paid_at: "2026-05-20T10:00:00Z" | Hiển thị format datetime tiếng Việt. Nếu paid_at = null → "—" | Low | UI |

### 5.2 Functional Tests - State Machine Transitions

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-SM-01 | Payments | Business | Pending → Completed (xác nhận thanh toán) | Payment status = pending | 1. Click "Xem" trên payment pending<br>2. Click "Xác nhận thanh toán"<br>3. Confirm dialog hiển thị số tiền<br>4. Click "Xác nhận" | - | 1. Toast: "Đã cập nhật trạng thái thanh toán"<br>2. Status → completed<br>3. paid_at = timestamp hiện tại<br>4. processed_by = current user.id | Critical | Functional |
| TC-PAY-SM-02 | Payments | Business | Pending → Failed (đánh dấu thất bại) | Payment status = pending | 1. Click "Xem" trên payment pending<br>2. Click "Đánh dấu thất bại"<br>3. Confirm dialog<br>4. Click "Xác nhận" | - | 1. Toast: "Đã cập nhật trạng thái thanh toán"<br>2. Status → failed<br>3. paid_at KHÔNG được set<br>4. processed_by = current user.id | Critical | Functional |
| TC-PAY-SM-03 | Payments | Business | Completed → Refunded (hoàn tiền) | Payment status = completed | 1. Click "Xem" trên payment completed<br>2. Click "Hoàn tiền"<br>3. Nhập lý do hoàn tiền<br>4. Click "Xác nhận" | notes: "Khách hàng yêu cầu hủy vé" | 1. Toast: "Đã cập nhật trạng thái thanh toán"<br>2. Status → refunded<br>3. refunded_at = timestamp hiện tại<br>4. notes = "Khách hàng yêu cầu hủy vé"<br>5. processed_by = current user.id | Critical | Functional |
| TC-PAY-SM-04 | Payments | Business | Confirm dialog hiển thị đúng thông tin | Payment pending | 1. Click "Xác nhận thanh toán"<br>2. Quan sát dialog | amount: 500000 | Dialog hiển thị: "Bạn có chắc muốn thay đổi trạng thái thanh toán từ Chờ thanh toán sang Đã thanh toán?" + Số tiền: 500.000đ | High | UI |
| TC-PAY-SM-05 | Payments | Business | Refund - notes field hiển thị | Payment completed, click "Hoàn tiền" | 1. Click "Hoàn tiền"<br>2. Quan sát dialog | - | Dialog hiển thị textarea "Lý do hoàn tiền" (placeholder: "Nhập lý do hoàn tiền...") | High | UI |
| TC-PAY-SM-06 | Payments | Business | Refund - button disabled khi notes trống | Dialog refund mở | 1. Để trống notes<br>2. Quan sát button "Xác nhận" | notes: "" | Button "Xác nhận" disabled (isRefund && !notes.trim()) | High | Validation |
| TC-PAY-SM-07 | Payments | Business | Refund - button disabled khi notes chỉ spaces | Dialog refund mở | 1. Nhập "   " (spaces) vào notes<br>2. Quan sát button | notes: "   " | Button "Xác nhận" disabled (trim() → empty) | Medium | Validation |
| TC-PAY-SM-08 | Payments | Business | Refund - button enabled khi có notes | Dialog refund mở | 1. Nhập lý do hợp lệ<br>2. Quan sát button | notes: "KH yêu cầu hủy" | Button "Xác nhận" enabled | High | Validation |

### 5.3 Negative Tests - Invalid State Transitions

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-NEG-01 | Payments | Business | Failed → Completed (invalid transition) | Payment status = failed | 1. Xem chi tiết payment failed<br>2. Quan sát action buttons | - | KHÔNG hiển thị button "Xác nhận thanh toán" (canMarkCompleted = false khi status != pending) | Critical | Negative |
| TC-PAY-NEG-02 | Payments | Business | Failed → Refunded (invalid transition) | Payment status = failed | 1. Xem chi tiết payment failed | - | KHÔNG hiển thị button "Hoàn tiền" (canRefund = false khi status != completed) | Critical | Negative |
| TC-PAY-NEG-03 | Payments | Business | Refunded → bất kỳ (terminal state) | Payment status = refunded | 1. Xem chi tiết payment refunded | - | KHÔNG hiển thị bất kỳ action button nào. Chỉ có button "Đóng". | Critical | Negative |
| TC-PAY-NEG-04 | Payments | Business | Completed → Completed (same state) | Payment status = completed | 1. Gọi API trực tiếp: updatePaymentStatus(id, {status: 'completed'}) | - | Error: "Không thể chuyển trạng thái từ completed sang completed" (allowedTransitions[completed] = ['refunded']) | High | Negative |
| TC-PAY-NEG-05 | Payments | Business | Pending → Refunded (skip state) | Payment status = pending | 1. Gọi API trực tiếp: updatePaymentStatus(id, {status: 'refunded'}) | - | Error: "Không thể chuyển trạng thái từ pending sang refunded" | High | Negative |
| TC-PAY-NEG-06 | Payments | Business | Refunded → Pending (reverse transition) | Payment status = refunded | 1. Gọi API trực tiếp: updatePaymentStatus(id, {status: 'pending'}) | - | Error: "Không thể chuyển trạng thái từ refunded sang pending" (allowedTransitions[refunded] = []) | High | Negative |

### 5.4 Functional Tests - Xem chi tiết

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-FUNC-11 | Payments | Business | Xem chi tiết đầy đủ | Payment completed có đầy đủ data | 1. Click "Xem" trên payment row | - | Dialog hiển thị: Mã đặt vé, Khách hàng, Điện thoại, Số tiền, Phương thức, Trạng thái (badge), Ngày thanh toán, Mã giao dịch, Người xử lý | Critical | Functional |
| TC-PAY-FUNC-12 | Payments | Business | Chi tiết - payment chưa có paid_at | Payment pending | 1. Xem chi tiết payment pending | paid_at: null | Không hiển thị row "Ngày thanh toán" | Low | Functional |
| TC-PAY-FUNC-13 | Payments | Business | Chi tiết - payment có refunded_at | Payment refunded | 1. Xem chi tiết payment refunded | refunded_at: "2026-05-20T15:00:00Z" | Hiển thị "Ngày hoàn tiền: 20/05/2026 15:00" | Medium | Functional |
| TC-PAY-FUNC-14 | Payments | Business | Chi tiết - payment có notes | Payment refunded có notes | 1. Xem chi tiết | notes: "KH yêu cầu hủy" | Hiển thị section "Ghi chú" với nội dung notes | Medium | Functional |
| TC-PAY-FUNC-15 | Payments | Business | Chi tiết - payment không có notes | Payment pending | 1. Xem chi tiết | notes: null | KHÔNG hiển thị section "Ghi chú" | Low | Functional |
| TC-PAY-FUNC-16 | Payments | Business | Chi tiết - transaction_reference | Payment có mã giao dịch | 1. Xem chi tiết | transaction_reference: "TXN-123456" | Hiển thị "Mã giao dịch: TXN-123456" (font-mono) | Low | Functional |
| TC-PAY-FUNC-17 | Payments | Business | Chi tiết - processed_by_profile | Payment có người xử lý | 1. Xem chi tiết | processed_by_profile: {full_name: "Admin"} | Hiển thị "Người xử lý: Admin" | Low | Functional |

### 5.5 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-UI-01 | Payments | Business | Loading state | Truy cập /payments | 1. Quan sát UI trong lúc loading | - | DataTable hiển thị skeleton/loading indicator | High | UI |
| TC-PAY-UI-02 | Payments | Business | Error state với retry | API trả lỗi | 1. Trigger error<br>2. Quan sát UI | - | Error card + message + button "Thử lại" | High | UI |
| TC-PAY-UI-03 | Payments | Business | Status dialog - loading state | Đang submit transition | 1. Click "Xác nhận" trong status dialog<br>2. Quan sát | - | Button hiển thị Loader2 spinner + disabled. Button "Hủy" disabled. | High | UI |
| TC-PAY-UI-04 | Payments | Business | Notes field reset khi mở dialog | Mở refund dialog lần 2 | 1. Mở refund dialog, nhập notes<br>2. Đóng dialog<br>3. Mở lại refund dialog | - | Notes field reset về trống (useEffect reset on open) | Medium | UI |
| TC-PAY-UI-05 | Payments | Business | Action buttons hiển thị đúng theo status | Payments mỗi status | 1. Xem detail payment pending<br>2. Xem detail payment completed<br>3. Xem detail payment failed<br>4. Xem detail payment refunded | - | Pending: "Xác nhận thanh toán" + "Đánh dấu thất bại"<br>Completed: "Hoàn tiền"<br>Failed: Không có action<br>Refunded: Không có action | High | UI |
| TC-PAY-UI-06 | Payments | Business | Số tiền format currency | Payment amount = 500000 | 1. Quan sát cột "Số tiền" và detail dialog | amount: 500000 | Hiển thị "500.000 ₫" (formatCurrency) | Medium | UI |
| TC-PAY-UI-07 | Payments | Business | Không có button "Tạo thanh toán" | Trang /payments | 1. Quan sát header | - | KHÔNG có button tạo mới (payments chỉ tạo qua booking flow) | Low | UI |

### 5.6 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-ERR-01 | Payments | Business | Session expired khi cập nhật status | Token hết hạn | 1. Để session expire<br>2. Thử transition payment | - | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-PAY-ERR-02 | Payments | Business | Network error khi submit | Mất kết nối | 1. Tắt network<br>2. Click "Xác nhận" trong status dialog | - | Toast error: "Thao tác thất bại. Vui lòng thử lại." Button trở lại enabled. | High | Error Handling |
| TC-PAY-ERR-03 | Payments | Business | Invalid transition error từ API | Gọi API với transition không hợp lệ | 1. Trigger invalid transition (e.g., failed→completed qua API) | - | Error message: "Không thể chuyển trạng thái từ failed sang completed" | High | Error Handling |
| TC-PAY-ERR-04 | Payments | Business | Payment not found | Payment bị xóa bởi user khác | 1. Xem detail payment<br>2. Payment bị xóa ở DB<br>3. Thử transition | - | Error (PGRST116 hoặc no rows). Toast error hiển thị. | Medium | Error Handling |
| TC-PAY-ERR-05 | Payments | Business | Duplicate transaction reference | Gọi API set trùng txn_ref | 1. Update payment với transaction_reference đã tồn tại | - | Toast error: "Mã giao dịch đã tồn tại cho phương thức này" | Medium | Error Handling |

### 5.7 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-SEC-01 | Payments | Business | Truy cập /payments khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /payments | - | Redirect về /login | Critical | Security |
| TC-PAY-SEC-02 | Payments | Business | API call không có token | Không auth | 1. PATCH /rest/v1/payments/:id không có Authorization | - | Status 401 Unauthorized | High | Security |
| TC-PAY-SEC-03 | Payments | Business | XSS qua notes field (refund) | Dialog refund mở | 1. Nhập script tag vào notes<br>2. Submit<br>3. Xem chi tiết | notes: `<script>alert('xss')</script>` | Data lưu text, hiển thị escaped trong detail. Không execute. | High | Security |
| TC-PAY-SEC-04 | Payments | Business | Bypass UI - refund không có notes qua API | Gọi API trực tiếp | 1. Call updatePaymentStatus(id, {status: 'refunded'}) không có notes | - | API cho phép (chỉ UI enforce notes required). Refund thành công với notes = undefined. Risk: business logic gap. | Medium | Security |
| TC-PAY-SEC-05 | Payments | Business | SQL Injection qua search | Trang /payments | 1. Nhập SQL injection vào search | search: `'; DROP TABLE payments; --` | Supabase parameterized query ngăn injection. Trả 0 results. | High | Security |
| TC-PAY-SEC-06 | Payments | Business | Manipulate payment amount | Gọi API trực tiếp | 1. Thử PATCH amount trên payment | - | Supabase RLS hoặc column-level security ngăn chặn. Verify behavior. | Medium | Security |

### 5.8 Edge Case & Concurrency Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-EDGE-01 | Payments | Business | Double-click "Xác nhận" | Status dialog mở | 1. Double-click nhanh "Xác nhận" | - | Chỉ 1 transition xảy ra (button disabled khi isPending) | High | Functional |
| TC-PAY-EDGE-02 | Payments | Business | Đóng dialog khi đang pending | Mutation đang chạy | 1. Click "Xác nhận"<br>2. Ngay lập tức click "Hủy" | - | Button "Hủy" disabled khi isPending. Dialog không đóng được. | Medium | UI |
| TC-PAY-EDGE-03 | Payments | Business | Race condition - 2 users transition cùng payment | 2 sessions | 1. User A mở detail payment pending<br>2. User B mở detail cùng payment<br>3. User A click "Xác nhận thanh toán" → thành công<br>4. User B click "Xác nhận thanh toán" | - | User A thành công (pending→completed). User B nhận error: "Không thể chuyển trạng thái từ completed sang completed" (API fetch current status trước khi validate) | High | Edge Case |
| TC-PAY-EDGE-04 | Payments | Business | Stale data - payment đã transition bởi user khác | Detail dialog mở với stale data | 1. User A mở detail (status=pending, buttons visible)<br>2. User B transitions payment to completed<br>3. User A click "Đánh dấu thất bại" | - | API validate: current status = completed, target = failed → Error "Không thể chuyển trạng thái từ completed sang failed" | Medium | Edge Case |
| TC-PAY-EDGE-05 | Payments | Business | Transition payment liên quan đến booking đã cancelled | Booking cancelled, payment pending | 1. Booking bị cancel (payment → failed via cascade)<br>2. User mở payment detail (stale: pending)<br>3. Thử "Xác nhận thanh toán" | - | API validate: current status = failed → Error "Không thể chuyển trạng thái từ failed sang completed" | Medium | Edge Case |

### 5.9 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-RESP-01 | Payments | Business | Filters wrap trên mobile | Viewport 375px | 1. Resize viewport 375px<br>2. Quan sát filter bar | Viewport: 375x667 | Filters wrap (flex-wrap) xuống dòng mới. Tất cả filters accessible. | Medium | Responsive |
| TC-PAY-RESP-02 | Payments | Business | Detail dialog trên mobile | Viewport 375px | 1. Mở payment detail dialog | Viewport: 375x667 | Dialog full-width, content readable, action buttons stack vertically nếu cần | Medium | Responsive |
| TC-PAY-RESP-03 | Payments | Business | Status dialog trên mobile | Viewport 375px | 1. Mở status confirmation dialog | Viewport: 375x667 | Dialog usable, notes textarea full-width, buttons accessible | Medium | Responsive |

### 5.10 API Test Detail

#### Update Payment Status - Request Sample

```json
// Pending → Completed
PATCH /rest/v1/payments?id=eq.{uuid}
{
  "status": "completed",
  "paid_at": "2026-05-20T10:00:00.000Z",
  "processed_by": "uuid-user"
}

// Completed → Refunded
PATCH /rest/v1/payments?id=eq.{uuid}
{
  "status": "refunded",
  "refunded_at": "2026-05-20T15:00:00.000Z",
  "processed_by": "uuid-user",
  "notes": "Khách hàng yêu cầu hủy vé"
}
```

#### Error Response - Invalid Transition

```json
{
  "message": "Không thể chuyển trạng thái từ failed sang completed"
}
```

### 5.11 API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-PAY-API-01 | Payments | Business | GET /payments - status 200 | Auth valid | 1. GET /rest/v1/payments với bearer token | - | Status 200, data array + count | High | API |
| TC-PAY-API-02 | Payments | Business | GET /payments - filter by status + method | Auth valid | 1. GET /rest/v1/payments?status=eq.pending&method=eq.cash | - | Chỉ trả payments pending + cash | High | API |
| TC-PAY-API-03 | Payments | Business | GET /payments - no auth | Không token | 1. GET /rest/v1/payments | - | Status 401 | High | API |
| TC-PAY-API-04 | Payments | Business | PATCH - valid transition pending→completed | Auth valid, payment pending | 1. Fetch current status<br>2. PATCH status=completed | - | Status 200, paid_at set, processed_by set | Critical | API |
| TC-PAY-API-05 | Payments | Business | PATCH - invalid transition failed→completed | Auth valid, payment failed | 1. Fetch current status (failed)<br>2. PATCH status=completed | - | Error thrown: "Không thể chuyển trạng thái từ failed sang completed" | Critical | API |
| TC-PAY-API-06 | Payments | Business | PATCH - refund without notes | Auth valid, payment completed | 1. PATCH status=refunded, no notes field | - | Transition succeeds (API không enforce notes). refunded_at set. notes = undefined. | Medium | API |
| TC-PAY-API-07 | Payments | Business | GET /payments/:id - payment by booking | Auth valid | 1. GET /rest/v1/payments?booking_id=eq.{id} | - | Single payment record hoặc null (maybeSingle) | Medium | API |
| TC-PAY-API-08 | Payments | Business | PATCH - expired token | Token expired | 1. PATCH với expired token | - | Status 401/PGRST301 | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Payment tạo tự động hay manual? | Không thấy UI tạo payment. Cần confirm trigger mechanism. |
| 2 | Partial refund | Hiện tại refund toàn bộ. Cần confirm có cần partial refund (nhập amount)? |
| 3 | Notes required cho refund - server-side enforcement | Chỉ UI enforce. API cho phép refund không có notes. Cần confirm có cần server validation? |
| 4 | Failed → retry (pending lại) | Hiện tại failed là terminal. Cần confirm: có flow retry payment? |
| 5 | Transaction reference - ai set? | Không có UI nhập. Cần confirm: set bởi payment gateway integration? |
| 6 | Multiple payments per booking | Code dùng maybeSingle (1 payment/booking). Cần confirm: có case nhiều payments? |
| 7 | Permission enforcement | SRS nói Ticket Agent + Accountant + Manager. Code không enforce. Cần confirm. |
| 8 | Audit trail cho payment transitions | Không có logging. Cần confirm: có cần track lịch sử transitions? |

