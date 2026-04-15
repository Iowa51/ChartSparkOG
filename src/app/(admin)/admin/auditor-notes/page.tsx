"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  MessageSquare,
  Search,
  AlertTriangle,
  Flag,
  CheckCircle,
  Clock,
  User,
  ChevronDown,
  ChevronUp,
  Edit2,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

interface AuditFlag {
  id: string;
  submission_id: string;
  flag_type: string;
  severity: string;
  description: string;
  created_at: string;
  resolved_at: string | null;
  users: { first_name: string; last_name: string } | null;
  submissions: {
    cpt_code: string;
    patients: { first_name: string; last_name: string } | null;
  } | null;
}

interface QueueItem {
  id: string;
  encounter_id: string;
  overall_quality_score: number | null;
  flags: string[] | null;
  cpt_code: string | null;
  icd10_codes: string[] | null;
  estimated_reimbursement: number | null;
  status: string;
  created_at: string;
  requires_supervisor_review: boolean;
  encounters?: {
    id: string;
    status: string;
    patients?: { first_name: string; last_name: string } | null;
    users?: { first_name: string; last_name: string } | null;
  } | null;
}

// ---------------------------------------------------------------------------
// Helper components
// ---------------------------------------------------------------------------

function getSeverityBadge(severity: string) {
  switch (severity) {
    case "critical":
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
          <AlertTriangle className="h-3 w-3" /> Critical
        </span>
      );
    case "high":
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
          <Flag className="h-3 w-3" /> High
        </span>
      );
    case "medium":
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-100 text-amber-700">
          <Flag className="h-3 w-3" /> Medium
        </span>
      );
    case "low":
      return (
        <span className="flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
          <Flag className="h-3 w-3" /> Low
        </span>
      );
    default:
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
          {severity}
        </span>
      );
  }
}

function QualityBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const classes =
    score >= 0.9
      ? "bg-emerald-100 text-emerald-700"
      : score >= 0.75
        ? "bg-amber-100 text-amber-700"
        : "bg-red-100 text-red-700";
  return (
    <span className={`px-2 py-1 text-xs font-bold rounded-full ${classes}`}>{pct}% quality</span>
  );
}

// ---------------------------------------------------------------------------
// Agent Queue tab
// ---------------------------------------------------------------------------

