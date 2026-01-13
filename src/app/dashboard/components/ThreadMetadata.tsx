'use client';

import { StaffingStage } from '@/domain/enums';

interface ThreadMetadataProps {
    metadata: any;
    department: string;
    stage: string;
}

export default function ThreadMetadata({ metadata, department, stage }: ThreadMetadataProps) {
    if (!metadata || Object.keys(metadata).length === 0) {
        return (
            <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-4">Detailed Intelligence</h3>
                <p className="text-xs text-gray-400 italic">No structured metadata available for this stage.</p>
            </div>
        );
    }

    const renderField = (label: string, value: string, icon?: React.ReactNode) => {
        if (!value) return null;
        return (
            <div className="space-y-1">
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</div>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-100 px-3 py-2 rounded-xl text-sm font-medium text-gray-900 shadow-sm transition-all hover:bg-white hover:border-blue-100 group">
                    {icon && <span className="text-blue-500 opacity-60 group-hover:opacity-100 transition-opacity">{icon}</span>}
                    {value}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Structured Intelligence</h3>

            <div className="space-y-4">
                {metadata.scheduledAt && renderField('Scheduled For', new Date(metadata.scheduledAt).toLocaleString(), (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                ))}

                {metadata.providerName && renderField('Assigned Provider', metadata.providerName, (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                ))}

                {metadata.invoiceNumber && renderField('Invoice Reference', metadata.invoiceNumber, (
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                ))}

                {metadata.outcomeNote && (
                    <div className="space-y-1">
                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outcome Summary</div>
                        <div className="bg-green-50/50 border border-green-100/50 p-3 rounded-xl text-sm font-medium text-gray-900 shadow-inner">
                            {metadata.outcomeNote}
                        </div>
                    </div>
                )}

                {/* Catch-all for other metadata fields if any */}
                {Object.entries(metadata).map(([key, value]) => {
                    const knownKeys = ['scheduledAt', 'providerName', 'invoiceNumber', 'outcomeNote'];
                    if (knownKeys.includes(key) || !value) return null;
                    return renderField(key.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase()), String(value));
                })}
            </div>
        </div>
    );
}
