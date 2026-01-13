'use client';

import { useState } from 'react';

interface Note {
    id: string;
    description: string;
    createdAt: string;
    createdBy: {
        id: string;
        displayName: string | null;
        initials: string;
    } | null;
}

interface ThreadNotesProps {
    threadId: string;
    notes: Note[];
    onNoteAdded: () => Promise<void>;
}

export default function ThreadNotes({ threadId, notes, onNoteAdded }: ThreadNotesProps) {
    const [newNote, setNewNote] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newNote.trim() || isSubmitting) return;

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/threads/${threadId}/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description: newNote })
            });

            if (res.ok) {
                setNewNote('');
                await onNoteAdded();
            } else {
                console.error('Failed to add note');
            }
        } catch (error) {
            console.error('Failed to add note:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Internal Notes</h3>
                <span className="bg-gray-200 text-gray-600 text-[10px] font-black px-2 py-0.5 rounded-full">
                    {notes.length}
                </span>
            </div>

            <div className="p-6 space-y-6">
                {/* Note List */}
                <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                    {notes.length === 0 ? (
                        <div className="text-center py-8">
                            <div className="bg-gray-50 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                                <svg className="w-6 h-6 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                            </div>
                            <p className="text-xs text-gray-400 font-medium italic">No internal notes yet...</p>
                        </div>
                    ) : (
                        notes.map((note) => (
                            <div key={note.id} className="flex gap-3 group animate-in fade-in slide-in-from-top-1 duration-200">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex-shrink-0 flex items-center justify-center text-[10px] font-black text-blue-700 border border-blue-200">
                                    {note.createdBy?.initials || '?'}
                                </div>
                                <div className="flex-1 space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-gray-900">
                                            {note.createdBy?.displayName || 'Unknown'}
                                        </span>
                                        <span className="text-[10px] text-gray-400 font-medium">
                                            {new Date(note.createdAt).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-700 leading-relaxed border border-gray-100 border-transparent group-hover:border-gray-200 transition-colors">
                                        {note.description}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Add Note Form */}
                <form onSubmit={handleSubmit} className="pt-4 border-t border-gray-100">
                    <div className="relative">
                        <textarea
                            value={newNote}
                            onChange={(e) => setNewNote(e.target.value)}
                            placeholder="Type an internal note..."
                            disabled={isSubmitting}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 transition-all min-h-[80px] resize-none"
                        />
                        <button
                            type="submit"
                            disabled={!newNote.trim() || isSubmitting}
                            className="absolute bottom-3 right-3 bg-blue-600 text-white px-4 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:grayscale flex items-center gap-2 shadow-lg shadow-blue-500/20"
                        >
                            {isSubmitting ? (
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                            Save Note
                        </button>
                    </div>
                </form>
            </div>

            <style jsx>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #e5e7eb;
                    border-radius: 10px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #d1d5db;
                }
            `}</style>
        </div>
    );
}
