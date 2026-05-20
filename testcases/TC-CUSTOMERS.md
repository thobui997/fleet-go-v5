# Test Cases: Feature Quản lý Khách hàng (Customers Management)

## 1. Feature List Detected

- Danh sách khách hàng với phân trang và tìm kiếm
- Tạo khách hàng mới (form dialog)
- Chỉnh sửa thông tin khách hàng
- Xóa khách hàng (confirmation dialog)
- Tìm kiếm theo họ tên, SĐT, email (debounce 300ms)
- Validation form (Zod schema)
- Error handling (unique constraints, FK violations, auth expiry)

---

## 2. Feature Analysis

### Business Flow
1. User truy cập /customers → Hiển thị danh sách khách hàng (phân trang 10/page)
2. Tìm kiếm: nhập keyword → debounce 300ms → filter theo full_name, phone_number, email (ilike)
3. Thêm: Click "Thêm khách hàng" → Dialog form → Validate → Insert → Toast success → Close dialog
4. Sửa: Click menu "Chỉnh sửa" → Dialog form pre-filled → Validate → Update → Toast success
5. Xóa: Click menu "Xóa" → Confirmation dialog → Delete → Toast success

### Actor / Role
- Ticket Agent, Manager (theo SRS)
- Thực tế: Tất cả authenticated users (chưa có route-level permission enforcement)

### Input / Output
- **Input:** full_name, phone_number, email, date_of_birth, gender, id_card_number, address, notes
- **Output:** Customer record với id, timestamps, loyalty_points=0

### Validation Rules (từ source code `customer-form-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| full_name | required, trim, min 1 | "Họ tên không được để trống" |
| phone_number | required, trim, regex `^(0\d{9,10})$` | "Số điện thoại không được để trống" / "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)" |
| email | optional, email format hoặc empty string | "Email không hợp lệ" |
| date_of_birth | optional, không được là ngày tương lai | "Ngày sinh không được là ngày trong tương lai" |
| gender | optional, values: male/female/other | - |
| id_card_number | optional, trim | - |
| address | optional | - |
| notes | optional | - |

### Unique Constraints (DB-enforced)
- phone_number → "Số điện thoại đã tồn tại"
- email → "Email đã tồn tại"
- id_card_number → "Số CMND/CCCD đã tồn tại"

### Serialization Logic (từ `serializeToInsert`)
- phone_number: trim trước khi lưu (prevent UNIQUE bypass)
- email: empty string → null (UNIQUE nullable column)
- id_card_number: empty string → null, trim
- gender: empty string → null
- date_of_birth: empty string → null
- address: empty string → null
- notes: empty string → null
- loyalty_points: hardcoded = 0

### UI States
- **Loading:** DataTable skeleton
- **Empty:** "Chưa có khách hàng nào"
- **Error:** Error card với message + button "Thử lại"
- **Form Dialog:** Create mode ("Thêm khách hàng mới") / Edit mode ("Chỉnh sửa khách hàng")
- **Delete Dialog:** Confirmation với tên khách hàng
- **Submitting:** Button disabled + Loader2 spinner

### Dependencies
- Supabase Database (customers table)
- Authentication (bearer token)
- Bookings table (FK constraint khi xóa)

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Không có max length cho full_name (source code chỉ có min 1) | Confirm với BA: có giới hạn ký tự không? |
| A2 | id_card_number không có format validation (chỉ trim) | Confirm: có cần validate 9 hoặc 12 số không? |
| A3 | phone_number regex cho phép 10-11 số (0 + 9-10 digits) | Confirm: có cần validate đầu số cụ thể (09x, 03x...)? |
| A4 | Không có pagination limit enforcement (user có thể set pageSize rất lớn) | Confirm với Dev |
| A5 | loyalty_points luôn = 0 khi tạo, không có UI để thay đổi | Confirm: feature tích điểm có trong roadmap? |
| A6 | Gender chỉ có 3 options: male/female/other | Confirm với BA |
| A7 | Không có export danh sách khách hàng | Confirm với BA |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `customer-form-schema.ts:73` | `serializeToInsert` - phone_number.trim() | Nếu user nhập phone có space ở giữa "090 123 4567", trim chỉ xóa đầu/cuối, regex sẽ reject | TC-CUST-VAL-08 |
| `customer-form-schema.ts:14` | email validation `.optional().or(z.literal(''))` | Edge case: email chỉ có spaces " " sẽ pass optional check nhưng fail email format | TC-CUST-VAL-14 |
| `customer.api.ts:24` | search với `.or()` ilike | SQL injection qua search input (mitigated bởi Supabase SDK parameterized) nhưng special chars có thể gây lỗi | TC-CUST-SEC-03 |
| `customer-form-dialog.tsx:93-106` | `hasInitializedRef` pattern | Race condition: nếu user mở edit dialog nhanh cho 2 customers khác nhau, ref có thể không reset đúng | TC-CUST-EDGE-03 |
| `customer-form-schema.ts:19-22` | date_of_birth refine | So sánh string ISO date, timezone có thể gây sai lệch ở boundary (23:59 UTC vs local) | TC-CUST-VAL-18 |
| `customers-page.tsx:27` | `useDebounce(searchInput, 300)` | Nếu user type rất nhanh rồi clear, có thể trigger search với giá trị cũ | TC-CUST-FUNC-09 |

