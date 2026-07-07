# pebbl-open

**The receipts behind [Pebbl](https://pebbl.space).**

Pebbl shows one tasteful sponsored line in the "thinking" wait-state of AI coding tools,
and pays the developer 50% of the ad revenue. We make some specific promises — *never reads
your code*, *50% to you*, *city-level location, never your raw IP*. This repo lets you check
those promises against the actual code, instead of taking our word for it.

This is **not** the full source. It's the part that backs the claims (see
[What's here](#whats-here) and [What's not, and why](#whats-not-here-and-why)). The strongest
proof isn't even the code — it's that you can [verify it on your own machine](#verify-it-yourself)
in about a minute.

---

## Claim → proof

| What we say | Where to check it |
|---|---|
| **"Never reads your code"** | [`cli/pebbl-statusline.mjs`](cli/pebbl-statusline.mjs) — the exact script that runs on your machine. It reads only its own ad cache (`~/.pebbl/ad.json`) and posts a 4-field event. It never opens your files, prompts, or AI output. |
| **"You keep 50%"** | [`server/earnings.ts`](server/earnings.ts) — `DEV_SHARE = 0.5`; an impression credits `bidCpm * 0.05` paise to the developer. |
| **"City-level location, never your raw IP"** | [`server/api-impression.ts`](server/api-impression.ts) — it reads only the edge `x-vercel-ip-city` header and stores that; the raw IP is never read or stored. |
| **"Opt in, reversible anytime"** | [`cli/install.sh`](cli/install.sh) — exactly what gets installed (the CLI path uses only documented Claude config — no patching), and the one-command undo. |
| **The ad token carries no personal data** | [`server/ad-token.ts`](server/ad-token.ts) — it signs only `{campaignId, bid, timestamp}`. Nothing about you. |

## The only thing we ever send

When an ad is shown, Pebbl makes **one** request, and this is its entire body:

```json
{ "token": "<your account token, only if you signed in>",
  "adToken": "<signed campaign id + bid>",
  "surface": "cli",
  "eventUuid": "<random id, for de-duplication>" }
```

No file paths. No code. No prompts. No keystrokes. No raw IP. If you ever see Pebbl send
anything else, that's a bug — please open an issue.

## Verify it yourself

You don't have to trust this repo is what's running. Check your own machine:

1. **Read the installed script.** After installing the CLI, open `~/.pebbl/pebbl-statusline.mjs`.
   It's the same unminified file as [`cli/pebbl-statusline.mjs`](cli/pebbl-statusline.mjs) here — diff them.
2. **Watch the network.** Run a proxy (Little Snitch, mitmproxy, Charles) and use your editor
   normally. The only Pebbl traffic you'll see is `GET /api/ad` and the tiny `POST /api/impression`
   above. Your code never leaves your machine — you can *watch* that it doesn't.
3. **Remove it anytime.** One command (shown by the installer) puts everything back.

Runtime behaviour is the real proof: source can be doubted ("is this what's running?"), a
network capture cannot.

## What's here

- `cli/` — the actual terminal integration that runs on your machine (statusline + installer).
  These are already publicly downloadable from `pebbl.space`; they're here for inspection and history.
- `server/` — the data-handling logic behind the claims: the earnings split, the impression
  endpoint (what's stored), the lazy DB client, and the ad-token format. No infrastructure, no secrets.

## What's not here, and why

We're being straight about this rather than pretending to be fully open-source:

- **The editor (VS Code/Cursor) rendering internals** are not published — to avoid handing copycats
  a blueprint. But: it's shipped as **unminified JavaScript you can read on your own machine**, it
  sends the **same event documented above**, and it reads no code. The network check in
  [Verify it yourself](#verify-it-yourself) covers it regardless of source.
- **Infrastructure, deploy config, database access, and all secrets** — never published, by design.

## Links

- Live: **https://pebbl.space**
- How it works: https://pebbl.space/transparency
- Privacy: https://pebbl.space/privacy · Terms: https://pebbl.space/terms

Questions or something that doesn't add up? Open an issue, or email **hello@pebbl.space**.

---

Operated by Billionaire Technologies (Udyam UDYAM-RJ-17-0593856), Jaipur, India.
