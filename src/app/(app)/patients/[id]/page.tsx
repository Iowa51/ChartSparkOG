"use client";

import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout";
import {
  Activity,
  Calendar,
  FileText,
  Pill,
  AlertCircle,
  Phone,
  Mail,
  MapPin,
  Plus,
  ArrowLeft,
  ChevronRight,
  Shield,
  Loader2,
  ClipboardList,
  Heart,
  Brain,
} from "lucide-react";
import Link from "next/link";
import { useState, useEffect } from "react";
import VitalsEntryPanel from "@/components/vitals/VitalsEntryPanel";
import ScreeningPanel from "@/components/vitals/ScreeningPanel";
import WeightTrendChart from "@/components/vitals/WeightTrendChart";
import ScreeningTrendChart from "@/components/vitals/ScreeningTrendChart";
import SmartTriagePanel from "@/components/smart-triage/SmartTriagePanel";
import PatientDocuments from "@/components/patients/PatientDocuments";
import { formatEncounterType } from "@/lib/utils/encounter-type";

// Card components
const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div
    className={`bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}
  >
    {children}
  </div>
);
const CardHeader = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`p-6 ${className}`}>{children}</div>;
const CardTitle = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <h3
    className={`text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 ${className}`}
  >
    {children}
  </h3>
);
const CardContent = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => <div className={`px-6 pb-6 ${className}`}>{children}</div>;

interface PatientWithDetails {
  id: string;
  first_name: string;
  last_name: string;
  preferred_name?: string;
  mrn?: string;
  date_of_birth?: string;
  gender?: string;
  status: string;
  avatar_color?: string;
  email?: string;
  phone?: string;
  address?: string;
  organization_id: string;
  created_at: string;
  allergies?: Array<{
    id: string;
    allergy: string;
    severity?: string;
  }>;
  medications?: Array<{
    id: string;
    medication: string;
    dosage?: string;
    frequency?: string;
    status: string;
  }>;
  problems?: Array<{
    id: string;
    problem: string;
    icd10_code?: string;
    status: string;
  }>;
  insurance?: {
    id: string;
    provider: string;
    policy_number?: string;
    group_number?: string;
  } | null;
}

export default function PatientDetailPage() {
  const params = useParams();
  const router = useRouter();
  const patientId = params.id as string;

  const [patient, setPatient] = useState<PatientWithDetails | null>(null);
  const [encounters, setEncounters] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loadingEncounters, setLoadingEncounters] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch patient details
  useEffect(() => {
    const fetchPatient = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/patients/${patientId}`);
        if (!response.ok) {
          throw new Error("Failed to fetch patient");
        }
        const data = await response.json();
        setPatient(data);
      } catch (err) {
        console.error("Error fetching patient:", err);
        setError(err instanceof Error ? err.message : "Failed to load patient");
      } finally {
        setLoading(false);
      }
    };

    if (patientId) {
      fetchPatient();
    }
  }, [patientId]);

  // Fetch encounters when encounters tab is opened
  useEffect(() => {
    const fetchEncounters = async () => {
      if (activeTab !== "encounters" || !patientId) return;

      try {
        setLoadingEncounters(true);
        const response = await fetch(`/api/encounters?patient_id=${patientId}&limit=10`);
        if (!response.ok) {
          throw new Error("Failed to fetch encounters");
        }
        const data = await response.json();
        setEncounters(data.encounters || []);
      } catch (err) {
        console.error("Error fetching encounters:", err);
        setEncounters([]);
      } finally {
        setLoadingEncounters(false);
      }
    };

    fetchEncounters();
  }, [patientId, activeTab]);

  // Fetch notes when notes tab is opened
  useEffect(() => {
    const fetchNotes = async () => {
      if (activeTab !== "notes" || !patientId) return;

      try {
        setLoadingNotes(true);
        const response = await fetch(`/api/notes?patient_id=${patientId}&limit=20`);
        if (!response.ok) {
          throw new Error("Failed to fetch notes");
        }
        const data = await response.json();
        setNotes(data.notes || []);
      } catch (err) {
        console.error("Error fetching notes:", err);
        setNotes([]);
      } finally {
        setLoadingNotes(false);
      }
    };

    fetchNotes();
  }, [patientId, activeTab]);

  if (loading) {
    return (
      <>
        <Header
          title="Patient Chart"
          description="Loading patient information..."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Patients", href: "/patients" },
            { label: "Loading..." },
          ]}
        />
        <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="h-12 w-12 text-primary animate-spin" />
            <p className="text-muted-foreground">Loading patient chart...</p>
          </div>
        </div>
      </>
    );
  }

  if (error || !patient) {
    return (
      <>
        <Header
          title="Patient Not Found"
          description="The requested patient could not be found."
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Patients", href: "/patients" },
            { label: "Not Found" },
          ]}
        />
        <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
            <p className="text-red-800 dark:text-red-200 font-medium">
              {error || "Patient not found"}
            </p>
            <Link
              href="/patients"
              className="inline-flex items-center gap-2 mt-4 text-sm text-primary hover:underline"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Patients
            </Link>
          </div>
        </div>
      </>
    );
  }

  const patientName = patient.preferred_name
    ? `${patient.preferred_name} ${patient.last_name}`
    : `${patient.first_name} ${patient.last_name}`;

  const initials = `${patient.first_name[0] || ""}${patient.last_name[0] || ""}`.toUpperCase();

  const calculateAge = (dob?: string) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <>
      <Header
        title={patientName}
        description={`MRN: ${patient.mrn || "Pending"} • ${patient.gender || "Not specified"} • ${calculateAge(patient.date_of_birth) ? `${calculateAge(patient.date_of_birth)} years old` : "DOB not set"}`}
        breadcrumbs={[
          { label: "Dashboard", href: "/dashboard" },
          { label: "Patients", href: "/patients" },
          { label: patientName },
        ]}
      />

      <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
        {/* Back Button */}
        <div className="mb-6">
          <Link
            href="/patients"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Patients
          </Link>
        </div>

        {/* Patient Header Card */}
        <Card className="mb-6">
          <div className="p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className={`h-16 w-16 rounded-full flex items-center justify-center text-xl font-bold ${
                    patient.avatar_color ||
                    "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                  }`}
                >
                  {initials}
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-foreground">{patientName}</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    MRN: {patient.mrn || "Pending"} • {patient.gender || "Not specified"}
                    {patient.date_of_birth && ` • ${calculateAge(patient.date_of_birth)} years old`}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Link
                  href={`/encounters/new?patientId=${patient.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-sm hover:bg-primary/90 transition-all"
                >
                  <Plus className="h-4 w-4" />
                  New Encounter
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: "overview", label: "Overview", icon: Activity },
            { id: "vitals", label: "Vitals", icon: Heart },
            { id: "encounters", label: "Encounters", icon: Calendar },
            { id: "notes", label: "Notes", icon: ClipboardList },
            { id: "smart-triage", label: "Smart Triage", icon: Brain },
            { id: "allergies", label: "Allergies", icon: AlertCircle },
            { id: "medications", label: "Medications", icon: Pill },
            { id: "problems", label: "Problems", icon: FileText },
            { id: "insurance", label: "Insurance", icon: Shield },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {activeTab === "overview" && (
            <>
              {/* Demographics */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Calendar className="h-4 w-4" />
                    Demographics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="text-muted-foreground">Date of Birth</p>
                      <p className="font-medium text-foreground">
                        {formatDate(patient.date_of_birth)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Gender</p>
                      <p className="font-medium text-foreground">
                        {patient.gender || "Not specified"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Status</p>
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                          patient.status === "active"
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Contact Information */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Phone className="h-4 w-4" />
                    Contact Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {patient.email || "No email on file"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {patient.phone || "No phone on file"}
                      </span>
                    </div>
                    {patient.address && (
                      <div className="flex items-start gap-2">
                        <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <span className="font-medium text-foreground">{patient.address}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Quick Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Activity className="h-4 w-4" />
                    Quick Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Allergies</span>
                      <span className="font-bold text-foreground">
                        {patient.allergies?.length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Medications</span>
                      <span className="font-bold text-foreground">
                        {patient.medications?.filter((m) => m.status === "active").length || 0}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Active Problems</span>
                      <span className="font-bold text-foreground">
                        {patient.problems?.filter((p) => p.status === "active").length || 0}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {activeTab === "vitals" && (
            <>
              <div className="lg:col-span-2">
                <VitalsEntryPanel
                  patientId={patientId}
                  onSave={async (data) => {
                    try {
                      await fetch("/api/vitals", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ...data, patient_id: patientId }),
                      });
                    } catch (err) {
                      console.error("Failed to save vitals:", err);
                    }
                  }}
                />
              </div>
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Activity className="h-4 w-4" />
                      Weight Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <WeightTrendChart
                      data={[
                        { date: "10/15", weight: 185 },
                        { date: "11/12", weight: 183 },
                        { date: "12/10", weight: 181 },
                        { date: "01/14", weight: 180 },
                        { date: "02/11", weight: 178 },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>
                      <Brain className="h-4 w-4" />
                      Screening Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScreeningTrendChart
                      instrument="PHQ9"
                      data={[
                        { date: "10/15", score: 18 },
                        { date: "11/12", score: 14 },
                        { date: "12/10", score: 11 },
                        { date: "01/14", score: 9 },
                        { date: "02/11", score: 7 },
                      ]}
                      maxScore={27}
                    />
                    <ScreeningTrendChart
                      instrument="GAD7"
                      data={[
                        { date: "10/15", score: 15 },
                        { date: "11/12", score: 12 },
                        { date: "12/10", score: 10 },
                        { date: "01/14", score: 8 },
                        { date: "02/11", score: 6 },
                      ]}
                      maxScore={21}
                    />
                  </CardContent>
                </Card>
                <ScreeningPanel patientId={patientId} />
              </div>
            </>
          )}

          {activeTab === "smart-triage" && (
            <div className="lg:col-span-3">
              <SmartTriagePanel patientId={patientId} />
            </div>
          )}

          {activeTab === "encounters" && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  <Calendar className="h-4 w-4" />
                  Recent Encounters
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingEncounters ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : encounters && encounters.length > 0 ? (
                  <div className="space-y-2">
                    {encounters.map((encounter: any) => (
                      <Link
                        key={encounter.id}
                        href={`/encounters/${encounter.id}`}
                        className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg hover:bg-accent/50 transition-colors group"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                            {formatEncounterType(encounter.encounter_type)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(encounter.scheduled_start).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                          {encounter.chief_complaint && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {encounter.chief_complaint}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                              encounter.status === "completed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : encounter.status === "in_progress"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {encounter.status.replace("_", " ")}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                        </div>
                      </Link>
                    ))}
                    <Link
                      href={`/encounters?patient_id=${patient.id}`}
                      className="block text-center text-sm text-primary hover:underline mt-4"
                    >
                      View all encounters →
                    </Link>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No encounters on record</p>
                    <Link
                      href={`/encounters/new?patientId=${patient.id}`}
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Encounter
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "notes" && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  <ClipboardList className="h-4 w-4" />
                  Clinical Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingNotes ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : notes && notes.length > 0 ? (
                  <div className="space-y-3">
                    {notes.map((note: any) => (
                      <Link
                        key={note.id}
                        href={`/notes/${note.id}`}
                        className="block p-4 bg-muted/50 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <p className="font-medium text-foreground group-hover:text-primary transition-colors">
                              Clinical Note
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {new Date(note.created_at).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                              note.status === "signed"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : note.status === "completed"
                                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                  : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
                            }`}
                          >
                            {note.status || "draft"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {note.content?.substring(0, 200)}
                          {note.content?.length > 200 ? "..." : ""}
                        </p>
                        <p className="text-xs text-primary mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          Click to view and edit →
                        </p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-muted-foreground">No clinical notes on record</p>
                    <Link
                      href={`/notes/new?patientId=${patient.id}`}
                      className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                      Create First Note
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "allergies" && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  <AlertCircle className="h-4 w-4" />
                  Allergies
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.allergies && patient.allergies.length > 0 ? (
                  <div className="space-y-2">
                    {patient.allergies.map((allergy) => (
                      <div
                        key={allergy.id}
                        className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                      >
                        <span className="font-medium text-red-900 dark:text-red-200">
                          {allergy.allergy}
                        </span>
                        {allergy.severity && (
                          <span className="text-xs px-2 py-1 bg-red-200 dark:bg-red-800 text-red-900 dark:text-red-200 rounded font-bold uppercase">
                            {allergy.severity}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No known allergies</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "medications" && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  <Pill className="h-4 w-4" />
                  Medications
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.medications && patient.medications.length > 0 ? (
                  <div className="space-y-2">
                    {patient.medications.map((med) => (
                      <div
                        key={med.id}
                        className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">{med.medication}</p>
                          {(med.dosage || med.frequency) && (
                            <p className="text-xs text-muted-foreground mt-1">
                              {med.dosage} {med.frequency && `• ${med.frequency}`}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                            med.status === "active"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {med.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No medications on file</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "problems" && (
            <Card className="lg:col-span-3">
              <CardHeader>
                <CardTitle>
                  <FileText className="h-4 w-4" />
                  Problem List
                </CardTitle>
              </CardHeader>
              <CardContent>
                {patient.problems && patient.problems.length > 0 ? (
                  <div className="space-y-2">
                    {patient.problems.map((problem) => (
                      <div
                        key={problem.id}
                        className="flex items-center justify-between p-3 bg-muted/50 border border-border rounded-lg"
                      >
                        <div>
                          <p className="font-medium text-foreground">{problem.problem}</p>
                          {problem.icd10_code && (
                            <p className="text-xs text-muted-foreground mt-1 font-mono">
                              ICD-10: {problem.icd10_code}
                            </p>
                          )}
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded font-bold uppercase ${
                            problem.status === "active"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {problem.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No problems on file</p>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === "insurance" && (
            <div className="lg:col-span-3 space-y-6">
              {/* Insurance Text Info */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <Shield className="h-4 w-4" />
                    Insurance Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {patient.insurance ? (
                    <div className="space-y-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">Provider</p>
                        <p className="font-medium text-foreground">{patient.insurance.provider}</p>
                      </div>
                      {patient.insurance.policy_number && (
                        <div>
                          <p className="text-muted-foreground">Policy Number</p>
                          <p className="font-medium text-foreground font-mono">
                            {patient.insurance.policy_number}
                          </p>
                        </div>
                      )}
                      {patient.insurance.group_number && (
                        <div>
                          <p className="text-muted-foreground">Group Number</p>
                          <p className="font-medium text-foreground font-mono">
                            {patient.insurance.group_number}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No insurance information on file
                    </p>
                  )}
                </CardContent>
              </Card>

              {/* Patient Documents — ID & Insurance Card Uploads */}
              <Card>
                <CardHeader>
                  <CardTitle>
                    <FileText className="h-4 w-4" />
                    Patient ID & Insurance Cards
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    Upload copies of the patient&apos;s photo ID and insurance cards for reference
                  </p>
                </CardHeader>
                <CardContent>
                  <PatientDocuments patientId={patientId} />
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
