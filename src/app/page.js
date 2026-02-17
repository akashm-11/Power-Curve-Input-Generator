"use client";
import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  FileProcessor,
  toCSV,
  toFWTXT,
  toXLSXBlob,
  createZipPackage,
} from "@/lib/optimizedProcessing";
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
  formats: [],
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
  currentFile: "",
  filesProcessed: 0,
};

const ITEM_HEIGHT = 48; // Height of each file item in pixels

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

// Instruction Steps Component
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
            {index < steps.length - 1 && (
              <div
                className={`absolute left-8 top-16 w-0.5 h-8 ${
                  step.completed ? "bg-zinc-600" : "bg-zinc-700"
                }`}
              />
            )}

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

            <div className="flex-1 pt-1">
              <h3
                className={`text-lg font-semibold mb-1 ${
                  step.completed ? "text-emerald-400" : "text-zinc-300"
                }`}
              >
                {step.title}
              </h3>
              <p className="text-sm text-zinc-400">{step.description}</p>

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
  const [scrollTop, setScrollTop] = useState(0);
  const logsEndRef = useRef(null);
  const fileProcessorRef = useRef(null);
  const sidebarScrollRef = useRef(null);

  const updateState = useCallback((updates) => {
    setState((prev) => ({ ...prev, ...updates }));
  }, []);

  // Initialize file processor
  useEffect(() => {
    fileProcessorRef.current = new FileProcessor();

    return () => {
      if (fileProcessorRef.current) {
        fileProcessorRef.current.terminate();
      }
    };
  }, []);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.logs]);

  useEffect(() => {
    if (state.results && state.showLogs) {
      const timer = setTimeout(() => updateState({ showLogs: false }), 2000);
      return () => clearTimeout(timer);
    }
  }, [state.results, state.showLogs, updateState]);

  const addLog = useCallback((message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setState((prev) => ({
      ...prev,
      logs: [...prev.logs, { message, type, timestamp }],
    }));
  }, []);

  const handleFolderUpload = useCallback(
    (e) => {
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
    },
    [updateState, addLog],
  );

  const toggleFileSelection = useCallback((fileName) => {
    setState((prev) => ({
      ...prev,
      selectedFiles: prev.selectedFiles.includes(fileName)
        ? prev.selectedFiles.filter((f) => f !== fileName)
        : [...prev.selectedFiles, fileName],
    }));
  }, []);

  const toggleFormat = useCallback((format) => {
    setState((prev) => ({
      ...prev,
      formats: prev.formats.includes(format)
        ? prev.formats.filter((f) => f !== format)
        : [...prev.formats, format],
    }));
  }, []);

  // Progress handler - batched UI updates to prevent lag
  const handleProgress = useCallback(
    ({ progress, message, currentFile, filesProcessed }) => {
      // Use requestIdleCallback to batch UI updates (prevents blocking)
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(() => {
          updateState({
            progress: Math.round(progress),
            currentStep: message,
            currentFile: currentFile || state.currentFile,
            filesProcessed: filesProcessed || state.filesProcessed,
          });
        });
      } else {
        updateState({
          progress: Math.round(progress),
          currentStep: message,
          currentFile: currentFile || state.currentFile,
          filesProcessed: filesProcessed || state.filesProcessed,
        });
      }
    },
    [updateState],
  );

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
      addLog(`Air Density: ${state.airDensity} kg/m³`, "info");
      addLog(`Rotor Area: ${state.rotorArea} m²`, "info");
      addLog(`Formats: ${state.formats.join(", ").toUpperCase()}`, "info");

      const filesToProcess = state.files.filter((file) =>
        state.selectedFiles.includes(file.name),
      );

      // Process files using Web Worker
      const { results, powerCurve } =
        await fileProcessorRef.current.processBatches(
          filesToProcess,
          Number(state.airDensity),
          Number(state.rotorArea),
          handleProgress,
        );

      addLog(`Processed ${results.length} file records`, "success");
      addLog(`Generated ${powerCurve.length} power curve points`, "success");

      // ✅ Calculate RotorArea stats (similar to pcs-ui-siddhi)
      const fileMeanAreas = results
        .map((r) => Number(r._rotorArea))
        .filter((val) => !isNaN(val) && val > 0);

      const meanRotorArea =
        fileMeanAreas.length > 0
          ? fileMeanAreas.reduce((a, b) => a + b, 0) / fileMeanAreas.length
          : 0;

      const maxRotorArea =
        fileMeanAreas.length > 0 ? Math.max(...fileMeanAreas) : 0;

      handleProgress({ progress: 96, message: "Generating output files..." });

      // ✅ Sort data by wind speed before generating files
      const sortByWindSpeed = (data) => {
        return [...data].sort(
          (a, b) =>
            parseFloat(a["WindSpeed(ms)"] ?? 0) -
            parseFloat(b["WindSpeed(ms)"] ?? 0),
        );
      };

      const sortedIndividualData = sortByWindSpeed(results);
      const sortedPowerCurveData = sortByWindSpeed(powerCurve);

      // Generate format files
      const resultsByFormat = {};
      const baseName = {
        individual: `final_individual_${Date.now()}`,
        powerCurve: `final_powercurve_${Date.now()}`,
      };

      for (const fmt of state.formats) {
        let individualBlob, powerBlob, individualName, powerName, contentType;

        if (fmt === "csv") {
          const indContent = toCSV(sortedIndividualData);
          const pcContent = toCSV(sortedPowerCurveData);
          individualBlob = new Blob([indContent], { type: "text/csv" });
          powerBlob = new Blob([pcContent], { type: "text/csv" });
          contentType = "text/csv";
          individualName = `${baseName.individual}.csv`;
          powerName = `${baseName.powerCurve}.csv`;
        } else if (fmt === "fw.txt") {
          const indContent = toFWTXT(sortedIndividualData);
          const pcContent = toFWTXT(sortedPowerCurveData);
          individualBlob = new Blob([indContent], { type: "text/plain" });
          powerBlob = new Blob([pcContent], { type: "text/plain" });
          contentType = "text/plain";
          individualName = `${baseName.individual}.fw.txt`;
          powerName = `${baseName.powerCurve}.fw.txt`;
        } else if (fmt === "xlsx") {
          individualBlob = await toXLSXBlob(
            sortedIndividualData,
            "Seed Averages",
          );
          powerBlob = await toXLSXBlob(sortedPowerCurveData, "Power Curve");
          contentType =
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
          individualName = `${baseName.individual}.xlsx`;
          powerName = `${baseName.powerCurve}.xlsx`;
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

        addLog(`✓ Generated ${fmt.toUpperCase()} files`, "success");
      }

      handleProgress({ progress: 98, message: "Creating ZIP package..." });

      const zipBlob = await createZipPackage(resultsByFormat);
      const now = new Date();
      const zipName = `${baseName.individual}_export_${now.toISOString().replace(/[:.]/g, "-")}.zip`;
      const zipUrl = URL.createObjectURL(zipBlob);

      updateState({
        results: {
          allResults: resultsByFormat,
          zip: { blob: zipBlob, url: zipUrl, filename: zipName },
          processedAirDensity: state.airDensity,
          processedRotorArea: state.rotorArea,
          processedFormats: state.formats,
          meanRotorArea: meanRotorArea,
          maxRotorArea: maxRotorArea,
        },
        progress: 100,
        currentStep: "Complete!",
      });

      addLog("Processing complete! All files ready for download.", "success");
    } catch (err) {
      updateState({ error: err.message, progress: 0, currentStep: "" });
      addLog(`Error: ${err.message}`, "error");
      console.error("Processing error:", err);
    } finally {
      setTimeout(() => updateState({ processing: false }), 500);
    }
  };

  const downloadFile = useCallback(
    (format, fileType) => {
      const fileData = state.results.allResults[format][fileType];
      addLog(`Downloading ${fileData.filename}...`, "info");

      const url = window.URL.createObjectURL(fileData.blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileData.filename;
      a.click();
      window.URL.revokeObjectURL(url);

      addLog(`✓ Downloaded ${fileData.filename}`, "success");
    },
    [state.results, addLog],
  );

  const downloadAllFiles = useCallback(() => {
    addLog("Downloading all files...", "info");
    let delay = 0;

    state.formats.forEach((format) => {
      setTimeout(() => downloadFile(format, "individual"), delay);
      delay += 300;

      setTimeout(() => downloadFile(format, "powerCurve"), delay);
      delay += 300;
    });
  }, [state.formats, downloadFile, addLog]);

  // Virtual scrolling for file list
  const visibleFiles = useMemo(() => {
    if (!sidebarScrollRef.current) return state.files;

    const containerHeight = sidebarScrollRef.current.clientHeight || 600;
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - 5);
    const visibleCount = Math.ceil(containerHeight / ITEM_HEIGHT);
    const end = Math.min(start + visibleCount + 5, state.files.length);

    return state.files.slice(start, end).map((file, idx) => ({
      file,
      index: start + idx,
    }));
  }, [state.files, scrollTop]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const renderFileItem = useCallback(
    (file, index) => {
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
          style={{ height: `${ITEM_HEIGHT}px` }}
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
    },
    [state.selectedFiles, state.activeFile, toggleFileSelection, updateState],
  );

  const renderConfigBanner = useCallback(
    () => (
      <div className="bg-zinc-800/30 border border-zinc-700/50 rounded-lg p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="p-2 bg-zinc-700/50 rounded-lg">
            <Icon path="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-zinc-200 mb-3">
              Processing Configuration
            </h3>

            <div className="grid grid-cols-4 gap-4 mb-3">
              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-xs text-zinc-400 mb-1">Air Density</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {state.results?.processedAirDensity?.toFixed(3) || "1.225"}
                </div>
                <div className="text-xs text-zinc-500">kg/m³</div>
              </div>

              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-xs text-zinc-400 mb-1">RtArea Mean</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {state.results?.meanRotorArea?.toFixed(2) || "0.00"}
                </div>
                <div className="text-xs text-zinc-500">m²</div>
              </div>

              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-xs text-zinc-400 mb-1">RtArea Max</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {state.results?.maxRotorArea?.toFixed(2) || "0.00"}
                </div>
                <div className="text-xs text-zinc-500">m²</div>
              </div>

              <div className="bg-zinc-900/50 rounded-lg p-3 border border-zinc-700/30">
                <div className="text-xs text-zinc-400 mb-1">Output Files</div>
                <div className="text-lg font-semibold text-emerald-400">
                  {state.formats.length * 2}
                </div>
                <div className="text-xs text-zinc-500">generated</div>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-xs text-zinc-400 pt-3 border-t border-zinc-700/50">
              <span>
                Formats:{" "}
                {state.results?.processedFormats?.join(", ").toUpperCase() ||
                  ""}
              </span>
            </div>
          </div>
        </div>
      </div>
    ),
    [state.results, state.selectedFiles.length, state.formats.length],
  );

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col overflow-hidden font-sans antialiased">
      <Header
        selectedCount={state.selectedFiles.length}
        totalCount={state.files.length}
        processing={state.processing}
        progress={state.progress}
        currentStep={state.currentStep}
        formatsCount={state.formats.length}
        currentFile={state.currentFile} // ✅ ADD THIS
        filesProcessed={state.filesProcessed}
        onProcessFiles={handleProcessFiles}
        onFolderUpload={handleFolderUpload}
        Icon={Icon}
        Button={Button}
      />

      <div className="flex flex-1 overflow-hidden">
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
          visibleFiles={visibleFiles}
          onScroll={handleScroll}
          sidebarScrollRef={sidebarScrollRef}
          totalHeight={state.files.length * ITEM_HEIGHT}
          Icon={Icon}
          Button={Button}
        />

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
    </div>
  );
}
