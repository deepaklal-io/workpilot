import * as path from 'path';
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

function markerRelativePath(venvDirName: string): string {
  return `.${path.sep}${path.join(venvDirName, '.workpilot-installed')}`;
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
 * marker exists yet), meaning install should run again.
 */
export function isPythonDepsUpToDate(
  dir: string,
  venvDirName: string,
  requirementsFile = 'requirements.txt'
): boolean {
  const currentHash = computeRequirementsHash(dir, requirementsFile);
  if (!currentHash) return false;
  const marker = readText(path.join(dir, venvDirName, '.workpilot-installed'));
  return marker?.trim() === currentHash;
}

/**
 * Builds the venv-aware Python executable reference + install command(s)
 * for a Python project. Returns an array — venv creation, pip install, and
 * the cache-marker write are always separate commands/lines, never joined
 * with `&&`, since that operator doesn't exist in legacy Windows PowerShell
 * 5.1 (still the default terminal on many Windows machines). The final line
 * records a hash of requirements.txt, so future runs can skip reinstalling
 * unless dependencies actually changed (see isPythonDepsUpToDate).
 */
export function buildPipInstall(
  dir: string,
  requirementsFile = 'requirements.txt'
): { python: string; installCommand: string[]; venvDirName: string } {
  const existingVenvDir = findExistingVenvDir(dir);
  const venvDirName = existingVenvDir ?? 'venv';
  const python = venvPythonRelativePath(venvDirName);
  const hash = computeRequirementsHash(dir, requirementsFile) ?? '';
  const markerWrite = `echo ${hash}> ${markerRelativePath(venvDirName)}`;

  const installCommand: string[] = existingVenvDir
    ? [`${python} -m pip install -r ${requirementsFile}`, markerWrite]
    : [`python -m venv ${venvDirName}`, `${python} -m pip install -r ${requirementsFile}`, markerWrite];

  return { python, installCommand, venvDirName };
}
