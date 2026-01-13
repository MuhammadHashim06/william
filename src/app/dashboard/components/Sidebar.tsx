'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
    { label: 'Overview', href: '/dashboard', icon: 'M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z' },
    { label: 'Inbox', href: '/dashboard/inbox', icon: 'M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z' },
    { label: 'Drafts', href: '/dashboard/drafts', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' },
    // { label: 'Conversations', href: '/dashboard/conversation', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
    { label: 'Cases', href: '/dashboard/cases', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
    { label: 'Users', href: '/dashboard/users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' },
];

interface SidebarProps {
    user?: {
        email: string;
        displayName: string;
        initials: string;
        role: string;
    };
}

export function Sidebar({ user }: SidebarProps) {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-[#0a0c10] border-r border-white/5 flex flex-col z-30 shadow-2xl overflow-hidden">
            {/* Background Glow */}
            <div className="absolute top-[-10%] left-[-20%] w-[100%] h-[40%] bg-blue-600/10 blur-[100px] rounded-full" />

            <div className="p-8 relative">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                        </svg>
                    </div>
                    <div className="text-xl font-black tracking-tighter text-white">
                        TDP<span className="text-blue-500">.</span>William
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 space-y-1.5 relative">
                <div className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] px-4 mb-4">Navigation</div>
                {navItems.map((item) => {
                    if (item.label === 'Users' && user?.role !== 'ADMIN') return null;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all duration-300 group ${isActive
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                                : 'text-gray-400 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <svg className={`w-5 h-5 transition-transform duration-300 group-hover:scale-110 ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
                            </svg>
                            <span className="tracking-wide">{item.label}</span>
                            {isActive && (
                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            <div className="p-6 relative">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[1.5rem] p-4 group hover:bg-white/10 transition-all duration-300">
                    <div className="text-[9px] font-black text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                        <span className="w-1 h-2 bg-blue-500 rounded-full" />
                        Authentication
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-700 to-gray-800 flex items-center justify-center text-white text-xs font-black shadow-lg border border-white/5">
                            {user?.initials || '??'}
                        </div>
                        <div className="overflow-hidden">
                            <div className="truncate text-sm text-white font-black tracking-tight">{user?.displayName || 'Agent'}</div>
                            <div className="truncate text-[10px] text-gray-400 font-bold uppercase tracking-wider">{user?.role?.toLowerCase() || 'Guest'}</div>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
