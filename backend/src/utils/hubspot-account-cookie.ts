import type { Request, Response } from "express";

const cookieName = "hubspotAccountId";
const isProduction = process.env.NODE_ENV === "production";

export function getHubspotAccountId(req: Request) {
  const cookies = req.headers.cookie?.split("; ") ?? [];

  for (const cookie of cookies) {
    const [name, value] = cookie.split("=");

    if (name === cookieName) {
      return value;
    }
  }

  return null;
}

export function setHubspotAccountId(res: Response, accountId: string) {
  res.cookie(cookieName, accountId, {
    httpOnly: true,
    sameSite: isProduction ? "none" : "lax",
    secure: isProduction,
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
