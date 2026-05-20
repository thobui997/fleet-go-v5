# Test Cases: FR-10 - Quản lý tuyến đường (Routes Management)

## 1. Feature List Detected

- Danh sách tuyến đường với phân trang, tìm kiếm theo tên, lọc theo trạng thái
- Thêm tuyến đường mới (full page form)
- Chỉnh sửa tuyến đường (full page form)
- Xóa tuyến đường (dialog xác nhận)
- Cross-field validation (origin != destination)
- Duration serialization (minutes → HH:MM:SS interval)
- Duration parsing (HH:MM:SS / "X days HH:MM:SS" → minutes)
- "Lưu & Điểm dừng" button (create mode only, redirect to stops page)
- Navigate đến trang Điểm dừng từ actions menu
- Dirty-state navigation blocker (useBlocker)
- Station dropdowns (origin + destination, max 1000 each)

---

## 2. Feature Analysis

### Business Flow
1. Fleet Manager truy cập /routes → Danh sách tuyến đường (sắp xếp name ASC)
2. Lọc: is_active (Hoạt động/Ngừng hoạt động), search by name (ilike, debounce 300ms)
3. Thêm tuyến đường:
   a. Click "Thêm tuyến đường" → Navigate đến /routes/new
   b. Nhập tên (required), chọn trạm đi + trạm đến (required, must differ)
   c. Nhập khoảng cách km (required, >0), thời gian phút (required, int >0)
   d. Nhập giá vé cơ bản (required, >=0), toggle is_active
   e. Submit → Serialize duration → Insert → Toast → Redirect
   f. Hoặc "Lưu & Điểm dừng" → Create → Redirect to /routes/:id/stops
4. Chỉnh sửa: Navigate đến /routes/:id/edit → Form pre-filled (parse duration) → Update
5. Xóa: Dialog xác nhận → Delete (FK constraint nếu có trips)
6. Actions menu: Chỉnh sửa, Điểm dừng, Xóa

### Actor / Role
- Fleet Manager, Admin (theo SRS)
- Thực tế: Tất cả authenticated users

### Validation Rules (từ `route-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| name | required, trim, min 1 | "Tên tuyến đường không được để trống" |
| origin_station_id | required, min 1 | "Vui lòng chọn trạm đi" |
| destination_station_id | required, min 1, != origin | "Vui lòng chọn trạm đến" / "Trạm đi và trạm đến không được trùng nhau" |
| distance_km | required, number, positive (>0) | "Khoảng cách phải lớn hơn 0" |
| estimated_duration_minutes | required, int, positive (>0) | "Thời gian dự kiến phải lớn hơn 0" |
| base_price | required, number, min 0 | "Giá vé không được âm" |
| is_active | boolean, default true | - |

### Error Messages (từ `mapSupabaseError`)
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- `23505` + `routes_name_key` → "Tên tuyến đường đã tồn tại"
- `23505` (other) → "Giá trị đã tồn tại"
- `23503` (mutate context) → "Trạm không tồn tại hoặc đã bị xóa"
- `23503` (delete context) → "Không thể xóa tuyến đường đang được sử dụng bởi chuyến đi"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Fetch Error Mapping (`mapFetchError`)
- `PGRST116/406` → "Không tìm thấy tuyến đường."
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- Default → "Không thể tải tuyến đường. Vui lòng thử lại."

