"use client";

// AI Scribe launcher: pick a patient, then land in the existing note editor
// with the ambient recorder active (/notes/new?patientId=…&mode=ambient).
// Uses real /api/patients data — same source as PatientQuickSelectModal.

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import { AlertCircle, ChevronRight, Loader2, Mic, Search, User } from "lucide-react";

interface ApiPatient {
  id: string;
  first_name: string;
  last_name: string;
  mrn?: string | null;
  date_of_birth?: string | null;
  gender?: string | null;
  avatar_color?: string | null;
}

function formatDob(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ScribePage() {
  const router = useRouter();
  const [patients, setPatients] = useState<ApiPatient[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch("/api/patients?status=active&limit=100");
        if (!res.ok) throw new Error(`Failed to load patients (${res.status})`);
        const data = await res.json();
        if (!cancelled) setPatients(Array.isArray(data.patients) ? data.patients : []);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load patients");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredPatients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return patients;
    return patients.filter((p) => {
      const name = `${p.first_name || ""} ${p.last_name || ""}`.toLowerCase();
      return name.includes(query) || (p.mrn || "").toLowerCase().includes(query);
    });
  }, [patients, searchQuery]);

  const startDictation = (patientId: string) => {
    router.push(`/notes/new?patientId=${patientId}&mode=ambient`);
  };

  return (
    <>
      <Header
        title="AI Scribe"
        description="Dictate a session and get a draft SOAP note to review and edit"
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "AI Scribe" }]}
      />

      <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-3xl mx-auto w-full animate-in fade-in duration-300">
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-border flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Mic className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-sm font-black text-foreground uppercase tracking-widest">
                Start a Dictated Note
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Select the patient for this session. Recording starts on the next screen, and the
                draft is yours to review before saving.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 border-b border-border bg-muted/20">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground pointer-events-none" />
              <input
                type="text"
                placeholder="Search by name or MRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                aria-label="Search patients"
                className="w-full pl-12 pr-4 py-3 bg-background border border-border rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"
              />
            </div>
          </div>

          <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
            {loading ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Loading patients…</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="h-12 w-12 text-destructive/70 mx-auto mb-3" />
                <p className="text-sm font-medium text-destructive mb-2">
                  Couldn&apos;t load patients
                </p>
                <p className="text-xs text-muted-foreground">{error}</p>
              </div>
            ) : filteredPatients.length === 0 ? (
              <div className="text-center py-12">
                <User className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
                <p className="text-sm font-medium text-muted-foreground">No patients found</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredPatients.map((patient) => {
                  const name =
                    `${patient.first_name || ""} ${patient.last_name || ""}`.trim() ||
                    "Unnamed Patient";
                  const initials =
                    `${(patient.first_name || "")[0] || ""}${(patient.last_name || "")[0] || ""}`.toUpperCase() ||
                    "?";
                  return (
                    <button
                      key={patient.id}
                      type="button"
                      onClick={() => startDictation(patient.id)}
                      className="w-full text-left p-4 rounded-xl border border-border hover:border-primary/50 hover:bg-muted/50 transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`h-12 w-12 rounded-xl ${
                            patient.avatar_color ||
                            "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                          } flex items-center justify-center text-lg font-bold shrink-0`}
                        >
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h3 className="font-bold text-foreground">{name}</h3>
                            <span className="text-xs font-medium text-muted-foreground">
                              {patient.mrn || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <span>DOB: {formatDob(patient.date_of_birth)}</span>
                            <span>•</span>
                            <span>{patient.gender || "—"}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                          <Mic className="h-4 w-4" />
                          <span className="text-xs font-bold uppercase tracking-wider">
                            Dictate
                          </span>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
