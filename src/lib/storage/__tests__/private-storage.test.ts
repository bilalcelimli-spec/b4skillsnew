import { beforeEach, afterEach, describe, it, expect, vi } from "vitest";
import { downloadPrivateObject, storageReference, uploadPrivateObject, supabaseStorageClient } from "../private-storage";

const mocks = vi.hoisted(() => ({
  getBucket: vi.fn(), upload: vi.fn(), download: vi.fn(), createClient: vi.fn(), from: vi.fn(),
}));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));

describe("private Supabase storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("STORAGE_PROVIDER", "supabase");
    vi.stubEnv("SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_secret_test");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    vi.stubEnv("IDENTITY_SNAPSHOT_BUCKET", "");
    mocks.getBucket.mockResolvedValue({ data: { public: false }, error: null });
    mocks.upload.mockResolvedValue({ error: null });
    mocks.from.mockReturnValue({ upload: mocks.upload, download: mocks.download });
    mocks.createClient.mockReturnValue({ storage: { getBucket: mocks.getBucket, from: mocks.from } });
  });
  afterEach(() => vi.unstubAllEnvs());

  it("uploads without overwrite to a private bucket and returns a durable provider reference", async () => {
    const bytes = Buffer.from("jpeg");
    const reference = await uploadPrivateObject("identity", "identity/session-1/photo.jpg", bytes, "image/jpeg");
    expect(reference).toEqual({ provider: "supabase", bucket: "identity-snapshots", key: "identity/session-1/photo.jpg" });
    expect(mocks.getBucket).toHaveBeenCalledWith("identity-snapshots");
    expect(mocks.upload).toHaveBeenCalledWith(reference.key, bytes, { contentType: "image/jpeg", upsert: false });
    expect(mocks.createClient.mock.calls[0][2].auth.persistSession).toBe(false);
  });
  it("refuses a public bucket before storing or reading evidence", async () => {
    mocks.getBucket.mockResolvedValue({ data: { public: true } });
    await expect(uploadPrivateObject("identity", "identity/photo.jpg", Buffer.from("jpeg"), "image/jpeg")).rejects.toThrow("must be private");
    await expect(downloadPrivateObject(storageReference("identity", "identity/photo.jpg"))).rejects.toThrow("must be private");
    expect(mocks.upload).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("downloads through server credentials without producing a public URL", async () => {
    mocks.download.mockResolvedValue({ data: new Blob(["jpeg"], { type: "image/jpeg" }), error: null });
    const result = await downloadPrivateObject(storageReference("identity", "identity/photo.jpg"));
    expect(result.bytes.toString()).toBe("jpeg");
    expect(result.contentType).toBe("image/jpeg");
  });
  it("rejects missing credentials and browser keys", () => {
    vi.stubEnv("SUPABASE_SECRET_KEY", "");
    expect(() => supabaseStorageClient()).toThrow("requires SUPABASE_URL");
    vi.stubEnv("SUPABASE_SECRET_KEY", "sb_publishable_not_private");
    expect(() => supabaseStorageClient()).toThrow("not a publishable/anon key");
  });
  it("reports a missing bucket without leaking upstream messages", async () => {
    mocks.getBucket.mockResolvedValue({ error: { message: "sensitive upstream data" } });
    await expect(uploadPrivateObject("identity", "identity/photo.jpg", Buffer.from("jpeg"), "image/jpeg")).rejects.toThrow("storage:supabase:setup");
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("validates object paths and preserves legacy S3 references during migration", () => {
    expect(() => storageReference("identity", "../secret")).toThrow("Invalid storage object key");
    expect(storageReference("identity", "identity/old.jpg", "s3", "old-bucket").provider).toBe("s3");
  });
});
