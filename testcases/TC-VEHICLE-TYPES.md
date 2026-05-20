# Test Cases: FR-08 - Quản lý loại xe (Vehicle Types Management)

## 1. Feature List Detected

- Danh sách loại xe với phân trang, tìm kiếm theo tên
- Thêm loại xe mới (dialog form với seat layout editor)
- Chỉnh sửa loại xe (dialog form pre-filled)
- Xóa loại xe (dialog xác nhận)
- Sơ đồ chỗ ngồi (multi-floor, rows × seats_per_row)
- Seat grid preview (visual preview với aisle gap)
- Tiện nghi (amenities) dạng comma-separated string → array
- Tính tổng ghế realtime (derived từ floors config)

---

## 2. Feature Analysis

### Business Flow
1. Fleet Manager truy cập /vehicle-types → Danh sách loại xe
2. Tìm kiếm: search by name (ilike), debounce 400ms
3. Thêm loại xe:
   a. Click "Thêm loại xe" → Dialog form mở
   b. Nhập tên (required), mô tả (optional), tiện nghi (comma-separated)
   c. Cấu hình sơ đồ ghế: 1-3 tầng, mỗi tầng có rows × seats_per_row
   d. Preview seat grid realtime
   e. Submit → Serialize floors → seat_layout JSON + total_floors + total_seats
4. Chỉnh sửa: Dialog pre-filled, parse seat_layout JSON → floors array
5. Xóa: Dialog xác nhận → Delete (FK constraint nếu có vehicles dùng)

### Actor / Role
- Fleet Manager, Admin (theo SRS)
- Thực tế: Tất cả authenticated users

### Validation Rules (từ `vehicle-type-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| name | required, min 1 | "Tên loại xe không được để trống" |
| description | optional | - |
| floors | array, min 1, max 3 | "Phải có ít nhất một tầng" / "Tối đa 3 tầng" |
| floors[].rows | int, min 1 (coerce) | "Số hàng phải >= 1" |
| floors[].seats_per_row | int, min 1 (coerce) | "Số ghế mỗi hàng phải >= 1" |
| amenities | optional string (comma-separated) | - |

