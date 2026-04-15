"use client";

import { useState, useRef } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { SuperbillWidget } from "@/components/billing/SuperbillWidget";
import VitalsEntryPanel from "@/components/vitals/VitalsEntryPanel";
import SmartTriagePanel from "@/components/smart-triage/SmartTriagePanel";
import { EndSessionButton } from "@/components/agent/EndSessionButton";
import { AgentResultPanel } from "@/components/agent/AgentResultPanel";
import { AgentResult } from "@/lib/agent/types";

export default function EncounterDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const agentResultRef = useRef<HTMLDivElement>(null);

  const [agentResult, setAgentResult] = useState<AgentResult | null>(null);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);

  const mockEncounter = {
    id: id,
    patientName: "Michael Chen",
    patientId: "demo-patient",
    clinicianId: "demo-clinician",
    date: "2024-01-15",
    type: "Follow-up",
    provider: "Dr. Smith",
    chiefComplaint: "Follow-up on anxiety management strategies and medication effectiveness",
    vitals: {
      bp: "120/80",
      hr: "72",
      temp: "98.6",
    },
    assessment:
      "Patient showing improvement in anxiety symptoms. Reports fewer panic attacks. Sleep quality has improved. Medication well-tolerated.",
    plan: "Continue current medication (Sertraline 50mg daily). Practice breathing exercises. Schedule follow-up in 4 weeks. Monitor for any side effects.",
    status: sessionEnded
      ? "completed"
      : ("in_progress" as "scheduled" | "in_progress" | "completed" | "cancelled"),
    sessionType: "individual",
    duration: 60,
  };

  const showEndSessionButton =
    mockEncounter.status === "scheduled" || mockEncounter.status === "in_progress";

  const handleSessionComplete = (result: AgentResult) => {
    setAgentResult(result);
    setSessionEnded(true);
    // Scroll to agent result panel
    setTimeout(() => {
      agentResultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  const handleSessionError = (error: string) => {
    setErrorToast(error);
    setTimeout(() => setErrorToast(null), 5000);
  };

  return (
    <div className="flex flex-col h-full bg-slate-50/50 dark:bg-slate-950/50">
      <Header
        title={`Encounter: ${mockEncounter.type}`}
        description={`Clinical session for ${mockEncounter.patientName}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Encounters", href: "/encounters" },
          { label: `Encounter Details` },
        ]}
      />

      {/* Error toast */}
      {errorToast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-red-600 text-white text-sm font-medium rounded-xl shadow-lg animate-in slide-in-from-top-2 max-w-sm">
          {errorToast}
        </div>
      )}

      <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-5xl mx-auto w-full space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
        {/* Actions Toolbar */}
        <div className="flex items-center justify-between">
          <Link
            href="/encounters"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Encounters
          </Link>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-xl text-sm font-bold text-foreground hover:bg-muted transition-colors shadow-sm">
              <Edit3 className="h-4 w-4" />
              Edit
            </button>

            {showEndSessionButton ? (
              <EndSessionButton
                encounterId={id}
                patientId={mockEncounter.patientId}
                clinicianId={mockEncounter.clinicianId}
                sessionType={mockEncounter.sessionType}
                duration={mockEncounter.duration}
                clinicianInput={mockEncounter.chiefComplaint}
                noteFormat="SOAP"
                payerType="commercial"
                onComplete={handleSessionComplete}
                onError={handleSessionError}
              />
            ) : (
              <span className="flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-xl text-sm font-bold">
                <CheckCircle2 className="h-4 w-4" />
                Session completed
              </span>
            )}
          </div>
        </div>

        {/* Patient / Encounter Info Card */}
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
                <p className="text-base font-bold text-foreground">{mockEncounter.patientName}</p>
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
                <p className="text-base font-bold text-foreground">{mockEncounter.date}</p>
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
                <p className="text-base font-bold text-foreground">{mockEncounter.provider}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <MapPin className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                  Location
                </p>
                <p className="text-base font-bold text-foreground">Main Clinic</p>
              </div>
            </div>
          </div>
          {/* Status Badge */}
          <div className="absolute top-0 right-0">
            <span
              className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest border-l border-b rounded-bl-xl ${
                mockEncounter.status === "completed"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
              }`}
            >
              {mockEncounter.status.replace("_", " ")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Contents */}
          <div className="lg:col-span-2 space-y-6">
            {/* Chief Complaint */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
                Chief Complaint
              </h3>
              <p className="text-lg font-medium text-foreground leading-relaxed">
                "{mockEncounter.chiefComplaint}"
              </p>
            </div>

            {/* Assessment */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4">
                Clinical Assessment
              </h3>
              <p className="text-foreground leading-relaxed">{mockEncounter.assessment}</p>
            </div>

            {/* Treatment Plan */}
            <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
              <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-4 text-primary">
                Treatment Plan
              </h3>
              <div className="prose prose-sm dark:prose-invert">
                <p className="text-foreground leading-relaxed">{mockEncounter.plan}</p>
              </div>
            </div>

            {/* Smart Triage - Full Width Below Content */}
            <SmartTriagePanel patientId="demo-patient" encounterId={id} />
          </div>

          {/* Vitals Sidebar */}
          <div className="space-y-6">
            {/* Superbill Widget */}
            <SuperbillWidget
              initialCptCode={agentResult?.cptCode}
              initialIcd10Codes={agentResult?.icd10Codes}
            />

            {/* Dynamic Vitals Entry */}
            <div className="bg-card rounded-2xl border border-border shadow-sm">
              <VitalsEntryPanel
                patientId="demo-patient"
                encounterId={id}
                previousVitals={{
                  bp_systolic: 120,
                  bp_diastolic: 80,
                  heart_rate: 72,
                  temperature: 98.6,
                  recorded_at: "2024-01-01T00:00:00Z",
                }}
              />
            </div>

            {/* Follow up reminder */}
            <div className="bg-primary/5 rounded-2xl border border-primary/20 p-6">
              <div className="flex items-center gap-2 text-primary mb-2">
                <Clock className="h-4 w-4" />
                <span className="text-xs font-black uppercase tracking-widest">Next Action</span>
              </div>
              <p className="text-sm font-medium text-foreground">
                Schedule follow-up appointment in 4 weeks.
              </p>
            </div>
          </div>
        </div>

        {/* Agent Result Panel — rendered below main content after session ends */}
        {agentResult && (
          <div ref={agentResultRef}>
            <AgentResultPanel result={agentResult} />
          </div>
        )}
      </div>
    </div>
  );
}
