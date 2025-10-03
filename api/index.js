import app from "../app.js";
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // needed for secure cookies behind Vercel proxy
}

export default app;


