# Test Cases: Feature Quản lý Trạm xe (Stations Management)

## 1. Feature List Detected

- Danh sách trạm xe với phân trang, tìm kiếm, lọc trạng thái
- Tạo trạm mới (dialog form với thông tin trạm + tọa độ + trạng thái)
- Chỉnh sửa trạm (dialog form, populate data hiện tại)
- Xóa trạm (confirmation dialog, FK constraint check)
- Tìm kiếm theo tên hoặc thành phố (debounce 300ms)
- Lọc theo trạng thái hoạt động (Tất cả / Hoạt động / Ngừng hoạt động)
- Phân trang (page size mặc định 10, range-based)

---

## 2. Feature Analysis

### Business Flow
1. User truy cập /stations → Danh sách trạm xe (sắp xếp name ASC)
2. Tìm kiếm: Nhập text → debounce 300ms → ilike trên name OR city
3. Lọc: Chọn trạng thái (all/active/inactive)
4. Tạo trạm:
   a. Click "Thêm trạm" → Dialog "Thêm trạm mới"
   b. Nhập thông tin: tên (required), thành phố (required), tỉnh, mã trạm, địa chỉ
   c. Nhập tọa độ: vĩ độ, kinh độ (optional)
   d. Toggle trạng thái hoạt động (default: true)
   e. Submit → Insert station → Toast + Close dialog
5. Chỉnh sửa trạm:
   a. Click menu "Chỉnh sửa" → Dialog "Chỉnh sửa trạm" (populated)
   b. Sửa thông tin → Submit → Update station → Toast + Close
6. Xóa trạm:
   a. Click menu "Xóa" → Confirmation dialog
   b. Confirm → Delete station → Toast + Close
   c. Nếu trạm đang dùng bởi route → Error toast (FK constraint)

### Actor / Role
- Admin, Manager (theo SRS)
- Thực tế: Tất cả authenticated users

### Validation Rules (từ `station-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| name | required, trim, min 1 | "Tên trạm không được để trống" |
| code | optional, trim, max 20 | "Mã trạm quá dài (tối đa 20 ký tự)" |
| address | optional, string | - |
| city | required, trim, min 1 | "Thành phố không được để trống" |
| province | optional, string | - |
| latitude | optional, number, min -90, max 90 | "Vĩ độ phải trong khoảng -90 đến 90" |
| longitude | optional, number, min -180, max 180 | "Kinh độ phải trong khoảng -180 đến 180" |
| is_active | boolean, default true | - |

### Error Messages (từ `mapSupabaseError`)
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- `23505` + `stations_name_key` / `(name)` → "Tên trạm đã tồn tại"
- `23505` + `stations_code_key` / `(code)` → "Mã trạm đã tồn tại"
- `23505` (other) → "Giá trị đã tồn tại"
- `23503` → "Không thể xóa trạm đang được sử dụng bởi tuyến đường"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"
- Default → "Thao tác thất bại. Vui lòng thử lại."

### Key Business Logic
- **Unique name:** DB constraint `stations_name_key` (UNIQUE)
- **Unique code:** DB constraint `stations_code_key` (UNIQUE), nullable
- **FK constraint:** Không thể xóa station đang dùng bởi routes (origin/destination) hoặc route_stops
- **Search:** Case-insensitive ILIKE trên `name` OR `city`
- **Debounce:** 300ms trước khi gọi API
- **Pagination reset:** Search/filter thay đổi → page reset về 1
- **Serialization:** Empty strings → null cho optional fields (code, address, province, lat, lng)
- **Coordinates:** Lưu dạng numeric(9,6), validate range client-side
- **Sort:** Luôn order by name ASC
- **DB check:** `trim(name) <> ''` (server-side, ngoài client validation)

