// Server-side proxy to the resume-parser API (avoids browser CORS).
// The target base URL and API key are read ONLY from server env, so the browser
// never sees the key:
//   • NEXT_PUBLIC_API_BASE_URL — base URL of the resume-parser API
//   • RESUME_PARSER_API_KEY    — sent upstream as X-API-Key
import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

async function forward(req: NextRequest, path: string[]): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim();
  const apiKey = process.env.RESUME_PARSER_API_KEY?.trim() || "";
  if (!baseUrl) {
    return Response.json(
      { error: { detail: "Server is missing NEXT_PUBLIC_API_BASE_URL — set it in .env.local and restart." } },
      { status: 500 },
    );
  }

  const base = baseUrl.replace(/\/+$/, "");
  const target = `${base}/${path.join("/")}${req.nextUrl.search}`;
  const headers: Record<string, string> = {};
  if (apiKey) headers["X-API-Key"] = apiKey;

  const method = req.method.toUpperCase();
  let body: BodyInit | undefined;
  if (method !== "GET" && method !== "HEAD") {
    const contentType = req.headers.get("content-type") ?? "";
    if (contentType.includes("multipart/form-data")) {
      body = await req.formData();
    } else {
      const text = await req.text();
      if (text) {
        body = text;
        headers["Content-Type"] = contentType || "application/json";
      }
    }
  }

  let upstream: Response;
  try {
    upstream = await fetch(target, { method, headers, body });
  } catch (err) {
    return Response.json(
      { error: { detail: `Could not reach API at ${target}: ${err instanceof Error ? err.message : String(err)}` } },
      { status: 502 },
    );
  }

  const respHeaders = new Headers();
  const ct = upstream.headers.get("content-type");
  if (ct) respHeaders.set("content-type", ct);
  const buf = await upstream.arrayBuffer();
  return new Response(buf, { status: upstream.status, headers: respHeaders });
}

type Ctx = { params: Promise<{ path: string[] }> };
export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
