import { NextRequest, NextResponse } from "next/server";
import { getSmartRecommendations } from "@/lib/youtube";

export async function POST(req: NextRequest) {
  try {
    const { current, queue, history } = await req.json();

    if (!current?.videoId) {
      return NextResponse.json({ error: "current track required" }, { status: 400 });
    }

    const results = await getSmartRecommendations(
      current,
      queue || [],
      history || []
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Related videos error:", error);
    return NextResponse.json({ error: "Failed", results: [] }, { status: 500 });
  }
}
