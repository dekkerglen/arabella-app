import express from "express";
import { render, serveClient } from "./render.js";

const app = express();
const port = Number(process.env.PORT ?? 5000);

app.use(express.json());
app.use(serveClient);

app.get("/healthcheck", (_req, res) => {
  res.send("ok");
});

app.get("/", (_req, res) => {
  render(res, "HomePage", { message: "Hello from the server" });
});

// Express 5 hands listen errors (e.g. port in use) to this callback instead of throwing.
app.listen(port, (error) => {
  if (error) throw error;
  console.log(`[server]: Server is running at http://localhost:${port}`);
});
