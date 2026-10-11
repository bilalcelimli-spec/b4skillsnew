import { expect, test } from '@playwright/test';
for (const width of [320, 1280]) {
  for (const state of ['unmeasured', 'pending', 'complete'] as const) {
    test(`${state} adaptive report at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      page.on('pageerror', error => errors.push(error.message));
      const measured = state !== 'unmeasured', complete = state === 'complete';
      await page.route('**/api/**', async route => {
        if (route.request().url().endsWith('/scoring-status')) return route.fulfill({
          contentType: 'text/event-stream', body: 'event: status\ndata: {"responseId":"writing","status":"pending"}\n\n',
        });
        return route.fulfill({ json: { sessionId: 'report-test', candidateName: 'Deniz Çelik',
          completedAt: '2026-10-11T08:00:00Z', finalTheta: 0, finalSem: .4, cefrLevel: 'B1',
          totalItems: 30, stopReason: 'ALL_SECTIONS_COMPLETE', responses: [],
          skillScores: measured ? [{ skill: 'READING', theta: 0, sem: .4, cefrLevel: 'B1', ciLo: 'A2', ciHi: 'B2' }] : [],
          scoringComplete: complete, reportStatus: complete ? 'Completed' : 'Provisional',
          hasScoredEvidence: measured, hasPendingAI: state === 'pending' } });
      });
      await page.goto('/test/e2e/fixtures/adaptive-report.html');
      await expect(page.getByTestId('score-report')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Can-Do', exact: true })).toBeEnabled({ enabled: complete });
      if (!measured) {
        await expect(page.getByText('Result unavailable', { exact: true })).toBeVisible();
        await expect(page.getByText('500', { exact: true })).toHaveCount(0);
      } else if (!complete) await expect(page.getByText('Provisional · B1', { exact: true })).toBeVisible();
      if (state === 'pending') await expect(page.getByText('Responses are being evaluated.', { exact: true })).toBeVisible();
      if (complete) await expect(page.getByText('This report is not final.', { exact: true })).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      expect(errors).toEqual([]);
      if (width === 320 && state === 'pending') await page.screenshot({ path: '/tmp/b4skills-adaptive-report-mobile.png', fullPage: true });
    });
  }
}
