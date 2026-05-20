# Test Cases: Feature Đặt vé (Bookings Management)

## 1. Feature List Detected

- Danh sách đặt vé với phân trang, lọc, tìm kiếm
- Tạo đặt vé mới (chọn KH, chọn chuyến, chọn ghế, nhập thông tin hành khách)
- Xem chi tiết đặt vé (booking info, tickets, seat map, payment, QR code)
- Hủy đặt vé (cascade: tickets → cancelled, payments → refunded/failed)
- Xóa đặt vé (hard delete, chỉ khi status = pending)
- Hiển thị ghế đã đặt (booked seats)
- QR code cho từng vé
- Compensating transaction (xóa booking nếu tạo tickets thất bại)
- Unsaved changes blocker (useBlocker)

---

## 2. Feature Analysis

### Business Flow
1. Ticket Agent truy cập /bookings → Danh sách đặt vé (sắp xếp booking_date DESC)
2. Lọc: status (pending/confirmed/cancelled/completed/refunded), date range, search (booking_code hoặc customer name)
3. Tạo đặt vé:
   a. Navigate đến /bookings/new
   b. Chọn khách hàng (dropdown, max 1000 items)
   c. Chọn chuyến xe (chỉ hiển thị scheduled/in_progress)
   d. Hệ thống load ghế đã đặt (active/used tickets)
   e. Thêm hành khách (dynamic field array, min 1)
   f. Nhập: tên, số ghế, giá vé, SĐT (optional), CMND (optional)
   g. Submit → Insert booking → Insert tickets (with QR) → Redirect
4. Hủy đặt vé: booking→cancelled, tickets(active)→cancelled, payments(completed)→refunded, payments(pending)→failed
5. Xóa đặt vé: hard delete (chỉ pending, không có payment)

### Actor / Role
- Ticket Agent, Manager (theo SRS)
- Thực tế: Tất cả authenticated users

### Validation Rules (từ `booking-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| customer_id | required, min 1 | "Vui lòng chọn khách hàng" |
| trip_id | required, min 1 | "Vui lòng chọn chuyến" |
| tickets | array, min 1 item | "Phải có ít nhất một hành khách" |
| tickets[].passenger_name | required, trim, min 1 | "Tên hành khách không được để trống" |
| tickets[].seat_number | required, trim, min 1 | "Số ghế không được để trống" |
| tickets[].price | number, min 0 | "Giá vé phải lớn hơn hoặc bằng 0" |
| tickets[].passenger_phone | optional, trim | - |
| tickets[].passenger_id_card | optional, trim | - |
| notes | optional | - |

