import * as vscode from 'vscode';
import { processManager } from './processManager';

let toggleItem: vscode.StatusBarItem | undefined;
let scanItem: vscode.StatusBarItem | undefined;

/**
 * Creates the two status bar entries: a Scan button (static, always the
 * same) and a Start/Stop toggle (its label, icon, and bound command all
 * change based on whether anything is currently running). Call once from
 * activate(); call refreshStatusBar() after anything that could change
 * whether WorkPilot has services running.
 */
export function initStatusBar(context: vscode.ExtensionContext): void {
  scanItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 99);
  scanItem.text = '$(search) Scan';
  scanItem.tooltip = 'WorkPilot: Scan Project (preview plan, nothing runs)';
  scanItem.command = 'workpilot.scan';
  scanItem.show();

  toggleItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  toggleItem.show();

  context.subscriptions.push(scanItem, toggleItem);

  refreshStatusBar();
}

/** Switches the toggle button into a busy state while start/stop is in
 *  progress — no command bound, so clicking it does nothing mid-action. */
export function setStatusBarBusy(message: string): void {
  if (!toggleItem) return;
  toggleItem.text = `$(sync~spin) ${message}`;
  toggleItem.tooltip = 'WorkPilot is working...';
  toggleItem.command = undefined;
  toggleItem.backgroundColor = undefined;
}

/** Re-reads actual running state and updates the toggle button to match.
 *  Safe to call as often as needed — cheap, no side effects beyond the UI. */
export function refreshStatusBar(): void {
  if (!toggleItem) return;

  if (processManager.isRunning()) {
    toggleItem.text = '$(debug-stop) Stop';
    toggleItem.tooltip = 'WorkPilot: Stop Project';
    toggleItem.command = 'workpilot.stop';
    toggleItem.backgroundColor = new vscode.ThemeColor('statusBarItem.warningBackground');
  } else {
    toggleItem.text = '$(rocket) Start';
    toggleItem.tooltip = 'WorkPilot: Start Project';
    toggleItem.command = 'workpilot.start';
    toggleItem.backgroundColor = undefined;
  }
}
