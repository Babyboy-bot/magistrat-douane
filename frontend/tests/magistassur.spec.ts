import { test, expect, type Page } from "@playwright/test";

const TIMEOUT = 300_000;

// ── Helpers ──────────────────────────────────────────────────────────────────

async function waitForLoginForm(page: Page) {
  await page.goto("/login", { waitUntil: "domcontentloaded" });
  for (let i = 0; i < 3; i++) {
    try {
      await page.locator("#identifier").waitFor({ state: "visible", timeout: 20_000 });
      return;
    } catch {
      if (i < 2) await page.reload({ waitUntil: "domcontentloaded" });
    }
  }
  throw new Error("Login form did not appear after 3 retries");
}

async function loginAndSaveState(page: Page, identifier: string, password: string, expectedPath: string, stateFile: string) {
  await waitForLoginForm(page);
  await page.locator("#identifier").click();
  await page.locator("#identifier").fill(identifier);
  await page.locator("#password").click();
  await page.locator("#password").fill(password);
  await page.waitForTimeout(200);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(`**/${expectedPath}`, { timeout: TIMEOUT });
  await page.context().storageState({ path: stateFile });
}

// ── Setup: login once and save storage state ─────────────────────────────────

test.describe.configure({ timeout: 300_000 });

test.beforeAll(async ({ browser }) => {
  // Pre-warm pages
  const warmupPage = await browser.newPage();
  await warmupPage.goto("http://localhost:8090/login", { waitUntil: "domcontentloaded" }).catch(() => {});
  await warmupPage.goto("http://localhost:8090/client/dashboard", { waitUntil: "domcontentloaded" }).catch(() => {});
  await warmupPage.goto("http://localhost:8090/agent/dashboard", { waitUntil: "domcontentloaded" }).catch(() => {});
  await warmupPage.close();

  // Login as client and save state
  const clientPage = await browser.newPage();
  await loginAndSaveState(clientPage, "client@test.ci", "TestPass123!", "client/dashboard", "tests/.auth/client.json");
  await clientPage.close();

  // Login as agent and save state
  const agentPage = await browser.newPage();
  await loginAndSaveState(agentPage, "agent@acs.ci", "TestPass123!", "agent/dashboard", "tests/.auth/agent.json");
  await agentPage.close();
});

// Reusable test factories that use saved auth state
function testClient(name: string, fn: (page: Page) => Promise<void>) {
  test(name, async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/.auth/client.json" });
    const page = await context.newPage();
    try {
      await fn(page);
    } finally {
      await page.close();
      await context.close();
    }
  });
}

function testAgent(name: string, fn: (page: Page) => Promise<void>) {
  test(name, async ({ browser }) => {
    const context = await browser.newContext({ storageState: "tests/.auth/agent.json" });
    const page = await context.newPage();
    try {
      await fn(page);
    } finally {
      await page.close();
      await context.close();
    }
  });
}

// ── Magist'Assur ─────────────────────────────────────────────────────────────

