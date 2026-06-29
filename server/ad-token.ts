import { createHmac } from "node:crypto";

// Signed ad-serving token: /api/ad issues it with the served campaign + bid, and
// /api/impression verifies it before crediting. Prevents a client from inflating
// its own earnings by claiming a higher bid / fake campaign.
const secret = () => process.env.AUTH_SECRET || "dev-secret";

export type AdClaim = { c: string | null; b: number; t: number };

export function signAdToken(claim: AdClaim): string {
  const data = Buffer.from(JSON.stringify(claim)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(data).digest("base64url").slice(0, 24);
  return `${data}.${sig}`;
}

export function verifyAdToken(token: string | undefined | null): AdClaim | null {
  if (!token || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const expect = createHmac("sha256", secret()).update(data).digest("base64url").slice(0, 24);
  if (sig !== expect) return null;
  try {
    return JSON.parse(Buffer.from(data, "base64url").toString()) as AdClaim;
  } catch {
    return null;
  }
}