### Key Business Logic
- **Duration serialization:** minutes → "HH:MM:SS" (e.g. 150 → "02:30:00")
- **Duration parsing:** "HH:MM:SS" → minutes (e.g. "02:30:00" → 150). Also handles "X days HH:MM:SS". Fallback = 1.
- **Duration display in list:** formatDuration → "2h 30m" / "45m" / "3h"
- **Cross-field validation:** origin_station_id !== destination_station_id (superRefine)
- **"Lưu & Điểm dừng":** Only in create mode. Sets saveAndStops=true → after create, redirect to /routes/:id/stops
- **canSubmit guard:** originStations.length > 0 && destStations.length > 0 && watchedOriginId && watchedDestId
- **Error context:** mapSupabaseError takes 'mutate' | 'delete' context for different 23503 messages
- **Sort order:** name ASC (alphabetical)
- **Price display:** toLocaleString('vi-VN') + " đ"

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có tuyến đường nào"
- **List Error:** mapSupabaseError(error) + nút "Thử lại"
- **Form - Loading stations:** "Đang tải trạm..." + Loader2
- **Form - No stations:** "Chưa có trạm nào — tạo trạm trước ở /stations"
- **Form - Truncated stations:** Warning "Hiển thị X / Y trạm..."
- **Form - Edit loading:** Skeleton
- **Form - Edit error:** Error message + "Quay lại danh sách"
- **Form - Submitting:** Buttons disabled + Loader2
- **Dirty-state blocker:** "Thoát mà không lưu?" / "Ở lại" / "Thoát"
- **Toast success:** "Đã tạo tuyến đường" / "Đã cập nhật tuyến đường" / "Đã xóa tuyến đường"

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Tên tuyến đường unique constraint ở DB level | Confirm: case-sensitive? |
| A2 | Không có max length cho name (Zod chỉ check min 1) | Confirm: DB column limit? |
| A3 | distance_km cho phép decimal (step="0.01") | Confirm: precision cần thiết? |
| A4 | base_price = 0 hợp lệ (miễn phí) | Confirm: business rule? |
| A5 | Không validate distance/duration hợp lý (e.g. 1km nhưng 1000 phút) | Confirm: có cần? |
| A6 | "Lưu & Điểm dừng" chỉ hiện ở create mode, không có ở edit | Confirm: intentional? |
| A7 | Cùng cặp origin-destination có thể tạo nhiều routes (khác tên) | Confirm: có unique constraint trên cặp stations? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `route-form-schema.ts:74-99` | parseDurationMinutes | Nếu interval format không match (e.g. "invalid"), catch block return 1. Silent fallback, user thấy 1 phút khi edit. | TC-RT-EDGE-03 |
| `route-form-schema.ts:103` | serializeToInsert - Math.max(1, minutes) | Nếu user nhập 0 phút (Zod positive() sẽ catch), nhưng nếu bypass → serialize thành "00:01:00" (1 phút). | TC-RT-EDGE-04 |
| `routes-page.tsx:31-56` | formatDuration | Nếu interval = null/undefined, cell render gọi formatDuration(String(null)) = "null" → try parse → NaN → return "null". Nhưng cell có guard `value != null`. | TC-RT-EDGE-05 |
| `route-form-page.tsx:119` | saveAndStops state | setSaveAndStops(true) trên onClick, nhưng form submit là async. Nếu user click "Lưu & Điểm dừng" rồi nhanh chóng click "Thêm", saveAndStops vẫn true → redirect sai. Race condition nhỏ. | TC-RT-EDGE-06 |
| `route-form-page.tsx:167` | canSubmit guard | Nếu stations chưa load xong (empty array), submit disabled. Nhưng nếu stations load xong mà user chưa chọn (watchedOriginId = ''), cũng disabled. | TC-RT-UI-07 |
| `route-form-page.tsx:63-70` | 2 useStations queries | Gọi 2 lần cùng API (origin + dest). Cùng params → React Query sẽ deduplicate. Nhưng nếu cache miss, 2 requests. | TC-RT-EDGE-07 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Lọc

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-FUNC-01 | Routes | Management | Hiển thị danh sách tuyến đường | Có routes trong DB | 1. Truy cập /routes | - | DataTable hiển thị columns: Tên tuyến (sortable), Trạm đi, Trạm đến, Khoảng cách, Thời gian, Giá vé, Trạng thái, Actions. Sắp xếp name ASC. | Critical | Functional |
| TC-RT-FUNC-02 | Routes | Management | Tìm kiếm theo tên tuyến | Có nhiều routes | 1. Nhập "Hà Nội" 2. Chờ 300ms | search: "Hà Nội" | Hiển thị routes có name chứa "Hà Nội" (ilike), page reset về 1 | High | Functional |
| TC-RT-FUNC-03 | Routes | Management | Tìm kiếm - debounce 300ms | Có routes | 1. Nhập "Hà" 2. Ngay nhập "Nội" | search: "Hà Nội" | Chỉ gọi API 1 lần sau 300ms | Medium | Performance |
| TC-RT-FUNC-04 | Routes | Management | Tìm kiếm - không kết quả | Có routes | 1. Nhập "XYZNOTEXIST" | search: "XYZNOTEXIST" | Hiển thị "Chưa có tuyến đường nào" | Medium | Functional |
| TC-RT-FUNC-05 | Routes | Management | Lọc "Hoạt động" | Có routes active + inactive | 1. Chọn "Hoạt động" | isActive: true | Chỉ hiển thị routes is_active=true, page reset về 1 | High | Functional |
| TC-RT-FUNC-06 | Routes | Management | Lọc "Ngừng hoạt động" | Có routes inactive | 1. Chọn "Ngừng hoạt động" | isActive: false | Chỉ hiển thị routes is_active=false | High | Functional |
| TC-RT-FUNC-07 | Routes | Management | Lọc "Tất cả" | Đang filter | 1. Chọn "Tất cả" | isActive: undefined | Hiển thị tất cả routes | Medium | Functional |
| TC-RT-FUNC-08 | Routes | Management | Kết hợp search + filter | Có nhiều routes | 1. Nhập "Hà Nội" 2. Chọn "Hoạt động" | search + isActive: true | Chỉ hiển thị routes active có tên chứa "Hà Nội" | High | Functional |
| TC-RT-FUNC-09 | Routes | Management | Hiển thị khoảng cách | Route có distance_km | 1. Xem danh sách | distance_km: 1700 | Hiển thị "1700 km" | Medium | UI |
| TC-RT-FUNC-10 | Routes | Management | Hiển thị thời gian format | Route có estimated_duration | 1. Xem danh sách | estimated_duration: "02:30:00" | Hiển thị "2h 30m" | Medium | UI |
| TC-RT-FUNC-11 | Routes | Management | Hiển thị thời gian chỉ giờ | Route duration chẵn giờ | 1. Xem danh sách | estimated_duration: "03:00:00" | Hiển thị "3h" (không có "0m") | Low | UI |
| TC-RT-FUNC-12 | Routes | Management | Hiển thị thời gian chỉ phút | Route duration < 1h | 1. Xem danh sách | estimated_duration: "00:45:00" | Hiển thị "45m" (không có "0h") | Low | UI |
| TC-RT-FUNC-13 | Routes | Management | Hiển thị giá vé format vi-VN | Route có base_price | 1. Xem danh sách | base_price: 150000 | Hiển thị "150.000 đ" | Medium | UI |
| TC-RT-FUNC-14 | Routes | Management | Hiển thị trạng thái "Hoạt động" | Route is_active=true | 1. Xem danh sách | is_active: true | Badge "Hoạt động" (variant: default) | Medium | UI |
| TC-RT-FUNC-15 | Routes | Management | Hiển thị trạng thái "Ngừng hoạt động" | Route is_active=false | 1. Xem danh sách | is_active: false | Badge "Ngừng hoạt động" (variant: secondary) | Medium | UI |
| TC-RT-FUNC-16 | Routes | Management | Hiển thị trạm đi/đến từ join | Route có stations linked | 1. Xem danh sách | origin_station.name: "BX Mỹ Đình" | Cột Trạm đi hiển thị "BX Mỹ Đình" | High | Functional |
| TC-RT-FUNC-17 | Routes | Management | Hiển thị trạm null | Route có station = null | 1. Xem danh sách | origin_station: null | Hiển thị "—" | Low | UI |
| TC-RT-FUNC-18 | Routes | Management | Pagination - chuyển trang | Có >10 routes | 1. Click trang 2 | 15 routes | Trang 2 hiển thị 5 routes | High | Functional |
| TC-RT-FUNC-19 | Routes | Management | Pagination - thay đổi pageSize | Có nhiều routes | 1. Đổi pageSize sang 20 | N/A | Hiển thị tối đa 20, page reset về 1 | Medium | Functional |
| TC-RT-FUNC-20 | Routes | Management | Actions menu - navigate Điểm dừng | Có route | 1. Click MoreHorizontal 2. Click "Điểm dừng" | N/A | Navigate đến /routes/:id/stops | High | Functional |
| TC-RT-FUNC-21 | Routes | Management | Tìm kiếm case-insensitive | Có "Hà Nội - HCM" | 1. Nhập "hà nội" | search: "hà nội" | Tìm thấy (ilike case-insensitive) | Medium | Functional |

