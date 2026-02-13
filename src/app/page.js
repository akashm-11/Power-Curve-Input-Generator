"use client";
import { useState, useRef, useEffect } from "react";

export default function Home() {
  const [files, setFiles] = useState([]);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeFile, setActiveFile] = useState(null);
  const [airDensity, setAirDensity] = useState(1.225);
  const [rotorArea, setRotorArea] = useState(26830);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState('');
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [logs, setLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [filesCollapsed, setFilesCollapsed] = useState(false);
  const [parametersCollapsed, setParametersCollapsed] = useState(false);
  const logsEndRef = useRef(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  // Auto-close logs after processing completes
  useEffect(() => {
    if (results && showLogs) {
      const timer = setTimeout(() => {
        setShowLogs(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [results, showLogs]);

  const addLog = (message, type = "info") => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { message, type, timestamp }]);
  };

  const handleFolderUpload = (e) => {
    const allFiles = Array.from(e.target.files);
    const outFiles = allFiles.filter(file =>
      file.name.toLowerCase().endsWith(".out")
    );

    setFiles(outFiles);
    setSelectedFiles([]);
    setActiveFile(null);
    setResults(null);
    setError(null);
    setLogs([]);
    setProgress(0);
    setCurrentStep('');
    
    addLog(`Loaded ${outFiles.length} .out files from folder`, "success");
  };

  const toggleFileSelection = (fileName) => {
    if (selectedFiles.includes(fileName)) {
      setSelectedFiles(selectedFiles.filter(f => f !== fileName));
    } else {
      setSelectedFiles([...selectedFiles, fileName]);
    }
  };

  const handleFileClick = (file) => {
    setActiveFile(file);
    addLog(`Viewing file: ${file.name}`, "info");
  };

  const handleProcessFiles = async () => {
    if (selectedFiles.length === 0) {
      alert("Please select files to process");
      return;
    }

    setProcessing(true);
    setError(null);
    setResults(null);
    setLogs([]);
    setProgress(0);
    setShowLogs(true);
    setSidebarCollapsed(true);

    try {
      addLog(`Starting processing of ${selectedFiles.length} files...`, "info");
      setCurrentStep('Preparing files...');
      setProgress(5);

      const formData = new FormData();
      
      let addedCount = 0;
      files.forEach(file => {
        if (selectedFiles.includes(file.name)) {
          formData.append('files', file);
          addedCount++;
        }
      });

      addLog(`Added ${addedCount} files to processing queue`, "info");
      setProgress(10);

      formData.append('airDensity', airDensity);
      formData.append('rotorArea', rotorArea);
      
      addLog(`Air Density: ${airDensity} kg/m³`, "info");
      addLog(`Rotor Area: ${rotorArea} m²`, "info");
      setProgress(15);

      setCurrentStep('Uploading and parsing files...');
      addLog(`Sending files to server...`, "info");
      setProgress(25);

      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      setProgress(60);
      setCurrentStep('Processing data...');
      addLog(`Analyzing data and calculating averages...`, "info");

      const data = await response.json();

      setProgress(85);

      if (!response.ok) {
        throw new Error(data.error || 'Processing failed');
      }

      addLog(`Successfully processed ${data.filesProcessed} files`, "success");
      addLog(`Generated power curve with ${data.powerCurve.length} data points`, "success");
      
      setProgress(95);
      setCurrentStep('Finalizing results...');
      
      if (data.powerCurve.length > 0) {
        const maxPower = Math.max(...data.powerCurve.map(r => r.power));
        const avgCp = (data.powerCurve.reduce((sum, r) => sum + r.cp, 0) / data.powerCurve.length).toFixed(4);
        addLog(`Maximum power: ${maxPower.toFixed(2)} kW`, "success");
        addLog(`Average Cp: ${avgCp}`, "success");
      }

      setResults(data);
      setProgress(100);
      setCurrentStep('Complete!');
      addLog(`Processing complete! Results ready for download.`, "success");

    } catch (err) {
      setError(err.message);
      addLog(`Error: ${err.message}`, "error");
      setProgress(0);
      setCurrentStep('');
      console.error('Processing error:', err);
    } finally {
      setTimeout(() => {
        setProcessing(false);
      }, 500);
    }
  };

  const downloadCSV = (data, filename) => {
    addLog(`Downloading ${filename}...`, "info");
    const blob = new Blob([data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
    addLog(`Downloaded ${filename}`, "success");
  };

  const clearLogs = () => {
    setLogs([]);
  };

  return (
    <div className="h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex flex-col overflow-hidden font-sans antialiased">
      {/* Header */}
      <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 shadow-2xl">
        <div className="px-4 py-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
                  Power Curve Input Generator
                </h1>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-zinc-400">Selected:</span>
                  <span className="text-lg font-bold text-emerald-400">
                    {selectedFiles.length}
                  </span>
                  <span className="text-xs text-zinc-500">/ {files.length}</span>
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
                <span className="inline-flex items-center gap-2 bg-blue-500 text-zinc-100 px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all shadow-lg hover:shadow-zinc-700/50">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  Upload Folder
                </span>
              </label>

              <button
                onClick={handleProcessFiles}
                disabled={processing || selectedFiles.length === 0}
                className="inline-flex items-center gap-2 bg-emerald-600 text-white px-6 py-3 rounded-lg text-sm font-semibold hover:bg-emerald-500 transition-all shadow-lg hover:shadow-emerald-500/50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-emerald-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {processing ? 'Analyzing...' : 'Run Analysis'}
              </button>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        {processing && (
          <div className="px-8 pb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-zinc-300">
                {currentStep}
              </span>
              <span className="text-sm font-semibold text-emerald-400">
                {progress}%
              </span>
            </div>
            <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden shadow-inner">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out shadow-lg shadow-emerald-500/50 relative overflow-hidden"
                style={{ width: `${progress}%` }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-shimmer"></div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Left side with collapsible sections */}
        <aside className={`bg-zinc-900/50 backdrop-blur-xl border-r border-zinc-800 flex flex-col overflow-hidden shadow-2xl transition-all duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-65'
        }`}>
          {/* Sidebar Toggle Button */}
          <div className="px-4 py-1 border-b border-zinc-800 flex items-center justify-between flex-shrink-0">
            {!sidebarCollapsed && (
              <h2 className="text-sm  text-zinc-200 uppercase tracking-wide">
                File Manager
              </h2>
            )}
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="p-2 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <svg className={`w-5 h-5 transition-transform ${sidebarCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              </svg>
            </button>
          </div>

          {!sidebarCollapsed ? (
            <>
              {/* Output Files Section - Collapsible */}
              <div className={`flex flex-col border-b border-zinc-800 transition-all duration-300 ${
                filesCollapsed ? 'flex-shrink-0' : 'flex-1 min-h-0'
              }`}>
                <div className="px-4 py-1 border-b border-zinc-800 flex items-center justify-between bg-zinc-800/30 flex-shrink-0">
                  <h3 className="text-sm  text-zinc-200 uppercase tracking-wide">
                    Output Files {files.length > 0 && `(${files.length})`}
                  </h3>
                  <button
                    onClick={() => setFilesCollapsed(!filesCollapsed)}
                    className="p-1.5 hover:bg-zinc-700 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
                    title={filesCollapsed ? "Expand files" : "Collapse files"}
                  >
                    <svg className={`w-4 h-4 transition-transform ${filesCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>

                {!filesCollapsed && (
                  <>
                    {files.length > 0 && (
                      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
                        <button
                          onClick={() => {
                            if (selectedFiles.length === files.length) {
                              setSelectedFiles([]);
                              addLog("Deselected all files", "info");
                            } else {
                              setSelectedFiles(files.map(f => f.name));
                              addLog(`Selected all ${files.length} files`, "info");
                            }
                          }}
                          className="w-full bg-zinc-700 text-zinc-100 px-4 py-2 rounded-lg text-xs font-medium hover:bg-slate-600 transition-all shadow-lg"
                        >
                          {selectedFiles.length === files.length ? "Deselect All" : "Select All"}
                        </button>
                      </div>
                    )}
                    
                    <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-0">
                      {files.length === 0 ? (
                        <div className="text-center py-12">
                          <svg className="w-12 h-12 mx-auto text-zinc-700 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <p className="text-xs text-zinc-400 font-medium">
                            No folder selected
                          </p>
                          <p className="text-xs text-zinc-500 mt-1">
                            Upload to get started
                          </p>
                        </div>
                      ) : (
                        files.map((file, index) => {
                          const isSelected = selectedFiles.includes(file.name);
                          const isActive = activeFile?.name === file.name;
                          
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
                                onClick={() => handleFileClick(file)}
                                title={file.name}
                              >
                                <span className={isSelected ? "text-emerald-300 font-medium" : "text-zinc-300"}>
                                  {file.name}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Parameters Section - Collapsible, only show when not processing */}
              {!processing && (
                <div className="border-t border-zinc-800 bg-zinc-900/80 flex-shrink-0">
                  <div className="px-4 py-1 flex items-center justify-between bg-zinc-800/30 border-b border-zinc-800">
                    <h3 className="text-sm  text-zinc-200 uppercase tracking-wide">
                      Parameters
                    </h3>
                    <button
                      onClick={() => setParametersCollapsed(!parametersCollapsed)}
                      className="p-1.5 hover:bg-zinc-700 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
                      title={parametersCollapsed ? "Expand parameters" : "Collapse parameters"}
                    >
                      <svg className={`w-4 h-4 transition-transform ${parametersCollapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                  
                  {!parametersCollapsed && (
                    <div className="p-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-xs font-medium text-zinc-400 block mb-2">
                            Air Density (kg/m³)
                          </label>
                          <input
                            type="number"
                            step="0.001"
                            value={airDensity}
                            onChange={(e) => setAirDensity(parseFloat(e.target.value))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-medium text-zinc-400 block mb-2">
                            Rotor Area (m²)
                          </label>
                          <input
                            type="number"
                            step="1"
                            value={rotorArea}
                            onChange={(e) => setRotorArea(parseFloat(e.target.value))}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center p-4">
              <div className="text-center">
                <svg className="w-8 h-8 mx-auto text-zinc-600 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                </svg>
                <p className="text-xs text-zinc-500 transform rotate-90 whitespace-nowrap mt-4">
                  {files.length} files
                </p>
              </div>
            </div>
          )}
        </aside>

        {/* Main Panel */}
        <main className="flex-1 flex flex-col overflow-hidden min-h-0">
          {/* Main Content Area */}
          <div className="flex-1 overflow-y-auto p-8">
            {error && (
              <div className="mb-6 bg-red-500/10 border border-red-500/30 rounded-xl p-5 shadow-lg">
                <div className="flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <div className="font-semibold text-red-300 mb-1">Processing Error</div>
                    <div className="text-sm text-red-400">{error}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Parameters Card - Show on main screen when no results */}
            {!results && !processing && files.length > 0 && (
              <div className="mb-6">
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm">
                  <h3 className="text-lg font-semibold text-zinc-100 mb-4 flex items-center gap-2">
                    <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                    </svg>
                    Configuration Parameters
                  </h3>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="text-sm font-medium text-zinc-300 block mb-2">
                        Air Density (kg/m³)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={airDensity}
                        onChange={(e) => setAirDensity(parseFloat(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-zinc-500 mt-2">Standard air density at sea level</p>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-300 block mb-2">
                        Rotor Area (m²)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={rotorArea}
                        onChange={(e) => setRotorArea(parseFloat(e.target.value))}
                        className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      />
                      <p className="text-xs text-zinc-500 mt-2">Total swept area of the rotor</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {results ? (
              <div className="space-y-6">
                {/* Results Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-100 flex items-center gap-2">
                      <svg className="w-7 h-7 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Processing Complete
                    </h2>
                    <p className="text-sm text-zinc-400 mt-1">Results are ready for download</p>
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      onClick={() => downloadCSV(results.individualSeedsCSV, `all_seed_averages_${airDensity}.csv`)}
                      className="inline-flex items-center gap-2 bg-blue-500 border border-zinc-600 text-zinc-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all shadow-lg"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Individual Seeds
                    </button>
                    <button
                      onClick={() => downloadCSV(results.powerCurveCSV, `final_power_curve_${airDensity}.csv`)}
                      className="inline-flex items-center gap-2 bg-emerald-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-500/50"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Power Curve
                    </button>
                  </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-5">
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 shadow-xl backdrop-blur-sm">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                      Files Processed
                    </div>
                    <div className="text-3xl font-semibold text-zinc-100">{results.filesProcessed}</div>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 shadow-xl backdrop-blur-sm">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                      Wind Speed Groups
                    </div>
                    <div className="text-3xl font-semibold text-zinc-100">{results.powerCurve.length}</div>
                  </div>
                  <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-5 shadow-xl backdrop-blur-sm">
                    <div className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">
                      Max Power Output
                    </div>
                    <div className="text-3xl font-semibold text-zinc-100">
                      {Math.max(...results.powerCurve.map(r => r.power)).toFixed(0)} <span className="text-lg text-zinc-400">kW</span>
                    </div>
                  </div>
                </div>

                {/* Power Curve Table */}
                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden backdrop-blur-sm">
                  <div className="px-6 py-4 border-b border-zinc-700 bg-zinc-900/50">
                    <h3 className="text-lg font-semibold text-zinc-100">Final Power Curve</h3>
                    <p className="text-sm text-zinc-400 mt-1">Averaged results across all processed files</p>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <div className="max-h-96 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-zinc-900/70 border-b border-zinc-700 sticky top-0 backdrop-blur-sm">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Wind Speed (m/s)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Power (kW)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Torque (kNm)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Gen Speed (RPM)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Cp</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Ct</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Bladepitch 1 (DEG)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Bladepitch 2 (DEG)</th>
                            <th className="px-6 py-3 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">Bladepitch 3 (DEG)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-700">
                          {results.powerCurve.map((row, idx) => (
                            <tr key={idx} className="hover:bg-zinc-700/30 transition-colors">
                              <td className="px-6 py-4 font-medium text-zinc-100">{row.windSpeed.toFixed(2)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.power.toFixed(2)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.torque.toFixed(4)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.genSpeed.toFixed(4)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.cp.toFixed(6)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.ct.toFixed(6)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.bladePitch1.toFixed(4)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.bladePitch2.toFixed(4)}</td>
                              <td className="px-6 py-4 text-zinc-300">{row.bladePitch3.toFixed(4)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            ) : activeFile ? (
              <div>
                <h2 className="text-xl font-semibold text-zinc-100 mb-6">
                  File Preview
                </h2>

                <div className="bg-zinc-800/50 border border-zinc-700 rounded-xl p-6 shadow-xl backdrop-blur-sm">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-3 border-b border-zinc-700">
                      <span className="text-sm font-medium text-zinc-300">File Name</span>
                      <span className="text-sm text-zinc-100 font-mono">{activeFile.name}</span>
                    </div>
                    <div className="flex items-center justify-between py-3 border-b border-zinc-700">
                      <span className="text-sm font-medium text-zinc-300">File Size</span>
                      <span className="text-sm text-zinc-100">{(activeFile.size / 1024).toFixed(2)} KB</span>
                    </div>
                    <div className="flex items-center justify-between py-3">
                      <span className="text-sm font-medium text-zinc-300">File Type</span>
                      <span className="text-sm text-zinc-100">{activeFile.type || "application/octet-stream"}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center">
                <div className="text-center">
                  <svg className="w-20 h-20 mx-auto text-zinc-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <p className="text-zinc-400 text-lg font-medium mb-2">
                    {files.length === 0 
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

          {/* Logs Panel - Collapsible with toggle button */}
          {logs.length > 0 && (
            <div className={`border-t border-zinc-800 bg-zinc-900/50 backdrop-blur-xl flex flex-col transition-all duration-300 ${
              showLogs ? 'h-64' : 'h-12'
            } flex-shrink-0`}>
              <div className="px-6 py-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/70">
                <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wide">
                  Processing Logs {!showLogs && `(${logs.length})`}
                </h3>
                <div className="flex items-center gap-2">
                  {showLogs && (
                    <button
                      onClick={clearLogs}
                      className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg transition-all font-medium shadow-lg"
                    >
                      Clear Logs
                    </button>
                  )}
                  <button
                    onClick={() => setShowLogs(!showLogs)}
                    className="p-1.5 hover:bg-zinc-800 rounded-lg transition-all text-zinc-400 hover:text-zinc-200"
                    title={showLogs ? "Hide logs" : "Show logs"}
                  >
                    <svg className={`w-4 h-4 transition-transform ${showLogs ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {showLogs && (
                <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
                  {logs.map((log, index) => (
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

      {/* Add custom animations and scrollbar styling */}
      <style jsx global>{`
        /* Import Professional Font */
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        /* Apply font globally */
        * {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
        }

        @keyframes shimmer {
          0% { transform: tranzincX(-100%); }
          100% { transform: tranzincX(100%); }
        }
        .animate-shimmer {
          animation: shimmer 2s infinite;
        }

        /* Custom Scrollbar Styling - Gray Theme */
        
        /* For Chrome, Edge, Safari - WebKit browsers */
        ::-webkit-scrollbar {
          width: 10px;              /* Width of vertical scrollbar */
          height: 10px;             /* Height of horizontal scrollbar */
        }

        /* The track (background area where scrollbar moves) */
        ::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);    /* Dark zinc matching your bg */
          border-radius: 6px;                    /* Rounded edges */
        }

        /* The draggable scrolling handle (thumb) */
        ::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, 
            rgba(71, 85, 105, 0.6) 0%,          /* zinc-600 with transparency */
            rgba(51, 65, 85, 0.6) 100%          /* zinc-700 with transparency */
          );
          border-radius: 6px;                    /* Rounded edges */
          border: 2px solid rgba(15, 23, 42, 0.5); /* Creates padding effect */
        }

        /* When user hovers over the scrollbar */
        ::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, 
            rgba(71, 85, 105, 0.8) 0%,          /* Brighter on hover */
            rgba(51, 65, 85, 0.8) 100%
          );
        }

        /* When user is actively dragging the scrollbar */
        ::-webkit-scrollbar-thumb:active {
          background: linear-gradient(180deg, 
            rgba(100, 116, 139, 0.9) 0%,        /* Even brighter when active */
            rgba(71, 85, 105, 0.9) 100%
          );
        }

        /* For Firefox - Different syntax */
        * {
          scrollbar-width: thin;                 /* Makes scrollbar thinner */
          scrollbar-color: rgba(71, 85, 105, 0.6) rgba(15, 23, 42, 0.5);
          /* First color = thumb, Second color = track */
        }
      `}</style>
    </div>
  );
}