import crypto from "node:crypto";

const maxAgeMs = 10 * 60 * 1000;
const states = new Map<string, number>();

export function createOauthState() {
  const state = crypto.randomBytes(16).toString("hex");
  states.set(state, Date.now());
  return state;
}

export function isValidOauthState(state: string) {
  const createdAt = states.get(state);
  states.delete(state);

  if (!createdAt) {
    return false;
  }

  return Date.now() - createdAt <= maxAgeMs;
}
