import { Pool } from "pg";

const DB_CONNECTION_URL = process.env.DB_CONNECTION_STRING;


export const pool = new Pool({
  connectionString: DB_CONNECTION_URL,
  max: 20, 
  min: 4, 
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
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