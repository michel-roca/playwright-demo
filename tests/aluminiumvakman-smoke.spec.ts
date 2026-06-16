import {
  test,
  expect,
} from '@playwright/test';

import {
  shops,
} from '../config/shops';

import {
  acceptCookiesIfVisible,
} from '../helpers/cookies';

import {
  addToCartAndOpenCart,
  assertHandlingFee,
  getCartProductRow,
  openAndCheckCheckout,
} from '../helpers/cart';

import {
  runConfigurator,
} from '../helpers/configurator';

for (const shop of shops) {
  test.describe(
    `${shop.name} smoke tests`,
    () => {
      test(
        'configurabel testproduct kan worden geconfigureerd en besteld',
        async ({ page }) => {
          const product =
            shop.testProducts.configurable;

          await test.step(
            'Productpagina openen',
            async () => {
              await page.goto(
                shop.baseUrl + product.path,
              );

              await acceptCookiesIfVisible(
                page,
              );

              await expect(
                page.locator('h1'),
              ).toContainText(
                product.pageTitle,
              );
            },
          );

          const configurator = page
            .locator(
              shop.selectors.configurator,
            )
            .first();

          await test.step(
            'Alle configuratiestappen doorlopen',
            async () => {
              await runConfigurator(
                configurator,
                product.steps,
              );
            },
          );

          await test.step(
            'Product toevoegen aan cart',
            async () => {
              const addToCartButton =
                page
                  .locator(
                    shop.selectors
                      .addToCartButton,
                  )
                  .first();

            },
          );

          const addToCartButton = page
            .locator(
              'main a.add-cart.cart-btn:visible',
            )
            .first();
            
          await expect(
            addToCartButton,
          ).toBeVisible({
            timeout: 10_000,
          });

          const cartMain =
            await test.step(
              'Product toevoegen aan winkelwagen',
              async () => {
                const addToCartButton =
                  page
                    .locator(
                      shop.selectors
                        .addToCartButton,
                    )
                    .filter({
                      hasText:
                        /in mijn winkelwagen/i,
                    })
                    .first();

                return addToCartAndOpenCart(
                  page,
                  addToCartButton,
                  product.cartTitle,
                );
              },
            );

          await test.step(
            'Product en configuratie in cart controleren',
            async () => {
              const productRow =
                getCartProductRow(
                  cartMain,
                  product.cartTitle,
                );

              await expect(
                productRow,
              ).toBeVisible();

              await expect(
                productRow,
              ).toContainText(
                product.cartTitle,
              );

              /*
               * Alle verwachte configuratiewaarden controleren:
               *
               * - lengte
               * - RAL-kleur
               * - coating
               * - zaagsnede
               */
              for (
                const step of product.steps
              ) {
                await expect(
                  productRow,
                ).toContainText(
                  step.expectedCartText,
                );
              }

              /*
               * Prijs alleen controleren wanneer deze
               * in shops.ts is ingesteld.
               */
              if (
                product.expectedUnitPrice
              ) {
                await expect(
                  productRow,
                ).toContainText(
                  product.expectedUnitPrice,
                );
              }
            },
          );

          await test.step(
            'Handelingskosten controleren',
            async () => {
              await assertHandlingFee(
                cartMain,
                product.expectHandlingFee,
                product.expectedHandlingFee,
              );
            },
          );

          await test.step(
            'Checkout openen',
            async () => {
              await openAndCheckCheckout(
                page,
                cartMain,
              );
            },
          );
        },
      );

      test(
        'standaard testproduct kan met aangepast aantal aan cart worden toegevoegd',
        async ({ page }) => {
          const product = shop.testProducts.standard;

          await test.step('Productpagina openen', async () => {
            await page.goto(shop.baseUrl + product.path);
            await acceptCookiesIfVisible(page);

            await expect(page.locator('h1')).toContainText(
              product.pageTitle,
            );
          });

          await test.step(
            'Aantal van gekozen productvariant aanpassen',
            async () => {
              const variantRow = page
                .getByRole('row', {
                  name: product.variantTitle,
                })
                .first();

              await expect(variantRow).toBeVisible();

              await expect(variantRow).toContainText(
                product.expectedUnitPrice,
              );

              const quantityInput = variantRow
                .getByRole('textbox')
                .first();

              await expect(quantityInput).toBeVisible();

              await quantityInput.fill(
                String(product.quantity),
              );

              await quantityInput.press('Tab');

              await expect(quantityInput).toHaveValue(
                String(product.quantity),
              );
            },
          );

          const addToCartButton = page
            .locator(
              'main a.add-cart.cart-btn:visible',
            )
            .first();
            
          await expect(
            addToCartButton,
          ).toBeVisible({
            timeout: 10_000,
          });

          const cartMain =
            await test.step(
              'Product toevoegen aan winkelwagen',
              async () => {
                const addToCartButton =
                  page
                    .locator(
                      shop.selectors
                        .addToCartButton,
                    )
                    .filter({
                      hasText:
                        /in mijn winkelwagen/i,
                    })
                    .first();

                return addToCartAndOpenCart(
                  page,
                  addToCartButton,
                  product.cartTitle,
                );
              },
            );

          await test.step(
            'Product en aantal in winkelwagen controleren',
            async () => {
              const productRow = getCartProductRow(
                cartMain,
                product.cartTitle,
              );

              await expect(productRow).toBeVisible();

              await expect(productRow).toContainText(
                product.cartTitle,
              );

              const cartQuantityInput = productRow
                .getByRole('textbox')
                .first();

              await expect(cartQuantityInput).toHaveValue(
                String(product.quantity),
              );

              if (product.expectedCartLinePrice) {
                await expect(productRow).toContainText(
                  product.expectedCartLinePrice,
                );
              }
            },
          );

          await test.step(
            'Handelingskosten controleren',
            async () => {
              await assertHandlingFee(
                cartMain,
                product.expectHandlingFee,
                product.expectedHandlingFee,
              );
            },
          );

          await test.step(
            'Checkout openen',
            async () => {
              await openAndCheckCheckout(
                page,
                cartMain,
              );
            },
          );
        },
      );
    },
  );
}