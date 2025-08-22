import { NextResponse } from "next/server";

export async function GET() {
  const k = process.env.TWELVEDATA_API_KEY || "";
  return NextResponse.json({ ok: true, keyPresent: Boolean(k), keyLen: k.length });
}





