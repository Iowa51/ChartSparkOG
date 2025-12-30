"use client";

import { Header } from "@/components/layout";
import { Calendar as CalendarIcon, Clock, Plus, ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";
import { useState } from "react";

export default function CalendarPage() {
    const [view, setView] = useState<"day" | "week" | "month">("week");

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Clinical Schedule"
                description="Manage your patient encounters and availability."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Calendar" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full flex flex-col gap-6">
                {/* Calendar Toolbar */}
                <div className="bg-card rounded-2xl border border-border p-4 shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-muted/50 rounded-xl p-1">
                            {(["day", "week", "month"] as const).map((v) => (
                                <button
                                    key={v}
                                    onClick={() => setView(v)}
                                    className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${view === v
                                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm"
                                        : "text-muted-foreground hover:text-foreground"
                                        }`}
                                >
                                    {v}
                                </button>
                            ))}
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <ChevronLeft className="h-4 w-4" />
                            </button>
                            <span className="text-sm font-bold text-foreground">Oct 23 - Oct 29, 2023</span>
                            <button className="p-2 hover:bg-muted rounded-lg transition-colors">
                                <ChevronRight className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                    <button className="px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2">
                        <Plus className="h-5 w-5" />
                        New Appointment
                    </button>
                </div>

                {/* Calendar Grid Placeholder */}
                <div className="flex-1 bg-card rounded-[2rem] border border-border shadow-md overflow-hidden flex flex-col">
                    <div className="grid grid-cols-8 border-b border-border bg-slate-50 dark:bg-slate-900/50">
                        <div className="p-4 border-r border-border text-[10px] font-black text-muted-foreground uppercase tracking-widest">Time</div>
                        {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => (
                            <div key={day} className="p-4 border-r border-border text-center">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mb-1">{day}</p>
                                <p className="text-xl font-black text-foreground">2{["3", "4", "5", "6", "7", "8", "9"][["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(day)]}</p>
                            </div>
                        ))}
                    </div>
                    <div className="flex-1 relative overflow-y-auto scrollbar-hide p-8">
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center opacity-20 pointer-events-none">
                            <CalendarIcon className="h-32 w-32 mb-6" />
                            <h3 className="text-2xl font-black uppercase tracking-tighter">Schedule Interactive soon</h3>
                            <p className="text-sm font-medium">Full scheduling engine integration in progress.</p>
                        </div>

                        {/* Sample Appointments */}
                        <div className="relative z-10 space-y-4">
                            <div className="ml-[12.5%] w-[12.5%] bg-primary/10 border-l-4 border-primary p-4 rounded-xl shadow-sm">
                                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">09:00 AM</p>
                                <p className="text-sm font-bold text-foreground">John Doe</p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Initial Eval</p>
                            </div>
                            <div className="ml-[37.5%] w-[12.5%] bg-blue-500/10 border-l-4 border-blue-500 p-4 rounded-xl shadow-sm translate-y-8">
                                <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">11:30 AM</p>
                                <p className="text-sm font-bold text-foreground">Jane Smith</p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Follow-up</p>
                            </div>
                            <div className="ml-[62.5%] w-[12.5%] bg-emerald-500/10 border-l-4 border-emerald-500 p-4 rounded-xl shadow-sm -translate-y-4">
                                <p className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">02:15 PM</p>
                                <p className="text-sm font-bold text-foreground">Robert Brown</p>
                                <p className="text-[10px] text-muted-foreground font-medium uppercase mt-1">Medication Check</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
