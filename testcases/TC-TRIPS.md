# Test Cases: Feature Quản lý Chuyến đi (Trips Management)

## 1. Feature List Detected

- Danh sách chuyến đi với phân trang, lọc trạng thái, lọc tuyến đường, lọc date range
- Tạo chuyến đi mới (form page: chọn tuyến, chọn xe, thời gian, giá, ghi chú)
- Chỉnh sửa chuyến đi (form page, populate data, đổi trạng thái)
- Xóa chuyến đi (confirmation dialog, FK constraint check)
- Phân công nhân viên (staff assignment dialog + dedicated page)
- Dirty-state blocker (useBlocker) khi navigate away
- Status badge hiển thị (scheduled/in_progress/completed/cancelled)
- Lưu & Phân công (create mode: save rồi redirect sang staff assignment)
- Calendar view (fetchTripsByDateRange)

---

## 2. Feature Analysis

### Business Flow
1. User truy cập /trips → Danh sách chuyến đi (sắp xếp departure_time DESC)
2. Lọc: status, route, date range (from/to)
3. Tạo chuyến đi:
   a. Click "Thêm chuyến đi" → Navigate /trips/new
   b. Chọn tuyến đường (dropdown)
   c. Chọn xe (dropdown)
   d. Nhập giờ đi + giờ đến dự kiến
   e. Nhập giá vé tùy chỉnh (optional), ghi chú (optional)
   f. Click "Thêm" → Insert trip → Toast + redirect /trips
   g. Hoặc "Lưu & Phân công" → Insert → redirect /trips/:id/staff
4. Chỉnh sửa chuyến đi:
   a. Click menu "Chỉnh sửa" → Navigate /trips/:id/edit
   b. Form populated với data hiện tại
   c. Có thể đổi trạng thái (edit mode only)
   d. Submit → Update trip → Toast + redirect /trips
5. Xóa chuyến đi:
   a. Click menu "Xóa" → Confirmation dialog
   b. Confirm → Delete trip → Toast + Close
   c. Nếu có staff/bookings → Error (FK constraint)
6. Phân công nhân viên:
   a. Click menu "Phân công" → Staff assignment dialog/page
   b. Thêm driver (max 1) / assistant (nhiều)
   c. Conflict detection (overlapping trips)

### Actor / Role
- Admin, Manager, Dispatcher (theo SRS)
- Thực tế: Tất cả authenticated users

### Validation Rules (từ `trip-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| route_id | required, string, min 1 | "Vui lòng chọn tuyến đường" |
| vehicle_id | required, string, min 1 | "Vui lòng chọn xe" |
| departure_time | required, regex `^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$` | "Thời gian không hợp lệ" |
| estimated_arrival_time | required, regex, must be > departure_time | "Thời gian không hợp lệ" / "Thời gian đến phải sau thời gian đi" |
| status | enum (scheduled, in_progress, completed, cancelled) | default: 'scheduled' |
| price_override | optional, preprocess ''→null, coerce number, min 0 | "Giá không được âm" |
| notes | optional, max 500, ''→null | "Ghi chú không được quá 500 ký tự" |

### Error Messages (từ `mapTripError`)
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- `23503` (context='delete') → "Chuyến đi đã được phân công nhân viên hoặc có vé đặt, không thể xóa"
- `23503` (context='mutate') → "Tuyến đường hoặc xe không tồn tại hoặc đã bị xóa"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"
- `22007` → "Định dạng ngày giờ không hợp lệ"
- Default → "Đã xảy ra lỗi, vui lòng thử lại"

### Fetch Error Messages (từ `mapFetchError`)
- `PGRST116/406` → "Không tìm thấy chuyến đi."
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- Default → "Không thể tải chuyến đi. Vui lòng thử lại."

