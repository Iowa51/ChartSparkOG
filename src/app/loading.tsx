import Image from "next/image";

export default function Loading() {
    return (
        <div className="fixed inset-0 bg-white dark:bg-slate-950 z-[100] flex flex-col items-center justify-center p-4">
            <div className="relative flex flex-col items-center animate-pulse">
                <img
                    src="/ChartSparkLogo.png"
                    alt="ChartSpark Loading..."
                    className="h-32 w-auto object-contain"
                />
                <div className="mt-8 flex items-center gap-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                </div>
            </div>
        </div>
    );
}
