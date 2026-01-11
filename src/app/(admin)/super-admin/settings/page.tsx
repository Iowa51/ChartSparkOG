import { Settings } from "lucide-react";

export default function SettingsPage() {
    return (
        <div className="flex-1 p-6 lg:p-8 overflow-auto">
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
                    Platform Settings
                </h1>
                <p className="text-slate-500 dark:text-slate-400 mt-1">
                    Configure platform-wide settings and preferences
                </p>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <Settings className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">
                    Platform settings are configured through environment variables and database configuration.
                </p>
                <p className="text-sm text-slate-400 mt-2">
                    Contact your system administrator for changes.
                </p>
            </div>
        </div>
    );
}
