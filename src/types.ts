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
}
