import * as vscode from 'vscode';
import { processManager } from '../services/processManager';
import { refreshStatusBar } from '../services/statusBar';

export async function stopCommand(output: vscode.OutputChannel): Promise<void> {
  if (!processManager.isRunning()) {
    vscode.window.showInformationMessage('WorkPilot: Nothing is currently running.');
    return;
  }

  const stopped = processManager.stopAll();
  refreshStatusBar();

  output.appendLine('');
  output.appendLine('🛑 WorkPilot stopping project...');
  for (const name of stopped) {
    output.appendLine(`✔ ${name} stopped`);
  }

  vscode.window.showInformationMessage(`WorkPilot: Stopped ${stopped.length} service(s).`);
}
