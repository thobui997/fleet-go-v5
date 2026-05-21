# Test Cases: Feature Tổng quan (Dashboard)

## 1. Feature List Detected

- Hiển thị 4 KPI stat cards (Tổng xe, Chuyến hôm nay, Đặt vé hôm nay, Doanh thu hôm nay)
- Biểu đồ doanh thu 7 ngày gần nhất (Line chart)
- Biểu đồ phân bổ trạng thái chuyến đi tháng hiện tại (Pie chart)
- Biểu đồ phân bổ trạng thái đặt vé tháng hiện tại (Bar chart)
- Bảng đặt vé gần đây (5 bookings mới nhất)
- Bảng chuyến sắp khởi hành (5 trips sắp tới)
- Error handling riêng cho từng component (partial failure resilience)
- Auth expiry detection + auto signOut

---

## 2. Feature Analysis

### Business Flow
1. User đăng nhập → Redirect về /dashboard (default route)
2. Dashboard load 6 data sources song song:
   a. Stats: vehicles count, trips today, bookings today, revenue today
   b. Revenue trend: 7 ngày gần nhất (completed payments)
   c. Trip status breakdown: tháng hiện tại
   d. Booking status breakdown: tháng hiện tại
   e. Recent bookings: 5 mới nhất
   f. Upcoming trips: 5 chuyến sắp khởi hành (departure >= now)
3. Mỗi component hiển thị loading → data/error độc lập
4. Nếu 1 query fail, các component khác vẫn hiển thị bình thường (Promise.allSettled)
5. User có thể retry từng component riêng

### Actor / Role
- Tất cả authenticated users (không phân quyền theo role)
- Dashboard hiển thị data toàn hệ thống (không filter theo user)

### Data Sources & Aggregation
| KPI | Source Table | Filter | Calculation |
|-----|-------------|--------|-------------|
| Tổng xe | vehicles | none | count all, filter status='active' |
| Chuyến hôm nay | trips | departure_time today | count all, filter scheduled/in_progress |
| Đặt vé hôm nay | bookings | booking_date today | count all |
| Doanh thu hôm nay | payments | paid_at today, status=completed | sum(amount) |
| Revenue trend | payments | paid_at last 7 days, status=completed | group by date, sum(amount) |
| Trip status | trips | departure_time this month | group by status, count |
| Booking status | bookings | booking_date this month | group by status, count |
| Recent bookings | bookings | none | order booking_date DESC, limit 5 |
| Upcoming trips | trips | departure_time >= now | order departure_time ASC, limit 5 |

### Error Handling
- **Auth expiry (401/403/PGRST301):** Auto signOut → redirect login
- **Other errors:** Component-level error state + "Thử lại" button
- **Partial failure:** Promise.allSettled cho stats → 1 query fail không ảnh hưởng khác

### Caching Strategy (TanStack Query)
| Hook | staleTime | retry |
|------|-----------|-------|
| useDashboardStats | 30s | 1 |
| useRecentBookings | 0 (always fresh) | 1 |
| useUpcomingTrips | 0 (always fresh) | 1 |
| useRevenueTrend | 5 min | 1 |
| useTripStatusBreakdown | 5 min | 1 |
| useBookingStatusBreakdown | 5 min | 1 |

### UI States
- **Stat Cards Loading:** Skeleton placeholders
- **Stat Cards Error:** AlertCircle + retry button (per card)
- **Charts Loading:** Full-height Skeleton
- **Charts Error:** AlertCircle + "Không thể tải dữ liệu" + retry
- **Charts Empty:** "Không có dữ liệu"
- **Tables Loading:** 3 Skeleton rows
- **Tables Error:** AlertCircle + "Không thể tải dữ liệu" + "Thử lại"
- **Tables Empty:** "Chưa có đặt vé nào" / "Không có chuyến sắp khởi hành"

---

## 3. Assumptions & Ambiguous Points

