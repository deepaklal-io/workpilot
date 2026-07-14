import * as path from 'path';
import { exists, readText } from '../utils/fs';
import { buildPipInstall } from '../utils/python';
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
 * Inspects a directory for requirements.txt / pyproject.toml and returns
 * a DetectedService for FastAPI or Django if found.
 */
export function detectPythonBackend(dir: string, labelPrefix = 'Backend'): DetectedService | undefined {
  // Read dependency files if present (requirements.txt / pyproject.toml).
  const reqPath = path.join(dir, 'requirements.txt');
  const pyprojectPath = path.join(dir, 'pyproject.toml');
  const req = readText(reqPath);
  const pyproject = readText(pyprojectPath);
  const blob = [req, pyproject].filter(Boolean).join('\n').toLowerCase();

  // Build pip/venv commands (python path) even when no deps present so
  // we can prefer a venv python if one exists. Only include install
  // commands when dependency files actually exist.
  const { python, installCommand } = buildPipInstall(dir);
  const hasDeps = Boolean(req || pyproject);

  if (blob.includes('fastapi')) {
    // Try to guess the ASGI entrypoint module. Common conventions: main:app, app.main:app
    const entry = exists(path.join(dir, 'app', 'main.py')) ? 'app.main:app' : 'main:app';
    return {
      name: `${labelPrefix} (FastAPI)`,
      type: 'fastapi',
      cwd: dir,
      command: `${python} -m uvicorn ${entry} --reload`,
      installCommand: hasDeps ? installCommand : undefined,
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
      installCommand: hasDeps ? installCommand : undefined,
      isWebFacing: true,
      url: 'http://localhost:8000',
    };
  }

  // Generic Python app detection: common single-file entrypoints that
  // people run with `python app.py` or `python main.py`.
  const candidates = ['app.py', 'main.py', '__main__.py', path.join('app', 'main.py')];
  for (const candidate of candidates) {
    const candidatePath = path.join(dir, candidate);
    if (exists(candidatePath)) {
      return {
        name: `${labelPrefix} (Python)` ,
        type: 'generic-python',
       cwd: dir,
        command: `${python} ${candidate}`,
        installCommand: hasDeps ? installCommand : undefined,
        isWebFacing: false,
      };
    }
  }

  return undefined;
}