### Key Business Logic
- **Status lifecycle:** scheduled → in_progress → completed/cancelled
- **departure_time < estimated_arrival_time:** DB CHECK constraint + client validation (superRefine)
- **actual_arrival_time:** Always null on insert, set on completion, must be > departure_time
- **price_override:** Optional, numeric(12,2), >= 0. Null = dùng route.base_price
- **FK constraints:** route_id → routes (RESTRICT), vehicle_id → vehicles (RESTRICT)
- **Delete blocked:** Nếu có trip_staff hoặc bookings/tickets reference
- **Ordering:** List = departure_time DESC, Calendar = departure_time ASC
- **Date filter:** departure_time >= dateFrom 00:00:00 AND <= dateTo 23:59:59
- **FK_DROPDOWN_PAGE_SIZE:** 1000 (load routes + vehicles)
- **Truncation warning:** Hiển thị khi routes/vehicles count > loaded data length
- **Dirty-state blocker:** useBlocker khi isDirty && !isPending
- **Save & Assign:** Create mode only, redirect sang /trips/:id/staff sau khi tạo

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Không có chuyến đi nào"
- **List Error:** Error card + "Thử lại" button
- **Form Loading (edit):** Skeleton placeholders
- **Form Error (edit):** Error card + "Quay lại danh sách"
- **Form - No routes:** Dropdown empty message "Chưa có tuyến đường — tạo tuyến đường trước ở /routes"
- **Form - No vehicles:** Dropdown empty message "Chưa có xe — tạo xe trước ở /vehicles"
- **Form - Truncated dropdown:** Warning "Hiển thị X / Y tuyến đường/xe"
- **Form Submitting:** Buttons disabled + Loader2
- **Dirty-state dialog:** "Thoát mà không lưu?" + "Ở lại" / "Thoát"
- **Delete Dialog:** Route name + departure time + "Thao tác này không thể hoàn tác."

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Không validate xe đã có chuyến khác cùng thời gian (vehicle conflict) | Confirm: có cần check vehicle availability? |
| A2 | Status có thể đổi tự do (scheduled→cancelled, completed→scheduled) | Confirm: có state machine rules? |
| A3 | Không validate departure_time phải trong tương lai khi tạo mới | Confirm: có cần block tạo chuyến quá khứ? |
| A4 | price_override = null nghĩa là dùng route.base_price (logic ở booking) | Confirm: hiển thị giá nào trong list? |
| A5 | Xóa trip cascade xóa trip_staff (ON DELETE CASCADE) | Confirm: có cần warning về staff assignment? |
| A6 | Không có search text cho trips (chỉ filter) | Confirm: có cần search theo route name? |
| A7 | Calendar view (fetchTripsByDateRange) không có pagination | Confirm: performance concern khi nhiều trips? |
| A8 | Không validate route/vehicle phải active khi tạo trip | Confirm: có cần check is_active? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `trip-form-page.tsx:120-123` | useBlocker condition | Blocker không trigger nếu isPending=true (submit đang chạy). Nếu submit fail, isDirty vẫn true nhưng blocker đã bị bypass. | TC-TRIP-EDGE-05 |
| `trip-form-page.tsx:102-116` | hasInitializedRef | Nếu tripData thay đổi (background refetch), form không re-populate. Stale data risk. | TC-TRIP-EDGE-04 |
| `trip-form-schema.ts:29-38` | superRefine departure < arrival | Chỉ compare Date objects. Nếu timezone khác nhau, comparison có thể sai. | TC-TRIP-EDGE-06 |
| `trip.api.ts:34-35` | dateFrom/dateTo filter | Dùng string concatenation `${dateFrom}T00:00:00`. Nếu dateFrom format sai, query sẽ fail silently. | TC-TRIP-NEG-05 |
| `trip-form-page.tsx:166` | canSubmit check | Chỉ check routes.length > 0 && vehicles.length > 0. Nếu dropdown loading, canSubmit = false nhưng user có thể đã chọn. | TC-TRIP-UI-07 |
| `trip-form-schema.ts:76-89` | serializeToInsert | actual_arrival_time luôn null. Nếu edit trip completed, actual_arrival_time bị reset về null. | TC-TRIP-EDGE-07 |
| `trips-page.tsx:54` | routeFilter '__none__' sentinel | Nếu route có id = '__none__' (impossible UUID nhưng edge case), filter sẽ sai. | TC-TRIP-EDGE-08 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Lọc

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-FUNC-01 | Trips | Management | Hiển thị danh sách chuyến đi | Có trips trong DB | 1. Truy cập /trips | - | DataTable hiển thị columns: Tuyến đường (origin→dest), Xe (biển số), Giờ đi, Giờ đến dự kiến, Trạng thái, Giá vé, Actions. Sắp xếp departure_time DESC. | Critical | Functional |
| TC-TRIP-FUNC-02 | Trips | Management | Lọc theo trạng thái | Có trips nhiều status | 1. Chọn filter "Đã lên lịch" | status: scheduled | Chỉ hiển thị trips có status = scheduled | High | Functional |
| TC-TRIP-FUNC-03 | Trips | Management | Lọc theo tuyến đường | Có trips nhiều routes | 1. Chọn route "Hà Nội - Hải Phòng" | routeId: uuid | Chỉ hiển thị trips thuộc route đã chọn | High | Functional |
| TC-TRIP-FUNC-04 | Trips | Management | Lọc theo date range | Có trips nhiều ngày | 1. Chọn date range 01/05 - 15/05 | dateFrom: 2026-05-01, dateTo: 2026-05-15 | Chỉ hiển thị trips có departure_time trong khoảng | High | Functional |
| TC-TRIP-FUNC-05 | Trips | Management | Kết hợp nhiều filters | Có nhiều trips | 1. Chọn status "Đang chạy"<br>2. Chọn route<br>3. Chọn date range | Multiple filters | Chỉ hiển thị trips thỏa tất cả điều kiện | High | Functional |
| TC-TRIP-FUNC-06 | Trips | Management | Filter "Tất cả" trạng thái | Đang filter scheduled | 1. Chọn "Tất cả" | status: undefined | Hiển thị tất cả trips (không filter status) | Medium | Functional |
| TC-TRIP-FUNC-07 | Trips | Management | Filter "Tất cả tuyến đường" | Đang filter route | 1. Chọn "Tất cả tuyến đường" | routeId: undefined (__none__) | Hiển thị trips tất cả routes | Medium | Functional |
| TC-TRIP-FUNC-08 | Trips | Management | Danh sách trống | Không có trips | 1. Truy cập /trips | - | Hiển thị "Không có chuyến đi nào" | Medium | Functional |
| TC-TRIP-FUNC-09 | Trips | Management | Phân trang | Có > 10 trips | 1. Quan sát pagination<br>2. Click page 2 | - | Page 1: 10 items. Page 2: items tiếp theo. | High | Functional |
| TC-TRIP-FUNC-10 | Trips | Management | Filter reset pagination | Đang ở page 2 | 1. Đổi status filter | - | Page reset về 1 | High | Functional |
| TC-TRIP-FUNC-11 | Trips | Management | Status badge hiển thị đúng | Có trips mỗi status | 1. Quan sát cột Trạng thái | - | scheduled→"Đã lên lịch" (default), in_progress→"Đang chạy" (amber), completed→"Hoàn thành" (green), cancelled→"Đã hủy" (destructive) | Medium | UI |
| TC-TRIP-FUNC-12 | Trips | Management | Price override hiển thị | Trip có price_override | 1. Quan sát cột Giá vé | price_override: 250000 | Hiển thị "250.000 đ" (vi-VN locale) | Medium | Functional |
| TC-TRIP-FUNC-13 | Trips | Management | Price null hiển thị | Trip không có price_override | 1. Quan sát cột Giá vé | price_override: null | Hiển thị "—" | Medium | Functional |
| TC-TRIP-FUNC-14 | Trips | Management | Route name cell format | Trip có route data | 1. Quan sát cột Tuyến đường | - | Hiển thị "Trạm đi → Trạm đến" (origin_station.name → destination_station.name) | Medium | Functional |
| TC-TRIP-FUNC-15 | Trips | Management | Truncation warning cho routes | > 1000 routes | 1. Quan sát filter area | routesCount > routes.length | Warning: "Cảnh báo: Chỉ hiển thị X/Y tuyến đường" | Low | UI |

