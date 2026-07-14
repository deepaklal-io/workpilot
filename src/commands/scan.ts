import * as vscode from 'vscode';
import { scanWorkspace } from '../scanner';

export async function scanCommand(output: vscode.OutputChannel): Promise<void> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    vscode.window.showWarningMessage('WorkPilot: Open a folder or workspace first.');
    return;
  }

  const root = folders[0].uri.fsPath;
  const result = scanWorkspace(root);

  output.clear();
  output.show(true);
  output.appendLine(`WorkPilot scan: ${root}`);
  output.appendLine('');

  if (result.services.length === 0) {
    output.appendLine('No recognizable services found (React/Vite/Next/Express/FastAPI/Django/Streamlit/Docker).');

    if (result.unreadableMarkerFiles.length > 0) {
      output.appendLine('');
      output.appendLine('⚠ Found project files that exist but could not be read:');
      for (const f of result.unreadableMarkerFiles) output.appendLine(`   ${f}`);
      output.appendLine(
        'This usually means a cloud-sync placeholder (OneDrive/Dropbox "Files On-Demand") hasn\'t' +
          ' downloaded the real file yet. Try right-clicking the project folder in File Explorer →' +
          ' "Always keep on this device", then scan again.'
      );
    }

    vscode.window.showInformationMessage('WorkPilot: No recognizable services found in this workspace.');
    return;
  }

  for (const s of result.services) {
    output.appendLine(`• ${s.name}`);
    output.appendLine(`   dir:     ${s.cwd}`);
    output.appendLine(`   command: ${s.command}`);
    if (s.installCommand) output.appendLine(`   install: ${s.installCommand.join(' && ')}`);
    if (s.url) output.appendLine(`   url:     ${s.url}`);
    output.appendLine('');
  }

  if (result.skippedByDocker.length > 0) {
    output.appendLine(
      `ℹ Skipped running natively (already built/run by Docker Compose): ${result.skippedByDocker.join(', ')}`
    );
    output.appendLine('');
  }

  vscode.window.showInformationMessage(
    `WorkPilot found ${result.services.length} service(s). See Output panel for the plan.`
  );
}
