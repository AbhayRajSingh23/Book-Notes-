import "dotenv/config";
import pkg from "pg";

const { Pool } = pkg;

// Debug environment variables
console.log("Database config:", {
  user: process.env.PGUSER,
  host: process.env.PGHOST,
  database: process.env.PGDATABASE,
  port: process.env.PGPORT,
  hasPassword: !!process.env.PGPASSWORD
});

// Create pool with environment variables
const pool = new Pool({
  user: process.env.PGUSER || "postgres",
  host: process.env.PGHOST || "localhost", 
  database: process.env.PGDATABASE || "book_notes",
  password: process.env.PGPASSWORD || "pg123",
  port: Number(process.env.PGPORT) || 5432,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('✅ Database connected successfully');
});

pool.on('error', (err) => {
  console.error('❌ Database connection error:', err);
});

// Export pool
export { pool };
export default pool;
