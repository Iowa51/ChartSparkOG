import type { Metadata } from "next";

// Patient-facing intake shell: no clinician chrome, not indexed. Mirrors the
// telehealth/join layout (the repo's existing unauthenticated patient page).
export const metadata: Metadata = {
  title: "ChartSpark - Patient Intake",
  description: "Complete your intake before your visit.",
  robots: { index: false, follow: false },
};

export default function PortalIntakeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
