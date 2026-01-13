'use client';

import { useState, useEffect } from 'react';
import { Department, getStagesForDepartment, StaffingStage } from '@/domain/enums';

type EditThreadModalProps = {
    isOpen: boolean;
    onClose: () => void;
    thread: any;
    users: any[];
    onSave: (updates: any) => Promise<void>;
};

export default function EditThreadModal({ isOpen, onClose, thread, users, onSave }: EditThreadModalProps) {
    const [dept, setDept] = useState(thread.department);
    const [stage, setStage] = useState(thread.stage);
    const [ownerId, setOwnerId] = useState(thread.ownerUserId || 'NONE');
    const [metadata, setMetadata] = useState<any>(thread.metadata || {});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setDept(thread.department);
            setStage(thread.stage);
            setOwnerId(thread.ownerUserId || 'NONE');
            setMetadata(thread.metadata || {});
        }
    }, [isOpen, thread]);

    if (!isOpen) return null;

    const handleDeptChange = (newDept: string) => {
        setDept(newDept);
        const stages = getStagesForDepartment(newDept as Department);
        setStage(stages[0]);
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const updates: any = {
                department: dept,
                stage,
                metadata
            };

            // Only send owner update if it changed
            if (ownerId !== (thread.ownerUserId || 'NONE')) {
                updates.ownerUserId = ownerId === 'NONE' ? null : ownerId;
            }

            await onSave(updates);
            onClose();
        } catch (error) {
            console.error('Failed to save metadata');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-lg font-bold text-gray-900">Update Thread Metadata</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-6 space-y-5">
                    {/* Department */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Department</label>
                        <select
                            value={dept}
                            onChange={(e) => handleDeptChange(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700"
                        >
                            {Object.values(Department).map(d => (
                                <option key={d} value={d}>{d.replace('_', ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Stage */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Stage</label>
                        <select
                            value={stage}
                            onChange={(e) => setStage(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700"
                        >
                            {getStagesForDepartment(dept as Department).map(s => (
                                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
                            ))}
                        </select>
                    </div>

                    {/* Owner */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Owner / Assignee</label>
                        <select
                            value={ownerId}
                            onChange={(e) => setOwnerId(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700"
                        >
                            <option value="NONE">System</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.displayName}</option>
                            ))}
                        </select>
                    </div>

                    {/* Extra Fields based on Stage */}
                    {stage === StaffingStage.ProviderScheduled && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-blue-600">Scheduled Date & Time</label>
                            <input
                                type="datetime-local"
                                value={metadata.scheduledAt || ''}
                                onChange={(e) => setMetadata({ ...metadata, scheduledAt: e.target.value })}
                                className="w-full bg-blue-50/50 border border-blue-100 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-blue-500/20 transition-all font-medium text-gray-700"
                            />
                        </div>
                    )}

                    {stage === 'STAFFED' && dept === Department.Staffing && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-green-600">Provider Name</label>
                            <input
                                type="text"
                                placeholder="Enter provider name..."
                                value={metadata.providerName || ''}
                                onChange={(e) => setMetadata({ ...metadata, providerName: e.target.value })}
                                className="w-full bg-green-50/50 border border-green-100 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/20 transition-all font-medium text-gray-700"
                            />
                        </div>
                    )}

                    {stage === 'COMPLETE' && dept === Department.Billing && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-green-600">Invoice Number</label>
                            <input
                                type="text"
                                placeholder="INV-2026-..."
                                value={metadata.invoiceNumber || ''}
                                onChange={(e) => setMetadata({ ...metadata, invoiceNumber: e.target.value })}
                                className="w-full bg-green-50/50 border border-green-100 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/20 transition-all font-medium text-gray-700"
                            />
                        </div>
                    )}

                    {stage === 'COMPLETE' && dept === Department.CaseManagement && (
                        <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider text-green-600">Final Summary / Outcome</label>
                            <textarea
                                placeholder="Briefly describe the outcome..."
                                value={metadata.outcomeNote || ''}
                                onChange={(e) => setMetadata({ ...metadata, outcomeNote: e.target.value })}
                                className="w-full bg-green-50/50 border border-green-100 text-sm rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-green-500/20 transition-all font-medium text-gray-700 h-20 resize-none"
                            />
                        </div>
                    )}
                </div>

                <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={isSaving}
                        className="flex-1 px-4 py-2.5 text-sm font-bold text-gray-500 hover:text-gray-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex-[2] bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg shadow-blue-500/20 transition-all flex items-center justify-center gap-2"
                    >
                        {isSaving ? (
                            <>
                                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </>
                        ) : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}