### Error Messages (từ `mapBookingError`)
- `23505` + `idx_tickets_no_double_booking` → "Ghế này trên chuyến đã được đặt"
- `23505` + `bookings_booking_code_key` → "Mã đặt vé đã tồn tại"
- `23503` → "Không thể xóa đặt vé đã có thanh toán"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Key Business Logic
- **booking_code:** Auto-generated (server-side)
- **total_amount:** Calculated = sum(ticket prices)
- **passenger_count:** = tickets.length
- **QR code format:** `${booking_code}-${seat_number.trim()}`
- **Compensating transaction:** Nếu insert tickets fail → delete booking đã tạo
- **Cancel cascade:** booking→cancelled, tickets(active)→cancelled, payments(completed→refunded, pending→failed)
- **Trip filter:** Chỉ hiển thị trips có status = scheduled hoặc in_progress
- **Booked seats:** Lấy seat_number từ tickets có status IN (active, used)
- **Default price:** trip.price_override ?? 150000

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có đặt vé nào"
- **List Error:** Error card + "Thử lại"
- **Form - No customers:** "Chưa có khách hàng nào. Vui lòng tạo khách hàng trước." + Submit disabled
- **Form - No trips:** "Chưa có chuyến xe nào. Vui lòng tạo chuyến xe trước." + Submit disabled
- **Form - Truncated dropdown:** Warning "Hiển thị X / Y (hãy tìm kiếm cụ thể hơn)"
- **Form - Submitting:** Button disabled + Loader2
- **Form - Unsaved changes:** Blocker dialog "Có thay đổi chưa lưu"
- **Detail - Loading:** Loader2 spinner
- **Detail - Cancel available:** status = pending hoặc confirmed
- **Detail - Delete available:** status = pending only

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | booking_code được generate ở server (DB trigger hoặc default), không phải client | Confirm với Dev |
| A2 | Không có edit booking (chỉ cancel/delete) | Confirm với BA |
| A3 | Không validate ghế trùng ở client trước khi submit (chỉ rely on DB unique constraint) | Confirm: có nên check client-side? |
| A4 | Không giới hạn số lượng tickets per booking | Confirm: có max passengers? |
| A5 | Không validate seat_number format (user nhập tự do) | Confirm: có cần match với seat_layout? |
| A6 | Cancel booking dùng window.confirm() thay vì custom dialog | Confirm: UX concern? |
| A7 | Compensating transaction không phải atomic (nếu delete booking fail sau ticket error, orphan có thể xảy ra) | Confirm với Dev |
| A8 | Dropdown load max 1000 items, không có search trong dropdown | Confirm: scalability concern khi > 1000 KH? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `booking.api.ts:97` | `createBookingWithTickets` - total_amount calculated client-side | Nếu client gửi price sai, total_amount sẽ sai. Không có server-side validation. | TC-BOOK-EDGE-04 |
| `booking.api.ts:128-129` | Compensating transaction - delete booking | Nếu delete cũng fail (network), orphan booking tồn tại không có tickets | TC-BOOK-ERR-04 |
| `booking.api.ts:136-178` | `cancelBooking` - 4 sequential updates | Nếu 1 update fail giữa chừng, data inconsistent (partial cancel) | TC-BOOK-ERR-05 |
| `booking-form-page.tsx:39` | `isTripAvailable` - chỉ check status | Không check departure_time > now(). Có thể book chuyến đã qua. | TC-BOOK-NEG-05 |
| `booking-form-page.tsx:148` | `useTripBookedSeats` dùng ref | Race condition: nếu user đổi trip nhanh, booked seats có thể hiển thị sai trip | TC-BOOK-EDGE-05 |
| `booking-form-page.tsx:197` | Default price fallback 150000 | Hardcoded fallback, không lấy từ route.base_price | TC-BOOK-FUNC-12 |
| `booking-detail-dialog.tsx:80` | `window.confirm()` cho cancel | Không consistent với UX pattern (các feature khác dùng custom Dialog) | TC-BOOK-UI-08 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Lọc

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-FUNC-01 | Bookings | Business | Hiển thị danh sách đặt vé | Có bookings trong DB | 1. Truy cập /bookings | - | DataTable hiển thị columns: Mã đặt vé, Khách hàng, Chuyến (origin→dest), Ngày đặt, Tổng tiền, Trạng thái, Số KH, Actions. Sắp xếp booking_date DESC. | Critical | Functional |
| TC-BOOK-FUNC-02 | Bookings | Business | Lọc theo trạng thái | Có bookings nhiều status | 1. Chọn filter "Đã xác nhận" | status: confirmed | Chỉ hiển thị bookings có status = confirmed | High | Functional |
| TC-BOOK-FUNC-03 | Bookings | Business | Lọc theo date range | Có bookings nhiều ngày | 1. Chọn date range 01/05 - 15/05 | dateFrom: 2026-05-01, dateTo: 2026-05-15 | Chỉ hiển thị bookings có booking_date trong khoảng | High | Functional |
| TC-BOOK-FUNC-04 | Bookings | Business | Tìm kiếm theo mã đặt vé | Có booking code "BK-20260101-001" | 1. Nhập "BK-2026" vào search | search: "BK-2026" | Hiển thị bookings có booking_code chứa "BK-2026" | High | Functional |
| TC-BOOK-FUNC-05 | Bookings | Business | Tìm kiếm theo tên khách hàng | Có booking của "Nguyễn Văn A" | 1. Nhập "Nguyễn" vào search | search: "Nguyễn" | Hiển thị bookings có customer.full_name chứa "Nguyễn" | High | Functional |
| TC-BOOK-FUNC-06 | Bookings | Business | Kết hợp filter + search | Có nhiều bookings | 1. Chọn status "Chờ xác nhận"<br>2. Nhập search "Nguyễn" | status: pending, search: "Nguyễn" | Chỉ hiển thị bookings pending của KH tên Nguyễn | Medium | Functional |
| TC-BOOK-FUNC-07 | Bookings | Business | Danh sách trống | Không có bookings | 1. Truy cập /bookings | - | Hiển thị "Chưa có đặt vé nào" | Medium | Functional |
| TC-BOOK-FUNC-08 | Bookings | Business | Status labels hiển thị đúng | Có bookings mỗi status | 1. Quan sát cột Trạng thái | - | pending→"Chờ xác nhận", confirmed→"Đã xác nhận", cancelled→"Đã hủy", completed→"Hoàn thành", refunded→"Đã hoàn tiền" với badge colors tương ứng | Medium | UI |

