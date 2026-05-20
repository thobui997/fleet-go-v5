# Test Cases: FR-07 - Quản lý xe (Vehicles Management)

## 1. Feature List Detected

- Danh sách xe với phân trang, lọc theo trạng thái, tìm kiếm theo biển số
- Thêm xe mới (dialog form)
- Chỉnh sửa thông tin xe (dialog form)
- Xóa xe (dialog xác nhận)
- Hiển thị trạng thái xe (badge: active/maintenance/retired)
- Hiển thị loại xe (join vehicle_types)
- Quản lý thông tin bảo trì (last/next maintenance date)
- Serialization: empty → null cho optional fields

---

## 2. Feature Analysis

### Business Flow
1. Fleet Manager truy cập /vehicles → Danh sách xe (sắp xếp created_at DESC)
2. Lọc: status (active/maintenance/retired), search (biển số ilike)
3. Thêm xe:
   a. Click "Thêm xe" → Dialog form mở
   b. Chọn loại xe (dropdown từ vehicle_types, max 1000)
   c. Nhập biển số (required, auto uppercase), VIN (optional)
   d. Nhập năm SX, trạng thái, số km
   e. Nhập ngày bảo trì gần nhất / kế tiếp (cross-field validation)
   f. Submit → Insert vehicle → Toast success → Dialog đóng
4. Chỉnh sửa: Mở dialog pre-filled → Update → Toast success
5. Xóa: Dialog xác nhận → Delete → Toast success (FK constraint nếu đang dùng)

### Actor / Role
- Fleet Manager, Admin (theo SRS)
- Thực tế: Tất cả authenticated users (RBAC chưa enforce)

### Validation Rules (từ `vehicle-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| vehicle_type_id | required, UUID | "Vui lòng chọn loại xe" |
| license_plate | required, trim, min 1, max 20, transform uppercase | "Biển số xe không được để trống" / "Biển số xe quá dài" |
| vin_number | optional, trim, transform uppercase | - |
| year_manufactured | optional, int, min 1990, max currentYear+1 | "Năm sản xuất phải từ 1990" / "Năm sản xuất không hợp lệ" |
| status | enum: active/maintenance/retired | "Trạng thái không hợp lệ" |
| current_mileage | optional, int, min 0, max 10,000,000 | "Số km không được âm" / "Số km vượt quá giới hạn hợp lý" |
| last_maintenance_date | optional, regex YYYY-MM-DD | "Ngày không hợp lệ (YYYY-MM-DD)" |
| next_maintenance_date | optional, regex YYYY-MM-DD, >= last_maintenance_date | "Ngày không hợp lệ (YYYY-MM-DD)" / "Ngày bảo trì kế tiếp phải sau ngày bảo trì trước" |
| notes | optional | - |