### 5.2 Functional Tests - Tạo chuyến đi

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-FUNC-16 | Trips | Management | Tạo chuyến đi thành công | Có routes + vehicles | 1. Click "Thêm chuyến đi"<br>2. Chọn tuyến đường<br>3. Chọn xe<br>4. Nhập giờ đi: 2026-05-25T08:00<br>5. Nhập giờ đến: 2026-05-25T12:00<br>6. Click "Thêm" | Full valid data | 1. Toast: "Đã tạo chuyến đi"<br>2. Redirect về /trips<br>3. Trip mới xuất hiện (status=scheduled) | Critical | Functional |
| TC-TRIP-FUNC-17 | Trips | Management | Tạo chuyến đi với giá tùy chỉnh | Có routes + vehicles | 1. Điền form<br>2. Nhập price_override: 300000<br>3. Submit | price_override: 300000 | Tạo thành công, giá vé hiển thị "300.000 đ" | High | Functional |
| TC-TRIP-FUNC-18 | Trips | Management | Tạo chuyến đi với ghi chú | Form valid | 1. Điền form<br>2. Nhập notes: "Chuyến tăng cường"<br>3. Submit | notes: "Chuyến tăng cường" | Tạo thành công, notes lưu DB | Medium | Functional |
| TC-TRIP-FUNC-19 | Trips | Management | Lưu & Phân công (create mode) | Form valid | 1. Điền form<br>2. Click "Lưu & Phân công" | - | 1. Toast: "Đã tạo chuyến đi"<br>2. Redirect sang /trips/:id/staff (staff assignment page) | Critical | Functional |
| TC-TRIP-FUNC-20 | Trips | Management | Page title create mode | Navigate /trips/new | 1. Truy cập /trips/new | - | Title: "Thêm chuyến đi mới", Buttons: "Hủy" + "Lưu & Phân công" + "Thêm" | Medium | UI |
| TC-TRIP-FUNC-21 | Trips | Management | Form - No routes warning | Không có routes | 1. Truy cập /trips/new | routes: [] | Dropdown hiển thị "Chưa có tuyến đường — tạo tuyến đường trước ở /routes". Submit disabled. | High | Functional |
| TC-TRIP-FUNC-22 | Trips | Management | Form - No vehicles warning | Không có vehicles | 1. Truy cập /trips/new | vehicles: [] | Dropdown hiển thị "Chưa có xe — tạo xe trước ở /vehicles". Submit disabled. | High | Functional |
| TC-TRIP-FUNC-23 | Trips | Management | Status field ẩn ở create mode | Navigate /trips/new | 1. Quan sát form | - | Không hiển thị field "Trạng thái" (chỉ edit mode) | Medium | Functional |

