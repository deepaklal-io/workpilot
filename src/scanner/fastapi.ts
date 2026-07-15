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
  const blob = readDependencyBlob(dir);
  if (!blob) return undefined;

  const { python, installCommand } = buildPipInstall(dir);

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
