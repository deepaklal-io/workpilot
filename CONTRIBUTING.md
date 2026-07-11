# Contributing to WorkPilot (Phase 1 MVP internals)

This file is for people working on WorkPilot's codebase. If you're looking for how to
*use* the extension, see the main README on the Marketplace listing instead.

Detects your project stack and starts your entire dev environment from one command.

## What's implemented

- **Scanner** (`src/scanner/`): walks the workspace root + immediate subdirectories
  (covers common layouts like `/client` + `/server`, `/frontend` + `/backend`, or a
  flat single-app repo) and detects:
  - React (CRA), Vite, Next.js — via `package.json` dependencies
  - Express / generic Node backends — via `package.json` dependencies + scripts
  - FastAPI / Django — via `requirements.txt` / `pyproject.toml`
  - Docker Compose — via `docker-compose.yml` presence
- **Commands** (`src/commands/`):
  - `WorkPilot: Scan Project (Preview Plan)` — shows what would run, without starting anything
  - `WorkPilot: Start Project` — opens one terminal per detected service, installs deps
    if `node_modules`/venv look missing, runs the start command, opens the browser
  - `WorkPilot: Stop Project` — sends Ctrl+C and disposes every terminal WorkPilot opened
- **Process tracking** (`src/services/processManager.ts`): a registry so Stop only
  touches terminals WorkPilot created — never terminals the user opened manually.
- **Output panel**: progress is logged to a dedicated "WorkPilot" output channel.

## Run it locally

```bash
npm install
npm run compile
```

Then press **F5** in VS Code (with this folder open as the workspace) — that launches
an Extension Development Host window. Open any React/Express/FastAPI/etc. project in
that window and run `WorkPilot: Start Project` from the Command Palette.

## Known simplifications (by design, for MVP)

- Install-needed heuristic is presence-of-`node_modules`/`venv`, not a real dependency diff.
- FastAPI entrypoint guessing checks `app/main.py` then falls back to `main:app` —
  won't cover unconventional layouts yet.
- No port-conflict detection yet (Phase 2).
- Browser auto-open is a fixed 4s delay, not an actual "server is ready" check (Phase 2:
  poll the port instead).

## Where Phase 2 hooks in

- `services/launcher.ts` is the natural place to add port-conflict detection before
  a terminal is created.
- A new `scanner/mongo.ts` following the same `DetectedService`-returning pattern as
  the existing scanners would slot straight into `scanner/index.ts`.
- Swagger detection can reuse the FastAPI/Express detection results already computed
  (their `url` + `/docs` or `/api-docs` convention).