---

## 5. Test Cases

### 5.1 Functional Tests - Danh sách & Tìm kiếm

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-FUNC-01 | Customers | Business | Hiển thị danh sách khách hàng | Có ít nhất 1 khách hàng trong DB. User đã đăng nhập. | 1. Truy cập /customers | - | 1. Hiển thị DataTable với columns: Họ tên, Số ĐT, Email, CMND/CCCD, Giới tính, Ngày tạo, Actions<br>2. Dữ liệu sắp xếp theo full_name ascending<br>3. Phân trang mặc định 10 items/page | Critical | Functional |
| TC-CUST-FUNC-02 | Customers | Business | Danh sách trống | DB không có khách hàng nào | 1. Truy cập /customers | - | Hiển thị message: "Chưa có khách hàng nào" | Medium | Functional |
| TC-CUST-FUNC-03 | Customers | Business | Phân trang - chuyển trang | Có > 10 khách hàng | 1. Truy cập /customers<br>2. Click trang 2 | - | 1. Hiển thị 10 items tiếp theo<br>2. Pagination indicator cập nhật | High | Functional |
| TC-CUST-FUNC-04 | Customers | Business | Phân trang - thay đổi page size | Có > 10 khách hàng | 1. Thay đổi page size từ 10 → 20<br>2. Quan sát danh sách | - | 1. Hiển thị 20 items/page<br>2. Page reset về 1 | Medium | Functional |
| TC-CUST-FUNC-05 | Customers | Business | Tìm kiếm theo họ tên | Có khách hàng "Nguyễn Văn A" | 1. Nhập "Nguyễn" vào ô tìm kiếm<br>2. Đợi 300ms debounce | search: "Nguyễn" | 1. Danh sách filter chỉ hiển thị khách hàng có tên chứa "Nguyễn"<br>2. Page reset về 1 | High | Functional |
| TC-CUST-FUNC-06 | Customers | Business | Tìm kiếm theo số điện thoại | Có khách hàng SĐT "0901234567" | 1. Nhập "0901" vào ô tìm kiếm<br>2. Đợi 300ms | search: "0901" | Hiển thị khách hàng có SĐT chứa "0901" | High | Functional |
| TC-CUST-FUNC-07 | Customers | Business | Tìm kiếm theo email | Có khách hàng email "test@gmail.com" | 1. Nhập "test@gmail" vào ô tìm kiếm | search: "test@gmail" | Hiển thị khách hàng có email chứa "test@gmail" | High | Functional |
| TC-CUST-FUNC-08 | Customers | Business | Tìm kiếm không có kết quả | Không có khách hàng match | 1. Nhập "XYZNOTEXIST" vào ô tìm kiếm | search: "XYZNOTEXIST" | Hiển thị "Chưa có khách hàng nào" (empty state) | Medium | Functional |
| TC-CUST-FUNC-09 | Customers | Business | Tìm kiếm debounce - clear input nhanh | Có dữ liệu | 1. Nhập "abc"<br>2. Ngay lập tức xóa hết (trong < 300ms) | - | Không trigger API call với "abc". Hiển thị lại full list. | Medium | Functional |
| TC-CUST-FUNC-10 | Customers | Business | Hiển thị giới tính đúng label | Có khách hàng với gender = male/female/other | 1. Quan sát cột Giới tính | gender: male, female, other, null | Hiển thị: "Nam", "Nữ", "Khác", "—" tương ứng | Low | Functional |

