import { test, expect } from '@playwright/test';

test('home page loads and shows API Hub branding', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toBeVisible();
  // Navbar brand is always present
  await expect(page.locator('.navbar-brand')).toContainText('API Hub');
});