### UI States
- **List Loading:** DataTable skeleton
- **List Empty:** "Chưa có trạm nào"
- **List Error:** Error card (AlertCircle + message + "Thử lại" button)
- **Form Dialog - Create:** Title "Thêm trạm mới", button "Thêm"
- **Form Dialog - Edit:** Title "Chỉnh sửa trạm", button "Lưu"
- **Form Submitting:** Button disabled + Loader2 spinner, Cancel disabled
- **Dialog cannot close:** Khi mutation isPending
- **Delete Dialog:** "Xác nhận xóa" + tên trạm bold + "Thao tác này không thể hoàn tác."
- **Delete Pending:** Button Xóa disabled + Loader2, Cancel disabled

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Không có soft-delete (hard delete, chỉ bị chặn bởi FK) | Confirm: có cần soft-delete? |
| A2 | is_active chỉ là flag hiển thị, không ảnh hưởng logic khác (vẫn có thể dùng trong route) | Confirm: station inactive có bị block khỏi route? |
| A3 | Code field không bắt buộc format cụ thể (user nhập tự do, max 20 chars) | Confirm: có cần regex pattern? |
| A4 | Không có bulk delete/import | Confirm: có trong roadmap? |
| A5 | Không validate tọa độ phải thuộc Việt Nam | Confirm: có cần geo-fence? |
| A6 | Search không hỗ trợ tìm theo code, address, province | Confirm: có cần mở rộng search? |
| A7 | Không có audit log cho thao tác CRUD | Confirm: compliance requirement? |
| A8 | Pagination max page size không giới hạn (client-controlled) | Confirm: có cần server-side limit? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `station.api.ts:24` | Search query `.or()` | Nếu search chứa ký tự đặc biệt (%, _), ILIKE sẽ match sai (wildcard injection) | TC-STAT-SEC-04 |
| `station-form-schema.ts:77-101` | `serializeToInsert` | latitude/longitude convert bằng Number() — NaN nếu input không hợp lệ bypass Zod | TC-STAT-EDGE-03 |
| `station-page.tsx:34` | Debounce 300ms | Nếu user type nhanh rồi navigate away, pending request có thể gây memory leak | TC-STAT-EDGE-05 |
| `station-form-dialog.tsx:65-89` | useEffect reset on station change | Nếu station prop thay đổi nhanh (click edit → click edit khác), form có thể flash | TC-STAT-EDGE-04 |
| `station.api.ts:24` | `.or()` filter | Search + isActive filter kết hợp: `.or()` có thể conflict với `.eq()` (Supabase query builder) | TC-STAT-FUNC-07 |
| `station-form-schema.ts:10-11` | code `.optional().or(z.literal(''))` | Zod union type có thể gây confusion: empty string pass validation nhưng serialize thành null | TC-STAT-VAL-08 |
| `station-delete-dialog.tsx:39` | `mutateAsync(station.id)` | Nếu station = null (race condition), crash. Guard `if (!station) return` chỉ check trước mutate. | TC-STAT-EDGE-06 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Phân trang

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-FUNC-01 | Stations | Management | Hiển thị danh sách trạm xe | Có stations trong DB | 1. Truy cập /stations | - | DataTable hiển thị columns: Tên trạm, Mã trạm, Thành phố, Tỉnh/TP, Trạng thái, Actions. Sắp xếp name ASC. | Critical | Functional |
| TC-STAT-FUNC-02 | Stations | Management | Phân trang mặc định | Có > 10 stations | 1. Truy cập /stations<br>2. Quan sát pagination | - | Hiển thị 10 items/page. Pagination controls hiển thị total count. | High | Functional |
| TC-STAT-FUNC-03 | Stations | Management | Chuyển trang | Có > 10 stations | 1. Click page 2 | - | Hiển thị stations trang 2 (items 11-20). Page indicator cập nhật. | High | Functional |
| TC-STAT-FUNC-04 | Stations | Management | Thay đổi page size | Có > 10 stations | 1. Đổi page size thành 25<br>2. Quan sát | pageSize: 25 | 1. Hiển thị tối đa 25 items<br>2. Page reset về 1 | Medium | Functional |
| TC-STAT-FUNC-05 | Stations | Management | Tìm kiếm theo tên trạm | Có station "Bến xe Mỹ Đình" | 1. Nhập "Mỹ Đình" vào search | search: "Mỹ Đình" | Hiển thị stations có name chứa "Mỹ Đình" (case-insensitive) | Critical | Functional |
| TC-STAT-FUNC-06 | Stations | Management | Tìm kiếm theo thành phố | Có stations ở "Hà Nội" | 1. Nhập "Hà Nội" vào search | search: "Hà Nội" | Hiển thị stations có city chứa "Hà Nội" | High | Functional |
| TC-STAT-FUNC-07 | Stations | Management | Kết hợp search + filter trạng thái | Có stations nhiều status | 1. Nhập "Hà Nội"<br>2. Chọn "Hoạt động" | search: "Hà Nội", isActive: true | Chỉ hiển thị stations active ở Hà Nội | High | Functional |
| TC-STAT-FUNC-08 | Stations | Management | Lọc trạng thái "Hoạt động" | Có stations active + inactive | 1. Chọn filter "Hoạt động" | isActive: true | Chỉ hiển thị stations có is_active = true (badge "Hoạt động") | High | Functional |
| TC-STAT-FUNC-09 | Stations | Management | Lọc trạng thái "Ngừng hoạt động" | Có stations inactive | 1. Chọn filter "Ngừng hoạt động" | isActive: false | Chỉ hiển thị stations có is_active = false (badge "Ngừng hoạt động") | High | Functional |
| TC-STAT-FUNC-10 | Stations | Management | Lọc "Tất cả" | Đang filter active | 1. Chọn "Tất cả" | isActive: undefined | Hiển thị tất cả stations (không filter) | Medium | Functional |
| TC-STAT-FUNC-11 | Stations | Management | Search reset pagination | Đang ở page 3 | 1. Nhập search text | - | Page reset về 1 | High | Functional |
| TC-STAT-FUNC-12 | Stations | Management | Filter reset pagination | Đang ở page 2 | 1. Đổi status filter | - | Page reset về 1 | High | Functional |
| TC-STAT-FUNC-13 | Stations | Management | Debounce search 300ms | Trang loaded | 1. Nhập "abc" nhanh<br>2. Quan sát network | - | Chỉ 1 API call sau 300ms (không call mỗi keystroke) | Medium | Functional |
| TC-STAT-FUNC-14 | Stations | Management | Danh sách trống | Không có stations | 1. Truy cập /stations | - | Hiển thị "Chưa có trạm nào" | Medium | Functional |
| TC-STAT-FUNC-15 | Stations | Management | Hiển thị null fields | Station có code=null, province=null | 1. Quan sát row | - | Cột Mã trạm: "—", Cột Tỉnh/TP: "—" | Medium | Functional |
| TC-STAT-FUNC-16 | Stations | Management | Status badge hiển thị đúng | Có stations active + inactive | 1. Quan sát cột Trạng thái | - | active → Badge "Hoạt động" (default variant), inactive → Badge "Ngừng hoạt động" (secondary variant) | Medium | UI |

