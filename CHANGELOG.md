# Changelog

## 0.1.1 — Initial release

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