# BetterBox Story Reader

Dedicated Next.js reading UI for existing BetterBox story/chapter/audio data.

```bash
cd story_reader
npm install
npm run dev
```

The app reads metadata from Postgres using `STORY_DATABASE_URL`.

Local covers (npm on `:3000`): ComfyUI files live in parent `story_data/covers/`. Docker mounts that path; local Next only serves `public/covers/`. Sync missing files without replacing the directory:

```bash
bash scripts/link-local-covers.sh
```

## Daily development (no Docker rebuild)

Edit UI on the host with hot reload + WebSocket. Docker `story-reader` on `:3000` can stay running for the rest of the stack.

```bash
# From repo root — loads root .env, DB @127.0.0.1:54329, app @ :3003
bash docker/scripts/dev-story-reader.sh

# Or from story_reader/
npm run dev:local
```

Open **http://127.0.0.1:3003**. Pipeline workers in Docker should use (in root `.env` while developing):

```env
READER_REALTIME_DEV_URL=http://host.docker.internal:3003
```

`READER_REALTIME_URL=http://story-reader:3000` stays for production — workers prefer `READER_REALTIME_DEV_URL` when set. Restart workers after changing `.env`.

Quick commands from repo root:

```bash
make reader-dev          # hot reload dev server
make reader-verify       # curl health + broadcast (safe)
make reader-test-unit    # node unit tests only
```

Verify (curl only — safe, no Playwright):

```bash
bash docker/scripts/verify-reader-dev.sh
# or API-only E2E: cd story_reader && npm run test:e2e:realtime:api
```

Avoid running full `test:e2e:realtime` while the server is still compiling — can spike RAM and crash the machine.

Alternative: dev inside Docker with volume mount (first start runs `npm ci`):

```bash
docker compose stop story-reader   # optional — frees :3000
docker compose --profile dev up -d story-reader-dev
```

Production deploy still uses `docker compose build story-reader && docker compose up -d story-reader` when you are done editing.

```bash
cp .env.example .env.local
```

For production/PWA testing, build and run `next start` so the browser can register `/sw.js`:

```bash
npm run build
npm run start
```

The reader caches visited pages, static assets, and chapter payloads for offline reading. It also stores chapter payloads in IndexedDB from the reader UI.

## Realtime notifications (WebSocket)

Chapter notifications use `/api/notifications`. By default the UI **polls every 60s**. For live updates, run the custom Next server (HTTP + WebSocket on the same port):

```bash
npm run dev:ws
```

After build:

```bash
npm run build
npm run start:ws
```

The custom server exposes WebSocket at `/reader-ws`. The frontend connects to the current host automatically unless you set:

```bash
NEXT_PUBLIC_READER_WS_URL=ws://localhost:4000/reader-ws
```

Behind HTTPS reverse proxy, bake `wss://your-domain.example/reader-ws` at Docker build time (`NEXT_PUBLIC_READER_WS_URL` build arg).

The client subscribes with `{ type: "subscribe", scope: "reader_updates", storyIds: [...] }` and refreshes when it receives `story_update`, `chapter_update`, or `notification_update`.

### Broadcast API (pipeline → reader)

Workers POST to `/api/realtime/broadcast`:

```bash
curl -X POST http://localhost:3000/api/realtime/broadcast \
  -H "Authorization: Bearer $READER_REALTIME_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"type":"chapter_update","storyId":"<uuid>","chapterNumber":128}'
```

### Generate `READER_REALTIME_TOKEN`

Use a strong random secret (64+ chars). From repo root:

```bash
bash docker/scripts/generate-reader-realtime-token.sh
# or ready-to-paste .env block:
bash docker/scripts/print-reader-realtime-env.sh
```

Paste the output into **root** `.env` as `READER_REALTIME_TOKEN=...` (same value for `story-reader` and pipeline workers). Do not commit the token.

| Mode | Token required? |
|---|---|
| Local `dev:ws` without token | No (dev only) |
| Docker `story-reader` (`NODE_ENV=production`) | **Yes** — missing token → broadcast 401 |
| Playwright auth tests | Set `PLAYWRIGHT_READER_REALTIME_TOKEN` matching server |

Health check:

```bash
curl http://localhost:3000/api/health
# {"ok":true,"websocket":true,"timestamp":"..."}
```

`websocket: false` means plain `next dev` / `next start` — no live notifications.

### Docker

Root `docker-compose.yml` `story-reader` runs `npm run start:ws`. Pipeline workers broadcast via:

```env
READER_REALTIME_URL=http://story-reader:3000
READER_REALTIME_TOKEN=<output of generate-reader-realtime-token.sh>
```

Crawl (`crawl_stories_from_db.py`) and polish (`polish_worker.py`) call `scripts/story_pipeline/reader_realtime_broadcast.py` automatically when `READER_REALTIME_URL` is set.

```bash
cp docker/env.example .env
# Add READER_REALTIME_TOKEN from generate script
docker compose build story-reader && docker compose up -d story-reader
bash docker/scripts/smoke-reader-realtime.sh
```

Docker healthcheck requires `"websocket": true` on `/api/health`.

### E2E tests

Realtime Playwright specs need the WebSocket server (`dev:ws` disables image optimization in dev to reduce node crashes during E2E):

```bash
# Terminal 1
cd story_reader && PORT=3003 npm run dev:ws

# Terminal 2
cd story_reader && npm run test:e2e:realtime
```

Optional auth coverage (server must use the same token):

```bash
# Terminal 1
READER_REALTIME_TOKEN=$(bash ../docker/scripts/generate-reader-realtime-token.sh) \
  PORT=3003 npm run dev:ws

# Terminal 2 — prints token and runs auth specs
cd story_reader && npm run test:e2e:realtime:auth
```

This app does not crawl, polish, generate audio, or change the story import/audio pipeline.
