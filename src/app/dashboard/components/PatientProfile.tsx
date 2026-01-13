'use client';

import { useState } from 'react';

interface PatientProfileProps {
    attachments: any[];
}

function deepMerge(target: any, source: any) {
    if (typeof target !== 'object' || target === null) return source;
    if (typeof source !== 'object' || source === null) return target;

    const output = { ...target };
    Object.keys(source).forEach(key => {
        if (typeof source[key] === 'object' && source[key] !== null && !Array.isArray(source[key])) {
            if (!(key in target)) {
                Object.assign(output, { [key]: source[key] });
            } else {
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            Object.assign(output, { [key]: source[key] });
        }
    });
    return output;
}

export function PatientProfile({ attachments }: PatientProfileProps) {
    const [isCollapsed, setIsCollapsed] = useState(false);

    if (!attachments || attachments.length === 0) return null;

    // Aggregate data from all extracted JSONs for ALL fields
    const mergedData = attachments.reduce((acc: any, att: any) => {
        if (!att.extractedJson) return acc;
        return deepMerge(acc, att.extractedJson);
    }, {});

    // Filter out internal/system fields
    const ignoredKeys = ['docType', 'doc_type', 'document_type', 'summary', 'summaryText', 'rawText', 'tables'];
    const filteredData = Object.entries(mergedData).reduce((acc: any, [key, value]) => {
        if (!ignoredKeys.includes(key) && value && Object.keys(value as any).length > 0) {
            acc[key] = value;
        }
        return acc;
    }, {});

    if (Object.keys(filteredData).length === 0) return null;

    const renderRecursive = (data: any, depth = 0) => {
        if (!data) return null;

        return (
            <div className={`grid grid-cols-1 ${depth === 0 ? 'lg:grid-cols-2 xl:grid-cols-3' : 'grid-cols-1'} gap-4`}>
                {Object.entries(data).map(([key, value]) => {
                    if (!value) return null;

                    // Handle primitives (strings, numbers, booleans)
                    if (typeof value !== 'object') {
                        return (
                            <div key={key} className="flex flex-col p-2 bg-white/50 rounded-lg border border-gray-100/50">
                                <span className="text-[9px] text-gray-400 font-bold uppercase tracking-tight">{key.replace(/([A-Z]|_)/g, ' $1').trim()}</span>
                                <span className="text-xs font-bold text-gray-900 break-words">{String(value)}</span>
                            </div>
                        );
                    }

                    // Handle Arrays
                    if (Array.isArray(value)) {
                        if (value.length === 0) return null;
                        return (
                            <div key={key} className={`col-span-1 ${depth === 0 ? 'lg:col-span-2' : ''} space-y-2`}>
                                <h5 className="text-[10px] font-black uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                                    <span className="w-1 h-1 rounded-full bg-gray-400"></span>
                                    {key.replace(/([A-Z]|_)/g, ' $1').trim()}
                                </h5>
                                <div className="space-y-2 pl-2 border-l-2 border-gray-100">
                                    {value.map((item, idx) => (
                                        <div key={idx} className="bg-gray-50/50 rounded-xl p-3 border border-gray-100 text-sm">
                                            {typeof item === 'object' ? renderRecursive(item, depth + 1) : String(item)}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    }

                    // Handle Objects
                    return (
                        <div key={key} className={`space-y-2 ${depth === 0 ? 'bg-gray-50/30 p-4 rounded-2xl border border-gray-100 shadow-sm' : ''}`}>
                            <h4 className={`text-[10px] font-black uppercase tracking-[0.2em] mb-1 px-1 flex items-center gap-2 text-blue-600`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                {key.replace(/([A-Z]|_)/g, ' $1').trim()}
                            </h4>
                            <div className="">
                                {renderRecursive(value, depth + 1)}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="bg-white border border-gray-200 rounded-[2.5rem] overflow-hidden shadow-xl shadow-blue-500/5 transition-all hover:shadow-2xl hover:shadow-blue-500/10 mb-6">
            <div
                className="bg-gradient-to-r from-violet-600 to-purple-600 px-8 py-6 cursor-pointer select-none group"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md border border-white/20 shadow-lg group-hover:bg-white/20 transition-all">
                            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                        </div>
                        <div>
                            <h3 className="text-lg font-black text-white uppercase tracking-wider mb-0.5">Patient Profile</h3>
                            <p className="text-[10px] text-purple-100 font-black uppercase tracking-[0.2em] opacity-90">Aggregated Intelligence</p>
                        </div>
                    </div>

                    <button className="text-white/70 hover:text-white transition-colors">
                        <svg className={`w-6 h-6 transform transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {!isCollapsed && (
                <div className="p-8 animate-in slide-in-from-top-4 duration-300">
                    {renderRecursive(filteredData)}
                </div>
            )}
        </div>
    );
}