### 5.2 Functional Tests - Tạo đặt vé

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-FUNC-09 | Bookings | Business | Tạo đặt vé thành công với 1 hành khách | Có KH + Trip (scheduled) trong DB | 1. Click "Tạo đặt vé"<br>2. Chọn khách hàng<br>3. Chọn chuyến xe<br>4. Nhập tên HK, số ghế, giá vé<br>5. Click "Tạo đặt vé" | customer: "Nguyễn Văn A", trip: scheduled trip, passenger: "Trần B", seat: "A01", price: 200000 | 1. Toast: "Tạo đặt vé thành công! Mã đặt vé: BK-xxx"<br>2. Redirect về /bookings<br>3. Booking mới xuất hiện trong danh sách (status=pending)<br>4. total_amount = 200000, passenger_count = 1 | Critical | Functional |
| TC-BOOK-FUNC-10 | Bookings | Business | Tạo đặt vé với nhiều hành khách | Có KH + Trip | 1. Chọn KH + Trip<br>2. Nhập HK 1: "A", seat "A01", price 200000<br>3. Click "Thêm hành khách"<br>4. Nhập HK 2: "B", seat "A02", price 200000<br>5. Submit | 2 passengers | 1. Tạo thành công<br>2. total_amount = 400000<br>3. passenger_count = 2<br>4. 2 tickets được tạo với QR codes | Critical | Functional |
| TC-BOOK-FUNC-11 | Bookings | Business | Hiển thị ghế đã đặt khi chọn chuyến | Trip có tickets active/used | 1. Chọn chuyến xe đã có ghế đặt<br>2. Quan sát section "Ghế đã đặt" | Trip có seats A01, A02 đã book | Hiển thị: "Ghế đã đặt: A01, A02" (sorted) | High | Functional |
| TC-BOOK-FUNC-12 | Bookings | Business | Default price từ trip.price_override | Trip có price_override = 300000 | 1. Chọn trip có price_override<br>2. Click "Thêm hành khách" | trip.price_override: 300000 | Hành khách mới có price default = 300000 | Medium | Functional |
| TC-BOOK-FUNC-13 | Bookings | Business | Default price fallback 150000 | Trip không có price_override (null) | 1. Chọn trip không có price_override<br>2. Click "Thêm hành khách" | trip.price_override: null | Hành khách mới có price default = 150000 | Medium | Functional |
| TC-BOOK-FUNC-14 | Bookings | Business | Tổng tiền tính realtime | Form có 2 HK | 1. Nhập HK1 price = 200000<br>2. Nhập HK2 price = 300000<br>3. Quan sát "Tổng tiền" | - | Hiển thị "Tổng tiền: 500.000 ₫" (realtime update) | High | Functional |
| TC-BOOK-FUNC-15 | Bookings | Business | QR code được generate đúng format | Tạo booking thành công | 1. Tạo đặt vé<br>2. Xem chi tiết → click QR icon | booking_code: "BK-20260520-001", seat: "A01" | QR code value = "BK-20260520-001-A01" | High | Functional |
| TC-BOOK-FUNC-16 | Bookings | Business | Chỉ hiển thị trips scheduled/in_progress | Có trips nhiều status | 1. Mở form tạo đặt vé<br>2. Mở dropdown chuyến xe | trips: scheduled, in_progress, completed, cancelled | Dropdown chỉ hiển thị trips scheduled và in_progress | High | Functional |
| TC-BOOK-FUNC-17 | Bookings | Business | Xóa hành khách khỏi form | Form có 2+ HK | 1. Thêm 2 hành khách<br>2. Click icon Trash trên HK 2 | - | HK 2 bị xóa. Tổng tiền cập nhật. Chỉ còn HK 1. | Medium | Functional |
| TC-BOOK-FUNC-18 | Bookings | Business | Không thể xóa hành khách cuối cùng | Form có 1 HK | 1. Quan sát HK duy nhất | - | Không hiển thị icon Trash (canRemove = false khi fields.length = 1) | Medium | UI |

