'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { AttachmentCard } from '@/app/dashboard/components/AttachmentCard';
import { PatientProfile } from '@/app/dashboard/components/PatientProfile';
import EditThreadModal from '@/app/dashboard/components/EditThreadModal';
import EditCaseModal from '@/app/dashboard/components/EditCaseModal';

export default function CaseDetailPage(props: { params: Promise<{ id: string }> }) {
    const params = use(props.params);
    const [caseData, setCaseData] = useState<any>(null);
    const [users, setUsers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isEditCaseModalOpen, setIsEditCaseModalOpen] = useState(false);
    const router = useRouter();
    const caseId = params.id;

    useEffect(() => {
        const fetchCase = async () => {
            try {
                const res = await fetch(`/api/cases/${caseId}`);
                if (res.ok) {
                    const { data } = await res.json();
                    setCaseData(data);
                }
            } catch (error) {
                console.error('Failed to load case');
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
                // Silently fail
            }
        };

        fetchCase();
        fetchUsers();
    }, [caseId]);

    const handleUpdateMetadata = async (updates: any) => {
        const activeThread = caseData?.threads?.[0];
        if (!activeThread) return;

        try {
            const res = await fetch(`/api/threads/${activeThread.id}/metadata`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                // Re-fetch case to update header with new sorting/data
                const caseRes = await fetch(`/api/cases/${caseId}`);
                if (caseRes.ok) {
                    const { data } = await caseRes.json();
                    setCaseData(data);
                }
            }
        } catch (error) {
            console.error('Failed to update metadata');
        }
    };

    const handleUpdateStatus = async (newStatus: string) => {
        try {
            const res = await fetch(`/api/cases/${caseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                setCaseData({ ...caseData, status: newStatus });
            }
        } catch (error) {
            console.error('Failed to update status');
        }
    };

    const handleUpdateCase = async (updates: { title: string; description: string }) => {
        try {
            const res = await fetch(`/api/cases/${caseId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
            if (res.ok) {
                const { data } = await res.json();
                setCaseData({ ...caseData, title: data.title, description: data.description });
            }
        } catch (error) {
            console.error('Failed to update case');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 uppercase tracking-widest animate-pulse font-bold">Loading Case...</div>;
    if (!caseData) return <div className="p-8 text-center text-gray-500">Case not found</div>;

    // Merge messages from all threads for a "Merged View"
    const allMessages = caseData.threads
        .flatMap((t: any) => t.messages.map((m: any) => ({ ...m, threadSubject: t.subject, threadId: t.id })))
        .sort((a: any, b: any) => new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime());

    const allAttachments = allMessages.flatMap((m: any) => m.attachments || []);

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-start justify-between bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="space-y-4 flex-1">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <Link href="/dashboard/cases" className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
                                &larr; Cases
                            </Link>
                            <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-gray-100 text-gray-600 border border-gray-200">
                                {caseData.status}
                            </span>
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-1 tracking-tight">
                            <span className="text-gray-400 mr-2">#{caseData.caseNumber}</span>
                            {caseData.title || '(No Title)'}
                            <button
                                onClick={() => setIsEditCaseModalOpen(true)}
                                className="ml-3 inline-flex p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                title="Edit Case Details"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                            </button>
                        </h1>
                        <p className="text-sm text-gray-500 font-medium whitespace-pre-wrap">
                            {caseData.description || 'No description provided.'}
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-8 pt-3 border-t border-gray-100">
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Priority</div>
                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${caseData.priority === 'HIGH' ? 'bg-red-50 text-red-600' :
                                caseData.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-600' :
                                    'bg-green-50 text-green-600'
                                }`}>
                                {caseData.priority}
                            </span>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Stage</div>
                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-600">
                                {caseData.threads?.[0]?.stage || '-'}
                            </span>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Department</div>
                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-blue-50 text-blue-600">
                                {caseData.threads?.[0]?.department || '-'}
                            </span>
                        </div>
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Created By</div>
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-full bg-blue-600 flex items-center justify-center text-[10px] font-black text-white shadow-lg shadow-blue-500/20">
                                    {caseData.createdBy?.initials || 'S'}
                                </div>
                                <span className="text-xs font-bold text-blue-800 pr-1">{caseData.createdBy?.displayName || 'System'}</span>
                            </div>
                        </div>

                        <div className="ml-auto flex gap-2">
                            {caseData.status === 'OPEN' && (
                                <button
                                    onClick={() => handleUpdateStatus('CLOSED')}
                                    className="bg-gray-900 hover:bg-black text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xl shadow-gray-200 transition-all"
                                >
                                    Close Case
                                </button>
                            )}
                            {caseData.status === 'CLOSED' && (
                                <button
                                    onClick={() => handleUpdateStatus('OPEN')}
                                    className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all"
                                >
                                    Reopen Case
                                </button>
                            )}

                            {caseData.threads?.[0] && (
                                <button
                                    onClick={() => setIsEditModalOpen(true)}
                                    className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-2"
                                >
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                    Manage Thread
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                <div className="lg:col-span-2 space-y-6">

                    {/* Merged Patient Profile */}
                    <PatientProfile attachments={allAttachments} />

                    {/* Case Data Hub Section */}
                    {allAttachments.length > 0 && (
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
                                            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-0.5">Case Intelligence</h3>
                                            <p className="text-[10px] text-blue-100 font-black uppercase tracking-[0.2em] opacity-90">Merged Data Stream</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-white/10 text-white text-[10px] font-black px-4 py-2 rounded-xl backdrop-blur-md border border-white/10 uppercase tracking-widest shadow-inner">
                                            {allAttachments.length} Documents Aggregated
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 bg-gray-50/50">
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                                    {allAttachments.map((att: any) => (
                                        <div key={att.id} className="xl:col-span-2 last:xl:col-span-2 odd:xl:col-span-2 even:xl:col-span-2">
                                            <AttachmentCard attachment={att} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    <h2 className="text-lg font-black text-gray-900 tracking-tight flex items-center gap-2">
                        <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                        </svg>
                        Case Timeline (Merged View)
                    </h2>

                    {/* Merged Messages Feed */}
                    {allMessages.length === 0 ? (
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-8 text-center text-sm text-gray-500">
                            No messages found in this case.
                        </div>
                    ) : (
                        allMessages.map((msg: any) => {
                            const from = msg.fromJson?.sender?.emailAddress?.name || msg.fromJson?.from?.emailAddress?.name || msg.fromJson?.emailAddress?.name || 'Unknown';
                            const fromEmail = msg.fromJson?.sender?.emailAddress?.address || msg.fromJson?.from?.emailAddress?.address || msg.fromJson?.emailAddress?.address || '';

                            return (
                                <div key={msg.id} className="relative pl-8 before:absolute before:left-3 before:top-8 before:bottom-[-24px] before:w-0.5 before:bg-gray-200 last:before:hidden">
                                    <div className="absolute left-0 top-3 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center z-10">
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
                                        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex justify-between items-center">
                                            <div className="flex items-center gap-2 w-full overflow-hidden">
                                                <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100 shrink-0">
                                                    {msg.threadSubject || 'Thread'}
                                                </span>
                                                <span className="text-xs text-gray-400 truncate">
                                                    Thread ID: {msg.threadId}
                                                </span>
                                                <div className="ml-auto text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                    {new Date(msg.receivedAt).toLocaleString()}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="p-4">
                                            <div className="flex items-center gap-2 mb-3">
                                                <div className="font-bold text-gray-900 text-sm">{from}</div>
                                                <div className="text-xs text-gray-400">&lt;{fromEmail}&gt;</div>
                                            </div>
                                            <div className="text-sm text-gray-800 prose prose-sm max-w-none line-clamp-3 hover:line-clamp-none transition-all">
                                                {msg.bodyHtml ? (
                                                    <div dangerouslySetInnerHTML={{ __html: msg.bodyHtml }} />
                                                ) : (
                                                    <div className="whitespace-pre-wrap">{msg.bodyText}</div>
                                                )}
                                            </div>
                                            {/* Attachments Preview */}
                                            {msg.attachments && msg.attachments.length > 0 && (
                                                <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
                                                    {msg.attachments.map((att: any) => (
                                                        <div key={att.id} className="bg-gray-50 border border-gray-200 rounded p-2 text-xs flex items-center gap-2 shrink-0">
                                                            <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                                                            </svg>
                                                            <span className="truncate max-w-[150px]">{att.filename}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                <div className="space-y-6">
                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-4">Linked Threads</h3>
                        <div className="space-y-3">
                            {caseData.threads.map((thread: any) => (
                                <Link key={thread.id} href={`/dashboard/conversation/${thread.id}`} className="block group">
                                    <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl hover:bg-blue-50 hover:border-blue-200 transition-all">
                                        <div className="text-xs font-bold text-gray-900 mb-1 truncate group-hover:text-blue-700">
                                            {thread.subject || '(No Subject)'}
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] text-gray-500 font-medium">{thread.inbox.emailAddress}</span>
                                            <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 group-hover:border-blue-200 group-hover:text-blue-500">
                                                {thread.stage}
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {caseData.threads?.[0] && (
                <EditThreadModal
                    isOpen={isEditModalOpen}
                    onClose={() => setIsEditModalOpen(false)}
                    thread={caseData.threads[0]}
                    users={users}
                    onSave={handleUpdateMetadata}
                />
            )}

            <EditCaseModal
                isOpen={isEditCaseModalOpen}
                onClose={() => setIsEditCaseModalOpen(false)}
                caseData={{ title: caseData.title, description: caseData.description }}
                onSave={handleUpdateCase}
            />
        </div>
    );
}
