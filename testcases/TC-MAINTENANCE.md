# Test Cases: FR-09 - Quản lý bảo trì (Maintenance Management)

## 1. Feature List Detected

- Danh sách lịch sử bảo trì với phân trang, lọc theo xe và loại bảo trì
- Thêm bản ghi bảo trì mới (full page form)
- Chỉnh sửa bản ghi bảo trì (full page form)
- Xóa bản ghi bảo trì (dialog xác nhận)
- Hiển thị loại bảo trì (badge: routine/repair/inspection/emergency)
- Cross-field validation (next_due_date >= performed_at)
- Dirty-state navigation blocker (useBlocker)
- Serialization: empty → null/0 cho optional fields

---

## 2. Feature Analysis

### Business Flow
1. Fleet Manager truy cập /maintenance → Danh sách bảo trì (sắp xếp performed_at DESC)
2. Lọc: vehicle (dropdown từ vehicles list), type (routine/repair/inspection/emergency)
3. Thêm bảo trì:
   a. Click "Thêm bảo trì" → Navigate đến /maintenance/new
   b. Chọn xe (required, dropdown max 1000)
   c. Chọn loại bảo trì (required, enum)
   d. Nhập mô tả (required), chi phí, người thực hiện
   e. Chọn ngày thực hiện (required, default today), ngày bảo trì kế tiếp
   f. Nhập số km đồng hồ, ghi chú
   g. Submit → Insert → Toast → Redirect về /maintenance
4. Chỉnh sửa: Navigate đến /maintenance/:id/edit → Form pre-filled → Update
5. Xóa: Dialog xác nhận → Delete → Toast

### Actor / Role
- Fleet Manager, Admin (theo SRS)
- Thực tế: Tất cả authenticated users

### Validation Rules (từ `maintenance-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| vehicle_id | required, UUID | "Vui lòng chọn xe" |
| type | enum: routine/repair/inspection/emergency | "Loại bảo trì không hợp lệ" |
| description | required, min 1 | "Mô tả không được để trống" |
| cost | optional, number, min 0, max 999,999,999.99 | "Chi phí không được âm" / "Chi phí vượt quá giới hạn" |
| performed_by | optional string | - |
| performed_at | required, regex YYYY-MM-DD | "Ngày không hợp lệ (YYYY-MM-DD)" |
| next_due_date | optional, regex YYYY-MM-DD, >= performed_at | "Ngày không hợp lệ (YYYY-MM-DD)" / "Ngày bảo trì kế tiếp phải sau ngày thực hiện" |
| odometer_reading | optional, int, min 0, max 10,000,000 | "Số km không được âm" / "Số km vượt quá giới hạn" |
| notes | optional string | - |

### Error Messages (từ `mapSupabaseError`)
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc CHECK)"
- `23503` → "Xe không tồn tại hoặc đã bị xóa"
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Fetch Error Mapping (`mapFetchError` - form page)
- `PGRST116/406` → "Không tìm thấy bản ghi bảo trì."
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- Default → "Không thể tải bản ghi. Vui lòng thử lại."

### Key Business Logic
- **cost serialization:** empty/undefined → 0 (not null)
- **performed_by:** empty/spaces → null
- **next_due_date:** empty → null
- **odometer_reading:** empty/undefined → null
- **notes:** empty/spaces → null
- **performed_at default:** today (new Date().toISOString().split('T')[0])
- **type default:** 'routine'
- **Description truncation in list:** >60 chars → slice(0,60) + '…'
- **Delete dialog:** Shows first 50 chars of description
- **Vehicle filter dropdown:** Loads all vehicles (max 1000)
- **No text search:** Unlike other features, no search input
- **Sort order:** performed_at DESC
- **Error display:** Toast (not inline) for submit errors

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có lịch sử bảo trì"
- **List Error:** "Không thể tải danh sách bảo trì. Vui lòng thử lại." + nút "Thử lại"
- **Form - Loading vehicles:** "Đang tải danh sách xe…" + Loader2
- **Form - No vehicles:** "Chưa có xe — tạo xe trước ở mục Xe"
- **Form - Truncated vehicles:** Warning "Hiển thị X / Y xe..."
- **Form - Edit loading:** Skeleton placeholders
- **Form - Edit error:** Error message + "Quay lại danh sách" button
- **Form - Submitting:** Button disabled + Loader2
- **Dirty-state blocker:** "Thoát mà không lưu?" / "Ở lại" / "Thoát"
- **Toast success:** "Đã tạo lịch bảo trì" / "Đã cập nhật lịch bảo trì" / "Đã xóa lịch bảo trì"

