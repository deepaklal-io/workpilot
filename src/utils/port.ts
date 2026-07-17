import * as net from 'net';

/** True if nothing is currently listening on this port on localhost. */
export function isPortFree(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, '127.0.0.1');
  });
}

/**
 * Finds the next free port starting from startPort (inclusive), checking
 * sequentially. Gives up after maxAttempts and returns startPort as-is —
 * the service will then likely fail to bind, but that failure surfaces
 * through the existing crash-detection notification rather than WorkPilot
 * silently returning a port that also turned out to be busy.
 */
export async function findFreePort(startPort: number, maxAttempts = 20): Promise<number> {
  let port = startPort;
  for (let i = 0; i < maxAttempts; i++) {
    if (await isPortFree(port)) return port;
    port++;
  }
  return startPort;
}
