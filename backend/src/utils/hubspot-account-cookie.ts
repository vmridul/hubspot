import type { Request, Response } from "express";

const cookieName = "hubspotAccountId";

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
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}
