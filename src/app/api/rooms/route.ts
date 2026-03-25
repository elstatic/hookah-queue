import { NextResponse } from "next/server";
import { createRoom, getRoom } from "@/lib/db";

export async function POST(request: Request) {
  const body = await request.json();
  const name = body.name?.trim();

  if (!name) {
    return NextResponse.json(
      { error: "Название комнаты обязательно" },
      { status: 400 }
    );
  }

  const { room, ownerToken } = createRoom(name);

  return NextResponse.json({
    roomId: room.id,
    roomName: room.name,
    ownerToken,
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const roomId = url.searchParams.get("id");

  if (!roomId) {
    return NextResponse.json({ error: "ID комнаты обязателен" }, { status: 400 });
  }

  const room = getRoom(roomId);
  if (!room) {
    return NextResponse.json({ error: "Комната не найдена" }, { status: 404 });
  }

  return NextResponse.json({
    id: room.id,
    name: room.name,
  });
}
