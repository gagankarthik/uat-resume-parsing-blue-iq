// One-off: create the resume-parser DynamoDB tables in real AWS.
// Mirrors infrastructure/terraform/dynamodb.tf exactly. Idempotent — skips
// tables that already exist. Reads AWS creds from the backend .env.
//
// Run from this repo (it has @aws-sdk installed):
//   node scripts/create-tables.mjs

import fs from "node:fs";
import path from "node:path";

import {
  CreateTableCommand,
  DynamoDBClient,
  UpdateTimeToLiveCommand,
  waitUntilTableExists,
} from "@aws-sdk/client-dynamodb";

// ── Load AWS creds + region from the backend .env (ignore LocalStack endpoint) ──
const BACKEND_ENV = "C:\\Users\\gagan\\Desktop\\Projects\\resume-parser-blue-iq-dev\\.env";
function loadEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}
const env = fs.existsSync(BACKEND_ENV) ? loadEnv(BACKEND_ENV) : process.env;
const region = process.env.AWS_REGION || env.AWS_REGION || "us-east-2";
const client = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || env.AWS_SECRET_ACCESS_KEY,
  },
});

const PPR = "PAY_PER_REQUEST";
const S = "S";

const tables = [
  {
    TableName: "resume-parser-api-keys",
    AttributeDefinitions: [
      { AttributeName: "key_hash", AttributeType: S },
      { AttributeName: "company_id", AttributeType: S },
    ],
    KeySchema: [{ AttributeName: "key_hash", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "company-index",
        KeySchema: [{ AttributeName: "company_id", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
  {
    TableName: "resume-parser-jobs",
    AttributeDefinitions: [{ AttributeName: "job_id", AttributeType: S }],
    KeySchema: [{ AttributeName: "job_id", KeyType: "HASH" }],
    ttl: "ttl",
  },
  {
    TableName: "resume-parser-batches",
    AttributeDefinitions: [{ AttributeName: "batch_id", AttributeType: S }],
    KeySchema: [{ AttributeName: "batch_id", KeyType: "HASH" }],
    ttl: "ttl",
  },
  {
    TableName: "resume-parser-webhooks",
    AttributeDefinitions: [
      { AttributeName: "company_id", AttributeType: S },
      { AttributeName: "webhook_id", AttributeType: S },
    ],
    KeySchema: [
      { AttributeName: "company_id", KeyType: "HASH" },
      { AttributeName: "webhook_id", KeyType: "RANGE" },
    ],
  },
  {
    TableName: "resume-parser-audit-logs",
    AttributeDefinitions: [
      { AttributeName: "job_id", AttributeType: S },
      { AttributeName: "timestamp", AttributeType: S },
      { AttributeName: "company_id", AttributeType: S },
    ],
    KeySchema: [
      { AttributeName: "job_id", KeyType: "HASH" },
      { AttributeName: "timestamp", KeyType: "RANGE" },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: "company-timestamp-index",
        KeySchema: [
          { AttributeName: "company_id", KeyType: "HASH" },
          { AttributeName: "timestamp", KeyType: "RANGE" },
        ],
        Projection: { ProjectionType: "ALL" },
      },
    ],
    ttl: "ttl",
  },
  {
    TableName: "resume-parser-companies",
    AttributeDefinitions: [
      { AttributeName: "company_id", AttributeType: S },
      { AttributeName: "email", AttributeType: S },
    ],
    KeySchema: [{ AttributeName: "company_id", KeyType: "HASH" }],
    GlobalSecondaryIndexes: [
      {
        IndexName: "email-index",
        KeySchema: [{ AttributeName: "email", KeyType: "HASH" }],
        Projection: { ProjectionType: "ALL" },
      },
    ],
  },
];

async function main() {
  console.log(`Region: ${region}`);
  for (const t of tables) {
    const { ttl, ...spec } = t;
    try {
      await client.send(new CreateTableCommand({ ...spec, BillingMode: PPR }));
      console.log(`creating ${t.TableName} …`);
      await waitUntilTableExists({ client, maxWaitTime: 120 }, { TableName: t.TableName });
      if (ttl) {
        await client.send(
          new UpdateTimeToLiveCommand({
            TableName: t.TableName,
            TimeToLiveSpecification: { Enabled: true, AttributeName: ttl },
          }),
        );
      }
      console.log(`✓ ${t.TableName} ready`);
    } catch (err) {
      if (err.name === "ResourceInUseException") {
        console.log(`• ${t.TableName} already exists — skipped`);
      } else {
        console.error(`✗ ${t.TableName}: ${err.name} — ${err.message}`);
        process.exitCode = 1;
      }
    }
  }
  console.log("done.");
}

main();