### Error Messages (từ `mapSupabaseError`)
- `23505` → "Tên loại xe đã tồn tại"
- `23503` → "Không thể xóa: loại xe đang được sử dụng"
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Key Business Logic
- **seat_layout JSON format:** `{ floor_1: { rows, seats_per_row }, floor_2: {...} }`
- **total_floors:** = floors.length (derived)
- **total_seats:** = sum(floor.rows × floor.seats_per_row) (derived, calculated at submit)
- **amenities serialization:** "wifi, ac, charging" → ["wifi", "ac", "charging"] (split, trim, filter empty)
- **amenities deserialization (edit):** array.join(', ')
- **description:** empty → null
- **Default floor config:** { rows: 5, seats_per_row: 4 } = 20 seats
- **Seat grid preview:** Capped at 15 rows × 10 seats for display
- **Aisle gap:** Inserted when seats_per_row > 2 (after Math.floor(seatsPerRow/2))
- **Submit disabled:** When totalSeats === 0 OR isPending
- **Error display:** Toast (destructive variant)
- **Debounce search:** 400ms (khác với các feature khác dùng 300ms)

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có loại xe nào"
- **List - No error state:** Không có explicit error state (khác vehicles-page)
- **Form - Submitting:** Button disabled + Loader2
- **Form - Submit disabled:** Khi totalSeats = 0
- **Seat preview - Capped:** "Hiển thị 15×10 (bị giới hạn xem trước)"
- **Toast success create:** `Loại xe "{name}" đã được thêm.`
- **Toast success edit:** `Loại xe "{name}" đã được cập nhật.`
- **Toast success delete:** `Loại xe "{name}" đã được xóa.`

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Tên loại xe unique constraint ở DB level | Confirm: case-sensitive hay insensitive? |
| A2 | Không có max length cho name (Zod chỉ check min 1) | Confirm: có cần giới hạn? |
| A3 | Amenities là free-text, không có predefined list | Confirm: có cần dropdown/autocomplete? |
| A4 | Seat layout không validate tổng ghế max (có thể tạo 99×20 = 1980 ghế/tầng) | Confirm: có business limit? |
| A5 | Delete dialog không có isPending guard cho onOpenChange (khác với vehicles) | Confirm: có thể đóng dialog khi đang xóa? |
| A6 | Không có sort order cho API query (khác vehicles dùng created_at DESC) | Confirm: default sort? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `vehicle-type-form-dialog.tsx:91-94` | totalSeats derived từ watch('floors') | Nếu floors = undefined/null, reduce trên empty array → totalSeats = 0 → submit disabled. Nhưng `?? []` guard đã handle. | TC-VT-EDGE-01 |
| `vehicle-type-form-dialog.tsx:147-149` | amenities split(',') | Nếu user nhập "wifi,,ac" (double comma) → filter(Boolean) loại bỏ empty strings. OK. Nhưng "wifi, , ac" → ["wifi", "", "ac"] → filter loại "" → ["wifi", "ac"]. Trim trước filter. | TC-VT-EDGE-04 |
| `vehicle-type-form-dialog.tsx:294` | Submit disabled khi totalSeats === 0 | Nếu user set rows=0 hoặc seats_per_row=0 (nhưng Zod min 1 sẽ catch). Tuy nhiên, input onChange chỉ fire khi val >= 1, nên user không thể set 0 qua UI. Nhưng nếu clear input → NaN → 0 → disabled. | TC-VT-EDGE-02 |
| `vehicle-types-page.tsx:34` | Không có isError handling | Trang list không hiển thị error state. Nếu API fail, DataTable sẽ hiển thị empty (data=[]) thay vì error message. | TC-VT-UI-03 |
| `vehicle-type-delete-dialog.tsx:50-51` | onOpenChange không guard isPending | User có thể đóng dialog (click overlay/Escape) trong khi đang xóa. Có thể gây UX confusion. | TC-VT-EDGE-06 |
| `seat-layout-editor.tsx:102-103` | onChange chỉ fire khi val >= 1 | Nếu user xóa hết input (empty), onChange không fire → giữ giá trị cũ. Nhưng value hiển thị '' khi rows <= 0. Inconsistency giữa display và state. | TC-VT-EDGE-03 |
| `vehicle-type-form-dialog.tsx:29-44` | parseSeatLayoutToFloors | Nếu seat_layout JSON không có key `floor_X` hoặc format sai → fallback { rows: 5, seats_per_row: 4 }. Silent fallback, user không biết data bị corrupt. | TC-VT-EDGE-05 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Tìm kiếm

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-FUNC-01 | Vehicle Types | Management | Hiển thị danh sách loại xe | Có vehicle_types trong DB | 1. Truy cập /vehicle-types | - | DataTable hiển thị columns: Tên loại xe (sortable), Mô tả, Số ghế (sortable), Số tầng, Tiện nghi, Ngày tạo, Actions | Critical | Functional |
| TC-VT-FUNC-02 | Vehicle Types | Management | Tìm kiếm theo tên | Có nhiều vehicle_types | 1. Nhập "Giường" vào ô tìm kiếm 2. Chờ 400ms debounce | search: "Giường" | Hiển thị vehicle_types có name chứa "Giường" (ilike), page reset về 1 | High | Functional |
| TC-VT-FUNC-03 | Vehicle Types | Management | Tìm kiếm - debounce 400ms | Có vehicle_types | 1. Nhập "Gi" 2. Ngay lập tức nhập "ường" | search: "Giường" | Chỉ gọi API 1 lần với "Giường" sau 400ms từ lần gõ cuối | Medium | Performance |
| TC-VT-FUNC-04 | Vehicle Types | Management | Tìm kiếm - không kết quả | Có vehicle_types | 1. Nhập "XYZNOTEXIST" | search: "XYZNOTEXIST" | Hiển thị "Chưa có loại xe nào" | Medium | Functional |
| TC-VT-FUNC-05 | Vehicle Types | Management | Tìm kiếm - xóa keyword | Đang filter search | 1. Xóa hết text 2. Chờ 400ms | search: undefined | Hiển thị lại toàn bộ vehicle_types | Medium | Functional |
| TC-VT-FUNC-06 | Vehicle Types | Management | Pagination - chuyển trang | Có >10 vehicle_types | 1. Click chuyển trang 2 | 15 items | Trang 2 hiển thị 5 items còn lại | High | Functional |
| TC-VT-FUNC-07 | Vehicle Types | Management | Pagination - thay đổi pageSize | Có nhiều items | 1. Đổi pageSize sang 20 | N/A | Hiển thị tối đa 20 items, page reset về 1 | Medium | Functional |
| TC-VT-FUNC-08 | Vehicle Types | Management | Hiển thị cột Mô tả null | VehicleType có description = null | 1. Xem danh sách | description: null | Hiển thị "—" (text-muted-foreground) | Low | UI |
| TC-VT-FUNC-09 | Vehicle Types | Management | Hiển thị cột Tiện nghi dạng badges | VehicleType có amenities | 1. Xem danh sách | amenities: ["wifi", "ac", "charging"] | Hiển thị 3 badges: "wifi", "ac", "charging" | Medium | UI |
| TC-VT-FUNC-10 | Vehicle Types | Management | Hiển thị cột Tiện nghi empty | VehicleType có amenities = [] | 1. Xem danh sách | amenities: [] | Hiển thị "—" (text-muted-foreground) | Low | UI |
| TC-VT-FUNC-11 | Vehicle Types | Management | Tìm kiếm case-insensitive | Có "Giường nằm 40 chỗ" | 1. Nhập "giường" (lowercase) | search: "giường" | Tìm thấy (ilike case-insensitive) | Medium | Functional |

