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
          <div className="mb-6 bg-red-500/15 border-2 border-red-500/50 rounded-xl p-5 shadow-lg shadow-red-500/20">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 shrink-0"
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
          <div className="bg-linear-to-r from-zinc-900/60 to-zinc-900/40 border-2 border-emerald-500/30 rounded-2xl p-8 shadow-2xl shadow-emerald-500/10">
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
                <h2 className="text-2xl font-bold text-emerald-300 flex items-center gap-2">
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
                  Processing Complete ✨
                </h2>
                <p className="text-sm text-zinc-300 mt-1 font-medium">
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
                  className="bg-linear-to-br from-zinc-800/70 to-zinc-800/50 border-2 border-emerald-500/40 rounded-xl p-6 shadow-lg shadow-emerald-500/15 backdrop-blur-sm hover:border-emerald-500/60 transition-all"
                >
                  <h3 className="text-lg font-bold text-emerald-300 mb-4 uppercase tracking-wide">
                    {format}
                  </h3>
                  <div className="space-y-3">
                    <Button
                      onClick={() => downloadFile(format, "individual")}
                      variant="outlined"
                      className="w-full justify-center text-white 
bg-gradient-to-r from-blue-600 to-cyan-500 
hover:from-blue-500 hover:to-cyan-400 
transition-all duration-300 
shadow-lg hover:shadow-cyan-500/30 
rounded-xl"
                    >
                      Seed Average
                    </Button>
                    <Button
                      onClick={() => downloadFile(format, "powerCurve")}
                      variant="outlined"
                      className="w-full justify-center text-white 
bg-gradient-to-r from-orange-400 to-pink-400 
hover:from-orange-500 hover:to-pink-500  
transition-all duration-300 
shadow-lg hover:shadow-pink-500/30 
rounded-xl"
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
    </main>
  );
}
