"use client";

export default function Header({
  selectedCount,
  totalCount,
  processing,
  progress,
  currentStep,
  currentFile, // ✅ ADD THIS
  filesProcessed, // ✅ ADD THIS
  formatsCount,
  onProcessFiles,
  onFolderUpload,
  Icon,
  Button,
}) {
  return (
    <header className="bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800 shadow-2xl">
      <div className="px-4 py-1">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-zinc-100 tracking-tight">
            Power Curve Input Generator
          </h1>

          <div className="flex items-center gap-4">
            {/* Selected counter */}
            <div className="bg-zinc-800/50 px-4 py-2 rounded-lg border border-zinc-700">
              <div className="flex items-center gap-2">
                <span className="text-xs text-zinc-400">Selected:</span>
                <span className="text-lg font-bold text-emerald-400">
                  {selectedCount}
                </span>
                <span className="text-xs text-zinc-500">/ {totalCount}</span>
              </div>
            </div>

            {/* Folder upload */}
            <label className="cursor-pointer">
              <input
                type="file"
                webkitdirectory="true"
                directory=""
                multiple
                onChange={onFolderUpload}
                className="hidden"
              />
              <span className="inline-flex items-center gap-2 bg-blue-500 text-zinc-100 px-5 py-3 rounded-lg text-sm font-medium hover:bg-blue-600 transition-all shadow-lg">
                <Icon path="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                Upload Folder
              </span>
            </label>

            {/* Generate button */}
            <Button
              onClick={onProcessFiles}
              disabled={processing || selectedCount === 0 || formatsCount === 0}
              className="px-6 py-3 font-semibold"
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
