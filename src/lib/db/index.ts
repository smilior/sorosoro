import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import * as schema from "./schema";

const url = process.env.TURSO_DATABASE_URL;
if (!url) {
  throw new Error(
    "TURSO_DATABASE_URL が未設定です。.env.local を確認してください。",
  );
}

const client = createClient({
  url,
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

export const db = drizzle(client, { schema });
export { client as dbClient };