### 5.2 Functional Tests - Thêm loại xe

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-FUNC-12 | Vehicle Types | Management | Mở dialog thêm loại xe mới | Đã đăng nhập | 1. Click "Thêm loại xe" | N/A | Dialog mở với title "Thêm loại xe mới", form trống, 1 tầng default (5 rows × 4 seats = 20 ghế) | High | Functional |
| TC-VT-FUNC-13 | Vehicle Types | Management | Thêm loại xe thành công - đầy đủ | Dialog tạo mới | 1. Nhập tên "Giường nằm 40 chỗ" 2. Nhập mô tả "Xe giường nằm cao cấp" 3. Nhập tiện nghi "wifi, ac, charging" 4. Cấu hình 2 tầng (5×4 mỗi tầng) 5. Click "Thêm" | name, description, amenities, 2 floors | Toast: `Loại xe "Giường nằm 40 chỗ" đã được thêm.`, dialog đóng, danh sách refresh. total_seats=40, total_floors=2 | Critical | Functional |
| TC-VT-FUNC-14 | Vehicle Types | Management | Thêm loại xe - minimum (chỉ tên + 1 tầng) | Dialog tạo mới | 1. Nhập tên "Xe 20 chỗ" 2. Giữ default 1 tầng (5×4) 3. Click "Thêm" | name: "Xe 20 chỗ", floors: [{rows:5, seats_per_row:4}] | Tạo thành công. description=null, amenities=[], total_seats=20, total_floors=1 | Critical | Functional |
| TC-VT-FUNC-15 | Vehicle Types | Management | Amenities serialization | Dialog tạo mới | 1. Nhập "wifi, ac, charging" 2. Submit | amenities input: "wifi, ac, charging" | API nhận amenities: ["wifi", "ac", "charging"] (split, trim, filter) | High | Functional |
| TC-VT-FUNC-16 | Vehicle Types | Management | Amenities empty → empty array | Dialog tạo mới | 1. Để trống amenities 2. Submit | amenities: "" | API nhận amenities: [] | Medium | Functional |
| TC-VT-FUNC-17 | Vehicle Types | Management | Description empty → null | Dialog tạo mới | 1. Để trống description 2. Submit | description: "" | API nhận description: null | Medium | Functional |
| TC-VT-FUNC-18 | Vehicle Types | Management | Tổng ghế tính realtime | Dialog form | 1. Set tầng 1: rows=10, seats_per_row=4 2. Quan sát header | N/A | Hiển thị "1 tầng · Tổng 40 ghế" (realtime update) | High | Functional |
| TC-VT-FUNC-19 | Vehicle Types | Management | Thêm tầng (multi-floor) | Dialog form, 1 tầng | 1. Click "Thêm tầng" | N/A | Tầng 2 xuất hiện với default 5×4. Tổng ghế cập nhật. Nút "Thêm tầng" vẫn hiển thị (< 3 tầng) | High | Functional |
| TC-VT-FUNC-20 | Vehicle Types | Management | Thêm tầng thứ 3 (max) | Dialog form, 2 tầng | 1. Click "Thêm tầng" | N/A | Tầng 3 xuất hiện. Nút "Thêm tầng" BIẾN MẤT (fields.length >= 3) | High | Functional |
| TC-VT-FUNC-21 | Vehicle Types | Management | Xóa tầng | Dialog form, 2+ tầng | 1. Click icon Trash2 trên tầng 2 | N/A | Tầng 2 bị xóa. Tổng ghế cập nhật. | High | Functional |
| TC-VT-FUNC-22 | Vehicle Types | Management | Không thể xóa tầng cuối cùng | Dialog form, 1 tầng | 1. Quan sát tầng duy nhất | N/A | Không hiển thị icon Trash2 (fields.length <= 1) | Medium | UI |
| TC-VT-FUNC-23 | Vehicle Types | Management | Seat layout JSON format | Dialog form, 2 tầng | 1. Set tầng 1: 10×4, tầng 2: 8×4 2. Submit | N/A | API nhận seat_layout: { floor_1: {rows:10, seats_per_row:4}, floor_2: {rows:8, seats_per_row:4} } | High | Functional |