### 5.2 Functional Tests - Thêm tuyến đường

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-FUNC-22 | Routes | Management | Navigate trang thêm tuyến đường | Đã đăng nhập | 1. Click "Thêm tuyến đường" | N/A | Navigate đến /routes/new, title "Thêm tuyến đường mới", is_active default true | High | Functional |
| TC-RT-FUNC-23 | Routes | Management | Thêm tuyến đường thành công | Trang tạo mới, có stations | 1. Nhập tên "Hà Nội - HCM" 2. Chọn trạm đi 3. Chọn trạm đến (khác trạm đi) 4. Nhập distance 1700 5. Nhập duration 1440 6. Nhập price 500000 7. Click "Thêm" | Đầy đủ fields | Toast "Đã tạo tuyến đường", redirect về /routes | Critical | Functional |
| TC-RT-FUNC-24 | Routes | Management | "Lưu & Điểm dừng" - redirect to stops | Trang tạo mới | 1. Fill form hợp lệ 2. Click "Lưu & Điểm dừng" | N/A | Toast "Đã tạo tuyến đường", redirect đến /routes/:newId/stops (không phải /routes) | High | Functional |
| TC-RT-FUNC-25 | Routes | Management | "Lưu & Điểm dừng" chỉ hiện ở create mode | Trang edit | 1. Quan sát footer buttons | N/A | Chỉ có "Hủy" + "Lưu". KHÔNG có "Lưu & Điểm dừng" | Medium | UI |
| TC-RT-FUNC-26 | Routes | Management | Duration serialization (minutes → interval) | Trang tạo mới | 1. Nhập duration = 150 phút 2. Submit | estimated_duration_minutes: 150 | API nhận estimated_duration = "02:30:00" | High | Functional |
| TC-RT-FUNC-27 | Routes | Management | Duration serialization - chẵn giờ | Trang tạo mới | 1. Nhập duration = 120 phút 2. Submit | estimated_duration_minutes: 120 | API nhận estimated_duration = "02:00:00" | Medium | Functional |
| TC-RT-FUNC-28 | Routes | Management | Duration serialization - >24h | Trang tạo mới | 1. Nhập duration = 1500 phút (25h) 2. Submit | estimated_duration_minutes: 1500 | API nhận estimated_duration = "25:00:00" | Low | Boundary |
| TC-RT-FUNC-29 | Routes | Management | is_active default true | Trang tạo mới | 1. Quan sát switch | N/A | Switch "Đang hoạt động" mặc định ON | Medium | Functional |
| TC-RT-FUNC-30 | Routes | Management | Toggle is_active off | Trang form | 1. Click switch để tắt | N/A | Switch OFF, is_active = false | Medium | Functional |

