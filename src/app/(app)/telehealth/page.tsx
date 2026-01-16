"use client";

import { useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Header } from "@/components/layout";
import {
    Video,
    Calendar,
    Clock,
    Users,
    Settings,
    TrendingUp,
    ShieldCheck,
    Loader2,
    AlertCircle
} from "lucide-react";

// Dynamically import the video component to avoid SSR issues with Daily.co
const DailyVideoCall = dynamic(
    () => import("@/components/telehealth/DailyVideoCall"),
    { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div> }
);

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

interface CallSession {
    roomUrl: string;
    roomName: string;
    providerToken: string;
    patientLink: string;
    patientName: string;
}

export default function TelehealthPage() {
    const [isStartingCall, setIsStartingCall] = useState(false);
    const [callSession, setCallSession] = useState<CallSession | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleStartCall = async (appointmentId: number, patientName: string) => {
        setIsStartingCall(true);
        setError(null);

        try {
            console.log("[Telehealth] Creating room for appointment:", appointmentId);

            const response = await fetch("/api/telehealth/create-room", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    appointmentId: appointmentId.toString(),
                    patientName: patientName,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create telehealth room");
            }

            const data = await response.json();
            console.log("[Telehealth] Room created:", data);

            // Generate patient link (the room URL with patient token)
            const patientLink = data.isDemo
                ? `${data.roomUrl}?t=${data.patientToken}`
                : `${data.roomUrl}?t=${data.patientToken}`;

            setCallSession({
                roomUrl: data.roomUrl,
                roomName: data.roomName,
                providerToken: data.providerToken,
                patientLink: patientLink,
                patientName: patientName,
            });
        } catch (err) {
            console.error("[Telehealth] Error starting call:", err);
            setError(err instanceof Error ? err.message : "Failed to start telehealth session");
        } finally {
            setIsStartingCall(false);
        }
    };

    const handleEndCall = async () => {
        if (callSession) {
            try {
                // End the session on the server
                await fetch("/api/telehealth/end-session", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        roomName: callSession.roomName,
                    }),
                });
            } catch (err) {
                console.error("[Telehealth] Error ending session:", err);
            }
        }
        setCallSession(null);
    };

    return (
        <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
            <Header
                title="Telehealth Hub"
                description="Secure, HIPAA-compliant clinical video sessions."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Telehealth" },
                ]}
                actions={
                    <Link
                        href="/telehealth/setup"
                        className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-xs font-bold text-muted-foreground hover:text-primary transition-all shadow-sm"
                    >
                        <Settings className="h-4 w-4" />
                        Setup & Hardware
                    </Link>
                }
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
                                        disabled={apt.status !== "ready" || !!callSession || isStartingCall}
                                        onClick={() => handleStartCall(apt.id, apt.patientName)}
                                        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center gap-2 ${apt.status === "ready" && !callSession
                                            ? "bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                                            : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                                            } ${isStartingCall && apt.status === "ready" ? "animate-pulse" : ""}`}
                                    >
                                        {isStartingCall ? (
                                            <>
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                Connecting...
                                            </>
                                        ) : (
                                            <>
                                                <Video className="h-4 w-4" />
                                                {apt.status === "ready" ? "Start Session" : "Scheduled"}
                                            </>
                                        )}
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
                                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                                    {callSession ? `Session: ${callSession.patientName}` : "Active Terminal"}
                                </h2>
                            </div>
                            {callSession && (
                                <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest rounded-full flex items-center gap-2">
                                    <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                    Live Call
                                </div>
                            )}
                        </div>
                        <div className="flex-1 p-8">
                            {error && (
                                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                                    <p className="text-sm text-red-600 dark:text-red-400 font-medium">{error}</p>
                                </div>
                            )}

                            {isStartingCall ? (
                                <div className="h-full min-h-[300px] bg-slate-900 rounded-3xl flex flex-col items-center justify-center text-center p-8 border border-white/5 animate-pulse">
                                    <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin mb-4" />
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Creating Session</h3>
                                    <p className="text-xs text-slate-500 font-medium">Securing HIPAA-compliant connection...</p>
                                </div>
                            ) : callSession ? (
                                <DailyVideoCall
                                    roomUrl={callSession.roomUrl}
                                    token={callSession.providerToken}
                                    userName="Provider"
                                    patientLink={callSession.patientLink}
                                    onLeave={handleEndCall}
                                    onError={(err) => setError(err)}
                                />
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
                                            <Link
                                                href="/notes"
                                                className="px-4 py-2 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all inline-block"
                                            >
                                                Open Notes
                                            </Link>
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