| # | Assumption | Cần confirm |
|---|-----------|-------------|
| A1 | Dashboard hiển thị data toàn hệ thống, không filter theo role/branch | Confirm: có cần phân quyền data? |
| A2 | "Hôm nay" dùng timezone local của server (dayjs default) | Confirm: timezone handling cho multi-region? |
| A3 | Revenue chỉ tính payments status=completed (không tính pending) | Confirm: business definition of revenue? |
| A4 | Không có auto-refresh/polling (chỉ staleTime) | Confirm: có cần real-time updates? |
| A5 | Revenue trend chỉ 7 ngày, không configurable | Confirm: có cần date range selector? |
| A6 | Status breakdown chỉ tháng hiện tại, không configurable | Confirm: có cần chọn tháng? |
| A7 | Upcoming trips hiển thị tất cả status (kể cả cancelled nếu departure >= now) | Confirm: có nên filter chỉ scheduled/in_progress? |
| A8 | Revenue sum tính client-side (fetch all payments rồi reduce) | Confirm: performance concern khi nhiều payments? |

---

## 4. Potential Risks / Bugs (Source Code Analysis)

| File | Function/Method | Risk/Potential Bug | Suggested Testcase |
|------|-----------------|--------------------|--------------------|
| `dashboard.api.ts:52` | vehicles select chỉ 'status' | Dùng data.length cho total count thay vì count header. Nếu > 1000 rows, Supabase default limit sẽ cắt. | TC-DASH-EDGE-01 |
| `dashboard.api.ts:57-59` | trips today filter | Dùng gte/lte trên departure_time. Nếu timezone mismatch, "hôm nay" có thể sai. | TC-DASH-EDGE-02 |
| `dashboard.api.ts:132` | revenue sum client-side | Fetch tất cả payments today rồi reduce. Nếu nhiều payments, performance issue. | TC-DASH-EDGE-03 |
| `dashboard.api.ts:220-237` | revenue trend fill missing dates | Dùng dayjs().subtract(i, 'day'). Nếu chạy lúc 00:00:00, edge case timezone. | TC-DASH-EDGE-04 |
| `dashboard-page.tsx:249` | booking status hiển thị raw key | Status hiển thị "pending", "confirmed" thay vì Vietnamese label. | TC-DASH-UI-06 |
| `dashboard.api.ts:80-90` | Promise.allSettled + throw | Nếu vehiclesResult fulfilled nhưng có error, throw error. Nhưng nếu rejected, chỉ handleAuthExpiry mà không throw → vehicleTotal = 0 silently. | TC-DASH-ERR-03 |

---

## 5. Test Cases

### 5.1 Functional Tests - KPI Stat Cards

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-FUNC-01 | Dashboard | Overview | Hiển thị Tổng xe đúng | Có 10 vehicles, 7 active | 1. Truy cập /dashboard | - | Card "Tổng xe": value=10, subtitle="(7 hoạt động)" | Critical | Functional |
| TC-DASH-FUNC-02 | Dashboard | Overview | Hiển thị Chuyến hôm nay đúng | Có 5 trips today (3 scheduled, 2 in_progress) | 1. Truy cập /dashboard | - | Card "Chuyến hôm nay": value=5, subtitle="(3 chờ / 2 chạy)" | Critical | Functional |
| TC-DASH-FUNC-03 | Dashboard | Overview | Hiển thị Đặt vé hôm nay đúng | Có 8 bookings today | 1. Truy cập /dashboard | - | Card "Đặt vé hôm nay": value=8 | Critical | Functional |
| TC-DASH-FUNC-04 | Dashboard | Overview | Hiển thị Doanh thu hôm nay đúng | Có payments completed today tổng 5.000.000đ | 1. Truy cập /dashboard | - | Card "Doanh thu hôm nay": value="5.000.000 ₫" (formatCurrency) | Critical | Functional |
| TC-DASH-FUNC-05 | Dashboard | Overview | Stats = 0 khi không có data | DB trống hoặc không có data hôm nay | 1. Truy cập /dashboard | - | Tất cả cards hiển thị 0 (vehicleTotal=0, tripsToday=0, bookingsToday=0, revenueToday=0) | High | Functional |
| TC-DASH-FUNC-06 | Dashboard | Overview | Chỉ tính revenue từ completed payments | Có payments: 2 completed (200k each), 1 pending (100k) | 1. Truy cập /dashboard | - | Doanh thu = 400.000 ₫ (chỉ completed, không tính pending) | High | Functional |
| TC-DASH-FUNC-07 | Dashboard | Overview | Chỉ tính trips/bookings hôm nay | Có trips yesterday + today | 1. Truy cập /dashboard | - | Chỉ count trips có departure_time trong ngày hôm nay | High | Functional |

