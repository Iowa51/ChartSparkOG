import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { AssessmentSummary, AssessmentWithResult } from "@/lib/assessments/types";

const clientMocks = vi.hoisted(() => ({
  getAssessment: vi.fn(),
}));

vi.mock("@/lib/assessments/client", () => ({
  getAssessment: clientMocks.getAssessment,
}));

import AssessmentResultDisplay from "../AssessmentResultDisplay";

const SUMMARY: AssessmentSummary = {
  id: "admin-1",
  scale_id: "phq9",
  status: "completed",
  completed_at: "2026-05-01T12:00:00Z",
  result_summary: {
    total_score: 18,
    severity_code: "mod_severe",
    has_safety_flags: true,
  },
};

const DETAIL: AssessmentWithResult = {
  id: "admin-1",
  scale_id: "phq9",
  org_id: "org-1",
  patient_id: "patient-1",
  administered_by: "user-1",
  administered_at: "2026-05-01T11:50:00Z",
  delivery_method: "clinician",
  status: "completed",
  completed_at: "2026-05-01T12:00:00Z",
  responses: {},
  result: {
    id: "result-1",
    total_score: 18,
    severity: "Moderately Severe",
    severity_code: "mod_severe",
    flags: ["suicide_risk_item", "positive_screen"],
    interpretation: "Moderately severe depression.",
    narrative: "PHQ-9 total score 18, moderately severe range.",
    scored_at: "2026-05-01T12:00:00Z",
  },
};

beforeEach(() => {
  clientMocks.getAssessment.mockReset();
});

describe("<AssessmentResultDisplay /> with onViewTrend", () => {
  // REGRESSION: passing onViewTrend used to replace the expanded detail body
  // with only a "View trend" link, silently dropping flags + narrative. The
  // detail content must always fetch and render; the trend affordance is
  // additive.
  it("detail expand still fetches and renders flags + narrative", async () => {
    clientMocks.getAssessment.mockResolvedValue(DETAIL);

    render(<AssessmentResultDisplay summary={SUMMARY} onViewTrend={() => {}} />);

    fireEvent.click(screen.getByRole("button", { name: /PHQ-9/ }));

    await waitFor(() => {
      expect(screen.getByTestId("assessment-detail-admin-1")).toBeInTheDocument();
    });
    expect(clientMocks.getAssessment).toHaveBeenCalledTimes(1);
    expect(clientMocks.getAssessment).toHaveBeenCalledWith("admin-1");

    expect(screen.getByText(/PHQ-9 total score 18/)).toBeInTheDocument();
    const flagList = screen.getByTestId("assessment-flags-admin-1");
    expect(flagList).toHaveTextContent("suicide risk item");
    expect(flagList).toHaveTextContent("positive screen");
  });

  it("shows the View trend affordance alongside the detail and reports the scale id", async () => {
    clientMocks.getAssessment.mockResolvedValue(DETAIL);
    const onViewTrend = vi.fn();

    render(<AssessmentResultDisplay summary={SUMMARY} onViewTrend={onViewTrend} />);

    fireEvent.click(screen.getByRole("button", { name: /PHQ-9/ }));

    await waitFor(() => {
      expect(screen.getByTestId("assessment-detail-admin-1")).toBeInTheDocument();
    });
    const trendBtn = screen.getByRole("button", { name: /view trend/i });
    expect(trendBtn).toBeInTheDocument();

    fireEvent.click(trendBtn);
    expect(onViewTrend).toHaveBeenCalledWith("phq9");
  });

  it("still fetches and renders the detail when onViewTrend is absent", async () => {
    clientMocks.getAssessment.mockResolvedValue(DETAIL);

    render(<AssessmentResultDisplay summary={SUMMARY} />);

    fireEvent.click(screen.getByRole("button", { name: /PHQ-9/ }));

    await waitFor(() => {
      expect(screen.getByTestId("assessment-detail-admin-1")).toBeInTheDocument();
    });
    expect(clientMocks.getAssessment).toHaveBeenCalledWith("admin-1");
    expect(screen.queryByRole("button", { name: /view trend/i })).not.toBeInTheDocument();
  });
});