### 5.3 Functional Tests - Chỉnh sửa loại xe

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-FUNC-24 | Vehicle Types | Management | Mở dialog chỉnh sửa | Có vehicle_type trong danh sách | 1. Click MoreHorizontal 2. Click "Chỉnh sửa" | N/A | Dialog mở với title "Chỉnh sửa loại xe", form pre-filled | High | Functional |
| TC-VT-FUNC-25 | Vehicle Types | Management | Edit - pre-fill seat layout từ JSON | VehicleType có seat_layout | 1. Mở edit dialog | seat_layout: {floor_1: {rows:10, seats_per_row:4}, floor_2: {rows:8, seats_per_row:4}} | Form hiển thị 2 tầng: tầng 1 (10×4), tầng 2 (8×4). Tổng = 72 ghế | High | Functional |
| TC-VT-FUNC-26 | Vehicle Types | Management | Edit - pre-fill amenities từ array | VehicleType có amenities | 1. Mở edit dialog | amenities: ["wifi", "ac"] | Input amenities hiển thị "wifi, ac" (join(', ')) | Medium | Functional |
| TC-VT-FUNC-27 | Vehicle Types | Management | Cập nhật loại xe thành công | Dialog edit đang mở | 1. Sửa tên 2. Thêm 1 tầng 3. Click "Lưu" | name: "Xe 60 chỗ mới" | Toast: `Loại xe "Xe 60 chỗ mới" đã được cập nhật.`, dialog đóng | Critical | Functional |
| TC-VT-FUNC-28 | Vehicle Types | Management | Edit - fallback khi seat_layout corrupt | VehicleType có seat_layout format sai | 1. Mở edit dialog | seat_layout: {invalid: "data"} | Fallback mỗi tầng về {rows:5, seats_per_row:4} (parseSeatLayoutToFloors default) | Low | Functional |

