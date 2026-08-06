/**
 * MSW Browser — Configuration pour activer les mocks dans le navigateur.
 *
 * Utilisation dans les tests Playwright ou en dev:
 *   import { worker } from "./tests/mocks/browser";
 *   await worker.start({ onUnhandledRequest: "bypass" });
 */
import { setupWorker } from "msw/browser";
import { handlers } from "./handlers";

export const worker = setupWorker(...handlers);
