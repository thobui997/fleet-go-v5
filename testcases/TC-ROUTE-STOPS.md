# Test Cases: Feature Quản lý điểm dừng (Route Stops)

## 1. Feature List Detected

- Hiển thị danh sách điểm dừng của tuyến đường (origin → intermediate stops → destination)
- Thêm điểm dừng trung gian (inline form: chọn trạm + thời gian tùy chọn)
- Xóa điểm dừng trung gian
- Kéo thả sắp xếp thứ tự điểm dừng (DnD @dnd-kit)
- Lưu điểm dừng (non-atomic: DELETE ALL + INSERT)
- Hiển thị trạm đi/trạm đến (locked, non-editable)
- Lọc trạm khả dụng (loại trừ origin, destination, đã thêm)
- Chuyển đổi interval ↔ minutes (PostgreSQL interval format)

---

## 2. Feature Analysis

### Business Flow
1. User truy cập /routes/:id/stops từ danh sách tuyến đường
2. Hệ thống load route info + existing stops + all stations
3. Hiển thị: Trạm đi (locked) → Intermediate stops (draggable) → Trạm đến (locked)
4. User có thể:
   a. Thêm điểm dừng: Click "Thêm điểm dừng" → Inline form → Chọn trạm + nhập thời gian → "Thêm"
   b. Xóa điểm dừng: Click X trên stop row
   c. Sắp xếp: Kéo thả (GripVertical handle) để đổi thứ tự
5. Click "Lưu điểm dừng" → DELETE ALL existing → INSERT new stops → Toast + redirect /routes
6. Click "Hủy" → Navigate về /routes (không có dirty-state blocker)

### Actor / Role
- Manager, Admin (theo SRS)
- Thực tế: Tất cả authenticated users (không có permission check trong code)

### Validation Rules (từ `route-stop-schema.ts`)
| Field | Rule | Error Message |
|-------|------|---------------|
| station_id | required, min 1 char | "Vui lòng chọn trạm dừng" |
| arrival_time_minutes | optional, preprocess ''→null, coerce number, int, positive | "Thời gian phải lớn hơn 0" |

### Error Messages (từ `mapRouteStopError`)
- `23505` → "Trạm đã được sử dụng trong tuyến đường này"
- `23503` → "Trạm không tồn tại hoặc đã bị xóa"
- `23514` → "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)"
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại."
- Default (context='save') → "Lưu thất bại — vui lòng thử lại để tránh mất dữ liệu điểm dừng."
- Default (no context) → "Thao tác thất bại. Vui lòng thử lại."

### Fetch Error Messages (từ `mapFetchError`)
- `PGRST116/406` → "Không tìm thấy tuyến đường."
- `401/403/PGRST301` → "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại."
- Default → "Không thể tải tuyến đường. Vui lòng thử lại."

### Key Business Logic
- **Non-atomic save:** DELETE ALL existing stops → INSERT new (nếu INSERT fail, data đã bị xóa)
- **stop_order:** = array index + 1 (tính từ vị trí trong localStops)
- **estimated_arrival:** Lưu dạng PostgreSQL interval "HH:MM:00", parse về minutes khi load
- **Available stations:** All stations - origin - destination - already added
- **DnD ID:** `${route_id}:${station_id}` cho existing, `crypto.randomUUID()` cho new
- **hasInitializedRef:** Chỉ init localStops 1 lần, chặn background refetch ghi đè
- **Save disabled:** localStops.length === 0 OR isPending
- **Save error:** Inline display (không phải toast), cleared on next save attempt
- **FK_DROPDOWN_PAGE_SIZE:** 1000 (load tất cả stations)

