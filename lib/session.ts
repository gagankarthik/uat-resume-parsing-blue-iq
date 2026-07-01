// Server-side session: the verified Cognito ID token lives in an httpOnly cookie.
// Verified (signature, expiry, audience) with aws-jwt-verify on every use.

import { CognitoJwtVerifier } from "aws-jwt-verify";
import { cookies } from "next/headers";

const COOKIE = "rp_uat_id_token";

export interface SessionClaims {
  sub: string;
  email: string;
  name?: string;
}

const USER_POOL_ID = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID || "";
const CLIENT_ID = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID || "";

let _verifier: ReturnType<typeof CognitoJwtVerifier.create> | null = null;
function verifier() {
  if (!_verifier) {
    _verifier = CognitoJwtVerifier.create({ userPoolId: USER_POOL_ID, tokenUse: "id", clientId: CLIENT_ID });
  }
  return _verifier;
}

export async function verifyIdToken(token: string): Promise<SessionClaims | null> {
  if (!USER_POOL_ID || !CLIENT_ID) return null;
  try {
    const payload = await verifier().verify(token);
    const email = String(payload.email ?? "");
    if (!email) return null;
    return { sub: String(payload.sub), email, name: payload.name ? String(payload.name) : undefined };
  } catch {
    return null;
  }
}

export async function setSession(idToken: string): Promise<void> {
  (await cookies()).set(COOKIE, idToken, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24,
  });
}

export async function clearSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function getSessionClaims(): Promise<SessionClaims | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  return verifyIdToken(token);
}
