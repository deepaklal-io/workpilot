import * as vscode from 'vscode';
import { DetectedService } from '../types';
import { looksUninstalled, looksMissingVenv } from '../utils/fs';
import { processManager } from './processManager';

/**
 * Decides whether a service's install step should run before its start
 * command, based on simple on-disk heuristics (node_modules / venv presence).
 */
function needsInstall(service: DetectedService, installDepsIfMissing: boolean): boolean {
  if (!installDepsIfMissing || !service.installCommand) return false;

  if (service.type === 'fastapi' || service.type === 'django') {
    return looksMissingVenv(service.cwd);
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
    terminal.sendText(service.installCommand);
  }

  terminal.sendText(service.command);
  output.appendLine(`✔ ${service.name} started (${service.command})`);

  processManager.register(service.name, terminal);
  return terminal;
}

/**
 * Opens the browser for the first web-facing, non-API service (heuristic:
 * prefer a frontend url over a bare backend url) once services have had a
 * moment to boot.
 */
export function openBrowserForService(service: DetectedService, output: vscode.OutputChannel): void {
  if (!service.url) return;
  // Give the dev server a few seconds before opening the browser.
  setTimeout(() => {
    vscode.env.openExternal(vscode.Uri.parse(service.url!));
    output.appendLine(`✔ Browser opened → ${service.url}`);
  }, 4000);
}
