import { test, expect } from '@playwright/test';
import { loginAs, screenshot, TEST_USER } from '../fixtures/auth';
import { MOCK, mockDashboardAPIs, goToDashboard } from '../fixtures/dashboard';

test.describe('Dashboard - Security Tests', () => {
  // ─── TC-DASH-SEC-01 ─────────────────────────────────────────────────────────
  test('TC-DASH-SEC-01: Truy cập /dashboard khi chưa login → redirect về /login', async ({ page }) => {
    // Clear all storage to ensure unauthenticated state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    await screenshot(page, 'DASH-SEC-01', '01-unauthenticated');

    await page.goto('/dashboard');

    // ProtectedRoute should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await screenshot(page, 'DASH-SEC-01', '02-redirected-to-login');

    // Login form should be visible
    await expect(page.locator('input[name="email"]')).toBeVisible();
  });

  // ─── TC-DASH-SEC-02 ─────────────────────────────────────────────────────────
  test.skip('TC-DASH-SEC-02: Auth expiry detection (401) → signOut → redirect login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    // Return 401 on any dashboard API call
    await page.route('**/rest/v1/vehicles**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Unauthorized (401)',
          code: '401',
          details: '',
          hint: '',
        }),
      });
    });

    await page.goto('/dashboard');
    await screenshot(page, 'DASH-SEC-02', '01-401-triggered');

    // handleAuthExpiry detects '401' in message → signOut → redirect
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await screenshot(page, 'DASH-SEC-02', '02-redirected-after-401');
  });

  // ─── TC-DASH-SEC-03 ─────────────────────────────────────────────────────────
  test.skip('TC-DASH-SEC-03: Auth expiry detection (403) → signOut → redirect login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    await page.route('**/rest/v1/vehicles**', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'Forbidden (403)',
          code: '403',
          details: '',
          hint: '',
        }),
      });
    });

    await page.goto('/dashboard');
    await screenshot(page, 'DASH-SEC-03', '01-403-triggered');

    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await screenshot(page, 'DASH-SEC-03', '02-redirected-after-403');
  });

  // ─── TC-DASH-SEC-04 ─────────────────────────────────────────────────────────
  test('TC-DASH-SEC-04: Auth expiry detection (PGRST301) → signOut → redirect login', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    await page.route('**/rest/v1/vehicles**', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          message: 'JWT token is expired',
          code: 'PGRST301',
          details: 'JWT expired',
          hint: '',
        }),
      });
    });

    await page.goto('/dashboard');
    await screenshot(page, 'DASH-SEC-04', '01-pgrst301-triggered');

    // handleAuthExpiry detects code === 'PGRST301' → signOut
    await expect(page).toHaveURL(/\/login/, { timeout: 15000 });
    await screenshot(page, 'DASH-SEC-04', '02-redirected-after-pgrst301');
  });

  // ─── TC-DASH-SEC-05 ─────────────────────────────────────────────────────────
  test.skip('TC-DASH-SEC-05: XSS data không execute (HTML in customer name)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    const xssBooking = [{
      id: 'xss-booking',
      booking_code: 'BK-XSS',
      status: 'confirmed',
      booking_date: new Date().toISOString(),
      total_amount: 100000,
      customer: {
        id: 'c-xss',
        full_name: '<script>window.__xss_executed = true;</script>',
        phone_number: '0900000000',
      },
      trip: {
        id: 't-xss',
        departure_time: new Date(Date.now() + 86400000).toISOString(),
        route: {
          id: 'r-xss',
          name: 'Test',
          origin_station: { id: 'sa', name: 'A' },
          destination_station: { id: 'sb', name: 'B' },
        },
        vehicle: { id: 'v-xss', license_plate: '51A-0000', vehicle_type: null },
      },
    }];

    await mockDashboardAPIs(page, { recentBookings: xssBooking as never });
    await goToDashboard(page);

    await page.waitForSelector('text=Đặt vé gần đây', { timeout: 10000 });
    await screenshot(page, 'DASH-SEC-05', '01-xss-data-rendered');

    // Verify the XSS script did NOT execute
    const xssExecuted = await page.evaluate(() => (window as typeof window & { __xss_executed?: boolean }).__xss_executed);
    expect(xssExecuted).toBeFalsy();

    // Verify the text is shown as escaped text, not HTML
    await expect(page.locator('text=<script>')).not.toBeVisible();

    // The actual text content should contain the raw string (React escapes it)
    const customerCell = page.locator('tbody td').filter({ hasText: 'script' }).first();
    await expect(customerCell).toBeVisible();
    await screenshot(page, 'DASH-SEC-05', '02-xss-escaped-confirmed');
  });
});
