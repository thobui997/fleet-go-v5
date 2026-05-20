# Test Cases: Feature Login (Đăng nhập hệ thống)

## 1. Feature List Detected

- Đăng nhập bằng email/password
- Validation form (email format, password min length)
- Error handling (sai credentials, tài khoản chưa xác nhận, rate limit)
- Session management (JWT token, auto-refresh)
- Protected routes (redirect khi chưa đăng nhập)
- Post-login redirect (quay lại trang intended)
- UI states (loading skeleton, submitting, password toggle)

---

## 2. Feature Analysis

### Business Flow
1. User truy cập hệ thống → ProtectedRoute kiểm tra auth
2. Chưa đăng nhập → Redirect đến `/login` (lưu intended URL vào location state)
3. User nhập email + password → Submit form
4. Supabase Auth xác thực → Thành công: redirect đến dashboard/intended URL
5. Thất bại → Hiển thị toast error message tiếng Việt

### Actor / Role
- Tất cả users (Admin, Manager, Dispatcher, Ticket Agent, Driver, Inspector)

### Input / Output
- **Input:** email (string), password (string)
- **Output:** JWT session token, redirect to dashboard

### Validation Rules (từ source code `login-schema.ts`)
- `email`: bắt buộc, phải là email hợp lệ → Error: "Vui lòng nhập email hợp lệ"
- `password`: bắt buộc, tối thiểu 6 ký tự → Error: "Mật khẩu phải có ít nhất 6 ký tự"

### Error Messages (từ source code `login-page.tsx`)
- `invalid_credentials` → "Email hoặc mật khẩu không chính xác"
- `email_not_confirmed` → "Tài khoản chưa được xác nhận. Vui lòng liên hệ quản trị viên."
- `too_many_requests` → "Quá nhiều lần thử. Vui lòng thử lại sau."
- `Invalid login credentials` → "Email hoặc mật khẩu không chính xác"
- Default fallback → "Đã xảy ra lỗi. Vui lòng thử lại."

### UI States
- **Auth Loading:** Skeleton loading (kiểm tra session ban đầu)
- **Already Authenticated:** Auto-redirect đến dashboard
- **Form Idle:** Email + Password fields enabled, button "Đăng nhập"
- **Submitting:** Inputs disabled, button text "Đang đăng nhập..."
- **Password Toggle:** Eye/EyeOff icon để show/hide password

### Dependencies
- Supabase Auth service
- Internet connection
- Valid user account trong Supabase

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Không có chức năng "Quên mật khẩu" trên UI | Confirm với BA |
| A2 | Không có chức năng "Đăng ký tài khoản" trên UI (chỉ admin tạo) | Confirm với BA |
| A3 | Không có lockout policy sau N lần sai (chỉ rate limit từ Supabase) | Confirm với BA |
| A4 | Session timeout dựa hoàn toàn vào Supabase JWT expiry | Confirm với Dev |
| A5 | Không có "Remember me" checkbox | Confirm với BA |
| A6 | Password không có max length validation ở client | Confirm với Dev |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `login-page.tsx:100` | `window.location.href = from` | XSS nếu `from` bị inject qua URL state | TC-LOGIN-SEC-01 |
| `login-page.tsx:92` | `location.state as LocationState` | Nếu state bị tamper, có thể redirect đến URL ngoài | TC-LOGIN-SEC-02 |
| `auth-context.tsx:29` | `signInWithPassword` | Không có timeout handling, có thể treo nếu network chậm | TC-LOGIN-ERR-05 |
| `login-page.tsx:34` | `getAuthErrorMessage` | Fallback message generic, không phân biệt network error vs server error | TC-LOGIN-ERR-06 |
| `login-schema.ts:4` | `z.string().email()` | Zod email validation có thể accept một số format edge case | TC-LOGIN-VAL-06 |
| `protected-route.tsx:29` | `Navigate to="/login"` | Nếu user ở /login và session expire, không có infinite loop check | TC-LOGIN-FUNC-08 |

---

## 5. Test Cases

