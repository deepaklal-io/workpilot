import * as path from 'path';
import { exists, readText } from '../utils/fs';
import { buildPipInstall } from '../utils/python';
import { DetectedService } from '../types';

/** Checked in priority order — first one that exists on disk wins. Checked
 *  both at the project root and inside common subfolders, since a real-world
 *  layout like `app/streamlit_app.py` is at least as common as a bare root
 *  `app.py` — Django/Flask-style `app/` and `src/` conventions carry over. */
const ENTRYPOINT_FILENAMES = ['streamlit_app.py', 'app.py', 'main.py'];
const ENTRYPOINT_SUBDIRS = ['', 'app', 'src'];

function hasStreamlitDependency(dir: string): boolean {
  const req = readText(path.join(dir, 'requirements.txt')) ?? '';
  const pyproject = readText(path.join(dir, 'pyproject.toml')) ?? '';
  return (req + '\n' + pyproject).toLowerCase().includes('streamlit');
}

/** Returns the entrypoint path relative to dir (e.g. "app.py" or
 *  "app/streamlit_app.py"), checking the root first, then subfolders — so a
 *  root-level match is always preferred over a nested one of the same name. */
function guessEntrypoint(dir: string): string | undefined {
  for (const subdir of ENTRYPOINT_SUBDIRS) {
    for (const filename of ENTRYPOINT_FILENAMES) {
      const relPath = subdir ? path.join(subdir, filename) : filename;
      if (exists(path.join(dir, relPath))) return relPath;
    }
  }
  return undefined;
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