### Error Messages (từ `mapSupabaseError`)
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- `23505` + `license_plate` → "Biển số xe đã tồn tại"
- `23505` + `vin_number` → "Số VIN đã tồn tại"
- `23505` (other) → "Giá trị đã tồn tại"
- `23503` → "Không thể xóa: xe đang được sử dụng ở chuyến đi hoặc lịch sử bảo trì"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc CHECK)"
- `22007` → "Định dạng ngày tháng không hợp lệ"
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Key Business Logic
- **license_plate:** Auto uppercase via Zod transform
- **vin_number:** Auto uppercase, empty → null
- **Serialization:** Empty strings → null cho tất cả optional fields (serializeToInsert)
- **Cross-field validation:** next_maintenance_date >= last_maintenance_date (superRefine)
- **Year upper bound:** Dynamic - currentYear + 1 (evaluated at validation time)
- **Vehicle types dropdown:** Limit 1000, warning nếu truncated
- **Status badge colors:** active=green, maintenance=amber, retired=secondary(gray)
- **Error display:** Toast (không phải inline) cho cả create/edit/delete errors

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có xe nào"
- **List Error:** "Không thể tải danh sách xe. Vui lòng thử lại." + nút "Thử lại"
- **Form - Loading types:** "Đang tải loại xe…" + Loader2
- **Form - No vehicle types:** "Chưa có loại xe — tạo loại xe trước ở /vehicle-types"
- **Form - Truncated types:** Warning "Hiển thị X / Y loại xe..."
- **Form - Submitting:** Button disabled + Loader2
- **Dialog lock:** Cannot close while isPending
- **Toast success create:** `Xe "{license_plate}" đã được thêm.`
- **Toast success edit:** `Xe "{license_plate}" đã được cập nhật.`
- **Toast success delete:** `Xe "{license_plate}" đã được xóa.`

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Biển số xe unique constraint ở DB level (không check client-side trước submit) | Confirm: có cần check realtime? |
| A2 | VIN number unique constraint ở DB level | Confirm: VIN có bắt buộc format 17 chars? |
| A3 | Không có state machine cho vehicle status (có thể chuyển tự do giữa 3 trạng thái) | Confirm: có business rule nào restrict transitions? |
| A4 | Mileage chỉ là input thủ công, không auto-update từ trips | Confirm với Dev |
| A5 | Xóa xe chỉ bị block bởi FK (trips, maintenance), không có soft-delete | Confirm: nên soft-delete (retired) thay vì hard-delete? |
| A6 | Không có validation rằng retired vehicle không thể assign cho trip | Confirm: business rule? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `vehicle-form-schema.ts:19` | license_plate transform uppercase | User nhập "51a-12345" → lưu "51A-12345". Nhưng unique check case-sensitive ở DB? Nếu DB có "51A-12345" và user nhập "51A-12345" → duplicate detected. Nhưng nếu DB collation case-insensitive thì OK. | TC-VEH-NEG-03 |
| `vehicle-form-schema.ts:57-68` | superRefine year upper bound | Dùng `new Date().getFullYear()` tại thời điểm validate. Nếu user mở form 31/12/2026 23:59 và submit 01/01/2027 00:01, upper bound thay đổi. Edge case nhỏ. | TC-VEH-EDGE-03 |
| `vehicle-form-schema.ts:71-79` | Cross-field next >= last | So sánh string "YYYY-MM-DD" trực tiếp (`next < last`). Hoạt động đúng vì ISO format sort lexicographically. Nhưng nếu format sai (e.g. "2024-13-01") thì regex đã catch trước. | TC-VEH-VAL-12 |
| `vehicle-form-dialog.tsx:84` | watchedStatus default 'active' | Khi tạo mới, status mặc định "active". Nhưng nếu user không thay đổi, form vẫn submit OK. | TC-VEH-FUNC-08 |
| `vehicle.api.ts:24` | search ilike license_plate | Không trim search input trước khi gọi API. Nếu user nhập " 51A " (spaces), ilike sẽ không match. Tuy nhiên useDebounce không trim. | TC-VEH-EDGE-04 |
| `vehicle-form-dialog.tsx:131-133` | mode='edit' nhưng vehicle=null | Guard `else if (vehicle)` ngăn crash, nhưng nếu xảy ra thì form submit không làm gì. | TC-VEH-EDGE-05 |
| `vehicle-delete-dialog.tsx` | Error hiển thị qua toast | Khác với Roles (inline error). Nếu toast auto-dismiss, user có thể miss error message. | TC-VEH-ERR-04 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Lọc

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-FUNC-01 | Vehicles | Management | Hiển thị danh sách xe | Có vehicles trong DB | 1. Truy cập /vehicles | - | DataTable hiển thị columns: Biển số (sortable), Loại xe, Năm SX, Trạng thái, Số km (sortable), Bảo trì kế tiếp, Tạo lúc, Actions. Sắp xếp created_at DESC. | Critical | Functional |
| TC-VEH-FUNC-02 | Vehicles | Management | Lọc theo trạng thái "Đang hoạt động" | Có vehicles nhiều status | 1. Chọn filter "Đang hoạt động" | status: active | Chỉ hiển thị vehicles có status = active, page reset về 1 | High | Functional |
| TC-VEH-FUNC-03 | Vehicles | Management | Lọc theo trạng thái "Đang bảo trì" | Có vehicles maintenance | 1. Chọn filter "Đang bảo trì" | status: maintenance | Chỉ hiển thị vehicles có status = maintenance | High | Functional |
| TC-VEH-FUNC-04 | Vehicles | Management | Lọc theo trạng thái "Đã ngừng sử dụng" | Có vehicles retired | 1. Chọn filter "Đã ngừng sử dụng" | status: retired | Chỉ hiển thị vehicles có status = retired | High | Functional |
| TC-VEH-FUNC-05 | Vehicles | Management | Lọc "Tất cả" | Đang filter active | 1. Chọn "Tất cả" | status: undefined | Hiển thị tất cả vehicles | Medium | Functional |
| TC-VEH-FUNC-06 | Vehicles | Management | Tìm kiếm theo biển số | Có nhiều vehicles | 1. Nhập "51A" vào ô tìm kiếm 2. Chờ 300ms debounce | search: "51A" | Hiển thị vehicles có license_plate chứa "51A" (ilike), page reset về 1 | High | Functional |
| TC-VEH-FUNC-07 | Vehicles | Management | Tìm kiếm - debounce 300ms | Có vehicles | 1. Nhập "51" 2. Ngay lập tức nhập "A" | search: "51A" | Chỉ gọi API 1 lần với "51A" sau 300ms từ lần gõ cuối | Medium | Performance |
| TC-VEH-FUNC-08 | Vehicles | Management | Tìm kiếm - không kết quả | Có vehicles | 1. Nhập "ZZZNOTEXIST" | search: "ZZZNOTEXIST" | Hiển thị "Chưa có xe nào" | Medium | Functional |
| TC-VEH-FUNC-09 | Vehicles | Management | Tìm kiếm - xóa keyword | Đang filter search | 1. Xóa hết text tìm kiếm 2. Chờ 300ms | search: undefined | Hiển thị lại toàn bộ vehicles | Medium | Functional |
| TC-VEH-FUNC-10 | Vehicles | Management | Kết hợp search + status filter | Có nhiều vehicles | 1. Nhập "51A" 2. Chọn "Đang hoạt động" | search: "51A", status: active | Chỉ hiển thị vehicles active có biển số chứa "51A" | High | Functional |
| TC-VEH-FUNC-11 | Vehicles | Management | Pagination - chuyển trang | Có >10 vehicles | 1. Click chuyển trang 2 | 15 vehicles | Trang 2 hiển thị 5 vehicles còn lại | High | Functional |
| TC-VEH-FUNC-12 | Vehicles | Management | Pagination - thay đổi pageSize | Có nhiều vehicles | 1. Đổi pageSize sang 20 | N/A | Hiển thị tối đa 20 items, page reset về 1 | Medium | Functional |
| TC-VEH-FUNC-13 | Vehicles | Management | Hiển thị loại xe từ join | Vehicle có vehicle_type linked | 1. Xem danh sách | vehicle_type.name: "Xe 45 chỗ" | Cột Loại xe hiển thị "Xe 45 chỗ" | High | Functional |
| TC-VEH-FUNC-14 | Vehicles | Management | Hiển thị loại xe null | Vehicle có vehicle_type = null | 1. Xem danh sách | vehicle_type: null | Cột Loại xe hiển thị "—" | Low | UI |
| TC-VEH-FUNC-15 | Vehicles | Management | Hiển thị số km format vi-VN | Vehicle có current_mileage | 1. Xem danh sách | current_mileage: 150000 | Hiển thị "150.000" (toLocaleString vi-VN) | Medium | UI |
| TC-VEH-FUNC-16 | Vehicles | Management | Hiển thị số km null | Vehicle có current_mileage = null | 1. Xem danh sách | current_mileage: null | Hiển thị "—" | Low | UI |
| TC-VEH-FUNC-17 | Vehicles | Management | Hiển thị năm SX null | Vehicle có year_manufactured = null | 1. Xem danh sách | year_manufactured: null | Hiển thị "—" | Low | UI |

