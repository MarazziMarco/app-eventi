import { execSync } from "node:child_process";
import { existsSync, renameSync } from "node:fs";
import { join } from "node:path";

// Eseguito con cwd = apps/web. Next 15 non esporta (output:'export') se c'e' una
// route handler dinamica: spostiamo app/api da parte durante l'export e la
// ripristiniamo sempre (finally). L'app usa l'API remota, non quella nel bundle.
const root = process.cwd();
const apiDir = join(root, "app", "api");
const stash = join(root, ".api-stash");

let moved = false;
if (existsSync(apiDir)) {
  renameSync(apiDir, stash);
  moved = true;
}
try {
  execSync("next build", { stdio: "inherit", env: { ...process.env, CAPACITOR_BUILD: "1" } });
} finally {
  if (moved) renameSync(stash, apiDir);
}
