import { NextRequest, NextResponse } from "next/server";
import ytdl from "@distube/ytdl-core";

export async function GET(req: NextRequest) {
  const videoId = req.nextUrl.searchParams.get("v");
  if (!videoId) {
    return NextResponse.json({ error: "Missing video ID" }, { status: 400 });
  }

  try {
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(url);

    const format = ytdl.chooseFormat(info.formats, {
      quality: "highestaudio",
      filter: "audioonly",
    });

    if (!format?.url) {
      return NextResponse.json({ error: "No audio format found" }, { status: 404 });
    }

    return NextResponse.json({ url: format.url });
  } catch (error) {
    console.error("Stream error:", error);
    return NextResponse.json({ error: "Failed to get stream" }, { status: 500 });
  }
}