### 5.3 Functional Tests - Chỉnh sửa tuyến đường

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-FUNC-31 | Routes | Management | Navigate trang chỉnh sửa | Có route | 1. Click MoreHorizontal 2. Click "Chỉnh sửa" | N/A | Navigate đến /routes/:id/edit, title "Chỉnh sửa tuyến đường" | High | Functional |
| TC-RT-FUNC-32 | Routes | Management | Edit - form pre-filled | Trang edit, route loaded | 1. Quan sát form | route: {name, origin, dest, distance, duration: "02:30:00", price, is_active} | Form pre-filled. Duration parsed: 150 phút. Stations selected. | High | Functional |
| TC-RT-FUNC-33 | Routes | Management | Edit - duration parsing "HH:MM:SS" | Route có duration "03:15:00" | 1. Mở edit | estimated_duration: "03:15:00" | Field hiển thị 195 (3*60+15) | Medium | Functional |
| TC-RT-FUNC-34 | Routes | Management | Edit - duration parsing "X days HH:MM:SS" | Route có duration "1 days 02:00:00" | 1. Mở edit | estimated_duration: "1 days 02:00:00" | Field hiển thị 1560 (1*1440+2*60) | Low | Functional |
| TC-RT-FUNC-35 | Routes | Management | Cập nhật tuyến đường thành công | Trang edit | 1. Sửa giá vé 2. Click "Lưu" | base_price: 600000 | Toast "Đã cập nhật tuyến đường", redirect về /routes | Critical | Functional |
| TC-RT-FUNC-36 | Routes | Management | Edit - loading skeleton | Trang edit, đang tải | 1. Truy cập /routes/:id/edit | N/A | Skeleton 2-column layout | Medium | UI |
| TC-RT-FUNC-37 | Routes | Management | Edit - error (không tìm thấy) | ID không tồn tại | 1. Truy cập /routes/invalid-id/edit | PGRST116 | "Không tìm thấy tuyến đường." + "Quay lại danh sách" | Medium | Error Handling |

