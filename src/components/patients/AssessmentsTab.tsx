"use client";

// AssessmentsTab — main entry for the "Assessments" tab in the patient
// detail page. Loads the patient's recent administrations + pending
// assignments, lets the clinician open AdministerModal to administer a new
// scale. Gated behind the ASSESSMENTS_V1 feature.

import { useCallback, useEffect, useState } from "react";
import { AlertCircle, ClipboardCheck, Loader2, Plus, RefreshCw } from "lucide-react";
import { FeatureGate } from "@/components/FeatureGate";
import {
  AssessmentsApiError,
  deleteAssignment,
  getAssignments,
  getPatientAssessments,
} from "@/lib/assessments/client";
import type { Assignment, AssessmentSummary } from "@/lib/assessments/types";
import AdministerModal from "./assessments/AdministerModal";
import AssessmentResultDisplay from "./assessments/AssessmentResultDisplay";

interface AssessmentsTabProps {
  patientId: string;
}

function formatDueDate(value?: string | null): string {
  if (!value) return "No due date";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function AssessmentsTabInner({ patientId }: AssessmentsTabProps) {
  const [assessments, setAssessments] = useState<AssessmentSummary[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAdministerModal, setShowAdministerModal] = useState(false);
  const [deletingAssignmentId, setDeletingAssignmentId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [a, asgn] = await Promise.all([
        getPatientAssessments(patientId, { limit: 25 }),
        getAssignments(patientId, { status: "pending" }),
      ]);
      setAssessments(a);
      setAssignments(asgn);
    } catch (err) {
      const message =
        err instanceof AssessmentsApiError && err.fallback
          ? "Assessments service is temporarily unavailable. Try again shortly."
          : err instanceof Error
            ? err.message
            : "Failed to load assessments";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeleteAssignment = useCallback(async (assignmentId: string) => {
    setDeletingAssignmentId(assignmentId);
    try {
      await deleteAssignment(assignmentId);
      setAssignments((prev) => prev.filter((a) => a.id !== assignmentId));
    } catch (err) {
      const message =
        err instanceof AssessmentsApiError && err.status === 409
          ? "This assignment has completed administrations and cannot be deleted."
          : err instanceof Error
            ? err.message
            : "Failed to delete assignment";
      setError(message);
    } finally {
      setDeletingAssignmentId(null);
    }
  }, []);

  return (
    <div className="lg:col-span-3 space-y-6" data-testid="assessments-tab">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Assessments
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Behavioral health screening instruments — administer, review, and trend over time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-md text-muted-foreground hover:bg-muted/50 disabled:opacity-50"
            aria-label="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            type="button"
            onClick={() => setShowAdministerModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-bold text-sm hover:bg-primary/90"
            data-testid="administer-new-btn"
          >
            <Plus className="h-4 w-4" />
            Administer New
          </button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          data-testid="assessments-error"
          className="flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 px-4 py-3 text-sm text-red-700 dark:text-red-300"
        >
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div
          className="flex items-center justify-center py-12 text-muted-foreground"
          data-testid="assessments-loading"
        >
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading assessments…
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section data-testid="recent-assessments">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
              Recent assessments
            </h3>
            {assessments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No assessments yet. Click <strong>Administer New</strong> to start one.
              </p>
            ) : (
              <div className="space-y-2">
                {assessments.map((a) => (
                  <AssessmentResultDisplay key={a.id} summary={a} />
                ))}
              </div>
            )}
          </section>

          <section data-testid="pending-assignments">
            <h3 className="text-sm font-bold uppercase tracking-wider text-foreground mb-3">
              Pending assignments
            </h3>
            {assignments.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No pending assignments.</p>
            ) : (
              <div className="space-y-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center justify-between rounded-xl border border-slate-200 dark:border-slate-800 p-3"
                    data-testid={`assignment-${a.id}`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {a.scale_name ?? a.scale_id}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Due: {formatDueDate(a.due_date)}
                        {a.recurring && ` · Recurring (${a.recurring.interval})`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteAssignment(a.id)}
                      disabled={deletingAssignmentId === a.id}
                      className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline disabled:opacity-50"
                    >
                      {deletingAssignmentId === a.id ? "Cancelling…" : "Cancel"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      <AdministerModal
        patientId={patientId}
        open={showAdministerModal}
        onClose={() => setShowAdministerModal(false)}
        onCompleted={() => {
          setShowAdministerModal(false);
          loadData();
        }}
      />
    </div>
  );
}

export default function AssessmentsTab(props: AssessmentsTabProps) {
  return (
    <FeatureGate feature="ASSESSMENTS_V1">
      <AssessmentsTabInner {...props} />
    </FeatureGate>
  );
}
