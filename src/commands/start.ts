import * as vscode from 'vscode';
import { scanWorkspace } from '../scanner';
import { launchService, openBrowserForService } from '../services/launcher';
import { processManager } from '../services/processManager';
import { setStatusBarBusy, refreshStatusBar } from '../services/statusBar';

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
    refreshStatusBar();
  }

  setStatusBarBusy('Scanning...');

  try {
    const root = folders[0].uri.fsPath;
    const result = scanWorkspace(root);

    output.clear();
    output.show(true);
    output.appendLine(`🚀 WorkPilot starting project: ${root}`);
    output.appendLine('');

    if (result.services.length === 0) {
      output.appendLine('No recognizable services found.');

      if (result.unreadableMarkerFiles.length > 0) {
        output.appendLine('');
        output.appendLine('⚠ Found project files that exist but could not be read:');
        for (const f of result.unreadableMarkerFiles) output.appendLine(`   ${f}`);
        output.appendLine(
          'This usually means a cloud-sync placeholder (OneDrive/Dropbox "Files On-Demand") hasn\'t' +
            ' downloaded the real file yet. Try right-clicking the project folder in File Explorer →' +
            ' "Always keep on this device", then run Start again.'
        );
      }

      vscode.window.showWarningMessage(
        'WorkPilot: No recognizable services found (React/Vite/Next/Express/FastAPI/Django/Streamlit/Docker).'
      );
      return;
    }

    if (result.skippedByDocker.length > 0) {
      output.appendLine(
        `ℹ Skipped running natively (already built/run by Docker Compose): ${result.skippedByDocker.join(', ')}`
      );
      output.appendLine('');
    }

    const config = vscode.workspace.getConfiguration('workpilot');
    const installDepsIfMissing = config.get<boolean>('installDepsIfMissing', true);
    const autoOpenBrowser = config.get<boolean>('autoOpenBrowser', true);

    setStatusBarBusy('Starting...');

    await vscode.window.withProgress(
      { location: vscode.ProgressLocation.Notification, title: 'WorkPilot: Starting project...' },
      async (progress) => {
        for (const service of result.services) {
          progress.report({ message: service.name });
          await launchService(service, output, installDepsIfMissing);
        }
      }
    );

    if (autoOpenBrowser) {
      const UI_TYPES = new Set(['react', 'vite', 'next', 'streamlit']);
      // Prefer an actual UI over a bare backend — opening a FastAPI/Express
      // root route usually just shows a blank/"Not Found" response, which
      // looks like a failure even though the backend is running fine.
      const webService =
        result.services.find((s) => s.isWebFacing && UI_TYPES.has(s.type)) ??
        result.services.find((s) => s.isWebFacing && s.type !== 'docker');
      if (webService) void openBrowserForService(webService, output);
    }

    vscode.window.showInformationMessage(`WorkPilot: Started ${result.services.length} service(s). 🚀`);
  } finally {
    // Always reflects real state at the end, whether we started services,
    // found nothing, or hit an early return above.
    refreshStatusBar();
  }
}
