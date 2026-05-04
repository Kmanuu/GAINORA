import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function reset() {
  const client = await pool.connect();
  try {
    await client.query("DROP SCHEMA public CASCADE");
    await client.query("CREATE SCHEMA public");
    await client.query("GRANT ALL ON SCHEMA public TO postgres");
    await client.query("GRANT ALL ON SCHEMA public TO public");
    console.log("✅ Base de datos limpia.");
  } finally {
    client.release();
    await pool.end();
  }
}

reset().catch((e) => { console.error(e); process.exit(1); });
