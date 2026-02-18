"use client";

export default function Header({
  selectedCount,
  totalCount,
  processing,
  progress,
  currentStep,
  formatsCount,
  onProcessFiles,
  onFolderUpload,
  Icon,
  Button,
}) {
  return (
    <header className="bg-gradient-to-r from-zinc-950 via-zinc-900 to-zinc-950 backdrop-blur-xl border-b border-emerald-500/30 shadow-2xl shadow-zinc-950/50">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between gap-6">
          {/* Left: Title and Logo */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 border border-emerald-500/50 rounded-lg">
              <svg
                className="w-5 h-5 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-emerald-500 tracking-tight">
                Power Curve Generator
              </h1>
              <p className="text-xs text-zinc-400 mt-0.5">
                OpenFAST Processing Suite
              </p>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Selected counter */}
            <div className="bg-zinc-800/80 px-4 py-2.5 rounded-lg border-2 border-emerald-500/40 shadow-lg shadow-emerald-500/10">
              <div className="flex items-center gap-3">
                <div className="text-center">
                  <div className="text-xs text-zinc-400 font-medium">
                    Selected
                  </div>
                  <div className="text-xl font-bold text-emerald-400">
                    {selectedCount}
                  </div>
                </div>
                <div className="h-6 w-px bg-zinc-700/50"></div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Total:</div>
                  <div className="text-sm font-semibold text-zinc-300">
                    {totalCount}
                  </div>
                </div>
              </div>
            </div>

            {/* Folder upload */}
            <label className="cursor-pointer group">
              <input
                type="file"
                webkitdirectory="true"
                directory=""
                multiple
                onChange={onFolderUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:from-blue-500 hover:to-blue-400 transition-all shadow-lg shadow-blue-500/30 border border-blue-400/30 group-hover:shadow-blue-500/50 group-hover:border-blue-400/50">
                <Icon path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                Upload Folder
              </span>
            </label>

            {/* Generate button */}
            <Button
              onClick={onProcessFiles}
              disabled={processing || selectedCount === 0 || formatsCount === 0}
              className="px-7 py-2.5 font-semibold shadow-lg shadow-emerald-500/30 border border-emerald-400/30 hover:shadow-emerald-500/50 hover:border-emerald-400/50"
            >
              <Icon path="M13 10V3L4 14h7v7l9-11h-7z" />
              {processing ? "Processing..." : "Generate Files"}
            </Button>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      {processing && (
        <div className="px-8 pb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-zinc-300">
              {currentStep || "Processing files..."}
            </span>
            <span className="text-sm font-semibold text-emerald-400">
              {Math.round(progress)}%
            </span>
          </div>

          <div className="w-full bg-zinc-800 rounded-full h-2.5 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </header>
  );
}
