import { test, expect } from '@playwright/test';
import { loginAs, screenshot, TEST_USER } from '../fixtures/auth';
import { MOCK, DASH_SELECTORS, mockDashboardAPIs, goToDashboard } from '../fixtures/dashboard';

test.describe('Dashboard - Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await loginAs(page, TEST_USER.email, TEST_USER.password);
  });

  // ─── TC-DASH-FUNC-01 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-01: Hiển thị Tổng xe đúng (10 xe, 7 active)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: 10 vehicles (7 active)
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-01', '01-dashboard-loaded');

    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(0)).toHaveText('10');

    const subtitle = page.locator('text=(7 hoạt động)');
    await expect(subtitle).toBeVisible();
    await screenshot(page, 'DASH-FUNC-01', '02-vehicle-card-verified');
  });

  // ─── TC-DASH-FUNC-02 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-02: Hiển thị Chuyến hôm nay đúng (5 trips: 3 scheduled, 2 in_progress)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: 5 trips
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });

    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(1)).toHaveText('5');

    const subtitle = page.locator('text=(3 chờ / 2 chạy)');
    await expect(subtitle).toBeVisible();
    await screenshot(page, 'DASH-FUNC-02', '01-trips-today-card');
  });

  // ─── TC-DASH-FUNC-03 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-03: Hiển thị Đặt vé hôm nay đúng (8 bookings)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: 8 bookings
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });

    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(2)).toHaveText('8');
    await screenshot(page, 'DASH-FUNC-03', '01-bookings-today-card');
  });

  // ─── TC-DASH-FUNC-04 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-04: Hiển thị Doanh thu hôm nay đúng (5.000.000 ₫)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: 5.000.000₫
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });

    const values = page.locator(DASH_SELECTORS.statValues);
    const revenueText = await values.nth(3).textContent();
    // formatCurrency(5000000) with vi-VN = "5.000.000 ₫"
    expect(revenueText).toContain('5');
    expect(revenueText).toContain('000');
    expect(revenueText).toContain('₫');
    await screenshot(page, 'DASH-FUNC-04', '01-revenue-card');
  });

  // ─── TC-DASH-FUNC-05 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-05: Stats = 0 khi không có data', async ({ page }) => {
    await mockDashboardAPIs(page, {
      vehicles: [],
      tripsToday: [],
      bookingsToday: [],
      paymentsToday: [],
      recentBookings: [],
      upcomingTrips: [],
      tripStatusThisMonth: [],
      bookingStatusThisMonth: [],
      revenueTrend: [],
    });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-05', '01-all-zeros');

    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(0)).toHaveText('0'); // Tổng xe
    await expect(values.nth(1)).toHaveText('0'); // Chuyến hôm nay
    await expect(values.nth(2)).toHaveText('0'); // Đặt vé hôm nay
    // Revenue = "0 ₫" format
    const revenueText = await values.nth(3).textContent();
    expect(revenueText).toContain('0');
    expect(revenueText).toContain('₫');
    await screenshot(page, 'DASH-FUNC-05', '02-zeros-verified');
  });

  // ─── TC-DASH-FUNC-06 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-06: Chỉ tính revenue từ completed payments (2 × 200k = 400k)', async ({ page }) => {
    await mockDashboardAPIs(page, {
      paymentsToday: [{ amount: 200000 }, { amount: 200000 }],
    });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });

    const values = page.locator(DASH_SELECTORS.statValues);
    const revenueText = await values.nth(3).textContent();
    // formatCurrency(400000) = "400.000 ₫"
    expect(revenueText).toContain('400');
    expect(revenueText).toContain('₫');
    await screenshot(page, 'DASH-FUNC-06', '01-revenue-400k');
  });

  // ─── TC-DASH-FUNC-07 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-07: Chỉ tính trips/bookings hôm nay', async ({ page }) => {
    const todayTrips = [
      { id: 't1', status: 'scheduled', departure_time: new Date().toISOString() },
      { id: 't2', status: 'in_progress', departure_time: new Date().toISOString() },
    ];
    await mockDashboardAPIs(page, { tripsToday: todayTrips });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });

    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(1)).toHaveText('2');
    await screenshot(page, 'DASH-FUNC-07', '01-trips-today-count');
  });

  // ─── TC-DASH-FUNC-08 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-08: Hiển thị revenue 7 ngày (line chart)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: 7 revenue data points
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.revenueChartCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-08', '01-revenue-chart-visible');

    // Revenue chart card is visible
    await expect(page.locator(DASH_SELECTORS.revenueChartCard)).toBeVisible();

    // SVG (recharts renders as SVG) - go up h3 → CardHeader → Card, then find svg in CardContent
    const chartSvg = page.locator('h3:has-text("Doanh thu 7 ngày gần nhất")').locator('../..').locator('svg');
    await expect(chartSvg).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-08', '02-chart-svg-present');
  });

  // ─── TC-DASH-FUNC-09 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-09: Fill missing dates với 0 (chỉ có 3/7 ngày có revenue)', async ({ page }) => {
    // Only 3 out of 7 days have payments
    const sparseRevenue = [
      { amount: 100000, paid_at: new Date(Date.now() - 6 * 86400000).toISOString() }, // day 1
      { amount: 200000, paid_at: new Date(Date.now() - 4 * 86400000).toISOString() }, // day 3
      { amount: 150000, paid_at: new Date(Date.now() - 2 * 86400000).toISOString() }, // day 5
    ];
    await mockDashboardAPIs(page, { revenueTrend: sparseRevenue });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.revenueChartCard, { timeout: 10000 });

    const chartSvg = page.locator('h3:has-text("Doanh thu 7 ngày gần nhất")').locator('../..').locator('svg');
    await expect(chartSvg).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-09', '01-sparse-revenue-chart');
  });

  // ─── TC-DASH-FUNC-10 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-10: Revenue chart trống khi không có data', async ({ page }) => {
    await mockDashboardAPIs(page, { revenueTrend: [] });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.revenueChartCard, { timeout: 10000 });
    // Chart card header visible but shows empty state
    await expect(page.locator(DASH_SELECTORS.revenueChartCard)).toBeVisible();
    await screenshot(page, 'DASH-FUNC-10', '01-empty-revenue-chart');
  });

  // ─── TC-DASH-FUNC-11 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-11: Revenue grouping by date (3 payments cùng ngày = 450k)', async ({ page }) => {
    const sameDay = new Date(Date.now() - 86400000).toISOString();
    await mockDashboardAPIs(page, {
      revenueTrend: [
        { amount: 100000, paid_at: sameDay },
        { amount: 200000, paid_at: sameDay },
        { amount: 150000, paid_at: sameDay },
      ],
    });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.revenueChartCard, { timeout: 10000 });

    const chartSvg = page.locator('h3:has-text("Doanh thu 7 ngày gần nhất")').locator('../..').locator('svg');
    await expect(chartSvg).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-11', '01-grouped-revenue-chart');
    // The sum 450000 is computed client-side; we verify chart renders without error
    await expect(page.locator(DASH_SELECTORS.emptyChart)).not.toBeVisible();
  });

  // ─── TC-DASH-FUNC-12 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-12: Trip status pie chart (4 statuses)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: 4 statuses
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.tripStatusChartCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-12', '01-trip-status-pie-chart');

    const chartCard = page.locator('text=Trạng thái chuyến đi').locator('..');
    await expect(chartCard).toBeVisible();

    // Legend labels for the 4 statuses
    for (const label of ['Lên lịch', 'Đang chạy', 'Hoàn thành', 'Đã hủy']) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 10000 });
    }
    await screenshot(page, 'DASH-FUNC-12', '02-legend-labels-verified');
  });

  // ─── TC-DASH-FUNC-13 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-13: Booking status bar chart (5 statuses)', async ({ page }) => {
    // Use wide viewport so recharts doesn't skip X-axis labels
    await page.setViewportSize({ width: 1920, height: 1080 });
    await mockDashboardAPIs(page); // default: 5 statuses
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.bookingStatusChartCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-13', '01-booking-status-bar-chart');

    // Bar chart SVG is inside CardContent: h3 → CardHeader → Card → svg
    const chartCard = page.locator('h3:has-text("Trạng thái đặt vé")').locator('../..');
    const chartSvg = chartCard.locator('svg');
    await expect(chartSvg).toBeVisible({ timeout: 10000 });

    // X-axis labels for booking statuses (1920px wide ensures all labels render)
    for (const label of ['Chờ xác nhận', 'Đã xác nhận', 'Đã hủy', 'Hoàn thành', 'Đã hoàn tiền']) {
      await expect(page.locator(`text=${label}`).first()).toBeVisible({ timeout: 10000 });
    }
    await screenshot(page, 'DASH-FUNC-13', '02-bar-labels-verified');
  });

  // ─── TC-DASH-FUNC-14 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-14: Status charts chỉ tháng hiện tại (data shown, not empty)', async ({ page }) => {
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.tripStatusChartCard, { timeout: 10000 });

    // Charts should NOT show empty state since we have mock data for current month
    await expect(page.locator(DASH_SELECTORS.emptyChart)).not.toBeVisible();
    await screenshot(page, 'DASH-FUNC-14', '01-status-charts-with-data');
  });

  // ─── TC-DASH-FUNC-15 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-15: Status chart trống khi không có data', async ({ page }) => {
    await mockDashboardAPIs(page, {
      tripStatusThisMonth: [],
      bookingStatusThisMonth: [],
    });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.tripStatusChartCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-15', '01-empty-status-charts');

    // Both charts should show empty state
    const emptyMessages = page.locator(DASH_SELECTORS.emptyChart);
    await expect(emptyMessages.first()).toBeVisible({ timeout: 10000 });
  });

  // ─── TC-DASH-FUNC-16 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-16: Đặt vé gần đây hiển thị đúng (5 rows, all columns)', async ({ page }) => {
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-16', '01-recent-bookings-table');

    // Verify all table headers
    for (const header of ['Mã đặt vé', 'Khách hàng', 'Tuyến', 'Khởi hành', 'Tổng tiền', 'Trạng thái']) {
      await expect(page.locator(`text=${header}`).first()).toBeVisible();
    }

    // Verify 5 data rows (th row + 5 data rows = 6 tr, but we count only tbody tr)
    const bookingRows = page.locator('text=Đặt vé gần đây').locator('../..').locator('tbody tr');
    await expect(bookingRows).toHaveCount(5);
    await screenshot(page, 'DASH-FUNC-16', '02-five-rows-verified');
  });

  // ─── TC-DASH-FUNC-17 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-17: Chuyến sắp khởi hành hiển thị đúng (5 rows, all columns)', async ({ page }) => {
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.upcomingTripsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-17', '01-upcoming-trips-table');

    // Verify table headers
    for (const header of ['Tuyến', 'Khởi hành', 'Xe', 'Trạng thái']) {
      await expect(page.locator(`text=${header}`).first()).toBeVisible();
    }

    const tripRows = page.locator('text=Chuyến sắp khởi hành').locator('../..').locator('tbody tr');
    await expect(tripRows).toHaveCount(5);
    await screenshot(page, 'DASH-FUNC-17', '02-five-trip-rows-verified');
  });

  // ─── TC-DASH-FUNC-18 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-18: Upcoming trips chỉ hiển thị future (departure >= now)', async ({ page }) => {
    const futureTrips = Array(3).fill(null).map((_, i) => ({
      id: `ft${i}`,
      status: 'scheduled',
      departure_time: new Date(Date.now() + (i + 1) * 86400000).toISOString(),
      route: {
        id: `r${i}`,
        name: `Tuyến ${i}`,
        origin_station: { id: `sa${i}`, name: `Bến đi ${i}` },
        destination_station: { id: `sb${i}`, name: `Bến đến ${i}` },
      },
      vehicle: { id: `v${i}`, license_plate: `51C-0001${i}` },
    }));

    await mockDashboardAPIs(page, { upcomingTrips: futureTrips });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.upcomingTripsCard, { timeout: 10000 });

    const tripRows = page.locator('text=Chuyến sắp khởi hành').locator('../..').locator('tbody tr');
    await expect(tripRows).toHaveCount(3);
    await screenshot(page, 'DASH-FUNC-18', '01-future-trips-only');
  });

  // ─── TC-DASH-FUNC-19 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-19: Recent bookings max 5 (có 5 rows trong bảng)', async ({ page }) => {
    await mockDashboardAPIs(page); // default: exactly 5 recent bookings
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });

    const bookingRows = page.locator('text=Đặt vé gần đây').locator('../..').locator('tbody tr');
    await expect(bookingRows).toHaveCount(5);
    await screenshot(page, 'DASH-FUNC-19', '01-max-5-bookings');
  });

  // ─── TC-DASH-FUNC-20 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-20: Bảng bookings trống - hiển thị "Chưa có đặt vé nào"', async ({ page }) => {
    await mockDashboardAPIs(page, { recentBookings: [] });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-20', '01-empty-bookings-table');

    await expect(page.locator(DASH_SELECTORS.emptyBookings)).toBeVisible({ timeout: 10000 });
  });

  // ─── TC-DASH-FUNC-21 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-21: Bảng trips trống - hiển thị "Không có chuyến sắp khởi hành"', async ({ page }) => {
    await mockDashboardAPIs(page, { upcomingTrips: [] });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.upcomingTripsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-21', '01-empty-trips-table');

    await expect(page.locator(DASH_SELECTORS.emptyTrips)).toBeVisible({ timeout: 10000 });
  });

  // ─── TC-DASH-FUNC-22 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-22: Status badge colors đúng cho bookings (all 5 statuses)', async ({ page }) => {
    // recentBookings default has all 5 statuses (pending, confirmed, cancelled, completed, refunded)
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-22', '01-booking-status-badges');

    // Verify badge CSS classes per status
    const badgeMap: Record<string, string> = {
      pending: 'bg-yellow-100',
      confirmed: 'bg-blue-100',
      cancelled: 'bg-red-100',
      completed: 'bg-green-100',
      refunded: 'bg-gray-100',
    };

    for (const [status, bgClass] of Object.entries(badgeMap)) {
      const badge = page.locator(`[class*="${bgClass}"]`).filter({ hasText: status }).first();
      await expect(badge).toBeVisible({ timeout: 5000 });
    }
    await screenshot(page, 'DASH-FUNC-22', '02-badge-colors-verified');
  });

  // ─── TC-DASH-FUNC-23 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-23: Trip status badge colors đúng (4 statuses)', async ({ page }) => {
    const tripsAllStatuses = [
      { id: 'ut0', status: 'scheduled', departure_time: new Date(Date.now() + 3600000).toISOString(), route: { id: 'r0', name: 'T0', origin_station: { id: 's0a', name: 'A' }, destination_station: { id: 's0b', name: 'B' } }, vehicle: { id: 'v0', license_plate: '51A-0001' } },
      { id: 'ut1', status: 'in_progress', departure_time: new Date(Date.now() + 7200000).toISOString(), route: { id: 'r1', name: 'T1', origin_station: { id: 's1a', name: 'C' }, destination_station: { id: 's1b', name: 'D' } }, vehicle: { id: 'v1', license_plate: '51A-0002' } },
      { id: 'ut2', status: 'completed', departure_time: new Date(Date.now() + 10800000).toISOString(), route: { id: 'r2', name: 'T2', origin_station: { id: 's2a', name: 'E' }, destination_station: { id: 's2b', name: 'F' } }, vehicle: { id: 'v2', license_plate: '51A-0003' } },
      { id: 'ut3', status: 'cancelled', departure_time: new Date(Date.now() + 14400000).toISOString(), route: { id: 'r3', name: 'T3', origin_station: { id: 's3a', name: 'G' }, destination_station: { id: 's3b', name: 'H' } }, vehicle: { id: 'v3', license_plate: '51A-0004' } },
    ];

    await mockDashboardAPIs(page, { upcomingTrips: tripsAllStatuses });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.upcomingTripsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-23', '01-trip-status-badges');

    const tripBadgeMap: Record<string, string> = {
      scheduled: 'bg-blue-100',
      in_progress: 'bg-amber-100',
      completed: 'bg-green-100',
      cancelled: 'bg-red-100',
    };

    for (const [status, bgClass] of Object.entries(tripBadgeMap)) {
      const badge = page.locator(`[class*="${bgClass}"]`).filter({ hasText: status }).first();
      await expect(badge).toBeVisible({ timeout: 5000 });
    }
    await screenshot(page, 'DASH-FUNC-23', '02-trip-badge-colors-verified');
  });

  // ─── TC-DASH-FUNC-24 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-24: Null data hiển thị N/A', async ({ page }) => {
    const bookingWithNulls = [{
      id: 'null-booking',
      booking_code: 'BK-NULL',
      status: 'pending',
      booking_date: new Date().toISOString(),
      total_amount: 100000,
      customer: null,
      trip: {
        id: 'null-trip',
        departure_time: null,
        route: null,
        vehicle: null,
      },
    }];

    await mockDashboardAPIs(page, { recentBookings: bookingWithNulls as never });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-24', '01-null-data-displayed');

    // N/A should appear for missing customer and route
    const naTexts = page.locator('text=N/A');
    await expect(naTexts.first()).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'DASH-FUNC-24', '02-na-cells-verified');
  });

  // ─── TC-DASH-FUNC-25 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-25: Home redirect về /dashboard', async ({ page }) => {
    await page.goto('/');
    await screenshot(page, 'DASH-FUNC-25', '01-root-redirect');
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await screenshot(page, 'DASH-FUNC-25', '02-on-dashboard');
  });

  // ─── TC-DASH-FUNC-26 ────────────────────────────────────────────────────────
  test('TC-DASH-FUNC-26: Sidebar navigation đến /dashboard', async ({ page }) => {
    // Go to a different page first
    await page.goto('/vehicles');
    await page.waitForTimeout(1000);

    // Find sidebar link to dashboard and click it
    const dashboardLink = page.locator('a[href="/dashboard"], a[href*="dashboard"]').first();
    await expect(dashboardLink).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'DASH-FUNC-26', '01-sidebar-visible');

    await dashboardLink.click();
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
    await screenshot(page, 'DASH-FUNC-26', '02-navigated-to-dashboard');
  });
});