### 5.2 Functional Tests - Tạo khách hàng

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-FUNC-11 | Customers | Business | Tạo khách hàng thành công với đầy đủ thông tin | User đã đăng nhập | 1. Click "Thêm khách hàng"<br>2. Nhập đầy đủ thông tin<br>3. Click "Thêm" | full_name: "Trần Văn B", phone: "0912345678", email: "tranb@gmail.com", dob: "1990-05-15", gender: "male", id_card: "012345678901", address: "123 Lê Lợi, Q1, HCM" | 1. Dialog đóng<br>2. Toast: "Đã tạo khách hàng"<br>3. Danh sách refresh, hiển thị khách hàng mới | Critical | Functional |
| TC-CUST-FUNC-12 | Customers | Business | Tạo khách hàng chỉ với required fields | User đã đăng nhập | 1. Click "Thêm khách hàng"<br>2. Chỉ nhập họ tên + SĐT<br>3. Click "Thêm" | full_name: "Lê Thị C", phone: "0987654321" | 1. Tạo thành công<br>2. Các field optional lưu null<br>3. loyalty_points = 0 | Critical | Functional |
| TC-CUST-FUNC-13 | Customers | Business | Dialog title hiển thị đúng mode | - | 1. Click "Thêm khách hàng" → quan sát title<br>2. Đóng dialog<br>3. Click "Chỉnh sửa" trên 1 row → quan sát title | - | 1. Create mode: "Thêm khách hàng mới"<br>2. Edit mode: "Chỉnh sửa khách hàng" | Low | UI |

### 5.3 Functional Tests - Chỉnh sửa khách hàng

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-FUNC-14 | Customers | Business | Sửa khách hàng thành công | Có khách hàng trong danh sách | 1. Click menu "..." trên row<br>2. Click "Chỉnh sửa"<br>3. Sửa họ tên<br>4. Click "Lưu" | full_name: "Nguyễn Văn A" → "Nguyễn Văn A Updated" | 1. Dialog đóng<br>2. Toast: "Đã cập nhật khách hàng"<br>3. Danh sách refresh với tên mới | Critical | Functional |
| TC-CUST-FUNC-15 | Customers | Business | Form pre-fill đúng dữ liệu khi edit | Có khách hàng đầy đủ thông tin | 1. Click "Chỉnh sửa" trên khách hàng có đầy đủ data | - | Tất cả fields được pre-fill đúng: full_name, phone, email, dob, gender, id_card, address, notes | High | Functional |
| TC-CUST-FUNC-16 | Customers | Business | Sửa email thành empty (xóa email) | Khách hàng có email | 1. Click "Chỉnh sửa"<br>2. Xóa hết nội dung field email<br>3. Click "Lưu" | email: "" (empty) | 1. Lưu thành công<br>2. Email được set null trong DB<br>3. Cột Email hiển thị "—" | Medium | Functional |

### 5.4 Functional Tests - Xóa khách hàng

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-FUNC-17 | Customers | Business | Xóa khách hàng thành công | Khách hàng không có booking | 1. Click menu "..." → "Xóa"<br>2. Confirm dialog hiển thị tên KH<br>3. Click "Xóa" | - | 1. Dialog đóng<br>2. Toast: "Đã xóa khách hàng"<br>3. Khách hàng biến mất khỏi danh sách | Critical | Functional |
| TC-CUST-FUNC-18 | Customers | Business | Xóa khách hàng có booking (FK violation) | Khách hàng đã có đặt vé | 1. Click "Xóa" trên KH có booking<br>2. Confirm xóa | - | Toast error: "Không thể xóa khách hàng đã có đặt vé" | Critical | Functional |
| TC-CUST-FUNC-19 | Customers | Business | Hủy xóa khách hàng | - | 1. Click "Xóa"<br>2. Dialog hiển thị<br>3. Click "Hủy" | - | Dialog đóng, khách hàng vẫn còn trong danh sách | Medium | Functional |
| TC-CUST-FUNC-20 | Customers | Business | Không thể đóng dialog khi đang xóa | Đang pending delete | 1. Click "Xóa" → Confirm<br>2. Trong lúc pending, thử click outside dialog hoặc "Hủy" | - | Dialog không đóng được khi isPending = true | Medium | UI |

