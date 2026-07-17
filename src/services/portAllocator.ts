import * as vscode from 'vscode';
import { DetectedService } from '../types';
import { isPortFree, findFreePort } from '../utils/port';

/**
 * Returns an adjusted copy of the service, pointed at newPort, using
 * whatever mechanism that framework actually supports for overriding its
 * port. These aren't interchangeable — Vite/Next take a CLI flag appended
 * after `--` (since they run via `npm run <script>`), FastAPI/Django/
 * Streamlit take their own native flags, and CRA has no CLI flag for this
 * at all — only an environment variable, set here via the terminal's `env`
 * option rather than shell syntax (sidesteps yet another cross-shell
 * env-var-setting inconsistency between cmd/PowerShell/bash).
 */
function applyNewPort(service: DetectedService, newPort: number): DetectedService {
  const url = service.url ? service.url.replace(/:\d+$/, `:${newPort}`) : service.url;

  switch (service.type) {
    case 'vite':
      return { ...service, command: `${service.command} -- --port ${newPort}`, url };
    case 'next':
      return { ...service, command: `${service.command} -- -p ${newPort}`, url };
    case 'fastapi':
      return { ...service, command: `${service.command} --port ${newPort}`, url };
    case 'django':
      return { ...service, command: `${service.command} ${newPort}`, url };
    case 'streamlit':
      return { ...service, command: `${service.command} --server.port ${newPort}`, url };
    case 'react':
    case 'express':
    case 'generic-node':
      // No universal CLI flag for these — rely on the PORT env var, which
      // Create React App always respects, and which many (not all) custom
      // Express apps also read. Best-effort for the latter, by nature of
      // there being no reliable CLI convention across arbitrary Node apps.
      return { ...service, url, env: { ...(service.env ?? {}), PORT: String(newPort) } };
    default:
      // docker and anything else: leave untouched. Docker's ports come from
      // docker-compose.yml itself, which WorkPilot doesn't rewrite.
      return service;
  }
}

/**
 * Checks whether a service's default port is already taken; if so, finds
 * the next free port and returns an adjusted service pointed at it.
 * Read-only probing (briefly binding then releasing a port) — safe to call
 * during both Scan (preview) and Start.
 */
export async function resolvePort(
  service: DetectedService,
  output: vscode.OutputChannel
): Promise<DetectedService> {
  if (!service.url || service.type === 'docker') return service;

  let port: number;
  try {
    port = Number(new URL(service.url).port);
  } catch {
    return service;
  }
  if (!port) return service;

  if (await isPortFree(port)) return service;

  const freePort = await findFreePort(port + 1);
  output.appendLine(`⚠ Port ${port} is already in use for ${service.name} — using ${freePort} instead.`);
  return applyNewPort(service, freePort);
}
