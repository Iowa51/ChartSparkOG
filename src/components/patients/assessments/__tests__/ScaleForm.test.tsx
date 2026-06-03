import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import ScaleForm from "../ScaleForm";
import type { RenderProjection } from "@/lib/assessments/types";

function chooseOption(itemId: string, optionLabel: RegExp) {
  const fieldset = screen.getByTestId(`scale-form-item-${itemId}`);
  fireEvent.click(within(fieldset).getByLabelText(optionLabel));
}

const PHQ9_PROJECTION: RenderProjection = {
  id: "phq9",
  name: "PHQ-9",
  responseShape: "flat-likert",
  description: "Patient Health Questionnaire-9",
  options: [
    { value: 0, label: "Not at all" },
    { value: 1, label: "Several days" },
    { value: 2, label: "More than half the days" },
    { value: 3, label: "Nearly every day" },
  ],
  items: [
    { id: "item1", text: "Little interest or pleasure in doing things" },
    { id: "item2", text: "Feeling down, depressed, or hopeless" },
    { id: "item3", text: "Trouble falling or staying asleep" },
  ],
};

describe("<ScaleForm />", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders every item from the projection with all four options", () => {
    render(<ScaleForm projection={PHQ9_PROJECTION} onSubmit={vi.fn()} />);

    PHQ9_PROJECTION.items.forEach((item) => {
      expect(screen.getByTestId(`scale-form-item-${item.id}`)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(item.text))).toBeInTheDocument();
    });

    // 3 items * 4 options = 12 radio inputs
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(12);
  });

  it("shows a validation error when submit fires with missing responses", async () => {
    const onSubmit = vi.fn();
    render(<ScaleForm projection={PHQ9_PROJECTION} onSubmit={onSubmit} />);
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    expect(await screen.findByText(/please answer all 3 items/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("calls onSubmit with a Record<itemId, value> when all items are answered", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    render(<ScaleForm projection={PHQ9_PROJECTION} onSubmit={onSubmit} />);

    chooseOption("item1", /more than half the days/i);
    chooseOption("item2", /several days/i);
    chooseOption("item3", /nearly every day/i);

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));

    // Wait one microtask for the form submit promise chain.
    await Promise.resolve();
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted).toEqual({ item1: 2, item2: 1, item3: 3 });
  });

  it("updates the answered-count indicator as the user makes selections", () => {
    render(<ScaleForm projection={PHQ9_PROJECTION} onSubmit={vi.fn()} />);
    const progress = screen.getByTestId("scale-form-progress");
    expect(progress).toHaveTextContent("0 of 3");

    chooseOption("item1", /not at all/i);
    expect(progress).toHaveTextContent("1 of 3");
  });

  it("disables the submit button while submitting", () => {
    render(
      <ScaleForm
        projection={PHQ9_PROJECTION}
        onSubmit={vi.fn()}
        submitting
        submitLabel="Submit assessment"
      />,
    );
    expect(screen.getByRole("button", { name: /submit assessment/i })).toBeDisabled();
  });
});