### 5.1 Functional Tests - Đăng nhập thành công

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-FUNC-01 | Login | Auth | Đăng nhập thành công với credentials hợp lệ | Có tài khoản active trong Supabase Auth | 1. Truy cập /login<br>2. Nhập email hợp lệ<br>3. Nhập password đúng<br>4. Click "Đăng nhập" | email: admin@fleet.com, password: Admin123! | 1. Redirect đến /dashboard<br>2. Session được tạo (JWT token)<br>3. Sidebar hiển thị thông tin user | Critical | Functional |
| TC-LOGIN-FUNC-02 | Login | Auth | Đăng nhập và redirect về trang intended | User chưa đăng nhập, truy cập /vehicles | 1. Truy cập /vehicles khi chưa login<br>2. Hệ thống redirect đến /login<br>3. Đăng nhập thành công | email/password hợp lệ | Sau đăng nhập, redirect về /vehicles (không phải /dashboard) | High | Functional |
| TC-LOGIN-FUNC-03 | Login | Auth | Auto-redirect khi đã đăng nhập | User đã có session active | 1. Đăng nhập thành công<br>2. Truy cập lại /login | - | Tự động redirect đến /dashboard, không hiển thị form login | High | Functional |
| TC-LOGIN-FUNC-04 | Login | Auth | Đăng nhập với các role khác nhau | Có tài khoản cho mỗi role | 1. Đăng nhập với tài khoản Admin<br>2. Logout<br>3. Đăng nhập với tài khoản Driver | Tài khoản Admin, Driver | Cả 2 đều đăng nhập thành công, redirect đến /dashboard | High | Functional |

### 5.2 Functional Tests - Đăng nhập thất bại

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-FUNC-05 | Login | Auth | Đăng nhập với email đúng, password sai | Có tài khoản trong hệ thống | 1. Nhập email đúng<br>2. Nhập password sai<br>3. Click "Đăng nhập" | email: admin@fleet.com, password: WrongPass1 | Toast error: "Email hoặc mật khẩu không chính xác" | Critical | Functional |
| TC-LOGIN-FUNC-06 | Login | Auth | Đăng nhập với email không tồn tại | Email chưa đăng ký | 1. Nhập email không tồn tại<br>2. Nhập password bất kỳ<br>3. Click "Đăng nhập" | email: notexist@fleet.com, password: Test1234 | Toast error: "Email hoặc mật khẩu không chính xác" | Critical | Functional |
| TC-LOGIN-FUNC-07 | Login | Auth | Đăng nhập với tài khoản chưa xác nhận email | Tài khoản tạo nhưng chưa confirm email | 1. Nhập email chưa confirm<br>2. Nhập password đúng<br>3. Click "Đăng nhập" | email: unconfirmed@fleet.com | Toast error: "Tài khoản chưa được xác nhận. Vui lòng liên hệ quản trị viên." | High | Functional |
| TC-LOGIN-FUNC-08 | Login | Auth | Rate limiting - quá nhiều lần thử sai | Supabase rate limit active | 1. Đăng nhập sai liên tục 5-10 lần<br>2. Thử đăng nhập lại | email/password sai liên tục | Toast error: "Quá nhiều lần thử. Vui lòng thử lại sau." | High | Functional |

