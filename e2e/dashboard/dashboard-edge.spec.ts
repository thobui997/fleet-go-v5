import { test, expect } from '@playwright/test';
import { loginAs, screenshot, TEST_USER } from '../fixtures/auth';
import { MOCK, DASH_SELECTORS, mockDashboardAPIs, goToDashboard } from '../fixtures/dashboard';

test.describe('Dashboard - Edge Case & Performance Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await loginAs(page, TEST_USER.email, TEST_USER.password);
  });

  // ─── TC-DASH-EDGE-01 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-01: > 1000 vehicles (Supabase default limit simulation)', async ({ page }) => {
    // Supabase default limit = 1000 rows. Simulate returning exactly 1000 rows.
    // Code uses data.length for vehicleTotal, so it would show 1000 (not the real count).
    const exactly1000Vehicles = Array(1000).fill(null).map((_, i) => ({
      status: i < 700 ? 'active' : 'inactive',
    }));

    await mockDashboardAPIs(page, { vehicles: exactly1000Vehicles });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-EDGE-01', '01-1000-vehicles-limit');

    const values = page.locator(DASH_SELECTORS.statValues);
    await expect(values.nth(0)).toHaveText('1000');
    // Note: This is the Supabase default limit risk — real count may be higher
    const subtitleEl = page.locator('text=(700 hoạt động)');
    await expect(subtitleEl).toBeVisible();
    await screenshot(page, 'DASH-EDGE-01', '02-supabase-limit-verified');
  });

  // ─── TC-DASH-EDGE-02 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-02: Timezone edge - midnight (dashboard loads correctly near midnight)', async ({ page }) => {
    // Override Date to simulate running at 00:00:01
    await page.addInitScript(() => {
      const midnightToday = new Date();
      midnightToday.setHours(0, 0, 1, 0);
      const originalDate = Date;
      class FakeDate extends originalDate {
        constructor(...args: ConstructorParameters<typeof Date>) {
          if (args.length === 0) {
            super(midnightToday.getTime());
          } else {
            super(...args);
          }
        }
        static now() { return midnightToday.getTime(); }
      }
      (window as typeof window & { Date: typeof Date }).Date = FakeDate as typeof Date;
    });

    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-EDGE-02', '01-midnight-dashboard');

    // Dashboard should still load correctly at midnight
    await expect(page.locator(DASH_SELECTORS.pageTitle)).toBeVisible();
    await expect(page.locator(DASH_SELECTORS.statValues).nth(0)).toHaveText('10');
    await screenshot(page, 'DASH-EDGE-02', '02-midnight-data-correct');
  });

  // ─── TC-DASH-EDGE-03 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-03: 500 payments cùng ngày - performance và sum đúng', async ({ page }) => {
    // 500 payments × 1000₫ each = 500.000₫ total
    const bigPaymentSet = Array(500).fill(null).map(() => ({ amount: 1000 }));

    await mockDashboardAPIs(page, { paymentsToday: bigPaymentSet });
    await goToDashboard(page);

    const start = Date.now();
    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 15000 });
    const loadTime = Date.now() - start;

    await screenshot(page, 'DASH-EDGE-03', '01-500-payments-loaded');

    // Revenue = 500 × 1000 = 500.000₫ (computed client-side via reduce)
    const values = page.locator(DASH_SELECTORS.statValues);
    const revenueText = await values.nth(3).textContent();
    expect(revenueText).toContain('500');
    expect(revenueText).toContain('₫');

    // Performance: client-side reduce should be fast even with 500 items
    expect(loadTime).toBeLessThan(10000); // Generous threshold
    await screenshot(page, 'DASH-EDGE-03', '02-sum-verified');
  });

  // ─── TC-DASH-EDGE-04 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-04: Revenue trend spanning 2 months (cross-month dates)', async ({ page }) => {
    // Simulate running on July 2 — 7 days ago = June 25
    const crossMonthRevenue = Array(7).fill(null).map((_, i) => {
      const d = new Date('2026-07-02');
      d.setDate(d.getDate() - (6 - i));
      return { amount: (i + 1) * 100000, paid_at: d.toISOString() };
    });
    // Days: Jun 26, Jun 27, Jun 28, Jun 29, Jun 30, Jul 1, Jul 2

    await mockDashboardAPIs(page, { revenueTrend: crossMonthRevenue });
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.revenueChartCard, { timeout: 10000 });
    const chartSvg = page.locator('h3:has-text("Doanh thu 7 ngày gần nhất")').locator('../..').locator('svg');
    await expect(chartSvg).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'DASH-EDGE-04', '01-cross-month-chart');

    // Chart shows cross-month dates (the grouping logic uses DD/MM format)
    // Verify chart renders without error (no empty state)
    await expect(page.locator(DASH_SELECTORS.emptyChart)).not.toBeVisible();
    await screenshot(page, 'DASH-EDGE-04', '02-cross-month-no-error');
  });

  // ─── TC-DASH-EDGE-05 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-05: Stale data refresh sau 30s (staleTime = 30_000)', async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for 31s wait

    // Register general mocks first, then vehicles counter on top (LIFO: counter runs first)
    await mockDashboardAPIs(page);

    let requestCount = 0;
    await page.route('**/rest/v1/vehicles**', async (route) => {
      requestCount++;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(MOCK.vehicles),
      });
    });

    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    const initialCount = requestCount;
    await screenshot(page, 'DASH-EDGE-05', '01-initial-load');

    // Wait for staleTime to expire (30s + 1s buffer)
    await page.waitForTimeout(31000);

    // Navigate away and back — component remounts, TanStack Query sees stale data (31s > 30s staleTime) and refetches
    await page.goto('/trips');
    await page.goto('/dashboard');
    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await page.waitForTimeout(1000); // Allow refetch to complete

    // Stats should still show correctly after refetch
    await expect(page.locator(DASH_SELECTORS.statValues).nth(0)).toHaveText('10');
    await screenshot(page, 'DASH-EDGE-05', '02-after-stale-refetch');

    // At least one more request should have been made (data was stale on remount)
    expect(requestCount).toBeGreaterThan(initialCount);
  });

  // ─── TC-DASH-EDGE-06 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-06: Concurrent navigation - rapid sidebar clicks', async ({ page }) => {
    await mockDashboardAPIs(page);
    await goToDashboard(page);

    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-EDGE-06', '01-initial-dashboard');

    // Rapid navigation: dashboard → vehicles → dashboard (SPA client-side)
    const vehiclesLink = page.locator('a[href="/vehicles"]').first();
    const dashboardLink = page.locator('a[href="/dashboard"]').first();

    if (await vehiclesLink.isVisible()) {
      await vehiclesLink.click();
      await dashboardLink.click();
    } else {
      // Fallback: use goto for rapid navigation
      await page.goto('/vehicles');
      await page.goto('/dashboard');
    }

    // Dashboard should load correctly after rapid navigation
    await expect(page).toHaveURL('/dashboard', { timeout: 10000 });
    await page.waitForSelector(DASH_SELECTORS.pageTitle, { timeout: 10000 });
    await screenshot(page, 'DASH-EDGE-06', '02-dashboard-after-rapid-nav');

    // No broken state
    await expect(page.locator(DASH_SELECTORS.pageTitle)).toBeVisible();
  });

  // ─── TC-DASH-EDGE-07 ────────────────────────────────────────────────────────
  test('TC-DASH-EDGE-07: Revenue = 0 format (0 ₫)', async ({ page }) => {
    await mockDashboardAPIs(page, { paymentsToday: [] }); // No payments → revenueToday = 0

    await goToDashboard(page);
    await page.waitForSelector(DASH_SELECTORS.statValues, { timeout: 10000 });
    await screenshot(page, 'DASH-EDGE-07', '01-zero-revenue');

    const values = page.locator(DASH_SELECTORS.statValues);
    const revenueText = await values.nth(3).textContent();
    // formatCurrency(0) = "0 ₫"
    expect(revenueText).toContain('0');
    expect(revenueText).toContain('₫');
    await screenshot(page, 'DASH-EDGE-07', '02-zero-format-verified');
  });
});
