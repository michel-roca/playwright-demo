import {
  expect,
  Page,
} from '@playwright/test';

export async function acceptCookiesIfVisible(
  page: Page,
): Promise<void> {
  const cookieBanner = page
    .locator('.wsa-cookielaw')
    .first();

  const acceptButton = cookieBanner
    .locator(
      'a[href*="/cookielaw/optIn/"]',
    )
    .first();

  /*
   * De cookiebanner wordt soms vertraagd geladen,
   * vooral in WebKit en op GitHub Actions.
   */
  const bannerAppeared = await acceptButton
    .waitFor({
      state: 'visible',
      timeout: 5_000,
    })
    .then(() => true)
    .catch(() => false);

  if (!bannerAppeared) {
    return;
  }

  /*
   * De cookie-acceptatie kan een navigatie of
   * volledige herlaadactie veroorzaken.
   */
  await acceptButton.click({
    timeout: 10_000,
  });

  await page.waitForLoadState(
    'domcontentloaded',
  );

  await expect(
    cookieBanner,
  ).toBeHidden({
    timeout: 15_000,
  });
}