### 5.3 Functional Tests - Chỉnh sửa chuyến đi

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-FUNC-24 | Trips | Management | Chỉnh sửa chuyến đi thành công | Có trip scheduled | 1. Click menu → "Chỉnh sửa"<br>2. Sửa giờ đi<br>3. Click "Lưu" | departure_time: new value | 1. Toast: "Đã cập nhật chuyến đi"<br>2. Redirect về /trips<br>3. Data cập nhật | Critical | Functional |
| TC-TRIP-FUNC-25 | Trips | Management | Form populated khi edit | Trip có đầy đủ data | 1. Click "Chỉnh sửa" | - | Form hiển thị: route_id, vehicle_id, departure_time, estimated_arrival_time, status, price_override, notes đúng giá trị | Critical | Functional |
| TC-TRIP-FUNC-26 | Trips | Management | Đổi trạng thái (edit mode) | Trip scheduled | 1. Edit trip<br>2. Đổi status → "Đang chạy"<br>3. Lưu | status: in_progress | Trip cập nhật status = in_progress, badge đổi | High | Functional |
| TC-TRIP-FUNC-27 | Trips | Management | Page title edit mode | Navigate /trips/:id/edit | 1. Truy cập edit page | - | Title: "Chỉnh sửa chuyến đi", Button: "Lưu" (không có "Lưu & Phân công") | Medium | UI |
| TC-TRIP-FUNC-28 | Trips | Management | Edit trip không tồn tại | ID invalid | 1. Truy cập /trips/invalid-uuid/edit | - | Error card: "Không tìm thấy chuyến đi." + "Quay lại danh sách" | High | Functional |
| TC-TRIP-FUNC-29 | Trips | Management | Null fields hiển thị empty | Trip có price=null, notes=null | 1. Edit trip | price_override: null, notes: null | Form: price = empty, notes = empty | Medium | Functional |

### 5.4 Functional Tests - Xóa chuyến đi

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-FUNC-30 | Trips | Management | Xóa chuyến đi thành công | Trip không có staff/bookings | 1. Click menu → "Xóa"<br>2. Confirm dialog<br>3. Click "Xóa" | - | 1. Toast: "Xóa chuyến đi thành công"<br>2. Dialog đóng<br>3. Trip biến mất khỏi danh sách | Critical | Functional |
| TC-TRIP-FUNC-31 | Trips | Management | Confirmation dialog hiển thị đúng | Click xóa | 1. Click "Xóa" trên trip | - | Dialog: "Xác nhận xóa" + "Bạn có chắc chắn muốn xóa chuyến đi **Route Name (DD/MM/YYYY HH:mm)**? Thao tác này không thể hoàn tác." | High | Functional |
| TC-TRIP-FUNC-32 | Trips | Management | Hủy xóa | Confirm dialog mở | 1. Click "Hủy" | - | Dialog đóng, trip vẫn tồn tại | High | Functional |
| TC-TRIP-FUNC-33 | Trips | Management | Xóa trip có staff assigned (FK) | Trip có trip_staff records | 1. Click "Xóa"<br>2. Confirm | - | Xóa thành công (trip_staff CASCADE delete) HOẶC Toast error nếu có bookings | High | Functional |
| TC-TRIP-FUNC-34 | Trips | Management | Xóa trip có bookings (FK) | Trip có bookings/tickets | 1. Click "Xóa"<br>2. Confirm | - | Toast error: "Chuyến đi đã được phân công nhân viên hoặc có vé đặt, không thể xóa" | Critical | Functional |

### 5.5 Functional Tests - Dirty State & Navigation

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-FUNC-35 | Trips | Management | Dirty-state blocker khi navigate away | Form dirty | 1. Nhập data vào form<br>2. Click "Hủy" hoặc Back | - | Dialog: "Thoát mà không lưu?" + "Bạn có dữ liệu chưa lưu. Thoát không?" + "Ở lại" / "Thoát" | High | Functional |
| TC-TRIP-FUNC-36 | Trips | Management | Chọn "Ở lại" trong blocker | Blocker dialog hiển thị | 1. Trigger blocker<br>2. Click "Ở lại" | - | Dialog đóng, user ở lại form, data giữ nguyên | High | Functional |
| TC-TRIP-FUNC-37 | Trips | Management | Chọn "Thoát" trong blocker | Blocker dialog hiển thị | 1. Trigger blocker<br>2. Click "Thoát" | - | Navigate away, data mất | High | Functional |
| TC-TRIP-FUNC-38 | Trips | Management | Không trigger blocker sau submit | Form submitted thành công | 1. Submit form<br>2. Quan sát redirect | - | Redirect về /trips KHÔNG hiển thị blocker (form reset trước navigate) | High | Functional |
| TC-TRIP-FUNC-39 | Trips | Management | Không trigger blocker khi form clean | Form chưa thay đổi | 1. Mở form (không edit)<br>2. Click "Hủy" | - | Navigate away ngay, không có blocker | Medium | Functional |

