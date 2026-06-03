import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import CssrsForm from "../CssrsForm";
import type { RenderProjection } from "@/lib/assessments/types";

// Trimmed CSSRS projection — 3 items is enough to exercise the
// timeframe-dropdown contract on item6.
const CSSRS_PROJECTION: RenderProjection = {
  id: "cssrs",
  name: "C-SSRS",
  responseShape: "cssrs",
  items: [
    { id: "item1", text: "Wish to be dead" },
    { id: "item2", text: "Non-specific active suicidal thoughts" },
    { id: "item6", text: "Suicidal behavior" },
  ],
  structuredItems: {
    item6BehaviorTimeframe: {
      requiredWhenAnswered: true,
      options: [
        { value: "past_week", label: "Within the past week" },
        { value: "past_month", label: "Within the past month" },
        { value: "past_year", label: "Within the past year" },
        { value: "lifetime", label: "Lifetime" },
      ],
    },
  },
};

describe("<CssrsForm />", () => {
  it("renders each structured item with Yes/No toggles", () => {
    render(<CssrsForm projection={CSSRS_PROJECTION} onSubmit={vi.fn()} />);
    CSSRS_PROJECTION.items.forEach((item) => {
      expect(screen.getByTestId(`cssrs-form-item-${item.id}`)).toBeInTheDocument();
      expect(screen.getByTestId(`cssrs-${item.id}-yes`)).toBeInTheDocument();
      expect(screen.getByTestId(`cssrs-${item.id}-no`)).toBeInTheDocument();
    });
  });

  it("does not show the timeframe dropdown for item6 until it is answered Yes", () => {
    render(<CssrsForm projection={CSSRS_PROJECTION} onSubmit={vi.fn()} />);
    expect(screen.queryByTestId("cssrs-item6-timeframe")).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId("cssrs-item6-yes"));
    // Per the projection, requiredWhenAnswered:true, so the dropdown shows
    // as soon as the item is answered Yes (no need to tick a sub-checkbox).
    expect(screen.getByTestId("cssrs-item6-timeframe")).toBeInTheDocument();
  });

  it("blocks submit until the item6 timeframe is selected", async () => {
    const onSubmit = vi.fn();
    render(<CssrsForm projection={CSSRS_PROJECTION} onSubmit={onSubmit} />);

    // Answer all 3 items, mark item6 answered + lifetime, but skip timeframe.
    fireEvent.click(screen.getByTestId("cssrs-item1-no"));
    fireEvent.click(screen.getByTestId("cssrs-item2-no"));
    fireEvent.click(screen.getByTestId("cssrs-item6-yes"));
    fireEvent.click(screen.getByTestId("cssrs-item6-lifetime"));

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/timeframe for item 6/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();

    // Now choose a timeframe — submit should go through.
    fireEvent.change(screen.getByTestId("cssrs-item6-timeframe"), {
      target: { value: "past_week" },
    });
    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    await Promise.resolve();

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const submitted = onSubmit.mock.calls[0]?.[0];
    expect(submitted.item6).toMatchObject({
      answered: true,
      lifetime: true,
      behaviorTimeframe: "past_week",
    });
    expect(submitted.item1.answered).toBe(false);
    expect(submitted.item2.answered).toBe(false);
  });

  it("shows a validation error when an item has no answered toggle set", async () => {
    const onSubmit = vi.fn();
    render(<CssrsForm projection={CSSRS_PROJECTION} onSubmit={onSubmit} />);

    // Only answer 2 of 3.
    fireEvent.click(screen.getByTestId("cssrs-item1-no"));
    fireEvent.click(screen.getByTestId("cssrs-item2-no"));

    fireEvent.click(screen.getByRole("button", { name: /submit/i }));
    expect(await screen.findByText(/please answer item item6/i)).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
