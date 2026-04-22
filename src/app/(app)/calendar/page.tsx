"use client";

import { Header } from "@/components/layout";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { Plus, Clock, User, CheckCircle2, Timer, X, Calendar, ChevronLeft, ChevronRight, Grid3x3, List, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";

interface Patient {
    id: string;
    first_name: string;
    last_name: string;
}

interface Appointment {
    id: string;
    patientName: string;
    patientId?: string;
    time: string;
    duration: string;
    type: string;
    status: string;
    date: string;
    notes: string;
    datetimeIso: string;
    durationMinutes: number;
}

export default function CalendarPage() {
    const [showNewAppt, setShowNewAppt] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
    const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loadingPatients, setLoadingPatients] = useState(true);

    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [cancelling, setCancelling] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const [dayModal, setDayModal] = useState<{ dateLabel: string; appts: Appointment[] } | null>(null);
    const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [deleteCandidate, setDeleteCandidate] = useState<Appointment | null>(null);
    const [editForm, setEditForm] = useState({
        appointment_datetime: "",
        duration_minutes: "30",
        appointment_type: "initial",
        notes: "",
    });

    const [form, setForm] = useState({
        patient_id: "",
        appointment_datetime: "",
        duration_minutes: "30",
        appointment_type: "initial",
        notes: "",
    });

    const nextRoundedHourLocal = () => {
        const d = new Date();
        d.setMinutes(0, 0, 0);
        d.setHours(d.getHours() + 1);
        const pad = (n: number) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };

    const openNewAppt = () => {
        setForm(f => ({ ...f, appointment_datetime: nextRoundedHourLocal() }));
        setShowNewAppt(true);
    };

    const flashSuccess = (msg: string) => {
        setSuccessMessage(msg);
        setTimeout(() => setSuccessMessage(null), 4000);
    };
    const flashError = (msg: string) => {
        setErrorMessage(msg);
        setTimeout(() => setErrorMessage(null), 4000);
    };

    const fetchAppointments = async () => {
        try {
            const response = await fetch('/api/appointments');
            if (!response.ok) return;
            const data = await response.json();
            const raw = data.appointments || [];
            const mapped: Appointment[] = raw.map((apt: {
                id: string;
                patient_id?: string;
                appointment_datetime: string;
                duration_minutes?: number;
                appointment_type?: string;
                status?: string;
                notes?: string;
                patient?: { first_name: string; last_name: string };
            }) => {
                const dt = new Date(apt.appointment_datetime);
                const year = dt.getFullYear();
                const month = String(dt.getMonth() + 1).padStart(2, '0');
                const day = String(dt.getDate()).padStart(2, '0');
                return {
                    id: apt.id,
                    patientName: apt.patient
                        ? `${apt.patient.first_name} ${apt.patient.last_name}`
                        : 'Unknown Patient',
                    patientId: apt.patient_id,
                    time: dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }),
                    duration: apt.duration_minutes ? `${apt.duration_minutes} min` : '30 min',
                    type: apt.appointment_type || 'Session',
                    status: apt.status || 'scheduled',
                    date: `${year}-${month}-${day}`,
                    notes: apt.notes || '',
                    datetimeIso: apt.appointment_datetime,
                    durationMinutes: apt.duration_minutes ?? 30,
                };
            });
            setAppointments(mapped.filter(apt => apt.status !== 'cancelled'));
        } catch (error) {
            console.error('Failed to fetch appointments:', error);
        }
    };

    // Fetch patients from database
    useEffect(() => {
        const fetchPatients = async () => {
            try {
                setLoadingPatients(true);
                const response = await fetch('/api/patients');
                if (response.ok) {
                    const data = await response.json();
                    setPatients(data.patients || []);
                }
            } catch (error) {
                console.error('Failed to fetch patients:', error);
            } finally {
                setLoadingPatients(false);
            }
        };
        fetchPatients();
        fetchAppointments();
    }, []);

    const handleCreateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (submitting) return;
        if (!form.patient_id) {
            flashError('Please select a patient');
            return;
        }
        if (!form.appointment_datetime) {
            flashError('Please choose a date and time');
            return;
        }
        setSubmitting(true);
        try {
            const isoDatetime = new Date(form.appointment_datetime).toISOString();
            const response = await fetch('/api/appointments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    patient_id: form.patient_id,
                    appointment_datetime: isoDatetime,
                    duration_minutes: Number(form.duration_minutes),
                    appointment_type: form.appointment_type,
                    notes: form.notes,
                    is_telehealth: true,
                }),
            });
            if (!response.ok) {
                let message = 'Failed to schedule appointment';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch {
                    // leave default
                }
                flashError(message);
                return;
            }
            setShowNewAppt(false);
            setForm({
                patient_id: "",
                appointment_datetime: "",
                duration_minutes: "30",
                appointment_type: "initial",
                notes: "",
            });
            flashSuccess('Appointment scheduled successfully');
            await fetchAppointments();
        } catch {
            flashError('Failed to schedule appointment');
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (appt: Appointment) => {
        const dt = new Date(appt.datetimeIso);
        const pad = (n: number) => String(n).padStart(2, '0');
        const localValue = `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
        setEditForm({
            appointment_datetime: localValue,
            duration_minutes: String(appt.durationMinutes),
            appointment_type: appt.type,
            notes: appt.notes || "",
        });
        setSelectedAppt(null);
        setEditingAppt(appt);
    };

    const handleUpdateAppointment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAppt || savingEdit) return;
        if (!editForm.appointment_datetime) {
            flashError('Please choose a date and time');
            return;
        }
        setSavingEdit(true);
        try {
            const isoDatetime = new Date(editForm.appointment_datetime).toISOString();
            const response = await fetch(`/api/appointments/${editingAppt.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    appointment_datetime: isoDatetime,
                    duration_minutes: Number(editForm.duration_minutes),
                    appointment_type: editForm.appointment_type,
                    notes: editForm.notes || null,
                }),
            });
            if (!response.ok) {
                let message = 'Failed to update appointment';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch {
                    // leave default
                }
                flashError(message);
                return;
            }
            setEditingAppt(null);
            flashSuccess('Appointment updated');
            await fetchAppointments();
        } catch {
            flashError('Failed to update appointment');
        } finally {
            setSavingEdit(false);
        }
    };

    const handleCancelAppointment = async (appt: Appointment) => {
        if (cancelling) return;
        setCancelling(true);
        try {
            const response = await fetch(`/api/appointments/${appt.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'cancelled' }),
            });
            if (!response.ok) {
                let message = 'Failed to cancel appointment';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch {
                    // leave default
                }
                flashError(message);
                return;
            }
            setSelectedAppt(null);
            flashSuccess('Appointment cancelled');
            await fetchAppointments();
        } catch {
            flashError('Failed to cancel appointment');
        } finally {
            setCancelling(false);
        }
    };

    const handleDeleteAppointment = async (appt: Appointment) => {
        if (deleting) return;
        setDeleting(true);
        try {
            const response = await fetch(`/api/appointments/${appt.id}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!response.ok) {
                let message = 'Failed to delete appointment';
                try {
                    const data = await response.json();
                    if (data?.error) message = data.error;
                } catch {
                    // leave default
                }
                flashError(message);
                return;
            }
            setDeleteCandidate(null);
            setSelectedAppt(null);
            flashSuccess('Appointment deleted');
            await fetchAppointments();
        } catch {
            flashError('Failed to delete appointment');
        } finally {
            setDeleting(false);
        }
    };

    const today = new Date();
    const todayStr = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Calendar grid helpers
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const prevMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    };

    const nextMonth = () => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    };

    const goToToday = () => {
        setCurrentDate(new Date());
    };

    const getAppointmentsForDate = (day: number) => {
        const dateStr = new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toISOString().split('T')[0];
        return appointments.filter(apt => apt.date === dateStr);
    };

    const isToday = (day: number) => {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
        return date.toDateString() === today.toDateString();
    };

    // Filter appointments for today's list view
    const todayAppointments = appointments.filter(apt =>
        apt.date === today.toISOString().split('T')[0]
    );

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

            <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-6xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                {/* Date Header & Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        {viewMode === "grid" && (
                            <>
                                <button
                                    onClick={prevMonth}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <ChevronLeft className="h-5 w-5" />
                                </button>
                                <h2 className="text-2xl font-bold text-foreground min-w-[200px] text-center">
                                    {monthName}
                                </h2>
                                <button
                                    onClick={nextMonth}
                                    className="p-2 hover:bg-muted rounded-lg transition-colors"
                                >
                                    <ChevronRight className="h-5 w-5" />
                                </button>
                                <button
                                    onClick={goToToday}
                                    className="px-3 py-1 text-sm font-medium text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                >
                                    Today
                                </button>
                            </>
                        )}
                        {viewMode === "list" && (
                            <div>
                                <h2 className="text-2xl font-bold text-foreground">Today's Schedule</h2>
                                <p className="text-muted-foreground mt-1 font-medium">{todayStr}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* View Toggle */}
                        <div className="flex items-center bg-muted/50 rounded-lg p-1">
                            <button
                                onClick={() => setViewMode("grid")}
                                className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-white dark:bg-slate-800 shadow-sm" : "hover:bg-white/50"}`}
                                title="Month view"
                            >
                                <Grid3x3 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => setViewMode("list")}
                                className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-white dark:bg-slate-800 shadow-sm" : "hover:bg-white/50"}`}
                                title="List view"
                            >
                                <List className="h-4 w-4" />
                            </button>
                        </div>
                        <button
                            onClick={openNewAppt}
                            className="bg-primary hover:bg-primary/90 text-primary-foreground px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-primary/30 flex items-center gap-2 transition-all active:scale-95"
                        >
                            <Plus className="h-5 w-5" />
                            New Appointment
                        </button>
                    </div>
                </div>

                {/* Calendar Grid View */}
                {viewMode === "grid" && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        {/* Day Headers */}
                        <div className="grid grid-cols-7 bg-muted/50 border-b border-border">
                            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="p-3 text-center text-sm font-semibold text-muted-foreground">
                                    {day}
                                </div>
                            ))}
                        </div>

                        {/* Calendar Days */}
                        <div className="grid grid-cols-7">
                            {/* Empty cells for days before month starts */}
                            {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                                <div key={`empty-${i}`} className="min-h-[100px] border-b border-r border-border bg-muted/20" />
                            ))}

                            {/* Days of the month */}
                            {Array.from({ length: daysInMonth }).map((_, i) => {
                                const day = i + 1;
                                const appointments = getAppointmentsForDate(day);
                                const dayIsToday = isToday(day);
                                const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                                const cellDateLabel = cellDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
                                const openDayModal = () => {
                                    if (appointments.length === 0) return;
                                    setDayModal({ dateLabel: cellDateLabel, appts: appointments });
                                };

                                return (
                                    <div
                                        key={day}
                                        onClick={openDayModal}
                                        role={appointments.length > 0 ? 'button' : undefined}
                                        tabIndex={appointments.length > 0 ? 0 : undefined}
                                        onKeyDown={(e) => {
                                            if (appointments.length > 0 && (e.key === 'Enter' || e.key === ' ')) {
                                                e.preventDefault();
                                                openDayModal();
                                            }
                                        }}
                                        className={`min-h-[100px] border-b border-r border-border p-2 transition-colors hover:bg-muted/30 ${dayIsToday ? 'bg-primary/5' : ''} ${appointments.length > 0 ? 'cursor-pointer' : ''}`}
                                    >
                                        <div className={`flex items-center justify-center w-7 h-7 rounded-full text-sm font-semibold mb-1 ${dayIsToday
                                            ? 'bg-primary text-primary-foreground'
                                            : 'text-foreground'
                                            }`}>
                                            {day}
                                        </div>
                                        <div className="space-y-1">
                                            {appointments.slice(0, 2).map(apt => (
                                                <button
                                                    key={apt.id}
                                                    onClick={(e) => { e.stopPropagation(); setSelectedAppt(apt); }}
                                                    className={`w-full text-left px-2 py-1 rounded text-xs truncate ${apt.status === 'confirmed'
                                                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                        }`}
                                                >
                                                    {apt.time.split(' ')[0]} {apt.patientName.split(' ')[0]}
                                                </button>
                                            ))}
                                            {appointments.length > 2 && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); openDayModal(); }}
                                                    className="w-full text-left text-xs text-muted-foreground px-2 hover:text-primary hover:underline"
                                                >
                                                    +{appointments.length - 2} more
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* List View */}
                {viewMode === "list" && (
                    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                        <div className="divide-y divide-border">
                            {todayAppointments.length === 0 ? (
                                <div className="p-12 text-center text-muted-foreground">
                                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                    <p>No appointments scheduled for today</p>
                                </div>
                            ) : (
                                todayAppointments.map((apt) => (
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
                                ))
                            )}
                        </div>
                    </div>
                )}
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
                        <form onSubmit={handleCreateAppointment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Patient</label>
                                <select
                                    value={form.patient_id}
                                    onChange={(e) => setForm(f => ({ ...f, patient_id: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                    required
                                >
                                    <option value="">Select patient...</option>
                                    {loadingPatients ? (
                                        <option value="" disabled>Loading patients...</option>
                                    ) : patients.length === 0 ? (
                                        <option value="" disabled>No patients found - add a patient first</option>
                                    ) : (
                                        patients.map(patient => (
                                            <option key={patient.id} value={patient.id}>
                                                {patient.first_name} {patient.last_name}
                                            </option>
                                        ))
                                    )}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={form.appointment_datetime}
                                    onChange={(e) => setForm(f => ({ ...f, appointment_datetime: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duration</label>
                                <select
                                    value={form.duration_minutes}
                                    onChange={(e) => setForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <option value="30">30 minutes</option>
                                    <option value="50">50 minutes</option>
                                    <option value="60">60 minutes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Appointment Type</label>
                                <select
                                    value={form.appointment_type}
                                    onChange={(e) => setForm(f => ({ ...f, appointment_type: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <option value="initial">Initial Assessment</option>
                                    <option value="followup">Follow-up</option>
                                    <option value="therapy">Therapy Session</option>
                                    <option value="medication">Medication Review</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                                <textarea
                                    value={form.notes}
                                    onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 h-20 resize-none"
                                    placeholder="Session notes or reminders..."
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setShowNewAppt(false)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {submitting ? 'Scheduling...' : 'Schedule Appointment'}
                                </button>
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
                                    <p className="font-medium">{new Date(selectedAppt.date).toLocaleDateString()}</p>
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
                                    onClick={() => selectedAppt && openEditModal(selectedAppt)}
                                    className="flex-1 px-4 py-2 border rounded-lg font-medium hover:bg-slate-50 dark:hover:bg-slate-800"
                                >
                                    Edit
                                </button>
                                <button
                                    onClick={() => selectedAppt && handleCancelAppointment(selectedAppt)}
                                    disabled={cancelling || deleting}
                                    className="flex-1 px-4 py-2 bg-amber-500 text-white rounded-lg font-bold hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {cancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {cancelling ? 'Cancelling...' : 'Cancel'}
                                </button>
                            </div>
                            <div className="pt-2">
                                <button
                                    onClick={() => selectedAppt && setDeleteCandidate(selectedAppt)}
                                    disabled={cancelling || deleting}
                                    className="w-full px-4 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                    title="Permanently delete this appointment"
                                >
                                    {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                    {deleting ? 'Deleting...' : 'Delete Permanently'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Day Appointments Modal */}
            {dayModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setDayModal(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                {dayModal.dateLabel}
                            </h2>
                            <button onClick={() => setDayModal(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                            {dayModal.appts.length} appointment{dayModal.appts.length === 1 ? '' : 's'}
                        </p>
                        <div className="overflow-y-auto space-y-2 pr-1">
                            {dayModal.appts.map(apt => (
                                <button
                                    key={apt.id}
                                    onClick={() => { setDayModal(null); setSelectedAppt(apt); }}
                                    className="w-full text-left p-4 border border-border rounded-xl hover:border-primary hover:bg-muted/30 transition-colors flex items-center gap-4"
                                >
                                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                                        <User className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2">
                                            <h3 className="font-bold text-foreground truncate">{apt.patientName}</h3>
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider flex-shrink-0 ${apt.status === 'confirmed'
                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                : apt.status === 'cancelled'
                                                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                                }`}>
                                                {apt.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {apt.time}</span>
                                            <span className="flex items-center gap-1"><Timer className="h-3 w-3" /> {apt.duration}</span>
                                            <span className="italic truncate">{apt.type}</span>
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Appointment Modal */}
            {editingAppt && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setEditingAppt(null)}>
                    <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold flex items-center gap-2">
                                <Calendar className="h-5 w-5 text-primary" />
                                Edit Appointment
                            </h2>
                            <button onClick={() => setEditingAppt(null)} className="text-slate-400 hover:text-slate-600">
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        <form onSubmit={handleUpdateAppointment} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Patient</label>
                                <div className="w-full px-3 py-2 border rounded-lg bg-muted/30 text-muted-foreground">
                                    {editingAppt.patientName}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">To reassign the patient, cancel this appointment and schedule a new one.</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Date & Time</label>
                                <input
                                    type="datetime-local"
                                    required
                                    value={editForm.appointment_datetime}
                                    onChange={(e) => setEditForm(f => ({ ...f, appointment_datetime: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Duration</label>
                                <select
                                    value={editForm.duration_minutes}
                                    onChange={(e) => setEditForm(f => ({ ...f, duration_minutes: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <option value="30">30 minutes</option>
                                    <option value="50">50 minutes</option>
                                    <option value="60">60 minutes</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Appointment Type</label>
                                <select
                                    value={editForm.appointment_type}
                                    onChange={(e) => setEditForm(f => ({ ...f, appointment_type: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700"
                                >
                                    <option value="initial">Initial Assessment</option>
                                    <option value="followup">Follow-up</option>
                                    <option value="therapy">Therapy Session</option>
                                    <option value="medication">Medication Review</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Notes (optional)</label>
                                <textarea
                                    value={editForm.notes}
                                    onChange={(e) => setEditForm(f => ({ ...f, notes: e.target.value }))}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-slate-800 dark:border-slate-700 h-20 resize-none"
                                    placeholder="Session notes or reminders..."
                                />
                            </div>
                            <div className="flex gap-2 pt-4">
                                <button type="button" onClick={() => setEditingAppt(null)} className="flex-1 px-4 py-2 border rounded-lg font-medium">Cancel</button>
                                <button
                                    type="submit"
                                    disabled={savingEdit}
                                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                >
                                    {savingEdit && <Loader2 className="h-4 w-4 animate-spin" />}
                                    {savingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deleteCandidate}
                onClose={() => {
                    if (!deleting) setDeleteCandidate(null);
                }}
                onConfirm={() => {
                    if (deleteCandidate) handleDeleteAppointment(deleteCandidate);
                }}
                title="Delete Appointment"
                message={
                    deleteCandidate
                        ? `Permanently delete the appointment for ${deleteCandidate.patientName} on ${new Date(deleteCandidate.date).toLocaleDateString()} at ${deleteCandidate.time}? This action cannot be undone.`
                        : "This action cannot be undone."
                }
                confirmText="Delete Permanently"
                variant="danger"
                icon="delete"
                isLoading={deleting}
                loadingText="Deleting…"
                asyncConfirm
            />

            {/* Toast Messages */}
            {successMessage && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-emerald-600 text-white rounded-xl shadow-lg">
                        <CheckCircle2 className="h-5 w-5" />
                        <span className="font-medium">{successMessage}</span>
                    </div>
                </div>
            )}
            {errorMessage && (
                <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom duration-300">
                    <div className="flex items-center gap-3 px-5 py-3 bg-red-600 text-white rounded-xl shadow-lg">
                        <AlertTriangle className="h-5 w-5" />
                        <span className="font-medium">{errorMessage}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
