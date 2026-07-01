import { test, expect } from '@playwright/test';
import { loginAs, screenshot, SELECTORS, TEST_USER } from '../fixtures/auth';

test.describe('Login - Browser & Edge Case Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  // ─── TC-LOGIN-EDGE-01 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-01: Double-click button "Đăng nhập" chỉ gửi 1 request', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, TEST_USER.email);
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);

    // Track network requests to Supabase auth
    const authRequests: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes('/auth/v1/token') || req.url().includes('signInWithPassword')) {
        authRequests.push(req.url());
      }
    });

    await screenshot(page, 'LOGIN-EDGE-01', '01-before-double-click');

    // Double-click the submit button rapidly
    await page.dblclick(SELECTORS.submitButton);

    await screenshot(page, 'LOGIN-EDGE-01', '02-after-double-click');

    // Wait for login to complete
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });

    // Only 1 auth request should have been sent (button disabled after first click)
    expect(authRequests.length).toBeLessThanOrEqual(1);
    await screenshot(page, 'LOGIN-EDGE-01', '03-single-request-verified');
  });

  // ─── TC-LOGIN-EDGE-02 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-02: Browser back button sau login không quay lại /login', async ({ page }) => {
    await loginAs(page, TEST_USER.email, TEST_USER.password);

    await expect(page).toHaveURL('/dashboard', { timeout: 5000 });
    await screenshot(page, 'LOGIN-EDGE-02', '01-at-dashboard');

    // Press browser back button
    await page.goBack();

    // Should NOT go back to /login — already authenticated, auto-redirects to dashboard
    await page.waitForTimeout(2000);
    const currentUrl = page.url();

    // Either stays at /dashboard or gets auto-redirected back if it briefly hit /login
    await screenshot(page, 'LOGIN-EDGE-02', '02-after-back');

    // Should not be showing login form
    const loginForm = page.locator(SELECTORS.emailInput);
    const isOnLogin = currentUrl.includes('/login') && await loginForm.isVisible();
    expect(isOnLogin).toBeFalsy();
  });

  // ─── TC-LOGIN-EDGE-03 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-03: Copy/Paste vào email field', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    const emailInput = page.locator(SELECTORS.emailInput);

    // Simulate paste using clipboard API
    await page.evaluate(() => {
      navigator.clipboard.writeText('admin@fleet.com').catch(() => {});
    });

    // Click input and paste
    await emailInput.click();
    await page.keyboard.press('Control+v');

    // Fallback: use fill if paste doesn't work (clipboard API restricted in headless)
    const inputValue = await emailInput.inputValue();
    if (!inputValue) {
      await emailInput.fill('admin@fleet.com');
    }

    await page.fill(SELECTORS.passwordInput, '123456');

    await screenshot(page, 'LOGIN-EDGE-03', '01-email-pasted');

    await page.click(SELECTORS.submitButton);

    // Form should submit normally (email accepted)
    await page.waitForTimeout(1000);
    // Either validation passes (sends to Supabase) or minor format issue
    const hasValidationError = await page.locator(SELECTORS.validationError).first().isVisible();
    expect(hasValidationError).toBeFalsy(); // Email should be valid
    await screenshot(page, 'LOGIN-EDGE-03', '02-after-submit');
  });

  // ─── TC-LOGIN-EDGE-04 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-04: Autofill simulation', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    // Simulate browser autofill by programmatically filling both fields
    await page.locator(SELECTORS.emailInput).fill(TEST_USER.email);
    await page.locator('input[name="password"]').fill(TEST_USER.password);

    await screenshot(page, 'LOGIN-EDGE-04', '01-autofill-simulated');

    // Submit
    await page.click(SELECTORS.submitButton);
    await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
    await screenshot(page, 'LOGIN-EDGE-04', '02-login-success');
  });

  // ─── TC-LOGIN-EDGE-05 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-05: Email với Unicode/tiếng Việt bị reject', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, 'nguyễnvăn@fleet.com');
    await page.fill(SELECTORS.passwordInput, '123456');

    await screenshot(page, 'LOGIN-EDGE-05', '01-unicode-email-entered');

    await page.click(SELECTORS.submitButton);

    await page.waitForTimeout(2000);

    // Check browser HTML5 validity (Chrome may reject Unicode in email local part)
    const emailInput = page.locator(SELECTORS.emailInput);
    const isHTMLInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );

    // Check Zod client-side validation error
    const hasZodError = await page.locator(SELECTORS.validationError).first().isVisible();

    // Check Supabase error toast
    const hasToastError = await page.getByText(/không chính xác|hợp lệ|lỗi/).first().isVisible();

    // Form must not have navigated away — any rejection keeps us on /login
    await expect(page).toHaveURL(/\/login/);
    expect(isHTMLInvalid || hasZodError || hasToastError).toBeTruthy();
    await screenshot(page, 'LOGIN-EDGE-05', '02-unicode-rejected');
  });

  // ─── TC-LOGIN-EDGE-06 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-06: Password chỉ có spaces (6 spaces)', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, 'admin@fleet.com');
    // Fill 6 spaces as password
    await page.locator('input[name="password"]').fill('      ');

    await screenshot(page, 'LOGIN-EDGE-06', '01-spaces-password');

    await page.click(SELECTORS.submitButton);

    // Zod min(6) counts spaces — validation passes, Supabase rejects
    await page.waitForTimeout(1000);
    const passwordError = page.locator(SELECTORS.validationError).last();
    const hasPasswordError = await passwordError.isVisible() &&
      (await passwordError.textContent())?.includes('Mật khẩu');

    // Should NOT have client-side validation error (spaces pass min:6)
    expect(hasPasswordError).toBeFalsy();

    // But Supabase should reject with invalid credentials
    await expect(page.getByText('Email hoặc mật khẩu không chính xác').first()).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'LOGIN-EDGE-06', '02-supabase-rejects-spaces');
  });

  // ─── TC-LOGIN-EDGE-07 ───────────────────────────────────────────────────────
  test('TC-LOGIN-EDGE-07: Refresh trang /login khi đang submit', async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });

    await page.fill(SELECTORS.emailInput, TEST_USER.email);
    await page.fill(SELECTORS.passwordInput, TEST_USER.password);

    // Click submit then immediately reload
    await page.click(SELECTORS.submitButton);
    // Very short delay then refresh
    await page.waitForTimeout(200);
    await page.reload();

    // After reload, form should reset to initial state
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible', timeout: 10000 });

    const emailValue = await page.locator(SELECTORS.emailInput).inputValue();
    const passwordValue = await page.locator('input[name="password"]').inputValue();

    // Fields should be empty after reload
    expect(emailValue).toBe('');
    expect(passwordValue).toBe('');

    // Submit button should be enabled
    const submitBtn = page.locator(SELECTORS.submitButton);
    await expect(submitBtn).toBeEnabled();
    await expect(submitBtn).toHaveText('Đăng nhập');

    await screenshot(page, 'LOGIN-EDGE-07', '01-form-reset-after-reload');
  });
});
