import webPush from "web-push";
import { prisma } from "@/lib/db";

const VAPID_CONFIGURED =
  !!process.env.VAPID_EMAIL &&
  !!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY &&
  !!process.env.VAPID_PRIVATE_KEY;

if (VAPID_CONFIGURED) {
  webPush.setVapidDetails(
    process.env.VAPID_EMAIL!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
}

/**
 * Sends a web push notification to all of a user's active browser subscriptions.
 * Expired/invalid subscriptions (HTTP 410 or 404) are automatically removed from the DB.
 * Safe to fire-and-forget — errors are caught and logged, never thrown.
 */
/** Returns { sent, failed, total } counts. Safe to fire-and-forget — errors never thrown. */
export async function sendPushToUser(
  userId: string,
  title: string,
  body: string,
  url = "/notifications",
): Promise<{ sent: number; failed: number; total: number }> {
  if (!VAPID_CONFIGURED) return { sent: 0, failed: 0, total: 0 };

  let subs;
  try {
    subs = await prisma.pushSubscription.findMany({ where: { userId } });
  } catch (err) {
    console.error("[push] DB fetch error:", err);
    return { sent: 0, failed: 0, total: 0 };
  }

  if (subs.length === 0) return { sent: 0, failed: 0, total: 0 };

  const payload = JSON.stringify({ title, body, url });

  const results = await Promise.allSettled(
    subs.map((sub) =>
      webPush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload,
      ),
    ),
  );

  const toDelete: string[] = [];
  let sent = 0;
  let failed = 0;

  results.forEach((result, i) => {
    if (result.status === "fulfilled") {
      sent++;
    } else {
      const err = result.reason as { statusCode?: number };
      if (err?.statusCode === 410 || err?.statusCode === 404) {
        toDelete.push(subs[i].endpoint);
      } else {
        console.error("[push] Send failed:", subs[i].endpoint, err);
      }
      failed++;
    }
  });

  if (toDelete.length > 0) {
    await prisma.pushSubscription
      .deleteMany({ where: { endpoint: { in: toDelete } } })
      .catch((e) => console.error("[push] Failed to delete expired subs:", e));
  }

  return { sent, failed, total: subs.length };
}
