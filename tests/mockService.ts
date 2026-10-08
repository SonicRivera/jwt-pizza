import type { Page } from '@playwright/test';
import { expect } from './testSetup';

export async function mockService(page: Page) {
  const users = [
    { id: '3', name: 'Kai Chen', email: 'd@jwt.com', roles: [{ role: 'diner' }] },
    { id: '1', name: 'Mama Ricci', email: 'a@jwt.com', roles: [{ role: 'admin' }] },
    { id: '2', name: 'Fran Owner', email: 'f@jwt.com', roles: [{ role: 'franchisee', objectId: '1' }] },
  ];
  let user: typeof users[number] | null = null;
  const franchises = [{ id: '1', name: 'LotaPizza', admins: [{ email: 'f@jwt.com', name: 'Fran Owner' }], stores: [{ id: '4', name: 'Lehi', totalRevenue: 12 }] }];
  const orders: any[] = [];
  const calls: { method: string; path: string; body: any }[] = [];
  const state = { paymentFails: false, verificationFails: false };
  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    const body = request.postData() ? request.postDataJSON() : null;
    calls.push({ method, path, body });
    const send = (json: any, status = 200) => route.fulfill({ json, status });
    if (path === '/api/auth') {
      if (method === 'DELETE') { user = null; return send({}); }
      if (method === 'PUT') {
        expect(Object.keys(body).sort()).toEqual(['email', 'password']);
        user = users.find(u => u.email === body.email) || null;
        if (!user || body.password !== 'test-password') return send({ message: 'Invalid credentials' }, 401);
      } else if (method === 'POST') {
        expect(body).toEqual({ name: 'New Diner', email: 'new@jwt.com', password: 'test-password' });
        user = { ...users[0], name: body.name, email: body.email };
      } else throw new Error(`Unexpected method ${method}`);
      return send({ user, token: 'mock-token' });
    }
    if (path === '/api/user/me' && method === 'GET') return send(user || { message: 'Expired session' }, user ? 200 : 401);
    if (path === '/api/order/menu' && method === 'GET') return send([
      { id: '1', title: 'Veggie', image: 'pizza1.png', price: 0.0038, description: 'A garden of delight' },
      { id: '2', title: 'Pepperoni', image: 'pizza2.png', price: 0.0042, description: 'Spicy treat' },
    ]);
    if (path === '/api/order' && method === 'GET') return send({ orders });
    if (path === '/api/order' && method === 'POST') {
      expect(request.headers().authorization).toBe('Bearer mock-token');
      expect(body).toMatchObject({ franchiseId: '1', storeId: '4' });
      if (state.paymentFails) return send({ message: 'Payment declined' }, 400);
      const order = { ...body, id: '23', date: '2026-10-08' };
      orders.push(order);
      return send({ order, jwt: 'mock-pizza-jwt' });
    }
    if (path === '/api/order/verify' && method === 'POST') {
      expect(body).toEqual({ jwt: 'mock-pizza-jwt' });
      return state.verificationFails ? send({ message: 'invalid' }, 400) : send({ message: 'valid', payload: { orderId: '23' } });
    }
    if (path === '/api/franchise' && method === 'GET') {
      const filter = (url.searchParams.get('name') || '*').replaceAll('*', '').toLowerCase();
      return send({ franchises: franchises.filter(f => f.name.toLowerCase().includes(filter)), more: false });
    }
    if (path === '/api/franchise' && method === 'POST') {
      expect(body).toMatchObject({ name: 'New Pizza', admins: [{ email: 'f@jwt.com' }] });
      const franchise = { ...body, id: '2', stores: [] };
      franchises.push(franchise);
      return send(franchise);
    }
    if (/^\/api\/franchise\/\w+$/.test(path)) {
      if (method === 'GET') return send(user?.id === '2' ? franchises : []);
      if (method === 'DELETE') { franchises.splice(franchises.findIndex(f => f.id === path.split('/').pop()), 1); return send({}); }
    }
    if (path === '/api/franchise/1/store' && method === 'POST') {
      expect(body).toEqual({ id: '', name: 'Provo' });
      const store = { ...body, id: '5', totalRevenue: 0 };
      franchises[0].stores.push(store);
      return send(store);
    }
    if (/^\/api\/franchise\/1\/store\/\w+$/.test(path) && method === 'DELETE') {
      const stores = franchises[0].stores;
      stores.splice(stores.findIndex(s => s.id === path.split('/').pop()), 1);
      return send({});
    }
    if (path === '/api/docs' && method === 'GET') return send({ endpoints: [{ requiresAuth: true, method: 'GET', path: '/api/order', description: 'Order history', example: 'GET /api/order', response: { orders: [] } }] });
    throw new Error(`Unmocked endpoint: ${method} ${path}`);
  });
  return { calls, state };
}

export async function login(page: Page, email = 'd@jwt.com') {
  await page.getByPlaceholder('Email address').fill(email);
  await page.getByPlaceholder('Password').fill('test-password');
  await page.getByRole('button', { name: 'Login', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Logout', exact: true })).toBeVisible();
}
