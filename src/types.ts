export type ServiceType =
  | 'react'
  | 'vite'
  | 'next'
  | 'express'
  | 'fastapi'
  | 'django'
  | 'docker'
  | 'generic-node'
  | 'generic-python';

export interface DetectedService {
  /** Human readable name shown in terminal tab + output panel, e.g. "Frontend (Vite)" */
  name: string;
  type: ServiceType;
  /** Absolute path to run the command from */
  cwd: string;
  /** The command to run to start this service, e.g. "npm run dev" */
  command: string;
  /** Optional install command to run first if dependencies look missing */
  installCommand?: string;
  /** Whether this service is likely to open a browser-facing URL */
  isWebFacing?: boolean;
  /** Best-guess local URL, if known (e.g. from vite/CRA defaults) */
  url?: string;
}

export interface ScanResult {
  workspaceRoot: string;
  services: DetectedService[];
  hasDocker: boolean;
  /** Names of native services that were detected but dropped because Docker
   *  Compose already builds/runs that same directory — avoids double-starting
   *  the same app natively and inside a container at once. */
  skippedByDocker: string[];
  /** package.json/requirements.txt/pyproject.toml files that exist on disk
   *  but couldn't actually be read — usually a cloud-sync placeholder
   *  (OneDrive/Dropbox Files-On-Demand) that hasn't downloaded yet. Surfaced
   *  so a zero-result scan doesn't look like "wrong/unsupported stack" when
   *  it's actually a file-access problem. */
  unreadableMarkerFiles: string[];
}