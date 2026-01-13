import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const search = req.nextUrl.searchParams.get('search');

        let whereClause: any = {};

        if (search) {
            whereClause = {
                OR: [
                    { title: { contains: search } },
                    { description: { contains: search } },
                    {
                        threads: {
                            some: {
                                OR: [
                                    { inbox: { emailAddress: { contains: search } } },
                                    {
                                        messages: {
                                            some: {
                                                OR: [
                                                    { subject: { contains: search } },
                                                    { bodyText: { contains: search } },
                                                    {
                                                        attachments: {
                                                            some: {
                                                                OR: [
                                                                    { filename: { contains: search } },
                                                                    { extractionText: { contains: search } }
                                                                ]
                                                            }
                                                        }
                                                    }
                                                ]
                                            }
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ]
            };
        }

        const page = parseInt(req.nextUrl.searchParams.get('page') || '1');
        const limit = parseInt(req.nextUrl.searchParams.get('limit') || '10');
        const skip = (page - 1) * limit;

        const [cases, totalCount] = await Promise.all([
            prisma.case.findMany({
                where: whereClause,
                include: {
                    _count: {
                        select: { threads: true }
                    },
                    createdBy: {
                        select: { displayName: true, initials: true }
                    },
                    threads: {
                        orderBy: { updatedAt: 'desc' },
                        take: 1,
                        select: {
                            stage: true,
                            department: true
                        }
                    }
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: limit
            }),
            prisma.case.count({ where: whereClause })
        ]);

        return NextResponse.json({
            data: cases,
            meta: {
                page,
                limit,
                totalCount,
                totalPages: Math.ceil(totalCount / limit)
            }
        });
    } catch (error) {
        console.error('Failed to fetch cases:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    try {
        const body = await req.json();
        const { title, description, priority, initialThreadId } = body;

        const newCase = await prisma.case.create({
            data: {
                title,
                description,
                priority,
                createdByUserId: session.id,
                threads: initialThreadId ? {
                    connect: { id: initialThreadId }
                } : undefined
            }
        });

        return NextResponse.json({ data: newCase });
    } catch (error) {
        console.error('Failed to create case:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
