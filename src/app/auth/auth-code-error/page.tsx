import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default async function AuthCodeErrorPage({
    searchParams,
}: {
    searchParams: Promise<{ message?: string }>;
}) {
    const params = await searchParams;
    const message = params.message || "Email link expired or already used. Please register again.";

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
                <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                    </div>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    Authentication error
                </h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">{message}</p>
                <div className="flex justify-center gap-3">
                    <Link
                        href="/register"
                        className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90 transition-colors"
                    >
                        Back to Register
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex items-center justify-center rounded-xl border border-slate-300 dark:border-slate-700 px-5 py-3 font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                    >
                        Go to Login
                    </Link>
                </div>
            </div>
        </div>
    );
}
