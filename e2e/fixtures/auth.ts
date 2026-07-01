import { Page, expect } from '@playwright/test';

export const TEST_USER = {
  email: 'bao.pham@fleetgo.vn',
  password: 'devpassword123',
};

export const WRONG_PASSWORD_USER = {
  email: 'bao.pham@fleetgo.vn',
  password: 'WrongPass1',
};

export const NON_EXISTENT_USER = {
  email: 'notexist@fleet.com',
  password: 'Test1234',
};

// Selectors (FormFieldWrapper không có htmlFor nên dùng name attribute từ react-hook-form)
export const SELECTORS = {
  emailInput: 'input[name="email"]',
  passwordInput: 'input[name="password"]',
  submitButton: 'button[type="submit"]',
  passwordToggle: 'button[type="button"]',
  toastTitle: '[data-testid="toast-title"], [role="status"] h2, .sonner-toast h2, [data-title]',
  validationError: 'p.text-destructive, p.text-sm.text-destructive',
};

export async function loginAs(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.waitForSelector(SELECTORS.emailInput, { state: 'visible' });
  await page.fill(SELECTORS.emailInput, email);
  await page.fill(SELECTORS.passwordInput, password);
  await page.click(SELECTORS.submitButton);
  await expect(page).toHaveURL('/dashboard', { timeout: 15000 });
}

export async function screenshot(page: Page, tcId: string, suffix: string = '') {
  // tcId format: "LOGIN-FUNC-01", "DASHBOARD-VAL-02", etc.
  // Derives: feature=LOGIN → folder TC_LOGIN, group=FUNC → subfolder FUNC
  const parts = tcId.split('-');           // ['LOGIN', 'FUNC', '01']
  const feature = parts[0];               // LOGIN
  const group = parts[1];                 // FUNC
  const featureFolder = `TC_${feature}`; // TC_LOGIN
  const filename = suffix
    ? `TC-${tcId}-${suffix}.png`
    : `TC-${tcId}.png`;
  await page.screenshot({
    path: `e2e/screenshots/${featureFolder}/${group}/${filename}`,
    fullPage: true,
  });
}