### 5.2 Functional Tests - Tạo trạm

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-FUNC-17 | Stations | Management | Tạo trạm thành công (đầy đủ thông tin) | Authenticated | 1. Click "Thêm trạm"<br>2. Nhập tên: "Bến xe Miền Đông"<br>3. Nhập city: "Hồ Chí Minh"<br>4. Nhập province: "TP.HCM"<br>5. Nhập code: "SGN-MD"<br>6. Nhập address: "292 Đinh Bộ Lĩnh"<br>7. Nhập lat: 10.8148<br>8. Nhập lng: 106.7110<br>9. Toggle is_active: true<br>10. Click "Thêm" | Full data | 1. Toast: "Đã tạo trạm"<br>2. Dialog đóng<br>3. Station mới xuất hiện trong danh sách<br>4. Query invalidated (list refresh) | Critical | Functional |
| TC-STAT-FUNC-18 | Stations | Management | Tạo trạm chỉ required fields | Authenticated | 1. Click "Thêm trạm"<br>2. Nhập tên: "Trạm Test"<br>3. Nhập city: "Hà Nội"<br>4. Click "Thêm" | name + city only | 1. Tạo thành công<br>2. code=null, address=null, province=null, lat=null, lng=null<br>3. is_active=true (default) | Critical | Functional |
| TC-STAT-FUNC-19 | Stations | Management | Dialog title cho create mode | Trang loaded | 1. Click "Thêm trạm"<br>2. Quan sát dialog | - | Title: "Thêm trạm mới", Button submit: "Thêm" | Medium | UI |
| TC-STAT-FUNC-20 | Stations | Management | Form reset khi mở create dialog | Vừa edit station khác | 1. Edit station A (form populated)<br>2. Close dialog<br>3. Click "Thêm trạm" | - | Form trống: tất cả fields empty, is_active = true | High | Functional |

### 5.3 Functional Tests - Chỉnh sửa trạm

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-FUNC-21 | Stations | Management | Chỉnh sửa trạm thành công | Có station "Bến xe Mỹ Đình" | 1. Click menu → "Chỉnh sửa"<br>2. Sửa tên thành "Bến xe Mỹ Đình Mới"<br>3. Click "Lưu" | name: "Bến xe Mỹ Đình Mới" | 1. Toast: "Đã cập nhật trạm"<br>2. Dialog đóng<br>3. Danh sách cập nhật tên mới | Critical | Functional |
| TC-STAT-FUNC-22 | Stations | Management | Form populated khi edit | Station có đầy đủ data | 1. Click menu → "Chỉnh sửa" | Station with all fields | Form hiển thị: name, code, address, city, province, lat, lng, is_active đúng giá trị hiện tại | Critical | Functional |
| TC-STAT-FUNC-23 | Stations | Management | Form populated với null fields | Station có code=null, lat=null | 1. Click edit station có null fields | code: null, lat: null | Form hiển thị: code = "" (empty), latitude = "" (empty) | High | Functional |
| TC-STAT-FUNC-24 | Stations | Management | Dialog title cho edit mode | Click edit | 1. Click "Chỉnh sửa"<br>2. Quan sát dialog | - | Title: "Chỉnh sửa trạm", Button submit: "Lưu" | Medium | UI |
| TC-STAT-FUNC-25 | Stations | Management | Toggle is_active từ true → false | Station active | 1. Edit station active<br>2. Toggle switch off<br>3. Lưu | is_active: false | Station cập nhật, badge đổi thành "Ngừng hoạt động" | High | Functional |
| TC-STAT-FUNC-26 | Stations | Management | Cập nhật tọa độ | Station chưa có tọa độ | 1. Edit station<br>2. Nhập lat: 21.0285, lng: 105.8542<br>3. Lưu | lat: 21.0285, lng: 105.8542 | DB lưu latitude=21.028500, longitude=105.854200 | Medium | Functional |
| TC-STAT-FUNC-27 | Stations | Management | Xóa tọa độ (set empty) | Station có lat/lng | 1. Edit station có tọa độ<br>2. Xóa trắng lat + lng<br>3. Lưu | lat: "", lng: "" | DB lưu latitude=null, longitude=null (serialize '' → null) | Medium | Functional |

