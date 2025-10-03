import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcrypt";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PgSession = pgSession(session);

const app = express();
const port = 3001;

// DB setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: "pg123",
  port: 5432,
});

// Middleware
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session setup
app.use(
  session({
    store: new PgSession({ pool, tableName: "session" }),
    secret: "supersecret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 },
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

// Auth middleware
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ========== AUTH ROUTES ==========

// Signup page
app.get("/signup", (req, res) => res.render("signup"));

// Login page
app.get("/login", (req, res) => res.render("login"));

// Signup API
app.post("/api/auth/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    await pool.query("INSERT INTO users (username, password) VALUES ($1,$2)", [username, hashed]);
    res.status(201).json({ message: "Signup successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Signup failed" });
  }
});

// Login API
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query("SELECT * FROM users WHERE username=$1", [username]);
    const user = result.rows[0];
    if (!user) return res.status(400).json({ error: "User not found" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: "Incorrect password" });

    req.session.userId = user.id;
    res.json({ message: "Login successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Login failed" });
  }
});

// Logout API
app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) console.error(err);
    res.json({ message: "Logged out" });
  });
});

// ========== HELPER ==========

async function fetchBookIdentifiers(title, author) {
  try {
    const queries = [
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`,
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`,
    ];

    for (const url of queries) {
      const { data } = await axios.get(url);
      for (const doc of data.docs) {
        const isbn = doc.isbn?.find(i => i.length === 13) || doc.isbn?.find(i => i.length === 10);
        const olid = doc.cover_edition_key || null;
        if (isbn || olid) return { isbn: isbn || null, cover_edition_key: olid };
      }
    }
  } catch (err) {
    console.error("Error fetching book:", err.message);
  }
  return { isbn: null, cover_edition_key: null };
}

// ========== BOOK API ==========

// Get all books
app.get("/api/books", requireLogin, async (req, res) => {
  const { search, status, rating, sort } = req.query;
  let query = "SELECT * FROM books WHERE user_id=$1";
  const values = [req.session.userId];
  let idx = 2;

  if (search) {
    query += ` AND (title ILIKE $${idx} OR author ILIKE $${idx})`;
    values.push(`%${search}%`);
    idx++;
  }
  if (status) { query += ` AND status=$${idx}`; values.push(status); idx++; }
  if (rating) { query += ` AND rating=$${idx}`; values.push(parseInt(rating)); idx++; }

  if (sort === "oldest") query += " ORDER BY created_at ASC";
  else if (sort === "highest") query += " ORDER BY rating DESC NULLS LAST";
  else query += " ORDER BY created_at DESC";

  try {
    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching books" });
  }
});

// Add book
app.post("/api/books", requireLogin, async (req, res) => {
  let { title, author, isbn, rating, notes, status, genre } = req.body;
  const resultIdentifiers = (!isbn || isbn.trim() === "") ? await fetchBookIdentifiers(title, author) : { isbn, cover_edition_key: null };
  isbn = resultIdentifiers.isbn || isbn;
  const cover_edition_key = resultIdentifiers.cover_edition_key;

  try {
    const result = await pool.query(
      "INSERT INTO books (title, author, isbn, cover_edition_key, rating, notes, status, genre, user_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [title, author, isbn || "", cover_edition_key || "", rating || null, notes, status || "Want to Read", genre || null, req.session.userId]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding book" });
  }
});

// Delete book
app.delete("/api/books/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM books WHERE id=$1 AND user_id=$2", [id, req.session.userId]);
    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting book" });
  }
});

// OpenLibrary redirect (browser-friendly GET)
app.get("/api/books/:id/redirect", requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM books WHERE id=$1 AND user_id=$2", [id, req.session.userId]);
    const book = result.rows[0];
    if (!book) return res.status(404).json({ error: "Book not found" });

    let url = book.cover_edition_key ? `https://openlibrary.org/books/${book.cover_edition_key}` : book.isbn ? `https://openlibrary.org/isbn/${book.isbn}` : null;
    if (url) return res.redirect(url);
    return res.status(400).json({ error: "No identifiers available" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error fetching redirect link" });
  }
});

// ========== FRONTEND ROUTES ==========

// Render home page with EJS
app.get("/", requireLogin, async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM books WHERE user_id=$1 ORDER BY created_at DESC", [req.session.userId]);
    res.render("index", { books: result.rows, query: {} });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading books.");
  }
});

// ========== SERVER START ==========
app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
