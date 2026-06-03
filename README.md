# Resume Parser — UAT Console

Internal user-acceptance-testing console for the resume-parser API. Two functions:

1. **API Key Management** (`/keys`) — issue, list, revoke, and delete API keys for client
   companies, with per-key rate limits. Talks to the `resume-parser-api-keys` DynamoDB
   table directly from the Next.js server (the raw key is shown once at creation).
2. **Test the Parser** (`/test`) — upload a resume and watch the extracted fields populate
   editable text boxes (the client auto-fill use case). Sync and async (OCR) jobs both work.

> ⚠️ Internal tool. It holds AWS credentials server-side and can mint API keys — do not
> expose it publicly without setting `ADMIN_PASSWORD` (and ideally network restrictions).

## Setup

```bash
cp .env.local.example .env.local   # fill in AWS creds + table name
npm install
npm run dev                        # http://localhost:3000
```

Then open **Settings** and set:
- **API Base URL** — the resume-parser endpoint (defaults to the current Function URL)
- **API Key** — used when testing the parser (create one under API Keys)
- **Admin Password** — only if the server has `ADMIN_PASSWORD` set

## Architecture

- **`/api/keys`** (server routes) → DynamoDB via the AWS SDK. Mirrors the backend's key
  scheme exactly: `rp_live_` + base64url(32 bytes), SHA-256 hashed, only the hash stored.
- **`/api/proxy/[...path]`** (server route) → forwards resume-parse requests to the API with
  the `X-API-Key` header, so the browser never makes a cross-origin call (no CORS issues).

## Environment variables

| Var | Purpose |
|---|---|
| `AWS_REGION` | AWS region (default `us-east-2`) |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS access for DynamoDB |
| `DYNAMODB_TABLE_API_KEYS` | API-keys table (default `resume-parser-api-keys`) |
| `ADMIN_PASSWORD` | Optional gate for the key-admin routes |
