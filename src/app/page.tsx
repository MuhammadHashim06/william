import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-gray-900 flex flex-col items-center justify-center p-4">
      {/* Background gradients */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-[128px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[128px] pointer-events-none" />

      <div className="relative z-10 text-center max-w-2xl mx-auto space-y-8">
        <div className="space-y-4">
          <div className="inline-block px-3 py-1 bg-gray-100 border border-gray-200 rounded-full text-sm text-gray-600">
            Internal Tooling v1.0
          </div>
          <h1 className="text-5xl md:text-7xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent pb-2">
            TDP Agent
          </h1>
          <p className="text-xl text-gray-500 max-w-lg mx-auto leading-relaxed">
            The advanced operations platform for managing communications, workflows, and user administration.
          </p>
        </div>

        <div className="flex items-center justify-center gap-4">
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-gray-900 text-white rounded-full font-bold hover:bg-gray-800 transition-all transform hover:scale-105 shadow-xl shadow-gray-200"
          >
            Enter Dashboard
          </Link>
          <Link
            href="/login"
            className="px-8 py-4 bg-white border border-gray-200 text-gray-700 rounded-full font-bold hover:bg-gray-50 transition-all"
          >
            Sign In
          </Link>
        </div>
      </div>

      <div className="absolute bottom-8 text-gray-400 text-sm">
        &copy; {new Date().getFullYear()} TDP. All rights reserved.
      </div>
    </div>
  );
}
