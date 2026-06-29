import { NextResponse } from "next/server";
import { getAccountByToken } from "@/lib/accounts";
import { recordImpression } from "@/lib/earnings";
import { verifyAdToken } from "@/lib/adtoken";

export const dynamic = "force-dynamic";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "POST, OPTIONS",
  "access-control-allow-headers": "content-type",
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// POST /api/impression  { token?, adToken, eventUuid, surface }
// Sent from the VS Code webview as a "simple" text/plain POST (no preflight), so
// it works once the webview CSP allows connect-src to us. Body read as text.
export async function POST(req: Request) {
  try {
    const raw = await req.text();
    const b = raw ? JSON.parse(raw) : {};
    if (!b?.eventUuid) return NextResponse.json({ error: "eventUuid required" }, { status: 400, headers: CORS });

    const claim = verifyAdToken(b.adToken);
    const acc = b.token ? await getAccountByToken(b.token) : null;
    const city = (req.headers.get("x-vercel-ip-city") || "").slice(0, 80) || null;

    const inserted = await recordImpression({
      devId: acc?.id ?? null,
      campaignId: claim?.c ?? null,
      bidCpm: claim?.b,
      surface: b.surface ?? null,
      city,
      eventUuid: String(b.eventUuid),
    });

    return NextResponse.json({ ok: true, counted: inserted, attributed: !!acc && !!claim?.c }, { headers: CORS });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500, headers: CORS });
  }
}
