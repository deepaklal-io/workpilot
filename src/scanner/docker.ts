import * as path from 'path';
import { exists, readText } from '../utils/fs';
import { DetectedService } from '../types';

const COMPOSE_FILENAMES = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];

export interface DockerDetection {
  service: DetectedService;
  /** Absolute paths referenced by `build:`/`context:` entries in the compose file —
   *  i.e. directories Docker Compose will already build/run itself. */
  referencedDirs: string[];
}

/**
 * Very lightweight compose-file scan: pulls out any `build:` or `context:`
 * path values via regex rather than a full YAML parse (keeps WorkPilot
 * dependency-free). Good enough to catch the common cases:
 *   build: ./backend
 *   build:
 *     context: ../frontend
 */
function extractBuildContextDirs(composeFilePath: string, rootDir: string): string[] {
  const text = readText(composeFilePath);
  if (!text) return [];

  const dirs: string[] = [];
  const lineRegex = /^\s*(?:build|context)\s*:\s*["']?(\.{1,2}\/[^"'\s#]+|\.{1,2})["']?\s*$/;

  for (const line of text.split('\n')) {
    const match = line.match(lineRegex);
    if (match) {
      const relPath = match[1];
      dirs.push(path.resolve(rootDir, relPath));
    }
  }
  return dirs;
}

export function detectDocker(rootDir: string): DockerDetection | undefined {
  const found = COMPOSE_FILENAMES.find((f) => exists(path.join(rootDir, f)));
  if (!found) return undefined;

  const composeFilePath = path.join(rootDir, found);
  const referencedDirs = extractBuildContextDirs(composeFilePath, rootDir);

  return {
    service: {
      name: 'Docker (Compose)',
      type: 'docker',
      cwd: rootDir,
      command: 'docker compose up',
      isWebFacing: false,
    },
    referencedDirs,
  };
}