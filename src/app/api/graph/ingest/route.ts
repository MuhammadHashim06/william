import { NextResponse } from "next/server";
import { IngestionService } from "@/services/ingestion.service";

export async function POST() {
    await IngestionService.runOnce();
    return NextResponse.json({ ok: true });
}
