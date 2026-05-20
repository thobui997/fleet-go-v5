# Test Cases: FR-14 - Quản lý phân quyền (Roles)

## Feature Analysis (from source code)

### Validation Rules (Zod Schema - `role-form-schema.ts`)
- **name**: required (min 1), max 100 chars → "Tên vai trò là bắt buộc"
- **description**: optional, max 500 chars
- **permissions**: array of strings, each min 1 char, regex `^\S+$` → "Quyền không được chứa khoảng trắng"

### Error Mapping (`mapRoleError`)
- `PGRST301/401/403` → "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại"
- `roles_name_key` or `(name)` → "Tên vai trò đã tồn tại, vui lòng chọn tên khác"
- `23514` → "Dữ liệu quyền không hợp lệ, vui lòng thử lại"
- Default → "Đã xảy ra lỗi, vui lòng thử lại"

### API Operations (`role.api.ts`)
- **fetchRoles**: paginated, search by name (ilike), order by name ASC
- **fetchRole**: single by ID
- **createRole**: insert + select single
- **updateRole**: update by ID + select single
- **deleteRole**: delete by ID

### UI Behavior
- **List page**: DataTable with columns (Tên vai trò [sortable], Mô tả, Quyền, Ngày tạo, Actions)
- **Search**: debounce 300ms, ilike on name, resets page to 1
- **Empty state**: "Chưa có vai trò nào"
- **Error state**: error message + "Thử lại" button
- **Form dialog**: Create/Edit with permissions chip editor
- **Permissions chip editor**: Input + "Thêm" button, Enter key adds, duplicate check, X to remove
- **Delete dialog**: Warning about cascading role removal, inline error display
- **Dialog lock**: Cannot close while isPending
- **Toast messages**: "Tạo vai trò thành công" / "Cập nhật vai trò thành công" / "Xóa vai trò thành công"
- **Submit error**: Displayed inline (not toast)
- **Description serialization**: empty string → null

### Assumptions
1. User đã đăng nhập và có quyền truy cập trang Roles
2. Hệ thống đã có dữ liệu roles mẫu để test list/search/edit/delete
3. Pagination mặc định: page=1, pageSize=10

### Potential Risks/Bugs from Code
1. Permissions array có thể empty (không có min validation trên array) - role không có quyền nào
2. Delete cascade warning nhưng không có FK constraint error mapping - nếu DB có FK constraint sẽ hiện generic error
3. Search input không sanitize SQL wildcards (%, _) - có thể ảnh hưởng kết quả tìm kiếm
4. Form reset dùng useEffect([open, role]) - race condition nếu role thay đổi nhanh
5. permInput.trim() trước khi add nhưng regex `^\S+$` check toàn bộ string - whitespace ở giữa sẽ bị reject

---

