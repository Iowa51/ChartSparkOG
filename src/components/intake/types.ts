import type { ReactElement } from "react";
import type { IntakeField } from "@/lib/intake/types";

// Contract every field component in the registry implements. The renderer looks
// up field.type and hands the component its slice of the responses object.
export interface FieldComponentProps {
  field: IntakeField;
  value: unknown;
  onChange: (value: unknown) => void;
  disabled?: boolean;
  // stable id/testid base, e.g. "allergies.allergies"
  idBase: string;
}

export type FieldComponent = (props: FieldComponentProps) => ReactElement | null;
