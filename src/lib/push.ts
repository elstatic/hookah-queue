import webpush from "web-push";
import type { Participant } from "@/types";
import { getPushSubscriptionsForRoom, removePushSubscription, getRoom } from "./db";

let vapidConfigured = false;

function ensureVapid() {
  if (vapidConfigured) return;

  let publicKey = process.env.VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    publicKey = keys.publicKey;
    privateKey = keys.privateKey;
    console.log("=== VAPID keys generated (add to .env for persistence) ===");
    console.log(`VAPID_PUBLIC_KEY=${publicKey}`);
    console.log(`VAPID_PRIVATE_KEY=${privateKey}`);
    console.log("===========================================================");
    process.env.VAPID_PUBLIC_KEY = publicKey;
    process.env.VAPID_PRIVATE_KEY = privateKey;
  }

  webpush.setVapidDetails("mailto:noreply@hookah.local", publicKey, privateKey);
  vapidConfigured = true;
}

export function getVapidPublicKey(): string {
  ensureVapid();
  return process.env.VAPID_PUBLIC_KEY!;
}

export function sendQueuePushNotifications(
  roomId: string,
  newQueue: Participant[],
  prevQueue?: Participant[]
) {
  ensureVapid();

  const subs = getPushSubscriptionsForRoom(roomId);
  if (subs.length === 0) return;

  const room = getRoom(roomId);
  const roomName = room?.name || "Hookah Queue";

  const prevMap = new Map(prevQueue?.map((p) => [p.user_token, p]) || []);

  const promises: Promise<void>[] = [];

  for (const sub of subs) {
    const participant = newQueue.find((p) => p.user_token === sub.user_token);
    if (!participant) continue;

    const prev = prevMap.get(sub.user_token);
    const becameActive = participant.status === "active" && prev?.status !== "active";
    const positionChanged = prev && prev.position !== participant.position && participant.status === "waiting";

    let payload: object | null = null;

    if (becameActive) {
      payload = {
        title: roomName,
        body: "Ваша очередь!",
        tag: `hq-turn-${roomId}`,
        data: { url: `/room/${roomId}` },
      };
    } else if (positionChanged) {
      payload = {
        title: roomName,
        body: `Вы #${participant.position} в очереди`,
        tag: `hq-pos-${roomId}`,
        data: { url: `/room/${roomId}` },
      };
    }

    if (!payload) continue;

    const pushSub = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.p256dh, auth: sub.auth },
    };

    promises.push(
      webpush.sendNotification(pushSub, JSON.stringify(payload)).then(
        () => {},
        (err: { statusCode?: number }) => {
          if (err.statusCode === 410 || err.statusCode === 404) {
            removePushSubscription(sub.endpoint);
          }
        }
      )
    );
  }

  if (promises.length > 0) {
    Promise.allSettled(promises).catch(() => {});
  }
}
