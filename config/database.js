import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;

// Create pool with environment variables
const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost", 
  database: process.env.PGDATABASE || "book_notes",
  password: process.env.PGPASSWORD || "pg123",
  port: Number(process.env.PGPORT) || 5432,
});

// Export pool
export { pool };
export default pool;
