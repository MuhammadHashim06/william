import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/auth";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Department, isValidStageForDepartment } from "@/domain/enums";
import { AuditAction } from "@prisma/client";

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
    const session = (await cookies()).get("session")?.value;
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    try {
        const { id } = await ctx.params;
        const json = await req.json();
        const { ownerUserId, department, stage, metadata } = json;

        // Fetch current state for audit comparison
        const currentThread = await prisma.thread.findUnique({ where: { id } });
        if (!currentThread) return NextResponse.json({ error: "Thread not found" }, { status: 404 });

        const data: any = {};
        const logs: any[] = [];

        // Batch Audit Logs & Create Automated Notes - Decrypt early for logic
        const payload = await decrypt(session);
        const initials = payload.user.initials;
        const currentUserId = payload.user.id;

        // Auto-assign owner if stage/dept changes and no owner specified
        if ((department || stage) && ownerUserId === undefined) {
            if (currentThread.ownerUserId !== currentUserId) {
                data.owner = { connect: { id: currentUserId } };
                logs.push({
                    action: "OWNER_CHANGED",
                    description: `Auto-assigned owner to ${payload.user.displayName || initials} due to update`
                });
            }
        }

        // Validate & Prep Owner (Explicit override)
        if (ownerUserId !== undefined) {
            const nextOwnerId = ownerUserId === 'NONE' ? null : ownerUserId;
            if (nextOwnerId !== currentThread.ownerUserId) {
                if (nextOwnerId === null) {
                    data.owner = { disconnect: true };
                } else {
                    data.owner = { connect: { id: nextOwnerId } };
                }
                logs.push({
                    action: "OWNER_CHANGED",
                    description: `Owner changed to ${nextOwnerId || 'None'}`
                });
            }
        }

        // Validate & Prep Department
        if (department && Object.values(Department).includes(department as Department)) {
            data.department = department;
            if (data.department !== currentThread.department) {
                logs.push({
                    action: "STAGE_CHANGED",
                    description: `Department changed from ${currentThread.department} to ${department}`
                });
            }
        }

        // Validate & Prep Stage
        if (stage) {
            const dept = data.department || currentThread.department;
            if (isValidStageForDepartment(dept as Department, stage)) {
                data.stage = stage;
                if (data.stage !== currentThread.stage) {
                    logs.push({
                        action: "STAGE_CHANGED",
                        description: `Stage changed from ${currentThread.stage} to ${stage}`
                    });
                }
            }
        }

        // Add generic metadata
        if (metadata) {
            data.metadata = metadata;
            logs.push({
                action: "AI_CLASSIFIED", // Generic action for metadata update or create a new one if needed
                description: "Metadata updated"
            });
        }

        if (Object.keys(data).length === 0) {
            return NextResponse.json({ error: "No changes provided" }, { status: 400 });
        }

        const thread = await prisma.thread.update({
            where: { id },
            data,
            include: {
                owner: { select: { id: true, displayName: true, initials: true } },
                inbox: true,
                messages: {
                    orderBy: { receivedAt: 'desc' },
                    include: {
                        attachments: true
                    }
                }
            }
        });

        // Batch Audit Logs & Create Automated Notes

        if (logs.length > 0) {
            // Create Audit Logs
            await prisma.auditLog.createMany({
                data: logs.map(log => ({
                    threadId: id,
                    actorUserId: payload.user.id,
                    action: log.action as AuditAction,
                    payload: { text: log.description, initials }
                }))
            });

            // Create Automated Notes
            for (const log of logs) {
                await prisma.note.create({
                    data: {
                        threadId: id,
                        createdByUserId: payload.user.id,
                        description: `[${initials}] ${log.description}`
                    }
                });
            }
        }

        return NextResponse.json({ data: thread });
    } catch (error) {
        console.error("Metadata update error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
