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
    output.appendLine('No recognizable services found (React/Vite/Next/Express/FastAPI/Django/Docker).');
    vscode.window.showInformationMessage('WorkPilot: No recognizable services found in this workspace.');
    return;
  }

  for (const s of result.services) {
    output.appendLine(`• ${s.name}`);
    output.appendLine(`   dir:     ${s.cwd}`);
    output.appendLine(`   command: ${s.command}`);
    if (s.installCommand) output.appendLine(`   install: ${s.installCommand}`);
    if (s.url) output.appendLine(`   url:     ${s.url}`);
    output.appendLine('');
  }

  vscode.window.showInformationMessage(
    `WorkPilot found ${result.services.length} service(s). See Output panel for the plan.`
  );
}
