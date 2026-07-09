import { Router } from "express";
import type { Prisma } from "@prisma/client";
import { prisma } from "../db/prisma.js";
import { getHubspotAccountId } from "../utils/hubspot-account-cookie.js";

export const contactRouter = Router();

contactRouter.get("/", async (req, res) => {
  const accountId = getHubspotAccountId(req);
  if (!accountId) {
    return res.status(401).json({ message: "HubSpot is not connected" });
  }

  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 25);
  const skip = (page - 1) * limit;
  const search = typeof req.query.q === "string" ? req.query.q.trim() : "";

  const where: Prisma.ContactWhereInput = {
    hubspotAccountId: accountId,
    ...(search
      ? {
          OR: [
            { email: { contains: search, mode: "insensitive" } },
            { firstName: { contains: search, mode: "insensitive" } },
            { lastName: { contains: search, mode: "insensitive" } },
            { company: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where: where,
      orderBy: { createdAt: "desc" },
      skip: skip,
      take: limit,
    }),
    prisma.contact.count({
      where,
    }),
  ]);

  return res.json({
    items,
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
});

contactRouter.get("/:id", async (req, res) => {
  const accountId = getHubspotAccountId(req);
  if (!accountId) {
    return res.status(401).json({ message: "HubSpot is not connected" });
  }

  const contact = await prisma.contact.findUnique({
    where: { id: req.params.id },
  });

  if (!contact || contact.hubspotAccountId !== accountId) {
    return res.status(404).json({ message: "Contact not found" });
  }

  return res.json(contact);
});