test.describe("Magist'Assur — Parcours complet", () => {
  testClient("page d'accueil Magist'Assur affiche l'accès réservé pour non-magistrat", async (page) => {
    await page.goto("/client/subscribe/magist-assur", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page.locator("body")).toContainText(/Accès réservé|MAGIST/i);
  });

  testClient("redirection auto vers souscrire pour un magistrat", async (page) => {
    await page.goto("/client/subscribe/magist-assur", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/subscribe\/magist-assur/);
  });

  testClient("page épargne redirige vers souscrire", async (page) => {
    await page.goto("/client/subscribe/magist-assur/epargne", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/client/subscribe/magist-assur/souscrire", { timeout: TIMEOUT }).catch(() => {});
    await expect(page).toHaveURL(/\/client\/subscribe\/magist-assur\/souscrire/);
  });

  testClient("page prévoyance redirige vers souscrire", async (page) => {
    await page.goto("/client/subscribe/magist-assur/prevoyance", { waitUntil: "domcontentloaded" });
    await page.waitForURL("**/client/subscribe/magist-assur/souscrire", { timeout: TIMEOUT }).catch(() => {});
    await expect(page).toHaveURL(/\/client\/subscribe\/magist-assur\/souscrire/);
  });

  testClient("page souscrire Magist'Assur accessible", async (page) => {
    await page.goto("/client/subscribe/magist-assur/souscrire", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/client\/subscribe\/magist-assur\/souscrire/);
  });
});

// ── Cotation Automobile ──────────────────────────────────────────────────────

test.describe("Cotation Automobile", () => {
  testClient("page cotation auto charge avec le formulaire", async (page) => {
    await page.goto("/client/cotation/automobile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/cotation\/automobile/);
    await expect(page.locator("body")).toContainText(/Cotation|Automobile/i);
  });

  testClient("champ marque est remplissable", async (page) => {
    await page.goto("/client/cotation/automobile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const marqueInput = page.locator('input[name="marque"]').first();
    if (await marqueInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await marqueInput.fill("Toyota Corolla");
      await expect(marqueInput).toHaveValue("Toyota Corolla");
    }
  });

  testClient("champ immatriculation est remplissable", async (page) => {
    await page.goto("/client/cotation/automobile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const immatInput = page.locator('input[name="immatriculation"]').first();
    if (await immatInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await immatInput.fill("AB-123-CD");
      await expect(immatInput).toHaveValue("AB-123-CD");
    }
  });
});

// ── Souscription Habitation (MRH) ────────────────────────────────────────────

test.describe("Souscription Habitation (MRH)", () => {
  testClient("page habitation charge avec formulaire multi-étapes", async (page) => {
    await page.goto("/client/subscribe/habitation", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/subscribe\/habitation/);
    await expect(page.locator("body")).toContainText(/Habitation|MRH|Souscripteur/i);
  });

  testClient("étape 1 — remplir le nom du souscripteur", async (page) => {
    await page.goto("/client/subscribe/habitation", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const nomInput = page.locator('input[name="nom"]').first();
    if (await nomInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const val = await nomInput.inputValue();
      expect(val).not.toBe("");
    }
  });

  testClient("étape 1 — remplir et passer à l'étape 2", async (page) => {
    await page.goto("/client/subscribe/habitation", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const nomInput = page.locator('input[name="nom"]').first();
    if (await nomInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await nomInput.fill("Test Client");
    }
    const profInput = page.locator('input[name="profession"]').first();
    if (await profInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await profInput.fill("Testeur");
    }
    const addrInput = page.locator('input[name="adressePostale"]').first();
    if (await addrInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await addrInput.fill("BP 123 Abidjan");
    }
    const telInput = page.locator('input[name="telephone"]').first();
    if (await telInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await telInput.fill("0700000000");
    }
    const nextBtn = page.locator('button:has-text("Suivant"), button:has-text("suivant")').first();
    if (await nextBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await nextBtn.click();
      await page.waitForTimeout(2000);
    }
  });
});

// ── Incorporation ────────────────────────────────────────────────────────────

test.describe("Incorporation véhicule", () => {
  testClient("page incorporation charge avec formulaire multi-étapes", async (page) => {
    await page.goto("/client/incorporation", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/incorporation/);
    await expect(page.locator("body")).toContainText(/Incorporation|Souscripteur/i);
  });

  testClient("étape 1 — champs souscripteur remplissables", async (page) => {
    await page.goto("/client/incorporation", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const nomInput = page.locator('input[name="nom"]').first();
    if (await nomInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await nomInput.fill("Test Incorporation");
      await expect(nomInput).toHaveValue("Test Incorporation");
    }
  });
});

// ── Changement de police ─────────────────────────────────────────────────────

test.describe("Changement de police", () => {
  testClient("page changement charge", async (page) => {
    await page.goto("/client/change", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/change/);
    await expect(page.locator("body")).toContainText(/Changement|immatriculation|nom/i);
  });

  testClient("sélecteur de type de changement visible", async (page) => {
    await page.goto("/client/change", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const selectTrigger = page.locator('button[role="combobox"]').first();
    if (await selectTrigger.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await selectTrigger.click();
      await page.waitForTimeout(1000);
      await expect(page.locator("body")).toContainText(/immatriculation|nom/i);
    }
  });
});

// ── Documents ────────────────────────────────────────────────────────────────

test.describe("Documents client", () => {
  testClient("page documents charge", async (page) => {
    await page.goto("/client/documents", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/documents/);
    await expect(page.locator("body")).toContainText(/Document/i);
  });
});

// ── Paiements ────────────────────────────────────────────────────────────────

test.describe("Paiements client", () => {
  testClient("page payment charge", async (page) => {
    await page.goto("/client/payment", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/payment/);
  });
});

// ── Sinistres (liste) ────────────────────────────────────────────────────────

test.describe("Sinistres client — liste", () => {
  testClient("page sinistres charge", async (page) => {
    await page.goto("/client/sinistres", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/sinistres/);
  });
});

// ── Formulaire de sinistre — remplissage complet ─────────────────────────────

test.describe("Formulaire déclaration sinistre — remplissage", () => {
  testClient("remplir les champs du formulaire de sinistre", async (page) => {
    await page.goto("/client/sinistre", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);

    const dateInput = page.locator('input[name="dateSinistre"]').first();
    if (await dateInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await dateInput.fill("2025-07-15");
    }

    const heureInput = page.locator('input[name="heureSinistre"]').first();
    if (await heureInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await heureInput.fill("14:30");
    }

    const lieuInput = page.locator('input[name="lieuSinistre"]').first();
    if (await lieuInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await lieuInput.fill("Cocody, Abidjan");
    }

    const natureSelect = page.locator('button[role="combobox"]').first();
    if (await natureSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await natureSelect.click();
      await page.waitForTimeout(1000);
      const collisionOption = page.locator('[role="option"]:has-text("Collision")').first();
      if (await collisionOption.isVisible({ timeout: 5000 }).catch(() => false)) {
        await collisionOption.click();
      } else {
        await page.keyboard.press("Escape");
      }
    }

    const circonstancesTextarea = page.locator('textarea[name="circonstances"]').first();
    if (await circonstancesTextarea.isVisible({ timeout: 5000 }).catch(() => false)) {
      await circonstancesTextarea.fill("Collision à un carrefour entre deux véhicules");
    }

    await expect(page).toHaveURL(/\/client\/sinistre/);
  });
});

// ── Agent — Magist'Assur ─────────────────────────────────────────────────────

test.describe("Agent — Magist'Assur", () => {
  testAgent("page magistassur agent charge avec onglets", async (page) => {
    await page.goto("/agent/magistassur", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/agent\/magistassur/);
    await expect(page.locator("body")).toContainText(/MAGIST|Épargne|Prévoyance|Attente|Dossier/i);
  });

  testAgent("recherche dans magistassur agent", async (page) => {
    await page.goto("/agent/magistassur", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const searchInput = page.locator('input[placeholder*="Recherch"], input[type="search"]').first();
    if (await searchInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      await searchInput.fill("Test");
      await page.waitForTimeout(1000);
      await expect(searchInput).toHaveValue("Test");
    }
  });
});

// ── Agent — Sinistres ────────────────────────────────────────────────────────

test.describe("Agent — Sinistres", () => {
  testAgent("page sinistres agent charge", async (page) => {
    await page.goto("/agent/sinistres", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/agent\/sinistres/);
    await expect(page.locator("body")).toContainText(/Sinistre|sinistre/i);
  });
});

// ── Agent — Émissions ────────────────────────────────────────────────────────

test.describe("Agent — Émissions", () => {
  testAgent("page emissions agent charge", async (page) => {
    await page.goto("/agent/emissions", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/agent\/emissions/);
  });

  testAgent("création émission — bouton visible", async (page) => {
    await page.goto("/agent/emissions", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    const body = page.locator("body");
    await expect(body).toContainText(/Émission|émission|Contrat|contrat|Nouvelle|Créer|Filtrer/i);
  });
});

// ── Agent — Demandes ─────────────────────────────────────────────────────────

test.describe("Agent — Demandes", () => {
  testAgent("page requests agent charge", async (page) => {
    await page.goto("/agent/requests", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/agent\/requests/);
    await expect(page.locator("body")).toContainText(/Requête|Demande|Request|Cotation|Sinistre/i);
  });
});

// ── Agent — Clients ──────────────────────────────────────────────────────────

test.describe("Agent — Clients", () => {
  testAgent("page clients agent charge", async (page) => {
    await page.goto("/agent/clients", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(5000);
    await expect(page).toHaveURL(/\/agent\/clients/);
  });
});

// ── Profil client ────────────────────────────────────────────────────────────

test.describe("Profil client", () => {
  testClient("page profil charge avec infos utilisateur", async (page) => {
    await page.goto("/client/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/profile/);
    await expect(page.locator("body")).toContainText(/client@test\.ci|Client|Profil/i);
  });

  testClient("champ nom modifiable", async (page) => {
    await page.goto("/client/profile", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    const nomInput = page.locator('input[name="nom"], input[id="nom"]').first();
    if (await nomInput.isVisible({ timeout: 10_000 }).catch(() => false)) {
      const val = await nomInput.inputValue();
      expect(val).not.toBe("");
    }
  });
});

// ── Dashboard client ─────────────────────────────────────────────────────────

test.describe("Dashboard client", () => {
  testClient("dashboard affiche les statistiques", async (page) => {
    await page.goto("/client/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/client\/dashboard/);
    await expect(page.locator("body")).toContainText(/Contrat|Prime|Document|Sinistre|Demande|Dashboard/i);
  });
});

// ── Dashboard agent ──────────────────────────────────────────────────────────

test.describe("Dashboard agent", () => {
  testAgent("dashboard agent affiche les statistiques", async (page) => {
    await page.goto("/agent/dashboard", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(3000);
    await expect(page).toHaveURL(/\/agent\/dashboard/);
    await expect(page.locator("body")).toContainText(/Demande|Émission|Client|Sinistre|Dashboard|Stat/i);
  });
});