### 5.5 Validation Tests - Required Fields

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-VAL-01 | Customers | Business | Submit form với họ tên trống | Dialog form mở | 1. Để trống field "Họ tên"<br>2. Nhập SĐT hợp lệ<br>3. Click "Thêm" | full_name: "", phone: "0901234567" | Hiển thị validation error: "Họ tên không được để trống". Form không submit. | Critical | Validation |
| TC-CUST-VAL-02 | Customers | Business | Submit form với họ tên chỉ có spaces | Dialog form mở | 1. Nhập "   " (spaces) vào họ tên<br>2. Nhập SĐT hợp lệ<br>3. Click "Thêm" | full_name: "   ", phone: "0901234567" | Hiển thị validation error: "Họ tên không được để trống" (trim rồi check min 1) | High | Validation |
| TC-CUST-VAL-03 | Customers | Business | Submit form với SĐT trống | Dialog form mở | 1. Nhập họ tên hợp lệ<br>2. Để trống SĐT<br>3. Click "Thêm" | full_name: "Test", phone: "" | Hiển thị validation error: "Số điện thoại không được để trống" | Critical | Validation |

### 5.6 Validation Tests - Phone Number

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-VAL-04 | Customers | Business | SĐT hợp lệ 10 số (boundary min) | Dialog form mở | 1. Nhập SĐT 10 số bắt đầu bằng 0<br>2. Submit | phone: "0901234567" | Validation pass, form submit thành công | High | Boundary |
| TC-CUST-VAL-05 | Customers | Business | SĐT hợp lệ 11 số (boundary max) | Dialog form mở | 1. Nhập SĐT 11 số bắt đầu bằng 0<br>2. Submit | phone: "09012345678" | Validation pass, form submit thành công | High | Boundary |
| TC-CUST-VAL-06 | Customers | Business | SĐT 9 số (dưới boundary) | Dialog form mở | 1. Nhập SĐT 9 số<br>2. Submit | phone: "090123456" | Validation error: "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)" | High | Boundary |
| TC-CUST-VAL-07 | Customers | Business | SĐT 12 số (trên boundary) | Dialog form mở | 1. Nhập SĐT 12 số<br>2. Submit | phone: "090123456789" | Validation error: "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)" | High | Boundary |
| TC-CUST-VAL-08 | Customers | Business | SĐT không bắt đầu bằng 0 | Dialog form mở | 1. Nhập SĐT bắt đầu bằng 1<br>2. Submit | phone: "1901234567" | Validation error: "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)" | High | Validation |
| TC-CUST-VAL-09 | Customers | Business | SĐT chứa chữ cái | Dialog form mở | 1. Nhập SĐT có chữ<br>2. Submit | phone: "090abc4567" | Validation error: "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)" | High | Negative |
| TC-CUST-VAL-10 | Customers | Business | SĐT chứa ký tự đặc biệt | Dialog form mở | 1. Nhập SĐT có dấu gạch/dấu cách<br>2. Submit | phone: "090-123-4567" | Validation error: "Số điện thoại không hợp lệ (10-11 số, bắt đầu bằng 0)" | Medium | Negative |
| TC-CUST-VAL-11 | Customers | Business | SĐT có khoảng trắng đầu/cuối | Dialog form mở | 1. Nhập SĐT có space đầu cuối<br>2. Submit | phone: " 0901234567 " | Validation pass (trim trước khi validate regex). Lưu DB không có space. | Medium | Validation |

### 5.7 Validation Tests - Email

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-VAL-12 | Customers | Business | Email hợp lệ | Dialog form mở | 1. Nhập email đúng format<br>2. Submit | email: "customer@gmail.com" | Validation pass | High | Validation |
| TC-CUST-VAL-13 | Customers | Business | Email để trống (optional) | Dialog form mở | 1. Để trống email<br>2. Submit | email: "" | Validation pass (optional field). Lưu DB = null. | High | Validation |
| TC-CUST-VAL-14 | Customers | Business | Email không hợp lệ - thiếu @ | Dialog form mở | 1. Nhập email thiếu @<br>2. Submit | email: "customergmail.com" | Validation error: "Email không hợp lệ" | High | Validation |
| TC-CUST-VAL-15 | Customers | Business | Email không hợp lệ - thiếu domain | Dialog form mở | 1. Nhập email thiếu domain<br>2. Submit | email: "customer@" | Validation error: "Email không hợp lệ" | Medium | Validation |
| TC-CUST-VAL-16 | Customers | Business | Email chỉ có spaces | Dialog form mở | 1. Nhập "   " vào email<br>2. Submit | email: "   " | Validation error: "Email không hợp lệ" (không phải empty string, không phải valid email) | Medium | Negative |

