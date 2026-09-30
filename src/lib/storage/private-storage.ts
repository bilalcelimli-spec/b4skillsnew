import { createClient } from "@supabase/supabase-js";

export type StorageProvider = "supabase" | "s3";
export type StoragePurpose = "identity" | "proctoring" | "exports";
export interface StorageReference { provider: StorageProvider; bucket: string; key: string }
export class StorageConfigurationError extends Error {}

export const storageBuckets = {
  identity: { env: "IDENTITY_SNAPSHOT_BUCKET", defaultName: "identity-snapshots" },
  proctoring: { env: "PROCTORING_EVIDENCE_BUCKET", defaultName: "proctoring-evidence" },
  exports: { env: "DATA_WAREHOUSE_BUCKET", defaultName: "data-exports" },
} as const;

export function storageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || (process.env.SUPABASE_URL ? "supabase" : "s3");
  if (provider !== "supabase" && provider !== "s3") throw new StorageConfigurationError("Unsupported STORAGE_PROVIDER");
  return provider;
}

/** Server-only client. Never import this module from browser code. */
export function supabaseStorageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new StorageConfigurationError("Supabase storage requires SUPABASE_URL and SUPABASE_SECRET_KEY");
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) {
    throw new Error("Supabase storage requires HTTPS");
  }
  let privileged = key.startsWith("sb_secret_");
  if (!privileged) {
    try { privileged = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role === "service_role"; }
    catch { /* Invalid or publishable key: never allow privileged storage with it. */ }
  }
  if (!privileged) throw new StorageConfigurationError("Supabase storage requires a server secret key, not a publishable/anon key");
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, {
      ...init,
      signal: init?.signal ? AbortSignal.any([init.signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
    }) },
  });
}

export function storageReference(purpose: StoragePurpose, key: string, provider = storageProvider(), bucket?: string): StorageReference {
  const definition = storageBuckets[purpose];
  const resolved = bucket || process.env[definition.env] || (provider === "supabase" ? definition.defaultName : "");
  if (!resolved) throw new StorageConfigurationError(`${definition.env} is not configured`);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(resolved)) throw new Error("Invalid storage bucket name");
  if (!key || key.startsWith("/") || key.split("/").some(part => !part || part === "." || part === "..")) {
    throw new Error("Invalid storage object key");
  }
  return { provider, bucket: resolved, key };
}

async function privateBucket(client: ReturnType<typeof supabaseStorageClient>, bucket: string) {
  const { data, error } = await client.storage.getBucket(bucket);
  if (error || !data) throw new StorageConfigurationError("Supabase storage bucket is unavailable; run storage:supabase:setup");
  if (data.public) throw new StorageConfigurationError("Evidence/export storage bucket must be private");
}

export async function uploadPrivateObject(purpose: StoragePurpose, key: string, bytes: Buffer, contentType: string): Promise<StorageReference> {
  const reference = storageReference(purpose, key);
  if (reference.provider === "supabase") {
    const client = supabaseStorageClient();
    await privateBucket(client, reference.bucket);
    const { error } = await client.storage.from(reference.bucket).upload(key, bytes, { contentType, upsert: false });
    if (error) throw new Error("Supabase storage upload failed");
  } else {
    const { S3Client, PutObjectCommand } = await import("@aws-sdk/client-s3");
    const client = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
    try {
      await client.send(new PutObjectCommand({ Bucket: reference.bucket, Key: key, Body: bytes, ContentType: contentType, ServerSideEncryption: "AES256" }), { abortSignal: AbortSignal.timeout(15_000) });
    } finally { client.destroy(); }
  }
  return reference;
}

/** Caller must enforce session/tenant ownership before reading an object. */
export async function downloadPrivateObject(reference: StorageReference): Promise<{ bytes: Buffer; contentType: string }> {
  storageReference("identity", reference.key, reference.provider, reference.bucket);
  if (reference.provider === "supabase") {
    const client = supabaseStorageClient();
    await privateBucket(client, reference.bucket);
    const { data, error } = await client.storage.from(reference.bucket).download(reference.key);
    if (error || !data) throw new Error("Supabase storage download failed");
    return { bytes: Buffer.from(await data.arrayBuffer()), contentType: data.type || "application/octet-stream" };
  }
  if (reference.provider !== "s3") throw new Error("Unsupported evidence storage provider");
  const { S3Client, GetObjectCommand } = await import("@aws-sdk/client-s3");
  const client = new S3Client({ region: process.env.AWS_REGION || "eu-west-1" });
  try {
    const object = await client.send(new GetObjectCommand({ Bucket: reference.bucket, Key: reference.key }), { abortSignal: AbortSignal.timeout(15_000) });
    if (!object.Body) throw new Error("Storage object has no body");
    return { bytes: Buffer.from(await object.Body.transformToByteArray()), contentType: object.ContentType || "application/octet-stream" };
  } finally { client.destroy(); }
}
