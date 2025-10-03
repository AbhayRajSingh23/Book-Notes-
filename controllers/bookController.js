import { pool } from "../config/database.js";
import { fetchBookIdentifiers } from "../utils/openLibrary.js";

export const listBooksPage = async (req, res) => {
  try {
    const query = req.query || {};
    const result = await pool.query(
      "SELECT * FROM books WHERE user_id=$1 ORDER BY created_at DESC",
      [req.session.userId]
    );
    res.render("index", { books: result.rows, query });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading books.");
  }
};

export const getBooks = async (req, res) => {
  const { search, status, rating, sort } = req.query;
  let query = "SELECT * FROM books WHERE user_id=$1";
  const values = [req.session.userId];
  let idx = 2;

  if (search) { query += ` AND (title ILIKE $${idx} OR author ILIKE $${idx})`; values.push(`%${search}%`); idx++; }
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
};

export const addBook = async (req, res) => {
  let { title, author, isbn, rating, notes, status, genre } = req.body;
  const identifiers = (!isbn || isbn.trim() === "") ? await fetchBookIdentifiers(title, author) : { isbn, cover_edition_key: null };
  isbn = identifiers.isbn || isbn;
  const cover_edition_key = identifiers.cover_edition_key;

  try {
    const result = await pool.query(
      "INSERT INTO books (title, author, isbn, cover_edition_key, rating, notes, status, genre, user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",
      [title, author, isbn || "", cover_edition_key || "", rating || null, notes, status || "Want to Read", genre || null, req.session.userId]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error adding book" });
  }
};

export const deleteBook = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM books WHERE id=$1 AND user_id=$2", [id, req.session.userId]);
    res.json({ message: "Book deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error deleting book" });
  }
};

// Support existing form actions in views
export const addBookFormAction = async (req, res) => {
  req.body = { ...req.body, rating: req.body.rating || null };
  await addBook(req, { json: () => res.redirect("/") });
};

export const deleteBookFormAction = async (req, res) => {
  await deleteBook(req, { json: () => res.redirect("/") });
};

export const openLibraryRedirect = async (req, res) => {
  const { isbn, olid } = req.body;
  if (olid) return res.redirect(`https://openlibrary.org/books/${olid}`);
  if (isbn) return res.redirect(`https://openlibrary.org/isbn/${isbn}`);
  return res.redirect("/");
};