### 5.8 Validation Tests - Date of Birth

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-VAL-17 | Customers | Business | Ngày sinh hợp lệ (quá khứ) | Dialog form mở | 1. Chọn ngày sinh trong quá khứ<br>2. Submit | dob: "1990-05-15" | Validation pass | High | Validation |
| TC-CUST-VAL-18 | Customers | Business | Ngày sinh = hôm nay (boundary) | Dialog form mở | 1. Chọn ngày sinh = ngày hôm nay<br>2. Submit | dob: "2026-05-20" (today) | Validation pass (refine: val <= today) | Medium | Boundary |
| TC-CUST-VAL-19 | Customers | Business | Ngày sinh = ngày mai (tương lai) | Dialog form mở | 1. Chọn ngày sinh = ngày mai<br>2. Submit | dob: "2026-05-21" (tomorrow) | Validation error: "Ngày sinh không được là ngày trong tương lai" | High | Boundary |
| TC-CUST-VAL-20 | Customers | Business | Ngày sinh để trống (optional) | Dialog form mở | 1. Không chọn ngày sinh<br>2. Submit | dob: "" | Validation pass (optional). Lưu DB = null. | Medium | Validation |

### 5.9 Unique Constraint Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-VAL-21 | Customers | Business | Tạo KH với SĐT đã tồn tại | Có KH với phone "0901234567" | 1. Click "Thêm khách hàng"<br>2. Nhập SĐT trùng<br>3. Submit | phone: "0901234567" (đã tồn tại) | Toast error: "Số điện thoại đã tồn tại" | Critical | Validation |
| TC-CUST-VAL-22 | Customers | Business | Tạo KH với email đã tồn tại | Có KH với email "test@gmail.com" | 1. Click "Thêm khách hàng"<br>2. Nhập email trùng<br>3. Submit | email: "test@gmail.com" (đã tồn tại) | Toast error: "Email đã tồn tại" | Critical | Validation |
| TC-CUST-VAL-23 | Customers | Business | Tạo KH với CMND đã tồn tại | Có KH với id_card "012345678901" | 1. Click "Thêm khách hàng"<br>2. Nhập CMND trùng<br>3. Submit | id_card: "012345678901" (đã tồn tại) | Toast error: "Số CMND/CCCD đã tồn tại" | Critical | Validation |
| TC-CUST-VAL-24 | Customers | Business | Sửa KH - đổi SĐT thành SĐT đã tồn tại | Có 2 KH: A (phone 0901111111), B (phone 0902222222) | 1. Edit KH A<br>2. Đổi phone thành "0902222222"<br>3. Submit | phone: "0902222222" | Toast error: "Số điện thoại đã tồn tại" | High | Validation |
| TC-CUST-VAL-25 | Customers | Business | 2 KH cùng email null (allowed) | Có KH không có email | 1. Tạo KH mới không nhập email<br>2. Submit | email: "" (→ null) | Tạo thành công. NULL không vi phạm UNIQUE constraint. | Medium | Validation |

### 5.10 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-UI-01 | Customers | Business | Loading state khi fetch data | User truy cập /customers | 1. Truy cập /customers<br>2. Quan sát UI trong lúc loading | - | DataTable hiển thị skeleton/loading indicator trước khi data load xong | High | UI |
| TC-CUST-UI-02 | Customers | Business | Error state với button retry | API trả lỗi (network/server) | 1. Trigger error (tắt network)<br>2. Quan sát UI | - | 1. Hiển thị error card với icon AlertCircle<br>2. Message lỗi tiếng Việt<br>3. Button "Thử lại" | High | UI |
| TC-CUST-UI-03 | Customers | Business | Click "Thử lại" sau error | Đang hiển thị error state | 1. Click button "Thử lại" | - | Refetch data. Nếu network OK → hiển thị danh sách. Nếu vẫn lỗi → hiển thị error lại. | Medium | UI |
| TC-CUST-UI-04 | Customers | Business | Form dialog - button loading state | Form đang submit | 1. Nhập data hợp lệ<br>2. Click "Thêm"<br>3. Quan sát button | - | 1. Button hiển thị Loader2 spinner + text<br>2. Button disabled<br>3. Button "Hủy" disabled<br>4. Dialog không thể đóng | High | UI |
| TC-CUST-UI-05 | Customers | Business | Form dialog - scrollable content | Form có nhiều fields | 1. Mở form dialog<br>2. Quan sát nếu content vượt quá viewport | - | Form content scrollable (max-h-[58vh] overflow-y-auto). Footer buttons luôn visible. | Medium | UI |
| TC-CUST-UI-06 | Customers | Business | Null values hiển thị "—" | Có KH với email/id_card = null | 1. Quan sát cột Email và CMND/CCCD | - | Cells hiển thị "—" cho giá trị null | Low | UI |
| TC-CUST-UI-07 | Customers | Business | Ngày tạo format tiếng Việt | Có KH trong danh sách | 1. Quan sát cột "Ngày tạo" | created_at: "2026-01-15T10:00:00Z" | Hiển thị format: "15/01/2026" (vi-VN locale) | Low | UI |
| TC-CUST-UI-08 | Customers | Business | Form reset khi mở Create sau Edit | Vừa edit 1 KH | 1. Click "Chỉnh sửa" KH A (form pre-fill)<br>2. Đóng dialog<br>3. Click "Thêm khách hàng" | - | Form reset về trống (không còn data của KH A) | High | UI |

