import {
  expect,
  Locator,
  Page,
} from '@playwright/test';

/*
 * Voert een DOM-click uit.
 *
 * Dit wordt alleen gebruikt voor knoppen die door sticky elementen
 * of configuratorlagen worden onderschept.
 */
export async function clickElementWithDom(
  locator: Locator,
): Promise<void> {
  await expect(locator).toBeVisible();

  await locator.evaluate((element) => {
    (element as HTMLElement).click();
  });
}

/*
 * Controleert de bevestigingsmodal en opent vervolgens de cart.
 */
export async function openCartFromConfirmation(
  page: Page,
): Promise<void> {
  const confirmationMessage = page
    .getByText(
      /dit product is toegevoegd aan de winkelwagen/i,
    )
    .first();

  await expect(
    confirmationMessage,
  ).toBeVisible({
    timeout: 30_000,
  });

  const continueToCartButton = page
    .locator(
      'a:visible, button:visible',
    )
    .filter({
      hasText:
        /^(naar|bekijk) (de )?winkelwagen$/i,
    })
    .first();

  await expect(
    continueToCartButton,
  ).toBeVisible({
    timeout: 15_000,
  });

  await Promise.all([
    page.waitForURL(
      /\/cart\/?$/i,
      {
        timeout: 20_000,
      },
    ),

    continueToCartButton.click(),
  ]);

  await expect(
    page,
  ).toHaveURL(
    /\/cart\/?$/i,
  );
}

/*
 * Zoekt de productrij in de cart.
 */
export function getCartProductRow(
  cartMain: Locator,
  productTitle: RegExp,
): Locator {
  return cartMain
    .getByRole('row', {
      name: productTitle,
    })
    .first();
}

/*
 * Controleert of handelingskosten wel of niet aanwezig zijn.
 */
export async function assertHandlingFee(
  cartMain: Locator,
  expected: boolean,
  expectedPrice?: RegExp,
): Promise<void> {
  const handlingFeeRow = cartMain
    .getByRole('row', {
      name: /handelingskosten/i,
    })
    .first();

  if (expected) {
    await expect(handlingFeeRow).toBeVisible();

    await expect(handlingFeeRow).toContainText(
      /handelingskosten/i,
    );

    if (expectedPrice) {
      await expect(handlingFeeRow).toContainText(
        expectedPrice,
      );
    }

    return;
  }

  /*
   * Bij een orderwaarde boven de ingestelde drempel mag
   * geen regel voor handelingskosten aanwezig zijn.
   */
  await expect(handlingFeeRow).toHaveCount(0);
}

/*
 * Opent de checkout en controleert of de belangrijkste
 * checkoutonderdelen geladen zijn.
 */
export async function openAndCheckCheckout(
  page: Page,
  cartMain: Locator,
): Promise<void> {
  const checkoutButton = cartMain.getByRole('link', {
    name: /verder naar bestellen/i,
  });

  await expect(checkoutButton).toBeVisible();

  await Promise.all([
    page.waitForURL(/\/checkout\//i, {
      waitUntil: 'domcontentloaded',
    }),

    checkoutButton.click(),
  ]);

  await expect(page).toHaveURL(/\/checkout\//i);

  const checkoutMain = page.locator('main');

  await expect(
    checkoutMain.getByRole('heading', {
      name: /^bestellen$/i,
    }),
  ).toBeVisible();

  await expect(checkoutMain).toContainText(
    /factuuradres/i,
  );

  await expect(checkoutMain).toContainText(
    /verzendmethode/i,
  );

  await expect(checkoutMain).toContainText(
    /betaalmethoden/i,
  );
}

/*
 * Maakt tekst geschikt voor gebruik in een RegExp.
 */
export function escapeRegExp(value: string): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}