### 5.4 Functional Tests - Xóa tuyến đường

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-FUNC-38 | Routes | Management | Mở dialog xóa | Có route | 1. Click MoreHorizontal 2. Click "Xóa" | N/A | Dialog "Xác nhận xóa" hiển thị tên route | High | Functional |
| TC-RT-FUNC-39 | Routes | Management | Xóa tuyến đường thành công | Dialog xóa, route không có trips | 1. Click "Xóa" | N/A | Toast "Đã xóa tuyến đường", dialog đóng, item biến mất | Critical | Functional |
| TC-RT-FUNC-40 | Routes | Management | Hủy xóa | Dialog xóa đang mở | 1. Click "Hủy" | N/A | Dialog đóng, route vẫn còn | Medium | Functional |
| TC-RT-FUNC-41 | Routes | Management | Xóa route đang có trips (FK) | Route có trips reference | 1. Click "Xóa" | API trả code: "23503" | Toast error: "Không thể xóa tuyến đường đang được sử dụng bởi chuyến đi" | Critical | Negative |
| TC-RT-FUNC-42 | Routes | Management | Không thể đóng dialog khi đang xóa | isPending = true | 1. Click overlay khi đang xóa | N/A | Dialog không đóng | Medium | UI |

### 5.5 Dirty-state Blocker Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-FUNC-43 | Routes | Management | Blocker hiển thị khi dirty | Form đã thay đổi | 1. Sửa field 2. Click "Hủy" | N/A | Dialog "Thoát mà không lưu?" | High | Functional |
| TC-RT-FUNC-44 | Routes | Management | Blocker - "Ở lại" | Dialog blocker | 1. Click "Ở lại" | N/A | Dialog đóng, giữ form | High | Functional |
| TC-RT-FUNC-45 | Routes | Management | Blocker - "Thoát" | Dialog blocker | 1. Click "Thoát" | N/A | Navigate away | High | Functional |
| TC-RT-FUNC-46 | Routes | Management | Không trigger blocker sau submit | Submit thành công | 1. Submit 2. Redirect | N/A | Không hiện blocker (reset trước navigate) | Medium | Functional |