### 5.2 Functional Tests - Revenue Trend Chart

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-FUNC-08 | Dashboard | Charts | Hiển thị revenue 7 ngày | Có payments 7 ngày qua | 1. Truy cập /dashboard<br>2. Quan sát Revenue chart | - | Line chart hiển thị 7 data points (DD/MM format), amount trên Y-axis | High | Functional |
| TC-DASH-FUNC-09 | Dashboard | Charts | Fill missing dates với 0 | Chỉ có payments 3/7 ngày | 1. Quan sát chart | payments: day 1,3,5 only | Chart hiển thị 7 points, ngày không có payment = 0 | High | Functional |
| TC-DASH-FUNC-10 | Dashboard | Charts | Revenue chart trống | Không có completed payments 7 ngày qua | 1. Quan sát chart | - | Chart hiển thị "Không có dữ liệu" hoặc flat line at 0 | Medium | Functional |
| TC-DASH-FUNC-11 | Dashboard | Charts | Revenue grouping by date | Nhiều payments cùng ngày | 1. Quan sát chart | Day 1: 3 payments (100k, 200k, 150k) | Day 1 point = 450.000 (sum of amounts) | High | Functional |

### 5.3 Functional Tests - Status Breakdown Charts

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-FUNC-12 | Dashboard | Charts | Trip status pie chart | Có trips tháng này nhiều status | 1. Quan sát Trip Status chart | scheduled:5, in_progress:3, completed:10, cancelled:2 | Pie chart hiển thị 4 segments với đúng tỷ lệ và colors (blue, amber, green, red) | High | Functional |
| TC-DASH-FUNC-13 | Dashboard | Charts | Booking status bar chart | Có bookings tháng này nhiều status | 1. Quan sát Booking Status chart | pending:3, confirmed:5, cancelled:1, completed:8, refunded:2 | Bar chart hiển thị 5 bars với đúng counts và colors | High | Functional |
| TC-DASH-FUNC-14 | Dashboard | Charts | Status charts chỉ tháng hiện tại | Có trips/bookings tháng trước + tháng này | 1. Quan sát charts | - | Chỉ count data có departure_time/booking_date trong tháng hiện tại | High | Functional |
| TC-DASH-FUNC-15 | Dashboard | Charts | Status chart trống | Không có trips/bookings tháng này | 1. Quan sát charts | - | Hiển thị "Không có dữ liệu" | Medium | Functional |