function AgentQueueTab({ organizationId }: { organizationId: string | null }) {
  const supabase = createClient();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedFlags, setExpandedFlags] = useState<Set<string>>(new Set());
  const [codeEditing, setCodeEditing] = useState<string | null>(null);
  const [codeEdits, setCodeEdits] = useState<{ cpt: string; icd10: string }>({
    cpt: "",
    icd10: "",
  });
  const [revisionModal, setRevisionModal] = useState<string | null>(null);
  const [revisionNote, setRevisionNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (organizationId) fetchQueue(organizationId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [organizationId]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const fetchQueue = async (orgId: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("quality_reviews")
        .select(
          `
                    *,
                    encounters(
                        id,
                        status,
                        patients(first_name, last_name),
                        users(first_name, last_name)
                    )
                `,
        )
        .eq("organization_id", orgId)
        .eq("requires_supervisor_review", true)
        .neq("status", "resolved")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setItems(data || []);
    } catch (e) {
      console.error("Error fetching agent queue:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (item: QueueItem) => {
    if (!supabase || !organizationId) return;
    try {
      await supabase.from("quality_reviews").update({ status: "resolved" }).eq("id", item.id);

      await supabase.from("encounters").update({ status: "completed" }).eq("id", item.encounter_id);

      showToast("Session approved and marked complete.");
      fetchQueue(organizationId);
    } catch (e) {
      console.error("Approve failed:", e);
    }
  };

  const handleRequestRevision = async (itemId: string) => {
    if (!supabase || !organizationId || !revisionNote.trim()) return;
    try {
      await supabase.from("audit_flags").insert({
        organization_id: organizationId,
        encounter_id: items.find((i) => i.id === itemId)?.encounter_id,
        flag_type: "revision_requested",
        severity: "medium",
        description: revisionNote.trim(),
        created_at: new Date().toISOString(),
      });

      setRevisionModal(null);
      setRevisionNote("");
      showToast("Revision request submitted.");
    } catch (e) {
      console.error("Request revision failed:", e);
    }
  };

  const startCodeEdit = (item: QueueItem) => {
    setCodeEditing(item.id);
    setCodeEdits({
      cpt: item.cpt_code ?? "",
      icd10: (item.icd10_codes ?? []).join(", "),
    });
  };

  const saveCodeEdit = async (item: QueueItem) => {
    if (!supabase || !organizationId) return;
    const icd10 = codeEdits.icd10
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    try {
      await supabase
        .from("quality_reviews")
        .update({ cpt_code: codeEdits.cpt, icd10_codes: icd10 })
        .eq("id", item.id);

      // Also update clinical_notes
      await supabase
        .from("clinical_notes")
        .update({ content: null }) // placeholder — update any linked note fields if schema allows
        .eq("encounter_id", item.encounter_id);

      setCodeEditing(null);
      showToast("Codes updated.");
      fetchQueue(organizationId);
    } catch (e) {
      console.error("Code override failed:", e);
    }
  };

  const toggleFlags = (id: string) => {
    setExpandedFlags((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="space-y-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 animate-pulse"
          >
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mt-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
        <CheckCircle className="h-12 w-12 text-emerald-400 mx-auto mb-4" />
        <p className="text-slate-500">No sessions pending review</p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-4 relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 px-4 py-3 bg-emerald-600 text-white text-sm font-medium rounded-xl shadow-lg">
          {toast}
        </div>
      )}

      {/* Revision modal */}
      {revisionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 w-full max-w-md shadow-2xl">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              Request Revision
            </h3>
            <textarea
              className="w-full border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-sm bg-white dark:bg-slate-800 focus:ring-2 focus:ring-amber-500 outline-none resize-none"
              rows={4}
              placeholder="Describe the revision needed..."
              value={revisionNote}
              onChange={(e) => setRevisionNote(e.target.value)}
            />
            <div className="flex gap-3 mt-4 justify-end">
              <button
                onClick={() => {
                  setRevisionModal(null);
                  setRevisionNote("");
                }}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={() => handleRequestRevision(revisionModal)}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm rounded-xl font-medium"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {items.map((item) => {
        const patient = item.encounters?.patients;
        const clinician = item.encounters?.users;
        const flagsExpanded = expandedFlags.has(item.id);
        const isEditingCodes = codeEditing === item.id;

        return (
          <div
            key={item.id}
            className="bg-white dark:bg-slate-900 rounded-2xl border border-amber-200 dark:border-amber-900 p-6"
          >
            {/* Row header */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="space-y-1">
                <p className="font-bold text-slate-900 dark:text-white">
                  {patient ? `${patient.first_name} ${patient.last_name}` : "Unknown Patient"}
                </p>
                <div className="flex items-center gap-4 text-sm text-slate-500">
                  {clinician && (
                    <span className="flex items-center gap-1">
                      <User className="h-3.5 w-3.5" />
                      Dr. {clinician.first_name} {clinician.last_name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(item.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {item.overall_quality_score !== null && (
                  <QualityBadge score={item.overall_quality_score} />
                )}

                {/* Action buttons */}
                <button
                  onClick={() => handleApprove(item)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs rounded-lg font-medium transition-colors"
                >
                  Approve &amp; Submit
                </button>
                <button
                  onClick={() => setRevisionModal(item.id)}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-lg font-medium transition-colors"
                >
                  Request Revision
                </button>
                <button
                  onClick={() => (isEditingCodes ? setCodeEditing(null) : startCodeEdit(item))}
                  className="px-3 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs rounded-lg font-medium transition-colors flex items-center gap-1"
                >
                  <Edit2 className="h-3 w-3" />
                  Override Codes
                </button>
              </div>
            </div>

            {/* Code editor */}
            {isEditingCodes && (
              <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      CPT Code
                    </label>
                    <input
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-primary"
                      value={codeEdits.cpt}
                      onChange={(e) => setCodeEdits((p) => ({ ...p, cpt: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-1">
                      ICD-10 Codes (comma-separated)
                    </label>
                    <input
                      className="w-full border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-primary"
                      value={codeEdits.icd10}
                      onChange={(e) => setCodeEdits((p) => ({ ...p, icd10: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button
                    onClick={() => setCodeEditing(null)}
                    className="text-xs text-slate-500 hover:text-slate-800 px-3 py-1.5"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => saveCodeEdit(item)}
                    className="px-4 py-1.5 bg-primary text-white text-xs rounded-lg font-medium"
                  >
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {/* Codes + reimbursement */}
            <div className="mt-4 flex flex-wrap gap-3 items-center text-sm">
              {item.cpt_code && (
                <span className="px-2.5 py-1 bg-primary/10 text-primary text-xs font-bold rounded-lg">
                  CPT: {item.cpt_code}
                </span>
              )}
              {(item.icd10_codes ?? []).map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-foreground text-xs font-semibold rounded-lg border border-border"
                >
                  {code}
                </span>
              ))}
              {item.estimated_reimbursement !== null &&
                item.estimated_reimbursement !== undefined && (
                  <span className="text-xs text-slate-500">
                    Est. reimbursement:{" "}
                    <strong className="text-foreground">
                      ${item.estimated_reimbursement.toFixed(2)}
                    </strong>{" "}
                    <span className="text-slate-400">(Medicare baseline estimate)</span>
                  </span>
                )}
            </div>

            {/* Flags — expandable */}
            {item.flags && item.flags.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => toggleFlags(item.id)}
                  className="flex items-center gap-1 text-xs text-amber-600 font-semibold hover:underline"
                >
                  {flagsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {item.flags.length} flag{item.flags.length !== 1 ? "s" : ""}
                </button>
                {flagsExpanded && (
                  <ul className="mt-2 space-y-1">
                    {item.flags.map((f, i) => (
                      <li
                        key={i}
                        className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2"
                      >
                        <AlertTriangle className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function AdminAuditorNotesPage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState<"audit_flags" | "agent_queue">("audit_flags");
  const [flags, setFlags] = useState<AuditFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<string>("ALL");
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);

  useEffect(() => {
    fetchCurrentUserOrg();
  }, []);

  const fetchCurrentUserOrg = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("users")
        .select("organization_id, role")
        .eq("id", user.id)
        .single();

      if (profile?.organization_id) {
        setOrganizationId(profile.organization_id);
        setUserRole(profile.role ?? null);
        fetchFlags(profile.organization_id);
      } else {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  };

  const fetchFlags = async (orgId: string) => {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("audit_flags")
        .select(
          `
                    *,
                    users(first_name, last_name),
                    submissions(
                        cpt_code,
                        patients(first_name, last_name)
                    )
                `,
        )
        .eq("organization_id", orgId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setFlags(data || []);
    } catch (error) {
      console.error("Error fetching flags:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async (flagId: string) => {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from("audit_flags")
        .update({ resolved_at: new Date().toISOString() })
        .eq("id", flagId);

      if (error) throw error;
      if (organizationId) fetchFlags(organizationId);
    } catch (error) {
      console.error("Error resolving flag:", error);
    }
  };

  const filteredFlags = flags.filter((flag) => {
    const matchesSearch =
      flag.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      flag.flag_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSeverity = severityFilter === "ALL" || flag.severity === severityFilter;
    return matchesSearch && matchesSeverity;
  });

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">
          Auditor Notes &amp; Flags
        </h1>
        <p className="text-slate-500 dark:text-slate-400 mt-1">
          Review compliance issues flagged by auditors
        </p>
      </div>

      {/* Stats (audit flags tab only) */}
      {activeTab === "audit_flags" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-2xl font-bold text-slate-900 dark:text-white">{flags.length}</p>
            <p className="text-sm text-slate-500">Total Flags</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-2xl font-bold text-red-600">
              {flags.filter((f) => f.severity === "critical" && !f.resolved_at).length}
            </p>
            <p className="text-sm text-slate-500">Critical Unresolved</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-2xl font-bold text-amber-600">
              {flags.filter((f) => !f.resolved_at).length}
            </p>
            <p className="text-sm text-slate-500">Pending Review</p>
          </div>
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4">
            <p className="text-2xl font-bold text-emerald-600">
              {flags.filter((f) => f.resolved_at).length}
            </p>
            <p className="text-sm text-slate-500">Resolved</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 mb-6">
        <button
          onClick={() => setActiveTab("audit_flags")}
          className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "audit_flags"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Audit Flags
        </button>
        {(userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
          <button
            onClick={() => setActiveTab("agent_queue")}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === "agent_queue"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            Agent Queue
          </button>
        )}
      </div>

      {/* Tab: Audit Flags */}
      {activeTab === "audit_flags" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <input
                type="text"
                placeholder="Search flags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
            <div className="flex gap-2">
              {["ALL", "critical", "high", "medium", "low"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setSeverityFilter(sev)}
                  className={`px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                    severityFilter === sev
                      ? sev === "critical"
                        ? "bg-red-600 text-white"
                        : sev === "high"
                          ? "bg-orange-600 text-white"
                          : sev === "medium"
                            ? "bg-amber-600 text-white"
                            : "bg-slate-900 text-white"
                      : "bg-white dark:bg-slate-900 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {sev === "ALL" ? "All" : sev.charAt(0).toUpperCase() + sev.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Flags list — identical to original */}
          <div className="space-y-4">
            {loading ? (
              <div className="text-center py-12 text-slate-500">Loading flags...</div>
            ) : filteredFlags.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center">
                <MessageSquare className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500">No auditor flags found</p>
                <p className="text-sm text-slate-400 mt-1">
                  Flags from auditors will appear here when they review submissions
                </p>
              </div>
            ) : (
              filteredFlags.map((flag) => (
                <div
                  key={flag.id}
                  className={`bg-white dark:bg-slate-900 rounded-2xl border p-6 ${
                    flag.resolved_at
                      ? "border-slate-200 dark:border-slate-800 opacity-60"
                      : flag.severity === "critical"
                        ? "border-red-200 dark:border-red-900"
                        : "border-amber-200 dark:border-amber-900"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        {getSeverityBadge(flag.severity)}
                        <span className="px-2 py-1 text-xs bg-slate-100 dark:bg-slate-800 rounded">
                          {flag.flag_type}
                        </span>
                        {flag.resolved_at && (
                          <span className="flex items-center gap-1 px-2 py-1 text-xs text-emerald-600">
                            <CheckCircle className="h-3 w-3" /> Resolved
                          </span>
                        )}
                      </div>
                      <p className="text-slate-900 dark:text-white font-medium mb-2">
                        {flag.description}
                      </p>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {flag.users?.first_name} {flag.users?.last_name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {new Date(flag.created_at).toLocaleDateString()}
                        </span>
                        {flag.submissions && (
                          <span>
                            CPT: {flag.submissions.cpt_code} • Patient:{" "}
                            {flag.submissions.patients?.first_name}{" "}
                            {flag.submissions.patients?.last_name}
                          </span>
                        )}
                      </div>
                    </div>
                    {!flag.resolved_at && (
                      <button
                        onClick={() => handleResolve(flag.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-xl font-medium transition-colors"
                      >
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Tab: Agent Queue */}
      {activeTab === "agent_queue" && (userRole === "ADMIN" || userRole === "SUPER_ADMIN") && (
        <AgentQueueTab organizationId={organizationId} />
      )}
    </div>
  );
}