### 5.6 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-VAL-01 | Routes | Management | Tên trống | Trang form | 1. Để trống tên 2. Submit | name: "" | Validation error: "Tên tuyến đường không được để trống" | Critical | Validation |
| TC-RT-VAL-02 | Routes | Management | Tên chỉ spaces | Trang form | 1. Nhập "   " 2. Submit | name: "   " | Validation error (trim → empty → min 1 fail) | Medium | Validation |
| TC-RT-VAL-03 | Routes | Management | Không chọn trạm đi | Trang form | 1. Không chọn origin 2. Submit | origin_station_id: "" | Validation error: "Vui lòng chọn trạm đi" | Critical | Validation |
| TC-RT-VAL-04 | Routes | Management | Không chọn trạm đến | Trang form | 1. Không chọn destination 2. Submit | destination_station_id: "" | Validation error: "Vui lòng chọn trạm đến" | Critical | Validation |
| TC-RT-VAL-05 | Routes | Management | Trạm đi = trạm đến (cross-field) | Trang form | 1. Chọn cùng station cho origin và destination 2. Submit | origin = destination | Validation error: "Trạm đi và trạm đến không được trùng nhau" (trên destination field) | Critical | Validation |
| TC-RT-VAL-06 | Routes | Management | Khoảng cách = 0 | Trang form | 1. Nhập distance = 0 2. Submit | distance_km: 0 | Validation error: "Khoảng cách phải lớn hơn 0" (positive, not min 0) | High | Validation |
| TC-RT-VAL-07 | Routes | Management | Khoảng cách âm | Trang form | 1. Nhập distance = -1 2. Submit | distance_km: -1 | Validation error: "Khoảng cách phải lớn hơn 0" | High | Validation |
| TC-RT-VAL-08 | Routes | Management | Khoảng cách = 0.01 (boundary min) | Trang form | 1. Nhập distance = 0.01 2. Submit | distance_km: 0.01 | Validation pass (positive satisfied) | Medium | Boundary |
| TC-RT-VAL-09 | Routes | Management | Thời gian = 0 | Trang form | 1. Nhập duration = 0 2. Submit | estimated_duration_minutes: 0 | Validation error: "Thời gian dự kiến phải lớn hơn 0" | High | Validation |
| TC-RT-VAL-10 | Routes | Management | Thời gian âm | Trang form | 1. Nhập duration = -1 2. Submit | estimated_duration_minutes: -1 | Validation error: "Thời gian dự kiến phải lớn hơn 0" | High | Validation |
| TC-RT-VAL-11 | Routes | Management | Thời gian = 1 (boundary min) | Trang form | 1. Nhập duration = 1 2. Submit | estimated_duration_minutes: 1 | Validation pass | Medium | Boundary |
| TC-RT-VAL-12 | Routes | Management | Thời gian decimal | Trang form | 1. Nhập duration = 90.5 2. Submit | estimated_duration_minutes: 90.5 | Validation error (int() requires integer) | Medium | Validation |
| TC-RT-VAL-13 | Routes | Management | Giá vé âm | Trang form | 1. Nhập price = -1 2. Submit | base_price: -1 | Validation error: "Giá vé không được âm" | High | Validation |
| TC-RT-VAL-14 | Routes | Management | Giá vé = 0 (boundary, hợp lệ) | Trang form | 1. Nhập price = 0 2. Submit | base_price: 0 | Validation pass (min 0 cho phép) | Medium | Boundary |

### 5.7 Negative Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-NEG-01 | Routes | Management | Tên tuyến đường trùng | Đã có "Hà Nội - HCM" | 1. Tạo route mới cùng tên 2. Submit | name: "Hà Nội - HCM" (duplicate) | Toast error: "Tên tuyến đường đã tồn tại" | Critical | Negative |
| TC-RT-NEG-02 | Routes | Management | Trạm đã bị xóa (FK mutate) | Station bị xóa sau khi mở form | 1. Chọn station 2. Station bị xóa 3. Submit | API trả code: "23503" | Toast error: "Trạm không tồn tại hoặc đã bị xóa" | High | Negative |
| TC-RT-NEG-03 | Routes | Management | Check constraint violation | Data vi phạm DB constraint | 1. Submit | API trả code: "23514" | Toast error: "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)" | Medium | Negative |

