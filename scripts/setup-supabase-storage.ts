import "dotenv/config";
import { storageBuckets, supabaseStorageClient } from "../src/lib/storage/private-storage.js";

const apply = process.argv.includes("--apply");
const client = supabaseStorageClient();
for (const [purpose, definition] of Object.entries(storageBuckets)) {
  const name = process.env[definition.env] || definition.defaultName;
  const { data, error } = await client.storage.getBucket(name);
  if (data) {
    if (data.public) throw new Error(`Refusing public bucket: ${name}. Make it private before continuing.`);
    console.log(`${purpose}: private bucket available (${name})`);
    continue;
  }
  if (error && String(error.statusCode) !== "404") throw new Error(`Could not inspect bucket ${name}; check server credentials and connectivity.`);
  if (!apply) {
    console.log(`${purpose}: missing (${name}); use --apply to create a private bucket`);
    continue;
  }
  const { error: createError } = await client.storage.createBucket(name, {
    public: false,
    fileSizeLimit: purpose === "exports" ? 50_000_000 : 3_750_000,
    ...(purpose === "exports" ? {} : { allowedMimeTypes: ["image/jpeg"] }),
  });
  if (createError) throw new Error(`Could not create private bucket ${name}`);
  console.log(`${purpose}: created private bucket (${name})`);
}
console.log("No public URLs or browser policies were created. Access stays behind the application's authorization checks.");
