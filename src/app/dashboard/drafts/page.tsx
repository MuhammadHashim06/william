'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type Draft = {
    id: string;
    status: string;
    draftType: string;
    subject: string | null;
    updatedAt: string;
    thread: {
        id: string;
        subject: string | null;
        inbox: { emailAddress: string };
    };
    createdBy: { displayName: string | null; initials: string } | null;
    lastEditedBy: { displayName: string | null; initials: string } | null;
};

export default function DraftsPage() {
    const router = useRouter();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);

    const fetchDrafts = async () => {
        setIsLoading(true);
        try {
            const query = new URLSearchParams({
                page: page.toString(),
                limit: '10',
                ...(search && { search })
            });

            const res = await fetch(`/api/drafts?${query}`);
            if (res.ok) {
                const { data, meta } = await res.json();
                setDrafts(data);
                setTotalPages(meta.totalPages);
                setTotalCount(meta.total);
            }
        } catch (error) {
            console.error('Failed to fetch drafts', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(() => {
            fetchDrafts();
        }, 300);
        return () => clearTimeout(timer);
    }, [page, search]);

    useEffect(() => {
        setPage(1);
    }, [search]);

    return (
        <div className="max-w-full space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Drafts Repository</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1 italic">Pending Agent Responses</p>
                </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-gray-200/50 flex flex-col">
                {/* Search Header */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            placeholder="Search drafts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all shadow-sm"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {totalCount} Drafts Pending
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                                <th className="px-4 py-5">Status</th>
                                <th className="px-4 py-5">Intel Subject</th>
                                <th className="px-4 py-5">Editor</th>
                                <th className="px-4 py-5 text-right">Modified</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="px-10 py-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 animate-pulse">Syncing Draft Registry...</td></tr>
                            ) : drafts.length === 0 ? (
                                <tr><td colSpan={4} className="px-10 py-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-300">No Pending Drafts Detected</td></tr>
                            ) : (
                                drafts.map((draft) => (
                                    <tr
                                        key={draft.id}
                                        onClick={() => router.push(`/dashboard/drafts/${draft.id}`)}
                                        className="hover:bg-gray-50/80 transition-all duration-300 cursor-pointer group"
                                    >
                                        <td className="px-4 py-6">
                                            <div className="flex flex-col gap-1.5">
                                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm w-fit ${draft.status === 'READY_FOR_REVIEW' ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                                                    }`}>
                                                    {draft.status.replace(/_/g, ' ')}
                                                </span>
                                                <div className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">{draft.draftType}</div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="text-sm font-black text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors break-words">{draft.subject || draft.thread.subject || '(No Subject Identified)'}</div>
                                            <div className="text-[9px] font-bold text-blue-500/60 uppercase tracking-widest mt-1">Re: {draft.thread.inbox.emailAddress}</div>
                                        </td>
                                        <td className="px-4 py-6">
                                            <div className="flex items-center gap-2.5 bg-white border border-gray-100 w-fit p-1.5 rounded-xl shadow-sm group-hover:border-blue-200 transition-all duration-300">
                                                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-[9px] text-white font-black shadow-lg shadow-blue-500/10">
                                                    {draft.lastEditedBy?.initials || draft.createdBy?.initials || '?'}
                                                </div>
                                                <div className="flex flex-col pr-1">
                                                    <span className="text-[10px] text-gray-900 font-black tracking-tight truncate max-w-[80px]">
                                                        {draft.lastEditedBy?.displayName || draft.createdBy?.displayName || 'System'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-6 text-right">
                                            <div className="text-[10px] font-black text-gray-900 tracking-tight">
                                                {new Date(draft.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                            <div className="text-[9px] font-black text-gray-400 mt-0.5 uppercase tracking-widest leading-none">
                                                {new Date(draft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-10 py-6 border-t border-gray-50 flex items-center justify-between bg-gray-50/30">
                        <button
                            disabled={page === 1}
                            onClick={() => { setPage(p => p - 1); window.scrollTo(0, 0); }}
                            className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:hover:shadow-none transition-all duration-300 shadow-sm"
                        >
                            &larr; Prev Page
                        </button>
                        <div className="flex items-center gap-3">
                            <span className="h-2 w-px bg-gray-200" />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Page {page} / {totalPages}</span>
                            <span className="h-2 w-px bg-gray-200" />
                        </div>
                        <button
                            disabled={page === totalPages}
                            onClick={() => { setPage(p => p + 1); window.scrollTo(0, 0); }}
                            className="bg-white border border-gray-200 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-blue-600 hover:border-blue-200 hover:shadow-lg disabled:opacity-30 disabled:hover:text-gray-600 disabled:hover:border-gray-200 disabled:hover:shadow-none transition-all duration-300 shadow-sm"
                        >
                            Next Page &rarr;
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
