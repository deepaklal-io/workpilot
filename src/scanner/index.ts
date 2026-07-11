import { listSubdirs } from '../utils/fs';
import { detectFrontend } from './react';
import { detectNodeBackend } from './express';
import { detectPythonBackend } from './fastapi';
import { detectDocker } from './docker';
import { DetectedService, ScanResult } from '../types';

/**
 * Scans the workspace root and its immediate subdirectories (covers the
 * common MERN/PERN monorepo layouts like /client + /server, or /frontend
 * + /backend) and returns every service WorkPilot can start.
 *
 * Detection order per directory: frontend (Next/Vite/React) -> Node backend
 * (Express/generic) -> Python backend (FastAPI/Django). First match wins
 * per directory so we don't double-claim the same folder.
 */
export function scanWorkspace(rootDir: string): ScanResult {
  const candidateDirs = [rootDir, ...listSubdirs(rootDir)];
  const services: DetectedService[] = [];
  const claimedDirs = new Set<string>();

  let frontendCount = 0;
  let backendCount = 0;

  for (const dir of candidateDirs) {
    if (claimedDirs.has(dir)) continue;

    const frontend = detectFrontend(dir, frontendCount === 0 ? 'Frontend' : `Frontend ${frontendCount + 1}`);
    if (frontend) {
      services.push(frontend);
      claimedDirs.add(dir);
      frontendCount++;
      continue;
    }

    const nodeBackend = detectNodeBackend(dir, backendCount === 0 ? 'Backend' : `Backend ${backendCount + 1}`);
    if (nodeBackend) {
      services.push(nodeBackend);
      claimedDirs.add(dir);
      backendCount++;
      continue;
    }

    const pyBackend = detectPythonBackend(dir, backendCount === 0 ? 'Backend' : `Backend ${backendCount + 1}`);
    if (pyBackend) {
      services.push(pyBackend);
      claimedDirs.add(dir);
      backendCount++;
      continue;
    }
  }

  const docker = detectDocker(rootDir);
  if (docker) services.push(docker);

  return {
    workspaceRoot: rootDir,
    services,
    hasDocker: Boolean(docker),
  };
}