### 5.6 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-VAL-01 | Trips | Management | Submit không chọn tuyến đường | Form mở | 1. Không chọn route<br>2. Submit | route_id: "" | Validation error: "Vui lòng chọn tuyến đường" | Critical | Validation |
| TC-TRIP-VAL-02 | Trips | Management | Submit không chọn xe | Form mở | 1. Không chọn vehicle<br>2. Submit | vehicle_id: "" | Validation error: "Vui lòng chọn xe" | Critical | Validation |
| TC-TRIP-VAL-03 | Trips | Management | Submit không nhập giờ đi | Form mở | 1. Để trống departure_time<br>2. Submit | departure_time: "" | Validation error: "Thời gian không hợp lệ" | Critical | Validation |
| TC-TRIP-VAL-04 | Trips | Management | Submit không nhập giờ đến | Form mở | 1. Để trống estimated_arrival_time<br>2. Submit | estimated_arrival_time: "" | Validation error: "Thời gian không hợp lệ" | Critical | Validation |
| TC-TRIP-VAL-05 | Trips | Management | Giờ đến trước giờ đi | Form mở | 1. Nhập departure: 2026-05-25T12:00<br>2. Nhập arrival: 2026-05-25T08:00<br>3. Submit | arrival < departure | Validation error: "Thời gian đến phải sau thời gian đi" | Critical | Validation |
| TC-TRIP-VAL-06 | Trips | Management | Giờ đến bằng giờ đi | Form mở | 1. Nhập cùng thời gian cho cả 2<br>2. Submit | departure == arrival | Validation error: "Thời gian đến phải sau thời gian đi" (>= check) | High | Validation |
| TC-TRIP-VAL-07 | Trips | Management | Giá vé âm | Form mở | 1. Nhập price_override: -1<br>2. Submit | price_override: -1 | Validation error: "Giá không được âm" | High | Validation |
| TC-TRIP-VAL-08 | Trips | Management | Giá vé = 0 (boundary, valid) | Form mở | 1. Nhập price_override: 0<br>2. Submit | price_override: 0 | Validation pass (min 0 inclusive) | Medium | Boundary |
| TC-TRIP-VAL-09 | Trips | Management | Ghi chú quá 500 ký tự | Form mở | 1. Nhập notes 501 chars<br>2. Submit | notes: 501 chars | Validation error: "Ghi chú không được quá 500 ký tự" | High | Validation |
| TC-TRIP-VAL-10 | Trips | Management | Ghi chú đúng 500 ký tự (boundary) | Form mở | 1. Nhập notes 500 chars<br>2. Submit | notes: 500 chars | Validation pass | Medium | Boundary |
| TC-TRIP-VAL-11 | Trips | Management | Giá vé rỗng (optional, valid) | Form mở | 1. Để trống price_override<br>2. Submit | price_override: "" | Validation pass (preprocess ''→null) | High | Validation |
| TC-TRIP-VAL-12 | Trips | Management | Ghi chú rỗng (optional, valid) | Form mở | 1. Để trống notes<br>2. Submit | notes: "" | Validation pass (transform ''→null) | Medium | Validation |
| TC-TRIP-VAL-13 | Trips | Management | Thời gian format sai | Form mở | 1. Nhập "abc" vào departure_time<br>2. Submit | departure_time: "abc" | Validation error: "Thời gian không hợp lệ" (regex fail) | High | Validation |
| TC-TRIP-VAL-14 | Trips | Management | Giá vé không phải số | Form mở | 1. Nhập "abc" vào price<br>2. Submit | price_override: "abc" | Validation error (coerce number fail) | Medium | Validation |

### 5.7 Negative Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-NEG-01 | Trips | Management | Tạo trip với route đã bị xóa | Route bị xóa sau load dropdown | 1. Chọn route<br>2. Route bị xóa ở DB<br>3. Submit | route_id: deleted UUID | Toast error: "Tuyến đường hoặc xe không tồn tại hoặc đã bị xóa" (23503) | High | Negative |
| TC-TRIP-NEG-02 | Trips | Management | Tạo trip với vehicle đã bị xóa | Vehicle bị xóa | 1. Chọn vehicle<br>2. Vehicle bị xóa<br>3. Submit | vehicle_id: deleted UUID | Toast error: "Tuyến đường hoặc xe không tồn tại hoặc đã bị xóa" (23503) | High | Negative |
| TC-TRIP-NEG-03 | Trips | Management | Truy cập edit trip không tồn tại | Trip ID invalid | 1. Truy cập /trips/nonexistent-uuid/edit | - | Error: "Không tìm thấy chuyến đi." + "Quay lại danh sách" | High | Negative |
| TC-TRIP-NEG-04 | Trips | Management | DB check constraint violation | departure >= arrival (bypass client) | 1. Gọi API trực tiếp với departure > arrival | departure > arrival | Error 23514: "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)" | Medium | Negative |
| TC-TRIP-NEG-05 | Trips | Management | Invalid date format qua API | Bypass client validation | 1. Gọi API với departure_time: "not-a-date" | - | Error 22007: "Định dạng ngày giờ không hợp lệ" | Medium | Negative |

