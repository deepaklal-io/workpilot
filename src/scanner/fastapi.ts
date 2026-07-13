import * as path from 'path';
import { exists, readText } from '../utils/fs';
import { DetectedService } from '../types';

function readDependencyBlob(dir: string): string {
  const chunks: string[] = [];
  const reqPath = path.join(dir, 'requirements.txt');
  const pyprojectPath = path.join(dir, 'pyproject.toml');
  const req = readText(reqPath);
  const pyproject = readText(pyprojectPath);
  if (req) chunks.push(req);
  if (pyproject) chunks.push(pyproject);
  return chunks.join('\n').toLowerCase();
}

/**
 * Returns the path to the venv's own Python executable (not the system one),
 * quoted for shell-safety. Invoking packages via `<venvPython> -m <tool>`
 * works identically across cmd.exe, PowerShell, bash, and zsh — unlike
 * `venv\Scripts\activate` / `source venv/bin/activate`, which differ per
 * shell and can fail silently (e.g. PowerShell execution policy blocking
 * Activate.ps1). No activation step needed at all with this approach.
 */
function venvPythonPath(dir: string, venvDirName: string): string {
  const isWindows = process.platform === 'win32';
  const relPath = isWindows
    ? path.join(venvDirName, 'Scripts', 'python.exe')
    : path.join(venvDirName, 'bin', 'python');
  const fullPath = path.join(dir, relPath);
  // Quote in case the project path itself contains spaces (common on Windows,
  // e.g. "OneDrive\Desktop\My Project").
  return `"${fullPath}"`;
}

/**
 * Inspects a directory for requirements.txt / pyproject.toml and returns
 * a DetectedService for FastAPI or Django if found.
 */
export function detectPythonBackend(dir: string, labelPrefix = 'Backend'): DetectedService | undefined {
  const blob = readDependencyBlob(dir);
  if (!blob) return undefined;

  const existingVenvDir = exists(path.join(dir, 'venv')) ? 'venv' : exists(path.join(dir, '.venv')) ? '.venv' : undefined;
  // If no venv exists yet, we'll create one named 'venv' as part of install.
  const venvDirName = existingVenvDir ?? 'venv';
  const python = venvPythonPath(dir, venvDirName);

  const installCommand = existingVenvDir
    ? `${python} -m pip install -r requirements.txt`
    : `python -m venv ${venvDirName} && ${python} -m pip install -r requirements.txt`;

  if (blob.includes('fastapi')) {
    // Try to guess the ASGI entrypoint module. Common conventions: main:app, app.main:app
    const entry = exists(path.join(dir, 'app', 'main.py')) ? 'app.main:app' : 'main:app';
    return {
      name: `${labelPrefix} (FastAPI)`,
      type: 'fastapi',
      cwd: dir,
      command: `${python} -m uvicorn ${entry} --reload`,
      installCommand,
      isWebFacing: true,
      url: 'http://localhost:8000',
    };
  }

  if (blob.includes('django')) {
    return {
      name: `${labelPrefix} (Django)`,
      type: 'django',
      cwd: dir,
      command: `${python} manage.py runserver`,
      installCommand,
      isWebFacing: true,
      url: 'http://localhost:8000',
    };
  }

  return undefined;
}