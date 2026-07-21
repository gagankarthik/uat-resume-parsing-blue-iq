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

/**
 * Result of a sign-in attempt.
 *  - "SUCCESS": we have the Cognito ID token (JWT) to hand to the session endpoint.
 *  - "NEW_PASSWORD_REQUIRED": the account was created with a temporary password (admin
 *    invite). Call `completeNewPassword` with the chosen password to finish and get the token.
 */
export type SignInResult =
  | { status: "SUCCESS"; idToken: string }
  | { status: "NEW_PASSWORD_REQUIRED"; completeNewPassword: (newPassword: string) => Promise<string> };

export function signIn(email: string, password: string): Promise<SignInResult> {
  const details = new AuthenticationDetails({ Username: email, Password: password });
  const user = new CognitoUser({ Username: email, Pool: pool() });
  return new Promise((resolve, reject) => {
    user.authenticateUser(details, {
      onSuccess: (session) => resolve({ status: "SUCCESS", idToken: session.getIdToken().getJwtToken() }),
      onFailure: (err) => reject(err),
      newPasswordRequired: (userAttributes) => {
        // Cognito rejects these on a completeNewPasswordChallenge call - strip them.
        delete userAttributes.email_verified;
        delete userAttributes.email;
        resolve({
          status: "NEW_PASSWORD_REQUIRED",
          completeNewPassword: (newPassword: string) =>
            new Promise<string>((res, rej) => {
              user.completeNewPasswordChallenge(newPassword, userAttributes, {
                onSuccess: (session) => res(session.getIdToken().getJwtToken()),
                onFailure: (err) => rej(err),
              });
            }),
        });
      },
    });
  });
}

export function signOutLocal(): void {
  try {
    pool().getCurrentUser()?.signOut();
  } catch {
    /* pool not configured - nothing to clear */
  }
}
