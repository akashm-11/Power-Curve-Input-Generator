"use client";
import { useState, useRef, useEffect } from "react";

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

const TableHeader = ({ children }) => (
  <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">
    {children}
  </th>
);

const TableCell = ({ children, bold = false }) => (
  <td
    className={`px-6 py-4 text-zinc-300 ${bold ? "font-medium text-zinc-100" : ""}`}
  >
    {children}
  </td>
);

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

      <div className="mt-8 p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
        <div className="flex items-start space-x-3">
          <svg
            className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <h4 className="text-sm font-semibold text-blue-400 mb-1">
              Pro Tip
            </h4>
            <p className="text-xs text-zinc-400">
              You can use "Select All" button in the sidebar to quickly select
              all uploaded files, or choose specific files for targeted
              analysis.
            </p>
          </div>
        </div>
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
      updateState({ currentStep: "Preparing files...", progress: 5 });

      // Read file contents
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

      updateState({
        progress: 15,
        currentStep: "Processing ...",
      });

      // SINGLE API CALL for all formats
      const body = {
        files: filesWithContent,
        formats: state.formats, // Send all formats at once
        airDensity: state.airDensity,
        rotorArea: state.rotorArea,
      };

      const response = await fetch("/api/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      updateState({ progress: 60, currentStep: "Generating files..." });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Processing failed");
      }

      const results = await response.json();

      updateState({ progress: 80, currentStep: "Preparing downloads..." });

      // Convert response data to blobs
      const allResults = {};

      for (const format of state.formats) {
        const formatData = results[format];

        // Convert individual file
        const individualBlob = createBlobFromData(
          formatData.individual.content,
          formatData.individual.type,
          format,
        );

        // Convert power curve file
        const powerCurveBlob = createBlobFromData(
          formatData.powerCurve.content,
          formatData.powerCurve.type,
          format,
        );

        allResults[format] = {
          individual: {
            blob: individualBlob,
            filename: formatData.individual.filename,
          },
          powerCurve: {
            blob: powerCurveBlob,
            filename: formatData.powerCurve.filename,
          },
        };

        addLog(
          `✓ Generated ${format.toUpperCase()} files (seed averages + power curve)`,
          "success",
        );
      }

      updateState({
        results: {
          allResults,
          processedAirDensity: state.airDensity,
          processedRotorArea: state.rotorArea,
          processedFormats: state.formats,
        },
        progress: 100,
        currentStep: "Complete!",
      });

      addLog(`Processing complete! Results ready for download.`, "success");
      addLog(`Total files generated: ${state.formats.length * 2}`, "success");
    } catch (err) {
      updateState({ error: err.message, progress: 0, currentStep: "" });
      addLog(`Error: ${err.message}`, "error");
      console.error("Processing error:", err);
    } finally {
      setTimeout(() => updateState({ processing: false }), 500);
    }
  };

  // Helper function to create blob from different data types
  const createBlobFromData = (content, type, format) => {
    if (format === "xlsx") {
      // XLSX is base64 encoded
      const binaryString = atob(content);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      return new Blob([bytes], { type });
    } else {
      // CSV and FW.TXT are plain text
      return new Blob([content], { type });
    }
  };

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
      <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 shadow-2xl">
        <div className="px-4 py-1">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
              Power Curve Input Generator
            </h1>

            <div className="flex items-center gap-4">
              <div className="bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Selected:</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {state.selectedFiles.length}
                  </span>
                  <span className="text-xs text-zinc-500">
                    / {state.files.length}
                  </span>
                </div>
              </div>

              <label className="cursor-pointer">
                <input
                  type="file"
                  webkitdirectory="true"
                  directory=""
                  multiple
                  onChange={handleFolderUpload}
                  className="hidden"
                />
                <span className="inline-flex items-center gap-2 bg-blue-500 text-zinc-100 px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all shadow-lg">
                  <Icon path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  Upload Folder
                </span>
              </label>

              <Button
                onClick={handleProcessFiles}
                disabled={
                  state.processing ||
                  state.selectedFiles.length === 0 ||
                  state.formats.length === 0
                }
                className="px-6 py-3 font-semibold"
              >
                <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />
                {state.processing ? "Processing..." : "Generate Files"}
              </Button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {state.processing && (
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">
                {state.currentStep}
              </span>
              <span className="text-sm font-semibold text-emerald-400">
                {Math.round(state.progress)}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out shadow-lg shadow-emerald-500/50 relative overflow-hidden"
                style={{ width: `${state.progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
            state.sidebarCollapsed ? "w-16" : "w-85"
          }`}
        >
          <div className="px-4 py-1 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            {!state.sidebarCollapsed && (
              <h2 className="text-sm text-zinc-200 uppercase tracking-wide">
                File Manager
              </h2>
            )}
            <button
              onClick={() =>
                updateState({ sidebarCollapsed: !state.sidebarCollapsed })
              }
              className="p-2 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
            >
              <Icon
                path="M11 19l-7-7 7-7m8 14l-7-7 7-7"
                className={`w-5 h-5 transition-transform ${state.sidebarCollapsed ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {!state.sidebarCollapsed ? (
            <div
              className={`flex flex-col border-b border-zinc-800 transition-all duration-300 ${
                state.filesCollapsed ? "flex-shrink-0" : "flex-1 min-h-0"
              }`}
            >
              <div className="px-4 py-1 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30 flex-shrink-0">
                <h3 className="text-sm text-zinc-200 uppercase tracking-wide">
                  Output Files{" "}
                  {state.files.length > 0 && `(${state.files.length})`}
                </h3>
                <button
                  onClick={() =>
                    updateState({ filesCollapsed: !state.filesCollapsed })
                  }
                  className="p-1.5 hover:bg-zinc-700 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
                >
                  <Icon
                    path="M19 9l-7 7-7-7"
                    className={`transition-transform ${state.filesCollapsed ? "rotate-180" : ""}`}
                  />
                </button>
              </div>

              {!state.filesCollapsed && (
                <>
                  {state.files.length > 0 && (
                    <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                      <Button
                        onClick={() => {
                          const allSelected =
                            state.selectedFiles.length === state.files.length;
                          updateState({
                            selectedFiles: allSelected
                              ? []
                              : state.files.map((f) => f.name),
                          });
                          addLog(
                            allSelected
                              ? "Deselected all files"
                              : `Selected all ${state.files.length} files`,
                            "info",
                          );
                        }}
                        variant="ghost"
                        className="w-full text-xs"
                      >
                        {state.selectedFiles.length === state.files.length
                          ? "Deselect All"
                          : "Select All"}
                      </Button>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                    {state.files.length === 0 ? (
                      <div className="text-center py-12">
                        <Icon
                          path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                          className="w-12 h-12 mx-auto text-zinc-700 mb-3"
                        />
                        <p className="text-xs text-zinc-400 font-medium">
                          No folder selected
                        </p>
                        <p className="text-xs text-zinc-500 mt-1">
                          Upload to get started
                        </p>
                      </div>
                    ) : (
                      state.files.map(renderFileItem)
                    )}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <Icon
                  path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  className="w-8 h-8 mx-auto text-zinc-600 mb-2"
                />
                <p className="text-xs text-zinc-500 transform rotate-90 whitespace-nowrap mt-4">
                  {state.files.length} files
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Panel */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          <div className="flex-1 overflow-y-auto p-8">
            {state.error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <svg
                    className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <div>
                    <div className="font-semibold text-red-300 mb-1">
                      Processing Error
                    </div>
                    <div className="text-sm text-red-400">{state.error}</div>
                  </div>
                </div>
              </div>
            )}

            {!state.results && !state.processing && (
              <>
                <InstructionSteps
                  filesCount={state.files.length}
                  selectedCount={state.selectedFiles.length}
                  formatsCount={state.formats.length}
                />

                {/* Parameters and Format Selector */}
                {state.files.length > 0 && (
                  <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Parameters */}
                    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm">
                      <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                        Parameters
                      </h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Air Density (kg/m³)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            min="0.5"
                            max="2.0"
                            value={state.airDensity}
                            onChange={(e) =>
                              updateState({
                                airDensity: Number(e.target.value),
                              })
                            }
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-zinc-300 mb-2">
                            Rotor Area (m²)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="1"
                            max="50000"
                            value={state.rotorArea}
                            onChange={(e) =>
                              updateState({ rotorArea: Number(e.target.value) })
                            }
                            className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-700 rounded-lg text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                          <p className="text-xs text-zinc-500 mt-1">
                            NREL 5MW: 28630
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Format Selector */}
                    <FormatSelector
                      formats={state.formats}
                      toggleFormat={toggleFormat}
                    />
                  </div>
                )}
              </>
            )}

            {state.results && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
                      <svg
                        className="w-7 h-7 text-emerald-400"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      Processing Complete
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">
                      {state.formats.length * 2} files ready for download
                    </p>
                  </div>

                  <Button onClick={downloadAllFiles}>
                    <Icon path="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    Download All Files
                  </Button>
                </div>

                {renderConfigBanner()}

                {/* Download Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {state.formats.map((format) => (
                    <div
                      key={format}
                      className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm"
                    >
                      <h3 className="text-lg font-semibold text-zinc-100 mb-4 uppercase">
                        {format}
                      </h3>
                      <div className="space-y-3">
                        <Button
                          onClick={() => downloadFile(format, "individual")}
                          variant="secondary"
                          className="w-full justify-center"
                        >
                          <Icon path="M12 10v6m0 0l-3-3m3 3l3-3" />
                          Seed Averages
                        </Button>
                        <Button
                          onClick={() => downloadFile(format, "powerCurve")}
                          variant="secondary"
                          className="w-full justify-center"
                        >
                          <Icon path="M12 10v6m0 0l-3-3m3 3l3-3" />
                          Power Curve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Logs Panel */}
          {state.logs.length > 0 && (
            <div
              className={`border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-xl flex flex-col transition-all duration-300 ${
                state.showLogs ? "h-64" : "h-12"
              } flex-shrink-0`}
            >
              <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                  Processing Logs {!state.showLogs && `(${state.logs.length})`}
                </h3>
                <div className="flex items-center gap-2">
                  {state.showLogs && (
                    <button
                      onClick={() => updateState({ logs: [] })}
                      className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-all font-medium shadow-lg"
                    >
                      Clear Logs
                    </button>
                  )}
                  <button
                    onClick={() => updateState({ showLogs: !state.showLogs })}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
                  >
                    <Icon
                      path="M19 9l-7 7-7-7"
                      className={`transition-transform ${state.showLogs ? "" : "rotate-180"}`}
                    />
                  </button>
                </div>
              </div>

              {state.showLogs && (
                <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
                  {state.logs.map((log, index) => (
                    <div
                      key={index}
                      className={`flex gap-3 px-3 py-2 rounded-lg ${
                        log.type === "error"
                          ? "bg-red-500/10 text-red-300 border border-red-500/20"
                          : log.type === "success"
                            ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                            : "bg-zinc-800/50 text-zinc-300 border border-zinc-700/50"
                      }`}
                    >
                      <span className="text-zinc-500">[{log.timestamp}]</span>
                      <span className="flex-1">{log.message}</span>
                    </div>
                  ))}
                  <div ref={logsEndRef} />
                </div>
              )}
            </div>
          )}
        </main>
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
