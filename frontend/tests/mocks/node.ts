/**
 * MSW Node — Configuration pour activer les mocks dans Node.js (tests unitaires JS).
 *
 * Utilisation:
 *   import { server } from "./tests/mocks/node";
 *   server.listen();
 */
import { setupServer } from "msw/node";
import { handlers } from "./handlers";

export const server = setupServer(...handlers);
