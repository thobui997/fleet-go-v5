# Test Cases: FR-13 - Quản lý nhân viên (Employees)

## Feature Analysis (from source code)

### Validation Rules (Zod Schema - `employee-form-schema.ts`)
- **user_id**: UUID format hoặc null (optional, "Vui lòng chọn người dùng")
- **hire_date**: regex `^\d{4}-\d{2}-\d{2}$` hoặc null → "Ngày không hợp lệ"
- **license_number**: max 50 chars hoặc null
- **license_expiry**: regex `^\d{4}-\d{2}-\d{2}$` hoặc null → "Ngày không hợp lệ"
- **is_active**: boolean, default true
- **role_id**: UUID hoặc null (optional)

### Error Mapping (`mapEmployeeError`)
- `PGRST301/401/403` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- `23505 + employees_license_number_key` → "Số bằng lái đã tồn tại trong hệ thống"
- `23505 + employees_user_id_key` → "Người dùng này đã có hồ sơ nhân viên"
- `23503` (FK violation) → "Nhân viên đã được phân công chuyến đi, không thể xóa"
- Default → "Đã xảy ra lỗi, vui lòng thử lại"

### Fetch Error Mapping (`mapFetchError` - form page)
- `PGRST116/406` → "Không tìm thấy hồ sơ nhân viên."
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- Default → "Không thể tải bản ghi. Vui lòng thử lại."

### API Operations (`employee.api.ts`)
- **fetchEmployees**: paginated, search by profiles.full_name (ilike, !inner join khi search), filter by is_active, order by created_at DESC
- **fetchEmployee**: single by ID with profiles join
- **fetchProfiles**: all profiles (limit 1000), order by full_name ASC
- **fetchEmployeeRole**: get role_id from user_roles by user_id
- **createEmployee**: insert + select with profiles join
- **updateEmployee**: update by ID + select with profiles join
- **deleteEmployee**: delete by ID
- **assignEmployeeRole**: DELETE existing + INSERT new (2-step, non-atomic)

### UI Behavior
- **List page** (`employees-page.tsx`):
  - Columns: Họ và tên, Email, Ngày vào làm, Số bằng lái, Hạn bằng lái, Trạng thái, Actions
  - Search: debounce 300ms on profiles.full_name, resets page to 1
  - Status filter: Select (Tất cả / Hoạt động / Nghỉ việc)
  - License expiry badges: "Hết hạn" (red, <0 days), "Sắp hết hạn" (yellow, ≤30 days)
  - Empty: "Chưa có nhân viên nào"
  - Null profile: "(Chưa liên kết)" for name, "—" for email
  - Navigate to separate page for create/edit (not dialog)

- **Form page** (`employee-form-page.tsx`):
  - Full page with sections: Thông tin chung, Phân quyền, Bằng lái xe
  - User dropdown: profiles list (limit 1000), "Không liên kết" option, warning if ≥1000
  - Role dropdown: roles list (limit 1000), "Không có vai trò" option, warning if count > displayed
  - DatePicker for hire_date and license_expiry
  - Switch for is_active (default true)
  - Dirty-state blocker: "Thoát mà không lưu?" dialog with "Ở lại" / "Thoát"
  - 2-step submit: save employee → assign role (partial success possible)
  - Toast on success: "Tạo nhân viên thành công" / "Cập nhật nhân viên thành công"
  - Toast warning on role failure: "Nhân viên đã được lưu, nhưng không thể cập nhật vai trò..."
  - Submit disabled if profiles or roles empty
  - Back button navigates to list

- **Delete dialog** (`employee-delete-dialog.tsx`):
  - Shows employee name (full_name ?? email ?? "nhân viên này")
  - Error displayed via toast (not inline)
  - Toast success: "Xóa nhân viên thành công"
  - Cannot close while isPending

### Assumptions
1. User đã đăng nhập và có quyền truy cập trang Employees
2. Hệ thống đã có profiles và roles để test dropdown
3. Pagination mặc định: page=1, pageSize=10

