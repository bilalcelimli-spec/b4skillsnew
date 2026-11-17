import { test, expect } from '@playwright/test';

const A4 = { portrait: [210, 297], landscape: [297, 210] };
const mm = (px: number) => Math.round(px * 25.4 / 96);
const open = (page: any, q: string) => page.goto(`/test/e2e/fixtures/report-documents.html?${q}`);

test.beforeEach(async ({ page }) => { await page.route('https://fonts.googleapis.com/**', (route: any) => route.abort()); });

test('adult score report renders three A4 pages with indicative IELTS/TOEFL/PTE alignment', async ({ page }) => {
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message));
  await open(page, 'sample=adult&kind=report&lang=en');
  const pages = page.locator('.b4p-page');
  await expect(pages).toHaveCount(3);
  for (let i = 0; i < 3; i++) {
    const box = (await pages.nth(i).boundingBox())!;
    expect([mm(box.width), mm(box.height)]).toEqual(A4.portrait);
    expect(await pages.nth(i).evaluate((el: HTMLElement) => el.scrollHeight <= el.clientHeight + 1)).toBe(true);
  }
  const table = page.locator('.b4p-table');
  await expect(table.getByText('IELTS Academic')).toBeVisible();
  await expect(table.getByText('5.5–6.5')).toBeVisible();
  await expect(table.getByText('59–75')).toBeVisible();
  await expect(page.getByText(/not an official score/i).first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('certificate is one A4 landscape page with the verification code', async ({ page }) => {
  await open(page, 'sample=adult&kind=certificate&lang=tr');
  const cert = page.locator('#b4-certificate');
  const box = (await cert.boundingBox())!;
  expect([mm(box.width), mm(box.height)]).toEqual(A4.landscape);
  await expect(cert.getByText('Deniz Yılmaz', { exact: true })).toBeVisible();
  await expect(cert.getByText('sample-general-report', { exact: true })).toBeVisible();
  await expect(cert.getByText(/Resmî puan değildir/i).first()).toBeVisible();
  await expect(cert.locator('img.qr')).toBeVisible();
});

test('young-learner documents hide adult tests and use Cambridge wording', async ({ page }) => {
  for (const kind of ['report', 'certificate']) {
    await open(page, `sample=primary&kind=${kind}&lang=en`);
    await expect(page.getByText('A1 Movers').first()).toBeVisible();
    await expect(page.getByText('IELTS Academic')).toHaveCount(0);
    await expect(page.getByText('PTE Academic', { exact: true })).toHaveCount(0);
  }
});

test('provisional results get no certificate and no alignment', async ({ page }) => {
  await open(page, 'sample=provisional&kind=certificate&lang=en');
  await expect(page.locator('#b4-certificate')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Certificate' })).toBeDisabled();
  await expect(page.getByText('Alignments are shown only for a final result.')).toBeVisible();
});
