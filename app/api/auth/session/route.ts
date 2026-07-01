// Exchange a Cognito ID token (from client-side sign-in) for a verified
// httpOnly session cookie. GET returns the current claims.
import { NextRequest } from "next/server";

import { getSessionClaims, setSession, verifyIdToken } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let idToken = "";
  try {
    idToken = (await req.json()).idToken ?? "";
  } catch {
    return Response.json({ error: { detail: "Invalid request" } }, { status: 400 });
  }
  const claims = await verifyIdToken(idToken);
  if (!claims) {
    return Response.json({ error: { detail: "Invalid token" } }, { status: 401 });
  }
  await setSession(idToken);
  return Response.json({ email: claims.email, name: claims.name ?? null });
}

export async function GET() {
  const claims = await getSessionClaims();
  if (!claims) return Response.json({ error: { detail: "Not signed in" } }, { status: 401 });
  return Response.json({ email: claims.email, name: claims.name ?? null });
}
