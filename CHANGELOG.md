# Changelog

## 0.1.3

- Fixed Streamlit entrypoint detection: previously only checked the project root for
  streamlit_app.py/app.py/main.py — now also checks common `app/` and `src/` subfolders
  (e.g. `app/streamlit_app.py`), a layout at least as common as a bare root file

## 0.1.2

- Status bar Start/Scan/Stop buttons — no Command Palette needed for everyday use.
  Start/Stop is one toggle button that reflects real state (busy spinner while
  working, Stop shown while running); Scan is a separate always-available button
- Port conflict detection: checks whether a service's default port is already taken
  before starting it, and automatically switches to the next free port using the
  correct mechanism per framework (CLI flag for Vite/Next.js/FastAPI/Django/Streamlit,
  `PORT` env var for React/Express — no shell-specific syntax involved)
- Auto-opened browser now prefers an actual frontend (React/Vite/Next/Streamlit) over
  a bare backend when both are running — previously could open a blank FastAPI/Express
  root route instead of the real app
- Browser auto-open now polls the URL until the server actually responds, instead of
  guessing a fixed 4-second delay — fixes "can't reach this page" on slower startups
- Fixed an intermittent race condition where a command sent to a freshly created
  terminal could be dropped or garbled if sent before the shell finished initializing
  (most visible on PowerShell) — added a short delay before the first command and
  between subsequent ones
- Fixed install-caching correctness: the "install succeeded" marker was previously
  written unconditionally after `pip install`, even if it had actually failed —
  causing later runs to wrongly skip a install that never truly completed. Now the
  marker is only written after confirming a real exit code of 0 via VS Code's shell
  integration API, from the extension itself rather than shell command chaining
- Requirements-hash caching: Python installs are now skipped entirely if
  `requirements.txt` is unchanged since the last successful install, and
  automatically re-run only when it actually changes — not on every single Start
- Streamlit support: detects `streamlit` in `requirements.txt`/`pyproject.toml`, guesses the
  entrypoint (`streamlit_app.py`/`app.py`/`main.py`), and runs it via the venv's own Python
- Fixed a real bug in FastAPI/Django install & start commands: they previously called the
  system-wide `pip`/`uvicorn` instead of the project's own virtual environment, since nothing
  ever activated it. Now invokes the venv's own Python directly, which needs no activation
  step and works identically across PowerShell, cmd.exe, and bash/zsh
- Fixed two related cross-shell bugs: (1) an absolute, quoted path as the first command
  token is parsed as plain text by PowerShell without the `&` call operator, which in turn
  breaks bash/zsh — switched to a path relative to the terminal's working directory instead;
  (2) `&&` for chaining venv creation with install doesn't exist in legacy Windows
  PowerShell 5.1 — each command is now sent as its own line instead of being joined

## 0.1.0 — Initial release

- Scanner: detects React, Vite, Next.js, Express, FastAPI, Django, Docker Compose
- `WorkPilot: Scan Project` — preview the detected plan
- `WorkPilot: Start Project` — launches every detected service in its own terminal,
  installs dependencies if missing, opens the browser
- `WorkPilot: Stop Project` — stops everything WorkPilot started
- Crash detection: unexpected non-zero exits in a WorkPilot-owned terminal (failed
  installs, servers that error out on startup) are logged to the Output panel and
  surfaced as a warning notification with a "Show Terminal" shortcut. Requires a
  shell that supports VS Code's shell integration (bash/zsh/pwsh/fish — not cmd.exe);
  degrades silently on unsupported shells or older VS Code versions.