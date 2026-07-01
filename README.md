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
| `NEXT_PUBLIC_COGNITO_USER_POOL_ID` / `NEXT_PUBLIC_COGNITO_CLIENT_ID` | Cognito pool for sign-in (same pool as the product UI). |
| `ADMIN_EMAILS` | Comma-separated operator emails allowed into `/admin` (the DynamoDB viewer). |
| `NEXT_PUBLIC_AWS_REGION` / `NEXT_PUBLIC_AWS_ACCESS_KEY_ID` / `NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY` | Credentials used **server-side only** to scan DynamoDB for the admin viewer. Prefer a read-only key. |
| `DYNAMODB_TABLE_*` | Optional table-name overrides (defaults to `resume-parser-*`). |

## Auth & access

- **Sign in required.** Every page and the proxy require a verified Cognito
  session (ID token in an httpOnly cookie, verified with `aws-jwt-verify`). Sign
  in at `/login`; the flow mirrors the product UI.
- **`/admin` (operators only).** Emails in `ADMIN_EMAILS` get a read-only viewer
  of the live resume-parser DynamoDB tables (companies, API keys, audit logs,
  jobs, batches, webhooks, feedback) — table + raw-JSON views with filtering.

## Architecture

- **`/`** — the API console. A sidebar switches between every API-key endpoint;
  each panel issues live requests and shows the real HTTP status, latency, and
  response (structured view + raw JSON, copy/download). Panels live in
  `components/console/`.
- **`/api/proxy/[...path]`** (server route) — a session-gated pass-through that
  forwards any request (multipart, JSON, or query) to `NEXT_PUBLIC_API_BASE_URL`
  with the `RESUME_PARSER_API_KEY` as `X-API-Key`, so the browser never makes a
  cross-origin call (no CORS) and never holds the key.

### Endpoints exercised

| Panel | Endpoint(s) |
|---|---|
| Parse resume | `POST /resume/parse` (+ polls `GET /resume/job/{id}` for async) |
| Batch parse | `POST /resume/batch` (+ polls `GET /resume/batch/{id}`) |
| Large files | `POST /resume/upload-url` → direct S3 upload → `POST /resume/parse-uploaded` |
| Job status & retry | `GET /resume/job/{id}`, `POST /resume/{id}/retry` |
| Feedback | `POST /resume/{id}/feedback` |
| Webhooks | `GET`/`POST /webhooks`, `DELETE /webhooks/{id}` |
| Health | `GET /health` |