### 5.4 Functional Tests - Quick View Tables

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-FUNC-16 | Dashboard | Tables | Đặt vé gần đây hiển thị đúng | Có > 5 bookings | 1. Quan sát bảng "Đặt vé gần đây" | - | Hiển thị 5 bookings mới nhất. Columns: Mã đặt vé, Khách hàng, Tuyến (origin→dest), Khởi hành, Tổng tiền, Trạng thái. Order: booking_date DESC. | Critical | Functional |
| TC-DASH-FUNC-17 | Dashboard | Tables | Chuyến sắp khởi hành hiển thị đúng | Có > 5 upcoming trips | 1. Quan sát bảng "Chuyến sắp khởi hành" | - | Hiển thị 5 trips sắp tới. Columns: Tuyến (origin→dest), Khởi hành, Xe (biển số), Trạng thái. Order: departure_time ASC. | Critical | Functional |
| TC-DASH-FUNC-18 | Dashboard | Tables | Upcoming trips chỉ hiển thị future | Có trips quá khứ + tương lai | 1. Quan sát bảng trips | - | Chỉ hiển thị trips có departure_time >= now (không hiển thị trips đã qua) | High | Functional |
| TC-DASH-FUNC-19 | Dashboard | Tables | Recent bookings max 5 | Có 20 bookings | 1. Quan sát bảng bookings | - | Chỉ hiển thị 5 bookings (limit 5) | High | Functional |
| TC-DASH-FUNC-20 | Dashboard | Tables | Bảng bookings trống | Không có bookings | 1. Quan sát bảng | - | Hiển thị "Chưa có đặt vé nào" | Medium | Functional |
| TC-DASH-FUNC-21 | Dashboard | Tables | Bảng trips trống | Không có upcoming trips | 1. Quan sát bảng | - | Hiển thị "Không có chuyến sắp khởi hành" | Medium | Functional |
| TC-DASH-FUNC-22 | Dashboard | Tables | Status badge colors đúng | Bookings nhiều status | 1. Quan sát status badges | - | pending→yellow, confirmed→blue, cancelled→red, completed→green, refunded→gray | Medium | UI |
| TC-DASH-FUNC-23 | Dashboard | Tables | Trip status badge colors | Trips nhiều status | 1. Quan sát trip badges | - | scheduled→blue, in_progress→amber, completed→green, cancelled→red | Medium | UI |
| TC-DASH-FUNC-24 | Dashboard | Tables | Null data hiển thị N/A | Booking có customer=null, route=null | 1. Quan sát row | - | Customer: "N/A", Tuyến: "N/A → N/A", Xe: "N/A" | Medium | Functional |

### 5.5 Functional Tests - Navigation & Access

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-FUNC-25 | Dashboard | Navigation | Home redirect về dashboard | Authenticated | 1. Truy cập / (root) | - | Redirect về /dashboard | High | Functional |
| TC-DASH-FUNC-26 | Dashboard | Navigation | Sidebar navigation | Authenticated | 1. Click "Dashboard" trong sidebar | - | Navigate về /dashboard, icon LayoutDashboard | Medium | Functional |

### 5.6 UI/UX Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-UI-01 | Dashboard | Overview | Stat cards loading skeleton | Trang đang load | 1. Truy cập /dashboard<br>2. Quan sát trước data load | - | 4 stat cards hiển thị Skeleton placeholders | High | UI |
| TC-DASH-UI-02 | Dashboard | Overview | Charts loading skeleton | Charts đang load | 1. Quan sát charts trước data load | - | Chart areas hiển thị full-height Skeleton | High | UI |
| TC-DASH-UI-03 | Dashboard | Overview | Tables loading skeleton | Tables đang load | 1. Quan sát tables trước data load | - | 3 Skeleton rows trong mỗi table card | High | UI |
| TC-DASH-UI-04 | Dashboard | Overview | Page header hiển thị đúng | Trang loaded | 1. Quan sát header | - | Title: "Tổng quan" (text-3xl bold), Subtitle: "Xem nhanh tình hình hoạt động hôm nay" | Low | UI |
| TC-DASH-UI-05 | Dashboard | Overview | Grid layout responsive | Desktop viewport | 1. Quan sát layout | - | Stat cards: 4 cols (lg). Charts: 2 cols (lg). Tables: 2 cols (lg). | Medium | UI |
| TC-DASH-UI-06 | Dashboard | Overview | Booking status hiển thị raw key | Có bookings | 1. Quan sát status badge trong table | - | Status hiển thị raw key ("pending", "confirmed") thay vì Vietnamese label. Risk: UX inconsistency. | Low | UI |
| TC-DASH-UI-07 | Dashboard | Overview | Currency format đúng | Revenue > 0 | 1. Quan sát doanh thu | revenueToday: 1500000 | Hiển thị "1.500.000 ₫" (formatCurrency, vi-VN locale) | Medium | UI |
| TC-DASH-UI-08 | Dashboard | Overview | Stat card icons đúng | Trang loaded | 1. Quan sát 4 stat cards | - | Tổng xe→Truck, Chuyến hôm nay→Calendar, Đặt vé→Ticket, Doanh thu→CreditCard | Low | UI |

