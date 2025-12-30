"use client";

import { useState } from "react";
import { Header } from "@/components/layout";
import {
    Video,
    Calendar,
    Clock,
    Phone,
    Users,
    Sparkles,
    MessageSquare,
    PhoneOff,
    Mic,
    Monitor,
    Settings,
    User,
    ArrowRight,
    TrendingUp,
    ShieldCheck
} from "lucide-react";

const upcomingAppointments = [
    {
        id: 1,
        patientName: "Michael Chen",
        time: "10:00 AM",
        date: "Today",
        duration: "30 min",
        status: "ready",
        type: "Follow-up"
    },
    {
        id: 2,
        patientName: "Sarah Johnson",
        time: "2:00 PM",
        date: "Today",
        duration: "50 min",
        status: "scheduled",
        type: "Initial Assessment"
    },
    {
        id: 3,
        patientName: "Emily Rodriguez",
        time: "9:00 AM",
        date: "Tomorrow",
        duration: "50 min",
        status: "scheduled",
        type: "Therapy Session"
    },
    {
        id: 4,
        patientName: "James Wilson",
        time: "11:30 AM",
        date: "Tomorrow",
        duration: "30 min",
        status: "scheduled",
        type: "Medication Review"
    }
];

const sessionHistory = [
    {
        id: 1,
        patientName: "Michael Chen",
        date: "Jan 10, 2024",
        duration: "30 min",
        type: "Follow-up"
    },
    {
        id: 2,
        patientName: "Sarah Johnson",
        date: "Jan 8, 2024",
        duration: "50 min",
        type: "Initial Assessment"
    },
    {
        id: 3,
        patientName: "Lisa Anderson",
        date: "Jan 5, 2024",
        duration: "50 min",
        type: "Therapy Session"
    }
];