### UI States
- **Loading:** Skeleton (route + stops loading)
- **Route Error:** Error card + "Quay lại danh sách" button
- **Content:** Origin (locked) → DnD list → Destination (locked) → Add button
- **Add Form:** Inline form (station dropdown + arrival_time input)
- **No available stations:** Dropdown rỗng (không có warning message)
- **Saving:** Button "Lưu điểm dừng" disabled + Loader2 spinner
- **Save Error:** Inline error message (AlertCircle + text)
- **Empty stops:** Save button disabled (localStops.length === 0)

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Không có dirty-state blocker (useBlocker) - user có thể navigate away mất data | Confirm: intentional hay missing feature? |
| A2 | Không giới hạn số lượng intermediate stops | Confirm: có max stops per route? |
| A3 | arrival_time_minutes không bắt buộc phải tăng dần theo thứ tự | Confirm: có cần validate thứ tự thời gian? |
| A4 | Không có undo sau khi xóa stop (chỉ undo bằng cách không save) | Confirm: UX concern? |
| A5 | Save với 0 stops = xóa tất cả stops (button disabled, nhưng API cho phép) | Confirm: có scenario nào cần xóa hết stops? |
| A6 | Không validate trùng station_id ở client (rely on DB unique constraint) | Confirm: dropdown đã filter nhưng race condition? |
| A7 | Không có confirmation dialog trước khi save (DELETE ALL là destructive) | Confirm: cần confirm trước save? |
| A8 | Route phải có origin + destination trước khi manage stops | Confirm: enforced ở route creation? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `route-stop.api.ts:21-24` | `saveRouteStops` - DELETE ALL first | Nếu INSERT fail sau DELETE, tất cả stops bị mất vĩnh viễn (non-atomic) | TC-RSTOP-ERR-03 |
| `route-stops-page.tsx:167` | `hasInitializedRef` chỉ set true 1 lần | Nếu user navigate away rồi quay lại cùng component instance, stops không reload | TC-RSTOP-EDGE-04 |
| `route-stops-page.tsx:197-201` | `usedStationIds` includes undefined | Nếu routeData chưa load, Set chứa undefined → filter sai | TC-RSTOP-EDGE-05 |
| `route-stops-page.tsx:220-253` | `handleSave` không check isPending | Double-click có thể trigger 2 saves (button disabled nhưng có race window) | TC-RSTOP-EDGE-01 |
| `route-stop-schema.ts:54-67` | `parseIntervalToMinutes` | Interval "00:00:00" → total=0 → return null (mất data nếu DB có 0) | TC-RSTOP-EDGE-06 |
| `route-stops-page.tsx:130` | No dirty-state blocker | User có thể mất toàn bộ thay đổi khi navigate away accidentally | TC-RSTOP-UI-05 |
| `route-stops-page.tsx:350-354` | Station name lookup via find() | O(n) cho mỗi stop row, performance issue nếu nhiều stations | TC-RSTOP-EDGE-07 |

---

## 5. Test Cases

### 5.1 Functional Tests - Hiển thị & Load

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-FUNC-01 | Route Stops | Management | Hiển thị trang điểm dừng với stops có sẵn | Route có origin, destination, 3 intermediate stops | 1. Truy cập /routes/:id/stops | Route "Hà Nội - Hải Phòng" có 3 stops | 1. Header: "Điểm dừng — Hà Nội - Hải Phòng"<br>2. Trạm đi (MapPin icon, locked)<br>3. 3 intermediate stops (draggable, có GripVertical + X)<br>4. Trạm đến (Flag icon, locked)<br>5. Button "Thêm điểm dừng" + Footer "Hủy"/"Lưu điểm dừng" | Critical | Functional |
| TC-RSTOP-FUNC-02 | Route Stops | Management | Hiển thị trang không có intermediate stops | Route có origin + destination, không có stops | 1. Truy cập /routes/:id/stops | Route mới, chưa có stops | 1. Trạm đi hiển thị<br>2. Không có stop rows<br>3. Trạm đến hiển thị<br>4. Button "Lưu điểm dừng" disabled | High | Functional |
| TC-RSTOP-FUNC-03 | Route Stops | Management | Hiển thị thời gian đến trên stop row | Stop có estimated_arrival = "01:30:00" | 1. Truy cập trang stops | estimated_arrival: "01:30:00" | Stop row hiển thị "90 phút" bên cạnh tên trạm | High | Functional |
| TC-RSTOP-FUNC-04 | Route Stops | Management | Stop không có thời gian đến | Stop có estimated_arrival = null | 1. Truy cập trang stops | estimated_arrival: null | Stop row chỉ hiển thị tên trạm, không có text "phút" | Medium | Functional |
| TC-RSTOP-FUNC-05 | Route Stops | Management | Thứ tự stops theo stop_order ASC | 3 stops với stop_order 1,2,3 | 1. Truy cập trang stops | stops ordered 1→2→3 | Hiển thị đúng thứ tự: stop 1 trên cùng, stop 3 dưới cùng | High | Functional |
| TC-RSTOP-FUNC-06 | Route Stops | Management | Origin/Destination hiển thị tên trạm | Route có origin_station_id + destination_station_id | 1. Quan sát locked rows | origin: "Bến xe Mỹ Đình", dest: "Bến xe Hải Phòng" | Row đầu: "Bến xe Mỹ Đình" + "Trạm đi". Row cuối: "Bến xe Hải Phòng" + "Trạm đến" | High | Functional |
| TC-RSTOP-FUNC-07 | Route Stops | Management | Redirect khi không có route ID | URL /routes//stops hoặc param rỗng | 1. Truy cập URL không có id | id: undefined | Redirect về /routes | Medium | Functional |

