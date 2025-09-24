import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from "@shared/schema";

let client: mysql.Connection;
let db: ReturnType<typeof drizzle>;

async function initializeDb() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    // Fallback: Try to get it from Replit secrets
    console.log("DATABASE_URL not found in environment, checking Replit secrets...");
    
    // For development/testing purposes, create a temporary in-memory fallback
    // This should only be used as a last resort
    if (process.env.NODE_ENV === 'development') {
      throw new Error(
        "DATABASE_URL must be set. Please ensure the database is properly provisioned in Replit."
      );
    }
    
    throw new Error(
      "DATABASE_URL must be set. Did you forget to provision a database?",
    );
  }
  
  console.log("Connecting to MySQL database...");
  client = await mysql.createConnection(databaseUrl);
  db = drizzle(client, { schema, mode: 'default' });
  console.log("MySQL database connection established");
  return db;
}

function getDb() {
  if (!db) {
    throw new Error("Database not initialized. Call initializeDb() first.");
  }
  return db;
}

export { getDb as db, initializeDb };