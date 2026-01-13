'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CaseManagerProps {
    threadId: string;
    currentCaseId?: string | null;
    onCaseUpdated: () => void;
}

export default function CaseManager({ threadId, currentCaseId, onCaseUpdated }: CaseManagerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [cases, setCases] = useState<any[]>([]);
    const [mode, setMode] = useState<'SELECT' | 'CREATE'>('SELECT');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    // Create Form State
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newPriority, setNewPriority] = useState('MEDIUM');

    useEffect(() => {
        if (isOpen && mode === 'SELECT') {
            fetchCases();
        }
    }, [isOpen, mode]);

    const fetchCases = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/cases');
            if (res.ok) {
                const { data } = await res.json();
                setCases(data);
            }
        } catch (error) {
            console.error('Failed to fetch cases');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAddToCase = async (caseId: string) => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/cases/${caseId}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ threadId })
            });

            if (res.ok) {
                setIsOpen(false);
                onCaseUpdated();
            }
        } catch (error) {
            console.error('Failed to add to case');
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateCase = async () => {
        if (!newTitle) return;
        setIsLoading(true);
        try {
            const res = await fetch('/api/cases', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription,
                    priority: newPriority,
                    initialThreadId: threadId
                })
            });

            if (res.ok) {
                const { data } = await res.json();
                setIsOpen(false);
                onCaseUpdated();
                // Optionally redirect to new case
                // router.push(`/dashboard/cases/${data.id}`);
            }
        } catch (error) {
            console.error('Failed to create case');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Case Association</h3>
                {currentCaseId && (
                    <button
                        onClick={() => router.push(`/dashboard/cases/${currentCaseId}`)}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider"
                    >
                        View Case &rarr;
                    </button>
                )}
            </div>

            {isOpen ? (
                <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex gap-2 mb-4 bg-gray-200 p-1 rounded-lg">
                        <button
                            onClick={() => setMode('SELECT')}
                            className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'SELECT' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Existing Case
                        </button>
                        <button
                            onClick={() => setMode('CREATE')}
                            className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider transition-all ${mode === 'CREATE' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            New Case
                        </button>
                    </div>

                    {mode === 'SELECT' && (
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {isLoading ? (
                                <div className="text-center py-4 text-xs text-gray-500 animate-pulse">Loading cases...</div>
                            ) : cases.length === 0 ? (
                                <div className="text-center py-4 text-xs text-gray-500">No open cases found.</div>
                            ) : (
                                cases.map(c => (
                                    <button
                                        key={c.id}
                                        onClick={() => handleAddToCase(c.id)}
                                        className="w-full text-left p-2.5 rounded-lg bg-white border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-gray-900 group-hover:text-blue-700">#{c.caseNumber} {c.title}</span>
                                            <span className="text-[9px] font-black bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">{c.status}</span>
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    )}

                    {mode === 'CREATE' && (
                        <div className="space-y-3">
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Case Title</label>
                                <input
                                    type="text"
                                    value={newTitle}
                                    onChange={(e) => setNewTitle(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="e.g. Urgent Request regarding..."
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Description</label>
                                <textarea
                                    value={newDescription}
                                    onChange={(e) => setNewDescription(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                    placeholder="Add details..."
                                    rows={2}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Priority</label>
                                <select
                                    value={newPriority}
                                    onChange={(e) => setNewPriority(e.target.value)}
                                    className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                >
                                    <option value="LOW">Low</option>
                                    <option value="MEDIUM">Medium</option>
                                    <option value="HIGH">High</option>
                                </select>
                            </div>
                            <button
                                onClick={handleCreateCase}
                                disabled={isLoading || !newTitle}
                                className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                            >
                                {isLoading ? 'Creating...' : 'Create Case & Link'}
                            </button>
                        </div>
                    )}

                    <button
                        onClick={() => setIsOpen(false)}
                        className="w-full mt-3 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider hover:text-gray-600"
                    >
                        Cancel
                    </button>
                </div>
            ) : currentCaseId ? (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-col gap-3">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                            </svg>
                        </div>
                        <div>
                            <div className="text-xs font-bold text-blue-900">Associated with Case</div>
                            <div className="text-[10px] text-blue-500 font-bold uppercase tracking-wider">Active Link</div>
                        </div>
                    </div>

                    <button
                        onClick={() => setIsOpen(true)}
                        className="w-full py-1.5 text-[10px] font-bold text-blue-400 bg-white border border-blue-100 rounded-lg hover:bg-blue-50 hover:text-blue-600 transition-colors uppercase tracking-wider"
                    >
                        Change Case
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsOpen(true)}
                    className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 font-bold text-xs uppercase tracking-wider hover:border-blue-300 hover:text-blue-500 hover:bg-blue-50 transition-all flex items-center justify-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Link to Case
                </button>
            )}
        </div>
    );
}
