// Renderer mapping tests: each field.type resolves to the right control, and the
// composite widgets (coded_search, repeating group, ROS grid, consent) behave.

import { useState } from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { IntakeField, CodedValue } from "@/lib/intake/types";
import { FieldRenderer } from "@/components/intake/registry";
import {
  IntakeSearchContext,
  IntakeMetaContext,
  type IntakeSearchContextValue,
} from "@/components/intake/context";

function field(partial: Partial<IntakeField> & { key: string; type: string }): IntakeField {
  return { label: partial.key, required: false, ...partial };
}

function renderField(
  f: IntakeField,
  value: unknown,
  onChange: (v: unknown) => void,
  search: IntakeSearchContextValue | null = null,
) {
  return render(
    <IntakeMetaContext.Provider value={{ templateVersion: 1 }}>
      <IntakeSearchContext.Provider value={search}>
        <FieldRenderer field={f} value={value} onChange={onChange} idBase={f.key} />
      </IntakeSearchContext.Provider>
    </IntakeMetaContext.Provider>,
  );
}

// Stateful wrapper so widgets that manage arrays/objects can be driven across
// multiple interactions.
function Controlled({
  f,
  initial,
  search,
}: {
  f: IntakeField;
  initial: unknown;
  search?: IntakeSearchContextValue | null;
}) {
  const [v, setV] = useState<unknown>(initial);
  return (
    <IntakeMetaContext.Provider value={{ templateVersion: 1 }}>
      <IntakeSearchContext.Provider value={search ?? null}>
        <FieldRenderer field={f} value={v} onChange={setV} idBase={f.key} />
        <output data-testid="val">{JSON.stringify(v)}</output>
      </IntakeSearchContext.Provider>
    </IntakeMetaContext.Provider>
  );
}

describe("primitive field mapping", () => {
  it("text -> text input; emits string", () => {
    const onChange = vi.fn();
    renderField(field({ key: "t", type: "text" }), "", onChange);
    fireEvent.change(screen.getByTestId("t"), { target: { value: "hello" } });
    expect(onChange).toHaveBeenCalledWith("hello");
  });

  it("textarea -> textarea", () => {
    renderField(field({ key: "ta", type: "textarea" }), "", vi.fn());
    expect(screen.getByTestId("ta").tagName).toBe("TEXTAREA");
  });

  it("date -> input[type=date]", () => {
    renderField(field({ key: "d", type: "date" }), "", vi.fn());
    expect(screen.getByTestId("d")).toHaveAttribute("type", "date");
  });

  it("number -> emits a number", () => {
    const onChange = vi.fn();
    renderField(field({ key: "n", type: "number" }), "", onChange);
    fireEvent.change(screen.getByTestId("n"), { target: { value: "42" } });
    expect(onChange).toHaveBeenCalledWith(42);
  });

  it("select -> emits the chosen option", () => {
    const onChange = vi.fn();
    renderField(field({ key: "s", type: "select", options: ["one", "two"] }), "", onChange);
    fireEvent.change(screen.getByTestId("s"), { target: { value: "two" } });
    expect(onChange).toHaveBeenCalledWith("two");
  });

  it("boolean -> emits true on check", () => {
    const onChange = vi.fn();
    renderField(field({ key: "b", type: "boolean" }), false, onChange);
    fireEvent.click(screen.getByTestId("b"));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it("multiselect -> toggles values", () => {
    render(
      <Controlled f={field({ key: "m", type: "multiselect", options: ["p", "q"] })} initial={[]} />,
    );
    fireEvent.click(screen.getByLabelText("p"));
    expect(screen.getByTestId("val")).toHaveTextContent('["p"]');
    fireEvent.click(screen.getByLabelText("p"));
    expect(screen.getByTestId("val")).toHaveTextContent("[]");
  });

  it("unknown type -> safe fallback", () => {
    renderField(field({ key: "x", type: "mystery_type" }), "", vi.fn());
    expect(screen.getByTestId("x-fallback")).toBeInTheDocument();
    expect(screen.getByText(/unsupported field type/i)).toBeInTheDocument();
  });
});

describe("coded_search", () => {
  const mkSearch = (results: CodedValue[]): IntakeSearchContextValue => ({
    searchCodes: vi.fn().mockResolvedValue(results),
  });

  it("searches, then selecting a result stores the coded value", async () => {
    const search = mkSearch([{ code: "860975", display: "Metformin", system: "rxnorm" }]);
    render(
      <Controlled
        f={field({ key: "cs", type: "coded_search", code_binding: "rxnorm" })}
        initial={null}
        search={search}
      />,
    );
    fireEvent.change(screen.getByTestId("cs"), { target: { value: "metf" } });
    await waitFor(() => expect(screen.getByTestId("cs-results")).toBeInTheDocument());
    fireEvent.click(screen.getByText("Metformin"));
    expect(screen.getByTestId("val")).toHaveTextContent('"code":"860975"');
    expect(screen.getByTestId("cs-selected")).toBeInTheDocument();
  });

  it("offers a free-text fallback (code null)", async () => {
    const search = mkSearch([]);
    render(
      <Controlled
        f={field({ key: "cs", type: "coded_search", code_binding: "rxnorm" })}
        initial={null}
        search={search}
      />,
    );
    fireEvent.change(screen.getByTestId("cs"), { target: { value: "somethingunlisted" } });
    await waitFor(() => expect(screen.getByTestId("cs-freetext")).toBeInTheDocument());
    fireEvent.click(screen.getByTestId("cs-freetext"));
    expect(screen.getByTestId("val")).toHaveTextContent('"code":null');
  });
});

describe("repeating group", () => {
  it("adds and removes coded rows", () => {
    render(
      <Controlled f={field({ key: "meds", type: "group", code_binding: "rxnorm" })} initial={[]} />,
    );
    expect(screen.getByTestId("meds-empty")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(screen.getByTestId("meds-row-0")).toBeInTheDocument();

    fireEvent.change(screen.getByTestId("meds-0-detail"), { target: { value: "500mg BID" } });
    expect(screen.getByTestId("val")).toHaveTextContent("500mg BID");

    fireEvent.click(screen.getByTestId("meds-remove-0"));
    expect(screen.queryByTestId("meds-row-0")).not.toBeInTheDocument();
  });
});

describe("ros grid", () => {
  it("toggles a system and reveals a note field when positive", () => {
    render(<Controlled f={field({ key: "ros", type: "ros_grid" })} initial={{}} />);
    fireEvent.click(screen.getByTestId("ros-respiratory-positive"));
    expect(screen.getByTestId("val")).toHaveTextContent('"finding":"positive"');
    expect(screen.getByTestId("ros-respiratory-note")).toBeInTheDocument();
  });
});

describe("consent", () => {
  it("stamps value + timestamp + template version on check", () => {
    const onChange = vi.fn();
    renderField(
      field({ key: "consent_to_treat", type: "consent", required: true }),
      null,
      onChange,
      null,
    );
    fireEvent.click(screen.getByTestId("consent_to_treat"));
    const arg = onChange.mock.calls[0][0] as {
      value: boolean;
      at: string | null;
      template_version: number | null;
    };
    expect(arg.value).toBe(true);
    expect(arg.at).toBeTruthy();
    expect(arg.template_version).toBe(1);
  });
});
