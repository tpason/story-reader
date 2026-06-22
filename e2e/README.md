# Story Reader E2E (Playwright)

Automated UX checks for the chapter reader. Reuses an already-running Next.js server (does **not** start `next dev`).

## Prerequisites

1. DB + story reader running at `http://127.0.0.1:3000`
2. At least one story with chapter 1 readable in DB

## Commands

```bash
# Install browser once
npx playwright install chromium

# Run all E2E (desktop + mobile, sequential)
npm run test:e2e

# Desktop only
npm run test:e2e -- --project=desktop

# Open last HTML report
npx playwright show-report e2e-report
```

## Environment

| Variable | Default |
|---|---|
| `PLAYWRIGHT_BASE_URL` | `http://127.0.0.1:3000` |

## What the audit covers

- Reader shell + chapter content load
- Theme / OLED toggle
- In-chapter search (`Ctrl+F`)
- Focus mode
- Comments accordion
- Mobile dock + settings sheet tabs
- Horizontal overflow
- Paginated reading mode
- Console error capture (warnings in attachments)

Findings are attached per test as `*-audit*.json` for triage.
