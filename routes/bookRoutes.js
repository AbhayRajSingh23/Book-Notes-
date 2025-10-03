import { Router } from "express";
import { requireLogin } from "../middleware/auth.js";
import { listBooksPage, getBooks, addBook, deleteBook, addBookFormAction, deleteBookFormAction, openLibraryRedirect } from "../controllers/bookController.js";

const router = Router();

// Page
router.get("/", requireLogin, listBooksPage);

// API
router.get("/api/books", requireLogin, getBooks);
router.post("/api/books", requireLogin, addBook);
router.delete("/api/books/:id", requireLogin, deleteBook);

// Forms used in index.ejs
router.post("/add", requireLogin, addBookFormAction);
router.post("/delete/:id", requireLogin, deleteBookFormAction);
router.post("/book", requireLogin, openLibraryRedirect);

export default router;


