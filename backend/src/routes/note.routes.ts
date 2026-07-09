import express, { Router } from "express";
import { prisma } from "../db/prisma.js";
import { enqueueNoteSync } from "../jobs/boss.js";
import { getHubspotAccountId } from "../utils/hubspot-account-cookie.js";

export const noteRouter = Router();

noteRouter.use(express.json());

noteRouter.get("/", async (req, res) => {
  const accountId = getHubspotAccountId(req);
  if (!accountId) {
    return res.status(401).json({ message: "HubSpot is not connected" });
  }

  const contactId = typeof req.query.contactId === "string" ? req.query.contactId.trim() : "";
  if (!contactId) {
    return res.status(400).json({ message: "contactId is required" });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  });

  if (!contact || contact.hubspotAccountId !== accountId) {
    return res.status(404).json({ message: "Contact not found" });
  }

  const notes = await prisma.note.findMany({
    where: { contactId },
    orderBy: { createdAt: "desc" }
  });

  return res.json(notes);
});

noteRouter.post("/", async (req, res) => {
  const accountId = getHubspotAccountId(req);
  if (!accountId) {
    return res.status(401).json({ message: "HubSpot is not connected" });
  }

  const contactId = typeof req.body.contactId === "string" ? req.body.contactId.trim() : "";
  const noteBody = typeof req.body.body === "string" ? req.body.body.trim() : "";

  if (!contactId) {
    return res.status(400).json({ message: "contactId is required" });
  }

  if (!noteBody) {
    return res.status(400).json({ message: "Note body is required" });
  }

  if (noteBody.length > 5000) {
    return res.status(400).json({ message: "Note body is too long" });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: contactId }
  });

  if (!contact || contact.hubspotAccountId !== accountId) {
    return res.status(404).json({ message: "Contact not found" });
  }

  const note = await prisma.note.create({
    data: {
      contactId,
      body: noteBody,
      status: "pending"
    }
  });

  await enqueueNoteSync(note.id);
  return res.status(201).json(note);
});