### 5.4 Functional Tests - Xóa trạm

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-FUNC-28 | Stations | Management | Xóa trạm thành công | Station không dùng bởi route | 1. Click menu → "Xóa"<br>2. Confirm dialog hiển thị<br>3. Click "Xóa" | - | 1. Toast: "Đã xóa trạm"<br>2. Dialog đóng<br>3. Station biến mất khỏi danh sách | Critical | Functional |
| TC-STAT-FUNC-29 | Stations | Management | Confirmation dialog hiển thị đúng | Click xóa | 1. Click "Xóa" trên station "Bến xe Giáp Bát" | - | Dialog: "Xác nhận xóa" + "Bạn có chắc chắn muốn xóa trạm **Bến xe Giáp Bát**? Thao tác này không thể hoàn tác." | High | Functional |
| TC-STAT-FUNC-30 | Stations | Management | Hủy xóa | Confirm dialog mở | 1. Click "Hủy" trong delete dialog | - | Dialog đóng, station vẫn tồn tại | High | Functional |
| TC-STAT-FUNC-31 | Stations | Management | Xóa trạm đang dùng bởi route (FK) | Station là origin/destination của route | 1. Click "Xóa" trên station đang dùng<br>2. Confirm | - | Toast error: "Không thể xóa trạm đang được sử dụng bởi tuyến đường" | Critical | Functional |
| TC-STAT-FUNC-32 | Stations | Management | Xóa trạm đang dùng bởi route_stops (FK) | Station là intermediate stop | 1. Click "Xóa" trên station dùng trong route_stops<br>2. Confirm | - | Toast error: "Không thể xóa trạm đang được sử dụng bởi tuyến đường" (23503) | High | Functional |

