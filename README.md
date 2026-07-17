# WorkPilot 🚀

[![Visual Studio Marketplace Version](https://img.shields.io/visual-studio-marketplace/v/deepaklal-io.workpilot?label=VS%20Marketplace&color=0078D4)](https://marketplace.visualstudio.com/items?itemName=deepaklal-io.workpilot)
[![Open VSX Version](https://img.shields.io/open-vsx/v/deepaklal-io/workpilot?label=Open%20VSX&color=A60EE5)](https://open-vsx.org/extension/deepaklal-io/workpilot)
[![License: MIT](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

**Stop typing the same six commands every time you open a project.**

WorkPilot scans your workspace, figures out how your frontend and backend actually start, and launches your entire dev environment with one click — no config file to write, no `concurrently` setup, no remembering which folder needs `npm run dev` vs `uvicorn main:app`.

```
Before:                          After:
npm install                      Click "Start Project"
npm run dev
cd backend
npm install
npm run dev
(open browser manually)
```

## Features

- **Zero-config detection** — reads your `package.json`, `requirements.txt`, `pyproject.toml`, and `docker-compose.yml` to figure out your stack. No setup wizard, no YAML to write.
- **Status bar controls** — Start/Stop toggle and a Scan button live at the bottom of VS Code, always visible. No Command Palette typing needed for everyday use.
- **One-click start** — opens a dedicated terminal per service, installs missing dependencies automatically, runs the right start command, and opens your browser when the frontend is ready.
- **Port conflict handling** — checks whether a service's default port is already taken before starting it, and automatically switches to the next free port if so — no manual `EADDRINUSE` debugging.
- **One-click stop** — shuts down exactly what WorkPilot started. Never touches terminals you opened yourself.
- **Preview before you run** — `WorkPilot: Scan Project` shows you the exact plan (commands, folders, install steps) before anything executes.

### Supported today

| Frontend | Backend | Data Apps | Infra |
|---|---|---|---|
| React (CRA) | Express | Streamlit | Docker Compose |
| Vite | FastAPI | | |
| Next.js | Django | | |

Works with split-repo layouts (`/client` + `/server`, `/frontend` + `/backend`) and flat single-app repos alike — the MERN/PERN monorepo pattern most projects actually use.

## Getting started

1. Install WorkPilot
2. Open your project's root folder in VS Code
3. Click **🔍 Scan** in the status bar (bottom right) to preview what it detects — or skip straight to step 4
4. Click **🚀 Start** in the status bar — that's it

Click **⏹ Stop** (same button, now showing Stop) any time to shut everything down cleanly.

Prefer the Command Palette? `Ctrl+Shift+P` / `Cmd+Shift+P` → `WorkPilot: Start Project` / `WorkPilot: Scan Project` / `WorkPilot: Stop Project` work identically.

## Commands

| Command | What it does |
|---|---|
| `WorkPilot: Start Project` | Detects and launches every service in your workspace |
| `WorkPilot: Stop Project` | Stops everything WorkPilot started |
| `WorkPilot: Scan Project (Preview Plan)` | Shows the detected plan without running anything |

## Settings

| Setting | Default | Description |
|---|---|---|
| `workpilot.autoOpenBrowser` | `true` | Open the browser automatically once a frontend service starts |
| `workpilot.installDepsIfMissing` | `true` | Automatically install dependencies when needed. WorkPilot already skips reinstalling if nothing changed since your last successful install — turn this off only if you never want WorkPilot to run install commands, even on a first run. |

## Why WorkPilot

Task runners like `concurrently` or VS Code's own `tasks.json` still require *you* to write the configuration. WorkPilot reads your project the way a new teammate would — by looking at what's actually there — and infers the plan instead of asking you to declare it.

## Known limitations (early release)

- Works off common script names (`dev`, `start`) — highly custom script names may not be picked up yet
- FastAPI/Streamlit entrypoint detection assumes a conventional filename (`main.py`/`app.py`/`app/main.py`/`streamlit_app.py`)
- Auto port-reassignment for React (CRA) and custom Express/Node backends relies on the app reading a `PORT` environment variable — guaranteed for CRA, best-effort for arbitrary Express apps that hardcode their port
- If a reassigned port changes on a backend, and the frontend has a hardcoded API URL or the backend has a CORS allowlist referencing the old port, those may need manual updating — WorkPilot reassigns the port but doesn't rewrite your source code
- Crash/error notifications require a shell with VS Code shell integration support
  (bash, zsh, PowerShell, fish) — not available in plain `cmd.exe` on Windows

Found a stack it doesn't detect correctly? [Open an issue](https://github.com/REPLACE_WITH_YOUR_USERNAME/workpilot/issues) — real-world project layouts are exactly what shapes the next release.

## License

MIT