### 5.7 Error Handling Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-ERR-01 | Dashboard | Overview | Auth expired → auto signOut | Token hết hạn | 1. Để session expire<br>2. Truy cập /dashboard | - | handleAuthExpiry gọi supabase.auth.signOut(). User redirect về login. | Critical | Error Handling |
| TC-DASH-ERR-02 | Dashboard | Overview | Partial failure - stats fail, tables OK | Stats API error, tables OK | 1. Stats query fail<br>2. Quan sát UI | - | Stat cards hiển thị error state (AlertCircle + retry). Tables + Charts vẫn hiển thị data bình thường. | Critical | Error Handling |
| TC-DASH-ERR-03 | Dashboard | Overview | Partial failure - 1 stat source rejected | vehicles query rejected trong allSettled | 1. Vehicles query fail (network)<br>2. Quan sát stats | - | vehicleTotal = 0 (silent fallback). Các stats khác vẫn hiển thị đúng. | High | Error Handling |
| TC-DASH-ERR-04 | Dashboard | Overview | Recent bookings error | Bookings API fail | 1. Bookings query error<br>2. Quan sát table | - | Table hiển thị: AlertCircle + "Không thể tải dữ liệu" + "Thử lại" link | High | Error Handling |
| TC-DASH-ERR-05 | Dashboard | Overview | Upcoming trips error | Trips API fail | 1. Trips query error<br>2. Quan sát table | - | Table hiển thị: AlertCircle + "Không thể tải dữ liệu" + "Thử lại" link | High | Error Handling |
| TC-DASH-ERR-06 | Dashboard | Overview | Revenue chart error | Revenue API fail | 1. Revenue query error<br>2. Quan sát chart | - | Chart hiển thị error state + retry button | High | Error Handling |
| TC-DASH-ERR-07 | Dashboard | Overview | Retry button hoạt động | Error state hiển thị | 1. Click "Thử lại" trên component lỗi | - | refetch() gọi, data reload. Nếu thành công, error state biến mất. | High | Error Handling |
| TC-DASH-ERR-08 | Dashboard | Overview | Network error toàn bộ | Mất kết nối | 1. Tắt network<br>2. Truy cập /dashboard | - | Tất cả components hiển thị error state riêng. Mỗi component có retry riêng. | High | Error Handling |

### 5.8 Security Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-SEC-01 | Dashboard | Overview | Truy cập /dashboard khi chưa login | Chưa đăng nhập | 1. Truy cập trực tiếp /dashboard | - | Redirect về /login (ProtectedRoute) | Critical | Security |
| TC-DASH-SEC-02 | Dashboard | Overview | Auth expiry detection (401) | Token expired | 1. Token hết hạn<br>2. Dashboard refetch | - | handleAuthExpiry detect 401 → signOut → redirect login | Critical | Security |
| TC-DASH-SEC-03 | Dashboard | Overview | Auth expiry detection (403) | Permission denied | 1. RLS deny access<br>2. Dashboard query | - | handleAuthExpiry detect 403 → signOut | High | Security |
| TC-DASH-SEC-04 | Dashboard | Overview | Auth expiry detection (PGRST301) | JWT expired | 1. JWT expired<br>2. Dashboard query | - | handleAuthExpiry detect PGRST301 → signOut | High | Security |
| TC-DASH-SEC-05 | Dashboard | Overview | Data không bị expose qua XSS | Booking có customer name chứa HTML | 1. Quan sát table với HTML in data | customer.full_name: "<script>alert(1)</script>" | Text escaped, không execute | High | Security |