### 5.2 Functional Tests - Thêm xe

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-FUNC-18 | Vehicles | Management | Mở dialog thêm xe mới | Đã đăng nhập | 1. Click "Thêm xe" | N/A | Dialog mở với title "Thêm xe mới", form trống, status default "active" | High | Functional |
| TC-VEH-FUNC-19 | Vehicles | Management | Thêm xe thành công - đầy đủ thông tin | Dialog tạo mới, có vehicle_types | 1. Chọn loại xe 2. Nhập biển số "51A-12345" 3. Nhập VIN "WVWZZZ3CZWE123456" 4. Nhập năm 2022 5. Giữ status "active" 6. Nhập km 15000 7. Chọn ngày bảo trì 8. Click "Thêm" | Đầy đủ fields | Toast: `Xe "51A-12345" đã được thêm.`, dialog đóng, danh sách refresh | Critical | Functional |
| TC-VEH-FUNC-20 | Vehicles | Management | Thêm xe - minimum (chỉ required fields) | Dialog tạo mới | 1. Chọn loại xe 2. Nhập biển số "30A-99999" 3. Click "Thêm" | vehicle_type_id: valid, license_plate: "30A-99999", status: "active" | Tạo thành công. Optional fields gửi API = null | Critical | Functional |
| TC-VEH-FUNC-21 | Vehicles | Management | Biển số auto uppercase | Dialog tạo mới | 1. Nhập biển số "51a-12345" (lowercase) 2. Submit | license_plate input: "51a-12345" | Lưu thành "51A-12345" (Zod transform uppercase) | High | Functional |
| TC-VEH-FUNC-22 | Vehicles | Management | VIN auto uppercase | Dialog tạo mới | 1. Nhập VIN "wvwzzz3czwe123456" 2. Submit | vin_number: "wvwzzz3czwe123456" | Lưu thành "WVWZZZ3CZWE123456" | Medium | Functional |
| TC-VEH-FUNC-23 | Vehicles | Management | VIN empty → null | Dialog tạo mới | 1. Để trống VIN 2. Submit | vin_number: "" | Gửi API vin_number = null | Medium | Functional |
| TC-VEH-FUNC-24 | Vehicles | Management | Notes empty → null | Dialog tạo mới | 1. Để trống notes 2. Submit | notes: "" | Gửi API notes = null | Low | Functional |
| TC-VEH-FUNC-25 | Vehicles | Management | Notes chỉ spaces → null | Dialog tạo mới | 1. Nhập "   " vào notes 2. Submit | notes: "   " | Gửi API notes = null (trim → empty → null) | Low | Functional |

