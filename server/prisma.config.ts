import { defineConfig } from "prisma/config";

const rawUrl = process.env.DATABASE_URL ?? "";
// Prisma 7 config system only accepts postgres:// scheme, not postgresql://
const dbUrl = rawUrl.replace(/^postgresql:\/\//, "postgres://");

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: dbUrl,
  },
});
