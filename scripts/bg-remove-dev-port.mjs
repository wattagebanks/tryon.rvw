import net from "node:net";

const PREFERRED = 8788;
const MAX_TRY = 8798;

function isPortFree(port) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, "127.0.0.1");
  });
}

export async function getBgRemoveDevPort() {
  for (let port = PREFERRED; port <= MAX_TRY; port++) {
    if (await isPortFree(port)) return port;
  }
  throw new Error(
    `No free port between ${PREFERRED} and ${MAX_TRY} for the bg-remove Worker.`,
  );
}