### 5.3 Functional Tests - Hủy đặt vé (Cancel Cascade)

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-FUNC-19 | Bookings | Business | Hủy đặt vé pending thành công | Booking status=pending, tickets active, payment pending | 1. Xem chi tiết booking pending<br>2. Click "Hủy đặt vé"<br>3. Confirm (window.confirm) | - | 1. Toast: "Đã hủy đặt vé"<br>2. Booking status → cancelled<br>3. Tickets (active) → cancelled<br>4. Payment (pending) → failed | Critical | Functional |
| TC-BOOK-FUNC-20 | Bookings | Business | Hủy đặt vé confirmed thành công | Booking status=confirmed, tickets active, payment completed | 1. Xem chi tiết booking confirmed<br>2. Click "Hủy đặt vé"<br>3. Confirm | - | 1. Booking → cancelled<br>2. Tickets (active) → cancelled<br>3. Payment (completed) → refunded (refunded_at set) | Critical | Functional |
| TC-BOOK-FUNC-21 | Bookings | Business | Không hiển thị nút Hủy cho booking cancelled | Booking status=cancelled | 1. Xem chi tiết booking cancelled | - | Không hiển thị button "Hủy đặt vé" (canCancel = false) | High | Functional |
| TC-BOOK-FUNC-22 | Bookings | Business | Không hiển thị nút Hủy cho booking completed | Booking status=completed | 1. Xem chi tiết booking completed | - | Không hiển thị button "Hủy đặt vé" | High | Functional |
| TC-BOOK-FUNC-23 | Bookings | Business | Ghế được giải phóng sau hủy | Booking cancelled, seat A01 | 1. Hủy booking có seat A01<br>2. Tạo booking mới cho cùng trip<br>3. Chọn seat A01 | seat: "A01" | Seat A01 không còn trong "Ghế đã đặt" (ticket cancelled không count). Có thể book lại. | High | Functional |

### 5.4 Functional Tests - Xóa đặt vé

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-FUNC-24 | Bookings | Business | Xóa đặt vé pending thành công | Booking pending, không có payment | 1. Xem chi tiết booking pending<br>2. Click "Xóa"<br>3. Confirm trong delete dialog | - | 1. Toast: "Đã xóa đặt vé"<br>2. Booking biến mất khỏi danh sách | High | Functional |
| TC-BOOK-FUNC-25 | Bookings | Business | Không hiển thị nút Xóa cho booking confirmed | Booking status=confirmed | 1. Xem chi tiết booking confirmed | - | Không hiển thị button "Xóa" (canDelete = false, chỉ pending) | High | Functional |
| TC-BOOK-FUNC-26 | Bookings | Business | Xóa booking có payment (FK violation) | Booking pending có payment record | 1. Xóa booking có payment | - | Toast error: "Không thể xóa đặt vé đã có thanh toán" | High | Functional |

### 5.5 Functional Tests - Xem chi tiết

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-FUNC-27 | Bookings | Business | Xem chi tiết đầy đủ | Booking có tickets + payment | 1. Click "Xem" trên booking row | - | Dialog hiển thị: Thông tin đặt vé (code, status, date, passenger_count), Khách hàng (name, phone), Chuyến xe (route, stations, departure, vehicle), Danh sách vé (table), Thanh toán (method, status, amount), Tổng tiền | Critical | Functional |
| TC-BOOK-FUNC-28 | Bookings | Business | Hiển thị seat map trong chi tiết | Trip có vehicle_type với seat_layout | 1. Xem chi tiết booking<br>2. Quan sát section "Sơ đồ ghế" | vehicle_type.seat_layout: valid JSON | Hiển thị SeatMap component với ghế đã đặt được highlight | Medium | Functional |
| TC-BOOK-FUNC-29 | Bookings | Business | Xem QR code của vé | Ticket có qr_code | 1. Xem chi tiết booking<br>2. Click icon QR trên ticket row | - | TicketQrDialog mở, hiển thị QR code + thông tin vé (passenger, seat, status) + trip info | Medium | Functional |
| TC-BOOK-FUNC-30 | Bookings | Business | Chi tiết - chưa có thanh toán | Booking không có payment | 1. Xem chi tiết booking chưa thanh toán | - | Section Thanh toán hiển thị: "Chưa có thanh toán" | Low | Functional |