### 5.5 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-VAL-01 | Stations | Management | Submit với tên trống | Form mở | 1. Để trống tên<br>2. Nhập city<br>3. Submit | name: "" | Validation error: "Tên trạm không được để trống" | Critical | Validation |
| TC-STAT-VAL-02 | Stations | Management | Submit với thành phố trống | Form mở | 1. Nhập tên<br>2. Để trống city<br>3. Submit | city: "" | Validation error: "Thành phố không được để trống" | Critical | Validation |
| TC-STAT-VAL-03 | Stations | Management | Tên chỉ có spaces | Form mở | 1. Nhập "   " vào tên<br>2. Submit | name: "   " | Validation error: "Tên trạm không được để trống" (trim rồi check min 1) | High | Validation |
| TC-STAT-VAL-04 | Stations | Management | Thành phố chỉ có spaces | Form mở | 1. Nhập "   " vào city<br>2. Submit | city: "   " | Validation error: "Thành phố không được để trống" (trim rồi check min 1) | High | Validation |
| TC-STAT-VAL-05 | Stations | Management | Mã trạm quá dài (> 20 chars) | Form mở | 1. Nhập code 21 ký tự<br>2. Submit | code: "ABCDEFGHIJKLMNOPQRSTU" (21 chars) | Validation error: "Mã trạm quá dài (tối đa 20 ký tự)" | High | Validation |
| TC-STAT-VAL-06 | Stations | Management | Mã trạm đúng 20 chars (boundary) | Form mở | 1. Nhập code 20 ký tự<br>2. Submit | code: "ABCDEFGHIJKLMNOPQRST" (20 chars) | Validation pass | Medium | Boundary |
| TC-STAT-VAL-07 | Stations | Management | Vĩ độ ngoài range (> 90) | Form mở | 1. Nhập latitude: 91<br>2. Submit | latitude: 91 | Validation error: "Vĩ độ phải trong khoảng -90 đến 90" | High | Validation |
| TC-STAT-VAL-08 | Stations | Management | Vĩ độ ngoài range (< -90) | Form mở | 1. Nhập latitude: -91<br>2. Submit | latitude: -91 | Validation error: "Vĩ độ phải trong khoảng -90 đến 90" | High | Validation |
| TC-STAT-VAL-09 | Stations | Management | Kinh độ ngoài range (> 180) | Form mở | 1. Nhập longitude: 181<br>2. Submit | longitude: 181 | Validation error: "Kinh độ phải trong khoảng -180 đến 180" | High | Validation |
| TC-STAT-VAL-10 | Stations | Management | Kinh độ ngoài range (< -180) | Form mở | 1. Nhập longitude: -181<br>2. Submit | longitude: -181 | Validation error: "Kinh độ phải trong khoảng -180 đến 180" | High | Validation |
| TC-STAT-VAL-11 | Stations | Management | Vĩ độ = 90 (boundary, valid) | Form mở | 1. Nhập latitude: 90<br>2. Submit | latitude: 90 | Validation pass (max 90 inclusive) | Medium | Boundary |
| TC-STAT-VAL-12 | Stations | Management | Vĩ độ = -90 (boundary, valid) | Form mở | 1. Nhập latitude: -90<br>2. Submit | latitude: -90 | Validation pass (min -90 inclusive) | Medium | Boundary |
| TC-STAT-VAL-13 | Stations | Management | Kinh độ = 180 (boundary, valid) | Form mở | 1. Nhập longitude: 180<br>2. Submit | longitude: 180 | Validation pass (max 180 inclusive) | Medium | Boundary |
| TC-STAT-VAL-14 | Stations | Management | Kinh độ = -180 (boundary, valid) | Form mở | 1. Nhập longitude: -180<br>2. Submit | longitude: -180 | Validation pass (min -180 inclusive) | Medium | Boundary |
| TC-STAT-VAL-15 | Stations | Management | Vĩ độ không phải số | Form mở | 1. Nhập "abc" vào latitude<br>2. Submit | latitude: "abc" | Validation error (coerce number fail) | High | Validation |
| TC-STAT-VAL-16 | Stations | Management | Kinh độ không phải số | Form mở | 1. Nhập "xyz" vào longitude<br>2. Submit | longitude: "xyz" | Validation error (coerce number fail) | High | Validation |
| TC-STAT-VAL-17 | Stations | Management | Tọa độ rỗng (optional, valid) | Form mở | 1. Để trống lat + lng<br>2. Submit | lat: "", lng: "" | Validation pass (union with z.literal('')) | High | Validation |
| TC-STAT-VAL-18 | Stations | Management | Mã trạm rỗng (optional, valid) | Form mở | 1. Để trống code<br>2. Submit | code: "" | Validation pass, serialize thành null | Medium | Validation |

### 5.6 Negative Tests - Unique Constraints

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-NEG-01 | Stations | Management | Tạo trạm trùng tên | Đã có station "Bến xe Mỹ Đình" | 1. Click "Thêm trạm"<br>2. Nhập name: "Bến xe Mỹ Đình"<br>3. Submit | name: duplicate | Toast error: "Tên trạm đã tồn tại" | Critical | Negative |
| TC-STAT-NEG-02 | Stations | Management | Tạo trạm trùng mã | Đã có station code "HN-MD" | 1. Click "Thêm trạm"<br>2. Nhập code: "HN-MD"<br>3. Submit | code: duplicate | Toast error: "Mã trạm đã tồn tại" | High | Negative |
| TC-STAT-NEG-03 | Stations | Management | Edit trạm đổi tên trùng | Có 2 stations: A, B | 1. Edit station B<br>2. Đổi name thành tên station A<br>3. Submit | name: existing name | Toast error: "Tên trạm đã tồn tại" | High | Negative |
| TC-STAT-NEG-04 | Stations | Management | Edit trạm đổi code trùng | Có station A code "HN-01", station B code "HN-02" | 1. Edit station B<br>2. Đổi code thành "HN-01"<br>3. Submit | code: existing code | Toast error: "Mã trạm đã tồn tại" | High | Negative |
| TC-STAT-NEG-05 | Stations | Management | Tạo 2 stations cùng code null | Có station code=null | 1. Tạo station mới, code rỗng<br>2. Submit | code: "" (→ null) | Tạo thành công (NULL không vi phạm UNIQUE trong PostgreSQL) | Medium | Negative |

