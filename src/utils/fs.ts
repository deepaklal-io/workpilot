import * as fs from 'fs';
import * as path from 'path';

export function exists(p: string): boolean {
  try {
    return fs.existsSync(p);
  } catch {
    return false;
  }
}

export function readJson<T = any>(p: string): T | undefined {
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
}

export function readText(p: string): string | undefined {
  try {
    return fs.readFileSync(p, 'utf-8');
  } catch {
    return undefined;
  }
}

/**
 * Returns immediate subdirectories (not recursive) of a given folder,
 * excluding common noise directories.
 */
export function listSubdirs(root: string): string[] {
  const IGNORE = new Set(['node_modules', '.git', '.vscode', 'dist', 'build', '__pycache__', 'venv', '.venv']);
  try {
    return fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && !IGNORE.has(d.name))
      .map((d) => path.join(root, d.name));
  } catch {
    return [];
  }
}

export function hasDependency(pkg: any, depName: string): boolean {
  if (!pkg) return false;
  return Boolean(
    (pkg.dependencies && pkg.dependencies[depName]) ||
      (pkg.devDependencies && pkg.devDependencies[depName])
  );
}

/** Rough heuristic: does this node project look uninstalled? */
export function looksUninstalled(projectDir: string): boolean {
  return !exists(path.join(projectDir, 'node_modules'));
}

/** Rough heuristic: does this python project look uninstalled? (no venv found) */
export function looksMissingVenv(projectDir: string): boolean {
  return !exists(path.join(projectDir, 'venv')) && !exists(path.join(projectDir, '.venv'));
}
