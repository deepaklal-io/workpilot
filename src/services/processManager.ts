import * as vscode from 'vscode';

interface TrackedTerminal {
  serviceName: string;
  terminal: vscode.Terminal;
}

/**
 * Keeps a registry of every terminal WorkPilot has spawned, so "Stop Project"
 * can shut down exactly what it started (and nothing the user opened manually).
 */
class ProcessManager {
  private tracked: TrackedTerminal[] = [];

  register(serviceName: string, terminal: vscode.Terminal): void {
    this.tracked.push({ serviceName, terminal });
  }

  /** Call when a terminal closes on its own, to keep the registry accurate. */
  untrack(terminal: vscode.Terminal): void {
    this.tracked = this.tracked.filter((t) => t.terminal !== terminal);
  }

  isRunning(): boolean {
    return this.tracked.length > 0;
  }

  list(): TrackedTerminal[] {
    return [...this.tracked];
  }

  /** Sends Ctrl+C then disposes each tracked terminal. */
  stopAll(): string[] {
    const stoppedNames: string[] = [];
    for (const { serviceName, terminal } of this.tracked) {
      try {
        // Ctrl+C to let dev servers shut down gracefully before disposing.
        terminal.sendText('\u0003', false);
        terminal.dispose();
        stoppedNames.push(serviceName);
      } catch {
        // Terminal may already be gone; ignore.
      }
    }
    this.tracked = [];
    return stoppedNames;
  }
}

// Singleton for the extension's lifetime.
export const processManager = new ProcessManager();
