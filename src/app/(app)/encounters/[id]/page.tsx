"use client";

import { Header } from "@/components/layout";
import {
  Calendar,
  User,
  Clock,
  MapPin,
  Stethoscope,
  ArrowLeft,
  Edit3,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { SuperbillWidget } from "@/components/billing/SuperbillWidget";
import VitalsEntryPanel from "@/components/vitals/VitalsEntryPanel";
import SmartTriagePanel from "@/components/smart-triage/SmartTriagePanel";
import { EndSessionButton } from "@/components/agent/EndSessionButton";

interface EncounterDetail {
  id: string;
  patient_id: string;
  encounter_type: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  chief_complaint?: string | null;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  provider?: {
    id: string;
    email?: string;
    full_name?: string;
  } | null;
  patient?: {
    id: string;
    first_name: string;
    last_name: string;
    preferred_name?: string | null;
  } | null;
  notes?: Array<{
    id: string;
    content?: string | null;
    status?: string | null;
  }>;
}

const statusStyles: Record<string, string> = {
  scheduled: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  in_progress: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  cancelled: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20",
};

export default function EncounterDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [encounter, setEncounter] = useState<EncounterDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEncounter = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch(`/api/encounters/${id}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({ error: "Failed to fetch encounter" }));
          throw new Error(data.error || "Failed to fetch encounter");
        }

        const data = await response.json();
        setEncounter(data.encounter || null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load encounter");
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      void fetchEncounter();
    }
  }, [id]);

  const latestNote = encounter?.notes?.[0] ?? null;
  const patientName = useMemo(() => {
    if (!encounter?.patient) return "Unknown Patient";
    return `${encounter.patient.preferred_name || encounter.patient.first_name} ${encounter.patient.last_name}`.trim();
  }, [encounter]);

  const providerName =
    encounter?.provider?.full_name || encounter?.provider?.email || "Unknown Provider";

  const handleStatusUpdate = async (status: "completed" | "in_progress") => {
    try {
      setSaving(true);
      setError(null);

      const response = await fetch(`/api/encounters/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Failed to update encounter" }));
        throw new Error(data.error || "Failed to update encounter");
      }

      const data = await response.json();
      setEncounter((current) => (current ? { ...current, ...data.encounter } : data.encounter));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update encounter");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
        <Header
          title="Encounter Details"
          description="Loading encounter data..."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Encounters", href: "/encounters" },
            { label: "Loading..." },
          ]}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading encounter...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !encounter) {
    return (
      <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
        <Header
          title="Encounter Not Found"
          description="The requested encounter could not be loaded."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Encounters", href: "/encounters" },
            { label: "Not Found" },
          ]}
        />
        <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full">
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            <p className="font-medium">{error || "Encounter not found"}</p>
            <Link
              href="/encounters"
              className="mt-4 inline-flex items-center gap-2 text-sm hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Encounters
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
      <Header
        title={`Encounter: ${encounter.encounter_type}`}
        description={`Clinical session for ${patientName}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Encounters", href: "/encounters" },
          { label: "Encounter Details" },
        ]}
      />

      <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <div className="flex items-center justify-between">
          <Link
            href="/encounters"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Encounters
          </Link>
          <div className="flex items-center gap-3">
            <button
              onClick={() =>
                router.push(
                  `/notes/new?encounterId=${encounter.id}&patientId=${encounter.patient_id}`,
                )
              }
              className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm"
            >
              <Edit3 className="h-4 w-4" />
              Open Note Workspace
            </button>
            <button
              onClick={() =>
                void handleStatusUpdate(
                  encounter.status === "completed" ? "in_progress" : "completed",
                )
              }
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-card border border-border text-foreground rounded-xl text-sm font-black uppercase tracking-widest transition-all disabled:cursor-not-allowed disabled:opacity-70"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              {encounter.status === "completed" ? "Mark In Progress" : "Complete Encounter"}
            </button>
            <EndSessionButton encounterId={encounter.id} patientId={encounter.patient_id} />
          </div>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm overflow-hidden relative">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <User className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Patient
                </p>
                <p className="text-base font-bold text-foreground">{patientName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Calendar className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Date
                </p>
                <p className="text-base font-bold text-foreground">
                  {new Date(encounter.scheduled_start).toLocaleDateString()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center text-purple-500">
                <Stethoscope className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Provider
                </p>
                <p className="text-base font-bold text-foreground">{providerName}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Time
                </p>
                <p className="text-base font-bold text-foreground">
                  {new Date(encounter.scheduled_start).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0">
            <span
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-l border-b rounded-bl-xl ${statusStyles[encounter.status] || statusStyles.scheduled}`}
            >
              {encounter.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
                Chief Complaint
              </h3>
              <p className="text-lg font-medium text-foreground leading-relaxed">
                {encounter.chief_complaint || "No chief complaint documented yet."}
              </p>
            </div>

            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
                Latest Note
              </h3>
              {latestNote ? (
                <div className="space-y-3">
                  <span className="inline-flex rounded-full bg-muted px-2.5 py-1 text-xs font-bold uppercase text-muted-foreground">
                    {latestNote.status || "draft"}
                  </span>
                  <p className="text-foreground leading-relaxed whitespace-pre-wrap">
                    {latestNote.content || "No note content available."}
                  </p>
                  <Link
                    href={`/notes/new?encounterId=${encounter.id}&patientId=${encounter.patient_id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Edit Note
                    <Edit3 className="h-4 w-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-foreground leading-relaxed">
                    No note has been created for this encounter yet.
                  </p>
                  <Link
                    href={`/notes/new?encounterId=${encounter.id}&patientId=${encounter.patient_id}`}
                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
                  >
                    Create Note
                    <Edit3 className="h-4 w-4" />
                  </Link>
                </div>
              )}
            </div>

            <SmartTriagePanel patientId={encounter.patient_id} encounterId={id} />
          </div>

          <div className="space-y-6">
            <SuperbillWidget />

            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <VitalsEntryPanel patientId={encounter.patient_id} encounterId={id} />
            </div>

            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">Status</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                This encounter is currently marked as {encounter.status.replace("_", " ")}.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