### Potential Risks/Bugs from Code
1. assignEmployeeRole là 2-step (DELETE + INSERT) - không atomic, có thể mất role nếu INSERT fail
2. Search dùng !inner join khi có keyword → employees không có profile sẽ biến mất khỏi kết quả
3. FK_DROPDOWN_PAGE_SIZE = 1000 - nếu có >1000 profiles/roles, một số sẽ không hiển thị
4. Form submit disabled khi profiles.length === 0 hoặc roles.length === 0 - block toàn bộ form
5. License expiry badge logic dùng dayjs startOf('day') - timezone có thể ảnh hưởng

---

## Test Cases

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-EMP-001 | Employees | People | Hiển thị danh sách nhân viên | Đã đăng nhập, có dữ liệu employees | 1. Truy cập trang Nhân viên | N/A | Hiển thị DataTable với cột: Họ và tên, Email, Ngày vào làm, Số bằng lái, Hạn bằng lái, Trạng thái, Actions. Sắp xếp theo created_at DESC | High | Functional |
| TC-EMP-002 | Employees | People | Hiển thị trạng thái loading | Đã đăng nhập | 1. Truy cập trang khi đang tải | N/A | Hiển thị skeleton/loading indicator trong DataTable | Medium | UI |
| TC-EMP-003 | Employees | People | Hiển thị trạng thái empty | Đã đăng nhập, không có employees | 1. Truy cập trang Nhân viên | N/A | Hiển thị "Chưa có nhân viên nào" | Medium | UI |
| TC-EMP-004 | Employees | People | Hiển thị trạng thái error | API trả lỗi | 1. Truy cập trang khi API lỗi | N/A | Hiển thị error message + nút "Thử lại" | Medium | UI |
| TC-EMP-005 | Employees | People | Retry khi lỗi | Đang hiển thị error state | 1. Click "Thử lại" | N/A | Gọi lại API, hiển thị dữ liệu nếu thành công | Medium | Functional |
| TC-EMP-006 | Employees | People | Hiển thị tên nhân viên từ profile | Employee có linked profile | 1. Xem danh sách | profiles.full_name: "Nguyễn Văn A" | Cột Họ và tên hiển thị "Nguyễn Văn A" | High | Functional |
| TC-EMP-007 | Employees | People | Hiển thị khi chưa liên kết profile | Employee có user_id = null | 1. Xem danh sách | profiles: null | Cột Họ và tên hiển thị "(Chưa liên kết)", Email hiển thị "—" | Medium | UI |
| TC-EMP-008 | Employees | People | Hiển thị ngày vào làm format DD/MM/YYYY | Employee có hire_date | 1. Xem danh sách | hire_date: "2024-03-15" | Hiển thị "15/03/2024" | Low | UI |
| TC-EMP-009 | Employees | People | Hiển thị ngày vào làm null | Employee có hire_date = null | 1. Xem danh sách | hire_date: null | Hiển thị "—" | Low | UI |
| TC-EMP-010 | Employees | People | Hiển thị badge "Hết hạn" bằng lái | License đã hết hạn | 1. Xem danh sách | license_expiry: "2024-01-01" (quá khứ) | Hiển thị badge đỏ "Hết hạn" bên cạnh ngày | High | Functional |
| TC-EMP-011 | Employees | People | Hiển thị badge "Sắp hết hạn" bằng lái | License hết hạn trong 30 ngày | 1. Xem danh sách | license_expiry: today + 15 days | Hiển thị badge vàng "Sắp hết hạn" | High | Functional |
| TC-EMP-012 | Employees | People | Không hiển thị badge khi bằng lái còn hạn >30 ngày | License còn hạn lâu | 1. Xem danh sách | license_expiry: today + 60 days | Chỉ hiển thị ngày, không có badge | Medium | Functional |
| TC-EMP-013 | Employees | People | Không hiển thị badge khi license_expiry null | Không có thông tin hạn | 1. Xem danh sách | license_expiry: null | Hiển thị "—", không có badge | Low | UI |
| TC-EMP-014 | Employees | People | Hiển thị trạng thái "Hoạt động" | Employee is_active = true | 1. Xem danh sách | is_active: true | Badge xanh "Hoạt động" | Medium | UI |
| TC-EMP-015 | Employees | People | Hiển thị trạng thái "Nghỉ việc" | Employee is_active = false | 1. Xem danh sách | is_active: false | Badge xám "Nghỉ việc" | Medium | UI |
| TC-EMP-016 | Employees | People | Pagination - chuyển trang | Có >10 employees | 1. Click chuyển trang 2 | 15 employees | Trang 2 hiển thị 5 employees còn lại | High | Functional |
| TC-EMP-017 | Employees | People | Pagination - thay đổi pageSize | Có nhiều employees | 1. Đổi pageSize sang 20 | N/A | Hiển thị tối đa 20 items, page reset về 1 | Medium | Functional |
| TC-EMP-018 | Employees | People | Tìm kiếm theo họ tên | Có nhiều employees | 1. Nhập "Nguyễn" vào ô tìm kiếm 2. Chờ 300ms | search: "Nguyễn" | Hiển thị employees có full_name chứa "Nguyễn", page reset về 1 | High | Functional |
| TC-EMP-019 | Employees | People | Tìm kiếm - debounce 300ms | Có employees | 1. Nhập "Ng" 2. Ngay lập tức nhập "uyễn" | search: "Nguyễn" | Chỉ gọi API 1 lần với "Nguyễn" sau 300ms | Medium | Performance |
| TC-EMP-020 | Employees | People | Tìm kiếm - không kết quả | Có employees | 1. Nhập "xyznotexist" | search: "xyznotexist" | Hiển thị "Chưa có nhân viên nào" | Medium | Functional |
| TC-EMP-021 | Employees | People | Tìm kiếm - employee không có profile bị ẩn | Employee có user_id=null | 1. Nhập bất kỳ keyword | search: "abc" | Employee không có profile KHÔNG hiển thị (do !inner join) | Medium | Functional |
| TC-EMP-022 | Employees | People | Filter theo trạng thái "Hoạt động" | Có cả active và inactive | 1. Chọn filter "Hoạt động" | statusFilter: "true" | Chỉ hiển thị employees có is_active=true, page reset về 1 | High | Functional |
| TC-EMP-023 | Employees | People | Filter theo trạng thái "Nghỉ việc" | Có cả active và inactive | 1. Chọn filter "Nghỉ việc" | statusFilter: "false" | Chỉ hiển thị employees có is_active=false | High | Functional |
| TC-EMP-024 | Employees | People | Filter "Tất cả" | Đang filter active | 1. Chọn "Tất cả" | statusFilter: "all" | Hiển thị tất cả employees (isActive=undefined) | Medium | Functional |
| TC-EMP-025 | Employees | People | Kết hợp search + filter | Có nhiều employees | 1. Nhập "Nguyễn" 2. Chọn "Hoạt động" | search: "Nguyễn", isActive: true | Chỉ hiển thị employees active có tên chứa "Nguyễn" | High | Functional |
| TC-EMP-026 | Employees | People | Navigate trang tạo nhân viên mới | Đã đăng nhập | 1. Click "Thêm nhân viên" | N/A | Navigate đến trang form với title "Thêm nhân viên mới", form trống, is_active=true | High | Functional |
| TC-EMP-027 | Employees | People | Tạo nhân viên thành công - đầy đủ thông tin | Trang tạo mới, có profiles và roles | 1. Chọn người dùng 2. Chọn ngày vào làm 3. Nhập số bằng lái 4. Chọn ngày hết hạn bằng lái 5. Chọn vai trò 6. Click "Thêm" | user_id: valid UUID, hire_date: "2024-01-15", license_number: "B2-123456", license_expiry: "2029-01-15", role_id: valid UUID | Toast "Tạo nhân viên thành công", redirect về danh sách | High | Functional |
| TC-EMP-028 | Employees | People | Tạo nhân viên - minimum (không liên kết user) | Trang tạo mới | 1. Giữ "Không liên kết" cho người dùng 2. Click "Thêm" | user_id: null, hire_date: null, license_number: null, is_active: true | Tạo thành công, employee không có profile linked | High | Functional |
| TC-EMP-029 | Employees | People | Tạo nhân viên - user_id trùng (đã có hồ sơ) | User đã có employee record | 1. Chọn user đã có hồ sơ 2. Click "Thêm" | user_id: existing employee's user_id | Hiển thị inline error "Người dùng này đã có hồ sơ nhân viên" | High | Negative |
| TC-EMP-030 | Employees | People | Tạo nhân viên - số bằng lái trùng | Đã có employee với license_number | 1. Nhập số bằng lái đã tồn tại 2. Click "Thêm" | license_number: "B2-123456" (đã tồn tại) | Hiển thị inline error "Số bằng lái đã tồn tại trong hệ thống" | High | Negative |
| TC-EMP-031 | Employees | People | Validation - license_number vượt 50 ký tự | Trang form | 1. Nhập 51 ký tự vào số bằng lái 2. Submit | license_number: "a" * 51 | Validation error (maxLength 50) | Medium | Validation |
| TC-EMP-032 | Employees | People | Validation - license_number đúng 50 ký tự (boundary) | Trang form | 1. Nhập đúng 50 ký tự 2. Submit | license_number: "a" * 50 | Tạo thành công | Low | Boundary |
| TC-EMP-033 | Employees | People | Validation - hire_date format sai | Trang form | 1. Nhập hire_date không đúng format | hire_date: "15-03-2024" (DD-MM-YYYY) | Hiển thị lỗi "Ngày không hợp lệ" | Medium | Validation |
| TC-EMP-034 | Employees | People | Validation - license_expiry format sai | Trang form | 1. Nhập license_expiry không đúng format | license_expiry: "2024/03/15" | Hiển thị lỗi "Ngày không hợp lệ" | Medium | Validation |
| TC-EMP-035 | Employees | People | Dropdown người dùng - hiển thị danh sách | Trang form, có profiles | 1. Click dropdown "Người dùng" | N/A | Hiển thị "Không liên kết" + danh sách profiles (full_name + email) | High | Functional |
| TC-EMP-036 | Employees | People | Dropdown người dùng - hiển thị email khi không có full_name | Profile có full_name = null | 1. Mở dropdown người dùng | profile: {full_name: null, email: "test@mail.com"} | Hiển thị "test@mail.com" (không có full_name prefix) | Medium | UI |
| TC-EMP-037 | Employees | People | Dropdown người dùng - loading state | Đang tải profiles | 1. Mở trang form khi profiles đang load | N/A | Hiển thị "Đang tải danh sách người dùng…" với Loader2 icon | Medium | UI |
| TC-EMP-038 | Employees | People | Dropdown người dùng - empty state | Không có profiles | 1. Mở dropdown | profiles: [] | Hiển thị "Chưa có người dùng — tạo người dùng trước" | Medium | UI |
| TC-EMP-039 | Employees | People | Dropdown người dùng - warning khi ≥1000 | Có ≥1000 profiles | 1. Mở trang form | profiles.length >= 1000 | Hiển thị warning "Hiển thị 1000 / 1000 người dùng. Liên hệ quản trị viên..." | Low | UI |
| TC-EMP-040 | Employees | People | Dropdown vai trò - hiển thị danh sách | Trang form, có roles | 1. Click dropdown "Vai trò" | N/A | Hiển thị "Không có vai trò" + danh sách roles theo tên | High | Functional |
| TC-EMP-041 | Employees | People | Dropdown vai trò - loading state | Đang tải roles | 1. Mở trang form khi roles đang load | N/A | Hiển thị "Đang tải danh sách vai trò…" với Loader2 icon | Medium | UI |
| TC-EMP-042 | Employees | People | Dropdown vai trò - empty state | Không có roles | 1. Mở dropdown vai trò | roles: [] | Hiển thị "Chưa có vai trò — tạo vai trò trước" | Medium | UI |
| TC-EMP-043 | Employees | People | Submit disabled khi không có profiles | profiles = [] | 1. Quan sát nút "Thêm" | N/A | Nút submit disabled (disableSubmit = true) | Medium | UI |
| TC-EMP-044 | Employees | People | Submit disabled khi không có roles | roles = [] | 1. Quan sát nút "Thêm" | N/A | Nút submit disabled (disableSubmit = true) | Medium | UI |
| TC-EMP-045 | Employees | People | Switch is_active - default true khi tạo mới | Trang tạo mới | 1. Quan sát switch "Trạng thái hoạt động" | N/A | Switch mặc định ON (is_active = true) | Medium | Functional |
| TC-EMP-046 | Employees | People | Switch is_active - toggle off | Trang form | 1. Click switch để tắt | N/A | Switch chuyển sang OFF, is_active = false | Medium | Functional |
| TC-EMP-047 | Employees | People | Navigate trang chỉnh sửa | Có employee trong danh sách | 1. Click MoreHorizontal 2. Click "Chỉnh sửa" | N/A | Navigate đến trang form với title "Chỉnh sửa nhân viên", form pre-filled | High | Functional |
| TC-EMP-048 | Employees | People | Edit - form pre-filled với dữ liệu hiện tại | Trang edit, employee loaded | 1. Quan sát form | employee: {user_id, hire_date, license_number, license_expiry, is_active} | Tất cả fields pre-filled đúng, role_id từ user_roles | High | Functional |
| TC-EMP-049 | Employees | People | Edit - cập nhật thành công | Trang edit | 1. Sửa license_number 2. Click "Lưu" | license_number: "B2-999999" | Toast "Cập nhật nhân viên thành công", redirect về danh sách | High | Functional |
| TC-EMP-050 | Employees | People | Edit - loading skeleton | Trang edit, đang tải employee | 1. Truy cập trang edit | N/A | Hiển thị Skeleton placeholders cho form fields | Medium | UI |
| TC-EMP-051 | Employees | People | Edit - error state (không tìm thấy) | Employee ID không tồn tại | 1. Truy cập /employees/edit/invalid-id | N/A | Hiển thị "Không tìm thấy hồ sơ nhân viên." + nút "Quay lại danh sách" | Medium | Error Handling |
| TC-EMP-052 | Employees | People | Edit - error state (auth expired) | Session hết hạn | 1. Truy cập trang edit khi session expired | API trả status: 401 | Hiển thị "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Security |
| TC-EMP-053 | Employees | People | Edit - error state generic | API trả lỗi không xác định | 1. Truy cập trang edit khi API lỗi | N/A | Hiển thị "Không thể tải bản ghi. Vui lòng thử lại." + nút "Quay lại danh sách" | Medium | Error Handling |
| TC-EMP-054 | Employees | People | Dirty-state blocker - hiển thị dialog | Form đã thay đổi (isDirty) | 1. Sửa bất kỳ field 2. Click "Hủy" hoặc navigate away | N/A | Hiển thị dialog "Thoát mà không lưu?" với "Bạn có dữ liệu chưa lưu. Thoát không?" | High | Functional |
| TC-EMP-055 | Employees | People | Dirty-state blocker - chọn "Ở lại" | Dialog blocker đang hiển thị | 1. Click "Ở lại" | N/A | Dialog đóng, giữ nguyên trang form với dữ liệu đã nhập | High | Functional |
| TC-EMP-056 | Employees | People | Dirty-state blocker - chọn "Thoát" | Dialog blocker đang hiển thị | 1. Click "Thoát" | N/A | Navigate away, mất dữ liệu chưa lưu | High | Functional |
| TC-EMP-057 | Employees | People | Dirty-state blocker - không hiện khi form chưa thay đổi | Form chưa sửa gì | 1. Click "Hủy" | N/A | Navigate về danh sách ngay, không hiện dialog | Medium | Functional |
| TC-EMP-058 | Employees | People | Dirty-state blocker - không hiện khi đang submit | Form đang submit (isPending) | 1. Submit form 2. Trong lúc pending, navigate | N/A | Không hiện blocker dialog (blocker disabled khi isPending) | Low | Functional |
| TC-EMP-059 | Employees | People | 2-step submit - role assignment thất bại | Employee save OK, role assign fail | 1. Chọn user + role 2. Submit (role API fail) | N/A | Toast warning "Nhân viên đã được lưu, nhưng không thể cập nhật vai trò. Vui lòng thử lại.", redirect về danh sách | High | Error Handling |
| TC-EMP-060 | Employees | People | 2-step submit - không assign role khi user_id null | Tạo employee không liên kết user | 1. Giữ "Không liên kết" 2. Chọn role 3. Submit | user_id: null, role_id: valid | Tạo thành công, KHÔNG gọi assignEmployeeRole (savedUserId = null) | Medium | Functional |
| TC-EMP-061 | Employees | People | 2-step submit - xóa role (set null) | Edit employee đang có role | 1. Đổi vai trò sang "Không có vai trò" 2. Submit | role_id: null | Cập nhật thành công, role bị xóa (DELETE existing, không INSERT mới) | Medium | Functional |
| TC-EMP-062 | Employees | People | Nút submit loading state | Form đang submit | 1. Quan sát nút submit khi pending | N/A | Nút disabled, hiển thị Loader2 spinning icon | Medium | UI |
| TC-EMP-063 | Employees | People | Nút Hủy disabled khi đang submit | Form đang submit | 1. Quan sát nút "Hủy" | N/A | Nút "Hủy" disabled | Low | UI |
| TC-EMP-064 | Employees | People | Back button - quay lại danh sách | Trang form | 1. Click nút ArrowLeft (back) | N/A | Navigate về trang danh sách employees | Medium | Functional |
| TC-EMP-065 | Employees | People | Mở dialog xóa nhân viên | Có employee trong danh sách | 1. Click MoreHorizontal 2. Click "Xóa" | N/A | Mở dialog "Xác nhận xóa" với tên nhân viên | High | Functional |
| TC-EMP-066 | Employees | People | Dialog xóa - hiển thị tên từ profile | Employee có full_name | 1. Mở dialog xóa | profiles.full_name: "Nguyễn Văn A" | Hiển thị "«Nguyễn Văn A»" trong warning text | Medium | UI |
| TC-EMP-067 | Employees | People | Dialog xóa - hiển thị email khi không có tên | Employee có email nhưng không full_name | 1. Mở dialog xóa | profiles: {full_name: null, email: "test@mail.com"} | Hiển thị "«test@mail.com»" | Medium | UI |
| TC-EMP-068 | Employees | People | Dialog xóa - fallback "nhân viên này" | Employee không có profile | 1. Mở dialog xóa | profiles: null | Hiển thị "«nhân viên này»" | Low | UI |
| TC-EMP-069 | Employees | People | Xóa nhân viên thành công | Dialog xóa đang mở | 1. Click "Xóa" | N/A | Toast "Xóa nhân viên thành công", dialog đóng, danh sách refresh | High | Functional |
| TC-EMP-070 | Employees | People | Xóa nhân viên - FK constraint (đã phân công chuyến) | Employee đã có trip assignments | 1. Click "Xóa" | API trả code: "23503" | Toast error "Nhân viên đã được phân công chuyến đi, không thể xóa" | High | Negative |
| TC-EMP-071 | Employees | People | Hủy xóa nhân viên | Dialog xóa đang mở | 1. Click "Hủy" | N/A | Dialog đóng, employee vẫn còn | Medium | Functional |
| TC-EMP-072 | Employees | People | Không thể đóng dialog xóa khi đang xử lý | Dialog đang gọi API delete | 1. Click "Hủy" hoặc overlay | N/A | Dialog không đóng | Medium | UI |
| TC-EMP-073 | Employees | People | Session hết hạn khi tạo nhân viên | Session expired | 1. Fill form 2. Click "Thêm" | API trả code: "PGRST301" | Hiển thị inline error "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Security |
| TC-EMP-074 | Employees | People | Session hết hạn khi load danh sách | Session expired | 1. Truy cập trang | API trả status: 401 | Error state với "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Security |
| TC-EMP-075 | Employees | People | License expiry boundary - đúng 30 ngày | License hết hạn đúng 30 ngày nữa | 1. Xem danh sách | license_expiry: today + 30 days | Hiển thị badge vàng "Sắp hết hạn" (daysLeft <= 30) | Medium | Boundary |
| TC-EMP-076 | Employees | People | License expiry boundary - 31 ngày | License hết hạn 31 ngày nữa | 1. Xem danh sách | license_expiry: today + 31 days | KHÔNG hiển thị badge (daysLeft > 30) | Medium | Boundary |
| TC-EMP-077 | Employees | People | License expiry boundary - hôm nay (0 ngày) | License hết hạn hôm nay | 1. Xem danh sách | license_expiry: today | Hiển thị badge vàng "Sắp hết hạn" (daysLeft = 0, ≤30) | Medium | Boundary |
| TC-EMP-078 | Employees | People | License expiry boundary - hôm qua (-1 ngày) | License đã hết hạn hôm qua | 1. Xem danh sách | license_expiry: today - 1 day | Hiển thị badge đỏ "Hết hạn" (daysLeft < 0) | Medium | Boundary |
| TC-EMP-079 | Employees | People | Form sections layout | Trang form | 1. Quan sát layout | N/A | 3 sections: "Thông tin chung" (left), "Phân quyền" (left below), "Bằng lái xe" (right). 2-column layout trên lg | Low | UI |
| TC-EMP-080 | Employees | People | Placeholder text trong form | Trang tạo mới | 1. Quan sát placeholders | N/A | Người dùng: "Chọn người dùng", Vai trò: "Chọn vai trò", Số bằng lái: "VD: B2-123456" | Low | UI |
| TC-EMP-081 | Employees | People | Search placeholder | Trang danh sách | 1. Quan sát ô tìm kiếm | N/A | Placeholder: "Tìm theo họ tên nhân viên..." | Low | UI |
| TC-EMP-082 | Employees | People | Header và subtitle trang | Đã đăng nhập | 1. Truy cập trang | N/A | h1 "Nhân viên", subtitle "Quản lý danh sách nhân viên và hồ sơ" | Low | UI |
| TC-EMP-083 | Employees | People | Accessibility - sr-only cho back button | Trang form | 1. Focus back button bằng keyboard | N/A | Screen reader đọc "Quay lại" | Low | Accessibility |
| TC-EMP-084 | Employees | People | Accessibility - sr-only cho actions menu | Trang danh sách | 1. Focus actions button | N/A | Screen reader đọc "Mở menu" | Low | Accessibility |
| TC-EMP-085 | Employees | People | Tìm kiếm case-insensitive | Có employee "Nguyễn Văn A" | 1. Nhập "nguyễn" (lowercase) | search: "nguyễn" | Tìm thấy (ilike là case-insensitive) | Medium | Functional |
| TC-EMP-086 | Employees | People | Edit - wait for currentRole before init | Trang edit, role đang load | 1. Truy cập trang edit | N/A | Form KHÔNG init cho đến khi currentRole !== undefined (loading complete) | Medium | Functional |
| TC-EMP-087 | Employees | People | Tạo nhân viên - lỗi không xác định | API trả lỗi unknown | 1. Submit form khi server lỗi | N/A | Hiển thị inline error "Đã xảy ra lỗi, vui lòng thử lại" | Medium | Error Handling |
| TC-EMP-088 | Employees | People | Xóa nhân viên - nút loading state | Dialog đang gọi API | 1. Quan sát nút "Xóa" | N/A | Nút disabled, hiển thị Loader2 spinning | Low | UI |

