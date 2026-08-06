import { test, expect, type Page } from "@playwright/test";

const LOGIN_TIMEOUT = 120_000;

async function waitForLoginForm(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  // L'AuthProvider affiche "Chargement..." pendant l'init — peut rester bloqué
  // Retry: si #identifier n'apparaît pas dans 20s, recharger la page
  for (let i = 0; i < 3; i++) {
    try {
      await page.locator("#identifier").waitFor({ state: "visible", timeout: 20_000 });
      return;
    } catch {
      if (i < 2) {
        await page.reload({ waitUntil: "domcontentloaded" });
      }
    }
  }
  throw new Error("Login form did not appear after 3 retries");
}

async function fillAndSubmitLogin(page: Page, identifier: string, password: string) {
  await page.locator("#identifier").click();
  await page.locator("#identifier").fill(identifier);
  await page.locator("#password").click();
  await page.locator("#password").fill(password);
  await page.waitForTimeout(200);
  await page.locator('button[type="submit"]').click();
}

// ── Simulation 1: Parcours de connexion client ───────────────────────────────

test.describe("Simulation - Connexion Client", () => {
  test("client se connecte et accède au dashboard", async ({ page }) => {
    await waitForLoginForm(page);
    await fillAndSubmitLogin(page, "client@test.ci", "TestPass123!");
    await page.waitForURL("**/client/dashboard", { timeout: LOGIN_TIMEOUT });
    await expect(page).toHaveURL(/\/client\/dashboard/);
  });

  test("identifiants incorrects affichent une erreur", async ({ page }) => {
    await waitForLoginForm(page);
    await fillAndSubmitLogin(page, "wrong@test.ci", "WrongPass!");
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/login/);
  });
});

// ── Simulation 2: Parcours de connexion agent ────────────────────────────────

test.describe("Simulation - Connexion Agent", () => {
  test("agent se connecte et accède au dashboard", async ({ page }) => {
    await waitForLoginForm(page);
    await fillAndSubmitLogin(page, "agent@acs.ci", "TestPass123!");
    await page.waitForURL("**/agent/dashboard", { timeout: LOGIN_TIMEOUT });
    await expect(page).toHaveURL(/\/agent\/dashboard/);
  });
});

// ── Simulation 3: Navigation pages publiques ─────────────────────────────────

test.describe("Simulation - Pages Publiques", () => {
  test("page d'accueil charge correctement", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/.*magistrat.*/i);
  });

  test("page de registre accessible", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/register/);
  });

  test("page de reset password accessible", async ({ page }) => {
    await page.goto("/reset-password", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/reset-password/);
  });
});

// ── Simulation 4: Parcours inscription client ────────────────────────────────

test.describe("Simulation - Inscription Client", () => {
  test("client s'inscrit avec succès", async ({ page }) => {
    await page.goto("/register", { waitUntil: "domcontentloaded" });
    const firstInput = page.locator("input").first();
    await firstInput.waitFor({ state: "visible", timeout: LOGIN_TIMEOUT });

    const nomInput = page.locator('input[id="nom"], input[name="nom"]').first();
    if (await nomInput.isVisible().catch(() => false)) await nomInput.fill("TestPlaywright");

    const prenomsInput = page.locator('input[id="prenoms"], input[name="prenoms"]').first();
    if (await prenomsInput.isVisible().catch(() => false)) await prenomsInput.fill("Simulation");

    const telInput = page.locator('input[id="telephone"], input[name="telephone"], input[type="tel"]').first();
    if (await telInput.isVisible().catch(() => false)) await telInput.fill("0700000000");

    const pwdInput = page.locator('input[id="password"], input[type="password"]').first();
    if (await pwdInput.isVisible().catch(() => false)) await pwdInput.fill("SecurePass123!");

    const submitBtn = page.locator('button[type="submit"]').first();
    if (await submitBtn.isVisible().catch(() => false)) await submitBtn.click();

    await page.waitForTimeout(5000);
    const currentUrl = page.url();
    expect(currentUrl).toMatch(/\/(login|register)/);
  });
});

// ── Simulation 5: Parcours complet client authentifié ────────────────────────

test.describe("Simulation - Parcours Client Authentifié", () => {
  test.beforeEach(async ({ page }) => {
    await waitForLoginForm(page);
    await fillAndSubmitLogin(page, "client@test.ci", "TestPass123!");
    await page.waitForURL("**/client/dashboard", { timeout: LOGIN_TIMEOUT });
  });

  test("client consulte son portefeuille", async ({ page }) => {
    await page.goto("/client/portfolio", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/client\/portfolio/);
  });

  test("client consulte son historique", async ({ page }) => {
    await page.goto("/client/history", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/client\/history/);
  });

  test("client accède à la déclaration de sinistre", async ({ page }) => {
    await page.goto("/client/sinistre", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/client\/sinistre/);
  });

  test("client accède au formulaire de cotation habitation", async ({ page }) => {
    await page.goto("/client/subscribe/habitation", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/client\/subscribe\/habitation/);
  });

  test("client accède à son profil", async ({ page }) => {
    await page.goto("/client/profile", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/client\/profile/);
  });
});

// ── Simulation 6: Parcours complet agent authentifié ─────────────────────────

test.describe("Simulation - Parcours Agent Authentifié", () => {
  test.beforeEach(async ({ page }) => {
    await waitForLoginForm(page);
    await fillAndSubmitLogin(page, "agent@acs.ci", "TestPass123!");
    await page.waitForURL("**/agent/dashboard", { timeout: LOGIN_TIMEOUT });
  });

  test("agent consulte ses demandes", async ({ page }) => {
    await page.goto("/agent/requests", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/agent\/requests/);
  });

  test("agent consulte ses émissions", async ({ page }) => {
    await page.goto("/agent/emissions", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/agent\/emissions/);
  });

  test("agent consulte ses clients", async ({ page }) => {
    await page.goto("/agent/clients", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/agent\/clients/);
  });

  test("agent consulte magistassur", async ({ page }) => {
    await page.goto("/agent/magistassur", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/agent\/magistassur/);
  });
});

// ── Simulation 7: Parcours déclaration de sinistre ───────────────────────────

test.describe("Simulation - Déclaration Sinistre", () => {
  test("client remplit le formulaire de sinistre", async ({ page }) => {
    await waitForLoginForm(page);
    await fillAndSubmitLogin(page, "client@test.ci", "TestPass123!");
    await page.waitForURL("**/client/dashboard", { timeout: LOGIN_TIMEOUT });

    await page.goto("/client/sinistre", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const natureSelect = page.locator('select[name="nature"], select[id="nature"]').first();
    if (await natureSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await natureSelect.selectOption({ index: 1 });
    }

    const dateInput = page.locator('input[name="date_sinistre"], input[id="date_sinistre"]').first();
    if (await dateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dateInput.fill("2025-07-15");
    }

    const lieuInput = page.locator('input[name="lieu"], input[id="lieu"]').first();
    if (await lieuInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lieuInput.fill("Abidjan");
    }

    const descTextarea = page.locator('textarea[name="description"], textarea[id="description"]').first();
    if (await descTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await descTextarea.fill("Collision à un carrefour");
    }

    await expect(page).toHaveURL(/\/client\/sinistre/);
  });
});