### 5.3 Functional Tests - Chỉnh sửa xe

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-FUNC-26 | Vehicles | Management | Mở dialog chỉnh sửa | Có vehicle trong danh sách | 1. Click MoreHorizontal 2. Click "Chỉnh sửa" | N/A | Dialog mở với title "Chỉnh sửa xe", form pre-filled với dữ liệu vehicle hiện tại | High | Functional |
| TC-VEH-FUNC-27 | Vehicles | Management | Cập nhật xe thành công | Dialog edit đang mở | 1. Sửa số km thành 20000 2. Click "Lưu" | current_mileage: 20000 | Toast: `Xe "51A-12345" đã được cập nhật.`, dialog đóng, danh sách refresh | Critical | Functional |
| TC-VEH-FUNC-28 | Vehicles | Management | Edit pre-fill null fields | Vehicle có optional fields = null | 1. Mở edit dialog | year_manufactured: null, vin_number: null | Form hiển thị fields trống (null → '' via reset) | Medium | Functional |
| TC-VEH-FUNC-29 | Vehicles | Management | Đổi trạng thái xe | Dialog edit, vehicle active | 1. Đổi status sang "Đang bảo trì" 2. Click "Lưu" | status: "maintenance" | Cập nhật thành công, badge đổi sang amber "Đang bảo trì" | High | Functional |
| TC-VEH-FUNC-30 | Vehicles | Management | Đổi loại xe | Dialog edit | 1. Chọn loại xe khác 2. Click "Lưu" | vehicle_type_id: new UUID | Cập nhật thành công, cột Loại xe hiển thị tên mới | Medium | Functional |

### 5.4 Functional Tests - Xóa xe

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-FUNC-31 | Vehicles | Management | Mở dialog xóa xe | Có vehicle trong danh sách | 1. Click MoreHorizontal 2. Click "Xóa" | N/A | Dialog "Xác nhận xóa" hiển thị biển số xe trong warning text | High | Functional |
| TC-VEH-FUNC-32 | Vehicles | Management | Xóa xe thành công | Dialog xóa đang mở, xe không có FK | 1. Click "Xóa" | N/A | Toast: `Xe "51A-12345" đã được xóa.`, dialog đóng, xe biến mất khỏi danh sách | Critical | Functional |
| TC-VEH-FUNC-33 | Vehicles | Management | Hủy xóa xe | Dialog xóa đang mở | 1. Click "Hủy" | N/A | Dialog đóng, xe vẫn còn trong danh sách | Medium | Functional |
| TC-VEH-FUNC-34 | Vehicles | Management | Xóa xe đang được sử dụng (FK constraint) | Xe có trips hoặc maintenance records | 1. Click "Xóa" | API trả code: "23503" | Toast error: "Không thể xóa: xe đang được sử dụng ở chuyến đi hoặc lịch sử bảo trì" | Critical | Negative |

### 5.5 Status Badge Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-FUNC-35 | Vehicles | Management | Badge "Đang hoạt động" | Vehicle status=active | 1. Xem danh sách | status: "active" | Badge xanh (green) "Đang hoạt động" | Medium | UI |
| TC-VEH-FUNC-36 | Vehicles | Management | Badge "Đang bảo trì" | Vehicle status=maintenance | 1. Xem danh sách | status: "maintenance" | Badge vàng (amber) "Đang bảo trì" | Medium | UI |
| TC-VEH-FUNC-37 | Vehicles | Management | Badge "Đã ngừng sử dụng" | Vehicle status=retired | 1. Xem danh sách | status: "retired" | Badge xám (secondary) "Đã ngừng sử dụng" | Medium | UI |

