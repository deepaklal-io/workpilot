import * as path from 'path';
import { listSubdirs, checkFileReadable } from '../utils/fs';
import { detectFrontend } from './react';
import { detectNodeBackend } from './express';
import { detectPythonBackend } from './fastapi';
import { detectStreamlit } from './streamlit';
import { detectDocker } from './docker';
import { DetectedService, ScanResult } from '../types';


/** How many folder levels deep (below the workspace root) to look for
 *  services. 1 misses common layouts like /apps/frontend or /packages/api,
 *  so we go a bit deeper — capped for performance on very large repos. */
const MAX_SCAN_DEPTH = 3;
const MAX_CANDIDATE_DIRS = 300;

/** Breadth-first walk collecting every directory up to maxDepth levels
 *  below root (root itself included), reusing listSubdirs' built-in
 *  ignore list (node_modules, .git, dist, build, venv, etc.). */
function collectCandidateDirs(root: string, maxDepth: number): string[] {
  const result: string[] = [root];
  let frontier = [root];

  for (let depth = 0; depth < maxDepth; depth++) {
    const next: string[] = [];
    for (const dir of frontier) {
      next.push(...listSubdirs(dir));
      if (result.length + next.length > MAX_CANDIDATE_DIRS) break;
    }
    result.push(...next);
    frontier = next;
    if (result.length > MAX_CANDIDATE_DIRS) break;
  }

  return result;
}

/**
 * Scans the workspace root and up to MAX_SCAN_DEPTH levels of subdirectories
 * (covers common monorepo layouts like /client + /server, /apps/frontend +
 * /apps/backend, or a flat single-app repo) and returns every service
 * WorkPilot can start.
 *
 * Detection order per directory: frontend (Next/Vite/React) -> Node backend
 * (Express/generic) -> Python backend (FastAPI/Django). First match wins
 * per directory so we don't double-claim the same folder.
 *
 * If a docker-compose file is found and its build/context paths match a
 * directory we also detected natively, the native entry is dropped — running
 * both would double-start the same app and fight over the same port.
 */
export function scanWorkspace(rootDir: string): ScanResult {
  const candidateDirs = collectCandidateDirs(rootDir, MAX_SCAN_DEPTH);
  const services: DetectedService[] = [];
  const claimedDirs = new Set<string>();

  let frontendCount = 0;
  let backendCount = 0;
  let appCount = 0;

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
    const streamlitApp = detectStreamlit(dir, appCount === 0 ? 'App' : `App ${appCount + 1}`);
      if (streamlitApp) {
        services.push(streamlitApp);
        claimedDirs.add(dir);
        appCount++;
        continue;
    }
  }

  const docker = detectDocker(rootDir);
  const skippedByDocker: string[] = [];
  let finalServices = services;

  if (docker) {
    const referenced = new Set(docker.referencedDirs.map((d) => path.resolve(d)));
    finalServices = services.filter((s) => {
      const isCoveredByCompose = referenced.has(path.resolve(s.cwd));
      if (isCoveredByCompose) skippedByDocker.push(s.name);
      return !isCoveredByCompose;
    });
    finalServices.push(docker.service);
  }

  // Only worth the extra fs checks when detection came up empty — this is
  // purely a diagnostic to explain *why*, not something needed on the happy path.
  const unreadableMarkerFiles: string[] = [];
  if (finalServices.length === 0) {
    const markerFiles = ['package.json', 'requirements.txt', 'pyproject.toml'];
    for (const dir of candidateDirs) {
      for (const marker of markerFiles) {
        const markerPath = path.join(dir, marker);
        if (checkFileReadable(markerPath) === 'unreadable') {
          unreadableMarkerFiles.push(markerPath);
        }
      }
    }
  }

  return {
    workspaceRoot: rootDir,
    services: finalServices,
    hasDocker: Boolean(docker),
    skippedByDocker,
    unreadableMarkerFiles,
  };
}