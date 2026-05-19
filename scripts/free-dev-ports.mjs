import { execSync } from "node:child_process";

const PORTS = [8000, 5173, 5174, 5175, 5176, 5177];

function pidsOnPort(port) {
  try {
    return execSync(`lsof -ti :${port}`, { encoding: "utf8" })
      .trim()
      .split("\n")
      .filter(Boolean);
  } catch {
    return [];
  }
}

const killed = new Set();

for (const port of PORTS) {
  for (const pid of pidsOnPort(port)) {
    if (killed.has(pid)) continue;
    try {
      process.kill(Number(pid), "SIGTERM");
      killed.add(pid);
      console.log(`[free-dev-ports] stopped PID ${pid} (port ${port})`);
    } catch {
      // already gone
    }
  }
}

if (killed.size === 0) {
  console.log("[free-dev-ports] no listeners on dev ports");
}