### 5.6 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-VAL-01 | Vehicles | Management | Submit không chọn loại xe | Dialog form mở | 1. Không chọn loại xe 2. Nhập biển số 3. Submit | vehicle_type_id: "" | Validation error: "Vui lòng chọn loại xe" | Critical | Validation |
| TC-VEH-VAL-02 | Vehicles | Management | Submit biển số trống | Dialog form mở | 1. Chọn loại xe 2. Để trống biển số 3. Submit | license_plate: "" | Validation error: "Biển số xe không được để trống" | Critical | Validation |
| TC-VEH-VAL-03 | Vehicles | Management | Biển số vượt 20 ký tự | Dialog form mở | 1. Nhập biển số 21 ký tự 2. Submit | license_plate: "A" * 21 | Validation error: "Biển số xe quá dài" | High | Validation |
| TC-VEH-VAL-04 | Vehicles | Management | Biển số đúng 20 ký tự (boundary) | Dialog form mở | 1. Nhập biển số đúng 20 ký tự 2. Submit | license_plate: "A" * 20 | Validation pass | Medium | Boundary |
| TC-VEH-VAL-05 | Vehicles | Management | Biển số 1 ký tự (boundary min) | Dialog form mở | 1. Nhập biển số "A" 2. Submit | license_plate: "A" | Validation pass (min 1 satisfied) | Low | Boundary |
| TC-VEH-VAL-06 | Vehicles | Management | Năm sản xuất < 1990 | Dialog form mở | 1. Nhập năm 1989 2. Submit | year_manufactured: 1989 | Validation error: "Năm sản xuất phải từ 1990" | High | Validation |
| TC-VEH-VAL-07 | Vehicles | Management | Năm sản xuất = 1990 (boundary min) | Dialog form mở | 1. Nhập năm 1990 2. Submit | year_manufactured: 1990 | Validation pass | Medium | Boundary |
| TC-VEH-VAL-08 | Vehicles | Management | Năm sản xuất = currentYear + 1 (boundary max) | Dialog form mở | 1. Nhập năm 2027 (nếu current=2026) 2. Submit | year_manufactured: currentYear + 1 | Validation pass (max = currentYear + 1) | Medium | Boundary |
| TC-VEH-VAL-09 | Vehicles | Management | Năm sản xuất > currentYear + 1 | Dialog form mở | 1. Nhập năm 2028 (nếu current=2026) 2. Submit | year_manufactured: currentYear + 2 | Validation error: "Năm sản xuất không hợp lệ" | High | Validation |
| TC-VEH-VAL-10 | Vehicles | Management | Số km âm | Dialog form mở | 1. Nhập km = -1 2. Submit | current_mileage: -1 | Validation error: "Số km không được âm" | High | Validation |
| TC-VEH-VAL-11 | Vehicles | Management | Số km = 0 (boundary min) | Dialog form mở | 1. Nhập km = 0 2. Submit | current_mileage: 0 | Validation pass | Medium | Boundary |
| TC-VEH-VAL-12 | Vehicles | Management | Số km = 10,000,000 (boundary max) | Dialog form mở | 1. Nhập km = 10000000 2. Submit | current_mileage: 10000000 | Validation pass | Medium | Boundary |
| TC-VEH-VAL-13 | Vehicles | Management | Số km > 10,000,000 | Dialog form mở | 1. Nhập km = 10000001 2. Submit | current_mileage: 10000001 | Validation error: "Số km vượt quá giới hạn hợp lý" | High | Validation |
| TC-VEH-VAL-14 | Vehicles | Management | Ngày bảo trì format sai | Dialog form mở | 1. Nhập last_maintenance_date "15-03-2024" 2. Submit | last_maintenance_date: "15-03-2024" | Validation error: "Ngày không hợp lệ (YYYY-MM-DD)" | Medium | Validation |
| TC-VEH-VAL-15 | Vehicles | Management | Cross-field: next < last maintenance date | Dialog form mở | 1. Nhập last = "2024-06-01" 2. Nhập next = "2024-05-01" 3. Submit | last: "2024-06-01", next: "2024-05-01" | Validation error: "Ngày bảo trì kế tiếp phải sau ngày bảo trì trước" | High | Validation |
| TC-VEH-VAL-16 | Vehicles | Management | Cross-field: next = last (boundary) | Dialog form mở | 1. Nhập last = "2024-06-01" 2. Nhập next = "2024-06-01" 3. Submit | last: "2024-06-01", next: "2024-06-01" | Validation pass (next >= last, "2024-06-01" is NOT < "2024-06-01") | Medium | Boundary |
| TC-VEH-VAL-17 | Vehicles | Management | Cross-field: next > last (valid) | Dialog form mở | 1. Nhập last = "2024-06-01" 2. Nhập next = "2024-12-01" 3. Submit | last: "2024-06-01", next: "2024-12-01" | Validation pass | Medium | Boundary |
| TC-VEH-VAL-18 | Vehicles | Management | Cross-field: chỉ có next, không có last | Dialog form mở | 1. Để trống last 2. Nhập next = "2024-12-01" 3. Submit | last: "", next: "2024-12-01" | Validation pass (cross-field chỉ check khi cả 2 có giá trị) | Low | Boundary |

