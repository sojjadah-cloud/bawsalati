/*
 * Local development PostgreSQL, zero external install required.
 * Boots a real, embedded PostgreSQL server (Zonky binaries) on port 5433
 * with a UTF-8 `portal` database so Arabic text is stored correctly.
 *
 * Usage:  npm run db     (leave running in its own terminal)
 * Data lives in ./.pgdata  — delete that folder to reset the cluster.
 */
const fs = require("fs");
const path = require("path");
const EmbeddedPostgres = require("embedded-postgres").default || require("embedded-postgres");

const DATA_DIR = path.join(__dirname, "..", ".pgdata");
const PORT = 5433;
const DB_NAME = "bawsalati";
// قاعدة البوّابة القديمة تبقى كما هي للرجوع إليها عند الترحيل.
const LEGACY_DB = "portal";

async function main() {
  const firstRun = !fs.existsSync(DATA_DIR);

  const pg = new EmbeddedPostgres({
    databaseDir: DATA_DIR,
    user: "postgres",
    password: "postgres",
    port: PORT,
    persistent: true,
    // Force a UTF-8 cluster (Windows initdb otherwise defaults to WIN1252 → Arabic breaks)
    initdbFlags: ["--encoding=UTF8", "--locale=C"],
  });

  if (firstRun) {
    console.log("⏳ Initialising a new PostgreSQL cluster (first run only)…");
    await pg.initialise();
  }

  await pg.start();
  console.log(`✅ PostgreSQL running on localhost:${PORT}`);

  // Ensure the `portal` database exists, created as UTF-8 from template0.
  const client = pg.getPgClient();
  await client.connect();
  for (const name of [DB_NAME, LEGACY_DB]) {
    const { rows } = await client.query(
      "SELECT 1 FROM pg_database WHERE datname = $1",
      [name]
    );
    if (rows.length === 0) {
      await client.query(
        `CREATE DATABASE ${name} WITH ENCODING 'UTF8' TEMPLATE template0 LC_COLLATE 'C' LC_CTYPE 'C'`
      );
      console.log(`✅ Created database "${name}" (UTF-8)`);
    } else {
      console.log(`✅ Database "${name}" ready`);
    }
  }
  await client.end();

  console.log("\n🎓 DB ready. Next steps in another terminal:");
  console.log("   npm run db:setup   (create tables + seed)");
  console.log("   npm run dev        (start the app)\n");
  console.log("Press Ctrl+C to stop the database.");

  const shutdown = async () => {
    console.log("\n⏹  Stopping PostgreSQL…");
    try {
      await pg.stop();
    } catch {}
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("❌ Failed to start embedded PostgreSQL:", err);
  process.exit(1);
});
