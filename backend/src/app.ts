import cors from "cors";
import express from "express";
import { contactRouter } from "./routes/contact.routes.js";
import { hubspotRouter } from "./routes/hubspot.routes.js";
import { noteRouter } from "./routes/note.routes.js";
import { errorHandler, notFound } from "./middleware/error-handler.js";

export const app = express();

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
);

app.use("/api/hubspot", hubspotRouter);
app.use("/api/contacts", contactRouter);
app.use("/api/notes", noteRouter);

app.use(notFound);
app.use(errorHandler);