### 5.2 Functional Tests - Thêm điểm dừng

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-FUNC-08 | Route Stops | Management | Thêm điểm dừng thành công (có thời gian) | Route loaded, có stations khả dụng | 1. Click "Thêm điểm dừng"<br>2. Chọn trạm "Trạm Hưng Yên"<br>3. Nhập thời gian "45"<br>4. Click "Thêm" | station: "Trạm Hưng Yên", time: 45 | 1. Form đóng<br>2. Stop mới xuất hiện cuối danh sách<br>3. Hiển thị "Trạm Hưng Yên" + "45 phút"<br>4. Stop có drag handle + X button | Critical | Functional |
| TC-RSTOP-FUNC-09 | Route Stops | Management | Thêm điểm dừng không có thời gian | Route loaded | 1. Click "Thêm điểm dừng"<br>2. Chọn trạm<br>3. Để trống thời gian<br>4. Click "Thêm" | station: "Trạm X", time: empty | 1. Stop mới xuất hiện<br>2. Không hiển thị text "phút" | High | Functional |
| TC-RSTOP-FUNC-10 | Route Stops | Management | Trạm đã thêm bị loại khỏi dropdown | Đã thêm "Trạm A" | 1. Thêm "Trạm A"<br>2. Click "Thêm điểm dừng" lần nữa<br>3. Mở dropdown | - | "Trạm A" không còn trong dropdown (đã filtered) | Critical | Functional |
| TC-RSTOP-FUNC-11 | Route Stops | Management | Origin/Destination bị loại khỏi dropdown | Route có origin="Mỹ Đình", dest="Hải Phòng" | 1. Click "Thêm điểm dừng"<br>2. Mở dropdown stations | - | "Mỹ Đình" và "Hải Phòng" không xuất hiện trong dropdown | Critical | Functional |
| TC-RSTOP-FUNC-12 | Route Stops | Management | Hủy form thêm điểm dừng | Form đang mở | 1. Click "Thêm điểm dừng"<br>2. Chọn trạm<br>3. Click "Hủy" | - | 1. Form đóng<br>2. Không có stop mới<br>3. Button "Thêm điểm dừng" hiển thị lại | High | Functional |
| TC-RSTOP-FUNC-13 | Route Stops | Management | Form reset sau khi thêm thành công | Vừa thêm 1 stop | 1. Thêm stop thành công<br>2. Click "Thêm điểm dừng" lại<br>3. Quan sát form | - | Form trống: station_id = "", arrival_time = "" | Medium | Functional |
| TC-RSTOP-FUNC-14 | Route Stops | Management | Thêm nhiều stops liên tiếp | Route loaded | 1. Thêm stop A<br>2. Thêm stop B<br>3. Thêm stop C | 3 stations khác nhau | 3 stops hiển thị theo thứ tự thêm: A → B → C | High | Functional |

### 5.3 Functional Tests - Xóa điểm dừng

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-FUNC-15 | Route Stops | Management | Xóa điểm dừng trung gian | Có 3 intermediate stops | 1. Click X trên stop thứ 2 | - | 1. Stop thứ 2 biến mất<br>2. Còn 2 stops<br>3. Trạm bị xóa xuất hiện lại trong dropdown available | Critical | Functional |
| TC-RSTOP-FUNC-16 | Route Stops | Management | Xóa tất cả intermediate stops | Có 2 stops | 1. Xóa stop 1<br>2. Xóa stop 2 | - | 1. Không còn intermediate stops<br>2. Button "Lưu điểm dừng" disabled (localStops.length === 0) | High | Functional |
| TC-RSTOP-FUNC-17 | Route Stops | Management | Không thể xóa Origin/Destination | Route loaded | 1. Quan sát row Trạm đi<br>2. Quan sát row Trạm đến | - | Không có button X trên Origin/Destination rows (locked) | High | Functional |
| TC-RSTOP-FUNC-18 | Route Stops | Management | Xóa stop rồi thêm lại cùng trạm | Có stop "Trạm A" | 1. Xóa "Trạm A"<br>2. Click "Thêm điểm dừng"<br>3. Chọn "Trạm A"<br>4. Thêm | - | "Trạm A" thêm lại thành công (available sau khi xóa) | Medium | Functional |

