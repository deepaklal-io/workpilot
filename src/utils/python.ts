import * as path from 'path';
import { exists } from './fs';

/** Returns 'venv' or '.venv' if either already exists in dir, else undefined. */
export function findExistingVenvDir(dir: string): string | undefined {
  if (exists(path.join(dir, 'venv'))) return 'venv';
  if (exists(path.join(dir, '.venv'))) return '.venv';
  return undefined;
}

/**
 * Path to the venv's own Python executable, relative to the project dir
 * (which is also the terminal's cwd, since WorkPilot always launches
 * services with cwd set to their own folder). Relative avoids a real
 * cross-shell bug: an absolute path needs quoting (may contain spaces, e.g.
 * "OneDrive\Desktop\project testing"), but a *quoted* string as the first
 * token of a command is parsed as plain text by PowerShell unless prefixed
 * with the `&` call operator — which in turn breaks bash/zsh, since they
 * don't support a leading bare `&`. A short relative path essentially never
 * contains a space, sidestepping the whole problem.
 */
export function venvPythonRelativePath(venvDirName: string): string {
  const isWindows = process.platform === 'win32';
  const relPath = isWindows
    ? path.join(venvDirName, 'Scripts', 'python.exe')
    : path.join(venvDirName, 'bin', 'python');
  return relPath.includes(' ') ? `"${relPath}"` : relPath;
}

/**
 * Builds the venv-aware Python executable reference + install command for a
 * Python project. Creates a venv named 'venv' as part of install if neither
 * 'venv' nor '.venv' already exists.
 */
export function buildPipInstall(
  dir: string,
  requirementsFile = 'requirements.txt'
): { python: string; installCommand: string; venvDirName: string } {
  const existingVenvDir = findExistingVenvDir(dir);
  const venvDirName = existingVenvDir ?? 'venv';
  const python = venvPythonRelativePath(venvDirName);

  const installCommand = existingVenvDir
    ? `${python} -m pip install -r ${requirementsFile}`
    : `python -m venv ${venvDirName} && ${python} -m pip install -r ${requirementsFile}`;

  return { python, installCommand, venvDirName };
}