import * as vscode from 'vscode';
import * as http from 'http';
import * as https from 'https';
import { DetectedService } from '../types';
import { looksUninstalled, looksMissingVenv } from '../utils/fs';
import { findExistingVenvDir, isPythonDepsUpToDate } from '../utils/python';
import { processManager } from './processManager';

/**
 * Decides whether a service's install step should run before its start
 * command. For Node projects: does node_modules exist at all. For Python
 * projects: does a venv exist AND does its install-marker match the current
 * requirements.txt hash — so install re-runs when dependencies actually
 * change, not on every single start, and not never once a venv exists once.
 */
function needsInstall(service: DetectedService, installDepsIfMissing: boolean): boolean {
  if (!installDepsIfMissing || !service.installCommand) return false;

  if (service.type === 'fastapi' || service.type === 'django' || service.type === 'streamlit') {
    if (looksMissingVenv(service.cwd)) return true;
    const venvDirName = findExistingVenvDir(service.cwd) ?? 'venv';
    return !isPythonDepsUpToDate(service.cwd, venvDirName);
  }
  // react, vite, next, express, generic-node all use npm/node_modules
  if (service.type !== 'docker') {
    return looksUninstalled(service.cwd);
  }
  return false;
}

/**
 * Starts one service in its own dedicated VS Code terminal, logging progress
 * to the given output channel, and registers the terminal with the
 * process manager so it can be stopped later.
 */
export function launchService(
  service: DetectedService,
  output: vscode.OutputChannel,
  installDepsIfMissing: boolean
): vscode.Terminal {
  const terminal = vscode.window.createTerminal({
    name: `WorkPilot: ${service.name}`,
    cwd: service.cwd,
  });

  const willInstall = needsInstall(service, installDepsIfMissing);

  terminal.show(false);

  if (willInstall && service.installCommand) {
    output.appendLine(`⏳ Installing dependencies for ${service.name}...`);
    // Each command sent as its own line — never joined with `&&`, which
    // doesn't work in legacy Windows PowerShell 5.1.
    for (const cmd of service.installCommand) {
      terminal.sendText(cmd);
    }
  }

  terminal.sendText(service.command);
  output.appendLine(`✔ ${service.name} started (${service.command})`);

  processManager.register(service, terminal);
  return terminal;
}

/** Single attempt to reach a URL. Resolves true on ANY response (even a 404
 *  or redirect proves something is listening on that port), false on
 *  connection refused/timeout/error. */
function pingUrl(url: string, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const client = url.startsWith('https') ? https : http;
    try {
      const req = client.get(url, { timeout: timeoutMs }, (res) => {
        res.resume(); // drain the response so the socket can close cleanly
        resolve(true);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Opens the browser for the first web-facing, non-API service once it's
 * actually ready — polls the URL instead of guessing a fixed delay, since a
 * fixed delay is unreliable (install time, framework startup time, and
 * machine speed all vary). Falls back to opening anyway after a generous
 * max wait, so a slow-but-working server still gets a browser tab
 * eventually rather than silently never opening one.
 */
export async function openBrowserForService(service: DetectedService, output: vscode.OutputChannel): Promise<void> {
  if (!service.url) return;

  const maxWaitMs = 30000;
  const pollIntervalMs = 1000;
  const deadline = Date.now() + maxWaitMs;

  while (Date.now() < deadline) {
    if (await pingUrl(service.url)) {
      vscode.env.openExternal(vscode.Uri.parse(service.url));
      output.appendLine(`✔ Browser opened → ${service.url}`);
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timed out waiting — open anyway rather than never opening at all;
  // the server may just be unusually slow rather than actually broken.
  vscode.env.openExternal(vscode.Uri.parse(service.url));
  output.appendLine(`✔ Browser opened → ${service.url} (readiness check timed out after ${maxWaitMs / 1000}s, opened anyway)`);
}
