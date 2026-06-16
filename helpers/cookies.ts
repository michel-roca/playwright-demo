import { Page } from '@playwright/test';

export async function acceptCookiesIfVisible(
  page: Page,
) {
  const acceptButton = page
    .getByRole('link', { name: /toestaan/i })
    .or(
      page.getByRole('button', {
        name: /toestaan|accepteren|accept/i,
      }),
    );

  if (
    await acceptButton
      .first()
      .isVisible()
      .catch(() => false)
  ) {
    await acceptButton.first().click();
  }
}