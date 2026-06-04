import { NextResponse } from "next/server";
import { listReleases } from "@/lib/github";

export const runtime = "nodejs";

export async function GET() {
  try {
    const releases = await listReleases();
    return NextResponse.json({ releases });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
