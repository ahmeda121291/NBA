import { config } from "dotenv";
import { resolve } from "path";
import { pathToFileURL } from "url";

config({ path: resolve(__dirname, "..", "web", ".env.local") });

async function main() {
  const modPath = resolve(__dirname, "..", "web", "node_modules", "postgres", "src", "index.js");
  const postgresModule = await import(pathToFileURL(modPath).href);
  const postgres = postgresModule.default;

  const sql = postgres(process.env.DATABASE_URL!, { max: 3 });

  console.log("Creating auth tables...");

  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL UNIQUE,
      name VARCHAR(255),
      image TEXT,
      email_verified TIMESTAMP,
      stripe_customer_id VARCHAR(255) UNIQUE,
      subscription_status VARCHAR(30) DEFAULT 'free',
      subscription_id VARCHAR(255),
      subscription_price_id VARCHAR(255),
      subscription_current_period_end TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  console.log("  users table: OK");

  await sql`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_users_stripe ON users(stripe_customer_id)`;

  await sql`
    CREATE TABLE IF NOT EXISTS accounts (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50) NOT NULL,
      provider VARCHAR(50) NOT NULL,
      provider_account_id VARCHAR(255) NOT NULL,
      refresh_token TEXT,
      access_token TEXT,
      expires_at INTEGER,
      token_type VARCHAR(50),
      scope TEXT,
      id_token TEXT,
      session_state TEXT
    )
  `;
  await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_accounts_provider ON accounts(provider, provider_account_id)`;
  console.log("  accounts table: OK");

  await sql`
    CREATE TABLE IF NOT EXISTS sessions (
      id SERIAL PRIMARY KEY,
      session_token VARCHAR(255) NOT NULL UNIQUE,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      expires TIMESTAMP NOT NULL
    )
  `;
  console.log("  sessions table: OK");

  const [r] = await sql`SELECT COUNT(*) as c FROM users`;
  console.log(`\nDone! Users table has ${r.c} rows.`);

  await sql.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  process.exit(1);
});
