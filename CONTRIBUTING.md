# Contributing to WorkPilot (internals)

This file is for people working on WorkPilot's codebase. If you're looking for how to
*use* the extension, see the main README on the Marketplace listing instead.

## Architecture

```

src/
├── extension.ts              activate(): registers commands, status bar,
│                              crash-detection + install-success-marker listener
├── types.ts                  DetectedService, ScanResult shared types
├── scanner/
│   ├── index.ts               aggregator: walks workspace up to 3 levels deep,
│   │                           runs every detector, resolves docker/native conflicts
│   ├── react.ts                React (CRA) / Vite / Next.js — via package.json deps
│   ├── express.ts              Express / generic Node backend
│   ├── fastapi.ts              FastAPI / Django — via requirements.txt/pyproject.toml
│   ├── streamlit.ts            Streamlit — same requirements.txt detection, guesses
│   │                           entrypoint (streamlit_app.py/app.py/main.py)
│   └── docker.ts               docker-compose.yml presence + build/context dir parsing
├── utils/
│   ├── fs.ts                   file helpers, including checkFileReadable() for the
│   │                           OneDrive/cloud-placeholder diagnostic
│   ├── python.ts                venv path resolution, requirements-hash install caching
│   └── port.ts                  isPortFree/findFreePort (pure net module, no vscode dep)
├── services/
│   ├── launcher.ts              creates terminals, decides install-needed, sends
│   │                           commands with startup/inter-command delays
│   ├── processManager.ts        registry of WorkPilot-owned terminals, for Stop +
│   │                           crash-detection lookup
│   ├── portAllocator.ts         resolvePort(): checks + reassigns a service's port,
│   │                           per-framework (CLI flag vs PORT env var)
│   └── statusBar.ts             Start/Stop toggle + Scan button
└── commands/
├── scan.ts                  preview only, no side effects (besides port probing)
├── start.ts                  full flow: scan → resolve ports → launch → open browser
└── stop.ts                   stops everything WorkPilot started

```

## Key design decisions (and why)

- **Detection walks 3 levels deep**, not just the root — covers `/apps/frontend`-style
  monorepos, not just flat `/client` + `/server`. Capped at 300 candidate directories.
- **Docker vs native conflict avoidance**: if `docker-compose.yml`'s `build`/`context`
  paths match a directory also detected natively, the native entry is dropped — running
  both would double-start the same app on the same port.
- **Python commands never use shell chaining (`&&`)** — legacy Windows PowerShell 5.1
  doesn't support it. Every install/start step is sent as its own terminal line instead.
- **Python paths are relative, prefixed with `./`/`.\`** — both PowerShell and bash
  reject a bare relative path as an unqualified command; an absolute quoted path has
  its own PowerShell parsing issue (needs the `&` call operator, which breaks bash).
- **Install-success marker is written by the extension itself (Node fs), not a shell
  command** — see `writeInstallMarker` in `python.ts`. It's only called from
  `extension.ts`'s shell-integration listener after confirming a real exit code of 0,
  specifically to avoid marking a failed install as successful.
- **A short delay precedes the first `sendText()` call, and between subsequent ones**
  (`launcher.ts`) — VS Code's terminal API doesn't wait for the shell to actually be
  ready before accepting input; sending text too early can drop or garble it.
- **Auto-opened browser prefers an actual frontend/data-app over a bare backend**
  (`UI_TYPES` set in `start.ts`) — opening a bare FastAPI/Express root route usually
  shows a blank/404 response, which looks like a failure even when nothing's wrong.
- **Browser open polls the URL rather than guessing a fixed delay** (`pingUrl` in
  `launcher.ts`) — install time and framework startup time vary too much for a fixed
  wait to be reliable.

## Run it locally

```bash
npm install
npm run compile
```

Press **F5** — opens an Extension Development Host. Open any supported project in that
window and use the status bar buttons or `WorkPilot: Start Project` from the Command Palette.

## Known simplifications (by design)

- Install-needed heuristic for Node projects is presence-of-`node_modules`, not a real
  dependency diff. Python projects use a `requirements.txt` content hash instead (more
  accurate) — see `isPythonDepsUpToDate` in `utils/python.ts`.
- Port reassignment for React (CRA) and custom Express/Node backends relies on the app
  reading a `PORT` env var — guaranteed for CRA, best-effort for arbitrary Express apps.
- No warning yet when a *backend's* reassigned port could break CORS allowlists or a
  frontend's hardcoded API URL — flagged as a real risk, not yet addressed. Candidate
  fix: a louder, harder-to-miss notification specifically for backend port reassignment.
- No prompt yet for choosing frontend-only or backend-only when a project has multiple
  independent services — WorkPilot currently starts everything it detects.

## Where to extend next

- **Frontend-only/backend-only prompt**: natural home is `start.ts`, after `scanWorkspace`
  returns more than one independent service — ask once, remember the choice per workspace
  (e.g. via `context.workspaceState`).
- **MongoDB / Swagger detection**: a new `scanner/mongo.ts` following the same
  `DetectedService`-returning pattern as the existing scanners would slot straight into
  `scanner/index.ts`. Swagger detection can reuse FastAPI/Express results already computed
  (their `url` + `/docs` or `/api-docs` convention).
- **Louder backend-port-change warning**: `portAllocator.ts`'s `resolvePort()` already
  knows when a backend's port changed — the gap is only in how visibly that's surfaced.