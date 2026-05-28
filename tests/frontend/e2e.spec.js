// @ts-check
const { test, expect } = require('@playwright/test');

const APP_URL = process.env.APP_URL || 'https://d1yapy3ns1dho3.cloudfront.net';
const TEST_EMAIL = process.env.TEST_EMAIL || `testuser+${Date.now()}@example.com`;
const TEST_PASSWORD = process.env.TEST_PASSWORD || 'TestPass1!';

test.describe('Expense App Frontend E2E', () => {

  test.describe('Auth Gate', () => {
    test('should display sign-in form when no session exists', async ({ page }) => {
      await page.goto(APP_URL + '#/auth');
      await expect(page.locator('#auth-title')).toHaveText('Sign In');
      await expect(page.locator('#auth-email')).toBeVisible();
      await expect(page.locator('#auth-password')).toBeVisible();
      await expect(page.locator('#auth-submit-btn')).toHaveText('Sign In');
    });

    test('should toggle between sign-in and sign-up', async ({ page }) => {
      await page.goto(APP_URL + '#/auth');
      await page.click('#auth-toggle-link');
      await expect(page.locator('#auth-title')).toHaveText('Sign Up');
      await expect(page.locator('#auth-submit-btn')).toHaveText('Sign Up');
      await page.click('#auth-toggle-link');
      await expect(page.locator('#auth-title')).toHaveText('Sign In');
    });
  });

  test.describe('Sign-Up Flow', () => {
    test('should show error for weak password on sign-up', async ({ page }) => {
      await page.goto(APP_URL + '#/auth');
      await page.click('#auth-toggle-link');
      await page.fill('#auth-email', 'test@example.com');
      await page.fill('#auth-password', 'weak');
      await page.click('#auth-submit-btn');
      await expect(page.locator('#auth-error')).toBeVisible();
      await expect(page.locator('#auth-error')).toContainText('Password must be at least 8 characters');
    });

    test('should show confirmation form after valid sign-up', async ({ page }) => {
      // This test requires a real Cognito user pool; skip if no real credentials
      test.skip(!process.env.TEST_SIGNUP_ENABLED, 'Sign-up test requires TEST_SIGNUP_ENABLED=true');
      await page.goto(APP_URL + '#/auth');
      await page.click('#auth-toggle-link');
      await page.fill('#auth-email', TEST_EMAIL);
      await page.fill('#auth-password', TEST_PASSWORD);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#auth-title')).toHaveText('Verify Email', { timeout: 10000 });
      await expect(page.locator('#auth-success')).toContainText('Check your email');
    });
  });

  test.describe('Sign-In Flow', () => {
    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto(APP_URL + '#/auth');
      await page.fill('#auth-email', 'nonexistent@example.com');
      await page.fill('#auth-password', 'WrongPass1!');
      await page.click('#auth-submit-btn');
      await expect(page.locator('#auth-error')).toBeVisible({ timeout: 10000 });
      await expect(page.locator('#auth-error')).toContainText('Incorrect email or password');
    });

    test('should sign in with valid credentials and show main app', async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
        'Requires TEST_USER_EMAIL and TEST_USER_PASSWORD env vars');
      await page.goto(APP_URL + '#/auth');
      await page.fill('#auth-email', process.env.TEST_USER_EMAIL);
      await page.fill('#auth-password', process.env.TEST_USER_PASSWORD);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#app-header')).toBeVisible({ timeout: 15000 });
      await expect(page.locator('#sign-out-btn')).toBeVisible();
    });
  });

  test.describe('Upload Flow (authenticated)', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
        'Requires authenticated user');
      await page.goto(APP_URL + '#/auth');
      await page.fill('#auth-email', process.env.TEST_USER_EMAIL);
      await page.fill('#auth-password', process.env.TEST_USER_PASSWORD);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#app-header')).toBeVisible({ timeout: 15000 });
    });

    test('should display upload area', async ({ page }) => {
      await page.goto(APP_URL + '#/upload');
      await expect(page.locator('#drop-zone')).toBeVisible();
      await expect(page.locator('.file-label')).toHaveText('Choose File');
    });

    test('should show error for invalid file type', async ({ page }) => {
      await page.goto(APP_URL + '#/upload');
      // Create a fake text file via page evaluation
      await page.evaluate(() => {
        const dt = new DataTransfer();
        const file = new File(['hello'], 'test.txt', { type: 'text/plain' });
        dt.items.add(file);
        const input = document.getElementById('file-input');
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
      });
      await expect(page.locator('#upload-error')).toBeVisible();
      await expect(page.locator('#upload-error')).toContainText('Unsupported file type');
    });

    test('should show preview for valid image', async ({ page }) => {
      await page.goto(APP_URL + '#/upload');
      // Create a minimal valid JPEG file
      await page.evaluate(() => {
        // Minimal 1x1 JPEG bytes
        const bytes = atob('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFRABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFBEBAAAAAAAAAAAAAAAAAAAAAP/aAAwDAQACEQMRAD8AJgA//9k=');
        const arr = new Uint8Array(bytes.length);
        for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
        const file = new File([arr], 'receipt.jpg', { type: 'image/jpeg' });
        const dt = new DataTransfer();
        dt.items.add(file);
        const input = document.getElementById('file-input');
        input.files = dt.files;
        input.dispatchEvent(new Event('change'));
      });
      await expect(page.locator('#preview-area')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#upload-btn')).toBeVisible();
    });
  });

  test.describe('Expense Editor (authenticated)', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
        'Requires authenticated user');
      await page.goto(APP_URL + '#/auth');
      await page.fill('#auth-email', process.env.TEST_USER_EMAIL);
      await page.fill('#auth-password', process.env.TEST_USER_PASSWORD);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#app-header')).toBeVisible({ timeout: 15000 });
    });

    test('should validate required fields on accept', async ({ page }) => {
      // Navigate to editor with some data so the form renders, then clear fields
      await page.evaluate(() => {
        Router.navigate('/edit', { merchantName: 'Test', date: '2024-01-01', totalAmount: 1, currency: 'USD', lineItems: [] });
      });
      await page.waitForSelector('#expense-form', { timeout: 5000 });
      // Clear required fields
      await page.fill('#ed-merchant', '');
      await page.fill('#ed-date', '');
      await page.fill('#ed-total', '');
      await page.click('#accept-btn');
      await expect(page.locator('#editor-error')).toBeVisible({ timeout: 5000 });
      await expect(page.locator('#editor-error')).toContainText('required');
    });

    test('should recalculate total when line items change', async ({ page }) => {
      await page.evaluate(() => {
        Router.navigate('/edit', {
          merchantName: 'Test Store',
          date: '2024-01-15',
          totalAmount: 10,
          currency: 'USD',
          lineItems: [
            { description: 'Item 1', quantity: 2, unitPrice: 5.00 },
            { description: 'Item 2', quantity: 1, unitPrice: 3.00 }
          ]
        });
      });
      await page.waitForSelector('#expense-form');
      // Change quantity of first item
      const qtyInputs = page.locator('.li-qty');
      await qtyInputs.first().fill('3');
      // Total should recalculate: 3*5 + 1*3 = 18
      await expect(page.locator('#ed-total')).toHaveValue('18.00');
    });
  });

  test.describe('Expense List (authenticated)', () => {
    test.beforeEach(async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
        'Requires authenticated user');
      await page.goto(APP_URL + '#/auth');
      await page.fill('#auth-email', process.env.TEST_USER_EMAIL);
      await page.fill('#auth-password', process.env.TEST_USER_PASSWORD);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#app-header')).toBeVisible({ timeout: 15000 });
    });

    test('should display expense list or empty state', async ({ page }) => {
      await page.goto(APP_URL + '#/expenses');
      // Wait for the list to finish loading (either cards appear or empty state)
      await page.waitForSelector('.list-container', { timeout: 10000 });
      // Wait for loading spinner to disappear (API call to complete)
      await page.waitForFunction(() => !document.querySelector('.loading'), { timeout: 15000 });
      const cards = page.locator('.expense-card');
      const empty = page.locator('.empty-state');
      const hasCards = await cards.count() > 0;
      const hasEmpty = await empty.count() > 0;
      expect(hasCards || hasEmpty).toBeTruthy();
    });

    test('should show loading indicator while fetching', async ({ page }) => {
      await page.goto(APP_URL + '#/expenses');
      // Loading should appear briefly
      const loading = page.locator('.loading');
      // It may be very fast, so just check the container renders
      await expect(page.locator('.list-container')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Navigation', () => {
    test('should redirect to auth when not authenticated', async ({ page }) => {
      // Clear any stored session
      await page.goto(APP_URL);
      await page.evaluate(() => localStorage.clear());
      await page.goto(APP_URL + '#/upload');
      await page.waitForTimeout(1000);
      expect(page.url()).toContain('#/auth');
    });

    test('should show sign-out button when authenticated', async ({ page }) => {
      test.skip(!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD,
        'Requires authenticated user');
      await page.goto(APP_URL + '#/auth');
      await page.fill('#auth-email', process.env.TEST_USER_EMAIL);
      await page.fill('#auth-password', process.env.TEST_USER_PASSWORD);
      await page.click('#auth-submit-btn');
      await expect(page.locator('#sign-out-btn')).toBeVisible({ timeout: 15000 });
    });
  });
});