### 5.6 Validation Tests - Form Tạo đặt vé

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-VAL-01 | Bookings | Business | Submit không chọn khách hàng | Form mở | 1. Không chọn KH<br>2. Chọn trip, nhập HK<br>3. Submit | customer_id: "" | Validation error: "Vui lòng chọn khách hàng" | Critical | Validation |
| TC-BOOK-VAL-02 | Bookings | Business | Submit không chọn chuyến xe | Form mở | 1. Chọn KH<br>2. Không chọn trip<br>3. Submit | trip_id: "" | Validation error: "Vui lòng chọn chuyến" | Critical | Validation |
| TC-BOOK-VAL-03 | Bookings | Business | Submit với tên hành khách trống | Form mở | 1. Chọn KH + Trip<br>2. Để trống tên HK<br>3. Submit | passenger_name: "" | Validation error: "Tên hành khách không được để trống" | Critical | Validation |
| TC-BOOK-VAL-04 | Bookings | Business | Submit với số ghế trống | Form mở | 1. Chọn KH + Trip<br>2. Nhập tên HK, để trống số ghế<br>3. Submit | seat_number: "" | Validation error: "Số ghế không được để trống" | Critical | Validation |
| TC-BOOK-VAL-05 | Bookings | Business | Submit với giá vé âm | Form mở | 1. Nhập price = -1<br>2. Submit | price: -1 | Validation error: "Giá vé phải lớn hơn hoặc bằng 0" | High | Validation |
| TC-BOOK-VAL-06 | Bookings | Business | Giá vé = 0 (boundary, hợp lệ) | Form mở | 1. Nhập price = 0<br>2. Submit | price: 0 | Validation pass (min 0 cho phép) | Medium | Boundary |
| TC-BOOK-VAL-07 | Bookings | Business | Tên hành khách chỉ có spaces | Form mở | 1. Nhập "   " vào tên HK<br>2. Submit | passenger_name: "   " | Validation error: "Tên hành khách không được để trống" (trim rồi check min 1) | High | Validation |
| TC-BOOK-VAL-08 | Bookings | Business | Số ghế chỉ có spaces | Form mở | 1. Nhập "   " vào số ghế<br>2. Submit | seat_number: "   " | Validation error: "Số ghế không được để trống" (trim rồi check min 1) | High | Validation |
| TC-BOOK-VAL-09 | Bookings | Business | Submit form không có hành khách nào | Form mở, xóa hết HK | 1. Xóa tất cả HK (nếu có thể)<br>2. Submit | tickets: [] | Validation error: "Phải có ít nhất một hành khách" | High | Validation |
| TC-BOOK-VAL-10 | Bookings | Business | Giá vé không phải số | Form mở | 1. Nhập "abc" vào price<br>2. Submit | price: NaN | Validation error về type (expected number) | Medium | Negative |

### 5.7 Negative Tests - Double Booking & Constraints

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-NEG-01 | Bookings | Business | Đặt ghế đã được book (double booking) | Seat A01 đã active trên trip X | 1. Tạo booking mới cho trip X<br>2. Nhập seat "A01"<br>3. Submit | seat: "A01" (đã tồn tại) | Toast error: "Ghế này trên chuyến đã được đặt". Compensating: booking đã tạo bị xóa. | Critical | Negative |
| TC-BOOK-NEG-02 | Bookings | Business | Race condition - 2 agents đặt cùng ghế | 2 sessions cùng lúc | 1. Agent A chọn seat B01<br>2. Agent B chọn seat B01<br>3. Agent A submit trước<br>4. Agent B submit sau | seat: "B01" cả 2 | Agent A thành công. Agent B nhận error: "Ghế này trên chuyến đã được đặt" (DB unique constraint catch) | Critical | Negative |
| TC-BOOK-NEG-03 | Bookings | Business | Đặt 2 ghế trùng nhau trong cùng 1 booking | Form có 2 HK | 1. HK1 seat = "A01"<br>2. HK2 seat = "A01"<br>3. Submit | 2 tickets cùng seat "A01" | Toast error: "Ghế này trên chuyến đã được đặt" (DB unique constraint trip_id + seat_number) | High | Negative |
| TC-BOOK-NEG-04 | Bookings | Business | Tạo booking cho trip cancelled | Trip status = cancelled (nếu bypass filter) | 1. Gọi API trực tiếp với trip_id cancelled | trip.status: "cancelled" | Booking vẫn tạo được (không có server-side validation cho trip status). Risk: business logic gap. | Medium | Negative |
| TC-BOOK-NEG-05 | Bookings | Business | Tạo booking cho trip đã qua (departure < now) | Trip scheduled nhưng departure_time đã qua | 1. Chọn trip có departure_time trong quá khứ (nếu hiển thị)<br>2. Submit | departure_time: yesterday | Booking tạo thành công (code không validate departure > now). Risk: potential bug. | Medium | Negative |

