import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const python = path.join(root, "backend", ".venv", "bin", "python");
const uvicorn = path.join(root, "backend", ".venv", "bin", "uvicorn");

console.log("[dev:rembg] Python API → http://127.0.0.1:8000 (local rembg + LiteLLM)");
console.log("[dev:rembg] Vite → http://localhost:5173");

const env = {
  ...process.env,
  VITE_API_TARGET: "http://127.0.0.1:8000",
  VITE_USE_PYTHON_API: "true",
};

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
  { env, stdio: "inherit", cwd: root, shell: false },
);

child.on("exit", (code) => process.exit(code ?? 0));
