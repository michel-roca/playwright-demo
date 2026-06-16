import { test, expect } from '@playwright/test';

test('test', async ({ page }) => {
  await page.goto('https://www.aluminiumvakman.nl/aluminium-koker-15x15x2-mm-vierkant.html');
  await page.getByRole('link', { name: 'Toestaan' }).click();
  await page.getByRole('textbox', { name: 'Lengte' }).click();
  await page.getByRole('textbox', { name: 'Lengte' }).fill('1000');
  await page.getByRole('link', { name: 'Volgende stap ' }).click();
  await page.getByRole('link', { name: 'Stappen afronden ' }).click();
  await page.getByRole('link', { name: 'In mijn winkelwagen In mijn' }).click();
  await page.getByRole('link', { name: 'Verder naar bestellen' }).click();
});