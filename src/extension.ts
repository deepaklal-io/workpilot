import * as vscode from 'vscode';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';
import { scanCommand } from './commands/scan';
import { processManager } from './services/processManager';

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('WorkPilot');

  context.subscriptions.push(
    vscode.commands.registerCommand('workpilot.start', () => startCommand(output)),
    vscode.commands.registerCommand('workpilot.stop', () => stopCommand(output)),
    vscode.commands.registerCommand('workpilot.scan', () => scanCommand(output)),
    output
  );

  // Keep the process manager's registry accurate if the user (or the
  // process itself) closes a WorkPilot terminal directly.
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      processManager.untrack(terminal);
    })
  );
}

export function deactivate(): void {
  // Best-effort cleanup: stop anything WorkPilot left running when the
  // extension deactivates (e.g. VS Code closing).
  processManager.stopAll();
}