### 5.3 Validation Tests - Email Field

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-VAL-01 | Login | Auth | Submit form với email trống | Đang ở trang /login | 1. Để trống field email<br>2. Nhập password hợp lệ<br>3. Click "Đăng nhập" | email: "", password: "123456" | Hiển thị validation error: "Vui lòng nhập email hợp lệ" dưới field email. Form không submit. | Critical | Validation |
| TC-LOGIN-VAL-02 | Login | Auth | Submit form với email không có @ | Đang ở trang /login | 1. Nhập email thiếu @<br>2. Nhập password hợp lệ<br>3. Click "Đăng nhập" | email: "adminfleet.com", password: "123456" | Hiển thị validation error: "Vui lòng nhập email hợp lệ" | High | Validation |
| TC-LOGIN-VAL-03 | Login | Auth | Submit form với email thiếu domain | Đang ở trang /login | 1. Nhập email thiếu domain<br>2. Click "Đăng nhập" | email: "admin@", password: "123456" | Hiển thị validation error: "Vui lòng nhập email hợp lệ" | High | Validation |
| TC-LOGIN-VAL-04 | Login | Auth | Submit form với email có khoảng trắng | Đang ở trang /login | 1. Nhập email có space<br>2. Click "Đăng nhập" | email: "admin @fleet.com", password: "123456" | Hiển thị validation error: "Vui lòng nhập email hợp lệ" | Medium | Validation |
| TC-LOGIN-VAL-05 | Login | Auth | Submit form với email có ký tự đặc biệt không hợp lệ | Đang ở trang /login | 1. Nhập email có ký tự đặc biệt<br>2. Click "Đăng nhập" | email: "admin!#$@fleet.com", password: "123456" | Hiển thị validation error hoặc Supabase trả lỗi invalid credentials | Medium | Validation |
| TC-LOGIN-VAL-06 | Login | Auth | Email với format edge case (nhiều dots, subdomain) | Đang ở trang /login | 1. Nhập email format đặc biệt nhưng hợp lệ<br>2. Click "Đăng nhập" | email: "user.name+tag@sub.domain.com", password: "123456" | Form chấp nhận email (Zod email validation pass), gửi request đến Supabase | Low | Validation |

### 5.4 Validation Tests - Password Field

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-VAL-07 | Login | Auth | Submit form với password trống | Đang ở trang /login | 1. Nhập email hợp lệ<br>2. Để trống password<br>3. Click "Đăng nhập" | email: "admin@fleet.com", password: "" | Hiển thị validation error: "Mật khẩu phải có ít nhất 6 ký tự" | Critical | Validation |
| TC-LOGIN-VAL-08 | Login | Auth | Submit form với password < 6 ký tự | Đang ở trang /login | 1. Nhập email hợp lệ<br>2. Nhập password 5 ký tự<br>3. Click "Đăng nhập" | email: "admin@fleet.com", password: "12345" | Hiển thị validation error: "Mật khẩu phải có ít nhất 6 ký tự" | Critical | Validation |
| TC-LOGIN-VAL-09 | Login | Auth | Submit form với password đúng 6 ký tự (boundary) | Đang ở trang /login | 1. Nhập email hợp lệ<br>2. Nhập password 6 ký tự<br>3. Click "Đăng nhập" | email: "admin@fleet.com", password: "123456" | Form validation pass, request gửi đến Supabase Auth | High | Boundary |
| TC-LOGIN-VAL-10 | Login | Auth | Submit form với password rất dài | Đang ở trang /login | 1. Nhập email hợp lệ<br>2. Nhập password 200+ ký tự<br>3. Click "Đăng nhập" | email: "admin@fleet.com", password: "a" * 200 | Form validation pass (không có max length), request gửi đến Supabase | Low | Boundary |
| TC-LOGIN-VAL-11 | Login | Auth | Submit form với cả email và password trống | Đang ở trang /login | 1. Để trống cả 2 field<br>2. Click "Đăng nhập" | email: "", password: "" | Hiển thị cả 2 validation errors đồng thời | High | Validation |

