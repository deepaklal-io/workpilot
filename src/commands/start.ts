import * as vscode from 'vscode';
import { scanWorkspace } from '../scanner';
import { launchService, openBrowserForService } from '../services/launcher';
import { processManager } from '../services/processManager';

export async function startCommand(output: vscode.OutputChannel): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showWarningMessage('WorkPilot: Open a folder or workspace first.');
    return;
  }

  if (processManager.isRunning()) {
    const choice = await vscode.window.showWarningMessage(
      'WorkPilot already has services running. Stop them first?',
      'Stop and Restart',
      'Cancel'
    );
    if (choice !== 'Stop and Restart') return;
    processManager.stopAll();
  }

  const root = folders[0].uri.fsPath;
  const result = scanWorkspace(root);

  output.clear();
  output.show(true);
  output.appendLine(`🚀 WorkPilot starting project: ${root}`);
  output.appendLine('');

  if (result.services.length === 0) {
    output.appendLine('No recognizable services found.');
    vscode.window.showWarningMessage(
      'WorkPilot: No recognizable services found (React/Vite/Next/Express/FastAPI/Django/Docker).'
    );
    return;
  }

  const config = vscode.workspace.getConfiguration('workpilot');
  const installDepsIfMissing = config.get<boolean>('installDepsIfMissing', true);
  const autoOpenBrowser = config.get<boolean>('autoOpenBrowser', true);

  await vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'WorkPilot: Starting project...' },
    async (progress) => {
      for (const service of result.services) {
        progress.report({ message: service.name });
        launchService(service, output, installDepsIfMissing);
      }
    }
  );

  if (autoOpenBrowser) {
    const webService = result.services.find((s) => s.isWebFacing && s.type !== 'docker');
    if (webService) openBrowserForService(webService, output);
  }

  vscode.window.showInformationMessage(`WorkPilot: Started ${result.services.length} service(s). 🚀`);
}
