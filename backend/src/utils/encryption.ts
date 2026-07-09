import crypto from "node:crypto";

const algorithm = "aes-256-gcm";

function getEncryptionKey() {
  return crypto.createHash("sha256").update(process.env.TOKEN_ENCRYPTION_KEY || "").digest();
}

export function encrypt(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(algorithm, getEncryptionKey(), iv);
  const encrypted = cipher.update(value, "utf8", "base64") + cipher.final("base64");
  const tag = cipher.getAuthTag().toString("base64");

  return `${iv.toString("base64")}.${tag}.${encrypted}`;
}

export function decrypt(value: string) {
  const [ivBase64, tagBase64, encryptedBase64] = value.split(".");
  const decipher = crypto.createDecipheriv(
    algorithm,
    getEncryptionKey(),
    Buffer.from(ivBase64, "base64")
  );
  decipher.setAuthTag(Buffer.from(tagBase64, "base64"));

  return decipher.update(encryptedBase64, "base64", "utf8") + decipher.final("utf8");
}