### 5.11 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-ERR-01 | Customers | Business | Session expired khi thao tác | Token hết hạn | 1. Để session expire<br>2. Thử tạo/sửa/xóa KH | - | Toast error: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-CUST-ERR-02 | Customers | Business | Network error khi submit form | Mất kết nối | 1. Tắt network<br>2. Nhập data hợp lệ<br>3. Click "Thêm" | - | Toast error: "Thao tác thất bại. Vui lòng thử lại." (default fallback). Button trở lại enabled. | High | Error Handling |
| TC-CUST-ERR-03 | Customers | Business | Check constraint violation (23514) | DB có check constraint | 1. Trigger check constraint violation | - | Toast error: "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)" | Medium | Error Handling |
| TC-CUST-ERR-04 | Customers | Business | Unknown error code | Supabase trả error không mapped | 1. Trigger unknown error | - | Toast error: "Thao tác thất bại. Vui lòng thử lại." | Medium | Error Handling |

### 5.12 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-SEC-01 | Customers | Business | XSS qua field họ tên | Dialog form mở | 1. Nhập script tag vào họ tên<br>2. Submit<br>3. Quan sát danh sách | full_name: `<script>alert('xss')</script>` | 1. Data lưu DB dạng text (không execute)<br>2. Hiển thị trong table dạng escaped text<br>3. Không execute JavaScript | High | Security |
| TC-CUST-SEC-02 | Customers | Business | XSS qua field address/notes | Dialog form mở | 1. Nhập HTML/script vào address<br>2. Submit | address: `<img src=x onerror=alert(1)>` | Data lưu dạng text, hiển thị escaped. Không render HTML. | High | Security |
| TC-CUST-SEC-03 | Customers | Business | SQL Injection qua search input | Đang ở trang /customers | 1. Nhập SQL injection vào ô tìm kiếm | search: `'; DROP TABLE customers; --` | 1. Supabase SDK parameterized query ngăn injection<br>2. Tìm kiếm trả 0 kết quả hoặc hoạt động bình thường | High | Security |
| TC-CUST-SEC-04 | Customers | Business | Truy cập /customers khi chưa đăng nhập | Chưa có session | 1. Truy cập trực tiếp /customers | - | Redirect về /login (ProtectedRoute) | Critical | Security |
| TC-CUST-SEC-05 | Customers | Business | IDOR - sửa KH bằng ID khác | User đã đăng nhập | 1. Gọi API update với customer ID không thuộc quyền quản lý | id: UUID của KH khác | Supabase RLS policy cho phép hoặc chặn tùy cấu hình. Verify behavior. | Medium | Security |

### 5.13 Special Characters & Unicode Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-CHAR-01 | Customers | Business | Họ tên tiếng Việt có dấu | Dialog form mở | 1. Nhập tên tiếng Việt đầy đủ dấu<br>2. Submit | full_name: "Nguyễn Thị Phương Thảo" | Lưu và hiển thị đúng Unicode tiếng Việt | High | Functional |
| TC-CUST-CHAR-02 | Customers | Business | Họ tên có ký tự đặc biệt | Dialog form mở | 1. Nhập tên có ký tự đặc biệt<br>2. Submit | full_name: "O'Brien-Smith Jr." | Lưu và hiển thị đúng (apostrophe, hyphen, dot) | Medium | Functional |
| TC-CUST-CHAR-03 | Customers | Business | Address có emoji | Dialog form mở | 1. Nhập address có emoji<br>2. Submit | address: "123 Đường ABC 🏠" | Lưu thành công (PostgreSQL text type hỗ trợ Unicode) | Low | Functional |
| TC-CUST-CHAR-04 | Customers | Business | Tìm kiếm tiếng Việt có dấu | Có KH tên "Phương" | 1. Nhập "Phương" vào search<br>2. Đợi debounce | search: "Phương" | Tìm thấy KH có tên chứa "Phương" (ilike hỗ trợ Unicode) | High | Functional |
| TC-CUST-CHAR-05 | Customers | Business | Tìm kiếm case-insensitive | Có KH tên "Nguyễn Văn A" | 1. Nhập "nguyễn" (lowercase)<br>2. Đợi debounce | search: "nguyễn" | Tìm thấy KH (ilike = case-insensitive) | Medium | Functional |