### 5.8 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-UI-01 | Routes | Management | List loading state | Đang tải | 1. Truy cập trang | N/A | DataTable skeleton | Medium | UI |
| TC-RT-UI-02 | Routes | Management | List empty state | Không có routes | 1. Truy cập trang | N/A | "Chưa có tuyến đường nào" | Medium | UI |
| TC-RT-UI-03 | Routes | Management | List error state | API lỗi | 1. Truy cập khi API fail | N/A | Error message (mapSupabaseError) + nút "Thử lại" | Medium | UI |
| TC-RT-UI-04 | Routes | Management | Retry khi lỗi | Error state | 1. Click "Thử lại" | N/A | Gọi lại API | Medium | Functional |
| TC-RT-UI-05 | Routes | Management | Stations loading | Form, stations đang load | 1. Mở form | N/A | "Đang tải trạm..." + Loader2 (cả origin và destination) | Medium | UI |
| TC-RT-UI-06 | Routes | Management | Stations empty | Không có stations | 1. Mở dropdown | stations: [] | "Chưa có trạm nào — tạo trạm trước ở /stations" | High | UI |
| TC-RT-UI-07 | Routes | Management | Submit disabled khi chưa chọn stations | Form mới, chưa chọn | 1. Quan sát buttons | watchedOriginId: "", watchedDestId: "" | Buttons "Thêm" và "Lưu & Điểm dừng" disabled (canSubmit = false) | Medium | UI |
| TC-RT-UI-08 | Routes | Management | Stations truncation warning | >1000 stations | 1. Mở form | count > displayed | Warning "Hiển thị X / Y trạm..." cho cả origin và destination | Low | UI |
| TC-RT-UI-09 | Routes | Management | Form submitting state | Đang submit | 1. Click "Thêm" | N/A | Buttons disabled + Loader2, "Hủy" disabled | High | UI |
| TC-RT-UI-10 | Routes | Management | Header và subtitle | Đã đăng nhập | 1. Truy cập trang | N/A | h1 "Tuyến đường", subtitle "Quản lý danh sách tuyến đường vận chuyển" | Low | UI |
| TC-RT-UI-11 | Routes | Management | Search placeholder | Trang danh sách | 1. Quan sát ô tìm kiếm | N/A | Placeholder: "Tìm theo tên tuyến đường..." | Low | UI |
| TC-RT-UI-12 | Routes | Management | Form placeholders | Trang tạo mới | 1. Quan sát | N/A | Tên: "VD: Hà Nội - Hồ Chí Minh", Distance: "VD: 1700", Duration: "VD: 90 (phút)", Price: "VD: 150000" | Low | UI |
| TC-RT-UI-13 | Routes | Management | Delete dialog warning text | Dialog xóa | 1. Quan sát | route.name: "Hà Nội - HCM" | "Bạn có chắc chắn muốn xóa tuyến đường **Hà Nội - HCM**? Thao tác này không thể hoàn tác." | Medium | UI |
| TC-RT-UI-14 | Routes | Management | Accessibility - sr-only | Trang danh sách | 1. Focus actions button | N/A | Screen reader đọc "Mở menu" | Low | Accessibility |
| TC-RT-UI-15 | Routes | Management | Accessibility - sr-only back | Trang form | 1. Focus back button | N/A | Screen reader đọc "Quay lại" | Low | Accessibility |

### 5.9 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-ERR-01 | Routes | Management | Session expired khi tạo | Token hết hạn | 1. Submit form | API trả 401 | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-RT-ERR-02 | Routes | Management | Session expired khi xóa | Token hết hạn | 1. Click "Xóa" | API trả PGRST301 | Toast error auth expiry | High | Error Handling |
| TC-RT-ERR-03 | Routes | Management | Lỗi không xác định | API lỗi unknown | 1. Submit | N/A | Toast error: "Thao tác thất bại. Vui lòng thử lại." | Medium | Error Handling |
| TC-RT-ERR-04 | Routes | Management | Edit - auth expired fetch | Session expired | 1. Truy cập edit page | API trả 401 | "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-RT-ERR-05 | Routes | Management | Edit - generic fetch error | API lỗi | 1. Truy cập edit page | N/A | "Không thể tải tuyến đường. Vui lòng thử lại." + "Quay lại danh sách" | Medium | Error Handling |

### 5.10 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-SEC-01 | Routes | Management | Truy cập khi chưa login | Chưa đăng nhập | 1. Truy cập /routes | N/A | Redirect về /login | Critical | Security |
| TC-RT-SEC-02 | Routes | Management | XSS qua name | Trang form | 1. Nhập script tag vào tên 2. Submit | name: `<script>alert(1)</script>` | Data lưu text, hiển thị escaped | High | Security |
| TC-RT-SEC-03 | Routes | Management | SQL injection qua search | Trang danh sách | 1. Nhập SQL injection | search: `'; DROP TABLE routes; --` | Supabase parameterized query ngăn injection | High | Security |

