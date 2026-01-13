'use client';

import { useState, useEffect } from 'react';

type User = {
    id: string;
    email: string;
    displayName: string;
    initials: string;
    role: 'ADMIN' | 'USER';
    createdAt: string;
};

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        displayName: '',
        initials: '',
        role: 'USER' as 'ADMIN' | 'USER',
    });

    const fetchUsers = async () => {
        try {
            const res = await fetch('/api/users');
            if (res.ok) {
                const data = await res.json();
                setUsers(data);
            }
        } catch (error) {
            console.error('Failed to fetch users', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const url = editingUser ? `/api/users/${editingUser.id}` : '/api/users';
        const method = editingUser ? 'PATCH' : 'POST';

        try {
            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData),
            });

            if (!res.ok) throw new Error('Action failed');

            setIsModalOpen(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            alert('Failed to save user');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this user?')) return;

        try {
            const res = await fetch(`/api/users/${id}`, { method: 'DELETE' });
            if (res.ok) fetchUsers();
            else alert('Failed to delete user');
        } catch (error) {
            alert('Error deleting user');
        }
    };

    const openEdit = (user: User) => {
        setEditingUser(user);
        setFormData({
            email: user.email,
            password: '', // Don't show password
            displayName: user.displayName || '',
            initials: user.initials,
            role: user.role,
        });
        setIsModalOpen(true);
    };

    const resetForm = () => {
        setEditingUser(null);
        setFormData({
            email: '',
            password: '',
            displayName: '',
            initials: '',
            role: 'USER',
        });
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex items-end justify-between">
                <div>
                    <h2 className="text-3xl font-black text-gray-900 tracking-tight">Access Control</h2>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mt-1 italic">Managing system authority & credentials</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsModalOpen(true); }}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all duration-300 shadow-lg shadow-blue-500/20 active:scale-95 flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                    </svg>
                    Authorize New User
                </button>
            </div>

            <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-gray-200/50">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50 text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] border-b border-gray-100">
                                <th className="px-8 py-5">Personnel</th>
                                <th className="px-8 py-5">Clearance Level</th>
                                <th className="px-8 py-5">Commission Date</th>
                                <th className="px-8 py-5 text-right">Operations</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {isLoading ? (
                                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-300 animate-pulse">Scanning Registry...</td></tr>
                            ) : users.length === 0 ? (
                                <tr><td colSpan={4} className="px-8 py-20 text-center text-[10px] font-black uppercase tracking-widest text-gray-300">No Authorized Personnel Found</td></tr>
                            ) : (
                                users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50/50 transition-all duration-300 group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-[11px] font-black shadow-lg shadow-blue-500/20 transition-transform group-hover:scale-110">
                                                    {user.initials}
                                                </div>
                                                <div>
                                                    <div className="text-base font-black text-gray-900 tracking-tight group-hover:text-blue-600 transition-colors">{user.displayName}</div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mt-0.5">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`inline-flex items-center px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm ${user.role === 'ADMIN' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-gray-50 text-gray-700 border-gray-200'
                                                }`}>
                                                {user.role} Authority
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="text-[11px] font-black text-gray-900 tracking-tight">
                                                {new Date(user.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
                                                <button
                                                    onClick={() => openEdit(user)}
                                                    className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-blue-600 uppercase tracking-widest hover:bg-blue-50 hover:border-blue-200 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    Modify
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user.id)}
                                                    className="px-4 py-2 bg-white border border-gray-100 rounded-xl text-[10px] font-black text-red-600 uppercase tracking-widest hover:bg-red-50 hover:border-red-200 hover:shadow-md transition-all active:scale-95"
                                                >
                                                    Revoke
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-gray-900/40 backdrop-blur-xl animate-in fade-in duration-300">
                    <div className="bg-white border border-gray-100 rounded-[3rem] p-10 w-full max-w-lg shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-500">
                        {/* Decorative background */}
                        <div className="absolute top-0 right-0 p-10 opacity-[0.03] pointer-events-none">
                            <svg className="w-32 h-32 text-gray-900" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z" />
                            </svg>
                        </div>

                        <div className="mb-8">
                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-[0.3em] block mb-1">Personnel Security</span>
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                                {editingUser ? 'Modify Authority' : 'Authorize New Personnel'}
                            </h3>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={formData.displayName}
                                        onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                        className="w-full mt-2 bg-gray-50 border border-transparent rounded-[1.2rem] px-5 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        placeholder="Agent 007"
                                        required
                                    />
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initials</label>
                                    <input
                                        type="text"
                                        value={formData.initials}
                                        onChange={e => setFormData({ ...formData, initials: e.target.value })}
                                        className="w-full mt-2 bg-gray-50 border border-transparent rounded-[1.2rem] px-5 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        placeholder="AG"
                                        required
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Secure Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full mt-2 bg-gray-50 border border-transparent rounded-[1.2rem] px-5 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                    placeholder="agent@tdp.william"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Clearance Role</label>
                                    <select
                                        value={formData.role}
                                        onChange={e => setFormData({ ...formData, role: e.target.value as any })}
                                        className="w-full mt-2 bg-gray-50 border border-transparent rounded-[1.2rem] px-5 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all cursor-pointer appearance-none"
                                    >
                                        <option value="USER">Standard User</option>
                                        <option value="ADMIN">System Admin</option>
                                    </select>
                                </div>
                                <div className="col-span-2 sm:col-span-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">
                                        {editingUser ? 'Credential Reset' : 'Initial Password'}
                                    </label>
                                    <input
                                        type="password"
                                        value={formData.password}
                                        onChange={e => setFormData({ ...formData, password: e.target.value })}
                                        className="w-full mt-2 bg-gray-50 border border-transparent rounded-[1.2rem] px-5 py-3 text-sm font-bold text-gray-900 focus:bg-white focus:border-blue-200 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
                                        placeholder={editingUser ? '••••••••' : 'Secret Key'}
                                        required={!editingUser}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-4 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-6 py-4 bg-gray-50 border border-transparent hover:bg-gray-100 hover:border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                                >
                                    Abort
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-blue-500/20 active:scale-95"
                                >
                                    {editingUser ? 'Update Authority' : 'Confirm Authorization'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
