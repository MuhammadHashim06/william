import { NextRequest } from "next/server";

export function getActorUserId(req: NextRequest): string | null {
    const v = req.headers.get("x-actor-user-id");
    return v?.trim() ? v.trim() : null;
}

export function requireActorUserId(req: NextRequest): string {
    const id = getActorUserId(req);
    if (!id) throw new Error("Missing x-actor-user-id header");
    return id;
}