### Type Badge Config
- routine → "Bảo trì định kỳ" (variant: default/blue)
- repair → "Sửa chữa" (variant: secondary)
- inspection → "Kiểm định" (variant: outline)
- emergency → "Khẩn cấp" (variant: destructive/red)

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Một xe có thể có nhiều bản ghi bảo trì (1:N relationship) | Confirm: có limit? |
| A2 | Không có unique constraint trên maintenance_logs (có thể tạo duplicate) | Confirm: intentional? |
| A3 | cost default = 0 khi không nhập (không phải null) | Confirm: business rule? |
| A4 | Không validate odometer_reading phải >= vehicle.current_mileage | Confirm: có cần? |
| A5 | Không auto-update vehicle.last_maintenance_date khi tạo maintenance log | Confirm: có cần sync? |
| A6 | Không auto-update vehicle.next_maintenance_date từ next_due_date | Confirm: có cần sync? |
| A7 | Xóa maintenance log không có FK constraint (luôn thành công) | Confirm: có cascade nào? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `maintenance-form-schema.ts:99` | cost empty → 0 | Nếu user không nhập cost, API nhận 0 thay vì null. Hiển thị "0 VND" trong list. Có thể confuse user (0 = free vs unknown). | TC-MT-EDGE-01 |
| `maintenance-page.tsx:92-93` | description truncate 60 chars | Nếu description chứa multi-byte chars (Vietnamese), slice(0,60) có thể cắt giữa ký tự. Tuy nhiên JS string slice hoạt động trên code points nên OK. | TC-MT-FUNC-09 |
| `maintenance-delete-dialog.tsx:63` | description?.slice(0,50) | Nếu log.description = undefined (shouldn't happen vì required), hiển thị empty. Optional chaining guard OK. | TC-MT-EDGE-05 |
| `maintenance-form-page.tsx:83` | today = new Date().toISOString().split('T')[0] | Timezone issue: toISOString() dùng UTC. Nếu user ở UTC+7, lúc 00:00-06:59 local → today sẽ là ngày hôm trước. | TC-MT-EDGE-02 |
| `maintenance-page.tsx:65-68` | Vehicle filter loads ALL vehicles (max 1000) | Nếu có >1000 vehicles, dropdown không hiển thị hết. Không có warning trên list page (chỉ có trên form page). | TC-MT-EDGE-03 |
| `maintenance-form-page.tsx:161` | showForm logic | mode='create' luôn show form. mode='edit' chỉ show khi !isLoading && !isError. Nếu edit mode và data chưa load, form ẩn. | TC-MT-UI-05 |
| `maintenance-page.tsx` | Không có search input | Khác với vehicles/employees có search. User không thể tìm theo description hoặc performed_by. | TC-MT-FUNC-10 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Lọc

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-FUNC-01 | Maintenance | Management | Hiển thị danh sách bảo trì | Có maintenance_logs trong DB | 1. Truy cập /maintenance | - | DataTable hiển thị columns: Xe, Loại, Mô tả, Chi phí (sortable), Người thực hiện, Ngày thực hiện (sortable), Bảo trì kế tiếp, Actions. Sắp xếp performed_at DESC. | Critical | Functional |
| TC-MT-FUNC-02 | Maintenance | Management | Lọc theo xe | Có logs nhiều xe | 1. Chọn xe "51A-12345" trong dropdown | vehicleId: vehicle.id | Chỉ hiển thị logs của xe "51A-12345", page reset về 1 | High | Functional |
| TC-MT-FUNC-03 | Maintenance | Management | Lọc theo loại "Bảo trì định kỳ" | Có logs nhiều loại | 1. Chọn "Bảo trì định kỳ" | type: "routine" | Chỉ hiển thị logs có type = routine | High | Functional |
| TC-MT-FUNC-04 | Maintenance | Management | Lọc theo loại "Sửa chữa" | Có logs nhiều loại | 1. Chọn "Sửa chữa" | type: "repair" | Chỉ hiển thị logs có type = repair | High | Functional |
| TC-MT-FUNC-05 | Maintenance | Management | Lọc theo loại "Kiểm định" | Có logs | 1. Chọn "Kiểm định" | type: "inspection" | Chỉ hiển thị logs có type = inspection | Medium | Functional |
| TC-MT-FUNC-06 | Maintenance | Management | Lọc theo loại "Khẩn cấp" | Có logs | 1. Chọn "Khẩn cấp" | type: "emergency" | Chỉ hiển thị logs có type = emergency | Medium | Functional |
| TC-MT-FUNC-07 | Maintenance | Management | Kết hợp filter xe + loại | Có nhiều logs | 1. Chọn xe "51A-12345" 2. Chọn "Sửa chữa" | vehicleId + type: "repair" | Chỉ hiển thị logs sửa chữa của xe 51A-12345 | High | Functional |
| TC-MT-FUNC-08 | Maintenance | Management | Reset filter về "Tất cả" | Đang filter | 1. Chọn "Tất cả xe" 2. Chọn "Tất cả loại" | vehicleId: undefined, type: undefined | Hiển thị tất cả logs | Medium | Functional |
| TC-MT-FUNC-09 | Maintenance | Management | Mô tả bị truncate >60 ký tự | Log có description dài | 1. Xem danh sách | description: "A" * 80 | Cột Mô tả hiển thị 60 ký tự đầu + "…" | Medium | UI |
| TC-MT-FUNC-10 | Maintenance | Management | Không có search input | Trang danh sách | 1. Quan sát filters | N/A | Chỉ có 2 dropdown filters (xe, loại). KHÔNG có ô tìm kiếm text. | Low | UI |
| TC-MT-FUNC-11 | Maintenance | Management | Hiển thị chi phí format vi-VN | Log có cost | 1. Xem danh sách | cost: 500000 | Hiển thị "500.000 VND" (toLocaleString vi-VN) | Medium | UI |
| TC-MT-FUNC-12 | Maintenance | Management | Hiển thị biển số xe từ join | Log có vehicle linked | 1. Xem danh sách | vehicle.license_plate: "51A-12345" | Cột Xe hiển thị "51A-12345" | High | Functional |
| TC-MT-FUNC-13 | Maintenance | Management | Hiển thị xe null | Log có vehicle = null | 1. Xem danh sách | vehicle: null | Cột Xe hiển thị "—" | Low | UI |
| TC-MT-FUNC-14 | Maintenance | Management | Hiển thị người thực hiện null | Log có performed_by = null | 1. Xem danh sách | performed_by: null | Cột Người thực hiện hiển thị "—" | Low | UI |
| TC-MT-FUNC-15 | Maintenance | Management | Pagination - chuyển trang | Có >10 logs | 1. Click chuyển trang 2 | 15 logs | Trang 2 hiển thị 5 logs còn lại | High | Functional |
| TC-MT-FUNC-16 | Maintenance | Management | Pagination - thay đổi pageSize | Có nhiều logs | 1. Đổi pageSize sang 20 | N/A | Hiển thị tối đa 20 items, page reset về 1 | Medium | Functional |

### 5.2 Functional Tests - Thêm bảo trì

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-FUNC-17 | Maintenance | Management | Navigate trang thêm bảo trì | Đã đăng nhập | 1. Click "Thêm bảo trì" | N/A | Navigate đến /maintenance/new, title "Thêm bảo trì mới", form với defaults: type="routine", performed_at=today | High | Functional |
| TC-MT-FUNC-18 | Maintenance | Management | Thêm bảo trì thành công - đầy đủ | Trang tạo mới, có vehicles | 1. Chọn xe 2. Chọn loại "Sửa chữa" 3. Nhập mô tả 4. Nhập chi phí 500000 5. Nhập người thực hiện 6. Chọn ngày 7. Chọn next_due_date 8. Nhập odometer 9. Nhập notes 10. Click "Thêm" | Đầy đủ fields | Toast "Đã tạo lịch bảo trì", redirect về /maintenance | Critical | Functional |
| TC-MT-FUNC-19 | Maintenance | Management | Thêm bảo trì - minimum (chỉ required) | Trang tạo mới | 1. Chọn xe 2. Giữ type "routine" 3. Nhập mô tả "Thay dầu" 4. Giữ performed_at default 5. Click "Thêm" | vehicle_id, type: "routine", description: "Thay dầu", performed_at: today | Tạo thành công. cost=0, performed_by=null, next_due_date=null, odometer=null, notes=null | Critical | Functional |
| TC-MT-FUNC-20 | Maintenance | Management | Default performed_at = today | Trang tạo mới | 1. Quan sát field "Ngày thực hiện" | N/A | Pre-filled với ngày hôm nay (YYYY-MM-DD format) | Medium | Functional |
| TC-MT-FUNC-21 | Maintenance | Management | Default type = routine | Trang tạo mới | 1. Quan sát dropdown "Loại bảo trì" | N/A | Default chọn "Bảo trì định kỳ" (routine) | Medium | Functional |
| TC-MT-FUNC-22 | Maintenance | Management | Cost empty → 0 | Trang tạo mới | 1. Để trống chi phí 2. Submit | cost: "" | API nhận cost = 0 (not null) | Medium | Functional |
| TC-MT-FUNC-23 | Maintenance | Management | Performed_by empty → null | Trang tạo mới | 1. Để trống người thực hiện 2. Submit | performed_by: "" | API nhận performed_by = null | Medium | Functional |
| TC-MT-FUNC-24 | Maintenance | Management | Performed_by spaces → null | Trang tạo mới | 1. Nhập "   " vào người thực hiện 2. Submit | performed_by: "   " | API nhận performed_by = null (trim → empty → null) | Low | Functional |
| TC-MT-FUNC-25 | Maintenance | Management | Notes empty → null | Trang tạo mới | 1. Để trống notes 2. Submit | notes: "" | API nhận notes = null | Low | Functional |

### 5.3 Functional Tests - Chỉnh sửa bảo trì

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-FUNC-26 | Maintenance | Management | Navigate trang chỉnh sửa | Có log trong danh sách | 1. Click MoreHorizontal 2. Click "Chỉnh sửa" | N/A | Navigate đến /maintenance/:id/edit, title "Chỉnh sửa bảo trì" | High | Functional |
| TC-MT-FUNC-27 | Maintenance | Management | Edit - form pre-filled | Trang edit, log loaded | 1. Quan sát form | log: {vehicle_id, type, description, cost, performed_by, performed_at, next_due_date, odometer, notes} | Tất cả fields pre-filled đúng. null → '' cho optional fields. | High | Functional |
| TC-MT-FUNC-28 | Maintenance | Management | Cập nhật bảo trì thành công | Trang edit | 1. Sửa chi phí 2. Sửa mô tả 3. Click "Lưu" | cost: 750000 | Toast "Đã cập nhật lịch bảo trì", redirect về /maintenance | Critical | Functional |
| TC-MT-FUNC-29 | Maintenance | Management | Edit - loading skeleton | Trang edit, đang tải | 1. Truy cập /maintenance/:id/edit | N/A | Hiển thị Skeleton placeholders | Medium | UI |
| TC-MT-FUNC-30 | Maintenance | Management | Edit - error (không tìm thấy) | ID không tồn tại | 1. Truy cập /maintenance/invalid-id/edit | API trả PGRST116 | Hiển thị "Không tìm thấy bản ghi bảo trì." + "Quay lại danh sách" | Medium | Error Handling |
| TC-MT-FUNC-31 | Maintenance | Management | Edit - error (auth expired) | Session hết hạn | 1. Truy cập trang edit | API trả 401 | Hiển thị "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Security |

### 5.4 Functional Tests - Xóa bảo trì

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-FUNC-32 | Maintenance | Management | Mở dialog xóa | Có log trong danh sách | 1. Click MoreHorizontal 2. Click "Xóa" | N/A | Dialog "Xác nhận xóa" hiển thị 50 ký tự đầu của description | High | Functional |
| TC-MT-FUNC-33 | Maintenance | Management | Xóa bảo trì thành công | Dialog xóa đang mở | 1. Click "Xóa" | N/A | Toast "Đã xóa lịch bảo trì", dialog đóng, item biến mất | Critical | Functional |
| TC-MT-FUNC-34 | Maintenance | Management | Hủy xóa | Dialog xóa đang mở | 1. Click "Hủy" | N/A | Dialog đóng, log vẫn còn | Medium | Functional |
| TC-MT-FUNC-35 | Maintenance | Management | Không thể đóng dialog khi đang xóa | isPending = true | 1. Click overlay/Escape khi đang xóa | N/A | Dialog không đóng (handleOpenChange guard) | Medium | UI |
| TC-MT-FUNC-36 | Maintenance | Management | Xóa - xe đã bị xóa (FK error) | Vehicle đã bị xóa | 1. Click "Xóa" | API trả code: "23503" | Toast error: "Xe không tồn tại hoặc đã bị xóa" | Medium | Negative |

### 5.5 Dirty-state Blocker Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-FUNC-37 | Maintenance | Management | Blocker hiển thị khi form dirty | Form đã thay đổi | 1. Sửa bất kỳ field 2. Click "Hủy" hoặc navigate | N/A | Dialog "Thoát mà không lưu?" với "Bạn có dữ liệu chưa lưu. Thoát không?" | High | Functional |
| TC-MT-FUNC-38 | Maintenance | Management | Blocker - chọn "Ở lại" | Dialog blocker hiển thị | 1. Click "Ở lại" | N/A | Dialog đóng, giữ nguyên form | High | Functional |
| TC-MT-FUNC-39 | Maintenance | Management | Blocker - chọn "Thoát" | Dialog blocker hiển thị | 1. Click "Thoát" | N/A | Navigate away, mất dữ liệu | High | Functional |
| TC-MT-FUNC-40 | Maintenance | Management | Không trigger blocker khi form clean | Form chưa sửa | 1. Click "Hủy" | N/A | Navigate về /maintenance ngay, không hiện dialog | Medium | Functional |
| TC-MT-FUNC-41 | Maintenance | Management | Không trigger blocker sau submit | Form vừa submit thành công | 1. Submit 2. Quan sát redirect | N/A | Redirect không hiện blocker (reset(values) trước navigate) | High | Functional |
| TC-MT-FUNC-42 | Maintenance | Management | Không trigger blocker khi isPending | Form đang submit | 1. Navigate khi đang pending | N/A | Blocker disabled (isDirty && !isPending condition) | Low | Functional |

### 5.6 Type Badge Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-FUNC-43 | Maintenance | Management | Badge "Bảo trì định kỳ" | Log type=routine | 1. Xem danh sách | type: "routine" | Badge variant=default "Bảo trì định kỳ" | Medium | UI |
| TC-MT-FUNC-44 | Maintenance | Management | Badge "Sửa chữa" | Log type=repair | 1. Xem danh sách | type: "repair" | Badge variant=secondary "Sửa chữa" | Medium | UI |
| TC-MT-FUNC-45 | Maintenance | Management | Badge "Kiểm định" | Log type=inspection | 1. Xem danh sách | type: "inspection" | Badge variant=outline "Kiểm định" | Medium | UI |
| TC-MT-FUNC-46 | Maintenance | Management | Badge "Khẩn cấp" | Log type=emergency | 1. Xem danh sách | type: "emergency" | Badge variant=destructive "Khẩn cấp" (đỏ) | Medium | UI |

### 5.7 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-VAL-01 | Maintenance | Management | Submit không chọn xe | Trang form | 1. Không chọn xe 2. Submit | vehicle_id: "" | Validation error: "Vui lòng chọn xe" | Critical | Validation |
| TC-MT-VAL-02 | Maintenance | Management | Submit mô tả trống | Trang form | 1. Để trống mô tả 2. Submit | description: "" | Validation error: "Mô tả không được để trống" | Critical | Validation |
| TC-MT-VAL-03 | Maintenance | Management | Submit performed_at trống | Trang form | 1. Xóa ngày thực hiện 2. Submit | performed_at: "" | Validation error: "Ngày không hợp lệ (YYYY-MM-DD)" | High | Validation |
| TC-MT-VAL-04 | Maintenance | Management | performed_at format sai | Trang form | 1. Nhập "15-03-2024" 2. Submit | performed_at: "15-03-2024" | Validation error: "Ngày không hợp lệ (YYYY-MM-DD)" | Medium | Validation |
| TC-MT-VAL-05 | Maintenance | Management | next_due_date format sai | Trang form | 1. Nhập next_due_date "2024/12/01" 2. Submit | next_due_date: "2024/12/01" | Validation error: "Ngày không hợp lệ (YYYY-MM-DD)" | Medium | Validation |
| TC-MT-VAL-06 | Maintenance | Management | Cross-field: next_due_date < performed_at | Trang form | 1. performed_at = "2024-06-01" 2. next_due_date = "2024-05-01" 3. Submit | performed: "2024-06-01", next: "2024-05-01" | Validation error: "Ngày bảo trì kế tiếp phải sau ngày thực hiện" | High | Validation |
| TC-MT-VAL-07 | Maintenance | Management | Cross-field: next_due_date = performed_at (boundary) | Trang form | 1. performed_at = "2024-06-01" 2. next_due_date = "2024-06-01" 3. Submit | same date | Validation pass (next NOT < performed) | Medium | Boundary |
| TC-MT-VAL-08 | Maintenance | Management | Cross-field: next_due_date > performed_at (valid) | Trang form | 1. performed_at = "2024-06-01" 2. next_due_date = "2024-12-01" 3. Submit | next > performed | Validation pass | Medium | Boundary |
| TC-MT-VAL-09 | Maintenance | Management | Cross-field: chỉ có performed_at, không có next_due | Trang form | 1. Nhập performed_at 2. Để trống next_due_date 3. Submit | next_due_date: "" | Validation pass (cross-field chỉ check khi next có giá trị) | Low | Boundary |
| TC-MT-VAL-10 | Maintenance | Management | Chi phí âm | Trang form | 1. Nhập cost = -1 2. Submit | cost: -1 | Validation error: "Chi phí không được âm" | High | Validation |
| TC-MT-VAL-11 | Maintenance | Management | Chi phí = 0 (boundary min) | Trang form | 1. Nhập cost = 0 2. Submit | cost: 0 | Validation pass | Medium | Boundary |
| TC-MT-VAL-12 | Maintenance | Management | Chi phí = 999,999,999.99 (boundary max) | Trang form | 1. Nhập cost = 999999999.99 2. Submit | cost: 999999999.99 | Validation pass | Medium | Boundary |
| TC-MT-VAL-13 | Maintenance | Management | Chi phí > 999,999,999.99 | Trang form | 1. Nhập cost = 1000000000 2. Submit | cost: 1000000000 | Validation error: "Chi phí vượt quá giới hạn" | High | Validation |
| TC-MT-VAL-14 | Maintenance | Management | Odometer âm | Trang form | 1. Nhập odometer = -1 2. Submit | odometer_reading: -1 | Validation error: "Số km không được âm" | High | Validation |
| TC-MT-VAL-15 | Maintenance | Management | Odometer = 0 (boundary min) | Trang form | 1. Nhập odometer = 0 2. Submit | odometer_reading: 0 | Validation pass | Medium | Boundary |
| TC-MT-VAL-16 | Maintenance | Management | Odometer = 10,000,000 (boundary max) | Trang form | 1. Nhập odometer = 10000000 2. Submit | odometer_reading: 10000000 | Validation pass | Medium | Boundary |
| TC-MT-VAL-17 | Maintenance | Management | Odometer > 10,000,000 | Trang form | 1. Nhập odometer = 10000001 2. Submit | odometer_reading: 10000001 | Validation error: "Số km vượt quá giới hạn" | High | Validation |
| TC-MT-VAL-18 | Maintenance | Management | Loại bảo trì không hợp lệ | Trang form (bypass UI) | 1. Set type = "invalid" qua DevTools 2. Submit | type: "invalid" | Validation error: "Loại bảo trì không hợp lệ" | Low | Validation |

### 5.8 Negative Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-NEG-01 | Maintenance | Management | Tạo log cho xe đã bị xóa | Vehicle bị xóa sau khi mở form | 1. Mở form 2. Chọn xe 3. Xe bị xóa bởi user khác 4. Submit | vehicle_id: deleted vehicle | Toast error: "Xe không tồn tại hoặc đã bị xóa" (23503) | High | Negative |
| TC-MT-NEG-02 | Maintenance | Management | Check constraint violation | Data vi phạm DB constraint | 1. Submit data vi phạm | API trả code: "23514" | Toast error: "Dữ liệu không hợp lệ (vi phạm ràng buộc CHECK)" | Medium | Negative |

### 5.9 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-UI-01 | Maintenance | Management | List loading state | Đang tải | 1. Truy cập trang | N/A | DataTable skeleton/loading | Medium | UI |
| TC-MT-UI-02 | Maintenance | Management | List empty state | Không có logs | 1. Truy cập trang | N/A | "Chưa có lịch sử bảo trì" | Medium | UI |
| TC-MT-UI-03 | Maintenance | Management | List error state | API lỗi | 1. Truy cập khi API fail | N/A | "Không thể tải danh sách bảo trì. Vui lòng thử lại." + nút "Thử lại" | Medium | UI |
| TC-MT-UI-04 | Maintenance | Management | Retry khi lỗi | Error state | 1. Click "Thử lại" | N/A | Gọi lại API, hiển thị dữ liệu nếu thành công | Medium | Functional |
| TC-MT-UI-05 | Maintenance | Management | Form - edit loading skeleton | Trang edit, đang tải | 1. Truy cập /maintenance/:id/edit | N/A | Skeleton 2-column layout | Medium | UI |
| TC-MT-UI-06 | Maintenance | Management | Form - vehicles loading | Đang tải vehicles | 1. Mở form khi vehicles loading | N/A | "Đang tải danh sách xe…" + Loader2 | Medium | UI |
| TC-MT-UI-07 | Maintenance | Management | Form - no vehicles | Không có vehicles | 1. Mở dropdown xe | vehicles: [] | "Chưa có xe — tạo xe trước ở mục Xe" | High | UI |
| TC-MT-UI-08 | Maintenance | Management | Form - vehicles truncation warning | >1000 vehicles | 1. Mở form | vehiclesCount > vehicles.length | Warning "Hiển thị X / Y xe. Liên hệ quản trị viên..." | Low | UI |
| TC-MT-UI-09 | Maintenance | Management | Form submitting state | Đang submit | 1. Click "Thêm" 2. Quan sát | N/A | Button disabled + Loader2, "Hủy" disabled | High | UI |
| TC-MT-UI-10 | Maintenance | Management | Form sections layout | Trang form | 1. Quan sát layout | N/A | 2-column: Left (Thông tin chung: xe, loại, mô tả), Right (Chi phí & Thực hiện + Lịch bảo trì). Below: Ghi chú full-width | Low | UI |
| TC-MT-UI-11 | Maintenance | Management | Header và subtitle trang | Đã đăng nhập | 1. Truy cập trang | N/A | h1 "Bảo trì", subtitle "Quản lý lịch sử bảo trì của đội xe" | Low | UI |
| TC-MT-UI-12 | Maintenance | Management | Delete dialog - description truncate 50 chars | Log có description dài | 1. Mở dialog xóa | description: "A" * 80 | Dialog hiển thị 50 ký tự đầu trong quotes | Low | UI |
| TC-MT-UI-13 | Maintenance | Management | Back button | Trang form | 1. Click ArrowLeft button | N/A | Navigate về /maintenance | Medium | Functional |
| TC-MT-UI-14 | Maintenance | Management | Accessibility - sr-only back button | Trang form | 1. Focus back button | N/A | Screen reader đọc "Quay lại" | Low | Accessibility |
| TC-MT-UI-15 | Maintenance | Management | Accessibility - sr-only actions menu | Trang danh sách | 1. Focus actions button | N/A | Screen reader đọc "Mở menu" | Low | Accessibility |
| TC-MT-UI-16 | Maintenance | Management | Form placeholders | Trang tạo mới | 1. Quan sát placeholders | N/A | Mô tả: "Mô tả công việc bảo trì…", Chi phí: "VD: 500000", Người thực hiện: "Tên garage hoặc kỹ thuật viên", Odometer: "VD: 15000", Notes: "Ghi chú thêm…" | Low | UI |

### 5.10 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-ERR-01 | Maintenance | Management | Session expired khi tạo | Token hết hạn | 1. Fill form 2. Submit | API trả status: 401 | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-MT-ERR-02 | Maintenance | Management | Session expired khi xóa | Token hết hạn | 1. Click "Xóa" | API trả code: "PGRST301" | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-MT-ERR-03 | Maintenance | Management | Lỗi không xác định | API trả lỗi unknown | 1. Submit form | N/A | Toast error: "Thao tác thất bại. Vui lòng thử lại." | Medium | Error Handling |
| TC-MT-ERR-04 | Maintenance | Management | Network error khi submit | Mất kết nối | 1. Tắt network 2. Submit | N/A | Toast error hiển thị. Form vẫn mở (không redirect). | Medium | Error Handling |
| TC-MT-ERR-05 | Maintenance | Management | Edit - fetch error generic | API lỗi không xác định | 1. Truy cập trang edit | N/A | "Không thể tải bản ghi. Vui lòng thử lại." + "Quay lại danh sách" | Medium | Error Handling |

### 5.11 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-SEC-01 | Maintenance | Management | Truy cập khi chưa login | Chưa đăng nhập | 1. Truy cập /maintenance | N/A | Redirect về /login | Critical | Security |
| TC-MT-SEC-02 | Maintenance | Management | Truy cập form khi chưa login | Chưa đăng nhập | 1. Truy cập /maintenance/new | N/A | Redirect về /login | Critical | Security |
| TC-MT-SEC-03 | Maintenance | Management | XSS qua description | Trang form | 1. Nhập `<script>alert(1)</script>` vào mô tả 2. Submit 3. Xem danh sách | description: script tag | Data lưu text, hiển thị escaped (truncated nếu >60). Không execute. | High | Security |
| TC-MT-SEC-04 | Maintenance | Management | XSS qua notes | Trang form | 1. Nhập HTML vào notes 2. Submit | notes: `<img src=x onerror=alert(1)>` | Data lưu text, hiển thị escaped | Medium | Security |
| TC-MT-SEC-05 | Maintenance | Management | Permission 403 | User không có quyền | 1. Submit form | API trả status: 403 | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Security |

### 5.12 Edge Case Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-EDGE-01 | Maintenance | Management | Cost = 0 hiển thị trong list | Log có cost = 0 | 1. Xem danh sách | cost: 0 | Hiển thị "0 VND". Có thể confuse (free vs not entered). | Medium | Edge Case |
| TC-MT-EDGE-02 | Maintenance | Management | Default today timezone issue | User ở UTC+7, lúc 00:00-06:59 | 1. Mở form lúc 01:00 local | N/A | performed_at có thể hiển thị ngày hôm trước (toISOString dùng UTC) | Low | Edge Case |
| TC-MT-EDGE-03 | Maintenance | Management | Vehicle filter >1000 vehicles | Có >1000 vehicles | 1. Mở dropdown xe trên list page | N/A | Dropdown chỉ hiển thị 1000 xe đầu. KHÔNG có warning trên list page (chỉ form page có). | Medium | Edge Case |
| TC-MT-EDGE-04 | Maintenance | Management | Double-click submit | Form valid | 1. Double-click "Thêm" | N/A | Chỉ 1 log tạo (button disabled khi isPending) | High | Functional |
| TC-MT-EDGE-05 | Maintenance | Management | Delete dialog - description null/undefined | Log có description edge case | 1. Mở dialog xóa | description: undefined | Hiển thị empty string trong quotes (optional chaining guard) | Low | Edge Case |
| TC-MT-EDGE-06 | Maintenance | Management | Odometer số thập phân | Trang form | 1. Nhập odometer = 15000.5 | odometer_reading: 15000.5 | Validation error (int() requires integer) | Medium | Edge Case |
| TC-MT-EDGE-07 | Maintenance | Management | Cost số thập phân hợp lệ | Trang form | 1. Nhập cost = 500000.50 2. Submit | cost: 500000.50 | Tạo thành công (max 999,999,999.99 cho phép decimal) | Medium | Edge Case |
| TC-MT-EDGE-08 | Maintenance | Management | Nhiều logs cùng xe cùng ngày | Trang form | 1. Tạo 2 logs cho cùng xe, cùng ngày | N/A | Cả 2 tạo thành công (không có unique constraint) | Low | Edge Case |

### 5.13 API Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-MT-API-01 | Maintenance | Management | GET /maintenance_logs - pagination | Auth valid | 1. GET /rest/v1/maintenance_logs?limit=10&offset=0&select=*,vehicle:vehicles(id,license_plate) | N/A | Status 200, data array + count, ordered by performed_at DESC | High | API |
| TC-MT-API-02 | Maintenance | Management | GET /maintenance_logs - filter by vehicle | Auth valid | 1. GET /rest/v1/maintenance_logs?vehicle_id=eq.{id} | N/A | Chỉ trả logs của vehicle đó | High | API |
| TC-MT-API-03 | Maintenance | Management | GET /maintenance_logs - filter by type | Auth valid | 1. GET /rest/v1/maintenance_logs?type=eq.routine | N/A | Chỉ trả logs routine | High | API |
| TC-MT-API-04 | Maintenance | Management | POST /maintenance_logs - valid | Auth valid | 1. POST với required fields | N/A | Status 201, trả object với id, created_at | High | API |
| TC-MT-API-05 | Maintenance | Management | POST /maintenance_logs - invalid vehicle_id | Auth valid | 1. POST với vehicle_id không tồn tại | N/A | Status 409, code "23503" | High | API |
| TC-MT-API-06 | Maintenance | Management | PATCH /maintenance_logs/:id | Auth valid | 1. PATCH với fields cần update | N/A | Status 200, trả updated object | High | API |
| TC-MT-API-07 | Maintenance | Management | DELETE /maintenance_logs/:id | Auth valid | 1. DELETE log | N/A | Status 204 | High | API |
| TC-MT-API-08 | Maintenance | Management | GET /maintenance_logs - no auth | Không có token | 1. GET không auth | N/A | Status 401 | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Cost default 0 vs null | Khi user không nhập cost, hệ thống lưu 0. Có nên lưu null để phân biệt "miễn phí" vs "chưa nhập"? |
| 2 | Auto-sync vehicle maintenance dates | Tạo maintenance log không auto-update vehicle.last_maintenance_date / next_maintenance_date. Cần sync? |
| 3 | Odometer vs vehicle.current_mileage | Không validate odometer >= vehicle.current_mileage. Có cần business rule? |
| 4 | Duplicate logs detection | Không có unique constraint. Có cần warn khi tạo log trùng xe + ngày + loại? |
| 5 | Search functionality | Hiện không có text search. Cần tìm theo description hoặc performed_by? |
| 6 | Vehicle filter limit trên list page | Dropdown xe trên list page load max 1000 nhưng KHÔNG có warning (khác form page). Cần thêm? |
| 7 | Performed_at future date | Không validate performed_at <= today. Có cho phép nhập ngày tương lai? |
| 8 | Maintenance notifications | Có cần alert khi next_due_date sắp đến hoặc đã qua? |

---

## 7. Summary

| Priority | Count |
|----------|-------|
| Critical | 8 |
| High | 27 |
| Medium | 32 |
| Low | 16 |
| **Total** | **83** |

| Test Type | Count |
|-----------|-------|
| Functional | 36 |
| UI | 17 |
| Validation | 12 |
| Boundary | 6 |
| Negative | 3 |
| Error Handling | 5 |
| Security | 5 |
| Edge Case | 8 |
| API | 8 |
| Accessibility | 2 |