### 5.14 Edge Case & Concurrency Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-EDGE-01 | Customers | Business | Double-click button "Thêm" | Form filled, valid | 1. Nhập data hợp lệ<br>2. Double-click nhanh "Thêm" | - | Chỉ tạo 1 record (button disabled sau click đầu tiên khi isPending) | High | Functional |
| TC-CUST-EDGE-02 | Customers | Business | Submit form nhiều lần liên tục (spam) | Form filled | 1. Nhập data hợp lệ<br>2. Click "Thêm" liên tục 5 lần | - | Chỉ 1 request được gửi (mutation isPending blocks subsequent clicks) | High | Functional |
| TC-CUST-EDGE-03 | Customers | Business | Mở edit dialog nhanh cho 2 KH khác nhau | Có 2 KH trong danh sách | 1. Click "Chỉnh sửa" KH A<br>2. Ngay lập tức đóng và click "Chỉnh sửa" KH B | - | Form pre-fill đúng data của KH B (không bị lẫn data KH A) | Medium | Edge Case |
| TC-CUST-EDGE-04 | Customers | Business | Concurrent edit - 2 users sửa cùng KH | 2 sessions cùng edit 1 KH | 1. User A mở edit KH X<br>2. User B mở edit KH X<br>3. User A save<br>4. User B save | - | Last write wins (Supabase default). User B ghi đè data của User A. Không có conflict detection. | Medium | Edge Case |
| TC-CUST-EDGE-05 | Customers | Business | Xóa KH đang được user khác edit | 2 sessions | 1. User A mở edit KH X<br>2. User B xóa KH X<br>3. User A click "Lưu" | - | User A nhận error (record not found hoặc no rows returned). Toast error hiển thị. | Medium | Edge Case |
| TC-CUST-EDGE-06 | Customers | Business | Browser refresh khi dialog đang mở | Form dialog open với data | 1. Mở form dialog, nhập data<br>2. Refresh page (F5) | - | Page reload, dialog đóng, data chưa save bị mất. Danh sách load lại. | Low | Edge Case |
| TC-CUST-EDGE-07 | Customers | Business | Browser back button từ /customers | Đang ở /customers | 1. Navigate đến /customers từ /dashboard<br>2. Click browser Back | - | Quay về /dashboard. Không có unsaved changes warning (data trong table, không phải form). | Low | Edge Case |

### 5.15 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-RESP-01 | Customers | Business | Responsive trên tablet (768px) | Đang ở /customers | 1. Resize viewport 768px<br>2. Quan sát table và form | Viewport: 768x1024 | 1. Table có thể scroll horizontal nếu cần<br>2. Form dialog vẫn usable<br>3. Search input và button không bị overlap | Medium | Responsive |
| TC-CUST-RESP-02 | Customers | Business | Responsive trên mobile (375px) | Đang ở /customers | 1. Resize viewport 375px<br>2. Mở form dialog | Viewport: 375x667 | 1. Form dialog full-width<br>2. Grid 2 cols collapse thành 1 col<br>3. Tất cả fields accessible | Medium | Responsive |
| TC-CUST-RESP-03 | Customers | Business | Form dialog trên mobile - scrollable | Viewport nhỏ | 1. Mở form dialog trên mobile<br>2. Scroll xuống cuối form | Viewport: 375x667 | Form scrollable, footer buttons (Hủy/Thêm) luôn visible hoặc reachable | Medium | Responsive |

### 5.16 Performance Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-PERF-01 | Customers | Business | Load danh sách với nhiều records | DB có 1000+ customers | 1. Truy cập /customers<br>2. Đo thời gian load | - | Page load < 3s (NFR-01). Chỉ fetch 10 records (pagination). | Medium | Performance |
| TC-CUST-PERF-02 | Customers | Business | Search debounce giảm API calls | - | 1. Gõ "Nguyễn Văn" nhanh (8 ký tự)<br>2. Monitor network tab | - | Chỉ 1-2 API calls (debounce 300ms), không phải 8 calls | Medium | Performance |
| TC-CUST-PERF-03 | Customers | Business | React Query cache - quay lại trang | Đã load /customers trước đó | 1. Navigate đến /bookings<br>2. Navigate lại /customers | - | Data hiển thị ngay từ cache (stale-while-revalidate). Không hiển thị loading skeleton. | Low | Performance |

