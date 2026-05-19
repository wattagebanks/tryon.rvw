import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const uvicorn = path.join(root, "backend", ".venv", "bin", "uvicorn");

await import("./free-dev-ports.mjs");
await new Promise((r) => setTimeout(r, 400));

console.log("[dev] Python API → http://127.0.0.1:8000 (bria-rmbg)");
console.log("[dev] Vite → http://localhost:5173");

const child = spawn(
  "npx",
  [
    "concurrently",
    "-k",
    "-n",
    "vite,api",
    "-c",
    "cyan,green",
    "npm run dev --prefix frontend",
    `sh -c 'cd backend && ${uvicorn} main:app --reload --port 8000'`,
  ],
  { stdio: "inherit", cwd: root, shell: false },
);

child.on("exit", (code) => process.exit(code ?? 0));
