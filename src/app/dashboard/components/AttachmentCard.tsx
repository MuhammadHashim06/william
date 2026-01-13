'use client';

import { useState } from 'react';

export function AttachmentCard({ attachment }: { attachment: any }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [showJson, setShowJson] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const { id, status, filename, contentType, extractedJson, lastError } = attachment;

    const handleDownload = async () => {
        setIsDownloading(true);
        try {
            const res = await fetch(`/api/attachments/${id}/download`);
            if (!res.ok) throw new Error('Failed to download');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error('Download error:', error);
            alert('Failed to download attachment');
        } finally {
            setIsDownloading(false);
        }
    };

    const renderTable = (caption: string, data: any[], colorClassName: string = "blue") => {
        if (!data || data.length === 0) return null;
        const columns = Object.keys(data[0]);

        const colors: any = {
            blue: { border: "border-blue-100", bg: "bg-blue-50/50", header: "bg-blue-100/50", text: "text-blue-600", accent: "text-blue-700" },
            emerald: { border: "border-emerald-100", bg: "bg-emerald-50/50", header: "bg-emerald-100/50", text: "text-emerald-600", accent: "text-emerald-700" },
            violet: { border: "border-violet-100", bg: "bg-violet-50/50", header: "bg-violet-100/50", text: "text-violet-600", accent: "text-violet-700" }
        };
        const c = colors[colorClassName] || colors.blue;

        return (
            <div className="mt-6 group">
                <h4 className={`text-[10px] font-black ${c.text} uppercase tracking-[0.2em] mb-3 px-2 flex items-center gap-2`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${c.text.replace('text', 'bg')} animate-pulse`} />
                    {caption}
                </h4>
                <div className={`overflow-x-auto rounded-2xl border ${c.border} ${c.bg} shadow-sm backdrop-blur-sm group-hover:shadow-md transition-all duration-300`}>
                    <table className="w-full text-left text-xs">
                        <thead>
                            <tr className={`border-b ${c.border} ${c.header}`}>
                                {columns.map((col) => (
                                    <th key={col} className={`px-4 py-3 font-black ${c.accent} uppercase tracking-wider text-[10px]`}>
                                        {col.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').trim()}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/50">
                            {data.map((row, idx) => (
                                <tr key={idx} className="hover:bg-white/50 transition-colors duration-200">
                                    {columns.map((col) => (
                                        <td key={col} className="px-4 py-3 text-gray-700 font-medium">
                                            {typeof row[col] === 'object' ? JSON.stringify(row[col]) : String(row[col] ?? '—')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };

    const renderDataSection = (title: string, data: any, theme: 'indigo' | 'emerald' | 'amber' | 'rose' | 'violet' = 'indigo') => {
        if (!data || Object.keys(data).every(k => !data[k])) return null;

        const themes = {
            indigo: { text: 'text-indigo-600', bg: 'bg-indigo-50/50', border: 'border-indigo-100', icon: 'bg-indigo-100', accent: 'text-indigo-800' },
            emerald: { text: 'text-emerald-600', bg: 'bg-emerald-50/50', border: 'border-emerald-100', icon: 'bg-emerald-100', accent: 'text-emerald-800' },
            amber: { text: 'text-amber-600', bg: 'bg-amber-50/50', border: 'border-amber-100', icon: 'bg-amber-100', accent: 'text-amber-800' },
            rose: { text: 'text-rose-600', bg: 'bg-rose-50/50', border: 'border-rose-100', icon: 'bg-rose-100', accent: 'text-rose-800' },
            violet: { text: 'text-violet-600', bg: 'bg-violet-50/50', border: 'border-violet-100', icon: 'bg-violet-100', accent: 'text-violet-800' }
        };
        const t = themes[theme];

        return (
            <div className="space-y-3">
                <h4 className={`text-[10px] font-black ${t.text} uppercase tracking-[0.2em] mb-1 px-1 flex items-center gap-2`}>
                    <span className={`w-1 h-3 rounded-full ${t.text.replace('text', 'bg')}`} />
                    {title}
                </h4>
                <div className={`grid grid-cols-2 gap-4 ${t.bg} rounded-2xl p-4 border ${t.border} backdrop-blur-md shadow-sm hover:shadow transition-shadow duration-300`}>
                    {Object.entries(data).map(([key, value]) => {
                        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) return null;

                        if (typeof value === 'object' && !Array.isArray(value)) {
                            return (
                                <div key={key} className="col-span-2 mt-2 first:mt-0">
                                    <span className={`text-[10px] ${t.text} font-black uppercase tracking-wider block mb-2`}>{key.replace(/(_|[A-Z])/g, (m) => m === '_' ? ' ' : ` ${m}`).trim()}</span>
                                    <div className="grid grid-cols-2 gap-3 bg-white/60 p-3 rounded-xl border border-white/50 shadow-inner">
                                        {Object.entries(value).map(([subK, subV]) => (
                                            <div key={subK} className="flex flex-col">
                                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{subK}</span>
                                                <span className={`text-[11px] ${t.accent} font-black`}>{String(subV)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }

                        return (
                            <div key={key} className="flex flex-col">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{key.replace(/(_|[A-Z])/g, (m) => m === '_' ? ' ' : ` ${m}`).trim()}</span>
                                <span className={`text-[11px] ${t.accent} font-bold leading-snug`}>{String(value)}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-[2rem] shadow-sm overflow-hidden transition-all duration-500 hover:shadow-xl hover:border-blue-200 group">
            {/* Header */}
            <div className="flex flex-col sm:flex-row flex-wrap sm:items-center justify-between p-6 gap-6 bg-gradient-to-r from-gray-50/80 to-white border-b border-gray-100">
                <div className="flex items-center gap-5 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                        {status === 'PENDING' && (
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-500/30 rounded-full animate-ping" />
                                <div className="h-10 w-10 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30 relative z-10 transition-transform group-hover:scale-110">
                                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                        <path className="opacity-100" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            </div>
                        )}
                        {status === 'EXTRACTED' && (
                            <div className="h-10 w-10 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg shadow-green-500/20 flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                        )}
                        {status === 'FAILED' && (
                            <div className="h-10 w-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl shadow-lg shadow-red-500/20 flex items-center justify-center text-white transition-transform group-hover:scale-110">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col min-w-0">
                        <span className="text-base font-black text-gray-900 truncate group-hover:text-blue-600 transition-colors" title={filename}>
                            {filename}
                        </span>
                        <div className="flex flex-wrap items-center gap-2.5 mt-1.5">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-100 px-2 py-0.5 rounded-md border border-gray-200">
                                {contentType?.split('/').pop() || 'UNKNOWN'}
                            </span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-widest shadow-sm ${status === 'EXTRACTED' ? 'bg-green-50 text-green-700 border border-green-200' :
                                status === 'FAILED' ? 'bg-red-50 text-red-700 border border-red-200' :
                                    'bg-blue-50 text-blue-700 border border-blue-200'
                                }`}>
                                {status}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                    {status === 'EXTRACTED' && extractedJson && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 ${isExpanded ? 'bg-gray-900 text-white shadow-xl shadow-gray-300 scale-95' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/30 hover:bg-blue-700'
                                }`}
                        >
                            {isExpanded ? 'Collapse' : 'Deep Extract'}
                            <svg className={`h-3 w-3 transition-transform duration-500 ${isExpanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    )}
                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest bg-white text-gray-700 border border-gray-200 shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isDownloading ? (
                            <svg className="animate-spin h-3 w-3 text-gray-400" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <svg className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                        )}
                        {isDownloading ? 'Downloading...' : 'Download Original'}
                    </button>
                </div>
            </div>

            {/* Content Body */}
            {isExpanded && extractedJson && (
                <div className="p-8 space-y-10 border-t border-gray-100 bg-gradient-to-b from-gray-50/30 to-white animate-in zoom-in-95 fade-in duration-500 slide-in-from-top-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-l-2 border-blue-600 pl-4 py-1">
                        <div>
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] block mb-1">Intelligence Layer v2.0</span>
                            <h3 className="text-xl font-black text-gray-900 tracking-tight">
                                {extractedJson.docType || extractedJson.doc_type || (typeof extractedJson.document_type === 'string' ? extractedJson.document_type.split('/').pop() : 'Processed Document')}
                            </h3>
                        </div>
                        <button
                            onClick={() => setShowJson(!showJson)}
                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border transition-all ${showJson ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-white text-blue-600 border-blue-200 hover:bg-blue-50 hover:shadow-md'
                                }`}
                        >
                            {showJson ? '← Back to UI' : 'View Source Code'}
                        </button>
                    </div>

                    {!showJson ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                            {/* Summary & Highlights */}
                            <div className="lg:col-span-12 space-y-8">
                                {(extractedJson.summaryText || extractedJson.summary) && (
                                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-[2rem] shadow-xl shadow-blue-500/20 relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-4 opacity-10">
                                            <svg className="w-24 h-24 text-white" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M11.19 2.04c-4.47.22-8.11 3.86-8.33 8.33-.25 5.2 3.95 9.48 9.14 9.14 4.47-.22 8.11-3.86 8.33-8.33.25-5.2-3.95-9.48-9.14-9.14z" />
                                            </svg>
                                        </div>
                                        <h4 className="text-[10px] font-black text-blue-100 uppercase tracking-[0.3em] mb-3">AI Discovery Summary</h4>
                                        <p className="text-sm text-white font-medium leading-relaxed italic pr-12">
                                            "{extractedJson.summaryText || extractedJson.summary}"
                                        </p>
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                                    {/* Core Data Blocks */}
                                    <div className="xl:col-span-2">
                                        {renderDataSection('Patient Identity', extractedJson.patient, 'indigo')}
                                    </div>
                                    <div className="xl:col-span-2">
                                        {renderDataSection('Financial Intelligence', extractedJson.insurance, 'emerald')}
                                    </div>
                                    <div className="xl:col-span-2">
                                        {renderDataSection('Vital Statistics', extractedJson.vitals, 'rose')}
                                    </div>
                                    <div className="xl:col-span-2">
                                        {renderDataSection('Clinical Record', extractedJson.diagnoses, 'amber')}
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-10">
                                    {/* Map all remaining categories */}
                                    {Object.entries(extractedJson).map(([key, value]) => {
                                        const skip = ['docType', 'summaryText', 'patient', 'insurance', 'tables', 'rawText', 'document_type', 'doc_type', 'summary', 'vitals', 'diagnoses', 'subject'].includes(key);
                                        if (skip) return null;

                                        // Simple highlight sections
                                        if (typeof value === 'string' && value.length > 0) {
                                            return (
                                                <div key={key} className="bg-white border-l-4 border-violet-500 p-5 rounded-2xl shadow-sm hover:shadow-md transition-shadow">
                                                    <span className="font-black uppercase text-[10px] block mb-2 text-violet-600 tracking-widest">{key.replace(/_/g, ' ')}</span>
                                                    <p className="text-xs text-gray-700 leading-relaxed font-medium italic">"{value}"</p>
                                                </div>
                                            );
                                        }

                                        // Interaction logs
                                        if (Array.isArray(value) && value.length > 0 && typeof value[0] === 'string') {
                                            return (
                                                <div key={key} className="space-y-4">
                                                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] px-1 flex items-center gap-2">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                                        {key.replace(/_/g, ' ')}
                                                    </h4>
                                                    <div className="space-y-2.5">
                                                        {value.map((item, i) => (
                                                            <div key={i} className="flex gap-4 p-4 bg-gray-50/50 rounded-2xl border border-gray-100 group/item hover:bg-white hover:shadow-sm transition-all">
                                                                <span className="text-blue-500 font-black">#0{i + 1}</span>
                                                                <span className="text-xs text-gray-700 font-medium leading-relaxed">{item}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        }

                                        // Fallback structured sections
                                        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
                                            return (
                                                <div key={key} className="contents">
                                                    {renderDataSection(key.replace(/_/g, ' '), value, (key.length % 2 === 0 ? 'violet' : 'amber'))}
                                                </div>
                                            );
                                        }

                                        return null;
                                    })}
                                </div>

                                {extractedJson.tables && (
                                    <div className="pt-8 border-t border-gray-100">
                                        {renderTable('Transaction Logs', extractedJson.tables.invoiceLines || extractedJson.tables.invoice_lines, 'emerald')}
                                        {renderTable('Historical Events', extractedJson.tables.visitLines || extractedJson.tables.visit_lines, 'violet')}
                                    </div>
                                )}
                            </div>

                            {/* Raw Data Preview */}
                            {extractedJson.rawText && (
                                <div className="lg:col-span-12 mt-10">
                                    <div className="bg-gray-50 rounded-[2rem] p-8 border border-gray-100">
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em]">Direct NLP Stream</h4>
                                            <span className="text-[9px] font-bold text-gray-300">UTF-8 ENCODED</span>
                                        </div>
                                        <div className="p-6 bg-white rounded-2xl border border-gray-200 text-xs text-gray-500 font-mono leading-loose max-h-48 overflow-y-auto whitespace-pre-wrap shadow-inner">
                                            {extractedJson.rawText}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="relative">
                            <div className="absolute top-4 right-4 text-[10px] font-bold text-blue-400 opacity-50 uppercase tracking-widest">JSON Schema Mode</div>
                            <div className="bg-gray-950 text-blue-400 p-10 rounded-[2.5rem] overflow-auto max-h-[600px] shadow-2xl font-mono text-[12px] leading-relaxed border-4 border-gray-900 custom-scrollbar">
                                <pre className="p-2 select-all">{JSON.stringify(extractedJson, null, 2)}</pre>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
