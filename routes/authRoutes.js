import { Router } from "express";
import { renderLogin, renderSignup, postLogin, postSignup, postLogout } from "../controllers/authController.js";

const router = Router();

// views
router.get("/login", renderLogin);
router.get("/signup", renderSignup);

// api
router.post("/api/auth/login", postLogin);
router.post("/api/auth/signup", postSignup);
router.post("/api/auth/logout", postLogout);

export default router;


