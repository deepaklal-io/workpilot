export type ServiceType =
  | 'react'
  | 'vite'
  | 'next'
  | 'express'
  | 'fastapi'
  | 'django'
  | 'streamlit'
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
  /** Commands to run before `command`, in order, each sent as its own
   *  terminal line. Using an array instead of one string joined with `&&`
   *  avoids a real cross-shell bug: `&&` only works as a chaining operator
   *  in PowerShell 7+, not the legacy "Windows PowerShell" 5.1 that's still
   *  the default on many Windows machines. Separate lines work everywhere. */
  installCommand?: string[];
  /** Whether this service is likely to open a browser-facing URL */
  isWebFacing?: boolean;
  /** Best-guess local URL, if known (e.g. from vite/CRA defaults) */
  url?: string;
  /** Environment variables to set on the terminal, if this service needs
   *  them (e.g. Create React App only respects a PORT env var — it has no
   *  CLI flag for choosing a port). */
  env?: Record<string, string>;
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