### 5.7 Negative Tests - Unique Constraints

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-NEG-01 | Vehicles | Management | Biển số xe trùng | Đã có xe "51A-12345" | 1. Thêm xe mới với biển số "51A-12345" 2. Submit | license_plate: "51A-12345" (duplicate) | Toast error: "Biển số xe đã tồn tại" | Critical | Negative |
| TC-VEH-NEG-02 | Vehicles | Management | Số VIN trùng | Đã có xe với VIN "WVWZZZ3CZWE123456" | 1. Thêm xe mới với cùng VIN 2. Submit | vin_number: "WVWZZZ3CZWE123456" (duplicate) | Toast error: "Số VIN đã tồn tại" | High | Negative |
| TC-VEH-NEG-03 | Vehicles | Management | Biển số trùng case-insensitive | Đã có "51A-12345" | 1. Nhập "51a-12345" (lowercase) 2. Submit | license_plate: "51a-12345" → transform "51A-12345" | Toast error: "Biển số xe đã tồn tại" (uppercase transform → match existing) | High | Negative |
| TC-VEH-NEG-04 | Vehicles | Management | Check constraint violation | Dialog form mở | 1. Submit data vi phạm DB check constraint | API trả code: "23514" | Toast error: "Dữ liệu không hợp lệ (vi phạm ràng buộc CHECK)" | Medium | Negative |
| TC-VEH-NEG-05 | Vehicles | Management | Invalid date format từ API | Dialog form mở | 1. Submit date format sai (bypass client) | API trả code: "22007" | Toast error: "Định dạng ngày tháng không hợp lệ" | Low | Negative |

### 5.8 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-UI-01 | Vehicles | Management | List loading state | Đang tải dữ liệu | 1. Truy cập trang khi đang load | N/A | DataTable hiển thị skeleton/loading indicator | Medium | UI |
| TC-VEH-UI-02 | Vehicles | Management | List empty state | Không có vehicles | 1. Truy cập trang | N/A | Hiển thị "Chưa có xe nào" | Medium | UI |
| TC-VEH-UI-03 | Vehicles | Management | List error state | API lỗi | 1. Truy cập trang khi API fail | N/A | Hiển thị "Không thể tải danh sách xe. Vui lòng thử lại." + nút "Thử lại" | Medium | UI |
| TC-VEH-UI-04 | Vehicles | Management | Retry khi lỗi | Error state hiển thị | 1. Click "Thử lại" | N/A | Gọi lại API, hiển thị dữ liệu nếu thành công | Medium | Functional |
| TC-VEH-UI-05 | Vehicles | Management | Vehicle types dropdown loading | Dialog mở, types đang load | 1. Mở dialog khi vehicle_types đang tải | N/A | Hiển thị "Đang tải loại xe…" + Loader2 icon | Medium | UI |
| TC-VEH-UI-06 | Vehicles | Management | Vehicle types dropdown empty | Không có vehicle_types | 1. Mở dropdown loại xe | vehicleTypes: [] | Hiển thị "Chưa có loại xe — tạo loại xe trước ở /vehicle-types" | High | UI |
| TC-VEH-UI-07 | Vehicles | Management | Vehicle types truncation warning | >1000 vehicle_types | 1. Mở dialog khi count > displayed | vehicleTypesCount > vehicleTypes.length | Warning: "Hiển thị X / Y loại xe. Liên hệ quản trị viên..." | Low | UI |
| TC-VEH-UI-08 | Vehicles | Management | Form submitting state | Form đang submit | 1. Click "Thêm" 2. Quan sát UI | N/A | Button "Thêm" disabled + Loader2, button "Hủy" disabled | High | UI |
| TC-VEH-UI-09 | Vehicles | Management | Dialog không đóng khi đang submit | isPending = true | 1. Click overlay hoặc Escape khi đang submit | N/A | Dialog không đóng | Medium | UI |
| TC-VEH-UI-10 | Vehicles | Management | Form reset khi mở dialog tạo mới | Vừa đóng dialog edit | 1. Click "Thêm xe" | N/A | Form reset: tất cả trống, status = "active" | Medium | Functional |
| TC-VEH-UI-11 | Vehicles | Management | Form reset khi mở dialog edit | Vừa đóng dialog tạo | 1. Click "Chỉnh sửa" trên vehicle | N/A | Form pre-filled với dữ liệu vehicle, null → '' | Medium | Functional |
| TC-VEH-UI-12 | Vehicles | Management | Placeholder texts | Dialog tạo mới | 1. Quan sát placeholders | N/A | Biển số: "VD: 51A-12345", VIN: "Tùy chọn", Năm SX: "VD: 2022", Km: "VD: 15000", Notes: "Ghi chú về xe..." | Low | UI |
| TC-VEH-UI-13 | Vehicles | Management | Input font-mono uppercase cho biển số và VIN | Dialog form | 1. Quan sát styling | N/A | Biển số và VIN inputs có class "font-mono uppercase" | Low | UI |
| TC-VEH-UI-14 | Vehicles | Management | Header và subtitle trang | Đã đăng nhập | 1. Truy cập trang | N/A | h1 "Xe", subtitle "Quản lý danh sách xe trong đội xe" | Low | UI |
| TC-VEH-UI-15 | Vehicles | Management | Search placeholder | Trang danh sách | 1. Quan sát ô tìm kiếm | N/A | Placeholder: "Tìm theo biển số…" | Low | UI |
| TC-VEH-UI-16 | Vehicles | Management | Delete dialog warning text | Dialog xóa mở | 1. Quan sát nội dung | vehicle.license_plate: "51A-12345" | Hiển thị: "Bạn có chắc chắn muốn xóa xe **51A-12345**? Thao tác này không thể hoàn tác." | Medium | UI |
| TC-VEH-UI-17 | Vehicles | Management | Form sections layout | Dialog form mở | 1. Quan sát layout | N/A | 2 sections: "Thông tin xe" (loại xe, biển số/VIN 2-col, năm/status 2-col) và "Vận hành & Bảo trì" (km, dates 2-col, notes) | Low | UI |
| TC-VEH-UI-18 | Vehicles | Management | Accessibility - sr-only cho actions button | Trang danh sách | 1. Focus actions button | N/A | Screen reader đọc "Mở menu" | Low | Accessibility |

