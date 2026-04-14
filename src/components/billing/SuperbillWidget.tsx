"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  CheckCircle2,
  ShieldAlert,
  Info,
  DollarSign,
  FileSpreadsheet,
  ArrowRight,
} from "lucide-react";

export interface ServiceLine {
  id: string;
  cptCode: string;
  modifiers: string[];
  diagnosisPointers: number[];
  charge: number;
}

interface SuperbillWidgetProps {
  initialCptCode?: string;
  initialIcd10Codes?: string[];
}

export function SuperbillWidget({ initialCptCode, initialIcd10Codes }: SuperbillWidgetProps = {}) {
  const [lines, setLines] = useState<ServiceLine[]>([
    {
      id: "1",
      cptCode: initialCptCode ?? "99214",
      modifiers: [],
      diagnosisPointers: [1],
      charge: 15000,
    },
  ]);
  const [icd10Codes] = useState<string[]>(initialIcd10Codes ?? []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const addLine = () => {
    setLines([
      ...lines,
      {
        id: Math.random().toString(36).substr(2, 9),
        cptCode: "",
        modifiers: [],
        diagnosisPointers: [1],
        charge: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines(lines.filter((l) => l.id !== id));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsSubmitting(false);
    setSubmitted(true);
  };

  const totalCharge = lines.reduce((acc, line) => acc + line.charge, 0) / 100;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden ring-1 ring-border/5">
      <div className="px-6 py-4 border-b border-border bg-slate-50 dark:bg-slate-900/50 flex items-center justify-between">
        <h3 className="text-sm font-black text-foreground uppercase tracking-widest flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Encounter Superbill
        </h3>
        <span className="text-[10px] font-black text-muted-foreground bg-muted p-1 rounded border border-border">
          EDI 837P READY
        </span>
      </div>

      <div className="p-6 space-y-6">
        {/* Service Lines Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-24">
                  CPT Code
                </th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-32">
                  Modifiers
                </th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground w-20">
                  Diag
                </th>
                <th className="pb-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-right w-24">
                  Charge
                </th>
                <th className="pb-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lines.map((line) => (
                <tr key={line.id} className="group transition-colors hover:bg-muted/5">
                  <td className="py-4">
                    <input
                      value={line.cptCode}
                      placeholder="e.g. 99214"
                      className="w-full bg-transparent border-none text-sm font-bold text-foreground focus:ring-0 p-0 placeholder:text-muted-foreground/50"
                      onChange={(e) => {
                        const newLines = [...lines];
                        const idx = newLines.findIndex((l) => l.id === line.id);
                        newLines[idx].cptCode = e.target.value;
                        setLines(newLines);
                      }}
                    />
                  </td>
                  <td className="py-4">
                    <div className="flex gap-1">
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-primary/5 text-primary border border-primary/10 rounded cursor-pointer">
                        + Mod
                      </span>
                    </div>
                  </td>
                  <td className="py-4">
                    <span className="text-xs font-bold text-foreground">1, 2</span>
                  </td>
                  <td className="py-4 text-right">
                    <span className="text-sm font-bold text-foreground">
                      ${(line.charge / 100).toFixed(2)}
                    </span>
                  </td>
                  <td className="py-4 text-right">
                    <button
                      onClick={() => removeLine(line.id)}
                      className="p-1.5 text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {icd10Codes.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              ICD-10 Codes
            </p>
            <div className="flex flex-wrap gap-2">
              {icd10Codes.map((code) => (
                <span
                  key={code}
                  className="px-2.5 py-1 bg-primary/5 text-primary border border-primary/10 text-xs font-bold rounded-lg"
                >
                  {code}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={addLine}
          className="w-full py-3 bg-muted/30 border-2 border-dashed border-border rounded-xl text-xs font-bold text-muted-foreground hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Service Line
        </button>

        {/* Totals & Submission */}
        <div className="pt-6 border-t border-border space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-muted-foreground">Total Claim Charge</span>
            <span className="text-2xl font-black text-foreground">${totalCharge.toFixed(2)}</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isSubmitting || submitted}
            className={`w-full py-4 rounded-2xl flex items-center justify-center gap-2 text-sm font-black uppercase tracking-widest transition-all ${
              submitted
                ? "bg-emerald-500 text-white shadow-emerald-500/20"
                : "bg-primary text-white shadow-primary/20 hover:scale-[1.02] active:scale-95"
            } shadow-xl`}
          >
            {isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Scrubbing & Submitting...
              </>
            ) : submitted ? (
              <>
                <CheckCircle2 className="h-5 w-5" />
                Submitted to Billing
              </>
            ) : (
              <>
                Submit to Billing
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1" />
              </>
            )}
          </button>
        </div>

        {/* Compliance Banner */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl flex gap-3">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
              Final Compliance Check
            </p>
            <p className="text-[10px] text-amber-600/80 dark:text-amber-500/80 mt-1 leading-relaxed">
              By submitting, you attest that these services were medically necessary and documented
              in the clinical note. Claim will be scrubbed against NCCI edits before SFTP
              transmission.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
