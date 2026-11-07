import { test, expect, type Browser, type Page } from '@playwright/test';

/**
 * Run with PLAYWRIGHT_BASE_URL=http://127.0.0.1:5173 and an already-running API.
 * Optional E2E_EMAIL / E2E_PASSWORD test an EXISTING throwaway account.
 * Does not create, edit, or delete production game data.
 */
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
const isolatedQa = process.env.E2E_ISOLATED_QA === 'YES_READ_ONLY_QA';
const hasQaA = Boolean(isolatedQa && process.env.E2E_EMAIL && process.env.E2E_PASSWORD);
const hasQaB = Boolean(hasQaA && process.env.E2E_EMAIL_B && process.env.E2E_PASSWORD_B);
async function qaLogin(page: Page, email: string, password: string) {
  await page.goto(baseURL);
  await page.getByPlaceholder('ceo@example.com').fill(email);
  await page.getByPlaceholder('Tối thiểu 6 ký tự').fill(password);
  await page.getByRole('button', {name:/Vào trụ sở CEO/}).click();
  await expect(page.getByText(/Xin chào, CEO/)).toBeVisible({timeout:30_000});
}

test('loads MEDIA TECH VUX login shell without JS errors', async ({page}) => {
  const runtimeErrors: string[] = [];
  page.on('pageerror',error=>runtimeErrors.push(error.message));
  await page.goto(baseURL);
  await expect(page.getByText('MEDIA TECH VUX').first()).toBeVisible({timeout:20_000});
  await expect(page.getByRole('button',{name:/Đăng nhập/})).toBeVisible();
  expect(runtimeErrors).toEqual([]);
});

test('existing CEO account can open dashboard and Academy', async ({page}) => {
  test.skip(!hasQaA, 'Set E2E_ISOLATED_QA=YES_READ_ONLY_QA and disposable QA credentials');
  await qaLogin(page, process.env.E2E_EMAIL!, process.env.E2E_PASSWORD!);
  await page.getByRole('button',{name:/Học viện CEO/}).first().click();
  await expect(page.getByText(/Học viện CEO/).first()).toBeVisible();
});


test('QA CEO retains funds and level on reload (read-only)', async ({page}) => {
  test.skip(!hasQaA, 'Requires existing disposable QA CEO account, never production');
  await qaLogin(page, process.env.E2E_EMAIL!, process.env.E2E_PASSWORD!);
  const funds = page.locator('.header-balance');
  const level = page.locator('.level-pill');
  const beforeFunds = await funds.innerText();
  const beforeLevel = await level.innerText();
  expect(beforeFunds.length).toBeGreaterThan(0);
  await page.reload();
  await expect(page.getByText(/Xin chào, CEO/)).toBeVisible({timeout:30_000});
  await expect(funds).toHaveText(beforeFunds);
  await expect(level).toHaveText(beforeLevel);
});

test('QA CEO can switch display currency without changing underlying company balance', async ({page}) => {
  test.skip(!hasQaA, 'Requires existing disposable QA CEO account, never production');
  await qaLogin(page, process.env.E2E_EMAIL!, process.env.E2E_PASSWORD!);
  const selector = page.getByLabel('Đơn vị tiền hiển thị');
  const displayed = page.locator('.header-balance');
  await selector.selectOption('VND');
  const vndDisplay = await displayed.innerText();
  await selector.selectOption('USD');
  const usdDisplay = await displayed.innerText();
  expect(usdDisplay).not.toEqual(vndDisplay);
  await selector.selectOption('VND');
  await expect(displayed).toHaveText(vndDisplay);
});

test("two disposable QA CEO accounts cannot see each other's company", async ({browser}: {browser:Browser}) => {
  test.skip(!hasQaB, 'Requires two separate disposable QA accounts, each with an existing distinct company');
  const contextA = await browser.newContext();
  const contextB = await browser.newContext();
  try {
    const pageA=await contextA.newPage();
    const pageB=await contextB.newPage();
    await qaLogin(pageA,process.env.E2E_EMAIL!,process.env.E2E_PASSWORD!);
    await qaLogin(pageB,process.env.E2E_EMAIL_B!,process.env.E2E_PASSWORD_B!);
    const companyA=(await pageA.locator('.page-title strong').first().innerText());
    const companyB=(await pageB.locator('.page-title strong').first().innerText());
    expect(companyA).not.toEqual(companyB);
  } finally {
    await contextA.close();
    await contextB.close();
  }
});

// v27: safety regression checks, enabled only for disposable QA accounts.
test('initial company-state failure shows a visible retry action instead of endless spinner', async ({page}) => {
  test.skip(!hasQaA, 'Requires disposable QA account; never run against production.');
  await page.route('**/api/state', async route => {
    await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'Dịch vụ QA đang bảo trì'})});
  });
  await page.goto(baseURL);
  await page.getByPlaceholder('ceo@example.com').fill(process.env.E2E_EMAIL!);
  await page.getByPlaceholder('Tối thiểu 6 ký tự').fill(process.env.E2E_PASSWORD!);
  await page.getByRole('button',{name:/Vào trụ sở CEO/}).click();
  await expect(page.getByRole('button',{name:'Thử lại'})).toBeVisible({timeout:30_000});
  await expect(page.getByText('Dịch vụ QA đang bảo trì')).toBeVisible();
});

test('switching between two QA CEOs never shows prior company after second login', async ({page}) => {
  test.skip(!hasQaB, 'Requires two throwaway QA accounts with different company names.');
  await qaLogin(page, process.env.E2E_EMAIL!, process.env.E2E_PASSWORD!);
  const companyA=await page.locator('.page-title strong').first().innerText();
  await page.getByRole('button',{name:'Đăng xuất'}).click();
  await expect(page.getByPlaceholder('ceo@example.com')).toBeVisible({timeout:20_000});
  await qaLogin(page, process.env.E2E_EMAIL_B!, process.env.E2E_PASSWORD_B!);
  const companyB=await page.locator('.page-title strong').first().innerText();
  expect(companyB).not.toEqual(companyA);
  await page.reload();
  await expect(page.getByText(/Xin chào, CEO/)).toBeVisible({timeout:30_000});
  await expect(page.locator('.page-title strong').first()).toHaveText(companyB);
});