### 5.7 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-UI-01 | Stations | Management | Loading skeleton hiển thị | Trang đang load | 1. Truy cập /stations<br>2. Quan sát trước khi data load | - | DataTable hiển thị loading skeleton | High | UI |
| TC-STAT-UI-02 | Stations | Management | Form submitting state - Create | Form đang submit | 1. Click "Thêm"<br>2. Quan sát UI | - | 1. Button "Thêm" hiển thị Loader2 + disabled<br>2. Button "Hủy" disabled<br>3. Dialog không thể đóng | High | UI |
| TC-STAT-UI-03 | Stations | Management | Form submitting state - Edit | Form đang submit | 1. Click "Lưu"<br>2. Quan sát UI | - | 1. Button "Lưu" hiển thị Loader2 + disabled<br>2. Button "Hủy" disabled<br>3. Dialog không thể đóng | High | UI |
| TC-STAT-UI-04 | Stations | Management | Delete pending state | Đang xóa | 1. Click "Xóa" trong confirm dialog<br>2. Quan sát UI | - | 1. Button "Xóa" hiển thị Loader2 + disabled<br>2. Button "Hủy" disabled<br>3. Dialog không thể đóng | High | UI |
| TC-STAT-UI-05 | Stations | Management | Error state với retry | API trả lỗi | 1. Trigger API error<br>2. Quan sát UI | - | Error card: AlertCircle icon + error message + Button "Thử lại" (RefreshCw icon) | High | UI |
| TC-STAT-UI-06 | Stations | Management | Retry button hoạt động | Error state hiển thị | 1. Click "Thử lại" | - | refetch() được gọi, data reload | High | UI |
| TC-STAT-UI-07 | Stations | Management | Code field styling | Form mở | 1. Quan sát input code | - | Input có class "font-mono uppercase" (monospace, uppercase) | Low | UI |
| TC-STAT-UI-08 | Stations | Management | Form scrollable khi content dài | Form mở trên viewport nhỏ | 1. Mở form trên viewport nhỏ | - | Form content scrollable (max-h-[58vh] overflow-y-auto) | Medium | UI |
| TC-STAT-UI-09 | Stations | Management | Dropdown menu actions | Trang loaded | 1. Click MoreHorizontal icon trên row | - | Dropdown hiển thị: "Chỉnh sửa" (Pencil icon) + separator + "Xóa" (Trash2 icon, text-destructive) | Medium | UI |
| TC-STAT-UI-10 | Stations | Management | Page header hiển thị đúng | Trang loaded | 1. Quan sát header | - | Title: "Trạm xe", Subtitle: "Quản lý danh sách trạm dừng và bến xe", Button: "Thêm trạm" (Plus icon) | Low | UI |
| TC-STAT-UI-11 | Stations | Management | Search placeholder | Trang loaded | 1. Quan sát search input | - | Placeholder: "Tìm theo tên hoặc thành phố..." | Low | UI |
| TC-STAT-UI-12 | Stations | Management | Dialog không đóng khi pending | Mutation đang chạy | 1. Submit form (pending)<br>2. Click outside dialog<br>3. Press Escape | - | Dialog vẫn mở (handleOpenChange block khi isPending) | High | UI |

### 5.8 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-ERR-01 | Stations | Management | Session expired khi tạo | Token hết hạn | 1. Để session expire<br>2. Submit form tạo trạm | - | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-STAT-ERR-02 | Stations | Management | Session expired khi xóa | Token hết hạn | 1. Để session expire<br>2. Confirm xóa trạm | - | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-STAT-ERR-03 | Stations | Management | Network error khi tạo | Mất kết nối | 1. Tắt network<br>2. Submit form | - | Toast error: "Thao tác thất bại. Vui lòng thử lại." | High | Error Handling |
| TC-STAT-ERR-04 | Stations | Management | Network error khi load danh sách | Mất kết nối | 1. Tắt network<br>2. Truy cập /stations | - | Error card hiển thị với message + "Thử lại" button | High | Error Handling |
| TC-STAT-ERR-05 | Stations | Management | Check constraint violation | Data vi phạm DB constraint | 1. Bypass client validation<br>2. Gửi data vi phạm check | name: "" (bypass trim) | Toast error: "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)" (23514) | Medium | Error Handling |
| TC-STAT-ERR-06 | Stations | Management | Unknown error code | Server trả error không mapped | 1. Trigger unknown error | - | Toast error: "Thao tác thất bại. Vui lòng thử lại." (default) | Medium | Error Handling |

