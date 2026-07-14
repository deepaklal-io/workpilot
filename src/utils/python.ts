import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { exists, readText } from './fs';

/** Returns 'venv' or '.venv' if either already exists in dir, else undefined. */
export function findExistingVenvDir(dir: string): string | undefined {
  if (exists(path.join(dir, 'venv'))) return 'venv';
  if (exists(path.join(dir, '.venv'))) return '.venv';
  return undefined;
}

/**
 * Path to the venv's own Python executable, relative to the project dir
 * (which is also the terminal's cwd, since WorkPilot always launches
 * services with cwd set to their own folder). Prefixed with `./`/`.\` —
 * without it, both PowerShell and bash refuse to run a bare relative path
 * from the current directory (a security convention: they try to resolve
 * it as a named command/module first, which fails). A relative path also
 * avoids a separate quoting bug: an absolute path needs quotes if it
 * contains spaces (e.g. "OneDrive\Desktop\project testing"), but a quoted
 * string as the first token of a command is parsed as plain text by
 * PowerShell unless prefixed with the `&` call operator — which in turn
 * breaks bash/zsh, since they don't support a leading bare `&`.
 */
export function venvPythonRelativePath(venvDirName: string): string {
  const isWindows = process.platform === 'win32';
  const relPath = isWindows
    ? path.join(venvDirName, 'Scripts', 'python.exe')
    : path.join(venvDirName, 'bin', 'python');
  const prefixed = `.${path.sep}${relPath}`;
  return prefixed.includes(' ') ? `"${prefixed}"` : prefixed;
}

function markerFilePath(dir: string, venvDirName: string): string {
  return path.join(dir, venvDirName, '.workpilot-installed');
}

function computeRequirementsHash(dir: string, requirementsFile: string): string | undefined {
  const content = readText(path.join(dir, requirementsFile));
  if (content === undefined) return undefined;
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * True if the venv already has a marker recorded matching the current
 * requirements.txt contents — meaning install can be safely skipped. False
 * if requirements.txt changed since the last successful install (or no
 * marker exists, e.g. install never succeeded), meaning install should run.
 */
export function isPythonDepsUpToDate(
  dir: string,
  venvDirName: string,
  requirementsFile = 'requirements.txt'
): boolean {
  const currentHash = computeRequirementsHash(dir, requirementsFile);
  if (!currentHash) return false;
  const marker = readText(markerFilePath(dir, venvDirName));
  return marker?.trim() === currentHash;
}

/**
 * Writes the install-succeeded marker directly from the extension (Node
 * fs, not a shell command). Deliberately NOT done via a shell line appended
 * to the install command — that would write the marker unconditionally,
 * even if `pip install` had actually failed, since there's no `&&`-style
 * conditional syntax that works identically across PowerShell 5.1, cmd, and
 * bash. Call this only after confirming the install command's real exit
 * code was 0, via the shell-integration crash-detection listener.
 */
export function writeInstallMarker(dir: string, requirementsFile = 'requirements.txt'): void {
  const venvDirName = findExistingVenvDir(dir);
  if (!venvDirName) return;
  const hash = computeRequirementsHash(dir, requirementsFile);
  if (!hash) return;
  try {
    fs.writeFileSync(markerFilePath(dir, venvDirName), hash, 'utf-8');
  } catch {
    // Best effort — if this fails, the next run just reinstalls, which is safe.
  }
}

/**
 * Builds the venv-aware Python executable reference + install command(s)
 * for a Python project. Returns an array — venv creation and pip install
 * are always separate commands/lines, never joined with `&&`, since that
 * operator doesn't exist in legacy Windows PowerShell 5.1 (still the
 * default terminal on many Windows machines). Does NOT include a
 * marker-write step — see writeInstallMarker for why.
 */
export function buildPipInstall(
  dir: string,
  requirementsFile = 'requirements.txt'
): { python: string; installCommand: string[]; venvDirName: string } {
  const existingVenvDir = findExistingVenvDir(dir);
  const venvDirName = existingVenvDir ?? 'venv';
  // If a venv already exists, prefer running the venv's python directly.
  // If no venv exists yet, use the system `python` to create the venv,
  // and only use the venv python for the subsequent install step.
  const python = existingVenvDir ? venvPythonRelativePath(venvDirName) : 'python';

  const installCommand: string[] = existingVenvDir
    ? [`${python} -m pip install -r ${requirementsFile}`]
    : [`python -m venv ${venvDirName}`, `${venvPythonRelativePath(venvDirName)} -m pip install -r ${requirementsFile}`];

  return { python, installCommand, venvDirName };
}
