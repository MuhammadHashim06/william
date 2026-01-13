'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

type Thread = {
    id: string;
    subject: string | null;
    processingStatus: string;
    department: string;
    stage: string;
    lastMessageAt: string;
    createdAt: string;
    owner?: {
        displayName: string | null;
        initials: string;
    } | null;
    slaDueAt?: string | null;
    slaBreachedAt?: string | null;
    messages: Array<{
        bodyPreview: string | null;
        fromJson: any;
        hasAttachments: boolean;
    }>;
    inbox: {
        id: string;
        emailAddress: string;
    };
};

export default function InboxPage() {
    const [threads, setThreads] = useState<Thread[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('ALL');
    const [inboxFilter, setInboxFilter] = useState('ALL');
    const [inboxes, setInboxes] = useState<any[]>([]);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchInboxes = async () => {
            try {
                const res = await fetch('/api/inboxes');
                if (res.ok) {
                    const { data } = await res.json();
                    setInboxes(data);
                }
            } catch (error) {
                console.error('Failed to fetch inboxes', error);
            }
        };
        fetchInboxes();
    }, []);

    const [search, setSearch] = useState('');

    const fetchThreads = async () => {
        setIsLoading(true);
        try {
            const queryParams = new URLSearchParams({
                page: page.toString(),
                status: filter !== 'ALL' ? filter : '',
                inboxId: inboxFilter !== 'ALL' ? inboxFilter : '',
                ...(search && { search })
            });
            const res = await fetch(`/api/inbox?${queryParams.toString()}`);
            if (res.ok) {
                const { data, meta } = await res.json();
                setThreads(data);
                setTotalPages(meta.totalPages);
            }
        } catch (error) {
            console.error('Failed to fetch inbox', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchThreads();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, filter, inboxFilter, search]);

    // Reset page when filters change
    useEffect(() => {
        setPage(1);
    }, [filter, inboxFilter, search]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'NEW': return 'bg-blue-50 text-blue-700 border-blue-200';
            case 'CLASSIFIED': return 'bg-indigo-50 text-indigo-700 border-indigo-200';
            case 'DRAFTED': return 'bg-amber-50 text-amber-700 border-amber-200';
            case 'DONE': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
            case 'FAILED': return 'bg-rose-50 text-rose-700 border-rose-200';
            default: return 'bg-gray-50 text-gray-700 border-gray-200';
        }
    };

    return (
        <div className="max-w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Intelligence Inbox</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1 italic">Managing global inbound streams</p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-gray-200/50">
                {/* Search & Filters Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                        {/* Search Bar */}
                        <div className="relative w-full lg:w-96">
                            <input
                                type="text"
                                placeholder="Search inbox..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all shadow-sm"
                            />
                            <svg className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                        </div>
                        <div className="text-xs font-bold text-gray-400 uppercase tracking-widest hidden lg:block">
                            {inboxes.length > 0 ? `${inboxes.length} Sources Active` : 'System Ready'}
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex flex-wrap items-center gap-1 bg-white border border-gray-100 p-1 rounded-xl shadow-sm max-w-full">
                                <button
                                    onClick={() => { setInboxFilter('ALL'); setPage(1); }}
                                    className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 whitespace-normal h-auto text-center ${inboxFilter === 'ALL'
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                        : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                        }`}
                                >
                                    All Sources
                                </button>
                                {inboxes.map((inbox) => (
                                    <button
                                        key={inbox.id}
                                        onClick={() => { setInboxFilter(inbox.id); setPage(1); }}
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 whitespace-normal h-auto text-center ${inboxFilter === inbox.id
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        {inbox.emailAddress.split('@')[0]}
                                    </button>
                                ))}
                            </div>

                            <div className="flex flex-wrap items-center gap-1 bg-white border border-gray-100 p-1 rounded-xl shadow-sm max-w-full">
                                {['ALL', 'NEW', 'CLASSIFIED', 'DRAFTED', 'DONE'].map((status) => (
                                    <button
                                        key={status}
                                        onClick={() => { setFilter(status); setPage(1); }}
                                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all duration-300 whitespace-normal h-auto text-center ${filter === status
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                                            : 'text-gray-400 hover:text-gray-900 hover:bg-gray-50'
                                            }`}
                                    >
                                        {status}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
                {isLoading ? (
                    <div className="p-20 text-center flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center animate-bounce">
                            <div className="w-6 h-6 rounded-full border-4 border-blue-600 border-t-transparent animate-spin" />
                        </div>
                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest animate-pulse font-bold">Syncing Records...</div>
                    </div>
                ) : threads.length === 0 ? (
                    <div className="p-20 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 rounded-[2rem] bg-gray-50 mb-6 border border-gray-100 shadow-inner">
                            <svg className="w-10 h-10 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">No Active Streams</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2 px-10">Adjust your synchronization filters or check again later.</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50">
                        {threads.map((thread) => {
                            const latestMsg = thread.messages[0];
                            const sender = latestMsg?.fromJson?.sender?.emailAddress?.name || latestMsg?.fromJson?.from?.emailAddress?.name || latestMsg?.fromJson?.emailAddress?.name || 'Unknown';
                            const statusColor = getStatusColor(thread.processingStatus);

                            return (
                                <Link
                                    key={thread.id}
                                    href={`/dashboard/inbox/${thread.id}`}
                                    className="block group relative"
                                >
                                    <div className="absolute inset-y-0 left-0 w-1.5 bg-blue-600 scale-y-0 group-hover:scale-y-100 transition-transform origin-top duration-500" />
                                    <div className="flex items-start justify-between p-4 bg-white group-hover:bg-gray-50/80 transition-all duration-300 gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${statusColor}`}>
                                                    {thread.processingStatus}
                                                </span>
                                                <div className="flex items-center gap-1.5 text-[9px] font-black text-gray-400 uppercase tracking-wider bg-gray-50 border border-gray-100 px-2 py-1 rounded-lg">
                                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 opacity-50" />
                                                    {thread.department} / {thread.stage}
                                                </div>
                                                <div className="text-[9px] font-bold text-blue-500/50 uppercase tracking-widest hidden xl:block truncate max-w-[150px]">
                                                    {thread.inbox.emailAddress}
                                                </div>
                                                {thread.slaDueAt && (
                                                    <div className={`flex items-center gap-2 text-[9px] font-black uppercase tracking-widest ml-auto sm:ml-0 ${new Date(thread.slaDueAt) < new Date() ? 'text-red-600 bg-red-50 border-red-100' : 'text-orange-600 bg-orange-50 border-orange-100'} px-2 py-1 rounded-lg border`}>
                                                        <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                        </svg>
                                                        {new Date(thread.slaDueAt) < new Date() ? 'Breached' : `${new Date(thread.slaDueAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                                    </div>
                                                )}
                                            </div>

                                            <h3 className="text-lg font-black text-gray-900 break-words pr-6 group-hover:text-blue-600 transition-colors tracking-tight flex items-center gap-2">
                                                {thread.subject || '(No Subject Detected)'}
                                                {latestMsg?.hasAttachments && (
                                                    <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.414a4 4 0 00-5.656-5.656l-6.415 6.414a6 6 0 108.486 8.486L20.5 13" />
                                                    </svg>
                                                )}
                                            </h3>

                                            <div className="mt-2 flex items-start gap-2.5">
                                                <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-[9px] font-black text-gray-400 border border-gray-200 shadow-inner group-hover:bg-white transition-colors duration-300">
                                                    {sender.charAt(0) || '?'}
                                                </div>
                                                <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed h-[2.5rem] pt-0.5">
                                                    <span className="text-gray-900 font-black tracking-tight">{sender}: </span>
                                                    {latestMsg?.bodyPreview || 'No intelligence preview available for this stream.'}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end justify-between self-stretch pt-1 min-w-[100px] sm:min-w-[120px]">
                                            <div className="text-right">
                                                <div className="text-[10px] font-black text-gray-900 tracking-tight">
                                                    {new Date(thread.lastMessageAt || thread.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </div>
                                                <div className="text-[9px] font-black text-gray-400 mt-0.5 uppercase tracking-widest">
                                                    {new Date(thread.lastMessageAt || thread.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>

                                            {thread.owner ? (
                                                <div className="flex items-center gap-2 bg-white border border-gray-100 p-1.5 rounded-xl shadow-sm group-hover:border-blue-200 transition-all duration-300" title={`Managed by ${thread.owner.displayName}`}>
                                                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-[9px] text-white font-black shadow-lg shadow-blue-500/20">
                                                        {thread.owner.initials}
                                                    </div>
                                                    <div className="flex flex-col pr-1">
                                                        <span className="text-[10px] text-gray-900 font-black tracking-tight truncate max-w-[60px]">
                                                            {thread.owner.displayName?.split(' ')[0]}
                                                        </span>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-gray-300 font-black uppercase text-[9px] tracking-widest py-2">
                                                    <span className="w-1 h-1 rounded-full bg-gray-200" />
                                                    System
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-10 py-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <button
                            disabled={page === 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
                            className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:hover:shadow-none transition-all duration-300 shadow-sm"
                        >
                            &larr; Prev Repository
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-px bg-gray-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Stream {page} / {totalPages}</span>
                            <span className="h-2 w-px bg-gray-200" />
                        </div>
                        <button
                            disabled={page === totalPages}
                            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
                            className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:hover:shadow-none transition-all duration-300 shadow-sm"
                        >
                            Next Repository &rarr;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