### 5.4 Functional Tests - Xóa loại xe

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-FUNC-29 | Vehicle Types | Management | Mở dialog xóa | Có vehicle_type trong danh sách | 1. Click MoreHorizontal 2. Click "Xóa" | N/A | Dialog "Xác nhận xóa" hiển thị tên loại xe trong warning | High | Functional |
| TC-VT-FUNC-30 | Vehicle Types | Management | Xóa loại xe thành công | Dialog xóa, không có vehicles dùng | 1. Click "Xóa" | N/A | Toast: `Loại xe "{name}" đã được xóa.`, dialog đóng, item biến mất | Critical | Functional |
| TC-VT-FUNC-31 | Vehicle Types | Management | Hủy xóa | Dialog xóa đang mở | 1. Click "Hủy" | N/A | Dialog đóng, item vẫn còn | Medium | Functional |
| TC-VT-FUNC-32 | Vehicle Types | Management | Xóa loại xe đang được sử dụng (FK) | Có vehicles reference vehicle_type | 1. Click "Xóa" | API trả code: "23503" | Toast error: "Không thể xóa: loại xe đang được sử dụng" | Critical | Negative |

### 5.5 Seat Grid Preview Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-FUNC-33 | Vehicle Types | Management | Seat grid preview hiển thị đúng | Dialog form, tầng 1 | 1. Set rows=5, seats_per_row=4 | N/A | Grid hiển thị 5 hàng × 4 ghế, "Đầu xe" indicator, "Tổng ghế tầng này: 20 ghế" | High | Functional |
| TC-VT-FUNC-34 | Vehicle Types | Management | Seat grid - aisle gap | Dialog form | 1. Set seats_per_row=4 | N/A | Aisle gap sau ghế thứ 2 (Math.floor(4/2) = 2) | Medium | UI |
| TC-VT-FUNC-35 | Vehicle Types | Management | Seat grid - no aisle khi ≤ 2 seats | Dialog form | 1. Set seats_per_row=2 | N/A | Không có aisle gap (aisleAfter = null khi seatsPerRow <= 2) | Low | UI |
| TC-VT-FUNC-36 | Vehicle Types | Management | Seat grid - capped display (>15 rows) | Dialog form | 1. Set rows=20, seats_per_row=4 | N/A | Grid chỉ hiển thị 15 hàng. Message: "Hiển thị 15×4 (bị giới hạn xem trước)" | Medium | UI |
| TC-VT-FUNC-37 | Vehicle Types | Management | Seat grid - capped display (>10 seats) | Dialog form | 1. Set rows=5, seats_per_row=12 | N/A | Grid chỉ hiển thị 10 ghế/hàng. Message: "Hiển thị 5×10 (bị giới hạn xem trước)" | Medium | UI |
| TC-VT-FUNC-38 | Vehicle Types | Management | Seat grid - không hiển thị khi rows=0 | Dialog form | 1. Clear rows input | rows: 0 | SeatGrid return null (không render) | Low | UI |

### 5.6 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-VAL-01 | Vehicle Types | Management | Submit tên trống | Dialog form | 1. Để trống tên 2. Submit | name: "" | Validation error: "Tên loại xe không được để trống" | Critical | Validation |
| TC-VT-VAL-02 | Vehicle Types | Management | Số hàng < 1 | Dialog form | 1. Nhập rows = 0 (nếu có thể) 2. Submit | floors[0].rows: 0 | Validation error: "Số hàng phải >= 1" | High | Validation |
| TC-VT-VAL-03 | Vehicle Types | Management | Số ghế mỗi hàng < 1 | Dialog form | 1. Nhập seats_per_row = 0 2. Submit | floors[0].seats_per_row: 0 | Validation error: "Số ghế mỗi hàng phải >= 1" | High | Validation |
| TC-VT-VAL-04 | Vehicle Types | Management | Floors array empty (xóa hết tầng) | Dialog form | 1. Xóa tất cả tầng (nếu có thể) 2. Submit | floors: [] | Validation error: "Phải có ít nhất một tầng" | High | Validation |
| TC-VT-VAL-05 | Vehicle Types | Management | Floors > 3 tầng | Dialog form | 1. Thử thêm tầng thứ 4 | N/A | Nút "Thêm tầng" không hiển thị khi đã có 3 tầng (UI prevent) | Medium | Validation |
| TC-VT-VAL-06 | Vehicle Types | Management | Submit khi totalSeats = 0 | Dialog form | 1. Quan sát nút submit khi totalSeats = 0 | N/A | Nút submit disabled (disabled={isPending \|\| totalSeats === 0}) | Medium | Validation |