### 5.9 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-ERR-01 | Vehicles | Management | Session expired khi thêm xe | Token hết hạn | 1. Fill form 2. Submit | API trả status: 401 | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-VEH-ERR-02 | Vehicles | Management | Session expired khi xóa xe | Token hết hạn | 1. Click "Xóa" trong dialog | API trả code: "PGRST301" | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-VEH-ERR-03 | Vehicles | Management | Lỗi không xác định khi submit | API trả lỗi unknown | 1. Submit form | API trả error không mapped | Toast error: "Thao tác thất bại. Vui lòng thử lại." | Medium | Error Handling |
| TC-VEH-ERR-04 | Vehicles | Management | Error toast auto-dismiss | Lỗi xảy ra | 1. Trigger error 2. Quan sát toast | N/A | Toast error hiển thị (variant: destructive). Nếu auto-dismiss, user có thể miss message. | Low | UI |
| TC-VEH-ERR-05 | Vehicles | Management | Network error khi submit | Mất kết nối | 1. Tắt network 2. Submit form | N/A | Toast error hiển thị, form vẫn mở (dialog không đóng khi error) | Medium | Error Handling |

### 5.10 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-SEC-01 | Vehicles | Management | Truy cập /vehicles khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /vehicles | N/A | Redirect về /login | Critical | Security |
| TC-VEH-SEC-02 | Vehicles | Management | XSS qua license_plate | Dialog form | 1. Nhập `<script>alert(1)</script>` vào biển số 2. Submit | license_plate: script tag | Data lưu text (uppercase transform), hiển thị escaped. Không execute. | High | Security |
| TC-VEH-SEC-03 | Vehicles | Management | XSS qua notes | Dialog form | 1. Nhập HTML vào notes 2. Submit | notes: `<img src=x onerror=alert(1)>` | Data lưu text, hiển thị escaped | Medium | Security |
| TC-VEH-SEC-04 | Vehicles | Management | SQL injection qua search | Trang danh sách | 1. Nhập SQL injection vào search | search: `'; DROP TABLE vehicles; --` | Supabase parameterized query ngăn injection. Trả 0 results. | High | Security |
| TC-VEH-SEC-05 | Vehicles | Management | Permission 403 khi thêm xe | User không có quyền | 1. Submit form tạo xe | API trả status: 403 | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Security |

### 5.11 Edge Case Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-EDGE-01 | Vehicles | Management | Double-click "Thêm" button | Form valid | 1. Double-click nhanh button "Thêm" | N/A | Chỉ 1 vehicle được tạo (button disabled khi isPending) | High | Functional |
| TC-VEH-EDGE-02 | Vehicles | Management | Biển số chỉ spaces | Dialog form | 1. Nhập "   " vào biển số 2. Submit | license_plate: "   " | Validation error: "Biển số xe không được để trống" (trim → empty → min 1 fail) | Medium | Edge Case |
| TC-VEH-EDGE-03 | Vehicles | Management | Năm SX boundary tại thời điểm giao năm | Form mở 31/12/2026 | 1. Nhập năm 2028 2. Submit lúc 00:01 ngày 01/01/2027 | year_manufactured: 2028 | Validation pass (currentYear=2027, max=2028). Behavior phụ thuộc thời điểm validate. | Low | Edge Case |
| TC-VEH-EDGE-04 | Vehicles | Management | Search với spaces đầu/cuối | Trang danh sách | 1. Nhập " 51A " (có spaces) | search: " 51A " | API gọi ilike "% 51A %" - có thể không match. Không trim search input. | Medium | Edge Case |
| TC-VEH-EDGE-05 | Vehicles | Management | Edit mode nhưng vehicle = null (race condition) | Lỗi state | 1. Trigger edit mode khi vehicle chưa set | mode: "edit", vehicle: null | Form submit không làm gì (guard `else if (vehicle)`) | Low | Edge Case |
| TC-VEH-EDGE-06 | Vehicles | Management | Biển số với ký tự đặc biệt | Dialog form | 1. Nhập "51A-123.45" (có dấu chấm) 2. Submit | license_plate: "51A-123.45" | Tạo thành công (không có format validation, chỉ check length) | Low | Edge Case |
| TC-VEH-EDGE-07 | Vehicles | Management | Số km = số thập phân | Dialog form | 1. Nhập km = 15000.5 | current_mileage: 15000.5 | Validation error (int() requires integer) hoặc coerce thành 15000 | Medium | Edge Case |
| TC-VEH-EDGE-08 | Vehicles | Management | Năm SX = số thập phân | Dialog form | 1. Nhập năm = 2022.5 | year_manufactured: 2022.5 | Validation error (int() requires integer) | Low | Edge Case |

