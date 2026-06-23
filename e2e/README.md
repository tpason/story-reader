# Story Reader E2E (Playwright)

Automated UX checks for the chapter reader. Reuses an already-running Next.js server (does **not** start `next dev`).

## Prerequisites

1. Story reader dev server with **latest code** (not stale Docker image on :3000)
2. At least one story with chapter 1 readable in DB

```bash
# Dev server (default port 3003 if :3000 is taken by Docker)
cd story_reader && PORT=3003 npm run dev

# Or point tests at your server:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npm run test:e2e
```

Default `playwright.config.ts` base URL is `http://127.0.0.1:3003`.

## Commands

```bash
# Install browser once
npx playwright install chromium

# Run all E2E (desktop + mobile, sequential)
npm run test:e2e

# Desktop only
npm run test:e2e -- --project=desktop

# Reader polish specs only (resume bar, heatmap, offline cache, keyboard help)
npm run test:e2e:polish

# Realtime / WebSocket specs only (requires dev:ws — see below)
npm run test:e2e:realtime

# Open last HTML report
npx playwright show-report e2e-report
```

## Environment

| Variable | Default | Notes |
|---|---|---|
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3003` | Target server |
| `PLAYWRIGHT_READER_PATH` | fixed slug path | Override reader fixture URL |
| `PLAYWRIGHT_READER_REALTIME_TOKEN` | — | Match server `READER_REALTIME_TOKEN` for broadcast auth tests |

## Realtime tests (`e2e/realtime.spec.ts`)

Most specs **skip** unless `/api/health` reports `"websocket": true`.

### Crash safety (important)

`dev:ws` + Playwright **full** realtime suite can spike RAM/CPU (reader page ~3000 modules, exit 139 segfault reported). Prefer:

1. **Daily dev:** `bash docker/scripts/dev-story-reader.sh` — hot reload, no Docker rebuild
2. **Light verify:** `npm run test:e2e:realtime:api` — health + broadcast API only (no homepage UI)
3. **Full UI tests:** run only when needed, server already warm, do not run `next build` in parallel

`next.config.ts` sets `experimental.cpus: 1` and `images.unoptimized` in dev to reduce load.

```bash
# Terminal 1 (from repo root)
bash docker/scripts/dev-story-reader.sh

# Terminal 2 — API-only (safer)
cd story_reader && npm run test:e2e:realtime:api
```

Generate a strong token for auth coverage:

```bash
bash docker/scripts/generate-reader-realtime-token.sh
# or:
bash docker/scripts/print-reader-realtime-env.sh
export READER_REALTIME_TOKEN=<paste>
export PLAYWRIGHT_READER_REALTIME_TOKEN=$READER_REALTIME_TOKEN
PORT=3003 npm run dev:ws   # terminal 1
PLAYWRIGHT_READER_REALTIME_TOKEN=$READER_REALTIME_TOKEN npm run test:e2e:realtime
```

| Spec | Needs `dev:ws` | Needs token env |
|---|---|---|
| `health endpoint returns ok` | No | No |
| `broadcast returns 503` | No (plain `next dev`) | No |
| `broadcast accepts notification_update` | Yes | No (dev without token) |
| `broadcast rejects missing token` | Yes | Yes |
| `notification bell connects on home` | Yes | No |

Live state is exposed on `.notification-bell[data-notification-live="true"]` and inside the open notification panel.

## What the audit covers

- Reader shell + chapter content load
- Theme / OLED toggle
- In-chapter search (`Ctrl+F`)
- Focus mode
- Comments accordion
- **`e2e/reader-polish.spec.ts`** — story detail resume bar + heatmap, account offline cache panel, keyboard help (`?`), sidebar heatmap
- Mobile dock + settings sheet tabs
- Horizontal overflow
- Paginated reading mode
- Identity modal (portal / mobile sheet)
- Realtime health, broadcast API, notification Live indicator
- Console error capture (warnings in attachments)

Findings are attached per test as `*-audit*.json` for triage.
