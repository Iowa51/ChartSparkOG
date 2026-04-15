import Link from "next/link";

export default function AuthCodeErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4">
            <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 shadow-xl text-center">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">
                    Email link expired or already used. Please register again.
                </h1>
                <Link
                    href="/register"
                    className="inline-flex items-center justify-center rounded-xl bg-primary px-5 py-3 font-semibold text-white hover:bg-primary/90 transition-colors"
                >
                    Back to Register
                </Link>
            </div>
        </div>
    );
}