### 5.4 Functional Tests - Kéo thả sắp xếp (DnD)

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-FUNC-19 | Route Stops | Management | Kéo thả đổi thứ tự 2 stops | Có stops: A(1), B(2), C(3) | 1. Kéo stop C lên trên stop A<br>2. Thả | - | Thứ tự mới: C(1), A(2), B(3). UI cập nhật ngay. | Critical | Functional |
| TC-RSTOP-FUNC-20 | Route Stops | Management | Kéo thả bằng keyboard | Có 2+ stops | 1. Focus vào drag handle<br>2. Nhấn Space để bắt đầu drag<br>3. Nhấn Arrow Down<br>4. Nhấn Space để thả | - | Stop di chuyển xuống 1 vị trí (KeyboardSensor hoạt động) | High | Functional |
| TC-RSTOP-FUNC-21 | Route Stops | Management | Kéo thả - thả tại vị trí cũ | Có stops A, B | 1. Kéo stop A<br>2. Thả lại vị trí cũ (active.id === over.id) | - | Thứ tự không đổi | Medium | Functional |
| TC-RSTOP-FUNC-22 | Route Stops | Management | Visual feedback khi đang kéo | Có stops | 1. Bắt đầu kéo 1 stop | - | Stop đang kéo có opacity: 0.5 (isDragging state) | Medium | UI |
| TC-RSTOP-FUNC-23 | Route Stops | Management | Không thể kéo Origin/Destination | Route loaded | 1. Thử kéo row Trạm đi<br>2. Thử kéo row Trạm đến | - | Không có drag handle, không thể kéo (không nằm trong SortableContext) | High | Functional |

### 5.5 Functional Tests - Lưu điểm dừng

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-FUNC-24 | Route Stops | Management | Lưu điểm dừng thành công | Có 3 intermediate stops đã sắp xếp | 1. Sắp xếp stops<br>2. Click "Lưu điểm dừng" | 3 stops with order | 1. Toast: "Đã lưu điểm dừng"<br>2. Redirect về /routes<br>3. DB: stops cũ bị xóa, stops mới được insert với stop_order đúng | Critical | Functional |
| TC-RSTOP-FUNC-25 | Route Stops | Management | Lưu với thời gian đến | Stops có arrival_time_minutes | 1. Thêm stop với time=90<br>2. Lưu | arrival_time_minutes: 90 | DB lưu estimated_arrival = "01:30:00" (minutesToInterval) | High | Functional |
| TC-RSTOP-FUNC-26 | Route Stops | Management | Lưu stop không có thời gian | Stop có arrival_time_minutes = null | 1. Thêm stop không nhập time<br>2. Lưu | arrival_time_minutes: null | DB lưu estimated_arrival = null | High | Functional |
| TC-RSTOP-FUNC-27 | Route Stops | Management | stop_order tính đúng sau reorder | Stops: C(was 3), A(was 1), B(was 2) | 1. Reorder thành C, A, B<br>2. Lưu | - | INSERT payload: C.stop_order=1, A.stop_order=2, B.stop_order=3 | High | Functional |
| TC-RSTOP-FUNC-28 | Route Stops | Management | Button Lưu disabled khi không có stops | localStops = [] | 1. Xóa tất cả stops<br>2. Quan sát button | - | Button "Lưu điểm dừng" disabled | High | Functional |
| TC-RSTOP-FUNC-29 | Route Stops | Management | Button Hủy navigate về /routes | Trang stops đang mở | 1. Click "Hủy" | - | Navigate về /routes, không có confirmation dialog | Medium | Functional |
| TC-RSTOP-FUNC-30 | Route Stops | Management | Lưu xóa hết stops cũ trước khi insert | Route có 5 stops cũ, user sửa thành 2 | 1. Xóa 3 stops<br>2. Lưu | - | DB: 5 stops cũ bị DELETE, 2 stops mới được INSERT | High | Functional |

