// Test fixtures for the intake renderer. SMOKE_DEFINITION is copied verbatim
// from the seed migration (20260706120001) so the tests prove the SAME renderer
// path handles a non-family-medicine template. The others are synthetic and
// exercise specific field types / conditionals.

// Exact _smoke_test definition from the seed migration.
export const SMOKE_DEFINITION = {
  sections: [
    {
      key: "alpha",
      label: "Alpha Section",
      fields: [
        { key: "field_one", type: "text", label: "Field One", required: false },
        { key: "field_two", type: "boolean", label: "Field Two", required: false },
      ],
    },
    {
      key: "bravo",
      label: "Bravo Section",
      fields: [
        {
          key: "pick",
          type: "select",
          label: "Pick One",
          required: false,
          options: ["x", "y", "z"],
        },
      ],
    },
    {
      key: "charlie",
      label: "Charlie Section",
      fields: [{ key: "notes", type: "textarea", label: "Freeform Notes", required: false }],
    },
  ],
};

// One section with every primitive field type, for mapping coverage.
export const ALL_TYPES_DEFINITION = {
  sections: [
    {
      key: "primitives",
      label: "Primitives",
      fields: [
        { key: "a_text", type: "text", label: "A Text", required: false },
        { key: "a_textarea", type: "textarea", label: "A Textarea", required: false },
        { key: "a_date", type: "date", label: "A Date", required: false },
        { key: "a_number", type: "number", label: "A Number", required: false },
        {
          key: "a_select",
          type: "select",
          label: "A Select",
          required: false,
          options: ["one", "two"],
        },
        {
          key: "a_multi",
          type: "multiselect",
          label: "A Multi",
          required: false,
          options: ["p", "q", "r"],
        },
        { key: "a_bool", type: "boolean", label: "A Bool", required: false },
        { key: "a_unknown", type: "mystery_type", label: "A Mystery", required: false },
      ],
    },
  ],
};

// Conditional OB/GYN section, mirroring the seed's expression exactly.
export const CONDITIONAL_DEFINITION = {
  sections: [
    {
      key: "demographics",
      label: "Demographics",
      fields: [
        { key: "legal_name", type: "text", label: "Legal Name", required: true },
        {
          key: "sex",
          type: "select",
          label: "Sex",
          required: true,
          options: ["female", "male", "intersex"],
        },
      ],
    },
    {
      key: "obgyn",
      label: "OB/GYN History",
      conditional: { field: "demographics.sex", equals: "female" },
      fields: [{ key: "lmp", type: "date", label: "Last Menstrual Period", required: true }],
    },
    {
      key: "consents",
      label: "Consents",
      fields: [
        { key: "consent_to_treat", type: "consent", label: "Consent to Treat", required: true },
      ],
    },
  ],
};

// Allergies section: nkda boolean + a coded repeating group (rxnorm).
export const ALLERGIES_DEFINITION = {
  sections: [
    {
      key: "allergies",
      label: "Allergies",
      fields: [
        { key: "nkda", type: "boolean", label: "No Known Drug Allergies", required: false },
        {
          key: "allergies",
          type: "group",
          label: "Allergies",
          required: true,
          code_binding: "allergen",
        },
      ],
    },
  ],
};

export const GROUP_DEFINITION = {
  sections: [
    {
      key: "medications",
      label: "Medications",
      fields: [
        {
          key: "medications",
          type: "group",
          label: "Current Medications",
          required: false,
          code_binding: "rxnorm",
        },
      ],
    },
  ],
};

export const CODED_DEFINITION = {
  sections: [
    {
      key: "pmh",
      label: "Problems",
      fields: [
        {
          key: "problem",
          type: "coded_search",
          label: "Condition",
          required: false,
          code_binding: "icd10",
        },
      ],
    },
  ],
};

export const ROS_DEFINITION = {
  sections: [
    {
      key: "ros",
      label: "Review of Systems",
      fields: [{ key: "ros", type: "ros_grid", label: "Review of Systems", required: false }],
    },
  ],
};
