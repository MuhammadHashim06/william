import { prisma } from "@/lib/db";
import Link from "next/link";
import { getSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
    const session = await getSession();

    const [inboxCount, draftCount, completedCount, recentThreads] = await Promise.all([
        prisma.thread.count({ where: { processingStatus: 'NEW' } }),
        prisma.draft.count({ where: { status: { not: 'SENT' } } }),
        prisma.thread.count({ where: { stage: 'COMPLETE' } }),
        prisma.thread.findMany({
            orderBy: { lastMessageAt: 'desc' },
            take: 5,
            include: { inbox: true }
        })
    ]);

    const stats = [
        {
            label: 'New Inbox Items',
            value: inboxCount,
            theme: 'indigo',
            href: '/dashboard/inbox',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 012 2v4a2 2 0 01-2 2H4a2 2 0 01-2-2v-4a2 2 0 012-2m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        },
        {
            label: 'Pending Drafts',
            value: draftCount,
            theme: 'rose',
            href: '/dashboard/drafts',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        },
        {
            label: 'Completed History',
            value: completedCount,
            theme: 'emerald',
            href: '/dashboard/conversation',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        },
    ];

    const themes: any = {
        indigo: "from-indigo-600 to-blue-600 shadow-indigo-500/20 text-indigo-100 bg-indigo-50 border-indigo-100 text-indigo-600",
        rose: "from-rose-600 to-pink-600 shadow-rose-500/20 text-rose-100 bg-rose-50 border-rose-100 text-rose-600",
        emerald: "from-emerald-600 to-teal-600 shadow-emerald-500/20 text-emerald-100 bg-emerald-50 border-emerald-100 text-emerald-600",
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Intelligence Dashboard</h2>
                    <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-1">
                        System Online &bull; Welcome back, {session?.user?.displayName?.split(' ')[0] || 'Agent'}
                    </p>
                </div>
                <div className="hidden md:block">
                    <div className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-100 rounded-2xl shadow-sm">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Global Relay Connected</span>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {stats.map((stat, i) => (
                    <Link key={i} href={stat.href} className="group outline-none">
                        <div className="bg-white border border-gray-100 p-8 rounded-[2.5rem] relative overflow-hidden transition-all duration-500 hover:shadow-2xl group-hover:-translate-y-2 group-active:scale-95">
                            <div className={`absolute top-0 right-0 p-8 text-gray-50 group-hover:text-blue-500/10 transition-colors duration-500`}>
                                <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor opacity-10">
                                    {stat.icon}
                                </svg>
                            </div>
                            <div className="relative">
                                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${themes[stat.theme].split(' ').slice(0, 2).join(' ')} shadow-lg ${themes[stat.theme].split(' ')[2]} flex items-center justify-center text-white mb-6 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-3`}>
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        {stat.icon}
                                    </svg>
                                </div>
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{stat.label}</div>
                                <div className="text-4xl font-black text-gray-900 tracking-tighter">{stat.value}</div>
                                <div className={`inline-flex items-center gap-1.5 mt-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest ${themes[stat.theme].split(' ').slice(4).join(' ')} border`}>
                                    View Repository &rarr;
                                </div>
                            </div>
                        </div>
                    </Link>
                ))}
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-xl shadow-gray-200/40 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                    <svg className="w-64 h-64 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>

                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 tracking-tight">Recent Intelligence Streams</h3>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1 italic">Real-time update feed</p>
                    </div>
                    <Link href="/dashboard/conversation" className="text-[10px] font-black text-blue-600 uppercase tracking-widest hover:text-blue-800 transition-colors">
                        Explore Full History &rarr;
                    </Link>
                </div>

                <div className="space-y-4">
                    {recentThreads.length === 0 ? (
                        <div className="text-center py-20 border-2 border-dashed border-gray-100 rounded-3xl">
                            <div className="text-gray-300 font-black uppercase text-xs tracking-widest">No Active Streams Detected</div>
                        </div>
                    ) : (
                        recentThreads.map((thread) => (
                            <Link
                                key={thread.id}
                                href={`/dashboard/conversation/${thread.id}`}
                                className="block p-6 rounded-[1.5rem] bg-gray-50/50 hover:bg-white hover:shadow-xl hover:shadow-blue-500/5 transition-all duration-300 border border-transparent hover:border-blue-100 group/item"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="h-12 w-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center text-gray-400 group-hover/item:text-blue-600 group-hover/item:border-blue-100 shadow-sm transition-all duration-300">
                                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                            </svg>
                                        </div>
                                        <div>
                                            <div className="text-sm font-black text-gray-900 group-hover/item:text-blue-600 transition-colors tracking-tight">{thread.subject || '(No Subject)'}</div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{thread.inbox.emailAddress}</span>
                                                <span className="text-gray-300">&bull;</span>
                                                <span className="text-[10px] font-bold text-gray-400">{new Date(thread.lastMessageAt || thread.createdAt).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-lg shadow-sm border ${thread.processingStatus === 'DONE' ? 'bg-green-50 text-green-700 border-green-100' :
                                            thread.processingStatus === 'FAILED' ? 'bg-red-50 text-red-700 border-red-100' :
                                                'bg-blue-50 text-blue-700 border-blue-100'
                                            }`}>
                                            {thread.processingStatus}
                                        </span>
                                        <svg className="w-5 h-5 text-gray-300 group-hover/item:text-blue-400 group-hover/item:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </Link>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