### 5.6 Validation Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-VAL-01 | Route Stops | Management | Submit form không chọn trạm | Add form mở | 1. Không chọn trạm<br>2. Click "Thêm" | station_id: "" | Validation error: "Vui lòng chọn trạm dừng" | Critical | Validation |
| TC-RSTOP-VAL-02 | Route Stops | Management | Thời gian = 0 (boundary, invalid) | Add form mở | 1. Nhập thời gian "0"<br>2. Click "Thêm" | arrival_time_minutes: 0 | Validation error: "Thời gian phải lớn hơn 0" (positive = > 0) | High | Validation |
| TC-RSTOP-VAL-03 | Route Stops | Management | Thời gian âm | Add form mở | 1. Nhập thời gian "-5"<br>2. Click "Thêm" | arrival_time_minutes: -5 | Validation error: "Thời gian phải lớn hơn 0" | High | Validation |
| TC-RSTOP-VAL-04 | Route Stops | Management | Thời gian = 1 (boundary, valid) | Add form mở | 1. Chọn trạm<br>2. Nhập thời gian "1"<br>3. Click "Thêm" | arrival_time_minutes: 1 | Validation pass, stop thêm thành công với "1 phút" | Medium | Boundary |
| TC-RSTOP-VAL-05 | Route Stops | Management | Thời gian không phải số | Add form mở | 1. Nhập "abc" vào thời gian<br>2. Click "Thêm" | arrival_time_minutes: "abc" | Validation error (coerce number fail) | High | Validation |
| TC-RSTOP-VAL-06 | Route Stops | Management | Thời gian số thập phân | Add form mở | 1. Nhập "45.5"<br>2. Click "Thêm" | arrival_time_minutes: 45.5 | Validation error: int() constraint fail (phải là số nguyên) | Medium | Validation |
| TC-RSTOP-VAL-07 | Route Stops | Management | Thời gian rỗng (optional, valid) | Add form mở | 1. Chọn trạm<br>2. Để trống thời gian<br>3. Click "Thêm" | arrival_time_minutes: "" | Validation pass (preprocess ''→null, nullable) | High | Validation |
| TC-RSTOP-VAL-08 | Route Stops | Management | Thời gian rất lớn | Add form mở | 1. Nhập "99999"<br>2. Click "Thêm" | arrival_time_minutes: 99999 | Validation pass (không có max constraint). minutesToInterval(99999) = "1666:39:00" | Low | Boundary |

### 5.7 Negative Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-NEG-01 | Route Stops | Management | Lưu trạm trùng (DB unique constraint) | Bypass client filter somehow | 1. Gọi API trực tiếp với 2 stops cùng station_id | 2 stops same station | Error 23505: "Trạm đã được sử dụng trong tuyến đường này" | High | Negative |
| TC-RSTOP-NEG-02 | Route Stops | Management | Lưu với station_id không tồn tại | Station bị xóa sau khi load dropdown | 1. Thêm stop<br>2. Station bị xóa ở DB<br>3. Lưu | station_id: deleted UUID | Error 23503: "Trạm không tồn tại hoặc đã bị xóa" | High | Negative |
| TC-RSTOP-NEG-03 | Route Stops | Management | Truy cập stops của route không tồn tại | Route ID invalid | 1. Truy cập /routes/invalid-uuid/stops | id: "invalid-uuid" | Error card: "Không tìm thấy tuyến đường." + "Quay lại danh sách" | High | Negative |
| TC-RSTOP-NEG-04 | Route Stops | Management | Lưu khi route bị xóa giữa chừng | Route deleted sau khi page load | 1. Load trang stops<br>2. Route bị xóa ở DB<br>3. Click Lưu | - | Save error (FK violation hoặc delete fail). Inline error hiển thị. | Medium | Negative |
| TC-RSTOP-NEG-05 | Route Stops | Management | Check constraint violation | Data vi phạm DB constraint | 1. Gọi API với stop_order = 0 hoặc negative | stop_order: -1 | Error 23514: "Dữ liệu không hợp lệ (vi phạm ràng buộc kiểm tra)" | Medium | Negative |

### 5.8 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-ERR-01 | Route Stops | Management | Session expired khi lưu | Token hết hạn | 1. Để session expire<br>2. Click "Lưu điểm dừng" | - | Inline error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-RSTOP-ERR-02 | Route Stops | Management | Network error khi lưu | Mất kết nối | 1. Tắt network<br>2. Click "Lưu điểm dừng" | - | Inline error: "Lưu thất bại — vui lòng thử lại để tránh mất dữ liệu điểm dừng." (context='save') | Critical | Error Handling |
| TC-RSTOP-ERR-03 | Route Stops | Management | INSERT fail sau DELETE (data loss) | Network fail sau delete thành công | 1. Click Lưu<br>2. DELETE thành công<br>3. INSERT fail (network/constraint) | - | 1. Inline error hiển thị (urgency message)<br>2. DB: stops cũ đã bị xóa, stops mới chưa insert = DATA LOSS<br>3. User cần retry ngay | Critical | Error Handling |
| TC-RSTOP-ERR-04 | Route Stops | Management | Error cleared on next save attempt | Có save error hiển thị | 1. Lưu thất bại (error hiển thị)<br>2. Click "Lưu điểm dừng" lại | - | 1. Error message biến mất (setSaveError(null))<br>2. Save attempt mới bắt đầu | High | Error Handling |
| TC-RSTOP-ERR-05 | Route Stops | Management | Session expired khi load trang | Token hết hạn | 1. Truy cập /routes/:id/stops với token expired | - | Error card: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." | High | Error Handling |
| TC-RSTOP-ERR-06 | Route Stops | Management | Network error khi load | Mất kết nối | 1. Tắt network<br>2. Truy cập /routes/:id/stops | - | Error card: "Không thể tải tuyến đường. Vui lòng thử lại." + "Quay lại danh sách" | High | Error Handling |

