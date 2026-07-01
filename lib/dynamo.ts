// Server-only DynamoDB access for the admin data viewer. Reads the resume-parser
// tables directly with the AWS SDK. Credentials come from server env (falling
// back to the default provider chain / instance role if unset).

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const REGION = process.env.NEXT_PUBLIC_AWS_REGION || "us-east-2";

function credentials() {
  const accessKeyId = process.env.NEXT_PUBLIC_AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.NEXT_PUBLIC_AWS_SECRET_ACCESS_KEY;
  return accessKeyId && secretAccessKey ? { accessKeyId, secretAccessKey } : undefined;
}

let _doc: DynamoDBDocumentClient | null = null;
function doc(): DynamoDBDocumentClient {
  if (!_doc) {
    const client = new DynamoDBClient({ region: REGION, credentials: credentials() });
    _doc = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });
  }
  return _doc;
}

export interface TableRef {
  id: string;
  label: string;
  name: string;
}

// Every resume-parser table an operator may want to inspect. Names honor the
// DYNAMODB_TABLE_* overrides where the app already defines them.
export const PARSER_TABLES: TableRef[] = [
  { id: "companies", label: "Companies", name: process.env.DYNAMODB_TABLE_COMPANIES || "resume-parser-companies" },
  { id: "api-keys", label: "API Keys", name: process.env.DYNAMODB_TABLE_API_KEYS || "resume-parser-api-keys" },
  { id: "audit-logs", label: "Audit Logs", name: process.env.DYNAMODB_TABLE_AUDIT_LOGS || "resume-parser-audit-logs" },
  { id: "jobs", label: "Jobs", name: process.env.DYNAMODB_TABLE_JOBS || "resume-parser-jobs" },
  { id: "batches", label: "Batches", name: process.env.DYNAMODB_TABLE_BATCHES || "resume-parser-batches" },
  { id: "webhooks", label: "Webhooks", name: process.env.DYNAMODB_TABLE_WEBHOOKS || "resume-parser-webhooks" },
  { id: "feedback", label: "Feedback", name: process.env.DYNAMODB_TABLE_FEEDBACK || "resume-parser-feedback" },
];

export function tableById(id: string): TableRef | undefined {
  return PARSER_TABLES.find((t) => t.id === id);
}

export interface ScanResult {
  items: Record<string, unknown>[];
  count: number;
  scannedCount: number;
  truncated: boolean;
}

export async function scanTable(name: string, limit = 300): Promise<ScanResult> {
  const out = await doc().send(new ScanCommand({ TableName: name, Limit: limit }));
  return {
    items: (out.Items ?? []) as Record<string, unknown>[],
    count: out.Count ?? 0,
    scannedCount: out.ScannedCount ?? 0,
    truncated: Boolean(out.LastEvaluatedKey),
  };
}
