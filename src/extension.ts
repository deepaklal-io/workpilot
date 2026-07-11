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

  registerCrashDetection(context, output);
}

/**
 * Listens for shell commands finishing inside WorkPilot-owned terminals and
 * surfaces unexpected non-zero exits (crashes, failed installs, servers that
 * refuse to start) to the Output panel and as a warning notification.
 *
 * Relies on VS Code's terminal shell integration API, which only fires for
 * shells that support it (bash, zsh, pwsh, fish — not cmd.exe) and requires
 * a reasonably recent VS Code version. Feature-detected below so WorkPilot
 * still works normally, just without this extra signal, on older setups.
 */
function registerCrashDetection(context: vscode.ExtensionContext, output: vscode.OutputChannel): void {
  const api = vscode.window as unknown as {
    onDidEndTerminalShellExecution?: (
      listener: (e: {
        terminal: vscode.Terminal;
        exitCode: number | undefined;
        execution: { commandLine: { value: string } };
      }) => void
    ) => vscode.Disposable;
  };

  if (typeof api.onDidEndTerminalShellExecution !== 'function') {
    output.appendLine(
      'ℹ Crash detection needs a newer VS Code version (shell integration API unavailable) — skipping.'
    );
    return;
  }

  context.subscriptions.push(
    api.onDidEndTerminalShellExecution((event) => {
      const tracked = processManager.find(event.terminal);
      // Not a WorkPilot terminal, or the exit was requested by Stop Project — ignore.
      if (!tracked || tracked.stopRequested) return;

      const exitCode = event.exitCode;
      if (typeof exitCode !== 'number' || exitCode === 0) return;

      const commandLine = event.execution.commandLine.value;
      output.appendLine(
        `✖ ${tracked.serviceName} exited with code ${exitCode} — command: ${commandLine}`
      );

      vscode.window
        .showWarningMessage(`WorkPilot: ${tracked.serviceName} failed or crashed.`, 'Show Terminal', 'Dismiss')
        .then((choice) => {
          if (choice === 'Show Terminal') {
            event.terminal.show();
          }
        });
    })
  );
}

export function deactivate(): void {
  // Best-effort cleanup: stop anything WorkPilot left running when the
  // extension deactivates (e.g. VS Code closing).
  processManager.stopAll();
}