### 5.12 API Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-VEH-API-01 | Vehicles | Management | GET /vehicles - pagination | Auth valid | 1. GET /rest/v1/vehicles?limit=10&offset=0&select=*,vehicle_type:vehicle_types(id,name) | N/A | Status 200, data array + count header, ordered by created_at DESC | High | API |
| TC-VEH-API-02 | Vehicles | Management | GET /vehicles - filter by status | Auth valid | 1. GET /rest/v1/vehicles?status=eq.active | N/A | Chỉ trả vehicles active | High | API |
| TC-VEH-API-03 | Vehicles | Management | GET /vehicles - search ilike | Auth valid | 1. GET /rest/v1/vehicles?license_plate=ilike.*51A* | N/A | Trả vehicles có biển số chứa "51A" | High | API |
| TC-VEH-API-04 | Vehicles | Management | POST /vehicles - valid payload | Auth valid | 1. POST với đầy đủ required fields | N/A | Status 201, trả vehicle object với id, created_at | High | API |
| TC-VEH-API-05 | Vehicles | Management | POST /vehicles - duplicate license_plate | Auth valid | 1. POST với license_plate đã tồn tại | N/A | Status 409, code "23505", message chứa "license_plate" | High | API |
| TC-VEH-API-06 | Vehicles | Management | PATCH /vehicles/:id - update | Auth valid | 1. PATCH với fields cần update | N/A | Status 200, trả updated vehicle | High | API |
| TC-VEH-API-07 | Vehicles | Management | DELETE /vehicles/:id - no FK | Auth valid | 1. DELETE vehicle không có references | N/A | Status 204 (no content) | High | API |
| TC-VEH-API-08 | Vehicles | Management | DELETE /vehicles/:id - has FK | Auth valid | 1. DELETE vehicle có trips/maintenance | N/A | Status 409, code "23503" | High | API |
| TC-VEH-API-09 | Vehicles | Management | GET /vehicles - no auth | Không có token | 1. GET /rest/v1/vehicles không auth | N/A | Status 401 | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Validate biển số xe format (VD: 51A-12345) | Code chỉ check length 1-20, không validate format. Cần confirm có cần regex pattern? |
| 2 | VIN number format (17 chars, alphanumeric) | Code chỉ uppercase transform, không validate format chuẩn VIN. Cần confirm? |
| 3 | Vehicle status transitions | Hiện cho phép chuyển tự do giữa 3 status. Có business rule nào restrict (e.g. retired → active cần approval)? |
| 4 | Retired vehicle assign cho trip | Không có validation ngăn assign retired vehicle cho trip mới. Cần confirm business rule? |
| 5 | Mileage auto-update từ trips | Hiện mileage là input thủ công. Có cần auto-calculate từ trip distances? |
| 6 | Maintenance date alerts/notifications | Có cần notification khi next_maintenance_date sắp đến? Hiện chỉ hiển thị trong list. |
| 7 | Soft-delete vs hard-delete | Hiện dùng hard-delete (bị block bởi FK). Có nên dùng soft-delete (set retired) thay vì xóa? |
| 8 | Biển số xe unique scope | Unique constraint là global. Có cần phân biệt theo region/branch? |

---

## 7. Summary

| Priority | Count |
|----------|-------|
| Critical | 10 |
| High | 30 |
| Medium | 30 |
| Low | 18 |
| **Total** | **88** |

| Test Type | Count |
|-----------|-------|
| Functional | 34 |
| UI | 18 |
| Validation | 12 |
| Boundary | 8 |
| Negative | 5 |
| Error Handling | 5 |
| Security | 5 |
| Edge Case | 7 |
| API | 9 |
| Performance | 1 |
| Accessibility | 1 |
