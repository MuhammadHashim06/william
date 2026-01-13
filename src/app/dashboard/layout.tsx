import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decrypt } from '@/lib/auth';
import { Sidebar } from './components/Sidebar';
import { Header } from './components/Header';

async function getUser() {
    const cookieStore = await cookies();
    const session = cookieStore.get('session')?.value;
    if (!session) return undefined;

    try {
        const payload = await decrypt(session);
        return payload.user;
    } catch (e) {
        return undefined;
    }
}

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getUser();
    if (!user) {
        redirect('/login');
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900 flex">
            <Sidebar user={user} />
            <div className="flex-1 flex flex-col ml-64">
                <Header />
                <main className="flex-1 p-6 overflow-y-auto overflow-x-hidden">
                    {children}
                </main>
            </div>
        </div>
    );
}
