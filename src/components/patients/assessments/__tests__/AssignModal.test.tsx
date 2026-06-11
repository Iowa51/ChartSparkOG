import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const clientMocks = vi.hoisted(() => ({
  createAssignment: vi.fn(),
}));

vi.mock("@/lib/assessments/client", () => ({
  createAssignment: clientMocks.createAssignment,
}));

import AssignModal from "../AssignModal";

const PATIENT_ID = "patient-1";

beforeEach(() => {
  clientMocks.createAssignment.mockReset();
});

describe("<AssignModal />", () => {
  it("renders nothing when closed", () => {
    render(
      <AssignModal patientId={PATIENT_ID} open={false} onClose={() => {}} onCreated={() => {}} />,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("submits scale, due date, and recurring, then fires onCreated", async () => {
    clientMocks.createAssignment.mockResolvedValue({ id: "assign-1" });
    const onCreated = vi.fn();

    render(
      <AssignModal patientId={PATIENT_ID} open={true} onClose={() => {}} onCreated={onCreated} />,
    );

    fireEvent.change(screen.getByTestId("assign-scale-select"), { target: { value: "phq9" } });
    fireEvent.change(screen.getByTestId("assign-due-date"), { target: { value: "2026-07-01" } });
    fireEvent.change(screen.getByTestId("assign-recurring-select"), {
      target: { value: "monthly" },
    });
    fireEvent.click(screen.getByTestId("assign-submit-btn"));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
    expect(clientMocks.createAssignment).toHaveBeenCalledWith({
      patient_id: PATIENT_ID,
      scale_id: "phq9",
      due_date: "2026-07-01",
      recurring: "monthly",
    });
  });

  it("omits due_date and recurring entirely when left blank (sidecar schema is strict)", async () => {
    clientMocks.createAssignment.mockResolvedValue({ id: "assign-2" });
    const onCreated = vi.fn();

    render(
      <AssignModal patientId={PATIENT_ID} open={true} onClose={() => {}} onCreated={onCreated} />,
    );

    fireEvent.change(screen.getByTestId("assign-scale-select"), { target: { value: "gad7" } });
    fireEvent.click(screen.getByTestId("assign-submit-btn"));

    await waitFor(() => {
      expect(onCreated).toHaveBeenCalledTimes(1);
    });
    expect(clientMocks.createAssignment).toHaveBeenCalledWith({
      patient_id: PATIENT_ID,
      scale_id: "gad7",
    });
  });

  it("disables submit until a scale is selected", () => {
    render(
      <AssignModal patientId={PATIENT_ID} open={true} onClose={() => {}} onCreated={() => {}} />,
    );
    expect(screen.getByTestId("assign-submit-btn")).toBeDisabled();
  });

  it("surfaces API errors inline and keeps the modal open", async () => {
    clientMocks.createAssignment.mockRejectedValue(new Error("Validation failed"));
    const onCreated = vi.fn();

    render(
      <AssignModal patientId={PATIENT_ID} open={true} onClose={() => {}} onCreated={onCreated} />,
    );

    fireEvent.change(screen.getByTestId("assign-scale-select"), { target: { value: "phq9" } });
    fireEvent.click(screen.getByTestId("assign-submit-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("assign-error")).toBeInTheDocument();
    });
    expect(screen.getByTestId("assign-error")).toHaveTextContent("Validation failed");
    expect(onCreated).not.toHaveBeenCalled();
    // Form is still usable for a corrected retry.
    expect(screen.getByTestId("assign-submit-btn")).toBeEnabled();
  });
});
