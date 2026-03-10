import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const configured = !!apiKey && apiKey !== "placeholder_key" && apiKey.length > 10;

  return NextResponse.json({
    status: configured ? "ok" : "not_configured",
    configured,
    timestamp: new Date().toISOString(),
  });
}
