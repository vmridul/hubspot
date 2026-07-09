import { Router } from "express";
import { enqueueContactSync } from "../jobs/boss.js";
import {
  buildHubspotAuthorizationUrl,
  exchangeCodeForAccount,
  getHubspotAccount
} from "../services/hubspot.service.js";
import {
  getHubspotAccountId,
  setHubspotAccountId
} from "../utils/hubspot-account-cookie.js";
import { createOauthState, isValidOauthState } from "../utils/oauth-state.js";

export const hubspotRouter = Router();

hubspotRouter.get("/", async (req, res) => {
  const accountId = getHubspotAccountId(req);
  const account = accountId ? await getHubspotAccount(accountId) : null;

  return res.json({
    connected: Boolean(account)
  });
});

hubspotRouter.get("/connect", (_req, res) => {
  const state = createOauthState();
  return res.redirect(buildHubspotAuthorizationUrl(state));
});

hubspotRouter.get("/oauth/callback", async (req, res) => {
  const code = typeof req.query.code === "string" ? req.query.code : null;
  const state = typeof req.query.state === "string" ? req.query.state : null;

  if (!code) {
    return res.status(400).json({ message: "Missing OAuth code" });
  }

  if (!state || !isValidOauthState(state)) {
    return res.status(400).json({ message: "Invalid OAuth state" });
  }

  const account = await exchangeCodeForAccount(code);
  setHubspotAccountId(res, account.id);
  await enqueueContactSync(account.id);

  const redirectUrl = new URL(process.env.FRONTEND_URL || "http://localhost:3000");
  redirectUrl.searchParams.set("connected", "true");
  return res.redirect(redirectUrl.toString());
});