### 5.5 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-UI-01 | Login | Auth | Hiển thị loading skeleton khi kiểm tra session | Truy cập lần đầu, session đang được verify | 1. Truy cập /login<br>2. Quan sát UI trong lúc auth loading | - | Hiển thị skeleton loading (card + input placeholders) trước khi form xuất hiện | High | UI |
| TC-LOGIN-UI-02 | Login | Auth | Toggle hiển thị/ẩn password | Đang ở trang /login | 1. Nhập password<br>2. Click icon Eye<br>3. Quan sát password hiển thị<br>4. Click icon EyeOff | password: "Test1234" | 1. Mặc định: password ẩn (type=password, hiện •••)<br>2. Click Eye: hiển thị text rõ (type=text)<br>3. Click EyeOff: ẩn lại | Medium | UI |
| TC-LOGIN-UI-03 | Login | Auth | Trạng thái submitting - disable inputs | Đang ở trang /login | 1. Nhập credentials hợp lệ<br>2. Click "Đăng nhập"<br>3. Quan sát UI trong lúc loading | - | 1. Button text đổi thành "Đang đăng nhập..."<br>2. Cả 2 input fields bị disabled<br>3. Button bị disabled<br>4. Toggle password bị disabled | High | UI |
| TC-LOGIN-UI-04 | Login | Auth | Layout responsive trên mobile | Đang ở trang /login, viewport mobile | 1. Resize browser xuống 375px width<br>2. Quan sát layout | Viewport: 375x667 | 1. Cover area (bên trái) bị ẩn (hidden lg:flex)<br>2. Form card chiếm full width<br>3. Form vẫn usable, không bị overflow | Medium | Responsive |
| TC-LOGIN-UI-05 | Login | Auth | Layout trên desktop | Đang ở trang /login, viewport desktop | 1. Mở trên desktop (1920px width)<br>2. Quan sát layout | Viewport: 1920x1080 | 1. Cover area hiển thị bên trái (50% width) với gradient + text "FleetGo"<br>2. Form card bên phải (50% width)<br>3. Card centered vertically | Low | UI |
| TC-LOGIN-UI-06 | Login | Auth | Email field có autofocus | Đang ở trang /login | 1. Truy cập /login<br>2. Quan sát cursor focus | - | Email input được autofocus, cursor nhấp nháy trong field email | Low | UI |
| TC-LOGIN-UI-07 | Login | Auth | Toast error hiển thị đúng | Đăng nhập thất bại | 1. Nhập credentials sai<br>2. Click "Đăng nhập"<br>3. Quan sát toast notification | email/password sai | Toast hiển thị với variant "destructive", title "Đăng nhập thất bại", description chứa error message | High | UI |

### 5.6 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-ERR-01 | Login | Auth | Xử lý lỗi network (mất kết nối) | Đang ở trang /login | 1. Tắt network/wifi<br>2. Nhập credentials<br>3. Click "Đăng nhập" | - | Toast error: "Đã xảy ra lỗi. Vui lòng thử lại." (fallback message). Button trở lại trạng thái enabled. | High | Error Handling |
| TC-LOGIN-ERR-02 | Login | Auth | Xử lý lỗi Supabase service down | Supabase service unavailable | 1. Nhập credentials hợp lệ<br>2. Click "Đăng nhập" | - | Toast error hiển thị message phù hợp. Form không bị treo, user có thể thử lại. | High | Error Handling |
| TC-LOGIN-ERR-03 | Login | Auth | Session expired khi đang ở protected route | User đã login, session hết hạn | 1. Đăng nhập thành công<br>2. Đợi session expire (hoặc xóa token thủ công)<br>3. Thực hiện action bất kỳ | - | Redirect về /login. Sau khi login lại, quay về trang trước đó. | High | Error Handling |
| TC-LOGIN-ERR-04 | Login | Auth | Xử lý error code không xác định | Supabase trả error code mới/unknown | 1. Trigger error không nằm trong AUTH_ERROR_MESSAGES map<br>2. Quan sát toast | - | Toast error: "Đã xảy ra lỗi. Vui lòng thử lại." (fallback message) | Medium | Error Handling |
| TC-LOGIN-ERR-05 | Login | Auth | Request timeout (network chậm) | Network latency cao | 1. Throttle network (slow 3G)<br>2. Nhập credentials<br>3. Click "Đăng nhập" | - | Button hiển thị "Đang đăng nhập..." trong suốt thời gian chờ. Nếu timeout, hiển thị error message. | Medium | Error Handling |

