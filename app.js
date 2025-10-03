import "dotenv/config";
import express from "express";
import bodyParser from "body-parser";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import pgSession from "connect-pg-simple";
import authRoutes from "./routes/authRoutes.js";
import bookRoutes from "./routes/bookRoutes.js";
import { pool } from "./config/database.js";

// Debug environment
console.log("App starting with NODE_ENV:", process.env.NODE_ENV);
console.log("Environment variables loaded:", {
  PGUSER: !!process.env.PGUSER,
  PGHOST: !!process.env.PGHOST,
  PGDATABASE: !!process.env.PGDATABASE,
  PGPASSWORD: !!process.env.PGPASSWORD,
  SESSION_SECRET: !!process.env.SESSION_SECRET
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PgSession = pgSession(session);

const app = express();

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    store: new PgSession({ pool, tableName: process.env.SESSION_TABLE || "session" }),
    secret: process.env.SESSION_SECRET || "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
      secure: !!process.env.SESSION_SECURE_COOKIES,
      httpOnly: true,
      path: "/",
    },
  })
);

// EJS setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Make session available in EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Routes
app.use(authRoutes);
app.use(bookRoutes);

export default app;


