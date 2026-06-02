import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// FeatureGate uses useFeature internally. Mock the hook so we can flip
// hasFeature/loading without bringing up Supabase.
const featureState = vi.hoisted(() => ({
  hasFeature: true,
  loading: false,
  error: null as Error | null,
}));

vi.mock("@/hooks/useFeature", () => ({
  useFeature: () => ({ ...featureState }),
}));

// Mock the client so we can drive data shape into the tab.
const clientMocks = vi.hoisted(() => {
  class AssessmentsApiError extends Error {
    status: number;
    fallback: boolean;
    constructor(message: string, status: number, fallback = false) {
      super(message);
      this.status = status;
      this.fallback = fallback;
    }
  }
  return {
    AssessmentsApiError,
    getPatientAssessments: vi.fn(),
    getAssignments: vi.fn(),
    deleteAssignment: vi.fn(),
  };
});

const { AssessmentsApiError } = clientMocks;

vi.mock("@/lib/assessments/client", () => ({
  AssessmentsApiError: clientMocks.AssessmentsApiError,
  getPatientAssessments: clientMocks.getPatientAssessments,
  getAssignments: clientMocks.getAssignments,
  deleteAssignment: clientMocks.deleteAssignment,
}));

// AdministerModal pulls in the client cache + fetches — stub it out for these tests.
vi.mock("@/components/patients/assessments/AdministerModal", () => ({
  default: () => null,
}));

import AssessmentsTab from "../AssessmentsTab";

const PATIENT_ID = "patient-1";

beforeEach(() => {
  featureState.hasFeature = true;
  featureState.loading = false;
  featureState.error = null;
  clientMocks.getPatientAssessments.mockReset();
  clientMocks.getAssignments.mockReset();
  clientMocks.deleteAssignment.mockReset();
});

describe("<AssessmentsTab />", () => {
  it("renders the FeatureGate locked-state when the feature is denied", () => {
    featureState.hasFeature = false;
    render(<AssessmentsTab patientId={PATIENT_ID} />);
    expect(screen.queryByTestId("assessments-tab")).not.toBeInTheDocument();
    expect(screen.getByText(/feature locked/i)).toBeInTheDocument();
  });

  it("shows a loading indicator while data loads", () => {
    clientMocks.getPatientAssessments.mockReturnValue(new Promise(() => {}));
    clientMocks.getAssignments.mockReturnValue(new Promise(() => {}));
    render(<AssessmentsTab patientId={PATIENT_ID} />);
    expect(screen.getByTestId("assessments-loading")).toBeInTheDocument();
  });

  it("shows the empty state when both lists are empty", async () => {
    clientMocks.getPatientAssessments.mockResolvedValue([]);
    clientMocks.getAssignments.mockResolvedValue([]);
    render(<AssessmentsTab patientId={PATIENT_ID} />);

    await waitFor(() => {
      expect(screen.getByText(/no assessments yet/i)).toBeInTheDocument();
    });
    expect(screen.getByText(/no pending assignments/i)).toBeInTheDocument();
  });

  it("renders fetched assessments with their scale name and score", async () => {
    clientMocks.getPatientAssessments.mockResolvedValue([
      {
        id: "admin-1",
        patient_id: PATIENT_ID,
        scale_id: "phq-9",
        scale_name: "PHQ-9",
        status: "completed",
        completed_at: "2026-05-01T12:00:00Z",
        total_score: 14,
        severity: "Moderately Severe",
        flags: ["HIGH_RISK"],
      },
    ]);
    clientMocks.getAssignments.mockResolvedValue([]);

    render(<AssessmentsTab patientId={PATIENT_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("assessment-result-admin-1")).toBeInTheDocument();
    });
    expect(screen.getByText("PHQ-9")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("HIGH_RISK")).toBeInTheDocument();
  });

  it("surfaces a friendly message when the sidecar reports a fallback error", async () => {
    clientMocks.getPatientAssessments.mockRejectedValueOnce(
      new AssessmentsApiError("Assessments service unavailable", 503, true),
    );
    clientMocks.getAssignments.mockResolvedValue([]);

    render(<AssessmentsTab patientId={PATIENT_ID} />);

    await waitFor(() => {
      expect(screen.getByTestId("assessments-error")).toHaveTextContent(/temporarily unavailable/i);
    });
  });
});
