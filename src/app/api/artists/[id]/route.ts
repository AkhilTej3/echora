import { NextRequest, NextResponse } from "next/server";
import { getArtist } from "@/lib/music";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const artistId = parseInt(id, 10);

  if (isNaN(artistId)) {
    return NextResponse.json({ error: "Invalid artist ID" }, { status: 400 });
  }

  try {
    const artist = await getArtist(artistId);
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    return NextResponse.json({ artist });
  } catch (error) {
    console.error("Artist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
