# WorkPilot 🚀

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
- **One-click start** — opens a dedicated terminal per service, installs missing dependencies automatically, runs the right start command, and opens your browser when the frontend is ready.
- **One-click stop** — shuts down exactly what WorkPilot started. Never touches terminals you opened yourself.
- **Preview before you run** — `WorkPilot: Scan Project` shows you the exact plan (commands, folders, install steps) before anything executes.

### Supported today

| Frontend | Backend | Infra |
|---|---|---|
| React (CRA) | Express | Docker Compose |
| Vite | FastAPI | |
| Next.js | Django | |

Works with split-repo layouts (`/client` + `/server`, `/frontend` + `/backend`) and flat single-app repos alike — the MERN/PERN monorepo pattern most projects actually use.

## Getting started

1. Install WorkPilot
2. Open your project's root folder in VS Code
3. Open the Command Palette (`Ctrl+Shift+P` / `Cmd+Shift+P`)
4. Run **WorkPilot: Scan Project** to preview what it detects
5. Run **WorkPilot: Start Project** — that's it

Run **WorkPilot: Stop Project** any time to shut everything down cleanly.

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
| `workpilot.installDepsIfMissing` | `true` | Run install commands automatically if dependencies look missing |

## Why WorkPilot

Task runners like `concurrently` or VS Code's own `tasks.json` still require *you* to write the configuration. WorkPilot reads your project the way a new teammate would — by looking at what's actually there — and infers the plan instead of asking you to declare it.

## Known limitations (early release)

- Works off common script names (`dev`, `start`) — highly custom script names may not be picked up yet
- FastAPI entrypoint detection assumes a conventional layout (`main.py` or `app/main.py`)
- No port-conflict detection yet — coming in a future release
- Crash/error notifications require a shell with VS Code shell integration support
  (bash, zsh, PowerShell, fish) — not available in plain `cmd.exe` on Windows

Found a stack it doesn't detect correctly? [Open an issue](https://github.com/REPLACE_WITH_YOUR_USERNAME/workpilot/issues) — real-world project layouts are exactly what shapes the next release.

## License

MIT
