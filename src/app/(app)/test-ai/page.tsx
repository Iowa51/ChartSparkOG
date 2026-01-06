"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import { Sparkles, MessageSquare, Send, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";

export default function TestAIPage() {
    const [message, setMessage] = useState("");
    const [response, setResponse] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    const [status, setStatus] = useState<"idle" | "success" | "error">("idle");

    const handleTest = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError("");
        setResponse("");
        setStatus("idle");

        try {
            const res = await fetch("/api/test-azure", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ message }),
            });

            const data = await res.json();

            if (data.success) {
                setResponse(data.response);
                setStatus("success");
            } else {
                setError(data.error || "An unknown error occurred");
                setStatus("error");
            }
        } catch (err: any) {
            setError(err.message || "Failed to contact proxy API");
            setStatus("error");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
            <Header
                title="Azure OpenAI Test"
                description="Verify your Azure OpenAI configuration and response latency."
            />

            <main className="flex-1 p-6 lg:px-10 max-w-4xl mx-auto w-full space-y-8">
                <div className="bg-card rounded-3xl border border-border shadow-xl overflow-hidden">
                    <div className="p-8 border-b border-border bg-muted/20">
                        <div className="flex items-center gap-3 text-primary mb-2">
                            <Sparkles className="h-5 w-5" />
                            <h2 className="text-xs font-black uppercase tracking-[0.2em]">Connection Verification</h2>
                        </div>
                        <p className="text-sm text-muted-foreground font-medium">
                            Enter a test message below to trigger a call to your configured Azure OpenAI deployment.
                        </p>
                    </div>

                    <div className="p-8 space-y-6">
                        <form onSubmit={handleTest} className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1">
                                    Test Message
                                </label>
                                <div className="relative">
                                    <MessageSquare className="absolute left-4 top-4 h-5 w-5 text-muted-foreground" />
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="e.g. Say hello and tell me your model version!"
                                        className="w-full h-32 pl-12 pr-4 py-4 bg-background border border-border rounded-2xl text-sm font-medium focus:ring-4 focus:ring-primary/5 transition-all outline-none resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-primary/20 flex items-center justify-center gap-2 hover:-translate-y-0.5 active:translate-y-0 transition-all disabled:opacity-50 disabled:translate-y-0"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        <Send className="h-4 w-4" />
                                        Trigger Test Call
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Results Section */}
                        {(status !== "idle" || isLoading) && (
                            <div className="pt-8 border-t border-border animate-in fade-in slide-in-from-top-4 duration-500">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Response Result</h3>
                                    {status === "success" && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">
                                            <CheckCircle2 className="h-3 w-3" />
                                            Success
                                        </span>
                                    )}
                                    {status === "error" && (
                                        <span className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest bg-red-50 px-2 py-1 rounded-lg border border-red-100">
                                            <AlertCircle className="h-3 w-3" />
                                            Configuration Error
                                        </span>
                                    )}
                                </div>

                                {isLoading ? (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-4 opacity-50">
                                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Waiting for Azure OpenAI...</p>
                                    </div>
                                ) : status === "success" ? (
                                    <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl font-mono text-xs leading-relaxed whitespace-pre-wrap border border-slate-800 shadow-inner">
                                        {response}
                                    </div>
                                ) : (
                                    <div className="p-6 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/50 flex gap-4 items-start">
                                        <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
                                        <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-tight">API Request Failed</p>
                                            <p className="text-xs font-medium opacity-80">{error}</p>
                                            <div className="mt-4 p-3 bg-red-600/5 rounded-xl text-[10px] font-bold">
                                                Tip: Verify your .env variables: AZURE_OPENAI_ENDPOINT, AZURE_OPENAI_API_KEY, and AZURE_OPENAI_DEPLOYMENT_NAME.
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-border">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Service Endpoints</h4>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-muted-foreground">Proxy:</span>
                                <code className="bg-muted px-2 py-0.5 rounded">/api/test-azure</code>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="font-bold text-muted-foreground">Module:</span>
                                <code className="bg-muted px-2 py-0.5 rounded">@/services/azureOpenAIService</code>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-border">
                        <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-4">Implementation Notes</h4>
                        <p className="text-[11px] text-muted-foreground font-medium leading-relaxed">
                            This test utilizes a server-side route to prevent API key exposure in the browser. It implements the singleton instance of the Azure OpenAI service for unified session handling.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    );
}
