"use client";

import React from "react";
import { CSTopNavbar } from "./CSTopNavbar";

interface CSShellProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export function CSShell({ sidebar, children }: CSShellProps) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--cs-page-bg)" }}>
      <CSTopNavbar />
      <div className="flex-1 flex">
        <aside
          className="hidden lg:flex flex-col shrink-0 border-r"
          style={{
            width: "var(--cs-sidebar-width)",
            background: "var(--cs-sidebar-bg)",
            borderColor: "var(--cs-border)",
          }}
        >
          {sidebar}
        </aside>
        <main className="flex-1 flex flex-col overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
