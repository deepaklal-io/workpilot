import * as path from 'path';
import { exists } from '../utils/fs';
import { DetectedService } from '../types';

const COMPOSE_FILENAMES = ['docker-compose.yml', 'docker-compose.yaml', 'compose.yml', 'compose.yaml'];

export function detectDocker(rootDir: string): DetectedService | undefined {
  const found = COMPOSE_FILENAMES.find((f) => exists(path.join(rootDir, f)));
  if (!found) return undefined;

  return {
    name: 'Docker (Compose)',
    type: 'docker',
    cwd: rootDir,
    command: 'docker compose up',
    isWebFacing: false,
  };
}
