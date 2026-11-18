import {defineConfig} from "cypress";
import {rmSync} from "node:fs";

// Los tests corren contra el dev server en modo e2e (`npm run dev:e2e`): sin Auth0 y con /api stubbeado en cada test.
// Otra URL se pasa con CYPRESS_BASE_URL.
export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    viewportWidth: 1440,
    viewportHeight: 900,
    setupNodeEvents(on, config) {
      on("task", {
        // Dos descargas del mismo archivo no se pisan: el navegador renombra la segunda. Se borran antes de cada una.
        clearDownloads() {
          rmSync(config.downloadsFolder, {recursive: true, force: true});
          return null;
        },
      });
    },
  },
});