### 5.8 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-UI-01 | Bookings | Business | Form - No customers warning | DB không có customers | 1. Truy cập /bookings/new | - | 1. Hiển thị "Chưa có khách hàng nào. Vui lòng tạo khách hàng trước."<br>2. Button "Tạo đặt vé" disabled | High | UI |
| TC-BOOK-UI-02 | Bookings | Business | Form - No trips warning | DB không có trips scheduled/in_progress | 1. Truy cập /bookings/new | - | 1. Hiển thị "Chưa có chuyến xe nào. Vui lòng tạo chuyến xe trước."<br>2. Button "Tạo đặt vé" disabled | High | UI |
| TC-BOOK-UI-03 | Bookings | Business | Form - Truncated dropdown warning | > 1000 customers | 1. Mở form khi có > 1000 KH | - | Hiển thị warning: "Hiển thị X / Y khách hàng (hãy tìm kiếm cụ thể hơn)" | Medium | UI |
| TC-BOOK-UI-04 | Bookings | Business | Unsaved changes blocker | Form dirty (đã nhập data) | 1. Nhập data vào form<br>2. Click "Hủy" hoặc navigate away | - | Dialog: "Có thay đổi chưa lưu. Bạn có chắc muốn thoát?" với buttons "Hủy lại" / "Thoát" | High | UI |
| TC-BOOK-UI-05 | Bookings | Business | Unsaved changes - chọn "Hủy lại" | Blocker dialog hiển thị | 1. Trigger blocker<br>2. Click "Hủy lại" | - | Dialog đóng, user ở lại form, data giữ nguyên | Medium | UI |
| TC-BOOK-UI-06 | Bookings | Business | Unsaved changes - chọn "Thoát" | Blocker dialog hiển thị | 1. Trigger blocker<br>2. Click "Thoát" | - | Navigate away, data bị mất | Medium | UI |
| TC-BOOK-UI-07 | Bookings | Business | Không trigger blocker sau submit thành công | Form submitted | 1. Submit form thành công<br>2. Quan sát redirect | - | Redirect về /bookings KHÔNG hiển thị blocker dialog (form reset trước navigate) | High | UI |
| TC-BOOK-UI-08 | Bookings | Business | Form submitting state | Form đang submit | 1. Click "Tạo đặt vé"<br>2. Quan sát UI | - | 1. Button hiển thị Loader2 + disabled<br>2. Button "Hủy" disabled | High | UI |
| TC-BOOK-UI-09 | Bookings | Business | Detail dialog loading state | Click "Xem" | 1. Click "Xem" trên booking<br>2. Quan sát dialog | - | Hiển thị Loader2 spinner trong dialog trước khi data load xong | Medium | UI |
| TC-BOOK-UI-10 | Bookings | Business | Trip dropdown label format | Có trips | 1. Mở dropdown chuyến xe | - | Mỗi option hiển thị: "Tên tuyến (Trạm đi → Trạm đến) - DD/MM/YYYY HH:mm - Biển số" | Low | UI |

### 5.9 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-ERR-01 | Bookings | Business | Session expired khi tạo booking | Token hết hạn | 1. Để session expire<br>2. Submit form tạo booking | - | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-BOOK-ERR-02 | Bookings | Business | Network error khi submit | Mất kết nối | 1. Tắt network<br>2. Submit form | - | Toast error: "Thao tác thất bại. Vui lòng thử lại." Button trở lại enabled. | High | Error Handling |
| TC-BOOK-ERR-03 | Bookings | Business | Compensating transaction - ticket insert fail | Booking created, ticket fail | 1. Tạo booking với seat đã tồn tại (race condition) | - | 1. Ticket insert fail (23505)<br>2. Booking đã tạo bị DELETE (compensating)<br>3. Toast: "Ghế này trên chuyến đã được đặt" | Critical | Error Handling |
| TC-BOOK-ERR-04 | Bookings | Business | Compensating transaction fail (orphan booking) | Network fail sau ticket error | 1. Ticket insert fail<br>2. Delete booking cũng fail (network) | - | Orphan booking tồn tại trong DB không có tickets. Error message hiển thị cho user. | Medium | Error Handling |
| TC-BOOK-ERR-05 | Bookings | Business | Cancel cascade partial failure | Network fail giữa chừng cancel | 1. Cancel booking<br>2. Booking updated OK<br>3. Tickets update fail (network) | - | Error thrown. Booking đã cancelled nhưng tickets vẫn active (inconsistent state). Toast error hiển thị. | Medium | Error Handling |
| TC-BOOK-ERR-06 | Bookings | Business | Error khi load danh sách | API trả lỗi | 1. Trigger API error<br>2. Quan sát UI | - | Error card hiển thị với message + button "Thử lại" | High | Error Handling |

