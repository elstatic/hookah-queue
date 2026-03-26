import { NextResponse } from "next/server";
import { getVapidPublicKey } from "@/lib/push";

export function GET() {
  return NextResponse.json({ publicKey: getVapidPublicKey() });
}
