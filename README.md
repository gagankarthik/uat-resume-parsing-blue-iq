# Resume Parser — UAT Console

Internal user-acceptance-testing console for the resume-parser API. Upload a
résumé and watch it turn into structured JSON — exactly what a client integration
receives. Sync and async (OCR) jobs both work.

There is **nothing to configure in the UI**: just drag in a résumé. The API base
URL and key live only on the server, so the browser never sees the key.

## Setup

```bash
cp .env.example .env.local   # fill in the two values below
npm install
npm run dev                  # http://localhost:3000
```

`.env.local`:

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the resume-parser API to test against |
| `RESUME_PARSER_API_KEY` | Sent upstream as `X-API-Key`. Never commit a real key. |

## Architecture

- **`/`** — the upload page. Drops the file to the proxy, polls async jobs to
  completion, and renders the parsed résumé (structured view + raw-JSON toggle,
  copy, and download).
- **`/api/proxy/[...path]`** (server route) — forwards resume-parse requests to
  `NEXT_PUBLIC_API_BASE_URL` with the `RESUME_PARSER_API_KEY` as `X-API-Key`, so
  the browser never makes a cross-origin call (no CORS) and never holds the key.