export default function TelehealthPage() {
    const [activeCall, setActiveCall] = useState(false);

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Telehealth Hub"
                description="Secure, HIPAA-compliant clinical video sessions."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Telehealth" },
                ]}
            />

            <div className="flex-1 overflow-y-auto p-6 lg:px-10 lg:py-8 space-y-8 max-w-7xl mx-auto w-full">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Calendar className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Today</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">2 <span className="text-xs font-medium text-slate-400">Sessions</span></p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Video className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Weekly</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">12 <span className="text-xs font-medium text-slate-400">Sessions</span></p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Clock className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Avg. Duration</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">42 <span className="text-xs font-medium text-slate-400">min</span></p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-5">
                        <div className="h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Users className="h-7 w-7" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Patients</p>
                            <p className="text-2xl font-black text-slate-900 dark:text-white">48 <span className="text-xs font-medium text-slate-400">Total</span></p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Upcoming Appointments List */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-3">
                                <Calendar className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Upcoming Sessions</h2>
                            </div>
                        </div>
                        <div className="p-8 space-y-4">
                            {upcomingAppointments.map(apt => (
                                <div key={apt.id} className="group p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700/50 hover:border-primary transition-all flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="font-black text-slate-900 dark:text-white">{apt.patientName}</h4>
                                        <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                            <span className="flex items-center gap-1">
                                                <Clock className="h-3 w-3 text-primary" />
                                                {apt.date} at {apt.time}
                                            </span>
                                            <span>• {apt.duration}</span>
                                        </div>
                                        <p className="text-xs font-medium text-slate-400 italic">{apt.type}</p>
                                    </div>
                                    <button
                                        disabled={apt.status !== "ready" || activeCall}
                                        onClick={() => setActiveCall(true)}
                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${apt.status === "ready"
                                                ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                                                : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                            }`}
                                    >
                                        <Video className="h-4 w-4" />
                                        {apt.status === "ready" ? "Start Session" : "Scheduled"}
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Video Call Interface */}
                    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col min-h-[500px]">
                        <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                            <div className="flex items-center gap-3">
                                <Video className="h-5 w-5 text-primary" />
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Active Terminal</h2>
                            </div>
                            {activeCall && (
                                <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    Live Call
                                </div>
                            )}
                        </div>
                        <div className="flex-1 p-8">
                            {activeCall ? (
                                <div className="h-full min-h-[300px] bg-slate-950 rounded-3xl relative overflow-hidden group border border-white/5 ring-1 ring-white/10 shadow-2xl">
                                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                                        <div className="h-24 w-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/20 mb-4">
                                            <User className="h-12 w-12" />
                                        </div>
                                        <h3 className="text-lg font-bold text-white/40 tracking-tight">Michael Chen (Patient)</h3>
                                        <div className="mt-4 flex items-center gap-2 text-[10px] font-black text-emerald-400 uppercase tracking-widest px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                                            <TrendingUp className="h-3 w-3" />
                                            Connection: Excellent
                                        </div>
                                    </div>

                                    {/* Self View (Small Overlay) */}
                                    <div className="absolute bottom-6 right-6 w-32 aspect-video bg-slate-800 rounded-xl border border-white/10 shadow-2xl overflow-hidden ring-4 ring-black/50">
                                        <div className="h-full w-full flex items-center justify-center bg-slate-700">
                                            <Sparkles className="h-5 w-5 text-primary/40 animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Controls Overlay */}
                                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 p-2 bg-black/60 backdrop-blur-2xl rounded-[1.5rem] border border-white/10 shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
                                        <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                            <Mic className="h-4 w-4" />
                                        </button>
                                        <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 text-white transition-all">
                                            <Monitor className="h-4 w-4" />
                                        </button>
                                        <div className="w-px h-6 bg-white/10 mx-1" />
                                        <button
                                            onClick={() => setActiveCall(false)}
                                            className="px-4 py-2 rounded-full bg-red-500 hover:bg-red-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all"
                                        >
                                            End Session
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full min-h-[300px] bg-slate-50 dark:bg-slate-800/20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center text-center p-8">
                                    <div className="h-20 w-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-400 mb-6">
                                        <Video className="h-10 w-10" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight mb-2">Ready to Connect</h3>
                                    <p className="text-sm text-slate-500 font-medium max-w-[250px]">Select an appointment from the list and click "Start Session" to initiate a secure video link.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* History Area */}
                <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
                    <div className="px-8 py-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="flex items-center gap-3">
                            <ShieldCheck className="h-5 w-5 text-emerald-500" />
                            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Recent Sessions</h2>
                        </div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Patient</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Date</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Type</th>
                                    <th className="px-8 py-4 text-left text-[10px] font-black text-slate-500 uppercase tracking-widest">Duration</th>
                                    <th className="px-8 py-4 text-right text-[10px] font-black text-slate-500 uppercase tracking-widest">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                {sessionHistory.map(session => (
                                    <tr key={session.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors group">
                                        <td className="px-8 py-4">
                                            <span className="font-black text-slate-900 dark:text-white">{session.patientName}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="text-xs font-bold text-slate-500 uppercase">{session.date}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="text-xs font-medium text-slate-400 italic">{session.type}</span>
                                        </td>
                                        <td className="px-8 py-4">
                                            <span className="text-xs font-bold text-slate-500">{session.duration}</span>
                                        </td>
                                        <td className="px-8 py-4 text-right">
                                            <button className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all">
                                                Open Notes
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* HIPAA Notice */}
                <div className="bg-primary/5 border border-primary/20 rounded-3xl p-8 flex items-start gap-6">
                    <div className="p-4 bg-primary/20 rounded-2xl text-primary">
                        <ShieldCheck className="h-8 w-8" />
                    </div>
                    <div>
                        <h4 className="font-black text-primary uppercase tracking-[0.2em] mb-2 text-sm">HIPAA & GDPR Compliant Environment</h4>
                        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-2xl">
                            All video sessions are end-to-end encrypted using AES-256 protocols. No metadata, audio, or video streams are recorded or stored on ChartSpark infrastructure unless explicitly authorized for clinical scribing purposes.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