### 5.7 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-SEC-01 | Login | Auth | XSS qua email field | Đang ở trang /login | 1. Nhập script tag vào email field<br>2. Click "Đăng nhập" | email: `<script>alert('xss')</script>` | 1. Zod validation reject (không phải email format)<br>2. Không execute script<br>3. Input được escape/sanitize | High | Security |
| TC-LOGIN-SEC-02 | Login | Auth | Open redirect qua location state | Attacker craft URL với state chứa external URL | 1. Navigate đến /login với state.from.pathname = "https://evil.com"<br>2. Đăng nhập thành công | state: { from: { pathname: "https://evil.com" } } | Hệ thống KHÔNG redirect đến external URL. Chỉ redirect đến internal routes. | High | Security |
| TC-LOGIN-SEC-03 | Login | Auth | SQL Injection qua email field | Đang ở trang /login | 1. Nhập SQL injection payload vào email<br>2. Click "Đăng nhập" | email: `' OR 1=1 --` | 1. Zod validation reject (không phải email format)<br>2. Nếu bypass validation, Supabase Auth sử dụng parameterized queries, không bị inject | High | Security |
| TC-LOGIN-SEC-04 | Login | Auth | Brute force protection | Đang ở trang /login | 1. Thử đăng nhập sai liên tục 20+ lần<br>2. Quan sát response | email cố định, password random | Supabase rate limiting kick in: "Quá nhiều lần thử. Vui lòng thử lại sau." | High | Security |
| TC-LOGIN-SEC-05 | Login | Auth | Password không hiển thị trong network request | Đang ở trang /login, DevTools mở | 1. Mở Network tab<br>2. Đăng nhập<br>3. Kiểm tra request payload | - | Password được gửi qua HTTPS (encrypted in transit). Không hiển thị trong URL params. | Medium | Security |
| TC-LOGIN-SEC-06 | Login | Auth | Token storage security | Đăng nhập thành công | 1. Đăng nhập thành công<br>2. Kiểm tra localStorage/sessionStorage/cookies | - | JWT token được Supabase SDK quản lý. Không lưu password ở client. Token có expiry time. | Medium | Security |
| TC-LOGIN-SEC-07 | Login | Auth | Truy cập protected route không có token | Chưa đăng nhập | 1. Truy cập trực tiếp /dashboard<br>2. Truy cập /vehicles<br>3. Truy cập /bookings | - | Tất cả đều redirect về /login. Không hiển thị data hay UI của protected page. | Critical | Security |

### 5.8 Session Management Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-SESS-01 | Login | Auth | Logout xóa session | User đã đăng nhập | 1. Đăng nhập thành công<br>2. Click Logout<br>3. Truy cập /dashboard | - | 1. Session bị xóa<br>2. Redirect về /login<br>3. Không thể truy cập protected routes | Critical | Functional |
| TC-LOGIN-SESS-02 | Login | Auth | Session persist sau refresh page | User đã đăng nhập | 1. Đăng nhập thành công<br>2. Refresh page (F5)<br>3. Quan sát trạng thái | - | User vẫn đăng nhập, không bị redirect về /login. Session được restore từ Supabase. | High | Functional |
| TC-LOGIN-SESS-03 | Login | Auth | Đăng nhập trên tab mới | User đã đăng nhập ở tab 1 | 1. Đăng nhập ở tab 1<br>2. Mở tab mới, truy cập /dashboard | - | Tab mới nhận session từ Supabase (shared storage), không cần đăng nhập lại | Medium | Functional |
| TC-LOGIN-SESS-04 | Login | Auth | Logout ở 1 tab ảnh hưởng tab khác | User đăng nhập ở 2 tabs | 1. Mở 2 tabs đều đã login<br>2. Logout ở tab 1<br>3. Thực hiện action ở tab 2 | - | Tab 2 phát hiện session expired (qua onAuthStateChange), redirect về /login | Medium | Functional |