### 5.7 Negative Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-NEG-01 | Vehicle Types | Management | Tên loại xe trùng | Đã có "Giường nằm 40 chỗ" | 1. Thêm loại xe mới với cùng tên 2. Submit | name: "Giường nằm 40 chỗ" (duplicate) | Toast error: "Tên loại xe đã tồn tại" | Critical | Negative |
| TC-VT-NEG-02 | Vehicle Types | Management | Cập nhật tên trùng loại xe khác | Đang edit, có loại xe "Xe 45 chỗ" khác | 1. Sửa tên thành "Xe 45 chỗ" 2. Submit | name: "Xe 45 chỗ" (trùng khác) | Toast error: "Tên loại xe đã tồn tại" | High | Negative |

### 5.8 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-UI-01 | Vehicle Types | Management | List loading state | Đang tải dữ liệu | 1. Truy cập trang khi đang load | N/A | DataTable hiển thị skeleton/loading | Medium | UI |
| TC-VT-UI-02 | Vehicle Types | Management | List empty state | Không có vehicle_types | 1. Truy cập trang | N/A | Hiển thị "Chưa có loại xe nào" | Medium | UI |
| TC-VT-UI-03 | Vehicle Types | Management | List - không có error state | API fail | 1. Truy cập khi API lỗi | N/A | DataTable hiển thị empty (data=[]) thay vì error message. KHÔNG có error UI. Risk: user không biết lỗi. | Medium | UI |
| TC-VT-UI-04 | Vehicle Types | Management | Form submitting state | Form đang submit | 1. Click "Thêm" 2. Quan sát | N/A | Button disabled + Loader2, button "Hủy" disabled | High | UI |
| TC-VT-UI-05 | Vehicle Types | Management | Form reset khi mở tạo mới | Vừa đóng edit dialog | 1. Click "Thêm loại xe" | N/A | Form reset: name="", description="", 1 tầng default (5×4), amenities="" | Medium | Functional |
| TC-VT-UI-06 | Vehicle Types | Management | Floor info header | Dialog form, 2 tầng | 1. Quan sát header section "Sơ đồ chỗ ngồi" | 2 tầng, tổng 40 ghế | Hiển thị "2 tầng · Tổng 40 ghế" | Medium | UI |
| TC-VT-UI-07 | Vehicle Types | Management | Nút "Thêm tầng" ẩn khi đạt max | Dialog form, 3 tầng | 1. Quan sát | N/A | Nút "Thêm tầng" không hiển thị | Medium | UI |
| TC-VT-UI-08 | Vehicle Types | Management | Delete dialog warning text | Dialog xóa mở | 1. Quan sát nội dung | vehicleType.name: "Xe 45 chỗ" | "Bạn có chắc chắn muốn xóa loại xe **Xe 45 chỗ**? Hành động này không thể hoàn tác." | Medium | UI |
| TC-VT-UI-09 | Vehicle Types | Management | Delete dialog loading state | Đang xóa | 1. Quan sát nút "Xóa" | N/A | Button disabled + Loader2, button "Hủy" disabled | Medium | UI |
| TC-VT-UI-10 | Vehicle Types | Management | Header và subtitle trang | Đã đăng nhập | 1. Truy cập trang | N/A | h1 "Loại xe", subtitle "Quản lý các loại xe trong hệ thống" | Low | UI |
| TC-VT-UI-11 | Vehicle Types | Management | Search placeholder | Trang danh sách | 1. Quan sát ô tìm kiếm | N/A | Placeholder: "Tìm kiếm theo tên..." | Low | UI |
| TC-VT-UI-12 | Vehicle Types | Management | Form placeholders | Dialog tạo mới | 1. Quan sát placeholders | N/A | Tên: "VD: Giường nằm 40 chỗ", Mô tả: "Mô tả ngắn về loại xe...", Tiện nghi: "VD: wifi, ac, charging" | Low | UI |
| TC-VT-UI-13 | Vehicle Types | Management | Accessibility - sr-only actions button | Trang danh sách | 1. Focus actions button | N/A | Screen reader đọc "Mở menu" | Low | Accessibility |
| TC-VT-UI-14 | Vehicle Types | Management | Accessibility - sr-only xóa tầng | Dialog form, 2+ tầng | 1. Focus nút xóa tầng 2 | N/A | Screen reader đọc "Xóa tầng 2" | Low | Accessibility |
| TC-VT-UI-15 | Vehicle Types | Management | Seat grid "Đầu xe" indicator | Dialog form | 1. Quan sát seat grid preview | N/A | Hiển thị label "Đầu xe" ở đầu grid | Low | UI |