---

## 6. API Test Detail

### Create Customer - Request Sample

```json
{
  "full_name": "Nguyễn Văn A",
  "phone_number": "0901234567",
  "email": "nguyenvana@gmail.com",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "id_card_number": "012345678901",
  "address": "123 Lê Lợi, Quận 1, TP.HCM",
  "notes": null,
  "loyalty_points": 0
}
```

### Create Customer - Response Sample (201)

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "full_name": "Nguyễn Văn A",
  "phone_number": "0901234567",
  "email": "nguyenvana@gmail.com",
  "date_of_birth": "1990-05-15",
  "gender": "male",
  "id_card_number": "012345678901",
  "address": "123 Lê Lợi, Quận 1, TP.HCM",
  "notes": null,
  "loyalty_points": 0,
  "created_at": "2026-05-20T10:00:00.000Z",
  "updated_at": "2026-05-20T10:00:00.000Z"
}
```

### Error Response - Duplicate Phone (409/23505)

```json
{
  "code": "23505",
  "details": "Key (phone_number)=(0901234567) already exists.",
  "hint": null,
  "message": "duplicate key value violates unique constraint \"customers_phone_number_key\""
}
```

### API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-CUST-API-01 | Customers | Business | GET /customers - status 200 | Auth token valid | 1. GET /rest/v1/customers với bearer token | - | Status 200, response chứa data array + count | High | API |
| TC-CUST-API-02 | Customers | Business | GET /customers - không có token | Không gửi auth header | 1. GET /rest/v1/customers không có Authorization header | - | Status 401 Unauthorized | High | API |
| TC-CUST-API-03 | Customers | Business | GET /customers - token expired | Token hết hạn | 1. GET /rest/v1/customers với expired token | - | Status 401 hoặc PGRST301 | High | API |
| TC-CUST-API-04 | Customers | Business | POST /customers - missing required field | Auth valid | 1. POST /rest/v1/customers thiếu full_name | `{"phone_number": "0901234567"}` | Status 400/422, error message về missing field | High | API |
| TC-CUST-API-05 | Customers | Business | POST /customers - invalid data type | Auth valid | 1. POST với loyalty_points = "abc" | `{"full_name": "Test", "phone_number": "0901234567", "loyalty_points": "abc"}` | Status 400, error về invalid data type | Medium | API |
| TC-CUST-API-06 | Customers | Business | DELETE /customers/:id - có FK dependency | Auth valid, KH có booking | 1. DELETE /rest/v1/customers?id=eq.{id} | id: KH có booking | Status 409, code 23503, message FK violation | High | API |
| TC-CUST-API-07 | Customers | Business | PATCH /customers/:id - partial update | Auth valid | 1. PATCH chỉ update full_name | `{"full_name": "New Name"}` | Status 200, chỉ full_name thay đổi, các field khác giữ nguyên | Medium | API |
| TC-CUST-API-08 | Customers | Business | SQL Injection qua API search | Auth valid | 1. GET /rest/v1/customers?full_name=ilike.%25';DROP TABLE customers;--%25 | - | Status 200, trả 0 results. Table không bị drop. | High | API |

---

## 7. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Max length cho full_name | Source code chỉ validate min 1, không có max. DB type = text (unlimited). Cần confirm giới hạn business? |
| 2 | Format validation cho id_card_number | Hiện tại chỉ trim, không validate format. CMND 9 số, CCCD 12 số. Cần thêm regex? |
| 3 | Duplicate phone_number case-sensitive | "0901234567" vs "0901234567 " (trailing space) - code trim trước save nhưng cần verify DB behavior |
| 4 | Permission enforcement | SRS nói Ticket Agent + Manager, nhưng code không enforce. Tất cả authenticated users đều access được. Cần confirm. |
| 5 | Soft delete vs hard delete | Hiện tại hard delete. Nếu KH có booking history, có nên soft delete (is_active flag) thay vì block? |
| 6 | Import/Export khách hàng | Không có trong code. Cần confirm có trong roadmap không. |
| 7 | Loyalty points logic | Field tồn tại nhưng luôn = 0, không có UI. Cần confirm khi nào implement. |
| 8 | Phone number format khi hiển thị | Hiện tại hiển thị raw "0901234567". Cần format "090-123-4567" không? |

