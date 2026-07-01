// Client-side Cognito wrapper (amazon-cognito-identity-js). The pool must allow
// email as the sign-in identifier. Mirrors the product UI's auth.

import { AuthenticationDetails, CognitoUser, CognitoUserPool } from "amazon-cognito-identity-js";

function pool(): CognitoUserPool {
  const UserPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
  const ClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
  if (!UserPoolId || !ClientId) {
    throw new Error("Cognito is not configured. Set NEXT_PUBLIC_COGNITO_USER_POOL_ID and NEXT_PUBLIC_COGNITO_CLIENT_ID.");
  }
  return new CognitoUserPool({ UserPoolId, ClientId });
}

/** Returns the Cognito ID token (JWT) on success. */
export function signIn(email: string, password: string): Promise<string> {
  const details = new AuthenticationDetails({ Username: email, Password: password });
  const u = new CognitoUser({ Username: email, Pool: pool() });
  return new Promise((resolve, reject) => {
    u.authenticateUser(details, {
      onSuccess: (session) => resolve(session.getIdToken().getJwtToken()),
      onFailure: (err) => reject(err),
      newPasswordRequired: () => reject(new Error("A new password is required for this account. Contact an admin.")),
    });
  });
}

export function signOutLocal(): void {
  try {
    pool().getCurrentUser()?.signOut();
  } catch {
    /* pool not configured — nothing to clear */
  }
}
