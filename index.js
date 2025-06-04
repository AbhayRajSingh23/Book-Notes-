import express from "express";
import pkg from "pg";
const { Pool } = pkg;
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import axios from "axios";
import { log } from "console";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const port = 3000;

// DB connection setup
const pool = new Pool({
    user: "postgres",
    host: "localhost",
    database: "book_notes",
    password: "pg123",
    port: 5432,
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));

// Home route
app.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM books ORDER BY created_at DESC");
        res.render("index", { books: result.rows });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading books.");
    }
});

// Helper to fetch ISBN from Open Library
// Modified helper to fetch both ISBN and cover_edition_key
async function fetchBookIdentifiers(title, author) {
    try {
        const queries = [
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`,
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`
        ];

        for (const url of queries) {
            const response = await axios.get(url);
            const docs = response.data.docs;

            for (const doc of docs) {
                const validISBN = doc.isbn?.find(isbn => isbn.length === 13) || doc.isbn?.find(isbn => isbn.length === 10);
                const coverEditionKey = doc.cover_edition_key || null;

                if (validISBN || coverEditionKey) {
                    console.log(`✅ Found identifiers for "${title}": ISBN=${validISBN}, OLID=${coverEditionKey}`);
                    return { isbn: validISBN || null, cover_edition_key: coverEditionKey };
                }
            }
        }

        console.warn(`⚠️ No valid identifiers found for "${title}".`);
    } catch (error) {
        console.error("❌ Error fetching identifiers:", error.message);
    }

    return { isbn: null, cover_edition_key: null };
}





// Add book route with ISBN fetch if missing

app.post("/add", async (req, res) => {
    let { title, author, isbn, rating, notes } = req.body;
    let cover_edition_key = null;

    if (!isbn || isbn.trim() === "") {
        const result = await fetchBookIdentifiers(title, author);
        isbn = result.isbn;
        cover_edition_key = result.cover_edition_key;
    }

    try {
        await pool.query(
            "INSERT INTO books (title, author, isbn, cover_edition_key, rating, notes) VALUES ($1, $2, $3, $4, $5, $6)",
            [title, author, isbn || '', cover_edition_key || '', rating || null, notes]
        );
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error adding book.");
    }
});

// Delete book
app.post("/delete/:id", async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query("DELETE FROM books WHERE id=$1", [id]);
        res.redirect("/");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error deleting book.");
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send("Something broke!");
});

    app.post("/book", (req, res) => {
    const { isbn, olid } = req.body;

    let url = null;

    if (olid) {
        url = `https://openlibrary.org/books/${olid}`;
    } else if (isbn) {
        url = `https://openlibrary.org/isbn/${isbn}`;
    }

    if (url) {
        res.redirect(url);
    } else {
        res.status(400).send("Missing identifier to look up the book.");
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
