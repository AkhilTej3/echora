import { NextRequest, NextResponse } from "next/server";
import { getAlbum } from "@/lib/jiosaavn";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const album = await getAlbum(id);
    if (!album) {
      return NextResponse.json({ error: "Album not found" }, { status: 404 });
    }
    return NextResponse.json(album);
  } catch (error) {
    console.error("Album error:", error);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
