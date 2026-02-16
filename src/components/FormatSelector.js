"use client";

import React from "react";
import { Check } from "lucide-react";

const items = [
  { key: "csv", label: "CSV", desc: "Comma-Separated", icon: "📊" },
  { key: "xlsx", label: "XLSX", desc: "Excel Workbook", icon: "📗" },
  { key: "fw.txt", label: "FW.TXT", desc: "Fixed-Width Text", icon: "📝" },
];

export default function FormatSelector({ formats, toggleFormat }) {
  return (
    <section className="col-span-12 lg:col-span-4">
      <div className="p-6 rounded-lg border border-slate-800 bg-slate-900">
        <div className="flex items-center justify-between mb-4">
          <div className="text-lg font-semibold text-slate-100">
            Output Formats
          </div>
          <div className="text-sm text-slate-400">
            {formats.length} selected
          </div>
        </div>

        <div className="space-y-2">
          {items.map((it) => {
            const active = formats.includes(it.key);
            return (
              <button
                key={it.key}
                onClick={() => toggleFormat(it.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${
                  active
                    ? "bg-emerald-900/30 border-emerald-600 shadow-lg shadow-emerald-900/20"
                    : "bg-slate-800/50 border-slate-700 hover:border-slate-600 hover:bg-slate-800"
                }`}
              >
                <div className="text-2xl">{it.icon}</div>

                <div className="flex-1 text-left">
                  <div className="font-medium text-slate-100">{it.label}</div>
                  <div className="text-xs text-slate-400">{it.desc}</div>
                </div>

                {active && (
                  <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 p-3 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-xs text-slate-400 leading-relaxed">
            💡 All files will be packaged in a single ZIP archive containing
            both seed averages and power curve data.
          </div>
        </div>
      </div>
    </section>
  );
}