### 5.9 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-UI-01 | Route Stops | Management | Loading skeleton hiển thị | Trang đang load | 1. Truy cập /routes/:id/stops<br>2. Quan sát trước khi data load | - | Skeleton loaders hiển thị: 1 block cho route info + 3 skeleton rows cho stops | High | UI |
| TC-RSTOP-UI-02 | Route Stops | Management | Button Lưu hiển thị spinner khi saving | Click Lưu | 1. Click "Lưu điểm dừng"<br>2. Quan sát button | - | 1. Button hiển thị Loader2 spinner + disabled<br>2. Button "Hủy" cũng disabled | High | UI |
| TC-RSTOP-UI-03 | Route Stops | Management | Inline form toggle | Trang loaded | 1. Click "Thêm điểm dừng"<br>2. Quan sát UI | - | 1. Button "Thêm điểm dừng" biến mất<br>2. Inline form hiển thị (dropdown + input + 2 buttons) | High | UI |
| TC-RSTOP-UI-04 | Route Stops | Management | Back button navigate | Trang loaded | 1. Click ArrowLeft button (header) | - | Navigate về /routes | Medium | UI |
| TC-RSTOP-UI-05 | Route Stops | Management | Không có dirty-state blocker | Form có thay đổi chưa lưu | 1. Thêm/xóa stops<br>2. Click "Hủy" hoặc Back button | - | Navigate away ngay lập tức, KHÔNG có confirmation dialog. Data mất. | High | UI |
| TC-RSTOP-UI-06 | Route Stops | Management | Save error inline display | Save thất bại | 1. Trigger save error | - | Error hiển thị inline (AlertCircle icon + text đỏ), KHÔNG phải toast | High | UI |
| TC-RSTOP-UI-07 | Route Stops | Management | Drag handle cursor style | Hover drag handle | 1. Hover vào GripVertical icon | - | Cursor: grab. Khi đang kéo: cursor thay đổi. | Low | UI |
| TC-RSTOP-UI-08 | Route Stops | Management | Accessibility - aria labels | Trang loaded | 1. Inspect drag handle<br>2. Inspect delete button<br>3. Inspect back button | - | 1. Drag: aria-label="Kéo để sắp xếp"<br>2. Delete: aria-label="Xóa điểm dừng"<br>3. Back: sr-only "Quay lại" | Medium | Accessibility |
| TC-RSTOP-UI-09 | Route Stops | Management | Origin/Destination styling khác biệt | Trang loaded | 1. Quan sát locked rows vs draggable rows | - | Locked rows: border-muted, bg-muted/30, có icon (MapPin/Flag) + label "Trạm đi"/"Trạm đến". Draggable: border thường, bg-background. | Medium | UI |
| TC-RSTOP-UI-10 | Route Stops | Management | Dropdown placeholder | Add form mở | 1. Mở form, chưa chọn trạm | - | Dropdown hiển thị placeholder: "Chọn trạm dừng..." | Low | UI |

### 5.10 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-SEC-01 | Route Stops | Management | Truy cập /routes/:id/stops khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /routes/:id/stops | - | Redirect về /login | Critical | Security |
| TC-RSTOP-SEC-02 | Route Stops | Management | Manipulate route_id trong URL | Authenticated user | 1. Thay đổi :id trong URL thành route của user khác | id: other-user-route-id | Tùy RLS policy: hoặc load thành công (nếu public) hoặc error 403 | Medium | Security |
| TC-RSTOP-SEC-03 | Route Stops | Management | XSS qua station name | Station name chứa script | 1. Tạo station với name chứa `<script>alert(1)</script>`<br>2. Thêm station đó làm stop | - | Station name hiển thị escaped, không execute script | High | Security |
| TC-RSTOP-SEC-04 | Route Stops | Management | API call không có auth token | Token bị xóa | 1. Xóa auth token<br>2. Gọi saveRouteStops | - | Error 401: "Phiên đăng nhập đã hết hạn hoặc bạn không có quyền. Vui lòng đăng nhập lại." | High | Security |
| TC-RSTOP-SEC-05 | Route Stops | Management | Inject invalid UUID vào station_id | Manipulate request | 1. Sửa station_id thành SQL injection string<br>2. Submit | station_id: "'; DROP TABLE route_stops; --" | Supabase parameterized query ngăn injection. Error 23503 hoặc validation fail. | High | Security |

