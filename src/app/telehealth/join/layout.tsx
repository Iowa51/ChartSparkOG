import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "ChartSpark Telehealth - Join Your Session",
    description:
        "Join your secure, HIPAA-compliant video session with your healthcare provider.",
    openGraph: {
        title: "ChartSpark Telehealth Session",
        description:
            "Your provider has invited you to a secure telehealth session. Click to join.",
        type: "website",
    },
    twitter: {
        card: "summary_large_image",
        title: "ChartSpark Telehealth Session",
        description:
            "Your provider has invited you to a secure telehealth session. Click to join.",
    },
    robots: { index: false, follow: false },
};

export default function TelehealthJoinLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return children;
}
