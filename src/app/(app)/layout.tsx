import { Sidebar } from "@/components/layout";

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen flex bg-background">
            <Sidebar />
            <main className="flex-1 flex flex-col min-h-screen overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
