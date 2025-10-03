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

// DB connection setup
const pool = new Pool({
  user: "postgres",
  host: "localhost",
  database: "book_notes",
  password: "pg123",
  port: 5432,
});

// View engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Static files
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Session setup (must be before routes)
app.use(
  session({
    store: new PgSession({
      pool: pool,
      tableName: "session",
    }),
    secret: "supersecret", // move to .env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 30 * 24 * 60 * 60 * 1000 }, // 30 days
  })
);

// Make session available in EJS
app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});

// Middleware to protect routes
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect("/login");
  }
  next();
}

// ================== AUTH ROUTES ==================

// Signup form
app.get("/signup", (req, res) => {
  res.render("signup");
});

// Signup logic
app.post("/signup", async (req, res) => {
  const { username, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await pool.query(
      "INSERT INTO users (username, password) VALUES ($1, $2)",
      [username, hashedPassword]
    );
    res.redirect("/login");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error signing up.");
  }
});

// Login form
app.get("/login", (req, res) => {
  res.render("login");
});

// Login logic
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await pool.query(
      "SELECT * FROM users WHERE username=$1",
      [username]
    );
    const user = result.rows[0];
    if (!user) return res.status(400).send("User not found.");
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).send("Incorrect password.");

    req.session.userId = user.id;
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error logging in.");
  }
});

// Logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) console.error(err);
    res.redirect("/login");
  });
});

// ================== HELPER ==================
async function fetchBookIdentifiers(title, author) {
  try {
    const queries = [
      `https://openlibrary.org/search.json?title=${encodeURIComponent(
        title
      )}&author=${encodeURIComponent(author)}`,
      `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`,
    ];

    for (const url of queries) {
      const response = await axios.get(url);
      const docs = response.data.docs;

      for (const doc of docs) {
        const validISBN =
          doc.isbn?.find((isbn) => isbn.length === 13) ||
          doc.isbn?.find((isbn) => isbn.length === 10);
        const coverEditionKey = doc.cover_edition_key || null;

        if (validISBN || coverEditionKey) {
          console.log(
            `Found identifiers for "${title}": ISBN=${validISBN}, OLID=${coverEditionKey}`
          );
          return { isbn: validISBN || null, cover_edition_key: coverEditionKey };
        }
      }
    }
    console.warn(`No valid identifiers found for "${title}".`);
  } catch (error) {
    console.error("Error fetching identifiers:", error.message);
  }
  return { isbn: null, cover_edition_key: null };
}

// ================== BOOK ROUTES ==================

// Home route with search/filter/sort
app.get("/", requireLogin, async (req, res) => {
  const { search, status, rating, sort } = req.query;
  let queryText = "SELECT * FROM books WHERE user_id=$1";
  const queryValues = [req.session.userId];
  let idx = 2;

  if (search) {
    queryText += ` AND (title ILIKE $${idx} OR author ILIKE $${idx})`;
    queryValues.push(`%${search}%`);
    idx++;
  }

  if (status) {
    queryText += ` AND status = $${idx}`;
    queryValues.push(status);
    idx++;
  }

  if (rating) {
    queryText += ` AND rating = $${idx}`;
    queryValues.push(parseInt(rating));
    idx++;
  }

  if (sort === "oldest") queryText += " ORDER BY created_at ASC";
  else if (sort === "highest") queryText += " ORDER BY rating DESC NULLS LAST";
  else queryText += " ORDER BY created_at DESC"; // latest default

  try {
    const result = await pool.query(queryText, queryValues);
    res.render("index", { books: result.rows, query: req.query });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading books.");
  }
});

// Add book
app.post("/add", requireLogin, async (req, res) => {
  let { title, author, isbn, rating, notes } = req.body;
  let cover_edition_key = null;

  if (!isbn || isbn.trim() === "") {
    const result = await fetchBookIdentifiers(title, author);
    isbn = result.isbn;
    cover_edition_key = result.cover_edition_key;
  }

  try {
    await pool.query(
      "INSERT INTO books (title, author, isbn, cover_edition_key, rating, notes, user_id) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [title, author, isbn || "", cover_edition_key || "", rating || null, notes, req.session.userId]
    );
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error adding book.");
  }
});

// Delete book
app.post("/delete/:id", requireLogin, async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM books WHERE id=$1 AND user_id=$2", [
      id,
      req.session.userId,
    ]);
    res.redirect("/");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting book.");
  }
});

// Redirect to OpenLibrary
app.post("/book", (req, res) => {
  const { isbn, olid } = req.body;
  let url = null;
  if (olid) url = "https://openlibrary.org/books/" + olid;
  else if (isbn) url = "https://openlibrary.org/isbn/" + isbn;

  if (url) res.redirect(url);
  else res.status(400).send("Missing identifier to look up the book.");
});

// ================== SERVER ==================
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
