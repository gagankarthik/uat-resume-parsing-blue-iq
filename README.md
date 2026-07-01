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
| `NEXT_PUBLIC_API_BASE_URL` | Base URL of the resume-parser API to test against (production: `https://api.parsinglab.blue-iq.ai`) |
| `RESUME_PARSER_API_KEY` | Sent upstream as `X-API-Key`. Never commit a real key. |

## Architecture

- **`/`** — the API console. A sidebar switches between every API-key endpoint;
  each panel issues live requests and shows the real HTTP status, latency, and
  response (structured view + raw JSON, copy/download). Panels live in
  `components/console/`.
- **`/api/proxy/[...path]`** (server route) — a generic pass-through that forwards
  any request (multipart, JSON, or query) to `NEXT_PUBLIC_API_BASE_URL` with the
  `RESUME_PARSER_API_KEY` as `X-API-Key`, so the browser never makes a
  cross-origin call (no CORS) and never holds the key.

### Endpoints exercised

| Panel | Endpoint(s) |
|---|---|
| Parse résumé | `POST /resume/parse` (+ polls `GET /resume/job/{id}` for async) |
| Batch parse | `POST /resume/batch` (+ polls `GET /resume/batch/{id}`) |
| Large files | `POST /resume/upload-url` → direct S3 upload → `POST /resume/parse-uploaded` |
| Job status & retry | `GET /resume/job/{id}`, `POST /resume/{id}/retry` |
| Feedback | `POST /resume/{id}/feedback` |
| Webhooks | `GET`/`POST /webhooks`, `DELETE /webhooks/{id}` |
| Health | `GET /health` |
