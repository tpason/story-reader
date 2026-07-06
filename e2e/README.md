# Story Reader E2E (Playwright)

Automated UX checks for the chapter reader and discovery/rankings surfaces. Reuses an already-running Next.js server by default (does **not** start `next dev` unless opted in).

## Prerequisites

1. Story reader dev server with **latest code** (not stale Docker image on :3000)
2. PostgreSQL with at least one polished/readable story (chapter 1 content > 200 chars)

```bash
# Dev server (default port 3003 if :3000 is taken by Docker)
cd story_reader && PORT=3003 npm run dev

# Or point tests at your server:
PLAYWRIGHT_BASE_URL=http://127.0.0.1:3003 npm run test:e2e
```

Default `playwright.config.ts` base URL is `http://127.0.0.1:3003`.

Optional auto-start (local only — can spike RAM):

```bash
PLAYWRIGHT_START_SERVER=1 npm run test:e2e:discovery
```

## Commands

```bash
# Install browser once
npx playwright install chromium

# Run all E2E (desktop + mobile, sequential)
npm run test:e2e

# Desktop only
npm run test:e2e:desktop

# Discovery / rankings / following (lighter than full reader suite)
npm run test:e2e:discovery

# Rankings + following only
npm run test:e2e:rankings

# Reader polish specs (resume bar, heatmap, offline cache, keyboard help, account nav)
npm run test:e2e:polish

# Realtime / WebSocket specs (requires dev:ws — see below)
npm run test:e2e:realtime

# Open last HTML report
npx playwright show-report e2e-report
```

## Environment

| Variable | Default | Notes |
|---|---|---|
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3003` | Target server |
| `PLAYWRIGHT_START_SERVER` | off | Set `1` to run `PORT=3003 npm run dev` before tests |
| `PLAYWRIGHT_READER_PATH` | fixed slug path | Override reader fixture URL |
| `PLAYWRIGHT_READER_REALTIME_TOKEN` | — | Match server `READER_REALTIME_TOKEN` for broadcast auth tests |

## Spec map

| File | Covers |
|---|---|
| `home-ux.spec.ts` | Resume bar, topbar nav (Thiên bảng, Tủ truyện), trending period chips, follow shelf |
| `rankings-ux.spec.ts` | `/rankings` tabs, period chips, empty/fallback, story links, mobile overflow |
| `following-ux.spec.ts` | `/following` empty + seeded shelf, homepage follow CTAs |
| `reader-smoke.spec.ts` | Reader shell, theme, in-chapter search |
| `reader-polish.spec.ts` | Story detail resume/heatmap, account offline cache, **account section nav**, keyboard help |
| `reader-ux-audit.spec.ts` | Broader reader UX audit + attachments |
| `identity-modal.spec.ts` | Guest identity modal desktop/mobile |
| `realtime.spec.ts` | WebSocket health, broadcast API, notification live |

## Rankings / following notes

- **Thiên bảng** may show 200+ stories after `refresh_story_analytics.py`; **Phong vân** may be empty until reading sessions exist (≥5s/chapter). Tests accept list, empty state, or Thiên bảng fallback.
- Follow shelf tests seed `localStorage` key `reader:follows` (same as guest follow persistence).

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
- **`e2e/reader-polish.spec.ts`** — story detail resume bar + heatmap, account offline cache + section nav, keyboard help (`?`), sidebar heatmap
- **Discovery** — homepage trending periods, rankings tabs, following shelf/page
- Mobile dock + settings sheet tabs
- Horizontal overflow
- Paginated reading mode
- Identity modal (portal / mobile sheet)
- Realtime health, broadcast API, notification Live indicator
- Console error capture (warnings in attachments)

Findings are attached per test as `*-audit*.json` for triage.

## When UI changes

1. Update selectors in the relevant `e2e/*.spec.ts` (prefer roles/labels over brittle CSS).
2. Extend `e2e/helpers.ts` if a new storage seed or navigation helper is reused.
3. Run `npm run test:e2e:discovery` after rankings/following/home changes.
4. Run `npm run test:e2e:polish` after account/reader polish changes.
