import * as path from 'path';
import { readJson, hasDependency } from '../utils/fs';
import { DetectedService } from '../types';

/**
 * Inspects a directory's package.json and returns a DetectedService
 * if it looks like a Node backend (Express or generic Node server).
 * Skips directories already claimed as frontend by detectFrontend.
 */
export function detectNodeBackend(dir: string, labelPrefix = 'Backend'): DetectedService | undefined {
  const pkgPath = path.join(dir, 'package.json');
  const pkg = readJson<any>(pkgPath);
  if (!pkg) return undefined;

  // If it's clearly a frontend project, this scanner doesn't claim it.
  if (hasDependency(pkg, 'next') || hasDependency(pkg, 'vite') || hasDependency(pkg, 'react-scripts')) {
    return undefined;
  }

  const scripts = pkg.scripts || {};
  const devScript = scripts.dev
    ? 'dev'
    : scripts.start
    ? 'start'
    : scripts.server
    ? 'server'
    : undefined;

  const isExpress = hasDependency(pkg, 'express');
  const looksLikeServer =
    isExpress ||
    hasDependency(pkg, 'fastify') ||
    hasDependency(pkg, 'koa') ||
    hasDependency(pkg, 'nestjs') ||
    /server|backend|api/i.test(pkg.name || '') ||
    Boolean(devScript);

  if (!looksLikeServer) return undefined;

  return {
    name: isExpress ? `${labelPrefix} (Express)` : `${labelPrefix} (Node)`,
    type: isExpress ? 'express' : 'generic-node',
    cwd: dir,
    command: `npm run ${devScript ?? 'start'}`,
    installCommand: ['npm install'],
    isWebFacing: false,
  };
}
