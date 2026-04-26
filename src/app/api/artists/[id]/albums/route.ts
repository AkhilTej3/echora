import { NextRequest, NextResponse } from "next/server";
import { getArtistAlbums } from "@/lib/jiosaavn";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const albums = await getArtistAlbums(id);
    return NextResponse.json({ albums });
  } catch (error) {
    console.error("Artist albums error:", error);
    return NextResponse.json({ error: "Failed", albums: [] }, { status: 500 });
  }
}