### 5.11 Edge Case Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-EDGE-01 | Routes | Management | Double-click submit | Form valid | 1. Double-click "Thêm" | N/A | Chỉ 1 route tạo (button disabled khi isPending) | High | Functional |
| TC-RT-EDGE-02 | Routes | Management | Distance decimal precision | Trang form | 1. Nhập distance = 1700.55 2. Submit | distance_km: 1700.55 | Tạo thành công (step="0.01" cho phép) | Medium | Edge Case |
| TC-RT-EDGE-03 | Routes | Management | Edit - duration parse invalid format | Route có duration format lạ | 1. Mở edit | estimated_duration: "invalid" | parseDurationMinutes fallback → 1. Field hiển thị 1 phút. | Low | Edge Case |
| TC-RT-EDGE-04 | Routes | Management | Duration serialize min 1 | Trang form (bypass validation) | 1. Nếu minutes = 0 (bypass Zod) | N/A | serializeToInsert → Math.max(1, 0) = 1 → "00:01:00" | Low | Edge Case |
| TC-RT-EDGE-05 | Routes | Management | Duration "X days" format | Route có duration > 24h | 1. Xem danh sách | estimated_duration: "1 days 02:30:00" | formatDuration → 1*1440+2*60+30 = 1590 phút → "26h 30m" | Low | Edge Case |
| TC-RT-EDGE-06 | Routes | Management | "Lưu & Điểm dừng" race condition | Trang tạo mới | 1. Click "Lưu & Điểm dừng" 2. Nhanh chóng click "Thêm" | N/A | saveAndStops state có thể gây redirect sai. Tuy nhiên isPending guard ngăn double-submit. | Low | Edge Case |
| TC-RT-EDGE-07 | Routes | Management | Cùng cặp stations, khác tên | Trang form | 1. Tạo route "A→B Express" 2. Tạo route "A→B Economy" (cùng stations) | Cùng origin+dest, khác name | Cả 2 tạo thành công (không có unique constraint trên cặp stations) | Medium | Edge Case |

### 5.12 API Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RT-API-01 | Routes | Management | GET /routes - pagination + join | Auth valid | 1. GET /rest/v1/routes?select=*,origin_station:stations!routes_origin_station_fk(id,name),destination_station:stations!routes_destination_station_fk(id,name)&limit=10&offset=0 | N/A | Status 200, data with joined stations, ordered by name ASC | High | API |
| TC-RT-API-02 | Routes | Management | GET /routes - search ilike | Auth valid | 1. GET /rest/v1/routes?name=ilike.*Hà Nội* | N/A | Trả routes có name chứa "Hà Nội" | High | API |
| TC-RT-API-03 | Routes | Management | GET /routes - filter is_active | Auth valid | 1. GET /rest/v1/routes?is_active=eq.true | N/A | Chỉ trả active routes | High | API |
| TC-RT-API-04 | Routes | Management | POST /routes - valid | Auth valid | 1. POST với estimated_duration="02:30:00" | N/A | Status 201, trả route object | High | API |
| TC-RT-API-05 | Routes | Management | POST /routes - duplicate name | Auth valid | 1. POST với name đã tồn tại | N/A | Status 409, code "23505" | High | API |
| TC-RT-API-06 | Routes | Management | DELETE /routes/:id - has trips | Auth valid | 1. DELETE route có trips | N/A | Status 409, code "23503" | High | API |
| TC-RT-API-07 | Routes | Management | DELETE /routes/:id - no FK | Auth valid | 1. DELETE route không có references | N/A | Status 204 | High | API |
| TC-RT-API-08 | Routes | Management | GET /routes - no auth | Không có token | 1. GET không auth | N/A | Status 401 | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Tên tuyến đường max length | Zod chỉ check min 1. DB column có limit? |
| 2 | Distance max value | Không có max validation. Có business limit (e.g. max 5000km)? |
| 3 | Duration max value | Không có max validation. Có limit hợp lý (e.g. max 72h)? |
| 4 | Base price max value | Không có max validation. Có cần cap? |
| 5 | Unique constraint trên cặp origin+destination | Hiện chỉ unique name. Có cần prevent duplicate station pairs? |
| 6 | "Lưu & Điểm dừng" ở edit mode | Hiện chỉ có ở create. Có cần thêm ở edit? |
| 7 | Inactive route → trips | Route inactive có block tạo trip mới không? (Hiện không validate) |
| 8 | Route name format | Có convention "Origin - Destination" hay free-text? |

---

## 7. Summary

| Priority | Count |
|----------|-------|
| Critical | 10 |
| High | 28 |
| Medium | 28 |
| Low | 16 |
| **Total** | **82** |

| Test Type | Count |
|-----------|-------|
| Functional | 38 |
| UI | 16 |
| Validation | 10 |
| Boundary | 4 |
| Negative | 4 |
| Error Handling | 5 |
| Security | 3 |
| Edge Case | 7 |
| API | 8 |
| Performance | 1 |
| Accessibility | 2 |