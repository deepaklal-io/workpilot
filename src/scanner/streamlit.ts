import * as path from 'path';
import { exists, readText } from '../utils/fs';
import { buildPipInstall } from '../utils/python';
import { DetectedService } from '../types';

/** Checked in priority order — first one that exists on disk wins. */
const ENTRYPOINT_CANDIDATES = ['streamlit_app.py', 'app.py', 'main.py'];

function hasStreamlitDependency(dir: string): boolean {
  const req = readText(path.join(dir, 'requirements.txt')) ?? '';
  const pyproject = readText(path.join(dir, 'pyproject.toml')) ?? '';
  return (req + '\n' + pyproject).toLowerCase().includes('streamlit');
}

function guessEntrypoint(dir: string): string | undefined {
  return ENTRYPOINT_CANDIDATES.find((f) => exists(path.join(dir, f)));
}

/**
 * Inspects a directory for a Streamlit dependency and returns a
 * DetectedService if found. Runs via `python -m streamlit run <entry>` using
 * the venv's own Python — same cross-shell-safe approach as FastAPI/Django.
 *
 * If `streamlit` is in the dependencies but none of the common entrypoint
 * filenames exist, this deliberately returns undefined rather than guessing
 * wrong — a bad guessed command is worse than no detection at all.
 */
export function detectStreamlit(dir: string, labelPrefix = 'App'): DetectedService | undefined {
  if (!hasStreamlitDependency(dir)) return undefined;

  const entry = guessEntrypoint(dir);
  if (!entry) return undefined;

  const { python, installCommand } = buildPipInstall(dir);

  return {
    name: `${labelPrefix} (Streamlit)`,
    type: 'streamlit',
    cwd: dir,
    command: `${python} -m streamlit run ${entry}`,
    installCommand,
    isWebFacing: true,
    url: 'http://localhost:8501',
  };
}