### 5.10 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-SEC-01 | Bookings | Business | Truy cập /bookings/new khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /bookings/new | - | Redirect về /login | Critical | Security |
| TC-BOOK-SEC-02 | Bookings | Business | XSS qua passenger_name | Form mở | 1. Nhập script tag vào tên HK<br>2. Submit<br>3. Xem chi tiết | passenger_name: `<script>alert(1)</script>` | Data lưu dạng text, hiển thị escaped trong detail dialog. Không execute. | High | Security |
| TC-BOOK-SEC-03 | Bookings | Business | XSS qua notes field | Form mở | 1. Nhập HTML vào notes<br>2. Submit | notes: `<img src=x onerror=alert(1)>` | Data lưu text, hiển thị escaped. | Medium | Security |
| TC-BOOK-SEC-04 | Bookings | Business | SQL Injection qua search | Trang /bookings | 1. Nhập SQL injection vào search | search: `'; DROP TABLE bookings; --` | Supabase parameterized query ngăn injection. Trả 0 results. | High | Security |
| TC-BOOK-SEC-05 | Bookings | Business | Manipulate price qua DevTools | Form mở | 1. Sửa price value qua DevTools thành -99999<br>2. Submit | price: -99999 (bypass client validation) | Zod validation vẫn catch (min 0). Nếu bypass Zod, DB check constraint catch. | Medium | Security |

### 5.11 Edge Case & Concurrency Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-EDGE-01 | Bookings | Business | Double-click "Tạo đặt vé" | Form valid | 1. Double-click nhanh button "Tạo đặt vé" | - | Chỉ 1 booking được tạo (button disabled khi isPending) | High | Functional |
| TC-BOOK-EDGE-02 | Bookings | Business | Đổi trip sau khi đã nhập seats | Form có data | 1. Chọn trip A, nhập seats<br>2. Đổi sang trip B | - | Booked seats cập nhật cho trip B. Seats đã nhập giữ nguyên (user phải tự kiểm tra). | Medium | Edge Case |
| TC-BOOK-EDGE-03 | Bookings | Business | Tạo booking với rất nhiều passengers | Form mở | 1. Thêm 50 hành khách<br>2. Submit | 50 tickets | Tạo thành công. total_amount = sum(50 prices). Performance acceptable. | Low | Performance |
| TC-BOOK-EDGE-04 | Bookings | Business | Price = 0 cho tất cả tickets | Form mở | 1. Set price = 0 cho tất cả HK<br>2. Submit | all prices: 0 | Tạo thành công. total_amount = 0. | Low | Boundary |
| TC-BOOK-EDGE-05 | Bookings | Business | Đổi trip nhanh liên tục | Form mở | 1. Chọn trip A<br>2. Ngay lập tức chọn trip B<br>3. Ngay lập tức chọn trip C | - | Booked seats hiển thị đúng cho trip C (trip cuối cùng được chọn). Không hiển thị seats của trip A/B. | Medium | Edge Case |
| TC-BOOK-EDGE-06 | Bookings | Business | Cancel booking đang được user khác xem | 2 sessions | 1. User A xem detail booking X<br>2. User B cancel booking X<br>3. User A thử cancel lại | - | User A có thể nhận error hoặc booking đã cancelled (idempotent update). | Low | Edge Case |
| TC-BOOK-EDGE-07 | Bookings | Business | Browser refresh trên /bookings/new với data | Form dirty | 1. Nhập data vào form<br>2. Refresh page (F5) | - | Browser native "Leave page?" prompt (hoặc data mất). Form reset về default. | Low | Edge Case |

### 5.12 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-RESP-01 | Bookings | Business | Form tạo đặt vé trên tablet | Viewport 768px | 1. Mở /bookings/new trên tablet | Viewport: 768x1024 | Layout 2 columns collapse hợp lý. Passenger rows vẫn usable. | Medium | Responsive |
| TC-BOOK-RESP-02 | Bookings | Business | Form tạo đặt vé trên mobile | Viewport 375px | 1. Mở /bookings/new trên mobile | Viewport: 375x667 | 1. Grid 5 cols của PassengerRow collapse<br>2. Tất cả fields accessible<br>3. Sticky footer visible | Medium | Responsive |
| TC-BOOK-RESP-03 | Bookings | Business | Detail dialog trên mobile | Viewport 375px | 1. Mở booking detail dialog | Viewport: 375x667 | Dialog full-width, content scrollable, tickets table horizontal scroll nếu cần | Medium | Responsive |

### 5.13 API Test Detail

#### Create Booking - Request Flow

