'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CasesPage() {
    const [cases, setCases] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    const [search, setSearch] = useState('');

    const [pagination, setPagination] = useState({ page: 1, limit: 10, totalPages: 0, totalCount: 0 });

    useEffect(() => {
        const fetchCases = async () => {
            setIsLoading(true);
            try {
                const query = new URLSearchParams({
                    page: pagination.page.toString(),
                    limit: pagination.limit.toString(),
                    ...(search && { search })
                });

                const res = await fetch(`/api/cases?${query}`);
                if (res.ok) {
                    const { data, meta } = await res.json();
                    setCases(data);
                    setPagination(prev => ({ ...prev, ...meta }));
                }
            } catch (error) {
                console.error('Failed to load cases');
            } finally {
                setIsLoading(false);
            }
        };

        const debounceTimer = setTimeout(() => {
            fetchCases();
        }, 300);

        return () => clearTimeout(debounceTimer);
    }, [search, pagination.page]);

    // Reset page when search changes
    useEffect(() => {
        setPagination(prev => ({ ...prev, page: 1 }));
    }, [search]);

    const handleRowClick = (caseId: string) => {
        router.push(`/dashboard/cases/${caseId}`);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 tracking-tight">Cases</h1>
                    <p className="text-sm text-gray-500 font-medium mt-1">Manage grouped threads and cases</p>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm flex flex-col">
                {/* Search Bar at the Top of Table Section */}
                <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                    <div className="relative w-full max-w-md">
                        <input
                            type="text"
                            placeholder="Search cases, emails, data..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 w-full transition-all shadow-sm"
                        />
                        <svg className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        {isLoading && (
                            <div className="absolute right-3 top-2.5">
                                <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            </div>
                        )}
                    </div>
                    <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        {pagination.totalCount} Cases Found
                    </div>
                </div>

                <div className="overflow-x-auto min-h-[400px]">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-100">
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Case ID</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Title</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Priority</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stage</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Threads</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Created By</th>
                                <th className="px-3 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {cases.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-3 py-12 text-center text-sm text-gray-500">
                                        {isLoading ? 'Searching...' : 'No cases found matching your criteria.'}
                                    </td>
                                </tr>
                            ) : (
                                cases.map((c) => (
                                    <tr
                                        key={c.id}
                                        className="hover:bg-gray-50/50 transition-colors group cursor-pointer"
                                        onClick={() => handleRowClick(c.id)}
                                    >
                                        <td className="px-3 py-4">
                                            <span className="font-mono text-xs font-bold text-gray-500">#{c.caseNumber}</span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="text-sm font-bold text-gray-900 break-words">{c.title || '(No Title)'}</div>
                                        </td>
                                        <td className="px-3 py-4">
                                            <span className={`inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider ${c.priority === 'HIGH' ? 'bg-red-50 text-red-600' :
                                                c.priority === 'MEDIUM' ? 'bg-orange-50 text-orange-600' :
                                                    'bg-green-50 text-green-600'
                                                }`}>
                                                {c.priority}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <span className="inline-flex items-center px-2 py-1 rounded text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600">
                                                {c.status}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <span className="text-xs font-bold text-gray-700 bg-gray-50 px-2 py-1 rounded border border-gray-200">
                                                {c.threads?.[0]?.stage || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <span className="text-xs font-bold text-gray-500">
                                                {c.threads?.[0]?.department || '-'}
                                            </span>
                                        </td>
                                        <td className="px-3 py-4">
                                            <span className="text-xs font-medium text-gray-600">{c._count?.threads || 0}</span>
                                        </td>
                                        <td className="px-3 py-4">
                                            {c.createdBy ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-6 h-6 rounded-full bg-gray-200 flex items-center justify-center text-[10px] font-black text-gray-600">
                                                        {c.createdBy.initials}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-3 py-4">
                                            <div className="text-xs font-medium text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                <div className="border-t border-gray-100 p-4 bg-gray-50 flex items-center justify-between">
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                        disabled={pagination.page === 1 || isLoading}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                        Previous
                    </button>
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                        Page {pagination.page} of {pagination.totalPages || 1}
                    </span>
                    <button
                        onClick={() => setPagination(prev => ({ ...prev, page: Math.min(pagination.totalPages, prev.page + 1) }))}
                        disabled={pagination.page === pagination.totalPages || isLoading}
                        className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-600 disabled:opacity-50 hover:bg-gray-50 transition-colors"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}
