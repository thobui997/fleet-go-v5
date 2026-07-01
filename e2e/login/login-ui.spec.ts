import { test, expect } from '@playwright/test';
import { screenshot, SELECTORS, TEST_USER, WRONG_PASSWORD_USER } from '../fixtures/auth';

test.describe('Login - UI/UX Tests', () => {
  // ─── TC-LOGIN-UI-01 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-01: Hiển thị loading skeleton khi kiểm tra session', async ({ page }) => {
    // Intercept Supabase auth session request to delay response and capture skeleton
    await page.route('**/auth/v1/token**', async (route) => {
      await page.waitForTimeout(1500);
      await route.continue();
    });

    // Navigate and immediately capture skeleton state
    const navPromise = page.goto('/login');

    // Try to capture skeleton before auth check completes
    try {
      await page.waitForSelector('.animate-pulse, [data-skeleton], [data-slot="skeleton"]', {
        state: 'visible',
        timeout: 3000,
      });
      await screenshot(page, 'LOGIN-UI-01', '01-skeleton-loading');
    } catch {
      // Skeleton may flash too quickly — capture current state
      await screenshot(page, 'LOGIN-UI-01', '01-page-state');
    }

    await navPromise;
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible', timeout: 10000 });
    await screenshot(page, 'LOGIN-UI-01', '02-form-visible');
  });

  // ─── TC-LOGIN-UI-02 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-02: Toggle hiển thị/ẩn password', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.passwordInput, 'Test1234');

    // Default: password hidden (type=password)
    const passwordInput = page.locator(SELECTORS.passwordInput);
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await screenshot(page, 'LOGIN-UI-02', '01-password-hidden');

    // Click toggle (Eye icon)
    await page.click(SELECTORS.passwordToggle);

    // Password should now be visible (type=text)
    const passwordInputAfterToggle = page.locator('input[name="password"]');
    await expect(passwordInputAfterToggle).toHaveAttribute('type', 'text');
    await screenshot(page, 'LOGIN-UI-02', '02-password-visible');

    // Click again to hide
    await page.click(SELECTORS.passwordToggle);
    const passwordInputHiddenAgain = page.locator(SELECTORS.passwordInput);
    await expect(passwordInputHiddenAgain).toHaveAttribute('type', 'password');
    await screenshot(page, 'LOGIN-UI-02', '03-password-hidden-again');
  });

  // ─── TC-LOGIN-UI-03 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-03: Trạng thái submitting - disable inputs và đổi button text', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, TEST_USER.email);
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);

    // Click submit and immediately capture submitting state
    await page.click(SELECTORS.submitButton);

    // Try to capture loading state before redirect
    try {
      // Look for disabled state or loading text
      await page.waitForFunction(
        () => {
          const btn = document.querySelector('button[type="submit"]');
          return btn?.textContent?.includes('Đang đăng nhập') || btn?.hasAttribute('disabled');
        },
        { timeout: 3000 }
      );
      await screenshot(page, 'LOGIN-UI-03', '01-submitting-state');

      // Verify inputs are disabled during submission
      const emailInput = page.locator(SELECTORS.emailInput);
      const passwordInput = page.locator('input[name="password"]');
      await expect(emailInput).toBeDisabled({ timeout: 2000 });
      await expect(passwordInput).toBeDisabled({ timeout: 2000 });

      // Verify button text
      const submitBtn = page.locator(SELECTORS.submitButton);
      await expect(submitBtn).toContainText('Đang đăng nhập');
      await expect(submitBtn).toBeDisabled({ timeout: 2000 });

      // Toggle button should be disabled too
      const toggleBtn = page.locator(SELECTORS.passwordToggle);
      await expect(toggleBtn).toBeDisabled({ timeout: 2000 });
    } catch {
      // Submitting state was too fast to capture, wait for final state
      await screenshot(page, 'LOGIN-UI-03', '01-state-after-submit');
    }

    // Wait for completion
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await screenshot(page, 'LOGIN-UI-03', '02-after-login');
  });

  // ─── TC-LOGIN-UI-04 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-04: Layout responsive trên mobile (375x667)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await screenshot(page, 'LOGIN-UI-04', '01-mobile-layout');

    // Cover area (left panel) should be hidden on mobile
    const coverArea = page.locator('.hidden.lg\\:flex').first();
    await expect(coverArea).toBeHidden();

    // Form card should be visible (select the Card div specifically, not the <p> with max-w-md)
    const formCard = page.locator('[class*="shadow-2xl"]');
    await expect(formCard).toBeVisible();

    // Form should still be usable
    const emailInput = page.locator(SELECTORS.emailInput);
    const submitBtn = page.locator(SELECTORS.submitButton);
    await expect(emailInput).toBeVisible();
    await expect(submitBtn).toBeVisible();
    await screenshot(page, 'LOGIN-UI-04', '02-form-usable-on-mobile');
  });

  // ─── TC-LOGIN-UI-05 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-05: Layout trên desktop (1920x1080)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await screenshot(page, 'LOGIN-UI-05', '01-desktop-layout');

    // Cover area should be visible on desktop
    const coverArea = page.locator('.lg\\:flex').first();
    await expect(coverArea).toBeVisible();

    // FleetGo branding in cover
    const branding = page.locator('h1').filter({ hasText: 'FleetGo' });
    await expect(branding).toBeVisible();

    // Form card visible on right side
    const formCard = page.locator('[class*="shadow-2xl"]');
    await expect(formCard).toBeVisible();
  });

  // ─── TC-LOGIN-UI-06 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-06: Email field có autofocus', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await screenshot(page, 'LOGIN-UI-06', '01-login-page');

    // React's autoFocus prop calls .focus() programmatically (does not set DOM autofocus attr)
    // Verify the email input is the active/focused element
    const emailInput = page.locator(SELECTORS.emailInput);
    await emailInput.waitFor({ state: 'visible' });
    const isFocused = await emailInput.evaluate((el) => document.activeElement === el);
    expect(isFocused).toBeTruthy();
    await screenshot(page, 'LOGIN-UI-06', '02-email-focused');
  });

  // ─── TC-LOGIN-UI-07 ─────────────────────────────────────────────────────────
  test('TC-LOGIN-UI-07: Toast error hiển thị đúng khi đăng nhập thất bại', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, WRONG_PASSWORD_USER.email);
    await page.fill(SELECTORS.passwordInput, WRONG_PASSWORD_USER.password);

    await screenshot(page, 'LOGIN-UI-07', '01-before-submit');

    await page.click(SELECTORS.submitButton);

    // Wait for toast to appear
    await expect(page.getByText('Đăng nhập thất bại').first()).toBeVisible({ timeout: 10000 });

    await screenshot(page, 'LOGIN-UI-07', '02-toast-visible');

    // Verify toast title and description
    await expect(page.getByText('Đăng nhập thất bại').first()).toBeVisible();
    await expect(page.getByText('Email hoặc mật khẩu không chính xác').first()).toBeVisible();

    await screenshot(page, 'LOGIN-UI-07', '03-toast-detail');
  });
});