### 5.8 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-UI-01 | Trips | Management | Loading skeleton (edit mode) | Truy cập edit page | 1. Truy cập /trips/:id/edit<br>2. Quan sát trước data load | - | Skeleton placeholders hiển thị cho route, vehicle, time fields | High | UI |
| TC-TRIP-UI-02 | Trips | Management | Form submitting state | Form đang submit | 1. Click "Thêm"/"Lưu"<br>2. Quan sát UI | - | 1. Buttons hiển thị Loader2 + disabled<br>2. "Hủy" disabled | High | UI |
| TC-TRIP-UI-03 | Trips | Management | Delete pending state | Đang xóa | 1. Click "Xóa" trong confirm<br>2. Quan sát | - | Button "Xóa" Loader2 + disabled, "Hủy" disabled, dialog không đóng được | High | UI |
| TC-TRIP-UI-04 | Trips | Management | Error state list page | API error | 1. Trigger API error | - | Error card: AlertCircle + error message + "Thử lại" (RefreshCw) | High | UI |
| TC-TRIP-UI-05 | Trips | Management | Retry button hoạt động | Error state | 1. Click "Thử lại" | - | refetch() gọi, data reload | High | UI |
| TC-TRIP-UI-06 | Trips | Management | Routes loading state trong form | Routes đang load | 1. Mở form, routes chưa load | - | Hiển thị Loader2 + "Đang tải tuyến đường…" thay vì dropdown | Medium | UI |
| TC-TRIP-UI-07 | Trips | Management | canSubmit disabled khi chưa chọn | Form mở, chưa chọn route/vehicle | 1. Quan sát buttons | - | Buttons "Thêm" + "Lưu & Phân công" disabled (canSubmit = false) | High | UI |
| TC-TRIP-UI-08 | Trips | Management | Dropdown menu actions | Trang loaded | 1. Click MoreHorizontal trên row | - | Menu: "Phân công" (Users) + "Chỉnh sửa" (Pencil) + separator + "Xóa" (Trash2, destructive) | Medium | UI |
| TC-TRIP-UI-09 | Trips | Management | Page header | Trang loaded | 1. Quan sát header | - | Title: "Quản lý chuyến đi", Subtitle: "Quản lý danh sách chuyến đi theo lịch trình", Button: "Thêm chuyến đi" | Low | UI |
| TC-TRIP-UI-10 | Trips | Management | Back button trong form | Form page | 1. Click ArrowLeft | - | Navigate về /trips (trigger blocker nếu dirty) | Medium | UI |
| TC-TRIP-UI-11 | Trips | Management | Truncation warning vehicles | > 1000 vehicles | 1. Quan sát form | vehiclesCount > vehicles.length | Warning: "Hiển thị X / Y xe. Liên hệ quản trị viên nếu không thấy xe cần chọn." | Low | UI |

### 5.9 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-ERR-01 | Trips | Management | Session expired khi tạo | Token hết hạn | 1. Để session expire<br>2. Submit form | - | Toast error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-TRIP-ERR-02 | Trips | Management | Session expired khi xóa | Token hết hạn | 1. Để session expire<br>2. Confirm xóa | - | Toast error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-TRIP-ERR-03 | Trips | Management | Network error khi tạo | Mất kết nối | 1. Tắt network<br>2. Submit form | - | Toast error: "Đã xảy ra lỗi, vui lòng thử lại" | High | Error Handling |
| TC-TRIP-ERR-04 | Trips | Management | Network error khi load list | Mất kết nối | 1. Tắt network<br>2. Truy cập /trips | - | Error card + "Thử lại" button | High | Error Handling |
| TC-TRIP-ERR-05 | Trips | Management | Session expired khi load edit | Token hết hạn | 1. Truy cập /trips/:id/edit | - | Error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." + "Quay lại danh sách" | High | Error Handling |
| TC-TRIP-ERR-06 | Trips | Management | FK violation khi xóa (bookings) | Trip có bookings | 1. Xóa trip có bookings<br>2. Confirm | - | Toast error: "Chuyến đi đã được phân công nhân viên hoặc có vé đặt, không thể xóa" | Critical | Error Handling |

