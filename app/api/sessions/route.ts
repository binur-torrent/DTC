import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const session = await db.session.create({
      data: {
        durationMs: data.durationMs,
        dataSource: data.dataSource,
        avgFocus: data.avgFocus,
        avgStress: data.avgStress,
        avgCalmness: data.avgCalmness,
      },
    });
    return NextResponse.json({ success: true, session });
  } catch (error) {
    console.error("Failed to save session:", error);
    return NextResponse.json({ success: false, error: "Failed to save session" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const sessions = await db.session.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return NextResponse.json({ success: true, sessions });
  } catch (error) {
    console.error("Failed to fetch sessions:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch sessions" }, { status: 500 });
  }
}
