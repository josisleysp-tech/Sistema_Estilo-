import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";
import dns from "node:dns";

// Ensure Node.js prefers IPv4 over IPv6 when resolving database hostnames (e.g. Supabase)
// to prevent outbound IPv6 connection refusals (ECONNREFUSED) in sandboxed container environments.
if (typeof dns.setDefaultResultOrder === "function") {
  dns.setDefaultResultOrder("ipv4first");
}

declare global {
  var dbInstance: any;
}

export function getDb() {
  if (globalThis.dbInstance) return globalThis.dbInstance;

  let connectionString = process.env.DATABASE_URL;
  const isValidUrl = connectionString && (connectionString.startsWith("postgres://") || connectionString.startsWith("postgresql://"));

  if (!isValidUrl) {
    console.warn("DATABASE_URL variable is missing, invalid, or is an API key instead of a connection string.");
    return null;
  }

  // Use a fallback or lazy connection to avoid crashing during build phase
  const isLocalhost = connectionString!.includes("localhost") || connectionString!.includes("127.0.0.1");
  const useSsl = !isLocalhost;

  const client = postgres(connectionString!, {
    max: 2, // Optimized for serverless environments (Vercel) to prevent connection pool exhaustion
    idle_timeout: 10, // Automatically close idle connections after 10 seconds of inactivity to free pool connections
    connect_timeout: 5, // Timeout connection attempts after 5 seconds to prevent serverless function hanging/504 errors
    // Disable prepared statements for Supabase poolers or similar connection managers (port 6543 / pooler)
    prepare: connectionString!.includes("6543") || connectionString!.includes("pooler") || connectionString!.includes("supabase") ? false : undefined,
    // Enable SSL for all remote connections to prevent connection rejections from Neon, Render, Supabase etc.
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
  });

  const db = drizzle(client, { schema });
  
  globalThis.dbInstance = db;
  
  return db;
}

export const db = getDb();
export { schema };
