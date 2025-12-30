"use client";

import { Header } from "@/components/layout";
import { Video, Mic, Monitor, Settings, PhoneOff, User, Sparkles, MessageSquare } from "lucide-react";

export default function TelehealthPage() {
    return (
        <div className="flex flex-col h-full bg-slate-950">
            <Header
                title="Telehealth Hub"
                description="Secure, HIPAA-compliant clinical video sessions."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Telehealth" },
                ]}
            />

            <div className="flex-1 p-6 flex flex-col lg:flex-row gap-6 overflow-hidden">
                {/* Main Video Area */}
                <div className="flex-1 flex flex-col gap-6">
                    <div className="flex-1 bg-slate-900 rounded-[2.5rem] border border-white/5 shadow-2xl relative overflow-hidden group">
                        {/* Patient Placeholder */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                            <div className="h-32 w-32 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 mb-6">
                                <User className="h-16 w-16" />
                            </div>
                            <h3 className="text-xl font-bold text-white/40 tracking-tight">Waiting for patient to join...</h3>
                            <button className="mt-6 px-6 py-2.5 bg-primary/20 text-primary border border-primary/30 rounded-full text-xs font-black uppercase tracking-widest hover:bg-primary/30 transition-all">
                                Send Invite Link
                            </button>
                        </div>

                        {/* Self View (Small Overlay) */}
                        <div className="absolute bottom-6 right-6 w-64 aspect-video bg-slate-800 rounded-2xl border border-white/10 shadow-2xl overflow-hidden ring-4 ring-black/50">
                            <div className="h-full w-full flex items-center justify-center bg-slate-700">
                                <Sparkles className="h-8 w-8 text-primary/40 animate-pulse" />
                            </div>
                            <div className="absolute top-3 left-3 px-2 py-1 bg-black/40 backdrop-blur rounded-lg border border-white/5 text-[10px] font-bold text-white uppercase tracking-widest">
                                You (Clinician)
                            </div>
                        </div>

                        {/* Controls Overlay */}
                        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-3 p-3 bg-black/60 backdrop-blur-2xl rounded-[2rem] border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-4 group-hover:translate-y-0">
                            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                <Mic className="h-6 w-6" />
                            </button>
                            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                <Video className="h-6 w-6" />
                            </button>
                            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                <Monitor className="h-6 w-6" />
                            </button>
                            <button className="p-4 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                <Settings className="h-6 w-6" />
                            </button>
                            <div className="w-px h-8 bg-white/10 mx-2" />
                            <button className="p-4 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-xl shadow-red-500/20 transition-all">
                                <PhoneOff className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Sidebar: Real-time Scribe/Chat */}
                <aside className="w-full lg:w-[400px] flex flex-col gap-6">
                    <div className="flex-1 bg-slate-900 rounded-[2.5rem] border border-white/5 shadow-2xl flex flex-col overflow-hidden">
                        <div className="px-6 py-5 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <div className="flex items-center gap-2">
                                <Sparkles className="h-4 w-4 text-primary" />
                                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Real-time Scribe</h4>
                            </div>
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest border border-emerald-500/30">Live</span>
                        </div>
                        <div className="flex-1 p-6 space-y-6 overflow-y-auto scrollbar-hide">
                            <div className="flex flex-col items-center justify-center text-center h-full opacity-30">
                                <MessageSquare className="h-12 w-12 text-white mb-4" />
                                <p className="text-sm font-bold text-white">Scribe will activate when session begins.</p>
                                <p className="text-[10px] text-white/60 font-medium uppercase tracking-widest mt-2">Ready to capture clinical insights</p>
                            </div>
                        </div>
                    </div>

                    <div className="bg-primary/10 border border-primary/20 rounded-2xl p-6 shadow-xl">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">HIPAA Compliance</p>
                        <p className="text-xs text-white/50 font-medium leading-relaxed">
                            This session is end-to-end encrypted. No video or audio is stored on our servers.
                        </p>
                    </div>
                </aside>
            </div>
        </div>
    );
}
