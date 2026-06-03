// Server-only API-key administration against the resume-parser DynamoDB table.
//
// Mirrors the backend exactly (app/core/security.py + app/db/dynamodb.py):
//   raw key   = "rp_live_" + base64url(32 random bytes)
//   key_hash  = sha256(raw) hex            (only the hash is stored)
//   key_prefix= raw.slice(0,12) + "…"
//   item      = { key_hash, key_prefix, company_id, status, rate_limit_per_minute,
//                 rate_limit_per_day, created_at }
//
// Requires AWS credentials in the server environment (standard AWS chain) and:
//   AWS_REGION                (default us-east-2)
//   DYNAMODB_TABLE_API_KEYS   (default resume-parser-api-keys)

import "server-only";

import crypto from "node:crypto";

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  PutCommand,
  ScanCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

import type { ApiKey, CreateApiKeyResponse } from "@/lib/types";

const REGION = process.env.AWS_REGION || "us-east-2";
const TABLE = process.env.DYNAMODB_TABLE_API_KEYS || "resume-parser-api-keys";

let _doc: DynamoDBDocumentClient | null = null;
function doc(): DynamoDBDocumentClient {
  if (!_doc) {
    _doc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return _doc;
}

function generateRawKey(): string {
  return "rp_live_" + crypto.randomBytes(32).toString("base64url");
}

function hashKey(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

function displayPrefix(raw: string): string {
  return raw.slice(0, 12) + "…";
}

function toApiKey(item: Record<string, unknown>): ApiKey {
  return {
    key_hash: String(item.key_hash ?? ""),
    key_prefix: String(item.key_prefix ?? ""),
    company_id: String(item.company_id ?? ""),
    status: String(item.status ?? "active"),
    rate_limit_per_minute: Number(item.rate_limit_per_minute ?? 0),
    rate_limit_per_day: Number(item.rate_limit_per_day ?? 0),
    created_at: String(item.created_at ?? ""),
  };
}

export async function listApiKeys(): Promise<ApiKey[]> {
  const out = await doc().send(new ScanCommand({ TableName: TABLE }));
  const items = (out.Items ?? []).map((i) => toApiKey(i as Record<string, unknown>));
  // Newest first.
  items.sort((a, b) => (a.created_at < b.created_at ? 1 : -1));
  return items;
}

export async function createApiKey(
  companyId: string,
  ratePerMinute: number,
  ratePerDay: number,
): Promise<CreateApiKeyResponse> {
  const raw = generateRawKey();
  const item: ApiKey = {
    key_hash: hashKey(raw),
    key_prefix: displayPrefix(raw),
    company_id: companyId,
    status: "active",
    rate_limit_per_minute: ratePerMinute,
    rate_limit_per_day: ratePerDay,
    created_at: new Date().toISOString(),
  };
  await doc().send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
      // Astronomically unlikely, but never silently overwrite an existing hash.
      ConditionExpression: "attribute_not_exists(key_hash)",
    }),
  );
  return { ...item, api_key: raw };
}

export async function revokeApiKey(keyHash: string): Promise<void> {
  await doc().send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { key_hash: keyHash },
      UpdateExpression: "SET #s = :revoked",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":revoked": "revoked" },
      ConditionExpression: "attribute_exists(key_hash)",
    }),
  );
}

export async function deleteApiKey(keyHash: string): Promise<void> {
  await doc().send(new DeleteCommand({ TableName: TABLE, Key: { key_hash: keyHash } }));
}
