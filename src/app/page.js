"use client";
import { useState, useRef, useEffect } from "react";
import {
  createZipPackage,
  processOpenFASTOutFiles,
  toCSV,
  toFWTXT,
  toXLSXBlob,
} from "@/lib/parseOutFile.js";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import MainPanel from "@/components/MainPanel";

// Constants
const INITIAL_STATE = {
  files: [],
  selectedFiles: [],
  activeFile: null,
  airDensity: 1.225,
  rotorArea: 26830,
  formats: [], // Add formats
  processing: false,
  progress: 0,
  currentStep: "",
  results: null,
  error: null,
  logs: [],
  showLogs: false,
  sidebarCollapsed: false,
  filesCollapsed: false,
  parametersCollapsed: false,
};

// Reusable Components
const Icon = ({ path, className = "w-4 h-4" }) => (
  <svg
    className={className}
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d={path}
    />
  </svg>
);

const Button = ({
  onClick,
  disabled,
  children,
  variant = "primary",
  className = "",
}) => {
  const variants = {
    primary:
      "bg-emerald-600 text-white hover:bg-emerald-500 shadow-emerald-500/50",
    secondary: "bg-blue-500 text-zinc-100 hover:bg-blue-600",
    tertiary:
      "bg-zinc-700 text-zinc-100 hover:bg-zinc-600 border border-zinc-600",
    ghost: "bg-zinc-700 text-zinc-100 hover:bg-slate-600",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
};

const StatCard = ({ label, value, unit }) => (
  <div>
    <div className="text-xs text-zinc-400 mb-1">{label}</div>
    <div className="text-sm font-medium text-zinc-100">
      {value} {unit && <span className="text-xs text-zinc-400">{unit}</span>}
    </div>
  </div>
);

// Format Selector Component
const FormatSelector = ({ formats, toggleFormat }) => {
  const items = [
    { key: "csv", label: "CSV", desc: "Comma-Separated", icon: "📊" },
    { key: "xlsx", label: "XLSX", desc: "Excel Workbook", icon: "📗" },
    { key: "fw.txt", label: "FW.TXT", desc: "Fixed-Width Text", icon: "📝" },
  ];

  return (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-zinc-100">Output Formats</h3>
        <div className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded-full text-xs font-semibold text-emerald-400">
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
                  ? "bg-emerald-500/10 border-emerald-500/30 shadow-lg shadow-emerald-900/20"
                  : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
              }`}
            >
              <div className="text-2xl">{it.icon}</div>
              <div className="flex-1 text-left">
                <div className="font-medium text-zinc-100">{it.label}</div>
                <div className="text-xs text-zinc-400">{it.desc}</div>
              </div>
              {active && (
                <div className="w-6 h-6 rounded-full bg-emerald-600 flex items-center justify-center">
                  <Icon path="M5 13l4 4L19 7" className="w-4 h-4 text-white" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <div className="text-xs text-zinc-300 leading-relaxed">
          💡 Two files will be generated for each format: seed averages and
          power curve data.
        </div>
      </div>
    </div>
  );
};

// Instruction on dashboard page
const InstructionSteps = ({ filesCount, selectedCount, formatsCount }) => {
  const steps = [
    {
      number: 1,
      title: "Upload Folder",
      description: "Click the 'Upload Folder' button to select your .out files",
      completed: filesCount > 0,
      icon: "M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12",
    },
    {
      number: 2,
      title: "Select Files",
      description: "Choose the files you want to process from the sidebar",
      completed: selectedCount > 0,
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    },
    {
      number: 3,
      title: "Choose Formats",
      description: "Select output formats for your data",
      completed: formatsCount > 0,
      icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z",
    },
    {
      number: 4,
      title: "Generate Files",
      description: "Click 'Generate Files' to start processing",
      completed: false,
      icon: "M13 10V3L4 14h7v7l9-11h-7z",
    },
  ];

  return (
    <div className="bg-gradient-to-br from-zinc-900 to-zinc-800 border border-zinc-700 rounded-xl p-8 shadow-2xl">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-zinc-100 mb-2">Get Started</h2>
        <p className="text-zinc-400">
          Follow these steps to generate your power curve
        </p>
      </div>

      <div className="space-y-6">
        {steps.map((step, index) => (
          <div
            key={step.number}
            className={`relative flex items-start space-x-4 p-4 rounded-lg transition-all ${
              step.completed
                ? "bg-zinc-800 border border-zinc-600"
                : "bg-zinc-800/50 border border-zinc-700"
            }`}
          >
            {/* Connecting Line */}
            {index < steps.length - 1 && (
              <div
                className={`absolute left-8 top-16 w-0.5 h-8 ${
                  step.completed ? "bg-zinc-600" : "bg-zinc-700"
                }`}
              />
            )}

            {/* Step Number/Icon */}
            <div
              className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                step.completed
                  ? "bg-emerald-500 text-white"
                  : "bg-zinc-700 text-zinc-400"
              }`}
            >
              {step.completed ? (
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              ) : (
                step.number
              )}
            </div>

            {/* Step Content */}
            <div className="flex-1 pt-1">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  step.completed ? "text-emerald-400" : "text-zinc-300"
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm text-zinc-400">{step.description}</p>

              {/* Progress indicators */}
              {step.number === 1 && filesCount > 0 && (
                <div className="mt-2 text-xs text-emerald-400 font-medium">
                  ✓ {filesCount} files loaded
                </div>
              )}
              {step.number === 2 && selectedCount > 0 && (
                <div className="mt-2 text-xs text-emerald-400 font-medium">
                  ✓ {selectedCount} files selected
                </div>
              )}
              {step.number === 3 && formatsCount > 0 && (
                <div className="mt-2 text-xs text-emerald-400 font-medium">
                  ✓ {formatsCount} format{formatsCount !== 1 ? "s" : ""}{" "}
                  selected
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const [state, setState] = useState(INITIAL_STATE);
  const logsEndRef = useRef(null);

  const updateState = (updates) =>
    setState((prev) => ({ ...prev, ...updates }));

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  useEffect(() => {
    if (state.results && state.showLogs) {
      const timer = setTimeout(() => updateState({ showLogs: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.results, state.showLogs]);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    updateState({ logs: [...state.logs, { message, type, timestamp }] });
  };

  const handleFolderUpload = (e) => {
    const outFiles = Array.from(e.target.files).filter((file) =>
      file.name.toLowerCase().endsWith(".out"),
    );

    updateState({
      files: outFiles,
      selectedFiles: [],
      activeFile: null,
      results: null,
      error: null,
      logs: [],
      progress: 0,
      currentStep: "",
    });

    addLog(`Loaded ${outFiles.length} .out files from folder`, "success");
  };

  const toggleFileSelection = (fileName) => {
    updateState({
      selectedFiles: state.selectedFiles.includes(fileName)
        ? state.selectedFiles.filter((f) => f !== fileName)
        : [...state.selectedFiles, fileName],
    });
  };

  const toggleFormat = (format) => {
    updateState({
      formats: state.formats.includes(format)
        ? state.formats.filter((f) => f !== format)
        : [...state.formats, format],
    });
  };

  const handleProcessFiles = async () => {
    if (state.selectedFiles.length === 0) {
      alert("Please select files to process");
      return;
    }
    if (state.formats.length === 0) {
      alert("Please select at least one output format");
      return;
    }

    updateState({
      processing: true,
      error: null,
      results: null,
      logs: [],
      progress: 0,
      showLogs: true,
      sidebarCollapsed: true,
    });

    try {
      addLog(
        `Starting processing of ${state.selectedFiles.length} files...`,
        "info",
      );
      updateState({ currentStep: "Reading files...", progress: 5 });

      // Read file contents (same as you had)
      const filesWithContent = await Promise.all(
        state.files
          .filter((file) => state.selectedFiles.includes(file.name))
          .map(async (file) => ({
            name: file.name,
            content: await file.text(),
          })),
      );

      addLog(`Air Density: ${state.airDensity} kg/m³`, "info");
      addLog(`Rotor Area: ${state.rotorArea} m²`, "info");
      addLog(`Formats: ${state.formats.join(", ").toUpperCase()}`, "info");
      updateState({ progress: 15, currentStep: "Processing files..." });

      // Process in-browser (same logic)
      const { individualData, powerCurveData, baseName } =
        processOpenFASTOutFiles(
          filesWithContent,
          Number(state.airDensity),
          Number(state.rotorArea),
        );

      updateState({ progress: 50, currentStep: "Generating format files..." });

      // For each requested format, generate two files (individual + powerCurve)
      const resultsByFormat = {};

      for (const fmt of state.formats) {
        let individualBlob, powerBlob, individualName, powerName, contentType;

        if (fmt === "csv") {
          const indContent = toCSV(individualData);
          const pcContent = toCSV(powerCurveData);
          individualBlob = new Blob([indContent], { type: "text/csv" });
          powerBlob = new Blob([pcContent], { type: "text/csv" });
          contentType = "text/csv";
          individualName = `${baseName.individual}.csv`;
          powerName = `${baseName.powerCurve}.csv`;
        } else if (fmt === "fw.txt") {
          const indContent = toFWTXT(individualData);
          const pcContent = toFWTXT(powerCurveData);
          individualBlob = new Blob([indContent], { type: "text/plain" });
          powerBlob = new Blob([pcContent], { type: "text/plain" });
          contentType = "text/plain";
          individualName = `${baseName.individual}.fw.txt`;
          powerName = `${baseName.powerCurve}.fw.txt`;
        } else if (fmt === "xlsx") {
          // create XLSX blobs (async)
          individualBlob = await toXLSXBlob(individualData, "Seed Averages");
          powerBlob = await toXLSXBlob(powerCurveData, "Power Curve");
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          individualName = `${baseName.individual}.xlsx`;
          powerName = `${baseName.powerCurve}.xlsx`;
        } else {
          throw new Error("Unsupported format: " + fmt);
        }

        resultsByFormat[fmt] = {
          individual: {
            blob: individualBlob,
            filename: individualName,
            type: contentType,
          },
          powerCurve: {
            blob: powerBlob,
            filename: powerName,
            type: contentType,
          },
        };

        addLog(
          `✓ Generated ${fmt.toUpperCase()} (seed avg + power curve)`,
          "success",
        );
      }

      updateState({ progress: 80, currentStep: "Creating ZIP..." });

      // Create ZIP with JSZip
      const zipBlob = await createZipPackage(resultsByFormat);

      // Save the ZIP (suggest name includes timestamp and airDensity)
      const now = new Date();
      const zipName = `${baseName.individual}_export_${now.toISOString().replace(/[:.]/g, "-")}.zip`;
      const zipUrl = URL.createObjectURL(zipBlob);

      // update state results so UI can allow downloads per-file too
      updateState({
        results: {
          allResults: resultsByFormat,
          zip: { blob: zipBlob, url: zipUrl, filename: zipName },
          processedAirDensity: state.airDensity,
          processedRotorArea: state.rotorArea,
          processedFormats: state.formats,
        },
        progress: 100,
        currentStep: "Complete!",
      });

      addLog("Processing complete! ZIP ready for download.", "success");
    } catch (err) {
      updateState({ error: err.message, progress: 0, currentStep: "" });
      addLog(`Error: ${err.message}`, "error");
      console.error("Processing error:", err);
    } finally {
      setTimeout(() => updateState({ processing: false }), 500);
    }
  };

  // // Helper function to create blob from different data types
  // const createBlobFromData = (content, type, format) => {
  //   if (format === "xlsx") {
  //     // XLSX is base64 encoded
  //     const binaryString = atob(content);
  //     const bytes = new Uint8Array(binaryString.length);
  //     for (let i = 0; i < binaryString.length; i++) {
  //       bytes[i] = binaryString.charCodeAt(i);
  //     }
  //     return new Blob([bytes], { type });
  //   } else {
  //     // CSV and FW.TXT are plain text
  //     return new Blob([content], { type });
  //   }
  // };

  // const downloadZip = () => {
  //   const zip = state.results?.zip;
  //   if (!zip) return;
  //   const a = document.createElement("a");
  //   a.href = zip.url;
  //   a.download = zip.filename;
  //   a.click();
  //   URL.revokeObjectURL(zip.url);
  //   addLog(`Downloaded ${zip.filename}`, "success");
  // };

  const downloadFile = (format, fileType) => {
    const fileData = state.results.allResults[format][fileType];
    addLog(`Downloading ${fileData.filename}...`, "info");

    const url = window.URL.createObjectURL(fileData.blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileData.filename;
    a.click();
    window.URL.revokeObjectURL(url);

    addLog(`✓ Downloaded ${fileData.filename}`, "success");
  };

  const downloadAllFiles = () => {
    addLog("Downloading all files...", "info");
    let delay = 0;

    state.formats.forEach((format) => {
      setTimeout(() => {
        downloadFile(format, "individual");
      }, delay);
      delay += 300;

      setTimeout(() => {
        downloadFile(format, "powerCurve");
      }, delay);
      delay += 300;
    });
  };

  const renderFileItem = (file, index) => {
    const isSelected = state.selectedFiles.includes(file.name);
    const isActive = state.activeFile?.name === file.name;

    return (
      <div
        key={index}
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-all ${
          isActive
            ? "bg-zinc-800 border-zinc-700 shadow-lg ring-2 ring-emerald-500/50"
            : isSelected
              ? "bg-emerald-500/10 border-emerald-500/30 shadow-md"
              : "bg-zinc-800/50 border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800"
        }`}
      >
        <input
          type="checkbox"
          checked={isSelected}
          onChange={() => toggleFileSelection(file.name)}
          className="w-4 h-4 text-emerald-500 bg-zinc-700 border-zinc-600 rounded focus:ring-emerald-500 focus:ring-offset-0 focus:ring-offset-zinc-900"
        />

        <div
          className="flex-1 truncate text-sm"
          onClick={() => updateState({ activeFile: file })}
          title={file.name}
        >
          <span
            className={
              isSelected ? "text-emerald-300 font-medium" : "text-zinc-300"
            }
          >
            {file.name}
          </span>
        </div>
      </div>
    );
  };

  const renderConfigBanner = () => (
    <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="p-2 bg-zinc-700/50 rounded-lg">
          <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-zinc-200 mb-3">
            Processing Configuration
          </h3>

          <div className="grid grid-cols-3 gap-4 mb-3">
            <StatCard
              label="Air Density"
              value={state.results.processedAirDensity}
              unit="kg/m³"
            />
            <StatCard
              label="Rotor Area"
              value={state.results.processedRotorArea}
              unit="m²"
            />
            <StatCard
              label="Formats"
              value={state.results.processedFormats.length}
              unit={`format${state.results.processedFormats.length !== 1 ? "s" : ""}`}
            />
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400 pt-3 border-t border-zinc-700/50">
            <span>{state.selectedFiles.length} files processed</span>
            <span>
              Formats: {state.results.processedFormats.join(", ").toUpperCase()}
            </span>
            <span>Total files: {state.formats.length * 2}</span>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col overflow-hidden font-sans antialiased">
      {/* Header */}
      <Header
        selectedCount={state.selectedFiles.length}
        totalCount={state.files.length}
        processing={state.processing}
        progress={state.progress}
        currentStep={state.currentStep}
        formatsCount={state.formats.length}
        onProcessFiles={handleProcessFiles}
        onFolderUpload={handleFolderUpload}
        Icon={Icon}
        Button={Button}
      />

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          files={state.files}
          selectedFiles={state.selectedFiles}
          sidebarCollapsed={state.sidebarCollapsed}
          filesCollapsed={state.filesCollapsed}
          onToggleSidebar={() =>
            updateState({ sidebarCollapsed: !state.sidebarCollapsed })
          }
          onToggleFiles={() =>
            updateState({ filesCollapsed: !state.filesCollapsed })
          }
          onSelectAllToggle={() => {
            const allSelected =
              state.selectedFiles.length === state.files.length;
            updateState({
              selectedFiles: allSelected ? [] : state.files.map((f) => f.name),
            });
            addLog(
              allSelected
                ? "Deselected all files"
                : `Selected all ${state.files.length} files`,
              "info",
            );
          }}
          renderFileItem={renderFileItem}
          Icon={Icon}
          Button={Button}
        />

        {/* Main Panel */}
        <MainPanel
          state={state}
          toggleFormat={toggleFormat}
          downloadAllFiles={downloadAllFiles}
          downloadFile={downloadFile}
          renderConfigBanner={renderConfigBanner}
          updateState={updateState}
          logsEndRef={logsEndRef}
          Icon={Icon}
          Button={Button}
          InstructionSteps={InstructionSteps}
          FormatSelector={FormatSelector}
        />
      </div>

      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap");

        * {
          font-family:
            "Inter",
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            "Roboto",
            "Helvetica Neue",
            Arial,
            sans-serif;
        }

        @keyframes shimmer {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        ::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          border-radius: 6px;
        }

        ::-webkit-scrollbar-thumb {
          background: linear-gradient(
            180deg,
            rgba(71, 85, 105, 0.6) 0%,
            rgba(51, 65, 85, 0.6) 100%
          );
          border-radius: 6px;
          border: 2px solid rgba(15, 23, 42, 0.5);
        }

        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(
            180deg,
            rgba(71, 85, 105, 0.8) 0%,
            rgba(51, 65, 85, 0.8) 100%
          );
        }

        ::-webkit-scrollbar-thumb:active {
          background: linear-gradient(
            180deg,
            rgba(100, 116, 139, 0.9) 0%,
            rgba(71, 85, 105, 0.9) 100%
          );
        }

        * {
          scrollbar-width: thin;
          scrollbar-color: rgba(71, 85, 105, 0.6) rgba(15, 23, 42, 0.5);
        }
      `}</style>
    </div>
  );
}
