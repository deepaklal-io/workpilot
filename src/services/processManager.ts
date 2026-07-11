import * as vscode from 'vscode';

export interface TrackedTerminal {
  serviceName: string;
  terminal: vscode.Terminal;
  /** True once the user (or WorkPilot) has intentionally asked this to stop,
   *  so an exit right after doesn't get misreported as a crash. */
  stopRequested: boolean;
}

/**
 * Keeps a registry of every terminal WorkPilot has spawned, so "Stop Project"
 * can shut down exactly what it started (and nothing the user opened manually),
 * and so crash detection can tell an intentional stop apart from a real failure.
 */
class ProcessManager {
  private tracked: TrackedTerminal[] = [];

  register(serviceName: string, terminal: vscode.Terminal): void {
    this.tracked.push({ serviceName, terminal, stopRequested: false });
  }

  /** Call when a terminal closes on its own, to keep the registry accurate. */
  untrack(terminal: vscode.Terminal): void {
    this.tracked = this.tracked.filter((t) => t.terminal !== terminal);
  }

  /** Looks up the tracked entry for a given terminal, if WorkPilot started it. */
  find(terminal: vscode.Terminal): TrackedTerminal | undefined {
    return this.tracked.find((t) => t.terminal === terminal);
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
    for (const entry of this.tracked) {
      entry.stopRequested = true;
      try {
        // Ctrl+C to let dev servers shut down gracefully before disposing.
        entry.terminal.sendText('\u0003', false);
        entry.terminal.dispose();
        stoppedNames.push(entry.serviceName);
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