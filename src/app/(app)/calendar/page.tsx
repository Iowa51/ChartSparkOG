"use client";

import { Header } from "@/components/layout";
import { Plus, Clock, User, CheckCircle2, Timer, X, Calendar } from "lucide-react";
import { useState } from "react";

const mockAppointments = [
    {
        id: 1,
        patientName: "Sarah Johnson",
        time: "09:00 AM",
        duration: "50 min",
        type: "Initial Assessment",
        status: "confirmed",
        date: "Today",
        notes: "First session. Patient reports anxiety and sleep issues."
    },
    {
        id: 2,
        patientName: "Michael Chen",
        time: "10:00 AM",
        duration: "30 min",
        type: "Follow-up",
        status: "confirmed",
        date: "Today",
        notes: "Medication check - Sertraline 50mg, week 4."
    },
    {
        id: 3,
        patientName: "Emily Rodriguez",
        time: "11:30 AM",
        duration: "50 min",
        type: "Therapy Session",
        status: "pending",
        date: "Today",
        notes: "CBT session - focus on cognitive restructuring."
    },
    {
        id: 4,
        patientName: "James Wilson",
        time: "02:00 PM",
        duration: "30 min",
        type: "Medication Review",
        status: "confirmed",
        date: "Today",
        notes: "Review efficacy of current treatment plan."
    },
    {
        id: 5,
        patientName: "Lisa Anderson",
        time: "03:00 PM",
        duration: "50 min",
        type: "Initial Assessment",
        status: "confirmed",
        date: "Today",
        notes: "New patient referral from Dr. Martinez."
    }
];

export default function CalendarPage() {
    const [showNewAppt, setShowNewAppt] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<typeof mockAppointments[0] | null>(null);

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    return (
        <div className="flex flex-col h-full">
            <Header
                title="Schedule"
                description="Manage your clinical appointments and patient visits."
                breadcrumbs={[
                    { label: "Dashboard", href: "/dashboard" },
                    { label: "Calendar" },
                ]}
            />

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Date Header & Action */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground">Today's Schedule</h2>
                        <p className="text-muted-foreground mt-1 font-medium">{today}</p>
                    </div>
                    <button
                        onClick={() => setShowNewAppt(true)}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <Plus className="h-5 w-5" />
                        New Appointment
                    </button>
                </div>

                {/* Appointment List */}
                <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                    <div className="divide-y divide-border">
                        {mockAppointments.map((apt) => (
                            <div key={apt.id} className="p-6 hover:bg-muted/30 transition-colors flex flex-col md:flex-row md:items-center gap-6">
                                {/* Time Column */}
                                <div className="flex flex-col items-start md:items-center min-w-[100px]">
                                    <span className="text-lg font-bold text-foreground">{apt.time}</span>
                                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium mt-1">
                                        <Timer className="h-3 w-3" />
                                        {apt.duration}
                                    </div>
                                </div>

                                {/* Divider for desktop */}
                                <div className="hidden md:block w-px h-10 bg-border mx-2" />

                                {/* Patient info */}
                                <div className="flex-1 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-foreground">{apt.patientName}</h3>
                                        <p className="text-sm text-muted-foreground">{apt.type}</p>
                                    </div>
                                </div>

                                {/* Status & Quick Actions */}
                                <div className="flex items-center justify-between md:justify-end gap-4 min-w-[140px]">
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${apt.status === 'confirmed'
                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                        }`}>
                                        {apt.status}
                                    </span>
                                    <button
                                        onClick={() => setSelectedAppt(apt)}
                                        className="text-primary hover:text-primary/80 text-sm font-semibold"
                                    >
                                        Details
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer Note */}
                <div className="flex items-center justify-center gap-2 p-4 bg-muted/20 rounded-xl border border-dashed border-border text-sm text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4" />
                    Interactive scheduling engine coming in Phase 4
                </div>
            </div>

            {/* New Appointment Modal */}
            {showNewAppt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setShowNewAppt(false)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Schedule New Appointment
                            </h2>
                            <button onClick={() => setShowNewAppt(false)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={(e) => { e.preventDefault(); alert("Appointment scheduled successfully!"); setShowNewAppt(false); }} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Patient</label>
                                <select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    <option value="">Select patient...</option>
                                    <option value="1">Sarah Johnson</option>
                                    <option value="2">Michael Chen</option>
                                    <option value="3">Emily Rodriguez</option>
                                    <option value="4">James Wilson</option>
                                    <option value="5">Lisa Anderson</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date & Time</label>
                                <input type="datetime-local" required className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duration</label>
                                <select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    <option value="30">30 minutes</option>
                                    <option value="50">50 minutes</option>
                                    <option value="60">60 minutes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Appointment Type</label>
                                <select className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700">
                                    <option value="initial">Initial Assessment</option>
                                    <option value="followup">Follow-up</option>
                                    <option value="therapy">Therapy Session</option>
                                    <option value="medication">Medication Review</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                                <textarea className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 h-20 resize-none" placeholder="Session notes or reminders..." />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowNewAppt(false)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold">Schedule Appointment</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Appointment Details Modal */}
            {selectedAppt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedAppt(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold">Appointment Details</h2>
                            <button onClick={() => setSelectedAppt(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                    <User className="h-6 w-6" />
                                </div>
                                <div>
                                    <p className="font-bold text-lg">{selectedAppt.patientName}</p>
                                    <p className="text-sm text-muted-foreground">{selectedAppt.type}</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Date</p>
                                    <p className="font-medium">{selectedAppt.date}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Time</p>
                                    <p className="font-medium">{selectedAppt.time}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Duration</p>
                                    <p className="font-medium">{selectedAppt.duration}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground">Status</p>
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold uppercase ${selectedAppt.status === 'confirmed'
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-amber-100 text-amber-700'
                                        }`}>
                                        {selectedAppt.status}
                                    </span>
                                </div>
                            </div>
                            <div>
                                <p className="text-sm text-muted-foreground">Notes</p>
                                <p className="text-sm mt-1">{selectedAppt.notes}</p>
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button
                                    onClick={() => { alert("Edit functionality coming soon!"); }}
                                    className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => { alert("Appointment cancelled."); setSelectedAppt(null); }}
                                    className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg font-bold hover:bg-red-600"
                                >
                                    Cancel Appointment
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
