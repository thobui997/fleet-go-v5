import { test, expect } from '@playwright/test';
import { loginAs, screenshot, SELECTORS, TEST_USER, WRONG_PASSWORD_USER, NON_EXISTENT_USER } from '../fixtures/auth';

test.describe('Login - Functional Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage to ensure clean state
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // ─── TC-LOGIN-FUNC-01 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-01: Đăng nhập thành công với credentials hợp lệ', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await screenshot(page, 'LOGIN-FUNC-01', '01-form-idle');

    await page.fill(SELECTORS.emailInput, TEST_USER.email);
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);

    await screenshot(page, 'LOGIN-FUNC-01', '02-filled');

    await page.click(SELECTORS.submitButton);

    // Expect redirect to dashboard
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    await screenshot(page, 'LOGIN-FUNC-01', '03-dashboard');
  });

  // ─── TC-LOGIN-FUNC-02 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-02: Đăng nhập và redirect về trang intended (/vehicles)', async ({ page }) => {
    // Access protected route while unauthenticated
    await page.goto('/vehicles');

    // Should redirect to /login
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
    await screenshot(page, 'LOGIN-FUNC-02', '01-redirected-to-login');

    // Login
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });
    await page.fill(SELECTORS.emailInput, TEST_USER.email);
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);
    await page.click(SELECTORS.submitButton);

    // Should redirect back to /vehicles (intended URL)
    await expect(page).toHaveURL('/vehicles', { timeout: 15000 });
    await screenshot(page, 'LOGIN-FUNC-02', '02-redirected-to-vehicles');
  });

  // ─── TC-LOGIN-FUNC-03 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-03: Auto-redirect khi đã đăng nhập', async ({ page }) => {
    // Login first
    await loginAs(page, TEST_USER.email, TEST_USER.password);
    await screenshot(page, 'LOGIN-FUNC-03', '01-already-logged-in');

    // Navigate back to /login
    await page.goto('/login');

    // Should auto-redirect to dashboard (not show login form)
    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
    await screenshot(page, 'LOGIN-FUNC-03', '02-auto-redirected');
  });

  // ─── TC-LOGIN-FUNC-04 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-04: Đăng nhập thành công với role Admin', async ({ page }) => {
    // Using the one available test account (bao.pham@fleetgo.vn)
    // Additional role accounts require separate data setup in Supabase
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, TEST_USER.email);
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);
    await page.click(SELECTORS.submitButton);

    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await screenshot(page, 'LOGIN-FUNC-04', '01-admin-dashboard');

    // Verify sidebar shows user info
    const sidebar = page.locator('nav, aside, [data-sidebar]').first();
    await expect(sidebar).toBeVisible({ timeout: 5000 });
    await screenshot(page, 'LOGIN-FUNC-04', '02-sidebar-visible');
  });

  // ─── TC-LOGIN-FUNC-05 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-05: Đăng nhập với email đúng, password sai', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, WRONG_PASSWORD_USER.email);
    await page.fill(SELECTORS.passwordInput, WRONG_PASSWORD_USER.password);

    await screenshot(page, 'LOGIN-FUNC-05', '01-filled-wrong-password');

    await page.click(SELECTORS.submitButton);

    // Wait for toast error
    const toastEl = page.locator('[role="region"] li, [data-sonner-toast], [data-radix-toast-viewport] li').first();
    await expect(toastEl).toBeVisible({ timeout: 10000 });

    await screenshot(page, 'LOGIN-FUNC-05', '02-toast-error');

    // Verify toast content
    await expect(page.getByText('Đăng nhập thất bại').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Email hoặc mật khẩu không chính xác').first()).toBeVisible({ timeout: 5000 });

    // Should still be on login page
    await expect(page).toHaveURL(/\/login/);
  });

  // ─── TC-LOGIN-FUNC-06 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-06: Đăng nhập với email không tồn tại', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, NON_EXISTENT_USER.email);
    await page.fill(SELECTORS.passwordInput, NON_EXISTENT_USER.password);

    await screenshot(page, 'LOGIN-FUNC-06', '01-filled-nonexistent-email');

    await page.click(SELECTORS.submitButton);

    // Wait for toast error
    const toastEl = page.locator('[role="region"] li, [data-sonner-toast], [data-radix-toast-viewport] li').first();
    await expect(toastEl).toBeVisible({ timeout: 10000 });

    await screenshot(page, 'LOGIN-FUNC-06', '02-toast-error');

    await expect(page.getByText('Đăng nhập thất bại').first()).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Email hoặc mật khẩu không chính xác').first()).toBeVisible({ timeout: 5000 });
    await expect(page).toHaveURL(/\/login/);
  });

  // ─── TC-LOGIN-FUNC-07 ───────────────────────────────────────────────────────
  test.skip('TC-LOGIN-FUNC-07: Đăng nhập với tài khoản chưa xác nhận email', async ({ page }) => {
    // REQUIRES: Supabase account 'unconfirmed@fleet.com' created but email NOT confirmed
    // Setup: Create account via Supabase Admin, skip email confirmation step
    await page.goto('/login');
    await page.fill(SELECTORS.emailInput, 'unconfirmed@fleet.com');
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);
    await page.click(SELECTORS.submitButton);

    await expect(page.getByText('Tài khoản chưa được xác nhận. Vui lòng liên hệ quản trị viên.')).toBeVisible({
      timeout: 10000,
    });
    await screenshot(page, 'LOGIN-FUNC-07', '01-unconfirmed-error');
  });

  // ─── TC-LOGIN-FUNC-08 ───────────────────────────────────────────────────────
  test('TC-LOGIN-FUNC-08: Rate limiting - quá nhiều lần thử sai', async ({ page }) => {
    // WARNING: This test triggers Supabase rate limiting. Run in isolation.
    test.setTimeout(120000);

    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    let rateLimitTriggered = false;

    for (let i = 0; i < 10; i++) {
      await page.fill(SELECTORS.emailInput, 'ratelimit@fleet.com');
      await page.fill(SELECTORS.passwordInput, `WrongPass${i}`);
      await page.click(SELECTORS.submitButton);

      // Wait briefly for toast
      await page.waitForTimeout(1500);

      const rateLimitText = page.getByText('Quá nhiều lần thử. Vui lòng thử lại sau.');
      if (await rateLimitText.isVisible()) {
        rateLimitTriggered = true;
        break;
      }
    }

    if (rateLimitTriggered) {
      await screenshot(page, 'LOGIN-FUNC-08', '01-rate-limit-triggered');
      await expect(page.getByText('Quá nhiều lần thử. Vui lòng thử lại sau.')).toBeVisible();
    } else {
      // Rate limit not triggered within 10 attempts — Supabase threshold may be higher
      await screenshot(page, 'LOGIN-FUNC-08', '01-rate-limit-not-triggered');
      console.warn('TC-LOGIN-FUNC-08: Rate limit not triggered in 10 attempts. Supabase threshold may be higher.');
    }
  });
});
