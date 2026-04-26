import { NextRequest, NextResponse } from "next/server";
import { getAlbumWithTracks } from "@/lib/music";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const albumId = parseInt(id, 10);

  if (isNaN(albumId)) {
    return NextResponse.json({ error: "Invalid album ID" }, { status: 400 });
  }

  try {
    const result = await getAlbumWithTracks(albumId);
    if (!result) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Album error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
