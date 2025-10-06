import "dotenv/config";
import app from "./app.js";

const port = Number(process.env.PORT) || 3000;
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1); // needed for secure cookies behind Vercel proxy
}

app.listen(port, () => console.log(`Server running at http://localhost:${port}`));
