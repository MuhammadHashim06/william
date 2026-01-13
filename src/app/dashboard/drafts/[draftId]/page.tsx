'use client';

import { useState, useEffect, use } from 'react'; // Added 'use' import
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function DraftDetailPage(props: { params: Promise<{ draftId: string }> }) {
    const params = use(props.params); // Unwrap params with use()
    const [draft, setDraft] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'write' | 'preview'>('preview');
    const [formData, setFormData] = useState({ bodyHtml: '', subject: '', to: [] as string[], cc: [] as string[] });

    const router = useRouter();
    const draftId = params.draftId;

    useEffect(() => {
        fetchDraft();
    }, [draftId]);

    const fetchDraft = async () => {
        try {
            const res = await fetch(`/api/drafts/${draftId}`);
            if (res.ok) {
                const { data } = await res.json();
                setDraft(data);
                setFormData({
                    bodyHtml: data.bodyHtml || '',
                    subject: data.subject || data.thread.subject || '',
                    to: (data.toRecipients as any[])?.map(r => r.emailAddress.address) || [],
                    cc: (data.ccRecipients as any[])?.map(r => r.emailAddress.address) || []
                });
            }
        } catch (error) {
            console.error('Failed to load draft');
        } finally {
            setIsLoading(false);
        }
    };

    const handleAction = async (action: 'approve' | 'discard' | 'save') => {
        setIsSaving(true);
        try {
            let url = `/api/drafts/${draftId}/${action}`;
            let method = 'POST';
            let body = null;

            if (action === 'save') {
                url = `/api/drafts/${draftId}/edit`;
                // Parse recipients back to structure if needed, or backend handles strings?
                // The service expects array of inputs. For simplicity let's assume we implement Recipient logic in UI later
                // For now sending simplistic update
                body = JSON.stringify({
                    subject: formData.subject,
                    bodyHtml: formData.bodyHtml,
                    // to/cc implementation skipped for this iteration for brevity, assuming read-only for now or simplistic
                });
            }

            const res = await fetch(url, {
                method,
                headers: body ? { 'Content-Type': 'application/json' } : undefined,
                body
            });

            if (res.ok) {
                if (action === 'discard' || action === 'approve') {
                    router.push('/dashboard/drafts');
                } else {
                    alert('Saved successfully');
                    fetchDraft();
                }
            } else {
                const err = await res.json();
                alert('Action failed: ' + err.error);
            }

        } catch (e) {
            console.error(e);
            alert('Error performing action');
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500">Loading draft...</div>;
    if (!draft) return <div className="p-8 text-center text-gray-500">Draft not found</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <Link href="/dashboard/drafts" className="text-xs font-bold text-gray-400 hover:text-gray-900 transition-colors uppercase tracking-widest">
                            &larr; Drafts
                        </Link>
                    </div>
                    <h2 className="text-xl font-bold text-gray-900">Edit Draft</h2>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => handleAction('discard')}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 text-sm font-medium"
                    >
                        Discard
                    </button>
                    <button
                        onClick={() => handleAction('save')}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg bg-gray-900 text-white hover:bg-gray-800 text-sm font-medium"
                    >
                        Save Changes
                    </button>
                    {/* <button
                        onClick={() => handleAction('approve')}
                        disabled={isSaving}
                        className="px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-500/20 text-sm font-medium"
                    >
                        Approve & Send
                    </button> */}
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
                {/* Thread Context */}
                <div className="bg-gray-50 rounded p-3 mb-4 text-sm text-gray-500 border border-gray-100">
                    <p><strong>Thread:</strong> {draft.thread.subject}</p>
                    <p><strong>From Inbox:</strong> {draft.thread.inbox.emailAddress}</p>
                </div>

                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
                    <input
                        type="text"
                        className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={formData.subject}
                        onChange={e => setFormData({ ...formData, subject: e.target.value })}
                    />
                </div>

                <div>
                    <div className="flex items-center justify-between mb-2">
                        <label className="block text-xs font-medium text-gray-500">Content</label>
                        <div className="flex bg-gray-100 rounded-lg p-1 gap-1 border border-gray-200">
                            <button
                                onClick={() => setActiveTab('write')}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'write' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Write (HTML)
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${activeTab === 'preview' ? 'bg-white text-gray-900 shadow-sm border border-gray-200' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Preview
                            </button>
                        </div>
                    </div>

                    {activeTab === 'write' ? (
                        <>
                            <textarea
                                className="w-full h-96 bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 font-mono text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={formData.bodyHtml}
                                onChange={e => setFormData({ ...formData, bodyHtml: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Basic HTML editor. Use &lt;br&gt; for line breaks, &lt;b&gt; for bold.</p>
                        </>
                    ) : (
                        <div
                            className="w-full h-96 bg-white text-gray-900 border border-gray-300 rounded-lg px-4 py-4 overflow-y-auto prose max-w-none text-sm"
                            dangerouslySetInnerHTML={{ __html: formData.bodyHtml }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