## Test Cases

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-ROLES-001 | Roles | People | Hiển thị danh sách vai trò | Đã đăng nhập, có dữ liệu roles | 1. Truy cập trang Vai trò | N/A | Hiển thị DataTable với các cột: Tên vai trò, Mô tả, Quyền, Ngày tạo, Actions. Dữ liệu sắp xếp theo tên ASC | High | Functional |
| TC-ROLES-002 | Roles | People | Hiển thị trạng thái loading | Đã đăng nhập | 1. Truy cập trang Vai trò khi đang tải dữ liệu | N/A | Hiển thị skeleton/loading indicator trong DataTable | Medium | UI |
| TC-ROLES-003 | Roles | People | Hiển thị trạng thái empty | Đã đăng nhập, không có roles nào | 1. Truy cập trang Vai trò | N/A | Hiển thị message "Chưa có vai trò nào" | Medium | UI |
| TC-ROLES-004 | Roles | People | Hiển thị trạng thái error | Đã đăng nhập, API trả lỗi | 1. Truy cập trang Vai trò khi API lỗi | N/A | Hiển thị error message + nút "Thử lại" với icon RefreshCw | Medium | UI |
| TC-ROLES-005 | Roles | People | Retry khi lỗi | Đang hiển thị error state | 1. Click nút "Thử lại" | N/A | Gọi lại API fetchRoles, hiển thị dữ liệu nếu thành công | Medium | Functional |
| TC-ROLES-006 | Roles | People | Hiển thị cột Mô tả khi null | Có role với description = null | 1. Xem danh sách roles | Role có description: null | Cột Mô tả hiển thị "—" | Low | UI |
| TC-ROLES-007 | Roles | People | Hiển thị cột Quyền | Có role với permissions array | 1. Xem danh sách roles | Role có permissions: ["read", "write", "delete"] | Cột Quyền hiển thị "3 quyền" | Medium | UI |
| TC-ROLES-008 | Roles | People | Hiển thị cột Ngày tạo format vi-VN | Có role với created_at | 1. Xem danh sách roles | created_at: "2024-03-15T10:00:00Z" | Hiển thị "15/3/2024" (format vi-VN) | Low | UI |
| TC-ROLES-009 | Roles | People | Pagination - chuyển trang | Có >10 roles | 1. Xem trang 1 2. Click chuyển sang trang 2 | 15 roles trong DB | Trang 2 hiển thị 5 roles còn lại | High | Functional |
| TC-ROLES-010 | Roles | People | Pagination - thay đổi pageSize | Có nhiều roles | 1. Thay đổi pageSize từ 10 sang 20 | N/A | Hiển thị tối đa 20 roles, page reset về 1 | Medium | Functional |
| TC-ROLES-011 | Roles | People | Tìm kiếm theo tên vai trò | Có nhiều roles | 1. Nhập "admin" vào ô tìm kiếm 2. Chờ 300ms debounce | search: "admin" | Hiển thị chỉ các roles có tên chứa "admin" (ilike), page reset về 1 | High | Functional |
| TC-ROLES-012 | Roles | People | Tìm kiếm - debounce 300ms | Có nhiều roles | 1. Nhập "ad" 2. Ngay lập tức nhập thêm "min" | search: "admin" | Chỉ gọi API 1 lần với keyword "admin" sau 300ms từ lần gõ cuối | Medium | Performance |
| TC-ROLES-013 | Roles | People | Tìm kiếm - không có kết quả | Có roles nhưng không match | 1. Nhập "xyznotexist" vào ô tìm kiếm | search: "xyznotexist" | Hiển thị "Chưa có vai trò nào" (empty state) | Medium | Functional |
| TC-ROLES-014 | Roles | People | Tìm kiếm - xóa keyword | Đang filter với keyword | 1. Xóa hết text trong ô tìm kiếm 2. Chờ 300ms | search: "" | Hiển thị lại toàn bộ roles (search=undefined) | Medium | Functional |
| TC-ROLES-015 | Roles | People | Tìm kiếm - ký tự đặc biệt SQL | Có roles | 1. Nhập "%" vào ô tìm kiếm | search: "%" | Không gây lỗi SQL injection, trả kết quả phù hợp hoặc empty | Low | Security |
| TC-ROLES-016 | Roles | People | Sắp xếp theo tên vai trò | Có nhiều roles | 1. Click header "Tên vai trò" để sort | N/A | Danh sách được sắp xếp theo tên (mặc định ASC từ API) | Medium | Functional |
| TC-ROLES-017 | Roles | People | Mở dialog tạo vai trò mới | Đã đăng nhập | 1. Click nút "Thêm vai trò" | N/A | Mở dialog với title "Thêm vai trò mới", form trống (name="", description="", permissions=[]) | High | Functional |
| TC-ROLES-018 | Roles | People | Tạo vai trò thành công - đầy đủ thông tin | Dialog tạo mới đang mở | 1. Nhập tên "dispatcher" 2. Nhập mô tả "Điều phối viên" 3. Thêm quyền "trips:read" 4. Thêm quyền "trips:write" 5. Click "Lưu" | name: "dispatcher", description: "Điều phối viên", permissions: ["trips:read", "trips:write"] | Toast "Tạo vai trò thành công", dialog đóng, danh sách refresh | High | Functional |
| TC-ROLES-019 | Roles | People | Tạo vai trò thành công - chỉ tên (minimum) | Dialog tạo mới đang mở | 1. Nhập tên "viewer" 2. Click "Lưu" | name: "viewer", description: null, permissions: [] | Toast "Tạo vai trò thành công", dialog đóng. Description gửi API = null | High | Functional |
| TC-ROLES-020 | Roles | People | Tạo vai trò - tên trống | Dialog tạo mới đang mở | 1. Để trống tên 2. Click "Lưu" | name: "" | Hiển thị lỗi "Tên vai trò là bắt buộc" dưới field name | High | Validation |
| TC-ROLES-021 | Roles | People | Tạo vai trò - tên vượt 100 ký tự | Dialog tạo mới đang mở | 1. Nhập tên 101 ký tự 2. Click "Lưu" | name: "a" * 101 | Hiển thị lỗi validation max length dưới field name | Medium | Validation |
| TC-ROLES-022 | Roles | People | Tạo vai trò - tên đúng 100 ký tự (boundary) | Dialog tạo mới đang mở | 1. Nhập tên đúng 100 ký tự 2. Click "Lưu" | name: "a" * 100 | Tạo thành công, không lỗi validation | Medium | Boundary |
| TC-ROLES-023 | Roles | People | Tạo vai trò - mô tả vượt 500 ký tự | Dialog tạo mới đang mở | 1. Nhập tên hợp lệ 2. Nhập mô tả 501 ký tự 3. Click "Lưu" | description: "a" * 501 | Hiển thị lỗi validation max length dưới field description | Medium | Validation |
| TC-ROLES-024 | Roles | People | Tạo vai trò - mô tả đúng 500 ký tự (boundary) | Dialog tạo mới đang mở | 1. Nhập tên hợp lệ 2. Nhập mô tả đúng 500 ký tự 3. Click "Lưu" | description: "a" * 500 | Tạo thành công, không lỗi validation | Low | Boundary |
| TC-ROLES-025 | Roles | People | Tạo vai trò - mô tả chỉ khoảng trắng | Dialog tạo mới đang mở | 1. Nhập tên hợp lệ 2. Nhập mô tả "   " (spaces) 3. Click "Lưu" | description: "   " | Tạo thành công, description gửi API = null (trim → empty → null) | Medium | Functional |
| TC-ROLES-026 | Roles | People | Tạo vai trò - tên trùng lặp | Dialog tạo mới, đã có role "admin" | 1. Nhập tên "admin" 2. Click "Lưu" | name: "admin" (đã tồn tại) | Hiển thị inline error "Tên vai trò đã tồn tại, vui lòng chọn tên khác" | High | Negative |
| TC-ROLES-027 | Roles | People | Thêm quyền bằng nút "Thêm" | Dialog form đang mở | 1. Nhập "vehicles:read" vào ô quyền 2. Click nút "Thêm" | permInput: "vehicles:read" | Quyền hiển thị dạng chip/badge, ô input được xóa trắng | High | Functional |
| TC-ROLES-028 | Roles | People | Thêm quyền bằng phím Enter | Dialog form đang mở | 1. Nhập "vehicles:write" vào ô quyền 2. Nhấn Enter | permInput: "vehicles:write" | Quyền được thêm vào danh sách chip, form không submit (preventDefault) | High | Functional |
| TC-ROLES-029 | Roles | People | Thêm quyền trùng lặp | Đã có quyền "vehicles:read" | 1. Nhập "vehicles:read" 2. Click "Thêm" | permInput: "vehicles:read" (duplicate) | Không thêm duplicate, danh sách giữ nguyên 1 chip | Medium | Negative |
| TC-ROLES-030 | Roles | People | Thêm quyền - input trống | Dialog form đang mở | 1. Để trống ô quyền 2. Click "Thêm" | permInput: "" | Không thêm gì, không lỗi | Low | Negative |
| TC-ROLES-031 | Roles | People | Thêm quyền - chỉ khoảng trắng | Dialog form đang mở | 1. Nhập "   " vào ô quyền 2. Click "Thêm" | permInput: "   " | Không thêm (trim → empty → return) | Low | Negative |
| TC-ROLES-032 | Roles | People | Thêm quyền chứa khoảng trắng ở giữa | Dialog form đang mở | 1. Nhập "vehicles read" 2. Click "Thêm" 3. Submit form | permInput: "vehicles read" | Quyền được thêm vào chip nhưng khi submit, Zod validation fail: "Quyền không được chứa khoảng trắng" | Medium | Validation |
| TC-ROLES-033 | Roles | People | Xóa quyền khỏi danh sách | Có quyền "vehicles:read" trong danh sách | 1. Click nút X trên chip "vehicles:read" | N/A | Chip "vehicles:read" bị xóa khỏi danh sách permissions | High | Functional |
| TC-ROLES-034 | Roles | People | Mở dialog chỉnh sửa vai trò | Có role "admin" trong danh sách | 1. Click icon MoreHorizontal trên row 2. Click "Chỉnh sửa" | N/A | Mở dialog với title "Chỉnh sửa vai trò", form pre-filled với dữ liệu role (name, description, permissions chips) | High | Functional |
| TC-ROLES-035 | Roles | People | Cập nhật vai trò thành công | Dialog edit đang mở | 1. Sửa tên thành "super_admin" 2. Thêm quyền mới 3. Click "Lưu" | name: "super_admin" | Toast "Cập nhật vai trò thành công", dialog đóng, danh sách refresh | High | Functional |
| TC-ROLES-036 | Roles | People | Cập nhật vai trò - tên trùng role khác | Dialog edit đang mở, có role "manager" khác | 1. Sửa tên thành "manager" 2. Click "Lưu" | name: "manager" (trùng role khác) | Hiển thị inline error "Tên vai trò đã tồn tại, vui lòng chọn tên khác" | High | Negative |
| TC-ROLES-037 | Roles | People | Form reset khi mở dialog tạo mới | Vừa đóng dialog edit | 1. Click "Thêm vai trò" | N/A | Form reset hoàn toàn: name="", description="", permissions=[], submitError=null, permInput="" | Medium | Functional |
| TC-ROLES-038 | Roles | People | Form reset khi mở dialog edit | Vừa đóng dialog tạo mới | 1. Click "Chỉnh sửa" trên một role | N/A | Form pre-filled với dữ liệu role hiện tại, submitError=null, permInput="" | Medium | Functional |
| TC-ROLES-039 | Roles | People | Không thể đóng dialog khi đang submit | Dialog đang gọi API (isPending=true) | 1. Click nút "Hủy" hoặc click overlay 2. Hoặc nhấn Escape | N/A | Dialog không đóng, vẫn hiển thị loading state | Medium | UI |
| TC-ROLES-040 | Roles | People | Nút Lưu disabled khi đang submit | Dialog đang gọi API | 1. Quan sát nút "Lưu" khi đang submit | N/A | Nút "Lưu" disabled, hiển thị icon Loader2 spinning | Medium | UI |
| TC-ROLES-041 | Roles | People | Nút Hủy disabled khi đang submit | Dialog đang gọi API | 1. Quan sát nút "Hủy" khi đang submit | N/A | Nút "Hủy" disabled | Low | UI |
| TC-ROLES-042 | Roles | People | Mở dialog xóa vai trò | Có role "tester" trong danh sách | 1. Click icon MoreHorizontal 2. Click "Xóa" | N/A | Mở dialog xác nhận với title "Xác nhận xóa vai trò" và warning text chứa tên role «tester» | High | Functional |
| TC-ROLES-043 | Roles | People | Hiển thị warning text khi xóa | Dialog xóa đang mở cho role "admin" | 1. Đọc nội dung warning | N/A | Hiển thị: "Xóa vai trò «admin» sẽ tự động hủy phân quyền của tất cả người dùng đang sử dụng vai trò này. Hành động này không thể hoàn tác." | Medium | UI |
| TC-ROLES-044 | Roles | People | Xóa vai trò thành công | Dialog xóa đang mở | 1. Click nút "Xóa" | N/A | Toast "Xóa vai trò thành công", dialog đóng, danh sách refresh (role biến mất) | High | Functional |
| TC-ROLES-045 | Roles | People | Hủy xóa vai trò | Dialog xóa đang mở | 1. Click nút "Hủy" | N/A | Dialog đóng, role vẫn còn trong danh sách | Medium | Functional |
| TC-ROLES-046 | Roles | People | Không thể đóng dialog xóa khi đang xử lý | Dialog xóa đang gọi API | 1. Click "Hủy" hoặc overlay | N/A | Dialog không đóng, nút "Xóa" hiển thị Loader2 | Medium | UI |
| TC-ROLES-047 | Roles | People | Xóa vai trò - lỗi server | Dialog xóa đang mở, API trả lỗi | 1. Click "Xóa" khi server lỗi | N/A | Hiển thị inline error "Đã xảy ra lỗi, vui lòng thử lại", dialog không đóng | Medium | Error Handling |
| TC-ROLES-048 | Roles | People | Xóa vai trò - error cleared khi đóng dialog | Đang hiển thị deleteError | 1. Click "Hủy" (khi không isPending) | N/A | Dialog đóng, deleteError được reset về null | Low | UI |
| TC-ROLES-049 | Roles | People | Session hết hạn khi tạo vai trò | Dialog tạo mới, session expired | 1. Nhập thông tin hợp lệ 2. Click "Lưu" | API trả code: "PGRST301" | Hiển thị inline error "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" | High | Security |
| TC-ROLES-050 | Roles | People | Session hết hạn khi load danh sách | Session expired | 1. Truy cập trang Vai trò | API trả code: "401" | Hiển thị error state với message "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại" + nút "Thử lại" | High | Security |
| TC-ROLES-051 | Roles | People | Lỗi check constraint (23514) | Dialog form đang mở | 1. Submit form với dữ liệu vi phạm DB constraint | API trả code: "23514" | Hiển thị inline error "Dữ liệu quyền không hợp lệ, vui lòng thử lại" | Medium | Error Handling |
| TC-ROLES-052 | Roles | People | Lỗi không xác định | Dialog form đang mở | 1. Submit form khi có lỗi không mapped | API trả lỗi unknown | Hiển thị inline error "Đã xảy ra lỗi, vui lòng thử lại" | Medium | Error Handling |
| TC-ROLES-053 | Roles | People | Submit error hiển thị inline (không phải toast) | Dialog form đang mở | 1. Submit form gây lỗi | N/A | Error message hiển thị bên trong dialog (dưới form), KHÔNG phải toast notification | Medium | UI |
| TC-ROLES-054 | Roles | People | Submit error cleared khi submit lại | Đang hiển thị submitError | 1. Sửa dữ liệu 2. Click "Lưu" lại | N/A | submitError được reset về null trước khi gọi API | Low | Functional |
| TC-ROLES-055 | Roles | People | Tạo vai trò với nhiều quyền | Dialog tạo mới | 1. Thêm 10 quyền khác nhau 2. Click "Lưu" | permissions: ["users:read", "users:write", "vehicles:read", ...] (10 items) | Tạo thành công, tất cả 10 quyền được lưu | Medium | Functional |
| TC-ROLES-056 | Roles | People | Quyền với ký tự đặc biệt hợp lệ | Dialog form đang mở | 1. Thêm quyền "module:action.sub-action" 2. Submit | permInput: "module:action.sub-action" | Thêm thành công (regex `^\S+$` cho phép mọi non-whitespace) | Low | Boundary |
| TC-ROLES-057 | Roles | People | Hiển thị header và subtitle trang | Đã đăng nhập | 1. Truy cập trang Vai trò | N/A | Hiển thị h1 "Vai trò" và subtitle "Quản lý vai trò và phân quyền hệ thống" | Low | UI |
| TC-ROLES-058 | Roles | People | Actions menu - hiển thị đúng options | Có role trong danh sách | 1. Click icon MoreHorizontal | N/A | Dropdown hiển thị 2 options: "Chỉnh sửa" (icon Pencil) và "Xóa" (icon Trash2, text-destructive) với separator | Low | UI |
| TC-ROLES-059 | Roles | People | Accessibility - screen reader cho actions button | Có role trong danh sách | 1. Focus vào actions button bằng keyboard | N/A | Screen reader đọc "Mở menu" (sr-only span) | Low | Accessibility |
| TC-ROLES-060 | Roles | People | Accessibility - screen reader cho nút xóa quyền | Có chip quyền "vehicles:read" | 1. Focus vào nút X trên chip | N/A | Screen reader đọc "Xóa vehicles:read" (sr-only span) | Low | Accessibility |
| TC-ROLES-061 | Roles | People | Tìm kiếm case-insensitive | Có role "Admin" | 1. Nhập "admin" (lowercase) | search: "admin" | Tìm thấy role "Admin" (ilike là case-insensitive) | Medium | Functional |
| TC-ROLES-062 | Roles | People | Placeholder text trong form | Dialog tạo mới đang mở | 1. Quan sát các placeholder | N/A | Name: "VD: dispatcher", Description: "Mô tả vai trò (tùy chọn)", Permission input: "Ví dụ: vehicles:read" | Low | UI |
| TC-ROLES-063 | Roles | People | Search placeholder | Trang roles đang hiển thị | 1. Quan sát ô tìm kiếm | N/A | Placeholder: "Tìm theo tên vai trò..." | Low | UI |
| TC-ROLES-064 | Roles | People | Tạo vai trò - tên 1 ký tự (boundary min) | Dialog tạo mới | 1. Nhập tên "A" 2. Click "Lưu" | name: "A" | Tạo thành công (min=1 satisfied) | Low | Boundary |
| TC-ROLES-065 | Roles | People | Edit pre-fill description null thành empty string | Có role với description=null | 1. Click "Chỉnh sửa" | role.description: null | Form hiển thị description="" (null → '' via `role.description ?? ''`) | Low | Functional |

---

## Summary

| Priority | Count |
|----------|-------|
| High | 18 |
| Medium | 30 |
| Low | 17 |
| **Total** | **65** |

| Test Type | Count |
|-----------|-------|
| Functional | 32 |
| UI | 16 |
| Validation | 4 |
| Negative | 4 |
| Boundary | 4 |
| Error Handling | 3 |
| Security | 3 |
| Performance | 1 |
| Accessibility | 2 |

---

## Items Needing Confirmation

1. **Permissions array minimum**: Code không có `.min(1)` trên array permissions - role có thể tạo với 0 quyền. Đây là intentional hay bug?
2. **FK constraint khi xóa**: Warning text nói "tự động hủy phân quyền" nhưng code không map FK error (23503). Nếu DB có FK constraint, delete có thể fail với generic error thay vì message rõ ràng.
3. **Permission format convention**: Placeholder gợi ý "vehicles:read" nhưng không có validation format cụ thể (chỉ check no-whitespace). Có convention nào cho permission naming?
4. **Role name uniqueness scope**: Unique constraint trên name là global. Có cần phân biệt theo tenant/org không?
5. **Maximum permissions per role**: Không có giới hạn số lượng permissions. Có cần cap không?
