import { cloneElement } from "react";
import type { ReactElement } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const clientMocks = vi.hoisted(() => ({
  getAssessmentTrend: vi.fn(),
}));

vi.mock("@/lib/assessments/client", () => ({
  getAssessmentTrend: clientMocks.getAssessmentTrend,
}));

// jsdom has no layout, so ResponsiveContainer would render the chart at 0x0
// and recharts would draw nothing. Cloning the child with explicit dimensions
// keeps the REAL chart (axes, line, custom dots) in the test render.
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({
      children,
    }: {
      children: ReactElement<{ width?: number; height?: number }>;
    }) => cloneElement(children, { width: 600, height: 300 }),
  };
});

import AssessmentTrendView from "../AssessmentTrendView";

const PATIENT_ID = "patient-1";

function point(
  overrides: Partial<{
    scored_at: string;
    total_score: number;
    severity_code: string;
    flags: string[];
  }>,
) {
  return {
    scored_at: "2026-05-01T12:00:00Z",
    total_score: 10,
    severity_code: "moderate",
    flags: [] as string[],
    ...overrides,
  };
}

beforeEach(() => {
  clientMocks.getAssessmentTrend.mockReset();
});

describe("<AssessmentTrendView />", () => {
  it("shows a loading state while the trend request is in flight", () => {
    clientMocks.getAssessmentTrend.mockReturnValue(new Promise(() => {}));
    render(<AssessmentTrendView patientId={PATIENT_ID} scaleId="phq9" />);
    expect(screen.getByTestId("trend-loading")).toBeInTheDocument();
  });

  it("renders a chart point per administration, with red markers on safety-flagged points", async () => {
    clientMocks.getAssessmentTrend.mockResolvedValue([
      point({ scored_at: "2026-03-01T12:00:00Z", total_score: 8 }),
      point({
        scored_at: "2026-04-01T12:00:00Z",
        total_score: 18,
        severity_code: "severe",
        flags: ["suicide_risk_item"],
      }),
      point({ scored_at: "2026-05-01T12:00:00Z", total_score: 12 }),
    ]);

    render(<AssessmentTrendView patientId={PATIENT_ID} scaleId="phq9" />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-chart")).toBeInTheDocument();
    });
    expect(clientMocks.getAssessmentTrend).toHaveBeenCalledWith(PATIENT_ID, "phq9");

    const standard = screen.getAllByTestId("trend-point");
    const safety = screen.getAllByTestId("trend-point-safety");
    expect(standard).toHaveLength(2);
    expect(safety).toHaveLength(1);
    expect(safety[0]).toHaveAttribute("fill", "#dc2626");
  });

  it("non-safety flags do not get the red marker", async () => {
    clientMocks.getAssessmentTrend.mockResolvedValue([
      point({ scored_at: "2026-03-01T12:00:00Z", flags: ["positive_screen"] }),
      point({ scored_at: "2026-04-01T12:00:00Z", flags: [] }),
    ]);

    render(<AssessmentTrendView patientId={PATIENT_ID} scaleId="auditc" />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-chart")).toBeInTheDocument();
    });
    expect(screen.getAllByTestId("trend-point")).toHaveLength(2);
    expect(screen.queryByTestId("trend-point-safety")).not.toBeInTheDocument();
  });

  it("shows the empty state when there are no administrations", async () => {
    clientMocks.getAssessmentTrend.mockResolvedValue([]);

    render(<AssessmentTrendView patientId={PATIENT_ID} scaleId="gad7" />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-empty")).toBeInTheDocument();
    });
    expect(screen.getByText(/not enough administrations to plot a trend yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("trend-single-point")).not.toBeInTheDocument();
  });

  it("lists the single administration when only one point exists", async () => {
    clientMocks.getAssessmentTrend.mockResolvedValue([
      point({ total_score: 14, severity_code: "mod_severe" }),
    ]);

    render(<AssessmentTrendView patientId={PATIENT_ID} scaleId="phq9" />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-empty")).toBeInTheDocument();
    });
    const single = screen.getByTestId("trend-single-point");
    expect(single).toHaveTextContent("14");
    expect(single).toHaveTextContent("mod_severe");
  });

  it("shows an error state when the trend request fails", async () => {
    clientMocks.getAssessmentTrend.mockRejectedValue(new Error("boom"));

    render(<AssessmentTrendView patientId={PATIENT_ID} scaleId="phq9" />);

    await waitFor(() => {
      expect(screen.getByTestId("trend-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("trend-error")).toHaveTextContent(/couldn't load trend data/i);
  });
});