### 5.11 Edge Case & Concurrency Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-EDGE-01 | Route Stops | Management | Double-click "Lưu điểm dừng" | Form valid, có stops | 1. Double-click nhanh button "Lưu" | - | Chỉ 1 save request (button disabled khi isPending). Không duplicate insert. | High | Edge Case |
| TC-RSTOP-EDGE-02 | Route Stops | Management | 2 users edit stops cùng route | 2 sessions | 1. User A load stops<br>2. User B load stops<br>3. User A save (delete+insert)<br>4. User B save (delete+insert) | - | User B save thành công (last-write-wins). User A's changes bị overwrite. | Medium | Concurrency |
| TC-RSTOP-EDGE-03 | Route Stops | Management | Background refetch không ghi đè local edits | TanStack Query refetch | 1. Load trang (init stops)<br>2. Thêm/xóa stops locally<br>3. Background refetch triggers | - | Local edits giữ nguyên (hasInitializedRef = true, không re-init) | High | Edge Case |
| TC-RSTOP-EDGE-04 | Route Stops | Management | Navigate away rồi quay lại | Đã edit stops | 1. Edit stops<br>2. Click "Hủy" (navigate /routes)<br>3. Click "Điểm dừng" lại | - | Trang load lại từ DB (component remount, hasInitializedRef reset). Local edits mất. | Medium | Edge Case |
| TC-RSTOP-EDGE-05 | Route Stops | Management | Trang load khi routeData chưa sẵn sàng | Slow network | 1. Load trang (route chưa load xong)<br>2. Quan sát usedStationIds | - | usedStationIds có thể chứa undefined (routeData?.origin_station_id = undefined). Dropdown vẫn hoạt động (filter bỏ qua undefined). | Low | Edge Case |
| TC-RSTOP-EDGE-06 | Route Stops | Management | Interval "00:00:00" từ DB | DB có estimated_arrival = "00:00:00" | 1. Load stops có interval "00:00:00" | estimated_arrival: "00:00:00" | parseIntervalToMinutes returns null (total=0 → null). Stop hiển thị không có thời gian. | Low | Edge Case |
| TC-RSTOP-EDGE-07 | Route Stops | Management | Route có rất nhiều stops | 50 intermediate stops | 1. Thêm 50 stops<br>2. Kéo thả<br>3. Lưu | 50 stops | 1. DnD vẫn hoạt động<br>2. Save thành công<br>3. Performance acceptable | Low | Performance |
| TC-RSTOP-EDGE-08 | Route Stops | Management | Thời gian đến rất lớn (multi-day interval) | DB có "2 days 03:30:00" | 1. Load stop có interval "2 days 03:30:00" | estimated_arrival: "2 days 03:30:00" | parseIntervalToMinutes = 2*1440 + 3*60 + 30 = 3090. Hiển thị "3090 phút" | Low | Edge Case |

### 5.12 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-RESP-01 | Route Stops | Management | Trang stops trên tablet | Viewport 768px | 1. Mở /routes/:id/stops trên tablet | Viewport: 768x1024 | Layout vẫn usable. Drag handle, stop names, delete buttons accessible. | Medium | Responsive |
| TC-RSTOP-RESP-02 | Route Stops | Management | Trang stops trên mobile | Viewport 375px | 1. Mở /routes/:id/stops trên mobile | Viewport: 375x667 | 1. Stop rows không bị overflow<br>2. Add form fields stack vertically<br>3. Footer buttons accessible<br>4. Drag vẫn hoạt động (touch) | Medium | Responsive |
| TC-RSTOP-RESP-03 | Route Stops | Management | Inline form trên mobile | Viewport 375px | 1. Mở add form trên mobile | Viewport: 375x667 | Dropdown + input + buttons hiển thị đầy đủ, không bị cắt | Medium | Responsive |

### 5.13 API Test Detail

#### Save Route Stops - Request Flow

```json
// Step 1: DELETE all existing stops
DELETE /rest/v1/route_stops?route_id=eq.{routeId}

// Step 2: INSERT new stops (if any)
POST /rest/v1/route_stops
[
  {
    "route_id": "uuid-route",
    "station_id": "uuid-station-1",
    "stop_order": 1,
    "estimated_arrival": "00:45:00"
  },
  {
    "route_id": "uuid-route",
    "station_id": "uuid-station-2",
    "stop_order": 2,
    "estimated_arrival": "01:30:00"
  },
  {
    "route_id": "uuid-route",
    "station_id": "uuid-station-3",
    "stop_order": 3,
    "estimated_arrival": null
  }
]
```

