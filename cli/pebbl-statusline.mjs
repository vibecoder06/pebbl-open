#!/usr/bin/env node
// Pebbl Claude CLI status line. Fetches the current ad from the Pebbl API with a
// short local cache, prints one clean clickable line, and reports an attributed
// impression (tied to your account token) ~once a minute of active use.
// Prime directive: never break the CLI — any error prints nothing and exits 0.

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const API = process.env.PEBBL_API || "https://ads.pebbl.space";
const DIR = join(homedir(), ".pebbl");
const CACHE = join(DIR, "ad.json");
const ACCOUNT = join(DIR, "account"); // holds the login token, if any
const MAX_AGE = 60_000;
const ESC = "\x1b";

function token() {
  try { return readFileSync(ACCOUNT, "utf8").trim(); } catch { return ""; }
}
function sanitize(s) { return String(s).replace(/[\x00-\x1f\x7f-\x9f]/g, "").slice(0, 120); }
function host(u) { try { return new URL(u).host.replace(/^www\./, ""); } catch { return ""; } }
function link(label, url) {
  if (!url || !/^https?:\/\//.test(url)) return label;
  return `${ESC}]8;;${url}${ESC}\\${label}${ESC}]8;;${ESC}\\`;
}

// fire-and-forget attributed impression (only when an ad is freshly served)
function reportImpression(ad) {
  const t = token();
  if (!ad?.id) return;
  fetch(`${API}/api/impression`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ token: t || undefined, adToken: ad.adToken, surface: "cli", eventUuid: randomUUID() }),
    signal: AbortSignal.timeout(2500),
  }).catch(() => {});
}

async function getAd() {
  try {
    const c = JSON.parse(readFileSync(CACHE, "utf8"));
    if (Date.now() - (c._ts || 0) < MAX_AGE) return c.ad; // cached, no new impression
  } catch {}
  try {
    const res = await fetch(`${API}/api/ad`, { signal: AbortSignal.timeout(2500) });
    const ad = await res.json();
    mkdirSync(DIR, { recursive: true });
    writeFileSync(CACHE, JSON.stringify({ _ts: Date.now(), ad }));
    reportImpression(ad); // fresh serve → count one impression
    return ad;
  } catch {
    try { return JSON.parse(readFileSync(CACHE, "utf8")).ad; } catch { return null; }
  }
}

try {
  const ad = await getAd();
  const text = ad && sanitize(ad.text);
  if (text) {
    const dim = `${ESC}[2m`, reset = `${ESC}[0m`;
    const h = sanitize(host(ad.url));
    const tail = h ? ` ${dim}→${reset} ${link(h, ad.clickUrl || ad.url)}` : "";
    process.stdout.write(`${dim}ad·${reset} ${text}${tail}`);
  }
} catch {
  /* silent */
}
