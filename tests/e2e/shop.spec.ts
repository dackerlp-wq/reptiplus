import { expect, test } from "@playwright/test";
import cs from "../../messages/cs.json" with { type: "json" };

/**
 * Průchod obchodem bez odeslání objednávky: homepage → produkt → košík → pokladna.
 * Běží proti dev serveru nebo nasazené verzi (PLAYWRIGHT_BASE_URL).
 */
test.describe("Obchod (cs)", () => {
  test("homepage se načte a má newsletter formulář", async ({ page }) => {
    await page.goto("/cs");
    await expect(page).toHaveTitle(/Reptiplus/);
    await expect(page.getByRole("heading", { name: cs.Home.newsletterTitle })).toBeVisible();
    await expect(page.getByPlaceholder(cs.Home.newsletterPlaceholder)).toBeVisible();
  });

  test("404 stránka je přeložená", async ({ page }) => {
    const res = await page.goto("/cs/tahle-stranka-neexistuje");
    expect(res?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: cs.NotFound.title })).toBeVisible();
  });

  test("produkt → košík → pokladna", async ({ page }) => {
    await page.goto("/cs/produkty");
    const firstProduct = page.locator('a[href*="/cs/produkt/"]').first();
    await expect(firstProduct).toBeVisible();
    await firstProduct.click();
    await expect(page).toHaveURL(/\/cs\/produkt\//);

    const addBtn = page.getByRole("button", { name: cs.Product.addToCart });
    test.skip(!(await addBtn.count()), "První produkt není skladem – přeskočeno.");
    await addBtn.first().click();

    await page.goto("/cs/kosik");
    await expect(page.getByRole("heading", { name: cs.Cart.title })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(cs.Cart.checkout) })).toBeVisible();

    await page.goto("/cs/pokladna");
    await expect(page.getByRole("heading", { name: cs.Checkout.title })).toBeVisible();
    await expect(page.locator('form#checkout-form')).toBeVisible();
    await expect(page.getByPlaceholder(cs.Checkout.discountPlaceholder)).toBeVisible();
    await expect(page.getByPlaceholder(cs.Checkout.voucherPlaceholder)).toBeVisible();
    // Objednávku neodesíláme.
  });

  test("kontakt, reklamace a odstoupení mají formuláře", async ({ page }) => {
    await page.goto("/cs/kontakt");
    await expect(page.getByRole("heading", { name: cs.Contact.title })).toBeVisible();
    await page.goto("/cs/reklamace");
    await expect(page.getByRole("heading", { name: cs.Claims.claimTitle })).toBeVisible();
    await page.goto("/cs/odstoupeni-od-smlouvy");
    await expect(page.getByRole("heading", { name: cs.Claims.withdrawalTitle })).toBeVisible();
  });
});
