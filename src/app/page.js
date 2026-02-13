"use client";
import { useState, useRef, useEffect } from "react";

// Constants
const INITIAL_STATE = {
  files: [],
  selectedFiles: [],
  activeFile: null,
  airDensity: 1.225,
  rotorArea: 26830,
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

  const handleProcessFiles = async () => {
    if (state.selectedFiles.length === 0) {
      alert("Please select files to process");
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

      const formData = new FormData();
      state.files.forEach((file) => {
        if (state.selectedFiles.includes(file.name))
          formData.append("files", file);
      });

      formData.append("airDensity", state.airDensity);
      formData.append("rotorArea", state.rotorArea);

      addLog(`Air Density: ${state.airDensity} kg/m³`, "info");
      addLog(`Rotor Area: ${state.rotorArea} m²`, "info");
      updateState({
        progress: 15,
        currentStep: "Uploading and parsing files...",
      });

      const response = await fetch("/api/process", {
        method: "POST",
        body: formData,
      });

      updateState({ progress: 60, currentStep: "Processing data..." });
      addLog(`Analyzing data and calculating averages...`, "info");

      const data = await response.json();
      updateState({ progress: 85 });

      if (!response.ok) throw new Error(data.error || "Processing failed");

      addLog(`Successfully processed ${data.filesProcessed} files`, "success");
      addLog(
        `Generated power curve with ${data.powerCurve.length} data points`,
        "success",
      );

      if (data.globalRtAreaMean !== undefined) {
        addLog(
          `Global RtArea Mean: ${data.globalRtAreaMean.toFixed(4)} m²`,
          "success",
        );
      }
      if (data.globalRtAreaMax !== undefined) {
        addLog(
          `Global RtArea Max: ${data.globalRtAreaMax.toFixed(4)} m²`,
          "success",
        );
      }

      if (data.powerCurve.length > 0) {
        const maxPower = Math.max(...data.powerCurve.map((r) => r.power));
        const avgCp = (
          data.powerCurve.reduce((sum, r) => sum + r.cp, 0) /
          data.powerCurve.length
        ).toFixed(4);
        addLog(`Maximum power: ${maxPower.toFixed(2)} kW`, "success");
        addLog(`Average Cp: ${avgCp}`, "success");
      }

      updateState({
        results: {
          ...data,
          processedAirDensity: state.airDensity,
          processedRotorArea: state.rotorArea,
        },
        progress: 100,
        currentStep: "Complete!",
      });

      addLog(`Processing complete! Results ready for download.`, "success");
    } catch (err) {
      updateState({ error: err.message, progress: 0, currentStep: "" });
      addLog(`Error: ${err.message}`, "error");
      console.error("Processing error:", err);
    } finally {
      setTimeout(() => updateState({ processing: false }), 500);
    }
  };

  const downloadCSV = (data, filename) => {
    addLog(`Downloading ${filename}...`, "info");
    const blob = new Blob([data], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    addLog(`Downloaded ${filename}`, "success");
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

          <div className="grid grid-cols-4 gap-4 mb-3">
            <StatCard
              label="Air Density"
              value={state.airDensity}
              unit="kg/m³"
            />
            {/* <StatCard label="Rotor Area" value={state.rotorArea} unit="m²" /> */}
            <StatCard
              label="RtArea Mean"
              value={state.results?.globalRtAreaMean?.toFixed(2) || "N/A"}
              unit="m²"
            />
            <StatCard
              label="RtArea Max"
              value={state.results?.globalRtAreaMax?.toFixed(2) || "N/A"}
              unit="m²"
            />
          </div>

          <div className="flex items-center gap-6 text-xs text-zinc-400 pt-3 border-t border-zinc-700/50">
            <span>{state.results?.filesProcessed} files processed</span>
            <span>{state.results?.powerCurve.length} wind speed groups</span>
            <span>
              Min Speed:{" "}
              {Math.min(
                ...state.results.powerCurve.map((r) => r.windSpeed),
              ).toFixed(2)}{" "}
              m/s
            </span>
            <span>
              Max Power:{" "}
              {Math.max(
                ...state.results.powerCurve.map((r) => r.power),
              ).toFixed(0)}{" "}
              kW
            </span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTable = () => (
    <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
      <div className="px-6 py-4 border-b border-zinc-700 bg-zinc-900/50">
        <h3 className="text-lg font-semibold text-zinc-100">
          Final Power Curve
        </h3>
        <p className="text-sm text-zinc-400 mt-1">
          Averaged results across all processed files
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-900/70 border-b border-zinc-700 sticky top-0 backdrop-blur-sm">
              <tr>
                <TableHeader>Wind Speed (m/s)</TableHeader>
                <TableHeader>Power (kW)</TableHeader>
                <TableHeader>Torque (kNm)</TableHeader>
                <TableHeader>Gen Speed (RPM)</TableHeader>
                <TableHeader>Cp</TableHeader>
                <TableHeader>Ct</TableHeader>
                <TableHeader>Bladepitch 1 (DEG)</TableHeader>
                <TableHeader>Bladepitch 2 (DEG)</TableHeader>
                <TableHeader>Bladepitch 3 (DEG)</TableHeader>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-700">
              {state.results.powerCurve.map((row, idx) => (
                <tr
                  key={idx}
                  className="hover:bg-zinc-700/30 transition-colors"
                >
                  <TableCell bold>{row.windSpeed.toFixed(2)}</TableCell>
                  <TableCell>{row.power.toFixed(2)}</TableCell>
                  <TableCell>{row.torque.toFixed(4)}</TableCell>
                  <TableCell>{row.genSpeed.toFixed(4)}</TableCell>
                  <TableCell>{row.cp.toFixed(6)}</TableCell>
                  <TableCell>{row.ct.toFixed(6)}</TableCell>
                  <TableCell>{row.bladePitch1.toFixed(4)}</TableCell>
                  <TableCell>{row.bladePitch2.toFixed(4)}</TableCell>
                  <TableCell>{row.bladePitch3.toFixed(4)}</TableCell>
                </tr>
              ))}
            </tbody>
          </table>
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
                disabled={state.processing || state.selectedFiles.length === 0}
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
                {state.progress}%
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
            state.sidebarCollapsed ? "w-16" : "w-65"
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

            {/* Parameters Card */}
            {!state.results && !state.processing && state.files.length > 0 && (
              <div className="mb-6 bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                  <Icon
                    path="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                    className="w-5 h-5 text-emerald-400"
                  />
                  Configuration Parameters
                </h3>

                <div className="grid grid-cols-2 gap-6">
                  {[
                    {
                      label: "Air Density (kg/m³)",
                      value: state.airDensity,
                      setter: "airDensity",
                      step: 0.001,
                      desc: "Standard air density at sea level",
                    },
                    {
                      label: "Rotor Area (m²)",
                      value: state.rotorArea,
                      setter: "rotorArea",
                      step: 1,
                      desc: "Total swept area of the rotor",
                    },
                  ].map(({ label, value, setter, step, desc }) => (
                    <div key={setter}>
                      <label className="text-sm font-medium text-zinc-300 block mb-2">
                        {label}
                      </label>
                      <input
                        type="number"
                        step={step}
                        value={value}
                        onChange={(e) =>
                          updateState({ [setter]: parseFloat(e.target.value) })
                        }
                        className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-zinc-500 mt-2">{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {state.results ? (
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
                      Results are ready for download
                    </p>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={() => {
                        downloadCSV(
                          state.results.individualSeedsCSV,
                          `all_seed_averages_${state.results.processedAirDensity}.csv`,
                        );

                        downloadCSV(
                          state.results.powerCurveCSV,
                          `final_power_curve_${state.results.processedAirDensity}.csv`,
                        );
                      }}
                    >
                      <Icon path="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      Download All Results
                    </Button>
                  </div>
                </div>

                {renderConfigBanner()}
                {renderTable()}
              </div>
            ) : state.activeFile ? (
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">
                  File Preview
                </h2>
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm">
                  <div className="space-y-4">
                    {[
                      {
                        label: "File Name",
                        value: state.activeFile.name,
                        mono: true,
                      },
                      {
                        label: "File Size",
                        value: `${(state.activeFile.size / 1024).toFixed(2)} KB`,
                      },
                      {
                        label: "File Type",
                        value:
                          state.activeFile.type || "application/octet-stream",
                      },
                    ].map(({ label, value, mono }) => (
                      <div
                        key={label}
                        className="flex items-center justify-between py-3 border-b border-zinc-700 last:border-0"
                      >
                        <span className="text-sm font-medium text-zinc-300">
                          {label}
                        </span>
                        <span
                          className={`text-sm text-zinc-100 ${mono ? "font-mono" : ""}`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <Icon
                    path="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    className="w-20 h-20 mx-auto text-zinc-700 mb-4"
                  />
                  <p className="text-zinc-400 text-lg font-medium mb-2">
                    {state.files.length === 0
                      ? "Upload a folder to get started"
                      : "Configure parameters and process your files"}
                  </p>
                  <p className="text-zinc-500 text-sm">
                    Advanced wind turbine performance analysis
                  </p>
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
