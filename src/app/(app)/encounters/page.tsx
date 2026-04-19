"use client";

import { Header } from "@/components/layout";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Plus,
  Eye,
  FileText,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  X,
  Loader2,
} from "lucide-react";
import { formatEncounterType } from "@/lib/utils/encounter-type";

const statusStyles = {
  in_progress: {
    bg: "bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
    icon: Clock,
    dot: "bg-blue-500",
    label: "In Progress",
  },
  scheduled: {
    bg: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
    icon: AlertCircle,
    dot: "bg-amber-500",
    label: "Scheduled",
  },
  completed: {
    bg: "bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    icon: CheckCircle,
    dot: "bg-emerald-500",
    label: "Completed",
  },
  cancelled: {
    bg: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
    icon: X,
    dot: "bg-gray-500",
    label: "Cancelled",
  },
};

interface Patient {
  id: string;
  first_name: string;
  last_name: string;
  mrn?: string;
  avatar_color?: string;
}

interface Provider {
  id: string;
  email: string;
  full_name?: string;
}

interface Encounter {
  id: string;
  patient_id: string;
  provider_id: string;
  encounter_type: string;
  scheduled_start: string;
  scheduled_end: string;
  actual_start?: string | null;
  actual_end?: string | null;
  chief_complaint?: string;
  status: "scheduled" | "in_progress" | "completed" | "cancelled";
  patient?: Patient;
  provider?: Provider;
}

export default function EncountersPage() {
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    total: 0,
    totalPages: 0,
    page: 1,
    limit: 50,
  });

  // Fetch encounters from API
  const fetchEncounters = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: "50",
      });

      if (statusFilter) {
        // Map display values to database values
        const statusMap: Record<string, string> = {
          Scheduled: "scheduled",
          "In Progress": "in_progress",
          Completed: "completed",
        };
        params.append(
          "status",
          statusMap[statusFilter] || statusFilter.toLowerCase().replace(" ", "_"),
        );
      }

      const response = await fetch(`/api/encounters?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch encounters");
      }

      const data = await response.json();
      setEncounters(data.encounters || []);
      setPagination(
        data.pagination || {
          total: 0,
          totalPages: 0,
          page: 1,
          limit: 50,
        },
      );
    } catch (error) {
      console.error("Error fetching encounters:", error);
      setEncounters([]);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  // Fetch on mount and when dependencies change
  useEffect(() => {
    fetchEncounters();
  }, [fetchEncounters]);

  // Client-side search filter (since API doesn't support search yet)
  const filteredEncounters = encounters.filter((e) => {
    if (!searchQuery) return true;
    const searchLower = searchQuery.toLowerCase();
    const patientName = e.patient
      ? `${e.patient.first_name} ${e.patient.last_name}`.toLowerCase()
      : "";
    return (
      patientName.includes(searchLower) ||
      e.chief_complaint?.toLowerCase().includes(searchLower) ||
      e.encounter_type.toLowerCase().includes(searchLower)
    );
  });

  const resetFilters = () => {
    setSearchQuery("");
    setStatusFilter(null);
    setPage(1);
  };

  const getPatientInitials = (patient?: Patient) => {
    if (!patient) return "??";
    return `${patient.first_name[0] || ""}${patient.last_name[0] || ""}`.toUpperCase();
  };

  const getPatientName = (patient?: Patient) => {
    if (!patient) return "Unknown Patient";
    return `${patient.first_name} ${patient.last_name}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  };

  return (
    <>
      <Header
        title="Encounters"
        description="View and manage patient encounters and visits."
        breadcrumbs={[{ label: "Dashboard", href: "/dashboard" }, { label: "Encounters" }]}
      />

      <div className="flex-1 p-6 lg:px-10 lg:py-8 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
        {/* Controls Toolbar */}
        <div className="flex flex-col gap-4 mb-6 bg-card/40 p-4 rounded-2xl border border-border/50 backdrop-blur-sm shadow-sm ring-1 ring-border/5">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
            {/* Search */}
            <div className="relative flex-1 max-w-lg text-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-muted-foreground" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by patient or concern..."
                className="block w-full pl-10 pr-3 py-2.5 border-none rounded-xl bg-card text-foreground shadow-sm ring-1 ring-inset ring-border placeholder:text-muted-foreground focus:ring-2 focus:ring-inset focus:ring-primary transition-all focus:shadow-md"
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-muted/50 rounded-xl p-1 border border-border/50">
                {["Scheduled", "In Progress", "Completed"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(statusFilter === s ? null : s)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      statusFilter === s
                        ? "bg-white dark:bg-slate-800 text-primary shadow-sm ring-1 ring-border/10"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>

              <Link
                href="/encounters/new"
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-bold shadow-md shadow-primary/20 transition-all hover:shadow-lg whitespace-nowrap"
              >
                <Plus className="h-5 w-5" />
                <span>New Encounter</span>
              </Link>
            </div>
          </div>

          {/* Clear Filters */}
          {(searchQuery || statusFilter) && (
            <div className="flex items-center justify-end pt-2 border-t border-border/50">
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors bg-muted/30 rounded-lg border border-border/50"
              >
                <X className="h-3 w-3" />
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {/* Encounters Table Card */}
        <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full whitespace-nowrap text-left">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Patient
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Chief Complaint
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-bold text-muted-foreground uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="h-8 w-8 text-primary animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading encounters...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEncounters.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <p className="text-sm text-muted-foreground">No encounters found</p>
                      {(searchQuery || statusFilter) && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Try adjusting your search or filters
                        </p>
                      )}
                    </td>
                  </tr>
                ) : (
                  filteredEncounters.map((encounter) => {
                    const statusConfig = statusStyles[encounter.status];
                    return (
                      <tr
                        key={encounter.id}
                        className="group hover:bg-accent/50 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div
                              className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold ${
                                encounter.patient?.avatar_color || "bg-primary/10 text-primary"
                              }`}
                            >
                              {getPatientInitials(encounter.patient)}
                            </div>
                            <Link
                              href={`/patients/${encounter.patient_id}`}
                              className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                            >
                              {getPatientName(encounter.patient)}
                            </Link>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-foreground">
                            {formatEncounterType(encounter.encounter_type)}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div>
                            <p className="text-sm text-foreground">
                              {formatDate(encounter.scheduled_start)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatTime(encounter.scheduled_start)}
                            </p>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-sm text-muted-foreground">
                            {encounter.chief_complaint || "Not specified"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${statusConfig.bg}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Link
                              href={`/encounters/${encounter.id}`}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                              title="View Encounter"
                            >
                              <Eye className="h-5 w-5" />
                            </Link>
                            <Link
                              href={`/notes/new?encounterId=${encounter.id}`}
                              className="p-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-lg transition-colors"
                              title="Write Note"
                            >
                              <FileText className="h-5 w-5" />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          <div className="px-6 py-4 border-t border-border flex items-center justify-between bg-card text-sm">
            <p className="text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">{filteredEncounters.length}</span> of{" "}
              <span className="font-medium text-foreground">{pagination.total}</span> encounters
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1 || loading}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-muted-foreground px-2">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= pagination.totalPages || loading}
                className="p-2 rounded-lg border border-border text-muted-foreground hover:bg-muted/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
