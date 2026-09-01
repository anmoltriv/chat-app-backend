import { neonConfig, Pool } from "@neondatabase/serverless";
import { WebSocket } from "ws";

// Restricted networks (campus Wi‑Fi) often block Postgres 5432.
// Neon’s serverless driver talks over WebSockets on 443 instead.
neonConfig.webSocketConstructor = WebSocket;

const DB_CONNECTION_URL = process.env.DB_CONNECTION_STRING;

export const pool = new Pool({
  connectionString: DB_CONNECTION_URL,
  max: 20,
  idleTimeoutMillis: 30000,
});

export async function connectDB() {
  try {
    const client = await pool.connect();
    console.log("Database connected successfully");
    client.release();
  } catch (error) {
    console.error("Database connection failed:", error);
    process.exit(1);
  }
}
