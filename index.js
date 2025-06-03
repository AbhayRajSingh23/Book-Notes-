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
async function fetchISBN(title, author) {
    try {
        const queries = [
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`,
            `https://openlibrary.org/search.json?title=${encodeURIComponent(title)}`
        ];
        console.log(queries);
        for (const url of queries) {
            const response = await axios.get(url);
            const docs = response.data.docs;

            for (const doc of docs) {
                if (doc.isbn && doc.isbn.length > 0) {
                    const validISBN = doc.isbn.find(isbn => isbn.length === 13) || doc.isbn.find(isbn => isbn.length === 10);
                    if (validISBN) {
                        console.log(`✅ Found ISBN ${validISBN} for "${title}"`);
                        return validISBN;
                    }
                }
            }
        }

        console.warn(`⚠️ No valid ISBN found for "${title}" (with or without author).`);
    } catch (error) {
        console.error("❌ Error fetching ISBN from Open Library:", error.message);
    }

    return null;
}





// Add book route with ISBN fetch if missing
app.post("/add", async (req, res) => {
    let { title, author, isbn, rating, notes } = req.body;

    if (!isbn) {
        isbn = await fetchISBN(title, author);
        console.log(`Fetched ISBN for "${title}": ${isbn}`);
    }


    try {
        await pool.query(
            "INSERT INTO books (title, author, isbn, rating, notes) VALUES ($1, $2, $3, $4, $5)",
            [title, author, isbn || '', rating || null, notes]
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

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