### 5.9 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-SEC-01 | Stations | Management | Truy cập /stations khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /stations | - | Redirect về /login | Critical | Security |
| TC-STAT-SEC-02 | Stations | Management | XSS qua station name | Form mở | 1. Nhập `<script>alert(1)</script>` vào tên<br>2. Submit<br>3. Xem trong danh sách | name: script tag | Data lưu dạng text, hiển thị escaped trong DataTable. Không execute. | High | Security |
| TC-STAT-SEC-03 | Stations | Management | XSS qua address field | Form mở | 1. Nhập `<img src=x onerror=alert(1)>` vào address<br>2. Submit | address: HTML injection | Data lưu text, hiển thị escaped. | Medium | Security |
| TC-STAT-SEC-04 | Stations | Management | ILIKE wildcard injection qua search | Trang loaded | 1. Nhập "%" vào search<br>2. Quan sát results | search: "%" | Supabase escapes ILIKE wildcards. Có thể match tất cả (% = wildcard trong LIKE). Risk: information disclosure. | Medium | Security |
| TC-STAT-SEC-05 | Stations | Management | SQL injection qua search | Trang loaded | 1. Nhập `'; DROP TABLE stations; --` vào search | search: SQL injection | Supabase parameterized query ngăn injection. Trả 0 results hoặc error. | High | Security |
| TC-STAT-SEC-06 | Stations | Management | API call không có auth | Token bị xóa | 1. Gọi API trực tiếp không auth<br>2. POST /rest/v1/stations | - | Status 401 | High | Security |

### 5.10 Edge Case & Concurrency Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-EDGE-01 | Stations | Management | Double-click "Thêm" button | Form valid | 1. Double-click nhanh button "Thêm" | - | Chỉ 1 station được tạo (button disabled khi isPending) | High | Edge Case |
| TC-STAT-EDGE-02 | Stations | Management | Edit station đã bị xóa bởi user khác | 2 sessions | 1. User A mở edit dialog station X<br>2. User B xóa station X<br>3. User A submit | - | Error (station không tồn tại). Toast error hiển thị. | Medium | Concurrency |
| TC-STAT-EDGE-03 | Stations | Management | Latitude/Longitude edge: "10.abc" | Form mở | 1. Nhập "10.abc" vào latitude<br>2. Submit | latitude: "10.abc" | Zod coerce number fail → NaN → validation error | Medium | Edge Case |
| TC-STAT-EDGE-04 | Stations | Management | Click edit nhanh liên tiếp 2 stations | 2 stations | 1. Click edit station A<br>2. Ngay lập tức click edit station B | - | Form reset với data station B (useEffect on station change) | Medium | Edge Case |
| TC-STAT-EDGE-05 | Stations | Management | Search rồi navigate away nhanh | Trang loaded | 1. Nhập search text<br>2. Navigate away trước debounce fire | - | Không có memory leak (component unmount cancel pending) | Low | Edge Case |
| TC-STAT-EDGE-06 | Stations | Management | Tên trạm rất dài | Form mở | 1. Nhập tên 500 ký tự<br>2. Submit | name: 500 chars | Tạo thành công (DB text type không giới hạn). UI có thể overflow. | Low | Edge Case |
| TC-STAT-EDGE-07 | Stations | Management | Unicode trong tên trạm | Form mở | 1. Nhập tên: "Bến xe 日本語 🚌"<br>2. Submit | name: unicode + emoji | Tạo thành công, hiển thị đúng trong danh sách | Low | Edge Case |
| TC-STAT-EDGE-08 | Stations | Management | Concurrent create cùng tên | 2 sessions | 1. User A + B cùng tạo "Trạm X"<br>2. User A submit trước<br>3. User B submit sau | name: same | User A thành công. User B nhận error: "Tên trạm đã tồn tại" | Medium | Concurrency |

### 5.11 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-RESP-01 | Stations | Management | Danh sách trên tablet | Viewport 768px | 1. Mở /stations trên tablet | Viewport: 768x1024 | DataTable responsive, columns hiển thị đầy đủ hoặc horizontal scroll | Medium | Responsive |
| TC-STAT-RESP-02 | Stations | Management | Danh sách trên mobile | Viewport 375px | 1. Mở /stations trên mobile | Viewport: 375x667 | 1. Search + filter stack vertically<br>2. Table horizontal scroll nếu cần<br>3. Actions menu accessible | Medium | Responsive |
| TC-STAT-RESP-03 | Stations | Management | Form dialog trên mobile | Viewport 375px | 1. Mở form dialog trên mobile | Viewport: 375x667 | Dialog full-width (sm:max-w-[560px] → full trên mobile). Grid 2 cols collapse thành 1 col. Form scrollable. | Medium | Responsive |

### 5.12 API Test Detail

#### Create Station - Request

```json
POST /rest/v1/stations
{
  "name": "Bến xe Miền Đông",
  "code": "SGN-MD",
  "address": "292 Đinh Bộ Lĩnh, P.26, Q.Bình Thạnh",
  "city": "Hồ Chí Minh",
  "province": "TP.HCM",
  "latitude": 10.8148,
  "longitude": 106.7110,
  "is_active": true
}
```

