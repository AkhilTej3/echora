import { NextRequest, NextResponse } from "next/server";
import { generateMoodTags } from "@/lib/mood";

export async function GET(req: NextRequest) {
  const title = req.nextUrl.searchParams.get("title") || "";
  const channel = req.nextUrl.searchParams.get("channel") || "";

  const tags = generateMoodTags(title, channel);

  return NextResponse.json({ tags });
}
