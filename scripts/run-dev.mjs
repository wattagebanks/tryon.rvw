import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { getBgRemoveDevPort } from "./bg-remove-dev-port.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const port = await getBgRemoveDevPort();
console.log(`[dev] BG Remove Worker → http://127.0.0.1:${port} (Vite proxies /api here)`);

const env = {
  ...process.env,
  VITE_BG_REMOVE_PROXY_TARGET: `http://127.0.0.1:${port}`,
};

const child = spawn(
  "npx",
  [
    "concurrently",
    "-k",
    "-n",
    "vite,bg",
    "-c",
    "cyan,magenta",
    "npm run dev --prefix frontend",
    `wrangler dev --config workers/bg-remove/wrangler.jsonc --port ${port} --ip 127.0.0.1`,
  ],
  { env, stdio: "inherit", cwd: root },
);

child.on("exit", (code) => process.exit(code ?? 0));
