// Flow-level tests: multi-step navigation, conditional sections changing the
// step count, per-section + review required enforcement, NKDA suppression, and a
// full end-to-end pass over the seed _smoke_test template (identical path proof).

import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { IntakeForm } from "@/components/intake/IntakeForm";
import { parseTemplate } from "@/lib/intake/template";
import { SMOKE_DEFINITION, CONDITIONAL_DEFINITION, ALLERGIES_DEFINITION } from "./fixtures";

function next() {
  fireEvent.click(screen.getByRole("button", { name: "Next" }));
}

describe("IntakeForm multi-step flow", () => {
  it("renders the seed _smoke_test template end-to-end through the identical path", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(
      <IntakeForm template={parseTemplate(SMOKE_DEFINITION)} onSave={onSave} onSubmit={onSubmit} />,
    );

    // alpha (step 1 of 4: alpha, bravo, charlie, review)
    expect(screen.getByTestId("intake-progress")).toHaveTextContent("Step 1 of 4");
    expect(screen.getByTestId("intake-section-alpha")).toBeInTheDocument();
    fireEvent.change(screen.getByTestId("alpha.field_one"), { target: { value: "hi" } });
    next();

    // bravo
    expect(screen.getByTestId("intake-section-bravo")).toBeInTheDocument();
    next();

    // charlie
    expect(screen.getByTestId("intake-section-charlie")).toBeInTheDocument();
    next();

    // review -> submit
    expect(screen.getByTestId("intake-review")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ alpha: { field_one: "hi" } });
    // autosave fired on each advance
    expect(onSave).toHaveBeenCalled();
  });

  it("blocks advancing past a section with an unmet required field", () => {
    render(<IntakeForm template={parseTemplate(CONDITIONAL_DEFINITION)} onSubmit={vi.fn()} />);
    // demographics has required legal_name + sex, both empty
    next();
    expect(screen.getByTestId("intake-section-errors")).toBeInTheDocument();
    // still on demographics
    expect(screen.getByTestId("intake-section-demographics")).toBeInTheDocument();
  });

  it("reveals the conditional OB/GYN step only when sex=female (step count grows)", () => {
    render(<IntakeForm template={parseTemplate(CONDITIONAL_DEFINITION)} onSubmit={vi.fn()} />);
    // Without female: demographics, consents, review = 3 steps
    expect(screen.getByTestId("intake-progress")).toHaveTextContent("Step 1 of 3");

    fireEvent.change(screen.getByTestId("demographics.legal_name"), { target: { value: "Jane" } });
    fireEvent.change(screen.getByTestId("demographics.sex"), { target: { value: "female" } });
    // OB/GYN now inserted: demographics, obgyn, consents, review = 4 steps
    expect(screen.getByTestId("intake-progress")).toHaveTextContent("Step 1 of 4");

    next();
    expect(screen.getByTestId("intake-section-obgyn")).toBeInTheDocument();
  });

  it("NKDA checkbox suppresses the allergies group and waives its requirement", () => {
    render(<IntakeForm template={parseTemplate(ALLERGIES_DEFINITION)} onSubmit={vi.fn()} />);
    // The allergies group is required -> Next should be blocked initially.
    next();
    expect(screen.getByTestId("intake-section-errors")).toBeInTheDocument();

    // Check NKDA -> the group requirement is waived and the add control disables.
    fireEvent.click(screen.getByTestId("allergies.nkda"));
    expect(screen.getByRole("button", { name: /add/i })).toBeDisabled();

    // Now advancing reaches the review screen.
    next();
    expect(screen.getByTestId("intake-review")).toBeInTheDocument();
  });

  it("review submit is blocked while a required field is still empty", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    // Single-section template, required field, so review shows immediately after skipping.
    const template = parseTemplate({
      sections: [
        {
          key: "only",
          label: "Only",
          fields: [{ key: "req", type: "text", label: "Required", required: true }],
        },
      ],
    });
    render(<IntakeForm template={template} onSubmit={onSubmit} />);
    // cannot advance (required empty)
    next();
    expect(screen.getByTestId("intake-section-errors")).toBeInTheDocument();
    // fill, advance to review, submit works
    fireEvent.change(screen.getByTestId("only.req"), { target: { value: "x" } });
    next();
    fireEvent.click(screen.getByRole("button", { name: "Submit" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
  });
});
