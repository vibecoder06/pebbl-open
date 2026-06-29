import { randomUUID } from "node:crypto";
import { getSql } from "./db";

export const DEV_SHARE = 0.5;
export const FLOOR_CPM = 50; // ₹ per 1000 impressions
export const PAYOUT_MIN_PAISE = 5000; // ₹50 minimum to request a payout
// Brands are billed for what they buy, but we actually DELIVER this much extra for free —
// covers their own test-views of the ad, and is a little thank-you. Enforced at serving time.
export const BONUS_RATE = 0.12; // +12% impressions on the house

// Dev's earning for ONE impression at a given CPM, in paise. ₹50 CPM → 2.5 paise.
export function impressionEarningPaise(bidCpm = FLOOR_CPM) {
  return (bidCpm / 1000) * 100 * DEV_SHARE; // = bidCpm * 0.05
}

export async function recordImpression(o: {
  devId: string | null;
  campaignId?: string | null;
  bidCpm?: number;
  surface?: string | null;
  city?: string | null;
  eventUuid: string;
}): Promise<boolean> {
  const sql = getSql();
  // Earn only on a REAL paid campaign shown to a signed-in dev. House ads earn ₹0.
  const earn = o.devId && o.campaignId ? impressionEarningPaise(o.bidCpm ?? FLOOR_CPM) : 0;
  const ins = (await sql`
    insert into events (type, campaign_id, dev_id, city, surface, event_uuid, earning_paise)
    values ('impression', ${o.campaignId ?? null}, ${o.devId}, ${o.city ?? null}, ${o.surface ?? null}, ${o.eventUuid}, ${earn})
    on conflict (event_uuid) do nothing
    returning id`) as Array<{ id: number }>;
  const inserted = ins.length > 0;
  // Decrement the campaign's budget once, only for a genuinely new impression.
  if (inserted && o.campaignId) {
    await sql`
      update campaigns
      set impressions_served = impressions_served + 1,
          status = case when impressions_served + 1 >= impressions_purchased * ${1 + BONUS_RATE} then 'exhausted' else status end
      where id = ${o.campaignId}`;
  }
  return inserted;
}

export async function recordClick(o: {
  devId: string | null;
  campaignId?: string | null;
  surface?: string | null;
  city?: string | null;
  eventUuid: string;
}) {
  const sql = getSql();
  await sql`
    insert into events (type, campaign_id, dev_id, city, surface, event_uuid, earning_paise)
    values ('click', ${o.campaignId ?? null}, ${o.devId}, ${o.city ?? null}, ${o.surface ?? null}, ${o.eventUuid}, 0)
    on conflict (event_uuid) do nothing`;
}

export async function getEarnings(devId: string) {
  const sql = getSql();
  const t = (await sql`
    select
      coalesce(sum(earning_paise) filter (where type='impression'), 0) as total_paise,
      count(*) filter (where type='impression') as impressions,
      count(*) filter (where type='click') as clicks
    from events where dev_id = ${devId}`)[0];
  const paid = (await sql`select coalesce(sum(amount_paise),0) as p from payout_requests where dev_id=${devId}`)[0];
  const days = await sql`
    select to_char(date_trunc('day', ts), 'YYYY-MM-DD') as day, sum(earning_paise) as paise
    from events where dev_id = ${devId} and type='impression'
    group by 1 order by 1 desc limit 30`;
  const totalPaise = Number(t.total_paise);
  const balancePaise = totalPaise - Number(paid.p);
  return {
    totalInr: +(totalPaise / 100).toFixed(2),
    balanceInr: +(balancePaise / 100).toFixed(2),
    balancePaise,
    impressions: Number(t.impressions),
    clicks: Number(t.clicks),
    dayWise: days.map((d) => ({ day: d.day, inr: +(Number(d.paise) / 100).toFixed(2) })),
  };
}

export async function requestPayout(devId: string) {
  const e = await getEarnings(devId);
  if (e.balancePaise < PAYOUT_MIN_PAISE) {
    return { ok: false, reason: `Minimum ₹${PAYOUT_MIN_PAISE / 100} to request a payout`, balanceInr: e.balanceInr };
  }
  const sql = getSql();
  const id = randomUUID();
  await sql`insert into payout_requests (id, dev_id, amount_paise, status) values (${id}, ${devId}, ${Math.round(e.balancePaise)}, 'requested')`;
  return { ok: true, amountInr: e.balanceInr };
}
