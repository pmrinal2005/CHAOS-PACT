import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// Apply the schema to a hosted database:
//   DATABASE_URL=... npx drizzle-kit push --config drizzle.prod.config.ts
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  dbCredentials: { url: process.env.DATABASE_URL! },
});
