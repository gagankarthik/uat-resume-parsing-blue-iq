// Verify the Cognito app client supports the custom (SRP, browser) login flow.
import fs from "node:fs";
import {
  CognitoIdentityProviderClient,
  DescribeUserPoolClientCommand,
  DescribeUserPoolCommand,
} from "@aws-sdk/client-cognito-identity-provider";

const BACKEND_ENV = "C:\\Users\\gagan\\Desktop\\Projects\\resume-parser-blue-iq-dev\\.env";
function loadEnv(f) {
  const o = {};
  for (const l of fs.readFileSync(f, "utf8").split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) o[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return o;
}
const env = loadEnv(BACKEND_ENV);
const region = env.AWS_REGION || "us-east-2";
const UserPoolId = process.argv[2] || "us-east-2_97cPE7VKm";
const ClientId = process.argv[3] || "7vjbmsmrv2ah2chuh8amru5frj";

const c = new CognitoIdentityProviderClient({
  region,
  credentials: { accessKeyId: env.AWS_ACCESS_KEY_ID, secretAccessKey: env.AWS_SECRET_ACCESS_KEY },
});

const ok = (b) => (b ? "✓" : "✗");

try {
  const pool = (await c.send(new DescribeUserPoolCommand({ UserPoolId }))).UserPool;
  const cl = (await c.send(new DescribeUserPoolClientCommand({ UserPoolId, ClientId })))
    .UserPoolClient;

  const hasSecret = Boolean(cl.ClientSecret);
  const flows = cl.ExplicitAuthFlows || [];
  const srp = flows.includes("ALLOW_USER_SRP_AUTH");
  const usernameAttrs = pool.UsernameAttributes || [];
  const aliasAttrs = pool.AliasAttributes || [];
  const emailSignIn = usernameAttrs.includes("email") || aliasAttrs.includes("email");

  console.log(`Pool: ${pool.Name} (${UserPoolId})`);
  console.log(`Client: ${cl.ClientName} (${ClientId})`);
  console.log("");
  console.log(`${ok(!hasSecret)} Public client (no secret)        ${hasSecret ? "→ HAS SECRET: SRP from browser will FAIL" : ""}`);
  console.log(`${ok(srp)} SRP auth enabled (ALLOW_USER_SRP_AUTH)  flows=[${flows.join(", ")}]`);
  console.log(`${ok(emailSignIn)} Email sign-in                     usernameAttributes=[${usernameAttrs}] alias=[${aliasAttrs}]`);
  console.log(`  AutoVerified: [${(pool.AutoVerifiedAttributes || []).join(", ")}]`);
} catch (e) {
  console.error(`Could not inspect Cognito: ${e.name} — ${e.message}`);
  process.exitCode = 2;
}