### 5.9 Edge Case & Performance Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-EDGE-01 | Dashboard | Overview | > 1000 vehicles (Supabase default limit) | 1500 vehicles | 1. Truy cập /dashboard | vehicles: 1500 | vehicleTotal có thể = 1000 (Supabase default limit). Risk: incorrect count. | Medium | Edge Case |
| TC-DASH-EDGE-02 | Dashboard | Overview | Timezone edge - midnight | Truy cập lúc 00:00:01 | 1. Truy cập dashboard lúc nửa đêm | - | "Hôm nay" tính đúng (dayjs startOf/endOf day). Stats không bao gồm yesterday. | Medium | Edge Case |
| TC-DASH-EDGE-03 | Dashboard | Overview | Nhiều payments cùng ngày | 500 completed payments today | 1. Truy cập /dashboard | 500 payments | Revenue sum đúng. Performance acceptable (client-side reduce). | Low | Performance |
| TC-DASH-EDGE-04 | Dashboard | Overview | Revenue trend cross-month | 7 ngày span 2 tháng (cuối tháng) | 1. Truy cập dashboard ngày 2/6 | - | Chart hiển thị 7 points: 26/05 → 02/06. Dates đúng cross-month. | Medium | Edge Case |
| TC-DASH-EDGE-05 | Dashboard | Overview | Stale data refresh | Stats staleTime = 30s | 1. Load dashboard<br>2. Đợi 30s<br>3. Focus lại tab | - | TanStack Query refetch (stale data). Stats cập nhật. | Medium | Edge Case |
| TC-DASH-EDGE-06 | Dashboard | Overview | Concurrent navigation | Click sidebar nhanh | 1. Click Dashboard<br>2. Ngay lập tức click Trips<br>3. Click Dashboard lại | - | Dashboard load lại bình thường. Không có stale queries. | Low | Edge Case |
| TC-DASH-EDGE-07 | Dashboard | Overview | Revenue = 0 format | Không có revenue | 1. Quan sát doanh thu card | revenueToday: 0 | Hiển thị "0 ₫" (formatCurrency(0)) | Low | Edge Case |

### 5.10 Responsive Tests

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-RESP-01 | Dashboard | Overview | Dashboard trên tablet | Viewport 768px | 1. Mở /dashboard trên tablet | Viewport: 768x1024 | Stat cards: 2 cols (sm:grid-cols-2). Charts: 1 col. Tables: 1 col. Scrollable. | Medium | Responsive |
| TC-DASH-RESP-02 | Dashboard | Overview | Dashboard trên mobile | Viewport 375px | 1. Mở /dashboard trên mobile | Viewport: 375x667 | Stat cards: 1 col. Charts: 1 col full-width. Tables: 1 col, horizontal scroll nếu cần. | Medium | Responsive |
| TC-DASH-RESP-03 | Dashboard | Overview | Tables overflow trên mobile | Viewport 375px | 1. Quan sát tables trên mobile | Viewport: 375x667 | Tables có overflow-x-auto, horizontal scroll khi content rộng hơn viewport | Medium | Responsive |

### 5.11 API Test Detail

#### Fetch Dashboard Stats - Queries

```sql
-- Vehicles (all, for status breakdown)
SELECT status FROM vehicles

-- Trips today
SELECT * FROM trips
WHERE departure_time >= '2026-05-21T00:00:00.000Z'
  AND departure_time <= '2026-05-21T23:59:59.999Z'

-- Bookings today
SELECT * FROM bookings
WHERE booking_date >= '2026-05-21T00:00:00.000Z'
  AND booking_date <= '2026-05-21T23:59:59.999Z'

-- Revenue today (completed payments)
SELECT amount FROM payments
WHERE status = 'completed'
  AND paid_at >= '2026-05-21T00:00:00.000Z'
  AND paid_at <= '2026-05-21T23:59:59.999Z'
```

#### Fetch Revenue Trend - Query

```sql
SELECT amount, paid_at FROM payments
WHERE status = 'completed'
  AND paid_at >= '2026-05-14T00:00:00.000Z'  -- 7 days ago
  AND paid_at <= '2026-05-21T23:59:59.999Z'
ORDER BY paid_at
```

#### Fetch Recent Bookings - Query

```sql
SELECT *, customer:customers!inner(id, full_name, phone_number),
       trip:trips(id, departure_time, route:routes(...))
FROM bookings
ORDER BY booking_date DESC
LIMIT 5
```

#### Fetch Upcoming Trips - Query

```sql
SELECT *, route:routes(...), vehicle:vehicles(id, license_plate)
FROM trips
WHERE departure_time >= '2026-05-21T10:30:00.000Z'  -- now
ORDER BY departure_time ASC
LIMIT 5
```

### 5.12 API Test Coverage

