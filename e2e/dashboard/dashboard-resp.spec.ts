import { test, expect } from '@playwright/test';
import { loginAs, screenshot, TEST_USER } from '../fixtures/auth';
import { DASH_SELECTORS, mockDashboardAPIs, goToDashboard } from '../fixtures/dashboard';

test.describe('Dashboard - Responsive Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await loginAs(page, TEST_USER.email, TEST_USER.password);
  });

  // ─── TC-DASH-RESP-01 ────────────────────────────────────────────────────────
  test('TC-DASH-RESP-01: Dashboard trên tablet (768x1024)', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-RESP-01', '01-tablet-layout');

    // On tablet (sm breakpoint): stat cards = 2 cols (sm:grid-cols-2)
    const statsGrid = page.locator('[class*="sm:grid-cols-2"]');
    await expect(statsGrid).toBeVisible();

    // All 4 stat cards should still be visible (stacked or 2-col)
    await expect(page.locator(DASH_SELECTORS.statCardVehicles)).toBeVisible();
    await expect(page.locator(DASH_SELECTORS.statCardTrips)).toBeVisible();
    await expect(page.locator(DASH_SELECTORS.statCardBookings)).toBeVisible();
    await expect(page.locator(DASH_SELECTORS.statCardRevenue)).toBeVisible();

    // Charts and tables visible
    await expect(page.locator(DASH_SELECTORS.revenueChartCard)).toBeVisible();
    await expect(page.locator(DASH_SELECTORS.recentBookingsCard)).toBeVisible();

    await screenshot(page, 'DASH-RESP-01', '02-tablet-components-visible');
  });

  // ─── TC-DASH-RESP-02 ────────────────────────────────────────────────────────
  test('TC-DASH-RESP-02: Dashboard trên mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-RESP-02', '01-mobile-layout');

    // Stat cards: 1 col on mobile (grid-cols-1 default)
    // All 4 cards still visible by scrolling
    await expect(page.locator(DASH_SELECTORS.statCardVehicles)).toBeVisible();
    await expect(page.locator(DASH_SELECTORS.statCardRevenue)).toBeVisible();

    // Page title visible
    await expect(page.locator(DASH_SELECTORS.pageTitle)).toBeVisible();

    // Charts visible (full width on mobile)
    await expect(page.locator(DASH_SELECTORS.revenueChartCard)).toBeVisible();

    // Tables visible
    await expect(page.locator(DASH_SELECTORS.recentBookingsCard)).toBeVisible();

    await screenshot(page, 'DASH-RESP-02', '02-mobile-components-visible');
  });

  // ─── TC-DASH-RESP-03 ────────────────────────────────────────────────────────
  test('TC-DASH-RESP-03: Tables overflow-x-auto trên mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.recentBookingsCard, { timeout: 10000 });

    // Scroll to recent bookings table
    await page.locator(DASH_SELECTORS.recentBookingsCard).scrollIntoViewIfNeeded();
    await screenshot(page, 'DASH-RESP-03', '01-table-on-mobile');

    // Table container should have overflow-x-auto class
    const tableWrapper = page.locator('.overflow-x-auto').first();
    await expect(tableWrapper).toBeVisible({ timeout: 10000 });

    // Table headers should be inside the scrollable area
    const tableHeaders = page.locator('th:has-text("Mã đặt vé")');
    await expect(tableHeaders.first()).toBeAttached();

    // Verify the overflow wrapper exists for upcoming trips too
    await page.locator(DASH_SELECTORS.upcomingTripsCard).scrollIntoViewIfNeeded();
    const tripsTableWrapper = page.locator('.overflow-x-auto').nth(1);
    await expect(tripsTableWrapper).toBeVisible({ timeout: 5000 });

    await screenshot(page, 'DASH-RESP-03', '02-overflow-scroll-verified');
  });
});
