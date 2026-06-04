# BetterBox Story Reader

Dedicated Next.js reading UI for existing BetterBox story/chapter/audio data.

```bash
cd story_reader
npm install
npm run dev
```

The app reads metadata from Postgres using `STORY_DATABASE_URL`.

```bash
cp .env.example .env.local
```

For production/PWA testing, build and run `next start` so the browser can register `/sw.js`:

```bash
npm run build
npm run start
```

The reader caches visited pages, static assets, and chapter payloads for offline reading. It also stores chapter payloads in IndexedDB from the reader UI.

Realtime chapter notifications use `/api/notifications` with polling by default. For local realtime WebSocket, run the custom Next server:

```bash
npm run dev:ws
```

or after build:

```bash
npm run build
npm run start:ws
```

The custom server exposes WebSocket at `/reader-ws`. The frontend connects to the current host automatically. To point the frontend to another broadcast service, set:

```bash
NEXT_PUBLIC_READER_WS_URL=ws://localhost:4000
```

The client subscribes with `{ type: "subscribe", scope: "reader_updates" }` and refreshes notifications when it receives `story_update`, `chapter_update`, or `notification_update`.

Workers/crawlers can broadcast after adding chapters:

```bash
curl -X POST http://localhost:3000/api/realtime/broadcast \
  -H "Content-Type: application/json" \
  -d '{"type":"chapter_update","storyId":"<uuid>","chapterNumber":128}'
```

In production, set `READER_REALTIME_TOKEN` and send it as `Authorization: Bearer <token>` or `x-reader-realtime-token`.

This app does not crawl, polish, generate audio, or change the story import/audio pipeline.
