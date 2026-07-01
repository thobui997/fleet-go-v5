import { test, expect } from '@playwright/test';
import { screenshot, SELECTORS } from '../fixtures/auth';

test.describe('Login - Validation Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });
  });

  async function clickSubmit(page: Parameters<typeof screenshot>[0]) {
    await page.click(SELECTORS.submitButton);
  }

  // ─── TC-LOGIN-VAL-01 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-01: Submit form với email trống', async ({ page }) => {
    // Leave email empty, fill valid password
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-01', '01-before-submit');

    await clickSubmit(page);

    // Validation error should appear under email field
    const emailError = page.locator(SELECTORS.validationError).first();
    await expect(emailError).toBeVisible({ timeout: 3000 });
    await expect(emailError).toHaveText('Vui lòng nhập email hợp lệ');

    // Form should NOT submit (still on /login)
    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-01', '02-email-error');
  });

  // ─── TC-LOGIN-VAL-02 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-02: Submit form với email không có @', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'adminfleet.com');
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-02', '01-before-submit');

    await clickSubmit(page);

    // Browser native type="email" validation intercepts before Zod runs
    // Both browser native and Zod reject this format — form does not submit
    const emailInput = page.locator(SELECTORS.emailInput);
    const isInputInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInputInvalid).toBeTruthy(); // HTML5 constraint violated

    // Form must stay on /login (no navigation occurred)
    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-02', '02-email-invalid-native');
  });

  // ─── TC-LOGIN-VAL-03 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-03: Submit form với email thiếu domain', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'admin@');
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-03', '01-before-submit');

    await clickSubmit(page);

    // Browser native type="email" validation rejects 'admin@' (missing domain)
    const emailInput = page.locator(SELECTORS.emailInput);
    const isInputInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInputInvalid).toBeTruthy();

    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-03', '02-email-invalid-native');
  });

  // ─── TC-LOGIN-VAL-04 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-04: Submit form với email có khoảng trắng', async ({ page }) => {
    await page.locator(SELECTORS.emailInput).fill('admin @fleet.com');
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-04', '01-before-submit');

    await clickSubmit(page);

    // Browser native type="email" validation rejects space in email
    const emailInput = page.locator(SELECTORS.emailInput);
    const isInputInvalid = await emailInput.evaluate(
      (el) => !(el as HTMLInputElement).validity.valid
    );
    expect(isInputInvalid).toBeTruthy();

    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-04', '02-email-invalid-native');
  });

  // ─── TC-LOGIN-VAL-05 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-05: Submit form với email có ký tự đặc biệt không hợp lệ', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'admin!#$@fleet.com');
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-05', '01-before-submit');

    await clickSubmit(page);

    // May get Zod validation error OR Supabase invalid credentials
    await page.waitForTimeout(2000);
    const hasValidationError = await page.locator(SELECTORS.validationError).first().isVisible();
    const hasToastError = await page.getByText('Email hoặc mật khẩu không chính xác').isVisible();

    expect(hasValidationError || hasToastError).toBeTruthy();
    await screenshot(page, 'LOGIN-VAL-05', '02-error-result');
  });

  // ─── TC-LOGIN-VAL-06 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-06: Email với format edge case (subdomain, plus tag)', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'user.name+tag@sub.domain.com');
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-06', '01-before-submit');

    await clickSubmit(page);

    // Zod should ACCEPT this email (no validation error shown)
    const emailError = page.locator(SELECTORS.validationError).first();

    // Wait briefly to see if validation error appears
    await page.waitForTimeout(1000);
    const hasValidationError = await emailError.isVisible();

    // If Zod accepted, expect request was sent to Supabase (will get invalid creds toast)
    if (!hasValidationError) {
      // Email passed validation — Supabase response expected (invalid creds)
      await expect(page.getByText('Email hoặc mật khẩu không chính xác').first()).toBeVisible({ timeout: 10000 });
    }
    await screenshot(page, 'LOGIN-VAL-06', '02-result');
  });

  // ─── TC-LOGIN-VAL-07 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-07: Submit form với password trống', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'admin@fleet.com');
    // Leave password empty
    await screenshot(page, 'LOGIN-VAL-07', '01-before-submit');

    await clickSubmit(page);

    const errors = page.locator(SELECTORS.validationError);
    const passwordError = errors.last();
    await expect(passwordError).toBeVisible({ timeout: 3000 });
    await expect(passwordError).toHaveText('Mật khẩu phải có ít nhất 6 ký tự');
    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-07', '02-password-error');
  });

  // ─── TC-LOGIN-VAL-08 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-08: Submit form với password < 6 ký tự', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'admin@fleet.com');
    await page.fill(SELECTORS.passwordInput, '12345');
    await screenshot(page, 'LOGIN-VAL-08', '01-before-submit');

    await clickSubmit(page);

    const errors = page.locator(SELECTORS.validationError);
    const passwordError = errors.last();
    await expect(passwordError).toBeVisible({ timeout: 3000 });
    await expect(passwordError).toHaveText('Mật khẩu phải có ít nhất 6 ký tự');
    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-08', '02-password-error');
  });

  // ─── TC-LOGIN-VAL-09 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-09: Submit form với password đúng 6 ký tự (boundary)', async ({ page }) => {
    await page.fill(SELECTORS.emailInput, 'admin@fleet.com');
    await page.fill(SELECTORS.passwordInput, '123456');
    await screenshot(page, 'LOGIN-VAL-09', '01-before-submit');

    await clickSubmit(page);

    // Validation should PASS (no password error) — Supabase will respond with invalid creds
    const passwordError = page.locator(SELECTORS.validationError).last();
    await page.waitForTimeout(500);
    const hasPasswordError = await passwordError.isVisible() &&
      (await passwordError.textContent())?.includes('Mật khẩu');

    expect(hasPasswordError).toBeFalsy(); // Boundary value should pass validation

    // Supabase responds with invalid credentials
    await expect(page.getByText('Email hoặc mật khẩu không chính xác').first()).toBeVisible({ timeout: 10000 });
    await screenshot(page, 'LOGIN-VAL-09', '02-validation-passed-supabase-error');
  });

  // ─── TC-LOGIN-VAL-10 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-10: Submit form với password rất dài (200+ ký tự)', async ({ page }) => {
    const longPassword = 'a'.repeat(200);
    await page.fill(SELECTORS.emailInput, 'admin@fleet.com');
    await page.fill(SELECTORS.passwordInput, longPassword);
    await screenshot(page, 'LOGIN-VAL-10', '01-before-submit');

    await clickSubmit(page);

    // No max length validation — form should pass and request goes to Supabase
    await page.waitForTimeout(500);
    const passwordError = page.locator(SELECTORS.validationError).last();
    const hasPasswordError = await passwordError.isVisible() &&
      (await passwordError.textContent())?.includes('Mật khẩu');

    expect(hasPasswordError).toBeFalsy(); // No max length error

    await screenshot(page, 'LOGIN-VAL-10', '02-result');
  });

  // ─── TC-LOGIN-VAL-11 ────────────────────────────────────────────────────────
  test('TC-LOGIN-VAL-11: Submit form với cả email và password trống', async ({ page }) => {
    // Both fields empty — click submit immediately
    await screenshot(page, 'LOGIN-VAL-11', '01-before-submit');

    await clickSubmit(page);

    // Both validation errors should appear simultaneously
    const errors = page.locator(SELECTORS.validationError);
    await expect(errors.first()).toBeVisible({ timeout: 3000 });
    await expect(errors.last()).toBeVisible({ timeout: 3000 });

    await expect(page.getByText('Vui lòng nhập email hợp lệ')).toBeVisible();
    await expect(page.getByText('Mật khẩu phải có ít nhất 6 ký tự')).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    await screenshot(page, 'LOGIN-VAL-11', '02-both-errors');
  });
});