#### Update Station - Request

```json
PATCH /rest/v1/stations?id=eq.{id}
{
  "name": "Bến xe Miền Đông Mới",
  "is_active": false
}
```

#### Delete Station - Request

```
DELETE /rest/v1/stations?id=eq.{id}
```

#### Fetch Stations - Request (with search + filter)

```
GET /rest/v1/stations?select=*&order=name.asc&limit=10&offset=0&or=(name.ilike.%25Hà Nội%25,city.ilike.%25Hà Nội%25)&is_active=eq.true
```

#### Error Response - Duplicate Name (23505)

```json
{
  "code": "23505",
  "details": "Key (name)=(Bến xe Mỹ Đình) already exists.",
  "message": "duplicate key value violates unique constraint \"stations_name_key\""
}
```

#### Error Response - FK Constraint on Delete (23503)

```json
{
  "code": "23503",
  "details": "Key (id)=(uuid) is still referenced from table \"routes\".",
  "message": "update or delete on table \"stations\" violates foreign key constraint \"routes_origin_station_fk\" on table \"routes\""
}
```

### 5.13 API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-STAT-API-01 | Stations | Management | GET /stations - pagination | Auth valid | 1. GET /rest/v1/stations?select=*&limit=10&offset=0&order=name.asc | - | Status 200, data array + count header (exact count) | High | API |
| TC-STAT-API-02 | Stations | Management | GET /stations - search by name | Auth valid | 1. GET /rest/v1/stations?or=(name.ilike.%25test%25,city.ilike.%25test%25) | - | Trả stations matching name OR city | High | API |
| TC-STAT-API-03 | Stations | Management | GET /stations - filter is_active | Auth valid | 1. GET /rest/v1/stations?is_active=eq.true | - | Chỉ trả active stations | High | API |
| TC-STAT-API-04 | Stations | Management | GET /stations - no auth | Không có token | 1. GET /rest/v1/stations không auth | - | Status 401 | High | API |
| TC-STAT-API-05 | Stations | Management | POST /stations - valid data | Auth valid | 1. POST với full valid data | - | Status 201, station object returned | High | API |
| TC-STAT-API-06 | Stations | Management | POST /stations - duplicate name | Auth valid | 1. POST với name đã tồn tại | - | Status 409, code 23505, message chứa "stations_name_key" | Critical | API |
| TC-STAT-API-07 | Stations | Management | POST /stations - duplicate code | Auth valid | 1. POST với code đã tồn tại | - | Status 409, code 23505, message chứa "stations_code_key" | High | API |
| TC-STAT-API-08 | Stations | Management | PATCH /stations - update fields | Auth valid | 1. PATCH với partial update | - | Status 200, updated station returned | High | API |
| TC-STAT-API-09 | Stations | Management | DELETE /stations - success | Auth valid, no FK refs | 1. DELETE station không dùng | - | Status 200/204 | High | API |
| TC-STAT-API-10 | Stations | Management | DELETE /stations - FK constraint | Auth valid, station used by route | 1. DELETE station đang dùng | - | Status 409, code 23503 | Critical | API |
| TC-STAT-API-11 | Stations | Management | GET /stations/:id - single | Auth valid | 1. GET /rest/v1/stations?id=eq.{id}&select=* (single) | - | Status 200, single station object | Medium | API |
| TC-STAT-API-12 | Stations | Management | GET /stations/:id - not found | Auth valid | 1. GET với id không tồn tại | - | Status 406 (PGRST116 - single row not found) | Medium | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Station inactive có bị block khỏi route creation? | Code hiện tại cho phép chọn station inactive làm origin/destination. Cần confirm business rule? |
| 2 | Mã trạm có cần format cụ thể (regex pattern)? | Hiện tại chỉ validate max 20 chars. Cần confirm: có convention? |
| 3 | Search có cần mở rộng sang code, address, province? | Hiện chỉ search name + city. Cần confirm UX requirement? |
| 4 | Bulk import stations từ CSV/Excel? | Hiện không có feature. Cần confirm roadmap? |
| 5 | Tọa độ có cần validate thuộc Việt Nam (geo-fence)? | Hiện chỉ validate range -90/90, -180/180. Cần confirm? |
| 6 | Audit log cho CRUD operations? | Hiện không có. Cần confirm compliance requirement? |
| 7 | Soft-delete thay vì hard-delete? | Hiện hard-delete (chỉ bị chặn bởi FK). Cần confirm: có cần giữ history? |
| 8 | ILIKE wildcard injection (search "%" match tất cả) | Supabase không escape % trong ILIKE. Cần confirm: có cần sanitize? |