```json
// Step 1: Insert Booking
POST /rest/v1/bookings
{
  "customer_id": "uuid-customer",
  "trip_id": "uuid-trip",
  "booking_date": "2026-05-20T10:00:00.000Z",
  "status": "pending",
  "total_amount": 400000,
  "passenger_count": 2,
  "notes": null
}

// Step 2: Insert Tickets
POST /rest/v1/tickets
[
  {
    "booking_id": "uuid-booking",
    "trip_id": "uuid-trip",
    "seat_number": "A01",
    "passenger_name": "Nguyễn Văn A",
    "passenger_phone": "0901234567",
    "price": 200000,
    "qr_code": "BK-20260520-001-A01"
  },
  {
    "booking_id": "uuid-booking",
    "trip_id": "uuid-trip",
    "seat_number": "A02",
    "passenger_name": "Trần Thị B",
    "price": 200000,
    "qr_code": "BK-20260520-001-A02"
  }
]
```

#### Cancel Booking - Request Flow

```json
// Step 1: Update booking
PATCH /rest/v1/bookings?id=eq.{id}
{ "status": "cancelled", "cancelled_at": "2026-05-20T15:00:00.000Z" }

// Step 2: Update tickets (active → cancelled)
PATCH /rest/v1/tickets?booking_id=eq.{id}&status=in.(active)
{ "status": "cancelled" }

// Step 3: Update payments (completed → refunded)
PATCH /rest/v1/payments?booking_id=eq.{id}&status=eq.completed
{ "status": "refunded", "refunded_at": "2026-05-20T15:00:00.000Z" }

// Step 4: Update payments (pending → failed)
PATCH /rest/v1/payments?booking_id=eq.{id}&status=eq.pending
{ "status": "failed" }
```

#### Error Response - Double Booking (23505)

```json
{
  "code": "23505",
  "details": "Key (trip_id, seat_number)=(uuid, A01) already exists.",
  "message": "duplicate key value violates unique constraint \"idx_tickets_no_double_booking\""
}
```

### 5.14 API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-BOOK-API-01 | Bookings | Business | GET /bookings - pagination | Auth valid | 1. GET /rest/v1/bookings?limit=10&offset=0 | - | Status 200, data array + count header | High | API |
| TC-BOOK-API-02 | Bookings | Business | GET /bookings - filter by status | Auth valid | 1. GET /rest/v1/bookings?status=eq.pending | - | Chỉ trả bookings pending | High | API |
| TC-BOOK-API-03 | Bookings | Business | GET /bookings - no auth | Không có token | 1. GET /rest/v1/bookings không auth | - | Status 401 | High | API |
| TC-BOOK-API-04 | Bookings | Business | POST /bookings - missing customer_id | Auth valid | 1. POST thiếu customer_id | - | Status 400/422 | High | API |
| TC-BOOK-API-05 | Bookings | Business | POST /tickets - duplicate seat | Auth valid, seat exists | 1. POST ticket với seat đã tồn tại trên trip | - | Status 409, code 23505, message chứa "idx_tickets_no_double_booking" | Critical | API |
| TC-BOOK-API-06 | Bookings | Business | DELETE /bookings - có payment FK | Auth valid | 1. DELETE booking có payment | - | Status 409, code 23503 | High | API |
| TC-BOOK-API-07 | Bookings | Business | PATCH /bookings - cancel | Auth valid | 1. PATCH status=cancelled | - | Status 200, cancelled_at set | High | API |
| TC-BOOK-API-08 | Bookings | Business | GET /tickets - booked seats | Auth valid | 1. GET /rest/v1/tickets?trip_id=eq.{id}&status=in.(active,used)&select=seat_number | - | Array of seat_number strings | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Validate seat_number phải match seat_layout | Code hiện tại cho nhập tự do. Cần confirm có cần validate với vehicle_type.seat_layout? |
| 2 | Max passengers per booking | Không có giới hạn trong code. Cần confirm business rule? |
| 3 | Booking cho trip đã qua departure_time | Code không validate. Cần confirm có nên block? |
| 4 | Edit booking (thay đổi seats/passengers) | Hiện không có feature edit. Cần confirm có trong roadmap? |
| 5 | Booking code format/generation logic | Auto-generated ở server. Cần confirm format cụ thể (BK-YYYYMMDD-NNN?) |
| 6 | Multiple bookings cùng customer cùng trip | Không có validation. Cần confirm: 1 KH có thể book nhiều lần cùng chuyến? |
| 7 | Cancel booking đã có tickets "used" | Code chỉ cancel tickets "active". Tickets "used" giữ nguyên. Cần confirm behavior? |
| 8 | Refund amount khi cancel | Payment refunded nhưng không có logic tính refund amount. Cần confirm? |

