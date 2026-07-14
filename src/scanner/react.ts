import * as path from 'path';
import { readJson, hasDependency } from '../utils/fs';
import { DetectedService } from '../types';

/**
 * Inspects a directory's package.json and returns a DetectedService
 * if it looks like a frontend project (Next.js > Vite > CRA, in that
 * priority order since Next apps often also depend on react).
 */
export function detectFrontend(dir: string, labelPrefix = 'Frontend'): DetectedService | undefined {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = readJson<any>(pkgPath);
  if (!pkg) return undefined;

  const scripts = pkg.scripts || {};
  const devScript = scripts.dev ? 'dev' : scripts.start ? 'start' : undefined;

  if (hasDependency(pkg, 'next')) {
    return {
      name: `${labelPrefix} (Next.js)`,
      type: 'next',
      cwd: dir,
      command: `npm run ${devScript ?? 'dev'}`,
      installCommand: ['npm install'],
      isWebFacing: true,
      url: 'http://localhost:3000',
    };
  }

  if (hasDependency(pkg, 'vite')) {
    return {
      name: `${labelPrefix} (Vite)`,
      type: 'vite',
      cwd: dir,
      command: `npm run ${devScript ?? 'dev'}`,
      installCommand: ['npm install'],
      isWebFacing: true,
      url: 'http://localhost:5173',
    };
  }

  if (hasDependency(pkg, 'react') || hasDependency(pkg, 'react-scripts')) {
    return {
      name: `${labelPrefix} (React)`,
      type: 'react',
      cwd: dir,
      command: `npm run ${devScript ?? 'start'}`,
      installCommand: ['npm install'],
      isWebFacing: true,
      url: 'http://localhost:3000',
    };
  }

  return undefined;
}
