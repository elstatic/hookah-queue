"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

interface SharePanelProps {
  roomId: string;
}

export default function SharePanel({ roomId }: SharePanelProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);

  const roomUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/room/${roomId}`
      : "";

  useEffect(() => {
    if (roomUrl) {
      QRCode.toDataURL(roomUrl, {
        width: 256,
        margin: 2,
        color: { dark: "#000000", light: "#ffffff" },
      }).then(setQrDataUrl);
    }
  }, [roomUrl]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(roomUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const input = document.createElement("input");
      input.value = roomUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="space-y-3">
      {qrDataUrl && (
        <div className="flex justify-center p-4 bg-white rounded-xl">
          <img src={qrDataUrl} alt="QR код комнаты" width={200} height={200} />
        </div>
      )}
      <button
        onClick={copyLink}
        className="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/20 text-white text-sm font-medium transition-colors"
      >
        {copied ? "Скопировано!" : "Скопировать ссылку"}
      </button>
    </div>
  );
}
