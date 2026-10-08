import { test, expect } from './testSetup';
import { mockService, login } from './mockService';

test('public navigation, docs and missing page', async ({ page }) => {
  await mockService(page);
  await page.goto('/');
  await expect(page).toHaveTitle('JWT Pizza');
  await page.getByRole('link', { name: 'About', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'The secret sauce' })).toBeVisible();
  await page.getByRole('link', { name: 'History', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('pizza');
  await page.getByRole('navigation', { name: 'Global' }).getByRole('link', { name: 'Franchise', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'So you want a piece of the pie?' })).toBeVisible();
  for (const path of ['/docs/service', '/docs/factory']) {
    await page.goto(path);
    await expect(page.getByRole('main')).toContainText('Order history');
    await expect(page.getByRole('main')).toContainText('Example request');
  }
  await page.goto('/missing-page');
  await expect(page.getByRole('heading', { name: 'Oops' })).toBeVisible();
});

test('login failure, successful login, session restoration and logout', async ({ page }) => {
  await mockService(page);
  await page.goto('/login');
  await page.getByPlaceholder('Email address').fill('d@jwt.com');
  await page.getByPlaceholder('Password').fill('wrong');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Invalid credentials');
  await login(page);
  await page.reload();
  await page.getByRole('link', { name: 'KC', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('Kai Chen');
  await expect(page.getByRole('link', { name: 'Buy one' })).toBeVisible();
  await page.getByRole('link', { name: 'Logout' }).click();
  await expect(page.getByRole('link', { name: 'Login', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('token'))).toBeNull();
});

test('register a diner', async ({ page }) => {
  await mockService(page);
  await page.goto('/register');
  await page.getByPlaceholder('Full name').fill('New Diner');
  await page.getByPlaceholder('Email address').fill('new@jwt.com');
  await page.getByPlaceholder('Password').fill('test-password');
  await page.getByRole('button', { name: 'Register', exact: true }).click();
  await page.getByRole('link', { name: 'ND', exact: true }).click();
  await expect(page.getByRole('main')).toContainText('new@jwt.com');
});

test('purchase with login, payment retry, verification and order history', async ({ page }) => {
  const { calls, state } = await mockService(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Order now' }).click();
  await expect(page.getByRole('button', { name: 'Checkout' })).toBeDisabled();
  await page.getByRole('combobox').selectOption('4');
  await page.getByRole('button', { name: /Veggie/ }).click();
  await page.getByRole('button', { name: /Pepperoni/ }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();
  await login(page);
  await expect(page.getByRole('main')).toContainText('Send me those 2 pizzas right now!');
  await expect(page.locator('tfoot')).toContainText('0.008 ₿');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('form')).toContainText('Selected pizzas: 2');
  await page.getByRole('button', { name: 'Checkout' }).click();
  state.paymentFails = true;
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('main')).toContainText('Payment declined');
  state.paymentFails = false;
  await page.getByRole('button', { name: 'Pay now' }).click();
  await expect(page.getByRole('heading', { name: 'Here is your JWT Pizza!' })).toBeVisible();
  expect(calls.find(c => c.method === 'POST' && c.path === '/api/order')?.body.items).toEqual([
    { menuId: '1', description: 'Veggie', price: 0.0038 },
    { menuId: '2', description: 'Pepperoni', price: 0.0042 },
  ]);
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.locator('#hs-jwt-modal')).toContainText('JWT Pizza - valid');
  await expect(page.locator('#hs-jwt-modal')).toHaveClass(/opened/);
  await expect(page.locator('#hs-jwt-modal > div')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#hs-jwt-modal')).toBeHidden();
  state.verificationFails = true;
  await page.getByRole('button', { name: 'Verify', exact: true }).click();
  await expect(page.locator('#hs-jwt-modal')).toContainText('bad pizza');
  await expect(page.locator('#hs-jwt-modal')).toHaveClass(/opened/);
  await expect(page.locator('#hs-jwt-modal > div')).toHaveCSS('opacity', '1');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('#hs-jwt-modal')).toBeHidden();
  await page.getByRole('button', { name: 'Order more' }).click();
  await expect(page).toHaveURL(/\/menu$/);
  await page.getByRole('link', { name: 'KC', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('23');
  await expect(page.locator('tbody')).toContainText('0.008 ₿');
});

test('franchise owner creates and closes a store', async ({ page }) => {
  await mockService(page);
  await page.goto('/franchise-dashboard');
  await page.getByRole('main').getByRole('link', { name: 'login', exact: true }).click();
  await login(page, 'f@jwt.com');
  await expect(page.getByRole('heading', { name: 'LotaPizza' })).toBeVisible();
  await page.getByRole('button', { name: 'Create store' }).click();
  await page.getByPlaceholder('store name').fill('Provo');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('Provo');
  await page.getByRole('row').filter({ hasText: 'Provo' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('tbody')).toContainText('Provo');
  await page.getByRole('row').filter({ hasText: 'Provo' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('tbody')).not.toContainText('Provo');
});

test('admin filters, creates and closes franchises and closes stores', async ({ page }) => {
  await mockService(page);
  await page.goto('/login');
  await login(page, 'a@jwt.com');
  await page.getByRole('link', { name: 'Admin', exact: true }).click();
  await expect(page.locator('tbody')).toContainText('LotaPizza');
  await page.getByPlaceholder('Filter franchises').fill('absent');
  await page.getByRole('button', { name: 'Submit' }).click();
  await expect(page.locator('tbody')).toHaveCount(0);
  await page.getByPlaceholder('Filter franchises').fill('');
  await page.getByRole('button', { name: 'Submit' }).click();
  await page.getByRole('row').filter({ hasText: 'Lehi' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.getByRole('main')).not.toContainText('Lehi');
  await page.getByRole('button', { name: 'Add Franchise' }).click();
  await page.getByPlaceholder('franchise name').fill('New Pizza');
  await page.getByPlaceholder('franchisee admin email').fill('f@jwt.com');
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('tbody')).toContainText(['LotaPizza', 'New Pizza']);
  await page.getByRole('row').filter({ hasText: 'New Pizza' }).getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('main')).toContainText('New Pizza');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(page.locator('tbody')).toHaveCount(1);
  await expect(page.locator('tbody')).toContainText('LotaPizza');
});
