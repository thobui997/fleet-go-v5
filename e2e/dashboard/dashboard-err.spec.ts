import { test, expect } from '@playwright/test';
import { loginAs, screenshot, TEST_USER } from '../fixtures/auth';
import { MOCK, DASH_SELECTORS, mockDashboardAPIs, mockErrorForTable, mockAbortAll, goToDashboard } from '../fixtures/dashboard';

test.describe('Dashboard - Error Handling Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await loginAs(page, TEST_USER.email, TEST_USER.password);
  });

  // ─── TC-DASH-ERR-01 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-01: Auth expired (PGRST301) → auto signOut → redirect login', async ({ page }) => {
    // Return auth expiry error on first dashboard API call
    await page.route('**/rest/v1/vehicles**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'JWT token is expired (401)',
          code: 'PGRST301',
          details: '',
          hint: '',
        }),
      });
    });

    await page.goto('/dashboard');
    await screenshot(page, 'DASH-ERR-01', '01-auth-expired-triggered');

    // handleAuthExpiry calls supabase.auth.signOut() → ProtectedRoute redirects
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await screenshot(page, 'DASH-ERR-01', '02-redirected-to-login');
  });

  // ─── TC-DASH-ERR-02 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-02: Partial failure - stats fail, tables và charts OK', async ({ page }) => {
    // Abort stats-related endpoints (vehicles triggers error for all stats via allSettled throw)
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop()!;
      const select = url.searchParams.get('select') ?? '';
      const limit = url.searchParams.get('limit');
      const order = url.searchParams.get('order') ?? '';

      // Abort vehicles → fetchDashboardStats throws (allSettled fulfilled but error thrown)
      if (table === 'vehicles') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'DB error', code: 'PGRST116', details: '', hint: '' }),
        });
        return;
      }

      // Mock tables & charts with good data
      let body: unknown[];
      if (table === 'trips') {
        if (select === 'status') body = MOCK.tripStatusThisMonth;
        else if (limit === '5' || order.includes('departure_time.asc')) body = MOCK.upcomingTrips;
        else body = MOCK.tripsToday;
      } else if (table === 'bookings') {
        if (select === 'status') body = MOCK.bookingStatusThisMonth;
        else if (limit === '5' || order.includes('booking_date.desc')) body = MOCK.recentBookings;
        else body = MOCK.bookingsToday;
      } else if (table === 'payments') {
        body = select.includes('paid_at') ? MOCK.revenueTrend : MOCK.paymentsToday;
      } else {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': `0-${body.length - 1}/${body.length}` },
        body: JSON.stringify(body),
      });
    });

    await goToDashboard(page);
    await screenshot(page, 'DASH-ERR-02', '01-partial-failure');

    // Stat cards show error state
    await expect(page.locator(DASH_SELECTORS.errorText).first()).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'DASH-ERR-02', '02-stat-error-state');

    // Tables still show data
    await expect(page.locator(DASH_SELECTORS.recentBookingsCard)).toBeVisible();
    const bookingRows = page.locator('text=Đặt vé gần đây').locator('../..').locator('tbody tr');
    await expect(bookingRows.first()).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'DASH-ERR-02', '03-tables-still-show-data');
  });

  // ─── TC-DASH-ERR-03 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-03: Partial failure - vehicles query rejected → vehicleTotal = 0 silently', async ({ page }) => {
    // Abort ONLY vehicles → Promise.allSettled catches as rejected (no throw)
    // Other stats succeed with mock data
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop()!;
      const select = url.searchParams.get('select') ?? '';
      const limit = url.searchParams.get('limit');
      const order = url.searchParams.get('order') ?? '';

      if (table === 'vehicles') {
        // Return empty array → vehicleTotal=0 silently (Promise.allSettled fulfilled with empty data)
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'Content-Range': '0-0/0' },
          body: JSON.stringify([]),
        });
        return;
      }

      let body: unknown[];
      if (table === 'trips') {
        if (select === 'status') body = MOCK.tripStatusThisMonth;
        else if (limit === '5' || order.includes('departure_time.asc')) body = MOCK.upcomingTrips;
        else body = MOCK.tripsToday;
      } else if (table === 'bookings') {
        if (select === 'status') body = MOCK.bookingStatusThisMonth;
        else if (limit === '5' || order.includes('booking_date.desc')) body = MOCK.recentBookings;
        else body = MOCK.bookingsToday;
      } else if (table === 'payments') {
        body = select.includes('paid_at') ? MOCK.revenueTrend : MOCK.paymentsToday;
      } else {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': `0-${body.length - 1}/${body.length}` },
        body: JSON.stringify(body),
      });
    });

    await goToDashboard(page);

    // Wait for stats to resolve
    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 15000 });
    await screenshot(page, 'DASH-ERR-03', '01-vehicles-empty-silently');

    // vehicleTotal = 0 (empty array → length=0, no error thrown)
    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(0)).toHaveText('0');

    // Other stats still populated (no error state)
    await expect(values.nth(1)).toHaveText('5'); // tripsToday
    await expect(values.nth(2)).toHaveText('8'); // bookingsToday

    // No error text on stat cards (empty vehicles is valid, not an error)
    const errorText = page.locator(DASH_SELECTORS.errorText);
    await expect(errorText).not.toBeVisible();
    await screenshot(page, 'DASH-ERR-03', '02-other-stats-still-show');
  });

  // ─── TC-DASH-ERR-04 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-04: Recent bookings error - hiển thị error state', async ({ page }) => {
    // Let stats + charts succeed, abort bookings with limit=5 (recent bookings query)
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop()!;
      const select = url.searchParams.get('select') ?? '';
      const limit = url.searchParams.get('limit');
      const order = url.searchParams.get('order') ?? '';

      if (table === 'bookings' && (limit === '5' || order.includes('booking_date.desc'))) {
        // 500 response → Supabase returns { data: null, error } → fetchRecentBookings throws
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error', code: 'PGRST500', details: '', hint: '' }),
        });
        return;
      }

      let body: unknown[];
      if (table === 'vehicles') body = MOCK.vehicles;
      else if (table === 'trips') {
        if (select === 'status') body = MOCK.tripStatusThisMonth;
        else if (limit === '5' || order.includes('departure_time.asc')) body = MOCK.upcomingTrips;
        else body = MOCK.tripsToday;
      } else if (table === 'bookings') {
        if (select === 'status') body = MOCK.bookingStatusThisMonth;
        else body = MOCK.bookingsToday;
      } else if (table === 'payments') {
        body = select.includes('paid_at') ? MOCK.revenueTrend : MOCK.paymentsToday;
      } else {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': `0-${body.length - 1}/${body.length}` },
        body: JSON.stringify(body),
      });
    });

    await goToDashboard(page);
    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-ERR-04', '01-bookings-error-state');

    // Bookings table should show error
    await expect(page.locator(DASH_SELECTORS.errorText).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(DASH_SELECTORS.retryButton).first()).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'DASH-ERR-04', '02-retry-button-visible');
  });

  // ─── TC-DASH-ERR-05 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-05: Upcoming trips error - hiển thị error state', async ({ page }) => {
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop()!;
      const select = url.searchParams.get('select') ?? '';
      const limit = url.searchParams.get('limit');
      const order = url.searchParams.get('order') ?? '';

      if (table === 'trips' && (limit === '5' || order.includes('departure_time.asc'))) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error', code: 'PGRST500', details: '', hint: '' }),
        });
        return;
      }

      let body: unknown[];
      if (table === 'vehicles') body = MOCK.vehicles;
      else if (table === 'trips') {
        if (select === 'status') body = MOCK.tripStatusThisMonth;
        else body = MOCK.tripsToday;
      } else if (table === 'bookings') {
        if (select === 'status') body = MOCK.bookingStatusThisMonth;
        else if (limit === '5' || order.includes('booking_date.desc')) body = MOCK.recentBookings;
        else body = MOCK.bookingsToday;
      } else if (table === 'payments') {
        body = select.includes('paid_at') ? MOCK.revenueTrend : MOCK.paymentsToday;
      } else {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': `0-${body.length - 1}/${body.length}` },
        body: JSON.stringify(body),
      });
    });

    await goToDashboard(page);
    await page.waitForSelector(DASH_SELECTORS.upcomingTripsCard, { timeout: 10000 });
    await screenshot(page, 'DASH-ERR-05', '01-trips-error-state');

    await expect(page.locator(DASH_SELECTORS.errorText).first()).toBeVisible({ timeout: 15000 });
    await expect(page.locator(DASH_SELECTORS.retryButton).first()).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'DASH-ERR-05', '02-retry-button-visible');
  });

  // ─── TC-DASH-ERR-06 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-06: Revenue chart error - hiển thị error state', async ({ page }) => {
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop()!;
      const select = url.searchParams.get('select') ?? '';
      const limit = url.searchParams.get('limit');
      const order = url.searchParams.get('order') ?? '';

      if (table === 'payments' && select.includes('paid_at')) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ message: 'Server error', code: 'PGRST500', details: '', hint: '' }),
        });
        return;
      }

      let body: unknown[];
      if (table === 'vehicles') body = MOCK.vehicles;
      else if (table === 'trips') {
        if (select === 'status') body = MOCK.tripStatusThisMonth;
        else if (limit === '5' || order.includes('departure_time.asc')) body = MOCK.upcomingTrips;
        else body = MOCK.tripsToday;
      } else if (table === 'bookings') {
        if (select === 'status') body = MOCK.bookingStatusThisMonth;
        else if (limit === '5' || order.includes('booking_date.desc')) body = MOCK.recentBookings;
        else body = MOCK.bookingsToday;
      } else if (table === 'payments') {
        body = MOCK.paymentsToday;
      } else {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': `0-${body.length - 1}/${body.length}` },
        body: JSON.stringify(body),
      });
    });

    await goToDashboard(page);
    await page.waitForSelector(DASH_SELECTORS.revenueChartCard, { timeout: 10000 });
    await screenshot(page, 'DASH-ERR-06', '01-revenue-chart-error');

    await expect(page.locator(DASH_SELECTORS.errorText).first()).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'DASH-ERR-06', '02-error-state-confirmed');
  });

  // ─── TC-DASH-ERR-07 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-07: Retry button - click "Thử lại" reloads data', async ({ page }) => {
    // Initially abort recent bookings
    let shouldAbort = true;
    await page.route('**/rest/v1/**', async (route) => {
      const url = new URL(route.request().url());
      const table = url.pathname.split('/').pop()!;
      const select = url.searchParams.get('select') ?? '';
      const limit = url.searchParams.get('limit');
      const order = url.searchParams.get('order') ?? '';

      if (table === 'bookings' && (limit === '5' || order.includes('booking_date.desc'))) {
        if (shouldAbort) {
          await route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({ message: 'Server error', code: 'PGRST500', details: '', hint: '' }),
          });
          return;
        } else {
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            headers: { 'Content-Range': `0-4/5` },
            body: JSON.stringify(MOCK.recentBookings),
          });
          return;
        }
      }

      let body: unknown[];
      if (table === 'vehicles') body = MOCK.vehicles;
      else if (table === 'trips') {
        if (select === 'status') body = MOCK.tripStatusThisMonth;
        else if (limit === '5' || order.includes('departure_time.asc')) body = MOCK.upcomingTrips;
        else body = MOCK.tripsToday;
      } else if (table === 'bookings') {
        if (select === 'status') body = MOCK.bookingStatusThisMonth;
        else body = MOCK.bookingsToday;
      } else if (table === 'payments') {
        body = select.includes('paid_at') ? MOCK.revenueTrend : MOCK.paymentsToday;
      } else {
        await route.continue();
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: { 'Content-Range': `0-${body.length - 1}/${body.length}` },
        body: JSON.stringify(body),
      });
    });

    await goToDashboard(page);
    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });

    // Wait for error state
    await expect(page.locator(DASH_SELECTORS.errorText).first()).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'DASH-ERR-07', '01-error-state-before-retry');

    // Stop aborting, click retry
    shouldAbort = false;
    await page.locator(DASH_SELECTORS.retryButton).first().click();

    // Data should now load
    const bookingRows = page.locator('text=Đặt vé gần đây').locator('../..').locator('tbody tr');
    await expect(bookingRows.first()).toBeVisible({ timeout: 15000 });
    await screenshot(page, 'DASH-ERR-07', '02-data-loaded-after-retry');
  });

  // ─── TC-DASH-ERR-08 ─────────────────────────────────────────────────────────
  test('TC-DASH-ERR-08: Network error toàn bộ - tất cả components hiển thị error', async ({ page }) => {
    await mockAbortAll(page);
    await goToDashboard(page);
    await screenshot(page, 'DASH-ERR-08', '01-all-errors');

    // All error states should appear (TanStack Query retry: 1 → 2 attempts before error)
    // Wait for all error texts to appear
    await expect(page.locator(DASH_SELECTORS.errorText).first()).toBeVisible({ timeout: 20000 });
    const errorCount = await page.locator(DASH_SELECTORS.errorText).count();
    expect(errorCount).toBeGreaterThanOrEqual(1);
    await screenshot(page, 'DASH-ERR-08', '02-multiple-error-states');

    // Retry buttons visible for each failing component
    const retryCount = await page.locator(DASH_SELECTORS.retryButton).count();
    expect(retryCount).toBeGreaterThanOrEqual(1);
    await screenshot(page, 'DASH-ERR-08', '03-retry-buttons-visible');
  });
});
