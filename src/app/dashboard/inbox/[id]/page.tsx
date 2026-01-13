'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { AttachmentCard } from '@/app/dashboard/components/AttachmentCard';
import { Department, getStagesForDepartment } from '@/domain/enums';
import EditThreadModal from '@/app/dashboard/components/EditThreadModal';
import ThreadNotes from '@/app/dashboard/components/ThreadNotes';
import ThreadMetadata from '@/app/dashboard/components/ThreadMetadata';
import CaseManager from '@/app/dashboard/components/CaseManager';

export default function InboxThreadPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const [thread, setThread] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const router = useRouter();
    const threadId = params.id;

    useEffect(() => {
        const fetchThread = async () => {
            try {
                const res = await fetch(`/api/inbox/${threadId}`);
                if (res.ok) {
                    const { data } = await res.json();
                    setThread(data);
                }
            } catch (error) {
                console.error('Failed to load thread');
            } finally {
                setIsLoading(false);
            }
        };

        const fetchUsers = async () => {
            try {
                const res = await fetch('/api/users');
                if (res.ok) {
                    const data = await res.json();
                    setUsers(data);
                }
            } catch (error) {
                // Silently fail if not admin or error
            }
        };

        fetchThread();
        fetchUsers();
    }, [threadId]);

    const handleUpdateMetadata = async (updates: any) => {
        try {
            const res = await fetch(`/api/threads/${threadId}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                await fetchThread();
            }
        } catch (error) {
            console.error('Failed to update metadata');
            throw error;
        }
    };

    const fetchThread = async () => {
        try {
            const res = await fetch(`/api/inbox/${threadId}`);
            if (res.ok) {
                const { data } = await res.json();
                setThread(data);
            }
        } catch (error) {
            console.error('Failed to reload thread');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 uppercase tracking-widest animate-pulse font-bold">Loading conversation...</div>;
    if (!thread) return <div className="p-8 text-center text-gray-500">Thread not found</div>;

    const lastAudit = thread.auditLogs?.[0];
    const updatedBy = lastAudit?.actor?.initials;

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-start justify-between bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="space-y-4 flex-1">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <button onClick={() => router.back()} className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
                                &larr; Back
                            </button>
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-blue-50 text-blue-600 border border-blue-200">
                                {thread.processingStatus}
                            </span>
                            {updatedBy && (
                                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                                    Updated by {updatedBy}
                                </span>
                            )}
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">{thread.subject || '(No Subject)'}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-500 font-medium">Inbox: {thread.inbox.emailAddress}</span>
                            <span className="text-gray-300">&bull;</span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                                {thread.department}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600 border border-purple-100">
                                {thread.stage.replace(/_/g, ' ')}
                            </span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-8 pt-3 border-t border-gray-100">
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Current Owner</div>
                            <div className="flex items-center gap-2 bg-blue-50/50 px-2 py-1 rounded-full border border-blue-100/50">
                                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-blue-500/20">
                                    {thread.owner?.initials || 'S'}
                                </div>
                                <span className="text-xs font-bold text-blue-800 pr-1">{thread.owner?.displayName || 'System'}</span>
                            </div>
                        </div>

                        {thread.slaDueAt && (
                            <div>
                                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">SLA Deadline</div>
                                <div className={`flex items-center gap-1.5 text-xs font-bold ${new Date(thread.slaDueAt) < new Date() ? 'text-red-600' : 'text-orange-600'}`}>
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    {new Date(thread.slaDueAt).toLocaleString()}
                                    {new Date(thread.slaDueAt) < new Date() && <span className="text-[10px] ml-1 px-1 bg-red-100 rounded uppercase font-black text-red-700">Breached</span>}
                                </div>
                            </div>
                        )}

                        <button
                            onClick={() => setIsEditModalOpen(true)}
                            className="ml-auto bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl shadow-gray-200 transition-all flex items-center gap-2 group"
                        >
                            <svg className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                            Manage Thread
                        </button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">
                    {/* Data Hub Section */}
                    {thread.messages?.some((m: any) => m.attachments?.length > 0) && (
                        <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-blue-500/5 transition-all hover:shadow-2xl hover:shadow-blue-500/10">
                            <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-600 px-8 py-6">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg">
                                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                            </svg>
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-0.5">Files & AI Intelligence</h3>
                                            <p className="text-[10px] text-blue-100 font-black uppercase tracking-[0.2em] opacity-90">Centralized Data Stream</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white/10 text-white text-[10px] font-black px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 uppercase tracking-widest shadow-inner">
                                            {thread.messages.reduce((acc: number, m: any) => acc + (m.attachments?.length || 0), 0)} Documents Detected
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-gray-50/50">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {thread.messages.flatMap((m: any) => m.attachments || []).map((att: any) => (
                                        <div key={att.id} className="xl:col-span-2 last:xl:col-span-2 odd:xl:col-span-2 even:xl:col-span-2">
                                            <AttachmentCard attachment={att} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {thread.messages?.map((msg: any) => {
                        const from = msg.fromJson?.sender?.emailAddress?.name || msg.fromJson?.from?.emailAddress?.name || msg.fromJson?.emailAddress?.name || 'Unknown';
                        const fromEmail = msg.fromJson?.sender?.emailAddress?.address || msg.fromJson?.from?.emailAddress?.address || msg.fromJson?.emailAddress?.address || '';

                        return (
                            <div key={msg.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-200/50 flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <div className="font-bold text-gray-900 text-sm tracking-tight">{from} <span className="text-gray-400 font-medium text-xs ml-1">&lt;{fromEmail}&gt;</span></div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{new Date(msg.receivedAt).toLocaleString()}</div>
                                        </div>
                                        {msg.hasAttachments && (
                                            <div className="ml-auto p-1.5 bg-blue-50 rounded-lg border border-blue-100" title="Has Attachments">
                                                <svg className="w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="p-6 text-sm text-gray-800 prose prose-sm max-w-none">
                                    {msg.bodyHtml ? (
                                        <div dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} />
                                    ) : (
                                        <div className="whitespace-pre-wrap">{msg.bodyText}</div>
                                    )}
                                </div>
                                {/* Attachments are now in the Data Hub */}

                            </div>
                        );
                    })}
                </div>

                <div className="space-y-6 lg:sticky lg:top-6">
                    <ThreadMetadata
                        metadata={thread.metadata}
                        department={thread.department}
                        stage={thread.stage}
                    />
                    <CaseManager
                        threadId={thread.id}
                        currentCaseId={thread.caseId}
                        onCaseUpdated={fetchThread}
                    />
                    <ThreadNotes
                        threadId={thread.id}
                        notes={thread.notes || []}
                        onNoteAdded={fetchThread}
                    />
                </div>
            </div>

            <EditThreadModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                thread={thread}
                users={users}
                onSave={handleUpdateMetadata}
            />
        </div>
    );
}