---

## Summary

| Priority | Count |
|----------|-------|
| High | 27 |
| Medium | 39 |
| Low | 22 |
| **Total** | **88** |

| Test Type | Count |
|-----------|-------|
| Functional | 42 |
| UI | 22 |
| Negative | 3 |
| Error Handling | 4 |
| Security | 4 |
| Validation | 3 |
| Boundary | 5 |
| Performance | 1 |
| Accessibility | 2 |

---

## Items Needing Confirmation

1. **assignEmployeeRole non-atomic**: DELETE existing + INSERT new là 2 operations riêng biệt. Nếu INSERT fail sau DELETE, user mất role hoàn toàn. Có cần wrap trong transaction không?
2. **Search ẩn employees không có profile**: Khi search, dùng `!inner` join nên employees chưa liên kết user sẽ không hiển thị. Đây là intentional hay bug?
3. **Submit disabled khi profiles/roles empty**: Nếu chưa có profiles hoặc roles, toàn bộ form bị block. User không thể tạo employee "Không liên kết" + "Không có vai trò" trong trường hợp này.
4. **License expiry validation**: Không có validation rằng license_expiry phải > hire_date hoặc > today. Có cần business rule này không?
5. **Duplicate user_id check client-side**: Hiện chỉ check ở DB level (23505). Có cần filter dropdown để ẩn users đã có employee record không?
6. **Role dropdown limit 1000**: Nếu có >1000 roles (unlikely nhưng possible), warning hiển thị nhưng user không thể chọn role bị ẩn.
