"use client";

export default function MainPanel({
  state,
  toggleFormat,
  downloadAllFiles,
  downloadFile,
  renderConfigBanner,
  updateState,
  logsEndRef,
  Icon,
  Button,
  InstructionSteps,
  FormatSelector,
}) {
  return (
    <main className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="flex-1 overflow-y-auto p-8">
        {/* Error */}
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

        {/* BEFORE PROCESSING */}
        {!state.results && !state.processing && (
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8 shadow-2xl">
            {/* Header */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-semibold text-zinc-100">
                Get Started
              </h2>
              <p className="text-zinc-400 mt-2">
                Follow these steps to generate your power curve
              </p>
            </div>

            {/* INNER GRID */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* LEFT: Instructions */}
              <div className="lg:col-span-2">
                <InstructionSteps
                  filesCount={state.files.length}
                  selectedCount={state.selectedFiles.length}
                  formatsCount={state.formats.length}
                />
              </div>

              {/* RIGHT: Formats */}
              {state.files.length > 0 && (
                <div className="lg:col-span-1">
                  <FormatSelector
                    formats={state.formats}
                    toggleFormat={toggleFormat}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* AFTER PROCESSING */}
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
                      Seed Averages
                    </Button>
                    <Button
                      onClick={() => downloadFile(format, "powerCurve")}
                      variant="secondary"
                      className="w-full justify-center"
                    >
                      Power Curve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* LOGS */}
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
                  className="text-xs px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 text-zinc-200 rounded-lg"
                >
                  Clear Logs
                </button>
              )}
              <button
                onClick={() => updateState({ showLogs: !state.showLogs })}
                className="p-1.5 hover:bg-zinc-800 rounded-lg"
              >
                <Icon path="M19 9l-7 7-7-7" />
              </button>
            </div>
          </div>

          {state.showLogs && (
            <div className="flex-1 overflow-y-auto p-4 space-y-1 font-mono text-xs">
              {state.logs.map((log, index) => (
                <div key={index} className="px-3 py-2 rounded-lg">
                  <span className="text-zinc-500">[{log.timestamp}]</span>{" "}
                  {log.message}
                </div>
              ))}
              <div ref={logsEndRef} />
            </div>
          )}
        </div>
      )}
    </main>
  );
}