| TC ID | Feature | Module | Test Scenario | Preconditions | Test Steps | Test Data | Expected Result | Priority | Test Type |
|-------|---------|--------|---------------|---------------|------------|-----------|-----------------|----------|-----------|
| TC-DASH-API-01 | Dashboard | Overview | GET vehicles - count all | Auth valid | 1. GET /rest/v1/vehicles?select=status | - | Status 200, array of {status} objects | High | API |
| TC-DASH-API-02 | Dashboard | Overview | GET trips today | Auth valid | 1. GET /rest/v1/trips?departure_time=gte.{todayStart}&departure_time=lte.{todayEnd} | - | Status 200, trips array | High | API |
| TC-DASH-API-03 | Dashboard | Overview | GET bookings today | Auth valid | 1. GET /rest/v1/bookings?booking_date=gte.{todayStart}&booking_date=lte.{todayEnd} | - | Status 200, bookings array | High | API |
| TC-DASH-API-04 | Dashboard | Overview | GET payments today (revenue) | Auth valid | 1. GET /rest/v1/payments?status=eq.completed&paid_at=gte.{todayStart}&paid_at=lte.{todayEnd}&select=amount | - | Status 200, array of {amount} | High | API |
| TC-DASH-API-05 | Dashboard | Overview | GET recent bookings | Auth valid | 1. GET /rest/v1/bookings?select=*,...&order=booking_date.desc&limit=5 | - | Status 200, max 5 bookings with joins | High | API |
| TC-DASH-API-06 | Dashboard | Overview | GET upcoming trips | Auth valid | 1. GET /rest/v1/trips?departure_time=gte.{now}&order=departure_time.asc&limit=5 | - | Status 200, max 5 future trips | High | API |
| TC-DASH-API-07 | Dashboard | Overview | GET revenue trend (7 days) | Auth valid | 1. GET /rest/v1/payments?status=eq.completed&paid_at=gte.{7daysAgo}&paid_at=lte.{todayEnd}&select=amount,paid_at | - | Status 200, payments array ordered by paid_at | High | API |
| TC-DASH-API-08 | Dashboard | Overview | GET trip status breakdown | Auth valid | 1. GET /rest/v1/trips?select=status&departure_time=gte.{monthStart}&departure_time=lte.{monthEnd} | - | Status 200, array of {status} | Medium | API |
| TC-DASH-API-09 | Dashboard | Overview | GET booking status breakdown | Auth valid | 1. GET /rest/v1/bookings?select=status&booking_date=gte.{monthStart}&booking_date=lte.{monthEnd} | - | Status 200, array of {status} | Medium | API |
| TC-DASH-API-10 | Dashboard | Overview | All APIs - no auth | Không có token | 1. Gọi bất kỳ dashboard API không auth | - | Status 401 | High | API |

---

## 6. Additional Test Cases Need Confirmation

| # | Test Case cần confirm | Lý do |
|---|----------------------|-------|
| 1 | Dashboard data phân quyền theo role | Hiện tại hiển thị toàn bộ data. Cần confirm: Manager chỉ thấy data branch mình? |
| 2 | Auto-refresh / polling interval | Hiện không có polling. Cần confirm: có cần real-time updates cho dashboard? |
| 3 | Revenue trend configurable date range | Hiện fixed 7 ngày. Cần confirm: có cần chọn 30 ngày / custom range? |
| 4 | Status breakdown configurable month | Hiện fixed tháng hiện tại. Cần confirm: có cần chọn tháng khác? |
| 5 | Vehicles count > 1000 (Supabase limit) | Code dùng data.length thay vì count header. Cần confirm: có > 1000 vehicles? |
| 6 | Upcoming trips filter by status | Hiện hiển thị tất cả status (kể cả cancelled). Cần confirm: chỉ scheduled/in_progress? |
| 7 | Booking status hiển thị Vietnamese label | Hiện hiển thị raw key ("pending"). Cần confirm: bug hay intentional? |
| 8 | Click vào booking/trip row navigate đến detail | Hiện không có click handler. Cần confirm: có cần quick navigation? |
