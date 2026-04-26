import { NextRequest, NextResponse } from "next/server";
import { getArtistAlbums } from "@/lib/music";

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
    const albums = await getArtistAlbums(artistId);
    return NextResponse.json({ albums });
  } catch (error) {
    console.error("Artist albums error:", error);
    return NextResponse.json({ error: "Failed", albums: [] }, { status: 500 });
  }
}
