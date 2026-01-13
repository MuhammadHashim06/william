'use client';

import { useRouter } from 'next/navigation';

export function Header() {
    const router = useRouter();

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/login');
    };

    return (
        <header className="sticky top-0 z-20 h-20 bg-white/70 backdrop-blur-xl border-b border-gray-100 flex items-center justify-between px-8">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] shadow-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                    Live System Status
                </div>
            </div>

            <div className="flex items-center gap-6">
                <div className="h-8 w-px bg-gray-100 hidden sm:block" />
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-black text-gray-600 hover:text-red-600 hover:border-red-100 hover:bg-red-50 transition-all duration-300 shadow-sm active:scale-95 group"
                >
                    <svg className="w-4 h-4 text-gray-400 group-hover:text-red-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign Out
                </button>
            </div>
        </header>
    );
}