#### Fetch Route Stops - Request

```json
GET /rest/v1/route_stops?route_id=eq.{routeId}&select=*,station:stations(id,name)&order=stop_order.asc
```

#### Error Response - Duplicate Station (23505)

```json
{
  "code": "23505",
  "details": "Key (route_id, station_id)=(uuid, uuid) already exists.",
  "message": "duplicate key value violates unique constraint \"route_stops_pkey\""
}
```

#### Error Response - Station Not Found (23503)

```json
{
  "code": "23503",
  "details": "Key (station_id)=(uuid) is not present in table \"stations\".",
  "message": "insert or update on table \"route_stops\" violates foreign key constraint \"route_stops_station_fk\""
}
```

### 5.14 API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-RSTOP-API-01 | Route Stops | Management | GET route_stops - fetch by route_id | Auth valid, route có stops | 1. GET /rest/v1/route_stops?route_id=eq.{id}&select=*,station:stations(id,name)&order=stop_order.asc | - | Status 200, array of stops ordered by stop_order, station name joined | High | API |
| TC-RSTOP-API-02 | Route Stops | Management | GET route_stops - route không có stops | Auth valid, route mới | 1. GET /rest/v1/route_stops?route_id=eq.{id} | - | Status 200, empty array [] | Medium | API |
| TC-RSTOP-API-03 | Route Stops | Management | DELETE route_stops - xóa tất cả | Auth valid | 1. DELETE /rest/v1/route_stops?route_id=eq.{id} | - | Status 200/204, tất cả stops bị xóa | High | API |
| TC-RSTOP-API-04 | Route Stops | Management | POST route_stops - insert nhiều stops | Auth valid | 1. POST /rest/v1/route_stops với array 3 stops | Valid stops data | Status 201, 3 records created | High | API |
| TC-RSTOP-API-05 | Route Stops | Management | POST route_stops - duplicate station (PK violation) | Auth valid | 1. POST với 2 stops cùng station_id | Duplicate station | Status 409, code 23505 | Critical | API |
| TC-RSTOP-API-06 | Route Stops | Management | POST route_stops - duplicate stop_order | Auth valid | 1. POST với 2 stops cùng stop_order | Duplicate order | Status 409, code 23505 (unique constraint) | High | API |
| TC-RSTOP-API-07 | Route Stops | Management | POST route_stops - invalid station_id | Auth valid | 1. POST với station_id không tồn tại | station_id: random UUID | Status 409, code 23503 | High | API |
| TC-RSTOP-API-08 | Route Stops | Management | POST route_stops - stop_order <= 0 | Auth valid | 1. POST với stop_order = 0 | stop_order: 0 | Status 400, code 23514 (check constraint) | Medium | API |
| TC-RSTOP-API-09 | Route Stops | Management | POST route_stops - no auth | Không có token | 1. POST không auth header | - | Status 401 | High | API |
| TC-RSTOP-API-10 | Route Stops | Management | DELETE route_stops - cascade khi xóa route | Auth valid | 1. DELETE /rest/v1/routes?id=eq.{id} | - | Route bị xóa, tất cả route_stops cascade delete | Medium | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Dirty-state blocker (useBlocker) khi navigate away | Code hiện tại KHÔNG có blocker. User có thể mất data. Cần confirm: intentional hay cần thêm? |
| 2 | Max số lượng intermediate stops per route | Không có giới hạn trong code. Cần confirm business rule? |
| 3 | Validate thời gian đến phải tăng dần theo thứ tự | Code không validate. Stop 1 có thể có arrival > stop 2. Cần confirm? |
| 4 | Confirmation dialog trước khi save (DELETE ALL là destructive) | Hiện không có confirm. Cần confirm UX requirement? |
| 5 | pickup_allowed / dropoff_allowed management | DB có 2 columns này nhưng UI không cho phép edit. Cần confirm: future feature? |
| 6 | Atomic save (transaction) thay vì DELETE+INSERT | Hiện tại non-atomic, có risk data loss. Cần confirm: acceptable risk hay cần fix? |
| 7 | Undo/Redo cho thao tác xóa stop | Hiện không có undo. Cần confirm: UX improvement? |
| 8 | Validate station phải active (is_active=true) | Code load tất cả stations không filter is_active. Cần confirm? |
