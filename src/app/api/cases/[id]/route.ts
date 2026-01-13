import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const caseId = (await params).id;

    try {
        const caseData = await prisma.case.findUnique({
            where: { id: caseId },
            include: {
                threads: {
                    include: {
                        inbox: true,
                        owner: true,
                        messages: {
                            include: {
                                attachments: true
                            },
                            orderBy: { receivedAt: 'asc' }
                        }
                    },
                    orderBy: { updatedAt: 'desc' }
                },
                createdBy: {
                    select: { displayName: true, initials: true }
                }
            }
        });

        if (!caseData) {
            return NextResponse.json({ error: 'Case not found' }, { status: 404 });
        }

        return NextResponse.json({ data: caseData });
    } catch (error) {
        console.error('Failed to fetch case:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const caseId = (await params).id;

    try {
        const body = await req.json();
        const updatedCase = await prisma.case.update({
            where: { id: caseId },
            data: body
        });

        return NextResponse.json({ data: updatedCase });
    } catch (error) {
        console.error('Failed to update case:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
