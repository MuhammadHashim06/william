import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const caseId = (await params).id;

    try {
        const { threadId } = await req.json();

        if (!threadId) {
            return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
        }

        // Get current thread state to check for old case and status
        const currentThread = await prisma.thread.findUnique({
            where: { id: threadId },
            select: { caseId: true, stage: true }
        });

        if (!currentThread) {
            return NextResponse.json({ error: 'Thread not found' }, { status: 404 });
        }

        const oldCaseId = currentThread.caseId;

        // Update the thread to new case
        const updatedThread = await prisma.thread.update({
            where: { id: threadId },
            data: { caseId: caseId }
        });

        // 1. Delete old case if it becomes empty
        if (oldCaseId && oldCaseId !== caseId) {
            const oldCaseThreadCount = await prisma.thread.count({
                where: { caseId: oldCaseId }
            });

            if (oldCaseThreadCount === 0) {
                console.log(`Deleting empty case ${oldCaseId}`);
                await prisma.case.delete({
                    where: { id: oldCaseId }
                });
            }
        }

        // 2. Update new Case status to match the Thread's stage/status (per user request)
        // "status of case will the latest status of between thread"
        // We'll update the Case status/description or a specific field. 
        // For now, let's update updatedAt to bring it to top, and maybe open it if it was closed.
        await prisma.case.update({
            where: { id: caseId },
            data: {
                status: 'OPEN', // Re-open case if a thread is added
                updatedAt: new Date()
            }
        });

        return NextResponse.json({ data: updatedThread });
    } catch (error) {
        console.error('Failed to add thread to case:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
