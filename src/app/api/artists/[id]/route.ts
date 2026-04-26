import { NextRequest, NextResponse } from "next/server";
import { getArtist } from "@/lib/jiosaavn";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const artist = await getArtist(id);
    if (!artist) {
      return NextResponse.json({ error: "Artist not found" }, { status: 404 });
    }
    return NextResponse.json(artist);
  } catch (error) {
    console.error("Artist error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