### 5.10 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-SEC-01 | Trips | Management | Truy cập /trips khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /trips | - | Redirect về /login | Critical | Security |
| TC-TRIP-SEC-02 | Trips | Management | Truy cập /trips/new khi chưa login | Chưa đăng nhập | 1. Truy cập /trips/new | - | Redirect về /login | Critical | Security |
| TC-TRIP-SEC-03 | Trips | Management | XSS qua notes field | Form mở | 1. Nhập `<script>alert(1)</script>` vào notes<br>2. Submit | notes: script tag | Data lưu text, hiển thị escaped. Không execute. | High | Security |
| TC-TRIP-SEC-04 | Trips | Management | API call không có auth | Token bị xóa | 1. Gọi API trực tiếp không auth | - | Status 401 | High | Security |
| TC-TRIP-SEC-05 | Trips | Management | Manipulate trip ID trong URL | Authenticated | 1. Đổi :id trong /trips/:id/edit thành trip khác | - | Tùy RLS: load thành công hoặc error 403 | Medium | Security |

### 5.11 Edge Case & Concurrency Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-EDGE-01 | Trips | Management | Double-click submit | Form valid | 1. Double-click "Thêm" nhanh | - | Chỉ 1 trip tạo (buttons disabled khi isPending) | High | Edge Case |
| TC-TRIP-EDGE-02 | Trips | Management | 2 users edit cùng trip | 2 sessions | 1. User A edit trip X<br>2. User B edit trip X<br>3. User A save<br>4. User B save | - | Last-write-wins. User B overwrite User A. | Medium | Concurrency |
| TC-TRIP-EDGE-03 | Trips | Management | Edit trip đã bị xóa | Trip deleted by another user | 1. User A mở edit<br>2. User B xóa trip<br>3. User A submit | - | Error: trip không tồn tại (PGRST116 hoặc 404) | Medium | Concurrency |
| TC-TRIP-EDGE-04 | Trips | Management | Background refetch không ghi đè form | TanStack Query refetch | 1. Mở edit form (init)<br>2. Sửa data<br>3. Background refetch | - | Form giữ nguyên edits (hasInitializedRef = true) | High | Edge Case |
| TC-TRIP-EDGE-05 | Trips | Management | Blocker bypass khi isPending | Submit đang chạy | 1. Submit form (pending)<br>2. Thử navigate away | - | Blocker KHÔNG trigger (isDirty && !isPending → false). Navigate blocked by pending state. | Medium | Edge Case |
| TC-TRIP-EDGE-06 | Trips | Management | Timezone edge case | User ở timezone khác | 1. Nhập departure 23:00 ngày 25/05<br>2. Nhập arrival 01:00 ngày 26/05<br>3. Submit | Cross-midnight times | Tạo thành công (Date comparison handles cross-day correctly) | Medium | Edge Case |
| TC-TRIP-EDGE-07 | Trips | Management | Edit trip completed - actual_arrival_time | Trip completed có actual_arrival_time | 1. Edit trip completed<br>2. Lưu | - | actual_arrival_time bị reset về null (serializeToInsert luôn set null). Risk: data loss. | Low | Edge Case |
| TC-TRIP-EDGE-08 | Trips | Management | Tạo trip với departure trong quá khứ | Form mở | 1. Nhập departure_time = yesterday<br>2. Submit | departure: past date | Tạo thành công (không có validation departure > now). Risk: business logic gap. | Medium | Edge Case |

### 5.12 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-RESP-01 | Trips | Management | Danh sách trên tablet | Viewport 768px | 1. Mở /trips trên tablet | Viewport: 768x1024 | DataTable responsive, filters wrap (flex-wrap). Columns accessible. | Medium | Responsive |
| TC-TRIP-RESP-02 | Trips | Management | Danh sách trên mobile | Viewport 375px | 1. Mở /trips trên mobile | Viewport: 375x667 | Filters stack, table horizontal scroll, actions menu accessible | Medium | Responsive |
| TC-TRIP-RESP-03 | Trips | Management | Form trên mobile | Viewport 375px | 1. Mở /trips/new trên mobile | Viewport: 375x667 | Grid 2 cols (lg:grid-cols-2) collapse thành 1 col. All fields accessible. Sticky footer visible. | Medium | Responsive |

### 5.13 API Test Detail

#### Create Trip - Request

```json
POST /rest/v1/trips?select=*,route:routes(id,name,origin_station:stations!routes_origin_station_fk(id,name),destination_station:stations!routes_destination_station_fk(id,name)),vehicle:vehicles(id,license_plate)
{
  "route_id": "uuid-route",
  "vehicle_id": "uuid-vehicle",
  "departure_time": "2026-05-25T01:00:00.000Z",
  "estimated_arrival_time": "2026-05-25T05:00:00.000Z",
  "actual_arrival_time": null,
  "status": "scheduled",
  "price_override": 300000,
  "notes": "Chuyến tăng cường cuối tuần"
}
```

#### Update Trip - Request

```json
PATCH /rest/v1/trips?id=eq.{id}&select=*,route:routes(...),vehicle:vehicles(...)
{
  "status": "in_progress",
  "departure_time": "2026-05-25T01:30:00.000Z"
}
```

#### Delete Trip - Request

```
DELETE /rest/v1/trips?id=eq.{id}
```