### 5.9 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-ERR-01 | Vehicle Types | Management | Lỗi không xác định khi tạo | API trả lỗi unknown | 1. Submit form | API error không mapped | Toast error: "Thao tác thất bại. Vui lòng thử lại." | Medium | Error Handling |
| TC-VT-ERR-02 | Vehicle Types | Management | Lỗi không xác định khi xóa | API trả lỗi unknown | 1. Click "Xóa" | API error không mapped | Toast error: "Thao tác thất bại. Vui lòng thử lại." | Medium | Error Handling |
| TC-VT-ERR-03 | Vehicle Types | Management | Network error khi submit | Mất kết nối | 1. Tắt network 2. Submit | N/A | Toast error hiển thị. Dialog vẫn mở (catch block không close). | Medium | Error Handling |

### 5.10 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-SEC-01 | Vehicle Types | Management | Truy cập khi chưa login | Chưa đăng nhập | 1. Truy cập /vehicle-types | N/A | Redirect về /login | Critical | Security |
| TC-VT-SEC-02 | Vehicle Types | Management | XSS qua name | Dialog form | 1. Nhập `<script>alert(1)</script>` vào tên 2. Submit 3. Xem danh sách | name: script tag | Data lưu text, hiển thị escaped. Không execute. | High | Security |
| TC-VT-SEC-03 | Vehicle Types | Management | XSS qua amenities | Dialog form | 1. Nhập `<img src=x onerror=alert(1)>` vào amenities 2. Submit | amenities: XSS payload | Data lưu text trong array, hiển thị escaped trong Badge | Medium | Security |
| TC-VT-SEC-04 | Vehicle Types | Management | SQL injection qua search | Trang danh sách | 1. Nhập SQL injection | search: `'; DROP TABLE vehicle_types; --` | Supabase parameterized query ngăn injection | High | Security |

### 5.11 Edge Case Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-EDGE-01 | Vehicle Types | Management | Double-click submit button | Form valid | 1. Double-click "Thêm" | N/A | Chỉ 1 vehicle_type tạo (button disabled khi isPending) | High | Functional |
| TC-VT-EDGE-02 | Vehicle Types | Management | Clear rows input (empty) | Dialog form | 1. Xóa hết giá trị rows input | rows input: "" | onChange không fire (parseInt → NaN → guard). Giá trị cũ giữ nguyên. Display hiển thị '' nếu rows <= 0. | Medium | Edge Case |
| TC-VT-EDGE-03 | Vehicle Types | Management | Rows input - số thập phân | Dialog form | 1. Nhập rows = 5.7 | N/A | parseInt → 5 (truncate). Hoạt động đúng. | Low | Edge Case |
| TC-VT-EDGE-04 | Vehicle Types | Management | Amenities với double comma | Dialog form | 1. Nhập "wifi,,ac" 2. Submit | amenities: "wifi,,ac" | API nhận ["wifi", "ac"] (split → trim → filter(Boolean) loại empty) | Medium | Edge Case |
| TC-VT-EDGE-05 | Vehicle Types | Management | Edit - seat_layout JSON corrupt | VehicleType có seat_layout invalid | 1. Mở edit dialog | seat_layout: {} (empty) | Fallback tất cả tầng về {rows:5, seats_per_row:4}. Form vẫn usable. | Low | Edge Case |
| TC-VT-EDGE-06 | Vehicle Types | Management | Đóng delete dialog khi đang xóa | Đang gọi API delete | 1. Click overlay hoặc Escape | N/A | Dialog CÓ THỂ đóng (không có isPending guard trên onOpenChange). Mutation vẫn chạy background. | Medium | Edge Case |
| TC-VT-EDGE-07 | Vehicle Types | Management | Rất nhiều ghế (99 rows × 20 seats) | Dialog form | 1. Set rows=99, seats_per_row=20 | N/A | totalSeats = 1980. Grid preview capped 15×10. Submit thành công (không có max validation). | Low | Edge Case |
| TC-VT-EDGE-08 | Vehicle Types | Management | Amenities với trailing comma | Dialog form | 1. Nhập "wifi, ac," 2. Submit | amenities: "wifi, ac," | API nhận ["wifi", "ac"] (trailing empty filtered) | Low | Edge Case |
| TC-VT-EDGE-09 | Vehicle Types | Management | Amenities chỉ spaces và commas | Dialog form | 1. Nhập ", , ," 2. Submit | amenities: ", , ," | API nhận [] (all empty after trim+filter) | Low | Edge Case |

