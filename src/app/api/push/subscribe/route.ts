import { NextResponse } from "next/server";
import { verifyParticipant, savePushSubscription } from "@/lib/db";

export async function POST(req: Request) {
  const body = await req.json();
  const { roomId, userToken, subscription } = body;

  if (!roomId || !userToken || !subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const participant = verifyParticipant(roomId, userToken);
  if (!participant) {
    return NextResponse.json({ error: "Not a participant" }, { status: 403 });
  }

  savePushSubscription(userToken, roomId, subscription);
  return NextResponse.json({ ok: true });
}
