
import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { utils, write } from "xlsx";

export async function GET() {
    try {
        const cases = await prisma.case.findMany({
            include: {
                createdBy: true,
                threads: {
                    include: {
                        messages: {
                            include: {
                                attachments: true,
                            },
                            orderBy: { receivedAt: 'asc' }
                        },
                        auditLogs: {
                            include: {
                                actor: true
                            },
                            orderBy: { createdAt: 'asc' }
                        },
                        drafts: { // Added Drafts fetch
                            include: {
                                createdBy: true,
                                lastEditedBy: true
                            }
                        },
                        notes: { // Added Notes fetch
                            include: {
                                createdBy: true
                            }
                        },
                        owner: true, // Fetch thread owner info
                        inbox: true,
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        });

        // Helper to format user info
        const formatUser = (u: any) => u ? ({ Name: u.displayName || 'N/A', Email: u.email, Role: u.role }) : { Name: 'System', Email: '', Role: '' };

        // Sheet 1: Cases Overview
        const casesData = cases.map(c => {
            const allMessages = c.threads.flatMap(t => t.messages);
            const latestMessage = allMessages.sort((a, b) => (b.receivedAt?.getTime() || 0) - (a.receivedAt?.getTime() || 0))[0];
            const latestAudit = c.threads.flatMap(t => t.auditLogs).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
            const creator = formatUser(c.createdBy);

            return {
                'Case ID': c.caseNumber,
                'Title': c.title,
                'Description': c.description,
                'Status': c.status,
                'Priority': c.priority,
                'Created By Name': creator.Name,
                'Created By Email': creator.Email,
                'Created By Role': creator.Role,
                'Created At': c.createdAt.toISOString(),
                'Last Updated At': c.updatedAt.toISOString(),
                'Latest Activity': latestMessage?.receivedAt?.toISOString() || latestAudit?.createdAt.toISOString() || c.updatedAt.toISOString(),
                'Thread Count': c.threads.length,
                'Total Emails': allMessages.length,
                'Notes Count': c.threads.reduce((acc, t) => acc + t.notes.length, 0),
                'Drafts Count': c.threads.reduce((acc, t) => acc + t.drafts.length, 0),
                'Latest Stage': c.threads[0]?.stage || 'N/A'
            };
        });

        // Sheet 2: Threads
        const threadsData = cases.flatMap(c =>
            c.threads.map(t => {
                const owner = formatUser(t.owner);
                return {
                    'Case ID': c.caseNumber,
                    'Thread ID': t.id,
                    'Graph Conversation ID': t.graphConversationId,
                    'Subject': t.subject,
                    'Department': t.department,
                    'Stage': t.stage,
                    'Processing Status': t.processingStatus,
                    'Needs Review': t.needsReview ? 'Yes' : 'No',
                    'Response Required': t.responseRequired ? 'Yes' : 'No',
                    'Suggested Draft Type': t.draftTypeSuggested || '',
                    'SLA Due At': t.slaDueAt?.toISOString() || '',
                    'SLA Breached': t.slaBreachedAt ? 'Yes' : 'No',
                    'Owner Name': owner.Name,
                    'Owner Email': owner.Email,
                    'Inbox': t.inbox.emailAddress,
                    'Message Count': t.messages.length,
                    'Metadata': t.metadata ? JSON.stringify(t.metadata) : '',
                    'Last Message At': t.lastMessageAt?.toISOString(),
                    'Created At': t.createdAt.toISOString()
                };
            })
        );

        // Sheet 3: Emails
        const emailsData = cases.flatMap(c =>
            c.threads.flatMap(t =>
                t.messages.map(m => {
                    const attachments = m.attachments.map(a => `${a.filename} (${a.sizeBytes ? Math.round(a.sizeBytes / 1024) + 'KB' : 'Unknown size'})`).join(', ');
                    return {
                        'Case ID': c.caseNumber,
                        'Thread ID': t.id,
                        'Message ID': m.id,
                        'Internet Message ID': m.internetMessageId || '',
                        'Graph Message ID': m.graphMessageId,
                        'From': m.fromJson ? (typeof m.fromJson === 'object' && 'email' in m.fromJson ? (m.fromJson as any).email : JSON.stringify(m.fromJson)) : '',
                        'To': m.toJson ? (Array.isArray(m.toJson) ? m.toJson.map((r: any) => r.email).join(', ') : JSON.stringify(m.toJson)) : '',
                        'CC': m.ccJson ? (Array.isArray(m.ccJson) ? m.ccJson.map((r: any) => r.email).join(', ') : JSON.stringify(m.ccJson)) : '',
                        'Subject': m.subject,
                        'Body Preview': m.bodyPreview,
                        'Has Attachments': m.hasAttachments ? 'Yes' : 'No',
                        'Attachment Count': m.attachments.length,
                        'Attachment Details': attachments,
                        'Received At': m.receivedAt?.toISOString(),
                        'Sent At': m.sentAt?.toISOString(),
                        'Direction': m.internetMessageId ? 'Inbound' : 'Outbound'
                    }
                })
            )
        );

        // Sheet 4: Drafts
        const draftsData = cases.flatMap(c =>
            c.threads.flatMap(t =>
                t.drafts.map(d => {
                    const creator = formatUser(d.createdBy);
                    const editor = formatUser(d.lastEditedBy);
                    return {
                        'Case ID': c.caseNumber,
                        'Thread ID': t.id,
                        'Draft ID': d.id,
                        'Subject': d.subject,
                        'Status': d.status,
                        'Type': d.draftType,
                        'Created By': creator.Name,
                        'Last Edited By': editor.Name,
                        'Created At': d.createdAt.toISOString(),
                        'Updated At': d.updatedAt.toISOString()
                    };
                })
            )
        );

        // Sheet 5: Attachments
        const attachmentsData = cases.flatMap(c =>
            c.threads.flatMap(t =>
                t.messages.flatMap(m =>
                    m.attachments.map(a => ({
                        'Case ID': c.caseNumber,
                        'Thread ID': t.id,
                        'Message ID': m.id,
                        'Attachment ID': a.id,
                        'Filename': a.filename,
                        'Mime Type': a.mimeType,
                        'Size (Bytes)': a.sizeBytes,
                        'Is Inline': a.isInline ? 'Yes' : 'No',
                        'Status': a.status,
                        'Created At': a.createdAt.toISOString()
                    }))
                )
            )
        );

        // Sheet 6: Extracted Data (Patient Data)
        const extractedData = cases.flatMap(c =>
            c.threads.flatMap(t =>
                t.messages.flatMap(m =>
                    m.attachments
                        .filter(a => a.status === 'EXTRACTED' && a.extractedJson)
                        .map(a => {
                            const ej: any = a.extractedJson;
                            const patientName = ej?.patient?.name?.full || ej?.patient?.name || ej?.patientName || ej?.name || 'N/A';
                            // Attempt to find other common fields broadly
                            const patientDob = ej?.patient?.dob || ej?.dob || 'N/A';
                            const patientId = ej?.patient?.id || ej?.mrn || ej?.patientId || 'N/A';

                            return {
                                'Case ID': c.caseNumber,
                                'Thread ID': t.id,
                                'Attachment ID': a.id,
                                'Filename': a.filename,
                                'Patient Name': patientName,
                                'Patient DOB': patientDob,
                                'Patient ID/MRN': patientId,
                                'Confidence': ej?.confidence || 'N/A',
                                'Full Extracted Data': JSON.stringify(ej)
                            };
                        })
                )
            )
        );

        // Sheet 7: Notes
        const notesData = cases.flatMap(c =>
            c.threads.flatMap(t =>
                t.notes.map(n => {
                    const creator = formatUser(n.createdBy);
                    return {
                        'Case ID': c.caseNumber,
                        'Thread ID': t.id,
                        'Note ID': n.id,
                        'Content': n.description,
                        'Created By': creator.Name,
                        'Created At': n.createdAt.toISOString()
                    };
                })
            )
        );

        // Sheet 8: Timeline / Audit Logs
        const timelineData = cases.flatMap(c =>
            c.threads.flatMap(t =>
                t.auditLogs.map(log => {
                    const actor = formatUser(log.actor);
                    return {
                        'Case ID': c.caseNumber,
                        'Thread ID': t.id,
                        'Action': log.action,
                        'Actor Name': actor.Name,
                        'Actor Email': actor.Email,
                        'Actor Role': actor.Role,
                        'Details': log.payload ? JSON.stringify(log.payload) : '',
                        'Timestamp': log.createdAt.toISOString(),
                        'Relative Time': log.createdAt.toLocaleTimeString()
                    };
                })
            )
        );

        const workbook = utils.book_new();

        utils.book_append_sheet(workbook, utils.json_to_sheet(casesData), "Cases");
        utils.book_append_sheet(workbook, utils.json_to_sheet(threadsData), "Threads");
        utils.book_append_sheet(workbook, utils.json_to_sheet(emailsData), "Emails");
        utils.book_append_sheet(workbook, utils.json_to_sheet(draftsData), "Drafts");
        utils.book_append_sheet(workbook, utils.json_to_sheet(attachmentsData), "Attachments");
        utils.book_append_sheet(workbook, utils.json_to_sheet(extractedData), "Extracted Data");
        utils.book_append_sheet(workbook, utils.json_to_sheet(notesData), "Notes");
        utils.book_append_sheet(workbook, utils.json_to_sheet(timelineData), "Timeline");

        const buffer = write(workbook, { type: "buffer", bookType: "xlsx" });

        return new NextResponse(buffer, {
            headers: {
                "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                "Content-Disposition": `attachment; filename="cases_export_${new Date().toISOString().split('T')[0]}.xlsx"`,
            },
        });

    } catch (error) {
        console.error("Export failed:", error);
        return NextResponse.json({ error: "Failed to generate export" }, { status: 500 });
    }
}