### 5.12 API Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VT-API-01 | Vehicle Types | Management | GET /vehicle_types - pagination | Auth valid | 1. GET /rest/v1/vehicle_types?limit=10&offset=0 | N/A | Status 200, data array + count header | High | API |
| TC-VT-API-02 | Vehicle Types | Management | GET /vehicle_types - search ilike | Auth valid | 1. GET /rest/v1/vehicle_types?name=ilike.*Giường* | N/A | Trả items có name chứa "Giường" | High | API |
| TC-VT-API-03 | Vehicle Types | Management | POST /vehicle_types - valid | Auth valid | 1. POST với payload đầy đủ | seat_layout JSON, total_floors, total_seats, amenities array | Status 201, trả object với id | High | API |
| TC-VT-API-04 | Vehicle Types | Management | POST /vehicle_types - duplicate name | Auth valid | 1. POST với name đã tồn tại | N/A | Status 409, code "23505" | High | API |
| TC-VT-API-05 | Vehicle Types | Management | DELETE /vehicle_types/:id - has FK | Auth valid | 1. DELETE vehicle_type có vehicles reference | N/A | Status 409, code "23503" | High | API |
| TC-VT-API-06 | Vehicle Types | Management | DELETE /vehicle_types/:id - no FK | Auth valid | 1. DELETE vehicle_type không có references | N/A | Status 204 | High | API |
| TC-VT-API-07 | Vehicle Types | Management | GET /vehicle_types - no auth | Không có token | 1. GET không auth | N/A | Status 401 | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Max length cho tên loại xe | Zod chỉ check min 1, không có max. DB column có limit? |
| 2 | Max total_seats per vehicle_type | Hiện không giới hạn (99×20×3 = 5940 ghế possible). Có business limit? |
| 3 | Amenities predefined list | Hiện free-text. Có cần standardize (wifi, ac, usb, toilet, etc.)? |
| 4 | Seat layout format validation | seat_layout là JSON tự do. Có cần validate structure khi read từ DB? |
| 5 | Tên loại xe unique case-sensitivity | DB unique constraint case-sensitive hay insensitive? "Xe 45 chỗ" vs "xe 45 chỗ"? |
| 6 | Error state cho list page | Hiện không có isError handling. Cần thêm error UI giống vehicles-page? |
| 7 | Delete dialog isPending guard | Hiện không guard onOpenChange. Cần thêm để consistent với các feature khác? |
| 8 | Debounce 400ms vs 300ms | Feature này dùng 400ms, các feature khác dùng 300ms. Intentional hay inconsistency? |

---

## 7. Summary

| Priority | Count |
|----------|-------|
| Critical | 9 |
| High | 24 |
| Medium | 28 |
| Low | 17 |
| **Total** | **78** |

| Test Type | Count |
|-----------|-------|
| Functional | 33 |
| UI | 18 |
| Validation | 6 |
| Negative | 4 |
| Edge Case | 9 |
| Error Handling | 3 |
| Security | 4 |
| API | 7 |
| Performance | 1 |
| Boundary | 0 |
| Accessibility | 2 |