#### Fetch Trips - Request (with filters)

```
GET /rest/v1/trips?select=*,route:routes(...),vehicle:vehicles(...)&order=departure_time.desc&limit=10&offset=0&status=eq.scheduled&route_id=eq.{uuid}&departure_time=gte.2026-05-01T00:00:00&departure_time=lte.2026-05-15T23:59:59
```

#### Error Response - FK Violation on Delete (23503)

```json
{
  "code": "23503",
  "details": "Key (id)=(uuid) is still referenced from table \"bookings\".",
  "message": "update or delete on table \"trips\" violates foreign key constraint \"bookings_trip_id_fkey\" on table \"bookings\""
}
```

#### Error Response - Check Constraint (23514)

```json
{
  "code": "23514",
  "details": "Failing row contains (uuid, uuid, uuid, 2026-05-25 12:00:00+00, 2026-05-25 08:00:00+00, ...)",
  "message": "new row for relation \"trips\" violates check constraint \"trips_departure_before_arrival\""
}
```

### 5.14 API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-TRIP-API-01 | Trips | Management | GET /trips - pagination | Auth valid | 1. GET /rest/v1/trips?limit=10&offset=0&order=departure_time.desc | - | Status 200, data array + count header | High | API |
| TC-TRIP-API-02 | Trips | Management | GET /trips - filter by status | Auth valid | 1. GET /rest/v1/trips?status=eq.scheduled | - | Chỉ trả trips scheduled | High | API |
| TC-TRIP-API-03 | Trips | Management | GET /trips - filter by route | Auth valid | 1. GET /rest/v1/trips?route_id=eq.{uuid} | - | Chỉ trả trips của route đó | High | API |
| TC-TRIP-API-04 | Trips | Management | GET /trips - filter by date range | Auth valid | 1. GET với departure_time gte/lte | - | Chỉ trả trips trong khoảng | High | API |
| TC-TRIP-API-05 | Trips | Management | GET /trips - no auth | Không có token | 1. GET /rest/v1/trips không auth | - | Status 401 | High | API |
| TC-TRIP-API-06 | Trips | Management | POST /trips - valid data | Auth valid | 1. POST với full valid data | - | Status 201, trip object with route/vehicle joined | High | API |
| TC-TRIP-API-07 | Trips | Management | POST /trips - missing route_id | Auth valid | 1. POST thiếu route_id | - | Status 400/422 | High | API |
| TC-TRIP-API-08 | Trips | Management | POST /trips - invalid FK | Auth valid | 1. POST với route_id không tồn tại | - | Status 409, code 23503 | High | API |
| TC-TRIP-API-09 | Trips | Management | POST /trips - departure >= arrival | Auth valid | 1. POST với departure > arrival | - | Status 400, code 23514 | Critical | API |
| TC-TRIP-API-10 | Trips | Management | PATCH /trips - update status | Auth valid | 1. PATCH status=in_progress | - | Status 200, updated trip | High | API |
| TC-TRIP-API-11 | Trips | Management | DELETE /trips - success | Auth valid, no refs | 1. DELETE trip không có bookings | - | Status 200/204 | High | API |
| TC-TRIP-API-12 | Trips | Management | DELETE /trips - FK constraint | Auth valid, has bookings | 1. DELETE trip có bookings | - | Status 409, code 23503 | Critical | API |
| TC-TRIP-API-13 | Trips | Management | GET /trips/:id - single | Auth valid | 1. GET single trip by id | - | Status 200, trip with route/vehicle details | Medium | API |
| TC-TRIP-API-14 | Trips | Management | GET /trips/:id - not found | Auth valid | 1. GET với id không tồn tại | - | Status 406 (PGRST116) | Medium | API |
| TC-TRIP-API-15 | Trips | Management | POST /trips - invalid datetime | Auth valid | 1. POST với departure_time: "invalid" | - | Status 400, code 22007 | Medium | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Vehicle conflict detection (cùng xe, cùng thời gian) | Code không validate. Cần confirm: có cần check vehicle availability? |
| 2 | Status transition rules (state machine) | Code cho phép đổi tự do. Cần confirm: có business rules cho transitions? |
| 3 | Departure time phải trong tương lai khi tạo mới | Code không validate. Cần confirm: có cần block tạo chuyến quá khứ? |
| 4 | actual_arrival_time bị reset khi edit trip completed | serializeToInsert luôn set null. Cần confirm: bug hay intentional? |
| 5 | Route/Vehicle phải active khi tạo trip | Code không check is_active. Cần confirm: business rule? |
| 6 | Max trips per vehicle per day | Không có giới hạn. Cần confirm: có business constraint? |
| 7 | Staff assignment cascade khi xóa trip | trip_staff ON DELETE CASCADE. Cần confirm: có cần warning? |
| 8 | Calendar view performance (no pagination) | fetchTripsByDateRange không paginate. Cần confirm: acceptable khi nhiều trips? |