### 5.9 Accessibility Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-A11Y-01 | Login | Auth | Keyboard navigation | Đang ở trang /login | 1. Tab qua các fields<br>2. Enter để submit<br>3. Tab đến toggle password | - | 1. Tab order: Email → Password → Toggle → Submit<br>2. Enter trên form triggers submit<br>3. Tất cả interactive elements reachable bằng keyboard | Medium | Accessibility |
| TC-LOGIN-A11Y-02 | Login | Auth | Screen reader labels | Đang ở trang /login | 1. Bật screen reader<br>2. Navigate qua form | - | 1. Email field có label "Email" (required)<br>2. Password field có label "Mật khẩu" (required)<br>3. Error messages được announce | Low | Accessibility |
| TC-LOGIN-A11Y-03 | Login | Auth | Form submit bằng Enter key | Đang ở trang /login, đã nhập data | 1. Nhập email<br>2. Nhập password<br>3. Nhấn Enter (không click button) | email/password hợp lệ | Form submit thành công, tương đương click button "Đăng nhập" | Medium | Accessibility |

### 5.10 Browser & Edge Case Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-LOGIN-EDGE-01 | Login | Auth | Double click button "Đăng nhập" | Đang ở trang /login, form filled | 1. Nhập credentials hợp lệ<br>2. Double-click nhanh button "Đăng nhập" | - | Chỉ gửi 1 request (button disabled sau click đầu tiên khi isSubmitting=true) | High | Functional |
| TC-LOGIN-EDGE-02 | Login | Auth | Browser back button sau login | Vừa đăng nhập thành công | 1. Đăng nhập thành công → redirect đến /dashboard<br>2. Click browser Back button | - | Không quay lại /login (vì đã authenticated, sẽ auto-redirect lại dashboard) | Medium | UI |
| TC-LOGIN-EDGE-03 | Login | Auth | Copy/Paste vào email field | Đang ở trang /login | 1. Copy email từ clipboard<br>2. Paste vào email field<br>3. Submit form | email copied: "admin@fleet.com" | Email được paste đúng, form submit bình thường | Low | Functional |
| TC-LOGIN-EDGE-04 | Login | Auth | Autofill từ browser | Browser có saved credentials | 1. Truy cập /login<br>2. Browser autofill email + password<br>3. Click "Đăng nhập" | Browser saved credentials | Form nhận giá trị autofill, submit thành công | Low | UI |
| TC-LOGIN-EDGE-05 | Login | Auth | Email với Unicode/tiếng Việt | Đang ở trang /login | 1. Nhập email có ký tự Unicode<br>2. Click "Đăng nhập" | email: "nguyễnvăn@fleet.com" | Zod email validation reject (hoặc Supabase reject). Hiển thị error phù hợp. | Low | Negative |
| TC-LOGIN-EDGE-06 | Login | Auth | Password chỉ có spaces | Đang ở trang /login | 1. Nhập email hợp lệ<br>2. Nhập password toàn spaces (6+ chars)<br>3. Click "Đăng nhập" | email: "admin@fleet.com", password: "      " (6 spaces) | Zod validation pass (min 6 chars, không trim). Supabase trả lỗi invalid credentials. | Low | Negative |
| TC-LOGIN-EDGE-07 | Login | Auth | Refresh trang /login khi đang submit | Form đang submit (loading state) | 1. Nhập credentials<br>2. Click "Đăng nhập"<br>3. Ngay lập tức refresh page (F5) | - | Page reload, form reset về trạng thái ban đầu. Không có side effect. | Low | Edge Case |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Test "Quên mật khẩu" flow | Không thấy UI cho feature này trong source code. Cần confirm có cần implement không. |
| 2 | Test account lockout sau N lần sai | Supabase có rate limit nhưng không rõ threshold cụ thể. Cần confirm với Dev. |
| 3 | Test multi-device login | Cần confirm: 1 account có thể login đồng thời trên nhiều device không? |
| 4 | Test session timeout duration | Cần confirm JWT expiry time cấu hình bao lâu trên Supabase. |
| 5 | Test đăng nhập với email case-insensitive | Cần confirm: "Admin@Fleet.com" và "admin@fleet.com" có phải cùng account không? |
| 6 | Test redirect sau login với deep link có query params | Ví dụ: /trips?status=scheduled. Cần confirm location state có preserve query params không. |

