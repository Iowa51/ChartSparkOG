"use client";

import { Header } from "@/components/layout";
import { Plus, Clock, User, CheckCircle2, Timer } from "lucide-react";

const mockAppointments = [
    {
        id: 1,
        patientName: "Sarah Johnson",
        time: "09:00 AM",
        duration: "50 min",
        type: "Initial Assessment",
        status: "confirmed"
    },
    {
        id: 2,
        patientName: "Michael Chen",
        time: "10:00 AM",
        duration: "30 min",
        type: "Follow-up",
        status: "confirmed"
    },
    {
        id: 3,
        patientName: "Emily Rodriguez",
        time: "11:30 AM",
        duration: "50 min",
        type: "Therapy Session",
        status: "pending"
    },
    {
        id: 4,
        patientName: "James Wilson",
        time: "02:00 PM",
        duration: "30 min",
        type: "Medication Review",
        status: "confirmed"
    },
    {
        id: 5,
        patientName: "Lisa Anderson",
        time: "03:00 PM",
        duration: "50 min",
        type: "Initial Assessment",
        status: "confirmed"
    }
];

export default function CalendarPage() {
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
                    <button className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-xl font-semibold shadow-lg shadow-primary/30 flex items-center justify-center gap-2 transition-all active:scale-95">
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
                                    <button className="text-primary hover:text-primary/80 text-sm font-semibold">
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
        </div>
    );
}
