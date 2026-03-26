"use client";

import { useCallback, useRef } from "react";

function playSound() {
  try {
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    // Two-tone chime
    [440, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.3, now + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.01, now + i * 0.15 + 0.4);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.4);
    });
  } catch {
    // Audio not available
  }
}

function showBrowserNotification(title: string, body: string) {
  if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon: "/favicon.ico" });
  } catch {
    // Notification not available
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr;
}

export function useNotification() {
  const permissionAsked = useRef(false);
  const pushSubscribed = useRef(false);

  const requestPermission = useCallback(() => {
    if (
      typeof Notification === "undefined" ||
      Notification.permission === "granted" ||
      Notification.permission === "denied" ||
      permissionAsked.current
    ) return;
    permissionAsked.current = true;
    Notification.requestPermission();
  }, []);

  const subscribeToPush = useCallback(async (roomId: string, userToken: string) => {
    if (pushSubscribed.current) return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        const res = await fetch("/api/push/vapid-key");
        const { publicKey } = await res.json();

        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey).buffer as ArrayBuffer,
        });
      }

      await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId, userToken, subscription: subscription.toJSON() }),
      });

      pushSubscribed.current = true;
    } catch {
      // Push not available
    }
  }, []);

  const notifyTurn = useCallback((roomName: string) => {
    playSound();
    showBrowserNotification("Hookah Queue", `Ваша очередь в "${roomName}"!`);
  }, []);

  return { requestPermission, subscribeToPush, notifyTurn };
}
