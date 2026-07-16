import * as vscode from 'vscode';
import { startCommand } from './commands/start';
import { stopCommand } from './commands/stop';
import { scanCommand } from './commands/scan';
import { processManager } from './services/processManager';
import { writeInstallMarker } from './utils/python';
import { initStatusBar, refreshStatusBar } from './services/statusBar';

const PYTHON_SERVICE_TYPES = new Set(['fastapi', 'django', 'streamlit']);

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('WorkPilot');

  context.subscriptions.push(
    vscode.commands.registerCommand('workpilot.start', () => startCommand(output)),
    vscode.commands.registerCommand('workpilot.stop', () => stopCommand(output)),
    vscode.commands.registerCommand('workpilot.scan', () => scanCommand(output)),
    output
  );

  initStatusBar(context);

  // Keep the process manager's registry — and the status bar — accurate if
  // the user (or the process itself) closes a WorkPilot terminal directly.
  context.subscriptions.push(
    vscode.window.onDidCloseTerminal((terminal) => {
      processManager.untrack(terminal);
      refreshStatusBar();
    })
  );

  registerCrashDetection(context, output);
}

/**
 * Listens for shell commands finishing inside WorkPilot-owned terminals.
 * Two things happen here:
 *
 * 1. Crash/failure surfacing: unexpected non-zero exits (failed installs,
 *    servers that error out on startup) are logged to the Output panel and
 *    shown as a warning notification with a "Show Terminal" shortcut.
 *
 * 2. Install-success marking: when a Python service's `pip install` command
 *    specifically finishes with exit code 0, the requirements-hash marker
 *    is written from here (real Node fs, not a shell command) — see
 *    writeInstallMarker's doc comment for why it can't be a shell line.
 *
 * Relies on VS Code's terminal shell integration API, which only fires for
 * shells that support it (bash, zsh, pwsh, fish — not cmd.exe) and requires
 * a reasonably recent VS Code version. Feature-detected below so WorkPilot
 * still works normally, just without these two extras, on older setups.
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
      if (!tracked) return;

      const exitCode = event.exitCode;
      const commandLine = event.execution.commandLine.value;

      // Successful pip install for a Python service → record the marker so
      // the next run can skip reinstalling, but only now that we've
      // confirmed via a real exit code that it actually succeeded.
      if (
        exitCode === 0 &&
        PYTHON_SERVICE_TYPES.has(tracked.service.type) &&
        commandLine.includes('-m pip install')
      ) {
        writeInstallMarker(tracked.service.cwd);
      }

      // Exit was requested by Stop Project — don't report it as a crash.
      if (tracked.stopRequested) return;
      if (typeof exitCode !== 'number' || exitCode === 0) return;

      output.appendLine(
        `✖ ${tracked.service.name} exited with code ${exitCode} — command: ${commandLine}`
      );

      vscode.window
        .showWarningMessage(`WorkPilot: ${tracked.service.name} failed or crashed.`, 'Show Terminal', 'Dismiss')
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
